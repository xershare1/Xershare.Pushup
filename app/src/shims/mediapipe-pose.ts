/**
 * Stub for `@mediapipe/pose`. The published package is a UMD bundle without ESM named
 * exports (`Pose`), which breaks Vite/Rolldown static analysis. TensorFlow pose-detection
 * only needs this for the BlazePose (MediaPipe runtime) path — we use MoveNet only.
 */
export class Pose {
  constructor() {}

  setOptions(): void {}

  onResults(): void {}

  send(): Promise<void> {
    return Promise.resolve()
  }

  close(): void {}

  reset(): void {}

  initialize(): Promise<void> {
    return Promise.resolve()
  }
}
