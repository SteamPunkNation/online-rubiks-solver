import { describe, it, expect } from 'vitest'
import {
  formatTime,
  invertTurn,
  normalizeRgb,
  rgbToXyz,
  xyzToLab,
  rgbToLab,
  closestPaletteColor,
  createEmptyFaces,
  FACE_ORDER,
  PALETTE,
  TURN_CONFIG
} from './utils'

describe('formatTime', () => {
  it('formats milliseconds to MM:SS correctly', () => {
    expect(formatTime(0)).toBe('00:00')
    expect(formatTime(59000)).toBe('00:59')
    expect(formatTime(61000)).toBe('01:01')
    expect(formatTime(3600000)).toBe('60:00')
  })

  it('pads single digit minutes and seconds', () => {
    expect(formatTime(1000)).toBe('00:01')
    expect(formatTime(60000)).toBe('01:00')
    expect(formatTime(125000)).toBe('02:05')
  })
})

describe('invertTurn', () => {
  it('inverts single moves correctly', () => {
    expect(invertTurn('U')).toBe("U'")
    expect(invertTurn('R')).toBe("R'")
    expect(invertTurn('F')).toBe("F'")
  })

  it('inverts prime moves correctly', () => {
    expect(invertTurn("U'")).toBe('U')
    expect(invertTurn("D'")).toBe('D')
    expect(invertTurn("B'")).toBe('B')
  })

  it('keeps double moves the same', () => {
    expect(invertTurn('U2')).toBe('U2')
    expect(invertTurn('R2')).toBe('R2')
    expect(invertTurn('F2')).toBe('F2')
  })
})

describe('Color Logic Engine', () => {
  it('normalizeRgb handles edge cases', () => {
    expect(normalizeRgb(0, 0, 0)).toEqual([0, 0, 0])
    
    // Scale max up
    const normalized = normalizeRgb(100, 50, 25)
    expect(normalized[0]).toBe(180)
    expect(normalized[1]).toBe(90)
    expect(normalized[2]).toBe(45)
  })

  it('normalizeRgb limits values correctly', () => {
    // Math.min(255) ensures values don't exceed color bounds
    const maxScaled = normalizeRgb(255, 255, 255)
    expect(maxScaled).toEqual([240, 240, 240]) // using scale logic (240/255)
  })

  it('rgbToXyz converts properly (spot check)', () => {
    const [x, y, z] = rgbToXyz(255, 255, 255)
    expect(x).toBeCloseTo(0.950, 2)
    expect(y).toBeCloseTo(1.0, 2)
    expect(z).toBeCloseTo(1.088, 2)
  })

  it('xyzToLab converts properly', () => {
    const [l, a, b] = xyzToLab(0.95047, 1.0, 1.08883)
    expect(l).toBeCloseTo(100, 1)
    expect(a).toBeCloseTo(0, 1)
    expect(b).toBeCloseTo(0, 1)
  })

  it('rgbToLab converts properly', () => {
    const [l, a, b] = rgbToLab(255, 255, 255)
    expect(l).toBeCloseTo(100, 1)
    expect(a).toBeCloseTo(0, 1)
    expect(b).toBeCloseTo(0, 1)
  })

  it('closestPaletteColor identifies standard colors', () => {
    // Pure Red
    expect(closestPaletteColor(255, 0, 0).key).toBe('R')
    
    // Pure Green
    expect(closestPaletteColor(0, 255, 0).key).toBe('G')
    
    // Pure Blue
    expect(closestPaletteColor(0, 0, 255).key).toBe('B')
    
    // Pure White
    expect(closestPaletteColor(255, 255, 255).key).toBe('W')
    
    // Pure Yellow
    expect(closestPaletteColor(255, 255, 0).key).toBe('Y')
  })
})

describe('Constant Definitions', () => {
  it('FACE_ORDER contains exactly 6 faces in correct order', () => {
    expect(FACE_ORDER).toEqual(['U', 'R', 'F', 'D', 'L', 'B'])
    expect(FACE_ORDER.length).toBe(6)
  })

  it('PALETTE contains exactly 6 standard Rubik defaults', () => {
    expect(PALETTE.length).toBe(6)
    const keys = PALETTE.map(c => c.key)
    expect(keys).toEqual(expect.arrayContaining(['W', 'Y', 'R', 'O', 'B', 'G']))
  })

  it('TURN_CONFIG maps standard moves correctly', () => {
    expect(TURN_CONFIG.U).toBeDefined()
    expect(TURN_CONFIG.R).toBeDefined()
    expect(TURN_CONFIG.F.axis).toBe('z')
  })
})

describe('Cube Factory', () => {
  it('createEmptyFaces generates exactly 6 faces with center colors', () => {
    const faces = createEmptyFaces()
    expect(Object.keys(faces)).toEqual(['U', 'R', 'F', 'D', 'L', 'B'])
    
    // Centers
    expect(faces.U[4]).toBe('W')
    expect(faces.R[4]).toBe('R')
    expect(faces.F[4]).toBe('G')
    expect(faces.D[4]).toBe('Y')
    expect(faces.L[4]).toBe('O')
    expect(faces.B[4]).toBe('B')
    
    // Edges/Corners should be null
    expect(faces.U[0]).toBeNull()
  })
})
