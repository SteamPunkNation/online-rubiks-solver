import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'
import * as THREE from 'three'

// Mock WebGLRenderer to prevent JSDOM crashes
vi.mock('three', async () => {
  const actual = await vi.importActual('three')
  return {
    ...actual,
    WebGLRenderer: class {
      constructor() {
        this.domElement = document.createElement('canvas')
      }
      setSize() {}
      setPixelRatio() {}
      render() {}
      dispose() {}
    }
  }
})

// Mock AudioContext
window.AudioContext = class {
  constructor() {
    this.state = 'suspended'
  }
  resume() {
    this.state = 'running'
  }
  createOscillator() {
    return {
      type: 'sine',
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }
  }
  createGain() {
    return {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    }
  }
  createBuffer() {
    return {
      getChannelData: vi.fn().mockReturnValue(new Float32Array(100)),
    }
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
    }
  }
}
window.webkitAudioContext = window.AudioContext

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing and displays the title', () => {
    render(<App />)
    expect(screen.getByText(/Rubik's Cube Solver/i)).toBeInTheDocument()
  })

  it('renders all core UI panels', () => {
    render(<App />)
    expect(screen.getByText(/Capture face/i)).toBeInTheDocument()
    expect(screen.getByText(/Manual Entry/i)).toBeInTheDocument()
    expect(screen.getByText('Solve cube')).toBeInTheDocument()
    expect(screen.getByText(/Randomize/i)).toBeInTheDocument()
    expect(screen.getByText(/Reset/i)).toBeInTheDocument()
  })

  it('can click Randomize without crashing', () => {
    render(<App />)
    const randomizeBtn = screen.getByText(/Randomize/i)
    fireEvent.click(randomizeBtn)
    expect(screen.getByText('Solve cube')).toBeInTheDocument() // UI remains stable
  })

  it('can click Reset without crashing', () => {
    render(<App />)
    const resetBtn = screen.getByText(/Reset/i)
    fireEvent.click(resetBtn)
    expect(screen.getByText('Solve cube')).toBeInTheDocument() // UI remains stable
  })
})
