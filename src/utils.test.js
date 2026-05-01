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
} from './utils'

describe('formatTime', () => {
  it('formats milliseconds to MM:SS correctly', () => {
    expect(formatTime(0)).toBe('00:00')
    expect(formatTime(59000)).toBe('00:59')
    expect(formatTime(61000)).toBe('01:01')
    expect(formatTime(3600000)).toBe('60:00')
  })
})

describe('invertTurn', () => {
  it('inverts single moves correctly', () => {
    expect(invertTurn('U')).toBe("U'")
    expect(invertTurn('R')).toBe("R'")
  })

  it('inverts prime moves correctly', () => {
    expect(invertTurn("U'")).toBe('U')
    expect(invertTurn("D'")).toBe('D')
  })

  it('keeps double moves the same', () => {
    expect(invertTurn('U2')).toBe('U2')
    expect(invertTurn('R2')).toBe('R2')
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
