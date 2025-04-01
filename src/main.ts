import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Controls } from './controls'
import { Game } from './game'

const game = new Game()
let car: THREE.Group | undefined = undefined
let wheels: THREE.Object3D[] = []
let headlights: THREE.SpotLight[] = []
let taillights: THREE.PointLight[] = []
let orbitControls: OrbitControls
let isOrbitControlActive = false
const GRAVITY = 0.015
const GROUND_LEVEL = 0
let verticalVelocity = 0
let isGrounded = true
const STANDARD_SIZE = 10

function normalizeModelSize(model: THREE.Object3D) {
  const boundingBox = new THREE.Box3().setFromObject(model)
  const size = boundingBox.getSize(new THREE.Vector3())
  const maxDimension = Math.max(size.x, size.y, size.z)
  const scale = STANDARD_SIZE / maxDimension
  model.scale.multiplyScalar(scale)
}

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

orbitControls = new OrbitControls(camera, renderer.domElement)
orbitControls.enableDamping = true
orbitControls.enabled = false
orbitControls.minDistance = 8
orbitControls.maxDistance = 20
orbitControls.minPolarAngle = Math.PI / 20
orbitControls.maxPolarAngle = Math.PI / 2

const cameraButton = document.getElementById(
  'cameraButton'
) as HTMLButtonElement
cameraButton.addEventListener('click', () => {
  isOrbitControlActive = !isOrbitControlActive
  orbitControls.enabled = isOrbitControlActive
  cameraButton.textContent = isOrbitControlActive
    ? 'Câmera Fixa 📍'
    : 'Câmera Livre 🎥'

  if (isOrbitControlActive) {
    orbitControls.target.copy(car!.position)
  }
})

const ambientLight = new THREE.AmbientLight(0xffffff, 2)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 2)
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

const WORLD_SIZE = 1000
const BARRIER_HEIGHT = 5

const groundTexture = new THREE.TextureLoader().load('grass.jpg')
groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping
groundTexture.repeat.set(25, 25)
const groundGeometry = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2)
const groundMaterial = new THREE.MeshStandardMaterial({
  map: groundTexture,
  roughness: 0.8,
  metalness: 0.2,
})
const ground = new THREE.Mesh(groundGeometry, groundMaterial)
ground.rotation.x = -Math.PI / 2
scene.add(ground)

const createBarrier = (x: number, z: number, width: number, height: number) => {
  const geometry = new THREE.BoxGeometry(width, BARRIER_HEIGHT, height)
  const material = new THREE.MeshBasicMaterial({
    visible: false,
  })
  const barrier = new THREE.Mesh(geometry, material)
  barrier.position.set(x, BARRIER_HEIGHT / 2, z)
  scene.add(barrier)
  return barrier
}

const barriers = [
  createBarrier(0, -WORLD_SIZE, WORLD_SIZE * 2, 1),
  createBarrier(0, WORLD_SIZE, WORLD_SIZE * 2, 1),
  createBarrier(-WORLD_SIZE, 0, 1, WORLD_SIZE * 2),
  createBarrier(WORLD_SIZE, 0, 1, WORLD_SIZE * 2),
]

const controls = new Controls(game)
controls.setupStartButton('startButton')

let speed: number = 0
const acceleration: number = 0.008
const deceleration: number = 0.005
const maxSpeed: number = 5
const maxSpeedKMH: number = 200
const cameraLerpFactor: number = 0.6
let currentTurnAngle: number = 0
const maxTurnAngle: number = 0.03

const BOUNCE_FACTOR = 0.5

function getSpeedInKMH(gameSpeed: number): number {
  return Math.abs(Math.round((gameSpeed / maxSpeed) * maxSpeedKMH))
}

const loader = new GLTFLoader()
loader.load(
  'carro.glb',
  (gltf) => {
    car = gltf.scene
    car.position.set(0, 0, 0)

    normalizeModelSize(car)

    scene.add(car)

    const headlightLeft = new THREE.SpotLight(0xffffff, 2)
    const headlightRight = new THREE.SpotLight(0xffffff, 2)

    headlightLeft.angle = 0.5
    headlightRight.angle = 0.5
    headlightLeft.penumbra = 0.2
    headlightRight.penumbra = 0.2
    headlightLeft.decay = 1
    headlightRight.decay = 1

    headlightLeft.position.set(-0.5, 0.5, -2)
    headlightRight.position.set(0.5, 0.5, -2)

    car.add(headlightLeft)
    car.add(headlightRight)
    headlights.push(headlightLeft, headlightRight)

    const tailLightLeft = new THREE.PointLight(0xff0000, 1)
    const tailLightRight = new THREE.PointLight(0xff0000, 1)

    tailLightLeft.position.set(-0.5, 0.5, 2)
    tailLightRight.position.set(0.5, 0.5, 2)

    car.add(tailLightLeft)
    car.add(tailLightRight)
    taillights.push(tailLightLeft, tailLightRight)

    headlights.forEach((light) => (light.visible = false))
    taillights.forEach((light) => (light.visible = false))

    car.traverse((object: THREE.Object3D) => {
      if (object.name.toLowerCase().includes('wheel')) {
        wheels.push(object)
      }
    })
  },
  undefined,
  (error: unknown) => {
    const errorEvent = error as ErrorEvent
    console.error('Erro ao carregar o modelo:', errorEvent)
  }
)

camera.position.set(0, 2, 5)

function checkCollision(_newPosition: THREE.Vector3): boolean {
  const carBox = new THREE.Box3().setFromObject(car!)

  for (const barrier of barriers) {
    const barrierBox = new THREE.Box3().setFromObject(barrier)
    if (carBox.intersectsBox(barrierBox)) {
      return true
    }
  }
  return false
}

