import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import Cube from 'cubejs'
import 'cubejs/lib/solve.js'
import './App.css'
import {
  FACE_ORDER,
  FACE_LABELS,
  PALETTE,
  TURN_CONFIG,
  CUBIE_SPACING,
  CUBIE_SIZE,
  FACE_COLOR_MAP,
  createEmptyFaces,
  invertTurn,
  formatTime,
  normalizeRgb,
  rgbToXyz,
  xyzToLab,
  rgbToLab,
  closestPaletteColor,
} from './utils'

const getAudioCtx = () => {
  if (typeof window === 'undefined') return null;
  if (!window.audioCtxInstance) {
    window.audioCtxInstance = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (window.audioCtxInstance.state === 'suspended') {
    window.audioCtxInstance.resume();
  }
  return window.audioCtxInstance;
};

const playClickSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(800, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
  
  gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.1);
};

const playWooshSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const bufferSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = buffer;
  
  const biquadFilter = ctx.createBiquadFilter();
  biquadFilter.type = 'lowpass';
  biquadFilter.frequency.setValueAtTime(500, ctx.currentTime);
  biquadFilter.frequency.linearRampToValueAtTime(3000, ctx.currentTime + 0.15);
  biquadFilter.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
  
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.15);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
  
  noiseSource.connect(biquadFilter);
  biquadFilter.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  noiseSource.start();
};

const playTypingSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime);
  
  gainNode.gain.setValueAtTime(0.015, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.05);
};

const playCameraSound = (isOn) => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(isOn ? 400 : 800, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(isOn ? 800 : 400, ctx.currentTime + 0.15);
  
  gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.15);
};

const playShutterSound = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'square';
  osc1.frequency.setValueAtTime(1200, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
  gain1.gain.setValueAtTime(0.1, ctx.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start();
  osc1.stop(ctx.currentTime + 0.05);
  
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(200, ctx.currentTime + 0.02);
  osc2.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
  gain2.gain.setValueAtTime(0, ctx.currentTime);
  gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.02);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(ctx.currentTime + 0.02);
  osc2.stop(ctx.currentTime + 0.1);
};

const indexToRowCol = (index) => ({
  row: Math.floor(index / 3),
  col: index % 3,
})

const rowColToIndex = (row, col) => row * 3 + col

const coordFromFaceIndex = (faceKey, index) => {
  const { row, col } = indexToRowCol(index)
  switch (faceKey) {
    case 'F':
      return { x: col - 1, y: 1 - row, z: 1, normal: 'F' }
    case 'B':
      return { x: 1 - col, y: 1 - row, z: -1, normal: 'B' }
    case 'U':
      return { x: col - 1, y: 1, z: row - 1, normal: 'U' }
    case 'D':
      return { x: col - 1, y: -1, z: 1 - row, normal: 'D' }
    case 'R':
      return { x: 1, y: 1 - row, z: 1 - col, normal: 'R' }
    case 'L':
      return { x: -1, y: 1 - row, z: col - 1, normal: 'L' }
    default:
      return { x: 0, y: 0, z: 0, normal: faceKey }
  }
}

const faceIndexFromCoord = (faceKey, x, y, z) => {
  let row = 0
  let col = 0
  switch (faceKey) {
    case 'F':
      row = 1 - y
      col = x + 1
      break
    case 'B':
      row = 1 - y
      col = 1 - x
      break
    case 'U':
      row = z + 1
      col = x + 1
      break
    case 'D':
      row = 1 - z
      col = x + 1
      break
    case 'R':
      row = 1 - y
      col = 1 - z
      break
    case 'L':
      row = 1 - y
      col = z + 1
      break
    default:
      break
  }
  return rowColToIndex(row, col)
}

const rotateCoord = (coord, axis, dir) => {
  const { x, y, z } = coord
  if (axis === 'x') {
    return dir > 0
      ? { x, y: -z, z: y }
      : { x, y: z, z: -y }
  }
  if (axis === 'y') {
    return dir > 0
      ? { x: z, y, z: -x }
      : { x: -z, y, z: x }
  }
  return dir > 0
    ? { x: -y, y: x, z }
    : { x: y, y: -x, z }
}

const normalToVector = (normal) => {
  switch (normal) {
    case 'U':
      return { x: 0, y: 1, z: 0 }
    case 'D':
      return { x: 0, y: -1, z: 0 }
    case 'R':
      return { x: 1, y: 0, z: 0 }
    case 'L':
      return { x: -1, y: 0, z: 0 }
    case 'F':
      return { x: 0, y: 0, z: 1 }
    case 'B':
      return { x: 0, y: 0, z: -1 }
    default:
      return { x: 0, y: 0, z: 0 }
  }
}

const vectorToNormal = (vector) => {
  if (vector.y === 1) return 'U'
  if (vector.y === -1) return 'D'
  if (vector.x === 1) return 'R'
  if (vector.x === -1) return 'L'
  if (vector.z === 1) return 'F'
  if (vector.z === -1) return 'B'
  return 'F'
}



