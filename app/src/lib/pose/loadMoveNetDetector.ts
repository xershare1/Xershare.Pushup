import '@tensorflow/tfjs-backend-webgl'
import * as tf from '@tensorflow/tfjs-core'
import * as poseDetection from '@tensorflow-models/pose-detection'

let detectorPromise: Promise<poseDetection.PoseDetector> | null = null

/**
 * Single shared MoveNet (Lightning) detector — faster startup than Thunder; good enough for live rep heuristics.
 */
export function loadMoveNetDetector(): Promise<poseDetection.PoseDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      await tf.setBackend('webgl')
      await tf.ready()
      return poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        minPoseScore: 0.3,
        modelUrl: '/models/pose/movenet-lightning-v4/model.json',
      })
    })()
  }
  return detectorPromise
}
