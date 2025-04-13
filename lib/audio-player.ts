// This utility helps with audio playback and handles autoplay restrictions
export class AudioPlayer {
    private static instance: AudioPlayer
    private audioElements: Map<string, HTMLAudioElement> = new Map()
    private userInteracted = false
  
    private constructor() {
      // Add event listeners to detect user interaction
      if (typeof window !== "undefined") {
        const interactionEvents = ["click", "touchstart", "keydown"]
  
        interactionEvents.forEach((event) => {
          window.addEventListener(
            event,
            () => {
              this.userInteracted = true
            },
            { once: true },
          )
        })
      }
    }
  
    public static getInstance(): AudioPlayer {
      if (!AudioPlayer.instance) {
        AudioPlayer.instance = new AudioPlayer()
      }
      return AudioPlayer.instance
    }
  
    public loadAudio(id: string, src: string): void {
      if (typeof window === "undefined") return
  
      if (!this.audioElements.has(id)) {
        const audio = new Audio(src)
        audio.preload = "auto"
        this.audioElements.set(id, audio)
      }
    }
  
    public async play(id: string): Promise<void> {
      if (typeof window === "undefined") return
  
      const audio = this.audioElements.get(id)
      if (!audio) return
  
      try {
        if (this.userInteracted) {
          // If user has interacted, we can play directly
          await audio.play()
        } else {
          // Otherwise, we'll wait for interaction
          console.log("Audio playback requires user interaction first")
  
          // We'll set up a one-time event listener for the next interaction
          const playOnInteraction = async () => {
            this.userInteracted = true
            await audio.play().catch((err) => console.error("Error playing audio:", err))
  
            // Remove the event listeners after successful play
            ;["click", "touchstart", "keydown"].forEach((event) => {
              window.removeEventListener(event, playOnInteraction)
            })
          }
          ;["click", "touchstart", "keydown"].forEach((event) => {
            window.addEventListener(event, playOnInteraction, { once: true })
          })
        }
      } catch (error) {
        console.error("Error playing audio:", error)
      }
    }
  
    public stop(id: string): void {
      const audio = this.audioElements.get(id)
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
    }
  }
  
  export default AudioPlayer.getInstance()
  