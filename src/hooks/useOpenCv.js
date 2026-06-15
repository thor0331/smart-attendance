import { useState, useEffect, useRef } from 'react'

let cvInstance = null
let loadingPromise = null

async function loadOpenCv() {
  if (cvInstance) return cvInstance
  if (loadingPromise) return loadingPromise

  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://docs.opencv.org/4.9.0/opencv.js'
    script.onload = () => {
      const check = () => {
        if (window.cv) {
          cvInstance = window.cv
          resolve(cvInstance)
        } else {
          setTimeout(check, 100)
        }
      }
      check()
    }
    script.onerror = () => reject(new Error('Failed to load OpenCV.js'))
    document.head.appendChild(script)
  })

  return loadingPromise
}

export function useOpenCv() {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(null)
  const cvRef = useRef(null)

  useEffect(() => {
    let mounted = true
    loadOpenCv()
      .then((cv) => {
        if (mounted) {
          cvRef.current = cv
          setLoaded(true)
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Failed to load OpenCV.js')
      })
    return () => { mounted = false }
  }, [])

  return { cv: cvRef.current, loaded, error }
}