import logging
import os
from pathlib import Path

from dotenv import load_dotenv

# Load backend/.env before any code reads os.environ (local dev; production sets env in the host)
_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.billing.router import router as billing_router
from app.challenges.router import router as challenges_router
from app.config import get_cors_allow_origins
from app.users.router import router as users_router
from app.webhooks.stripe import router as stripe_webhook_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Pushup API", version="0.1.0")

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
app.include_router(stripe_webhook_router)


@app.get("/")
def hello() -> dict[str, str]:
    return {"message": "Hello World"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _port() -> int:
    return int(os.environ.get("PORT", "8000"))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=_port(), reload=False)
