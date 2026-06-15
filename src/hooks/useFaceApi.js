import { useEffect, useState, useRef } from 'react'

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models'

export function useFaceApi() {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(null)
  const faceapiRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const faceapi = await import('face-api.js')
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])
        if (!cancelled) {
          faceapiRef.current = faceapi
          setLoaded(true)
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load face detection models. Check your internet connection.')
          console.error('face-api.js load error:', err)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const getDescriptor = async (imageSrc) => {
    const faceapi = faceapiRef.current
    if (!faceapi) throw new Error('Face API not loaded')

    const img = await faceapi.fetchImage(imageSrc)
    const detection = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor()

    return detection
  }

  const compareFaces = async (image1, image2, threshold = 0.6) => {
    const faceapi = faceapiRef.current
    if (!faceapi) throw new Error('Face API not loaded')

    const [desc1, desc2] = await Promise.all([
      getDescriptor(image1),
      getDescriptor(image2),
    ])

    if (!desc1 || !desc2) {
      return { match: false, distance: 1, error: 'Could not detect face in one or both images' }
    }

    const distance = faceapi.euclideanDistance(desc1.descriptor, desc2.descriptor)
    return { match: distance < threshold, distance, error: null }
  }

  return { loaded, error, getDescriptor, compareFaces }
}
