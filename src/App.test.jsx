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

  it('can toggle correct active face state when navigating faces', () => {
    render(<App />)
    
    // We expect the button text: "U (Up)" - multiple might exist (e.g. one in Camera, one in Manual)
    expect(screen.getAllByText(/U\s*\(Up\)/i).length).toBeGreaterThan(0)

    // Test a basic interaction: clicking 'Next face' on face step pagination
    const nextBtn = screen.getAllByRole('button').find(b => b.textContent.match(/next/i))
    if (nextBtn) {
      fireEvent.click(nextBtn)
      // The second face in FACE_ORDER is R (Right)
      expect(screen.getAllByText(/R\s*\(Right\)/i).length).toBeGreaterThan(0)
    }
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

  it('has default un-started timer and moves value', () => {
    render(<App />)
    // Check Timer initialization
    expect(screen.getByText('00:00')).toBeInTheDocument()
    
    // Check active labels inside the Stats UI part
    expect(screen.getByText('Moves')).toBeInTheDocument()
    expect(screen.getByText('Planned Moves')).toBeInTheDocument()
  })

  it('correctly maps clicking color palette selection', () => {
    render(<App />)
    // The initial selected state maps to "W"
    // Look up the palette options that are rendered
    const redPaletteBtn = screen.getByLabelText(/Select Red/i)
    if (redPaletteBtn) {
      fireEvent.click(redPaletteBtn)
      expect(redPaletteBtn).toHaveClass('active')
    }
  })
})
