export const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B']

export const FACE_LABELS = {
  U: 'Up',
  R: 'Right',
  F: 'Front',
  D: 'Down',
  L: 'Left',
  B: 'Back',
}

export const PALETTE = [
  { key: 'W', label: 'White', hex: '#f7f4ed', rgb: [240, 240, 240] },
  { key: 'Y', label: 'Yellow', hex: '#f7d247', rgb: [230, 210, 40] },
  { key: 'R', label: 'Red', hex: '#e34a3a', rgb: [200, 40, 40] },
  { key: 'O', label: 'Orange', hex: '#f08c36', rgb: [230, 110, 20] },
  { key: 'B', label: 'Blue', hex: '#2979ff', rgb: [30, 80, 200] },
  { key: 'G', label: 'Green', hex: '#1f9d6a', rgb: [0, 150, 70] },
]

export const TURN_CONFIG = {
  U: { axis: 'y', layer: 1, dir: -1 },
  D: { axis: 'y', layer: -1, dir: 1 },
  R: { axis: 'x', layer: 1, dir: -1 },
  L: { axis: 'x', layer: -1, dir: 1 },
  F: { axis: 'z', layer: 1, dir: -1 },
  B: { axis: 'z', layer: -1, dir: 1 },
}

export const CUBIE_SPACING = 0.62
export const CUBIE_SIZE = 0.56
export const FACE_COLOR_MAP = {
  U: 'W',
  R: 'R',
  F: 'G',
  D: 'Y',
  L: 'O',
  B: 'B',
}

export const createEmptyFaces = () =>
  Object.fromEntries(FACE_ORDER.map((face) => {
    const arr = Array(9).fill(null)
    arr[4] = FACE_COLOR_MAP[face]
    return [face, arr]
  }))

export const invertTurn = (turn) => {
  if (turn.includes('2')) return turn
  return turn.includes("'") ? turn[0] : turn + "'"
}

export const generateScramble = (length = 20) => {
  const faces = ['U', 'D', 'L', 'R', 'F', 'B']
  const modifiers = ['', "'", '2']
  const scramble = []
  
  for (let i = 0; i < length; i++) {
    let randomFace
    do {
      randomFace = faces[Math.floor(Math.random() * faces.length)]
    } while (
      // Prevent consecutive identical faces (e.g. U U')
      (i > 0 && randomFace === scramble[i - 1][0]) ||
      // Prevent overlapping opposites (e.g. U D U)
      (i > 1 && randomFace === scramble[i - 2][0] && 
        ((randomFace === 'U' && scramble[i - 1][0] === 'D') ||
         (randomFace === 'D' && scramble[i - 1][0] === 'U') ||
         (randomFace === 'L' && scramble[i - 1][0] === 'R') ||
         (randomFace === 'R' && scramble[i - 1][0] === 'L') ||
         (randomFace === 'F' && scramble[i - 1][0] === 'B') ||
         (randomFace === 'B' && scramble[i - 1][0] === 'F')))
    )
    
    const randomModifier = modifiers[Math.floor(Math.random() * modifiers.length)]
    scramble.push(randomFace + randomModifier)
  }
  
  return scramble
}

export const formatTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export const normalizeRgb = (r, g, b) => {
  const max = Math.max(r, g, b)
  if (max === 0) {
    return [r, g, b]
  }
  const scale = Math.min(240 / max, 1.8)
  return [Math.min(255, r * scale), Math.min(255, g * scale), Math.min(255, b * scale)]
}

export const rgbToXyz = (r, g, b) => {
  const srgb = [r, g, b].map((value) => {
    const scaled = value / 255
    return scaled <= 0.04045 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4)
  })
  const [rr, gg, bb] = srgb
  const x = rr * 0.4124 + gg * 0.3576 + bb * 0.1805
  const y = rr * 0.2126 + gg * 0.7152 + bb * 0.0722
  const z = rr * 0.0193 + gg * 0.1192 + bb * 0.9505
  return [x, y, z]
}

export const xyzToLab = (x, y, z) => {
  const refX = 0.95047
  const refY = 1.0
  const refZ = 1.08883
  const transform = (value) => {
    const normalized = value
    return normalized > 0.008856
      ? Math.pow(normalized, 1 / 3)
      : 7.787 * normalized + 16 / 116
  }
  const fx = transform(x / refX)
  const fy = transform(y / refY)
  const fz = transform(z / refZ)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

export const rgbToLab = (r, g, b) => {
  const [x, y, z] = rgbToXyz(r, g, b)
  return xyzToLab(x, y, z)
}

export const closestPaletteColor = (r, g, b) => {
  const [nr, ng, nb] = normalizeRgb(r, g, b)
  const [l1, a1, b1] = rgbToLab(nr, ng, nb)
  let bestKey = 'W'
  let bestDistance = Number.POSITIVE_INFINITY

  PALETTE.forEach((color) => {
    const [l2, a2, b2] = rgbToLab(color.rgb[0], color.rgb[1], color.rgb[2])
    const distance = (l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2
    if (distance < bestDistance) {
      bestDistance = distance
      bestKey = color.key
    }
  })

  return { key: bestKey, distance: bestDistance }
}
