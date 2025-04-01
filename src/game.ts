export class Game {
  private isCarRunning: boolean = false
  private isCarReady: boolean = false
  private engineSound: HTMLAudioElement
  private currentSpeed: number = 0

  constructor() {
    this.engineSound = new Audio('/start.mp3')
    this.engineSound.volume = 1
  }

  startEngine() {
    if (!this.isCarRunning) {
      this.isCarRunning = true
      this.isCarReady = false
      this.engineSound.play()

      setTimeout(() => {
        this.isCarReady = true
      }, 2000)
    }
  }

  stopEngine() {
    if (this.isCarRunning) {
      this.isCarRunning = false
      this.isCarReady = false
      this.engineSound.pause()
      this.engineSound.currentTime = 0
      this.currentSpeed = 0
    }
  }

  isRunning(): boolean {
    return this.isCarRunning
  }

  isReady(): boolean {
    return this.isCarReady
  }

  getSpeed(): number {
    return this.currentSpeed
  }

  setSpeed(speed: number) {
    if (this.isCarRunning) {
      this.currentSpeed = speed
    }
  }
}
