import os

from fastapi import FastAPI

app = FastAPI(title="Pushup API", version="0.1.0")


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
