import { Game } from './game'

export class Controls {
  private keys: { [key: string]: boolean } = {
    w: false,
    a: false,
    s: false,
    d: false,
    e: false,
  }

  constructor(private game: Game) {
    // Adiciona listeners para teclado
    document.addEventListener('keydown', (e) => this.handleKeyDown(e))
    document.addEventListener('keyup', (e) => this.handleKeyUp(e))
  }

  private handleKeyDown(e: KeyboardEvent) {
    const key = e.key.toLowerCase()
    if (key in this.keys) {
      this.keys[key] = true
      if (key === 'e') {
        this.toggleEngine()

        const startButton = document.getElementById(
          'startButton'
        ) as HTMLButtonElement
        if (startButton) {
          startButton.textContent = this.game.isRunning()
            ? 'Desligar Motor ⛔'
            : 'Dar Partida 🚗'
        }
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    const key = e.key.toLowerCase()
    if (key in this.keys) {
      this.keys[key] = false
    }
  }

  private toggleEngine() {
    if (this.game.isRunning()) {
      this.game.stopEngine()
    } else {
      this.game.startEngine()
    }
  }

  isPressed(key: string): boolean {
    return this.keys[key] || false
  }

  setupStartButton(buttonId: string) {
    const startButton = document.getElementById(buttonId) as HTMLButtonElement
    if (startButton) {
      startButton.addEventListener('click', () => {
        this.toggleEngine()
        startButton.textContent = this.game.isRunning()
          ? 'Desligar Motor ⛔'
          : 'Dar Partida 🚗'
      })
    }
  }
}
