import '@tensorflow/tfjs-backend-webgl'
import * as tf from '@tensorflow/tfjs-core'
import * as poseDetection from '@tensorflow-models/pose-detection'

let detectorPromise: Promise<poseDetection.PoseDetector> | null = null

/**
 * Single shared MoveNet (Thunder) detector — mirrors usePreJoinRoom / UploadVideo setup.
 */
export function loadMoveNetDetector(): Promise<poseDetection.PoseDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      await tf.setBackend('webgl')
      await tf.ready()
      return poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
        minPoseScore: 0.3,
      })
    })()
  }
  return detectorPromise
}
