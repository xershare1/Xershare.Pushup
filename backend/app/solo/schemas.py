"""Solo session API models (camelCase JSON)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class SoloSessionOut(BaseModel):
    sessionId: str
    reps: int
    videoUrl: str | None = None


class SoloSessionListItem(BaseModel):
    sessionId: str
    reps: int
    createdAt: str
    expiresAt: str
    videoUrl: str | None = None


class SoloSessionListOut(BaseModel):
    sessions: list[SoloSessionListItem]


class SoloSessionPrepareUploadIn(BaseModel):
    reps: int = Field(..., ge=1)
    sessionId: str | None = None
    contentType: str
    videoSizeBytes: int = Field(..., ge=1)


class SoloSessionPrepareUploadOut(BaseModel):
    sessionId: str
    reps: int
    videoUrl: str | None = None
    uploadUrl: str | None = None
    uploadHeaders: dict[str, str] = Field(default_factory=dict)
    uploadStrategy: Literal["simple_put", "multipart"] = "simple_put"
    multipartThresholdBytes: int | None = None
    multipartRecommendedPartBytes: int | None = None
    multipartMaxConcurrency: int | None = None


class SoloSessionCompleteUploadIn(BaseModel):
    sessionId: str
    reps: int
    contentType: str | None = None
    captureContext: dict | None = None


RECOMMENDED_SOLO_MULTIPART_CHUNK_BYTES = 8 * 1024 * 1024
DEFAULT_SOLO_MULTIPART_CONCURRENCY = 4


class SoloMultipartInitIn(BaseModel):
    reps: int = Field(..., ge=1)
    sessionId: str | None = None
    contentType: str
    videoSizeBytes: int = Field(..., ge=1)


class SoloMultipartInitOut(BaseModel):
    sessionId: str
    reps: int
    videoUrl: str | None = None
    uploadId: str | None = None
    objectKey: str | None = None
    multipartRecommendedPartBytes: int = RECOMMENDED_SOLO_MULTIPART_CHUNK_BYTES
    multipartMaxConcurrency: int = DEFAULT_SOLO_MULTIPART_CONCURRENCY


class SoloMultipartPresignPartsIn(BaseModel):
    sessionId: str
    uploadId: str
    partNumbers: list[int] = Field(..., min_length=1, max_length=10000)


class SoloMultipartPresignPartsOut(BaseModel):
    urls: dict[str, str]


class SoloMultipartCompleteIn(BaseModel):
    sessionId: str
    uploadId: str


class SoloMultipartAbortIn(BaseModel):
    sessionId: str
    uploadId: str