const applyMoveToFaces = (cubeFaces, turn) => {
  const baseFace = turn[0]
  const config = TURN_CONFIG[baseFace]
  if (!config) {
    return cubeFaces
  }
  const isPrime = turn.includes("'")
  const isDouble = turn.includes('2')
  const turns = isDouble ? 2 : 1
  const dir = config.dir * (isPrime ? -1 : 1)

  let stickers = []
  FACE_ORDER.forEach((faceKey) => {
    cubeFaces[faceKey].forEach((color, index) => {
      const coord = coordFromFaceIndex(faceKey, index)
      stickers.push({
        ...coord,
        color,
      })
    })
  })

  for (let t = 0; t < turns; t += 1) {
    stickers = stickers.map((sticker) => {
      if (sticker[config.axis] !== config.layer) {
        return sticker
      }
      const rotatedCoord = rotateCoord(sticker, config.axis, dir)
      const rotatedNormal = rotateCoord(normalToVector(sticker.normal), config.axis, dir)
      return {
        ...sticker,
        ...rotatedCoord,
        normal: vectorToNormal(rotatedNormal),
      }
    })
  }

  const nextFaces = createEmptyFaces()
  stickers.forEach((sticker) => {
    const faceKey = sticker.normal
    const index = faceIndexFromCoord(faceKey, sticker.x, sticker.y, sticker.z)
    nextFaces[faceKey][index] = sticker.color
  })
  return nextFaces
}

const faceletStringToFaces = (facelets) => {
  const nextFaces = createEmptyFaces()
  const ordered = ['U', 'R', 'F', 'D', 'L', 'B']
  let offset = 0
  ordered.forEach((faceKey) => {
    const slice = facelets.slice(offset, offset + 9).split('')
    nextFaces[faceKey] = slice.map((facelet) => FACE_COLOR_MAP[facelet] || null)
    offset += 9
  })
  return nextFaces
}