function animate(): void {
  requestAnimationFrame(animate)

  if (car) {
    if (!isGrounded) {
      verticalVelocity += GRAVITY
      car.position.y -= verticalVelocity
    }

    if (car.position.y <= GROUND_LEVEL) {
      car.position.y = GROUND_LEVEL
      verticalVelocity = 0
      isGrounded = true
    }

    if (!game.isRunning()) {
      if (Math.abs(speed) > 0) {
        const brakeForce = controls.isPressed('s')
          ? deceleration * 2
          : deceleration

        if (speed > 0) {
          speed = Math.max(0, speed - brakeForce)
        } else if (speed < 0) {
          speed = Math.min(0, speed + brakeForce)
        }

        if (Math.abs(speed) > 0) {
          const isReversing = speed > 0
          if (controls.isPressed('a')) {
            currentTurnAngle = THREE.MathUtils.lerp(
              currentTurnAngle,
              maxTurnAngle * (isReversing ? -1 : 1),
              0.1
            )
          } else if (controls.isPressed('d')) {
            currentTurnAngle = THREE.MathUtils.lerp(
              currentTurnAngle,
              -maxTurnAngle * (isReversing ? -1 : 1),
              0.1
            )
          } else {
            currentTurnAngle = THREE.MathUtils.lerp(currentTurnAngle, 0, 0.1)
          }
          car.rotation.y += currentTurnAngle * Math.abs(speed)
        }

        car.translateZ(-speed)
      } else {
        speed = 0
      }

      const speedometer = document.getElementById('speedometer')
      if (speedometer) {
        speedometer.textContent = `${getSpeedInKMH(speed)} km/h`
      }
    } else {
      if (game.isRunning() && game.isReady()) {
        if (controls.isPressed('w')) {
          speed -= acceleration
          if (speed < -maxSpeed) speed = -maxSpeed
        } else if (controls.isPressed('s')) {
          speed += acceleration
          if (speed > maxSpeed / 2) speed = maxSpeed / 2
        } else {
          if (speed > 0) {
            speed -= deceleration
            if (speed < 0) speed = 0
          } else if (speed < 0) {
            speed += deceleration
            if (speed > 0) speed = 0
          }
        }

        if (Math.abs(speed) > 0) {
          const isReversing = speed > 0

          if (controls.isPressed('a')) {
            currentTurnAngle = THREE.MathUtils.lerp(
              currentTurnAngle,
              maxTurnAngle * (isReversing ? -1 : 1),
              0.1
            )
          } else if (controls.isPressed('d')) {
            currentTurnAngle = THREE.MathUtils.lerp(
              currentTurnAngle,
              -maxTurnAngle * (isReversing ? -1 : 1),
              0.1
            )
          } else {
            currentTurnAngle = THREE.MathUtils.lerp(currentTurnAngle, 0, 0.1)
          }

          car.rotation.y += currentTurnAngle * Math.abs(speed)
        }

        const currentPosition = car.position.clone()
        car.translateZ(-speed)

        if (checkCollision(car.position)) {
          car.position.copy(currentPosition)
          speed = -speed * BOUNCE_FACTOR
          car.translateZ(-speed)
          verticalVelocity = Math.abs(speed) * 0.5
          isGrounded = false
        }

        game.setSpeed(speed)

        const speedometer = document.getElementById('speedometer')
        if (speedometer) {
          speedometer.textContent = `${getSpeedInKMH(speed)} km/h`
        }

        if (game.isRunning()) {
          car.position.y = GROUND_LEVEL + Math.sin(Date.now() * 0.005) * 0.005
        }
      } else {
        if (Math.abs(speed) > 0) {
          const brakeForce = controls.isPressed('s')
            ? deceleration * 2
            : deceleration
          if (speed > 0) {
            speed = Math.max(0, speed - brakeForce)
          } else if (speed < 0) {
            speed = Math.min(0, speed + brakeForce)
          }

          const isReversing = speed > 0
          if (controls.isPressed('a')) {
            currentTurnAngle = THREE.MathUtils.lerp(
              currentTurnAngle,
              maxTurnAngle * (isReversing ? -1 : 1),
              0.1
            )
          } else if (controls.isPressed('d')) {
            currentTurnAngle = THREE.MathUtils.lerp(
              currentTurnAngle,
              -maxTurnAngle * (isReversing ? -1 : 1),
              0.1
            )
          } else {
            currentTurnAngle = THREE.MathUtils.lerp(currentTurnAngle, 0, 0.1)
          }
          car.rotation.y += currentTurnAngle * Math.abs(speed)
        }

        car.translateZ(-speed)

        const speedometer = document.getElementById('speedometer')
        if (speedometer) {
          speedometer.textContent = 'PREPARANDO...'
        }
      }
    }

    if (isOrbitControlActive) {
      const targetPosition = car.position.clone()
      targetPosition.y += 4
      orbitControls.target.lerp(targetPosition, 0.1)
      orbitControls.update()
    } else {
      const relativeCameraOffset = new THREE.Vector3(0, 5, -10)
      const cameraOffset = relativeCameraOffset.applyMatrix4(car.matrixWorld)
      camera.position.lerp(cameraOffset, cameraLerpFactor)

      const targetOffset = new THREE.Vector3(0, 0, 20)
      const lookAtTarget = targetOffset.applyMatrix4(car.matrixWorld)
      camera.lookAt(lookAtTarget)
    }
  }

  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
})
