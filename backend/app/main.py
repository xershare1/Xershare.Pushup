import asyncio
import logging
import logging.handlers
import os
import time
import uuid
from contextlib import asynccontextmanager
from contextvars import ContextVar
from pathlib import Path

from dotenv import load_dotenv

# Load backend/.env before any code reads os.environ (local dev; production sets env in the host)
_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env")

from fastapi import FastAPI, HTTPException, Request
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

# Per-request correlation id; injected into every LogRecord via _ReqIdFilter so
# `%(req_id)s` in the formatter renders without each call site passing it.
request_id_var: ContextVar[str] = ContextVar("solo_request_id", default="-")


class _ReqIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.req_id = request_id_var.get()
        return True


def _configure_logging() -> None:
    level_name = os.environ.get("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    formatter = logging.Formatter(
        "%(asctime)s %(levelname)s %(name)s req=%(req_id)s %(message)s"
    )
    req_id_filter = _ReqIdFilter()

    root = logging.getLogger()
    for h in list(root.handlers):
        root.removeHandler(h)
    root.setLevel(level)
    root.addFilter(req_id_filter)

    stream = logging.StreamHandler()
    stream.setFormatter(formatter)
    stream.addFilter(req_id_filter)
    root.addHandler(stream)

    log_path = os.environ.get("SOLO_DEBUG_LOG_FILE")
    if log_path:
        try:
            Path(log_path).resolve().parent.mkdir(parents=True, exist_ok=True)
            file_handler = logging.handlers.RotatingFileHandler(
                log_path, maxBytes=5_000_000, backupCount=3
            )
            file_handler.setFormatter(formatter)
            file_handler.addFilter(req_id_filter)
            root.addHandler(file_handler)
            logging.getLogger(__name__).info(
                "logging_to_file path=%s maxBytes=5000000 backups=3", log_path
            )
        except OSError as e:
            logging.getLogger(__name__).warning(
                "could not enable SOLO_DEBUG_LOG_FILE=%s err=%s", log_path, e
            )


_configure_logging()


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


# Detects sync-on-event-loop blocking. Sleeps for ``interval``; when the wakeup
# overshoots by more than ``threshold_ms`` something monopolised the loop.
async def _event_loop_lag_heartbeat() -> None:
    log = logging.getLogger("solo.loop_lag")
    interval_s = 0.1
    threshold_ms = 250
    last = time.perf_counter()
    while True:
        try:
            await asyncio.sleep(interval_s)
        except asyncio.CancelledError:
            raise
        now = time.perf_counter()
        lag_ms = int((now - last - interval_s) * 1000)
        if lag_ms > threshold_ms:
            log.warning("event_loop_lag_ms=%s threshold_ms=%s", lag_ms, threshold_ms)
        last = now


@asynccontextmanager
async def lifespan(app: FastAPI):
    cleanup_task = asyncio.create_task(_solo_cleanup_loop())
    lag_task: asyncio.Task | None = None
    if os.environ.get("SOLO_DEBUG_LOOP_LAG") == "1":
        lag_task = asyncio.create_task(_event_loop_lag_heartbeat())
        logging.getLogger(__name__).info(
            "event_loop_lag_detector enabled threshold_ms=250"
        )
    yield
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass
    if lag_task is not None:
        lag_task.cancel()
        try:
            await lag_task
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
    expose_headers=["X-Request-Id"],
)


@app.middleware("http")
async def _request_id_middleware(request: Request, call_next):
    incoming = (request.headers.get("x-request-id") or "").strip()
    req_id = incoming or uuid.uuid4().hex[:12]
    token = request_id_var.set(req_id)
    log = logging.getLogger("solo.access")
    start = time.perf_counter()
    log.info("request_start method=%s path=%s", request.method, request.url.path)
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        response.headers["X-Request-Id"] = req_id
        return response
    finally:
        dur_ms = int((time.perf_counter() - start) * 1000)
        log.info(
            "request_end method=%s path=%s status=%s duration_ms=%s",
            request.method,
            request.url.path,
            status_code,
            dur_ms,
        )
        request_id_var.reset(token)


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
