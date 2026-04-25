import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

# Load backend/.env before any code reads os.environ (local dev; production sets env in the host)
_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.billing.router import router as billing_router
from app.challenges.router import router as challenges_router
from app.config import get_cors_allow_origins, get_database_url
from app.friends.router import router as friends_router
from app.solo.router import router as solo_router
from app.users.router import router as users_router
from app.webhooks.clerk import router as clerk_webhook_router
from app.webhooks.stripe import router as stripe_webhook_router
from app.admin.router import router as admin_router

logging.basicConfig(level=logging.INFO)


async def _solo_cleanup_loop() -> None:
    from app.solo.cleanup import purge_expired_solo_sessions

    log = logging.getLogger("solo.cleanup")
    while True:
        try:
            n = await asyncio.to_thread(purge_expired_solo_sessions)
            if n:
                log.info("deleted_expired_solo_sessions n=%s", n)
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("solo_session_cleanup failed")
        await asyncio.sleep(3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    cleanup_task = asyncio.create_task(_solo_cleanup_loop())
    yield
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="Pushup API", version="0.1.0", lifespan=lifespan)

_origins = list(get_cors_allow_origins())

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(billing_router, prefix="/billing", tags=["billing"])
app.include_router(challenges_router)
app.include_router(users_router)
app.include_router(friends_router)
app.include_router(solo_router)
app.include_router(clerk_webhook_router)
app.include_router(stripe_webhook_router)
app.include_router(admin_router, prefix="/admin", tags=["admin"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready")
def ready() -> dict[str, str | bool]:
    """Liveness: process is up. Readiness: Postgres reachable when DATABASE_URL is set."""
    url = get_database_url()
    if not url:
        return {"ready": True, "database": "not_configured"}
    try:
        from app.db.session import get_engine

        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"ready": True, "database": "ok"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database unreachable") from None


def _port() -> int:
    return int(os.environ.get("PORT", "8000"))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=_port(), reload=False)
