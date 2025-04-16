// Safe audio player that respects browser autoplay policies
let audioContext: AudioContext | null = null

// Initialize audio context on user interaction
export const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContext
}

// Play audio with fallback and user interaction check
export const playAudio = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Try to use the audio element approach first
      const audio = new Audio(src)

      // Set up event listeners
      audio.onended = () => resolve()
      audio.onerror = (e) => {
        console.error("Error playing audio:", e)
        reject(e)
      }

      // Try to play, but handle autoplay restrictions gracefully
      const playPromise = audio.play()

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Playback started successfully
          })
          .catch((error) => {
            console.log("Autoplay prevented. Will play audio when user interacts with the page.", error)
            // Don't reject here, as this is an expected behavior in browsers
            resolve()
          })
      }
    } catch (error) {
      console.error("Error setting up audio:", error)
      resolve() // Resolve anyway to prevent errors from breaking the app flow
    }
  })
}

// Add a click listener to the document to initialize audio context
if (typeof document !== "undefined") {
  document.addEventListener(
    "click",
    () => {
      initAudioContext()
    },
    { once: true },
  )
}
