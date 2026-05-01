# AI SE Mini Project 4

Live Rubik's Cube solver UI scaffold using React + Vite. It provides an interactive Rubik's Cube with a solver powered by the Kociemba algorithm.

## Features
- Real-time 3D View of the cube using Three.js.
- Manual entry mode to configure your cube state.
- Camera-based color capture support.
- Fully tested React components and color conversion logic with Vitest.
- Continuous Integration (CI) seamlessly running via GitHub Actions.

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the dev server:
   ```bash
   npm run dev
   ```

## Running Tests

To run the unit tests in interactive watch mode:
```bash
npm run test
```

To run a single automated run (CI mode):
```bash
npm run test:ci
```