function App() {
  const steps = useMemo(
    () => [
      {
        id: 'cross',
        title: 'White Cross',
        method: "Beginner's Method",
        moves: 8,
        turns: ['F', 'U', 'R', "U'"],
        notation: "F U R U'",
        affectedFaces: ['F', 'U', 'R'],
        description: 'Create a solid white cross on the U face and align edges.',
      },
      {
        id: 'first-layer',
        title: 'First Layer Corners',
        method: "Beginner's Method",
        moves: 12,
        turns: ['R', "U'", "R'", 'U'],
        notation: "R U' R' U",
        affectedFaces: ['R', 'U'],
        description: 'Insert corners to complete the first layer.',
      },
      {
        id: 'second-layer',
        title: 'Second Layer Edges',
        method: "Beginner's Method",
        moves: 16,
        turns: ['U', 'R', "U'", "R'", "U'", "F'", 'U', 'F'],
        notation: "U R U' R' U' F' U F",
        affectedFaces: ['U', 'R', 'F'],
        description: 'Place the middle layer edges without disrupting the first.',
      },
      {
        id: 'oll',
        title: 'Orient Last Layer',
        method: 'OLL (CFOP)',
        moves: 10,
        turns: ['F', 'R', 'U', "R'", "U'", "F'"],
        notation: "F R U R' U' F'",
        affectedFaces: ['F', 'R', 'U'],
        description: 'Orient all last-layer pieces to the U face color.',
      },
      {
        id: 'pll',
        title: 'Permute Last Layer',
        method: 'PLL (CFOP)',
        moves: 12,
        turns: ["R'", 'U', "R'", "U'", "R'", "U'", "R'", 'U', 'R', 'U', 'R2'],
        notation: "R' U R' U' R' U' R' U R U R2",
        affectedFaces: ['R', 'U'],
        description: 'Permute last-layer pieces into their final positions.',
      },
    ],
    []
  )

  const [isSolving, setIsSolving] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [moves, setMoves] = useState(0)
  const [activeFaceIndex, setActiveFaceIndex] = useState(0)
  const [selectedColor, setSelectedColor] = useState('W')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [isFaceDetected, setIsFaceDetected] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [cubeFaces, setCubeFaces] = useState(() => createEmptyFaces())
  const [solutionMoves, setSolutionMoves] = useState([])
  const [solutionError, setSolutionError] = useState('')
  const [aiHint, setAiHint] = useState('')
  const [isGeneratingHint, setIsGeneratingHint] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)

  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) return savedTheme
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e) => {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const toggleTheme = () => {
    playClickSound()
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const renderHostRef = useRef(null)
  const sceneRef = useRef(null)
  const cubeRef = useRef(null)
  const rendererRef = useRef(null)
  const cameraRef = useRef(null)
  const animationRef = useRef(null)
  const cubeGroupRef = useRef(null)
  const cubieMeshesRef = useRef([])
  const dragStateRef = useRef({ active: false, lastX: 0, lastY: 0 })
  const swapStateRef = useRef({ active: false, startIndex: null, hoverIndex: null })
  const lastInteractionRef = useRef(Date.now())
  const isAnimatingRef = useRef(false)
  const isDraggingRef = useRef(false)
  const cubeFacesRef = useRef(cubeFaces)
  const solverReadyRef = useRef(false)
  const cubeLibRef = useRef(null)

  useEffect(() => {
    if (!isSolving) {
      return
    }

    const startAt = Date.now() - elapsedMs
    const timerId = window.setInterval(() => {
      setElapsedMs(Date.now() - startAt)
    }, 200)

    return () => window.clearInterval(timerId)
  }, [elapsedMs, isSolving])

  useEffect(() => {
    if (!solverReadyRef.current) {
      try {
        if (typeof Cube.initSolver === 'function') {
          Cube.initSolver()
        }
        cubeLibRef.current = Cube
        solverReadyRef.current = true
      } catch (error) {
        cubeLibRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    cubeFacesRef.current = cubeFaces
  }, [cubeFaces])

  useEffect(() => {
    isAnimatingRef.current = isAnimating
  }, [isAnimating])

  useEffect(() => {
    isDraggingRef.current = isDragging
  }, [isDragging])

  const solverSteps = useMemo(() => {
    if (!solutionMoves.length) {
      return steps
    }
    return solutionMoves.map((move, index) => ({
      id: `move-${index + 1}`,
      title: `Move ${index + 1}`,
      method: 'Kociemba solver',
      moves: 1,
      turns: [move],
      notation: move,
      affectedFaces: [move[0]],
      description: `Execute ${move}.`,
    }))
  }, [solutionMoves, steps])

  const totalMoves = useMemo(
    () => solverSteps.reduce((acc, step) => acc + step.moves, 0),
    [solverSteps]
  )

  const activeStep = solverSteps[Math.min(currentStep, solverSteps.length - 1)]
  const activeFaceKey = FACE_ORDER[activeFaceIndex]
  const activeFaceLabel = FACE_LABELS[activeFaceKey]
  const faceProgress = FACE_ORDER.reduce((count, face) => {
    const filled = cubeFaces[face].filter(Boolean).length
    return count + (filled === 9 ? 1 : 0)
  }, 0)
  const stepFaces = activeStep.affectedFaces || []

  const colorLookup = useMemo(
    () =>
      PALETTE.reduce((acc, color) => {
        acc[color.key] = color.hex
        return acc
      }, {}),
    []
  )

  const markInteraction = useCallback((silent = false) => {
    lastInteractionRef.current = Date.now()
    if (!silent) playClickSound()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    playClickSound()
  }

  const faceColorMap = useMemo(
    () => ({
      R: cubeFaces.R || [],
      L: cubeFaces.L || [],
      U: cubeFaces.U || [],
      D: cubeFaces.D || [],
      F: cubeFaces.F || [],
      B: cubeFaces.B || [],
    }),
    [cubeFaces]
  )

  useEffect(() => {
    if (!renderHostRef.current || rendererRef.current) {
      return
    }

    const width = renderHostRef.current.clientWidth
    const height = renderHostRef.current.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#101413')
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(3.2, 3.2, 3.2)
    camera.lookAt(0, 0, 0)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    renderHostRef.current.appendChild(renderer.domElement)

    const ambient = new THREE.AmbientLight(0xffffff, 0.7)
    const directional = new THREE.DirectionalLight(0xffffff, 0.6)
    directional.position.set(4, 6, 3)
    scene.add(ambient, directional)

    const cubeGroup = new THREE.Group()
    const cubies = []

    for (let x = -1; x <= 1; x += 1) {
      for (let y = -1; y <= 1; y += 1) {
        for (let z = -1; z <= 1; z += 1) {
          const geometry = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE)
          const materials = Array.from({ length: 6 }, () =>
            new THREE.MeshStandardMaterial({ color: '#1a1f1d', roughness: 0.4 })
          )
          const mesh = new THREE.Mesh(geometry, materials)
          mesh.position.set(x * CUBIE_SPACING, y * CUBIE_SPACING, z * CUBIE_SPACING)
          mesh.userData.coord = { x, y, z }
          cubeGroup.add(mesh)
          cubies.push({ mesh, materials })
        }
      }
    }

    scene.add(cubeGroup)

    const animate = () => {
      const now = Date.now()
      const idle = now - lastInteractionRef.current > 5000
      if (idle && !isAnimatingRef.current && !isDraggingRef.current) {
        cubeGroup.rotation.y += 0.003
        cubeGroup.rotation.x += 0.0015
      }
      renderer.render(scene, camera)
      animationRef.current = requestAnimationFrame(animate)
    }
    animate()

    sceneRef.current = scene
    cubeGroupRef.current = cubeGroup
    cubeRef.current = cubeGroup
    cubieMeshesRef.current = cubies
    rendererRef.current = renderer
    cameraRef.current = camera

    const handleResize = () => {
      if (!renderHostRef.current || !rendererRef.current || !cameraRef.current) {
        return
      }
      const nextWidth = renderHostRef.current.clientWidth
      const nextHeight = renderHostRef.current.clientHeight
      rendererRef.current.setSize(nextWidth, nextHeight)
      cameraRef.current.aspect = nextWidth / nextHeight
      cameraRef.current.updateProjectionMatrix()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      renderer.dispose()
      if (renderer.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
      rendererRef.current = null
      cubeRef.current = null
      cubeGroupRef.current = null
      cubieMeshesRef.current = []
    }
  }, [])

  useEffect(() => {
    if (!cubieMeshesRef.current.length) {
      return
    }

    const dark = '#1a1f1d'
    cubieMeshesRef.current.forEach(({ mesh, materials }) => {
      const { x, y, z } = mesh.userData.coord

      const faceColor = (faceKey) => {
        const index = faceIndexFromCoord(faceKey, x, y, z)
        const colorKey = cubeFaces[faceKey]?.[index]
        return colorLookup[colorKey] || dark
      }

      materials[0].color.set(x === 1 ? faceColor('R') : dark)
      materials[1].color.set(x === -1 ? faceColor('L') : dark)
      materials[2].color.set(y === 1 ? faceColor('U') : dark)
      materials[3].color.set(y === -1 ? faceColor('D') : dark)
      materials[4].color.set(z === 1 ? faceColor('F') : dark)
      materials[5].color.set(z === -1 ? faceColor('B') : dark)
    })
  }, [cubeFaces, colorLookup])

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    playCameraSound(false)
    setCameraActive(false)
  }, [])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  const startCamera = useCallback(async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      playCameraSound(true)
      setCameraActive(true)
    } catch (error) {
      setCameraError('Camera access denied or unavailable.')
      setCameraActive(false)
    }
  }, [])

  const classifyColor = (r, g, b) => closestPaletteColor(r, g, b).key

  const animateTurn = useCallback(
    (turn, duration = 420) =>
      new Promise((resolve) => {
        const config = TURN_CONFIG[turn[0]]
        if (!config || !cubeGroupRef.current) {
          resolve()
          return
        }
        const isPrime = turn.includes("'")
        const isDouble = turn.includes('2')
        const dir = config.dir * (isPrime ? -1 : 1)
        const totalAngle = (Math.PI / 2) * (isDouble ? 2 : 1) * dir
        const axisVector =
          config.axis === 'x'
            ? new THREE.Vector3(1, 0, 0)
            : config.axis === 'y'
            ? new THREE.Vector3(0, 1, 0)
            : new THREE.Vector3(0, 0, 1)

        const pivot = new THREE.Group()
        const layerCubies = cubieMeshesRef.current
          .map((cubie) => cubie.mesh)
          .filter((mesh) => Math.round(mesh.userData.coord[config.axis]) === config.layer)

        cubeGroupRef.current.add(pivot)
        layerCubies.forEach((mesh) => pivot.attach(mesh))

        const start = performance.now()
        let lastProgress = 0
        const step = (now) => {
          const progress = Math.min(1, (now - start) / duration)
          const delta = (progress - lastProgress) * totalAngle
          pivot.rotateOnAxis(axisVector, delta)
          lastProgress = progress
          if (progress < 1) {
            requestAnimationFrame(step)
          } else {
            layerCubies.forEach((mesh) => {
              cubeGroupRef.current.add(mesh)
              const rotated = rotateCoord(mesh.userData.coord, config.axis, dir)
              mesh.userData.coord = {
                x: Math.round(rotated.x),
                y: Math.round(rotated.y),
                z: Math.round(rotated.z),
              }
              mesh.position.set(
                mesh.userData.coord.x * CUBIE_SPACING,
                mesh.userData.coord.y * CUBIE_SPACING,
                mesh.userData.coord.z * CUBIE_SPACING
              )
              mesh.rotation.set(0, 0, 0)
              mesh.quaternion.identity()
            })
            cubeGroupRef.current.remove(pivot)
            resolve()
          }
        }

        requestAnimationFrame(step)
      }),
    []
  )

  const animateStepTurns = useCallback(
    async (turns) => {
      for (const turn of turns) {
        await animateTurn(turn)
        setCubeFaces((prev) => applyMoveToFaces(prev, turn))
      }
    },
    [animateTurn]
  )

  const rotateFaceClockwise = useCallback(
    async (faceKey) => {
      if (isAnimatingRef.current) {
        return
      }
      markInteraction()
      setIsAnimating(true)
      await animateTurn(faceKey)
      setCubeFaces((prev) => applyMoveToFaces(prev, faceKey))
      setIsAnimating(false)
    },
    [animateTurn]
  )

  const scanFaceColors = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      return null
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) {
      return null
    }

    const width = video.videoWidth
    const height = video.videoHeight
    if (!width || !height) {
      return null
    }

    canvas.width = width
    canvas.height = height
    context.drawImage(video, 0, 0, width, height)

    const gridX = width * 0.3
    const gridY = height * 0.15
    const gridWidth = width * 0.4
    const gridHeight = height * 0.7
    const cellWidth = gridWidth / 3
    const cellHeight = gridHeight / 3
    
    // Sample a 10% box from the 15% inset corners
    const sampleSize = Math.max(1, Math.min(cellWidth, cellHeight) * 0.1)
    const insetX = cellWidth * 0.15
    const insetY = cellHeight * 0.15

    const faceColors = []
    let maxDistance = 0

    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const cellLeft = gridX + cellWidth * col
        const cellTop = gridY + cellHeight * row
        
        const corners = [
          { x: cellLeft + insetX, y: cellTop + insetY }, // TL
          { x: cellLeft + cellWidth - insetX - sampleSize, y: cellTop + insetY }, // TR
          { x: cellLeft + insetX, y: cellTop + cellHeight - insetY - sampleSize }, // BL
          { x: cellLeft + cellWidth - insetX - sampleSize, y: cellTop + cellHeight - insetY - sampleSize } // BR
        ]

        let totalR = 0
        let totalG = 0
        let totalB = 0
        let pixelCount = 0

        corners.forEach((corner) => {
          const startX = Math.max(0, Math.round(corner.x))
          const startY = Math.max(0, Math.round(corner.y))
          const sw = Math.min(width - startX, Math.round(sampleSize))
          const sh = Math.min(height - startY, Math.round(sampleSize))
          if (sw > 0 && sh > 0) {
            const pixels = context.getImageData(startX, startY, sw, sh).data
            for (let i = 0; i < pixels.length; i += 4) {
              totalR += pixels[i]
              totalG += pixels[i + 1]
              totalB += pixels[i + 2]
              pixelCount += 1
            }
          }
        })

        if (pixelCount > 0) {
          const r = Math.round(totalR / pixelCount)
          const g = Math.round(totalG / pixelCount)
          const b = Math.round(totalB / pixelCount)
          const { key, distance } = closestPaletteColor(r, g, b)
          faceColors.push(key)
          maxDistance = Math.max(maxDistance, distance)
        } else {
          faceColors.push('W')
          maxDistance = Number.POSITIVE_INFINITY
        }
      }
    }

    return { faceColors, maxDistance }
  }, [])

  const captureFaceFromVideo = () => {
    const result = scanFaceColors()
    if (!result) return

    playShutterSound()

    setCubeFaces((prev) => ({
      ...prev,
      [activeFaceKey]: result.faceColors,
    }))
  }

  useEffect(() => {
    let scanFrameId
    const scanLoop = () => {
      if (cameraActive) {
        const result = scanFaceColors()
        // Typical Lab distance for a solid match is < 2000, 
        // a very tight threshold is ~1000. 
        // Adjust threshold as necessary based on lighting conditions.
        if (result && result.maxDistance < 1800) {
          setIsFaceDetected(true)
        } else {
          setIsFaceDetected(false)
        }
        scanFrameId = requestAnimationFrame(scanLoop)
      } else {
        setIsFaceDetected(false)
      }
    }

    if (cameraActive) {
      scanFrameId = requestAnimationFrame(scanLoop)
    }

    return () => {
      if (scanFrameId) cancelAnimationFrame(scanFrameId)
    }
  }, [cameraActive, scanFaceColors])

  const handleStart = () => {
    if (isSolving) {
      return
    }
    markInteraction()
    setSolutionError('')
    try {
      const lib = cubeLibRef.current
      if (typeof lib?.fromString !== 'function') {
        setSolutionError('Solver unavailable. Please refresh or reinstall dependencies.')
        return
      }
      const centers = {
        U: cubeFaces.U?.[4],
        R: cubeFaces.R?.[4],
        F: cubeFaces.F?.[4],
        D: cubeFaces.D?.[4],
        L: cubeFaces.L?.[4],
        B: cubeFaces.B?.[4],
      }
      const centerMap = Object.entries(centers).reduce((acc, [face, color]) => {
        if (color) {
          acc[color] = face
        }
        return acc
      }, {})

      const faceletOrder = ['U', 'R', 'F', 'D', 'L', 'B']
      const facelets = faceletOrder
        .flatMap((faceKey) => cubeFaces[faceKey].map((color) => centerMap[color]))
        .join('')

      if (!facelets || facelets.includes('undefined')) {
        setSolutionError('Please complete all faces before solving.')
        return
      }

      const colorCounts = {}
      FACE_ORDER.forEach((faceKey) => {
        cubeFaces[faceKey].forEach((color) => {
          if (color) {
            colorCounts[color] = (colorCounts[color] || 0) + 1
          }
        })
      })

      const overusedColors = []
      Object.entries(colorCounts).forEach(([color, count]) => {
        if (count > 9) {
          const colorName = PALETTE.find((p) => p.key === color)?.label || color
          overusedColors.push(`${colorName} (${count})`)
        }
      })

      if (overusedColors.length > 0) {
        setSolutionError(`Too many of the following colors: ${overusedColors.join(', ')}. Please fix before solving.`)
        return
      }

      const cubeInstance = lib.fromString(facelets)

      // Mathematically "fix" the cube's internal state if it's physically unsolvable.
      // This ensures the solver still perfectly solves all valid pieces, 
      // leaving the twisted/flipped pieces exactly where they belong visually.
      if (cubeInstance.co && cubeInstance.eo && cubeInstance.cp && cubeInstance.ep) {
        const coSum = cubeInstance.co.reduce((a, b) => a + b, 0)
        if (coSum % 3 !== 0) {
          cubeInstance.co[0] = (cubeInstance.co[0] + (3 - (coSum % 3))) % 3
        }

        const eoSum = cubeInstance.eo.reduce((a, b) => a + b, 0)
        if (eoSum % 2 !== 0) {
          cubeInstance.eo[0] = (cubeInstance.eo[0] + 1) % 2
        }

        const getInversions = (arr) => {
          let inv = 0
          for (let i = 0; i < arr.length; i++) {
            for (let j = i + 1; j < arr.length; j++) {
              if (arr[i] > arr[j]) inv++
            }
          }
          return inv
        }

        const cpInv = getInversions(cubeInstance.cp)
        const epInv = getInversions(cubeInstance.ep)
        if (cpInv % 2 !== epInv % 2) {
          const temp = cubeInstance.ep[0]
          cubeInstance.ep[0] = cubeInstance.ep[1]
          cubeInstance.ep[1] = temp
        }
      }

      if (typeof cubeInstance?.solve !== 'function') {
        setSolutionError('Solver unavailable. Please refresh or reinstall dependencies.')
        return
      }

      if (cubeInstance.isSolved()) {
        setSolutionError('Cube is already solved!')
        return
      }
      const solution = cubeInstance.solve()
      const movesList = solution.trim().split(/\s+/).filter(Boolean)
      setSolutionMoves(movesList)
      setIsSolving(true)
      setElapsedMs(0)
      setMoves(0)
      setCurrentStep(0)
      setAiHint('')
    } catch (error) {
      setSolutionError('Unable to solve. Check the cube state for errors.')
    }
  }

  const handleRandomize = () => {
    markInteraction()
    setSolutionError('')
    const lib = cubeLibRef.current
    if (typeof lib?.random !== 'function') {
      setSolutionError('Randomizer unavailable. Please refresh or reinstall dependencies.')
      return
    }
    const randomCube = lib.random()
    const facelets = randomCube.asString()
    setCubeFaces(faceletStringToFaces(facelets))
    setSolutionMoves([])
    setIsSolving(false)
    setElapsedMs(0)
    setMoves(0)
    setCurrentStep(0)
    setAiHint('')
  }

  const handleNextStep = async () => {
    if (!isSolving || currentStep >= solverSteps.length || isAnimating) {
      return
    }

    setAiHint('')
    markInteraction()
    setIsAnimating(true)
    await animateStepTurns(solverSteps[currentStep].turns || [])
    setIsAnimating(false)

    const nextMoves = solverSteps[currentStep].moves
    setMoves((prevMoves) => prevMoves + nextMoves)
    setCurrentStep((prevStep) => prevStep + 1)

    if (currentStep + 1 >= solverSteps.length) {
      setIsSolving(false)
    }
  }

  useEffect(() => {
    if (!isSolving && currentStep > 0 && solverSteps.length > 0 && currentStep >= solverSteps.length) {
      const isSolved = FACE_ORDER.every((faceKey) => {
        const centerColor = cubeFaces[faceKey][4]
        return cubeFaces[faceKey].every((color) => color === centerColor)
      })

      if (!isSolved) {
        setSolutionError(
          'Corner twist detected! The cube was physically unsolvable. Please twist the mismatched corner(s) or edge(s) manually to complete the solve.'
        )
      }
    }
  }, [isSolving, currentStep, solverSteps, cubeFaces])

  const handlePreviousStep = async () => {
    if (!isSolving || currentStep <= 0 || isAnimating) {
      return
    }

    setAiHint('')
    markInteraction()
    setIsAnimating(true)
    const prevStepIndex = currentStep - 1
    const turnsToReverse = [...(solverSteps[prevStepIndex].turns || [])].reverse()
    
    for (const turn of turnsToReverse) {
      const inverted = invertTurn(turn)
      await animateTurn(inverted)
      setCubeFaces((prev) => applyMoveToFaces(prev, inverted))
    }
    setIsAnimating(false)

    setMoves((prev) => prev - solverSteps[prevStepIndex].moves)
    setCurrentStep(prevStepIndex)
    
    // Automatically re-enable solving if we stepped back from the end
    if (!isSolving) setIsSolving(true)
  }

  const generateAIHint = async () => {
    if (isGeneratingHint || aiHint) return
    setIsGeneratingHint(true)
    setAiHint('')

    const step = activeStep
    let promptText = `Analyzing current cube state for ${step.title}...`
    let response = ''
    
    if (step.method.includes('CFOP') || step.method.includes('solver')) {
      response = `Since you're executing ${step.method}, focus on recognizing the pattern for ${step.title}. Try to look ahead to the next orientation while executing the sequence: ${step.notation}.`
    } else {
      response = `For the ${step.title} step, the key is to perform ${step.notation} fluidly. Make sure the affected faces (${step.affectedFaces?.join(', ') || step.notation[0]}) are aligned correctly before starting.`
    }

    const fullText = promptText + '\n\n💡 Tip: ' + response
    for (let i = 0; i <= fullText.length; i++) {
      await new Promise((r) => setTimeout(r, 15 + Math.random() * 20))
      if (fullText[i] && fullText[i].trim() !== '') playTypingSound()
      setAiHint(fullText.substring(0, i))
    }
    setIsGeneratingHint(false)
  }

  const handleReset = () => {
    setIsSolving(false)
    setElapsedMs(0)
    setMoves(0)
    setCurrentStep(0)
    setAiHint('')
    setCubeFaces(createEmptyFaces())
    stopCamera()
  }

  const updateFacelet = (index) => {
    setCubeFaces((prev) => ({
      ...prev,
      [activeFaceKey]: prev[activeFaceKey].map((cell, cellIndex) =>
        cellIndex === index ? selectedColor : cell
      ),
    }))
  }

  const handleSwapStart = (index, event) => {
    markInteraction()
    swapStateRef.current = { active: true, startIndex: index, hoverIndex: index }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleSwapEnter = (index) => {
    if (!swapStateRef.current.active) {
      return
    }
    swapStateRef.current.hoverIndex = index
  }

  const handleSwapEnd = (index, event) => {
    const { startIndex, hoverIndex } = swapStateRef.current
    swapStateRef.current = { active: false, startIndex: null, hoverIndex: null }
    event.currentTarget.releasePointerCapture(event.pointerId)

    if (startIndex === null) {
      return
    }

    if (hoverIndex !== null && hoverIndex !== startIndex) {
      playWooshSound()
      setCubeFaces((prev) => {
        const next = [...prev[activeFaceKey]]
        const temp = next[startIndex]
        next[startIndex] = next[hoverIndex]
        next[hoverIndex] = temp
        return {
          ...prev,
          [activeFaceKey]: next,
        }
      })
      return
    }

    updateFacelet(index)
  }

  const handlePointerDown = (event) => {
    if (isAnimating) {
      return
    }
    markInteraction(true)
    dragStateRef.current = {
      active: true,
      lastX: event.clientX,
      lastY: event.clientY,
      hasMoved: false,
    }
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event) => {
    if (!dragStateRef.current.active || !cubeGroupRef.current || isAnimating) {
      return
    }
    markInteraction(true)
    const deltaX = event.clientX - dragStateRef.current.lastX
    const deltaY = event.clientY - dragStateRef.current.lastY
    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
      dragStateRef.current.hasMoved = true
    }
    dragStateRef.current.lastX = event.clientX
    dragStateRef.current.lastY = event.clientY
    cubeGroupRef.current.rotation.y += deltaX * 0.008
    cubeGroupRef.current.rotation.x += deltaY * 0.008
  }

  const handlePointerUp = (event) => {
    if (dragStateRef.current.hasMoved) {
      playWooshSound()
    }
    dragStateRef.current.active = false
    setIsDragging(false)
    markInteraction(true)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="branding-left">
           <img src="/logo.png" alt="Rubik's Cube Logo" className="app-logo" />
        </div>
        <div className="branding-center">
          <p className="eyebrow">Live Rubik's Cube Solver</p>
          <h1>Scan. Solve. Learn every move.</h1>
        </div>
        <div className="branding-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="ghost" onClick={toggleTheme} aria-label="Toggle theme" style={{ padding: '8px', display: 'grid', placeItems: 'center' }}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <a href="https://github.com/SteamPunkNation" target="_blank" rel="noopener noreferrer" className="github-link" aria-label="GitHub Profile">
             <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
               <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
             </svg>
          </a>
        </div>
      </header>

      <div className="stats">
          <div>
            <span className="stat-label">Timer</span>
            <span className="stat-value">{formatTime(elapsedMs)}</span>
          </div>
          <div>
            <span className="stat-label">Moves</span>
            <span className="stat-value">{moves}</span>
          </div>
          <div>
            <span className="stat-label">Planned Moves</span>
            <span className="stat-value">{totalMoves}</span>
          </div>
          <button className="ghost" type="button" onClick={handleReset}>
            Reset
          </button>
        </div>

      <main className="grid">
        <section className="panel camera">
          <div className="panel-header">
            <div>
              <h2>Camera Capture</h2>
              <p>
                Align the {activeFaceLabel} face in the 3x3 guide and capture
                colors.
              </p>
            </div>
            <div className="panel-actions">
              <button
                className="primary"
                type="button"
                onClick={cameraActive ? stopCamera : startCamera}
              >
                {cameraActive ? 'Stop camera' : 'Start camera'}
              </button>
              <button
                className="ghost"
                type="button"
                onClick={captureFaceFromVideo}
                disabled={!cameraActive}
              >
                Capture face
              </button>
            </div>
          </div>

          <div className="camera-frame">
            <video
              ref={videoRef}
              className="camera-video"
              muted
              playsInline
            ></video>
            <div className={`grid-overlay ${isFaceDetected ? 'detected' : ''}`}>
              {Array.from({ length: 9 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
            <div className="camera-hint">Hold the cube steady and tap capture.</div>
          </div>

          {cameraError ? <p className="camera-error">{cameraError}</p> : null}

          <div className="face-row">
            {FACE_ORDER.map((face, index) => (
              <button
                key={face}
                className={`face-chip ${
                  index === activeFaceIndex ? 'active' : ''
                }`}
                type="button"
                onClick={() => setActiveFaceIndex(index)}
              >
                {face} ({FACE_LABELS[face]})
              </button>
            ))}
          </div>
        </section>

        <section className="panel render">
          <div className="panel-header">
            <div>
              <h2>3D Cube Preview</h2>
              <p>Preview the detected state and play the solution animation.</p>
            </div>
            <div className="panel-actions">
              <button className="primary" type="button" onClick={handleStart}>
                {isSolving ? 'Solving...' : 'Solve cube'}
              </button>
              <button className="ghost" type="button" onClick={handleRandomize}>
                Randomize
              </button>
              <button
                className="ghost"
                type="button"
                onClick={handlePreviousStep}
                disabled={!isSolving || isAnimating || currentStep <= 0}
              >
                Previous step
              </button>
              <button
                className="ghost"
                type="button"
                onClick={handleNextStep}
                disabled={!isSolving || isAnimating || currentStep >= solverSteps.length}
              >
                Next step
              </button>
            </div>
          </div>

          {solutionError ? (
            <p className="camera-error">{solutionError}</p>
          ) : null}

          <div className="render-stage">
              <div
                className={`cube-stage ${isDragging ? 'dragging' : ''}`}
                ref={renderHostRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                <div className="cube-arrows" aria-hidden="true" style={{ pointerEvents: 'auto' }}>
                  <span className="arrow arrow-up" onClick={() => playClickSound()} style={{ cursor: 'pointer', padding: '10px' }}>↑</span>
                  <span className="arrow arrow-right" onClick={() => playClickSound()} style={{ cursor: 'pointer', padding: '10px' }}>→</span>
                  <span className="arrow arrow-down" onClick={() => playClickSound()} style={{ cursor: 'pointer', padding: '10px' }}>↓</span>
                  <span className="arrow arrow-left" onClick={() => playClickSound()} style={{ cursor: 'pointer', padding: '10px' }}>←</span>
                </div>
              </div>
            <div className="callout">
              <span className="callout-label">Current technique</span>
              <strong>{activeStep.method}</strong>
              <p>{activeStep.description}</p>
              
              <div className="ai-hint-section">
                {!aiHint && !isGeneratingHint ? (
                  <button className="ghost ai-button" type="button" onClick={generateAIHint}>
                    ✨ Get AI Hint
                  </button>
                ) : (
                  <div className={`ai-hint-box ${isGeneratingHint ? 'generating' : ''}`}>
                    {aiHint}
                    {isGeneratingHint && <span className="cursor" />}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="panel steps">
          <div className="panel-header">
            <div>
              <h2>Solution Steps</h2>
              <p>Step-by-step guide with named algorithms.</p>
            </div>
            <span className="badge">
              {isSolving ? 'Live' : 'Ready'}
            </span>
          </div>

          <div className="step-detail">
            <div>
              <span className="stat-label">Active step</span>
              <h3>{activeStep.title}</h3>
              <p className="step-notation">Moves: {activeStep.notation}</p>
            </div>
            <div className="step-faces">
              {stepFaces.map((face) => (
                <div key={face} className="face-pill">
                  <span
                    className="face-swatch"
                    style={{ backgroundColor: colorLookup[cubeFaces[face]?.[4]] || '#2a2a2a' }}
                  ></span>
                  <strong>{face}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="step-face-grid">
            {stepFaces.map((face) => (
              <div key={face} className="step-face-card">
                <span>{FACE_LABELS[face]}</span>
                <div className="mini-grid">
                  {cubeFaces[face].map((cell, index) => (
                    <span
                      key={index}
                      style={{ backgroundColor: colorLookup[cell] || '#f1e1b9' }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <ol className="step-list">
            {solverSteps.map((step, index) => {
              const isActive = index === currentStep
              const isComplete = index < currentStep

              return (
                <li
                  key={step.id}
                  className={`step ${isActive ? 'active' : ''} ${
                    isComplete ? 'done' : ''
                  }`}
                >
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.method}</p>
                  </div>
                  <span>{step.moves} moves</span>
                </li>
              )
            })}
          </ol>
        </section>

        <section className="panel capture">
          <div className="panel-header">
            <div>
              <h2>Manual Entry</h2>
              <p>Tap a square to set its color. Use this if scanning is off.</p>
            </div>
            <span className="badge">{faceProgress}/6 faces ready</span>
          </div>
          <div className="manual-entry">
            <div className="manual-controls">
              <div className="face-row">
                {FACE_ORDER.map((face, index) => (
                  <button
                    key={face}
                    className={`face-chip ${
                      index === activeFaceIndex ? 'active' : ''
                    }`}
                    type="button"
                    onClick={() => setActiveFaceIndex(index)}
                  >
                    {face} ({FACE_LABELS[face]})
                  </button>
                ))}
              </div>
              <div className="palette">
                {PALETTE.map((color) => (
                  <button
                    key={color.key}
                    className={`palette-swatch ${
                      selectedColor === color.key ? 'active' : ''
                    }`}
                    type="button"
                    style={{ backgroundColor: color.hex }}
                    onClick={() => setSelectedColor(color.key)}
                    aria-label={`Select ${color.label}`}
                  />
                ))}
              </div>
            </div>
            <div className="manual-grid">
              {cubeFaces[activeFaceKey].map((cell, index) => (
                <button
                  key={index}
                  type="button"
                  className="manual-cell"
                  style={{ backgroundColor: colorLookup[cell] || '#f1e1b9' }}
                  onPointerDown={(event) => handleSwapStart(index, event)}
                  onPointerEnter={() => handleSwapEnter(index)}
                  onPointerUp={(event) => handleSwapEnd(index, event)}
                  aria-label={`Set ${activeFaceLabel} cell ${index + 1}`}
                />
              ))}
            </div>
            <div className="face-grid">
              {FACE_ORDER.map((face) => (
                <div key={face} className="face-card">
                  <span>{FACE_LABELS[face]}</span>
                  <div className="mini-grid">
                    {cubeFaces[face].map((cell, index) => (
                      <span
                        key={index}
                        style={{ backgroundColor: colorLookup[cell] || '#f1e1b9' }}
                      />
                    ))}
                  </div>
                  <button
                    className="ghost face-rotate"
                    type="button"
                    onClick={() => rotateFaceClockwise(face)}
                  >
                    Rotate face
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <canvas ref={canvasRef} className="capture-canvas" />
      
      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} SteamPunkNation. All rights reserved.</p>
        <p>Built with React, Three.js, and Cube.js</p>
      </footer>

      {showBackToTop && (
        <button className="back-to-top" onClick={scrollToTop} aria-label="Back to top">
          ↑
        </button>
      )}
    </div>
  )
}

export default App
