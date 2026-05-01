# Rubik's Cube Solver - Design Document

## Constraints and Requirements
### Constraints
- The application must run entirely in the browser.
- Webcam API must gracefully handle lack of permissions by providing fallback manual input.
- High performance for 3D rendering (60 FPS on average hardware).
- Mobile responsiveness for the UI.

### Requirements
- **Camera Capture**: Use MediaDevices API to capture 6 sides of a physical cube.
- **Manual Input**: Interactive 3D or 2D UI for users to paint the cube faces.
- **Randomizer**: Generate a scrambled cube on command.
- **Solver Engine**: Yield sequential steps using Kociemba's algorithm or similar (via cubejs).
- **Playback Animation**: 3D animated sequence of moves (play, pause, next step, previous step).

## Work-Breakdown Structure (Tasks)
1. **Setup & 3D Environment**: Initialize Vite/React, setup Three.js/React-Three-Fiber context, configure the basic Rubik's cube geometry and materials.
2. **State Management**: Develop the internal cube representation (state array/matrix) and standard move application (U, D, R, L, F, B).
3. **Manual Input Interface**: Create a UI palette to select colors and apply them by clicking on the 3D cube facelets.
4. **Webcam Capture Integration**: Access the webcam video feed, provide an overlay box, capture frames, and extract dominant colors into the cube state.
5. **Solver Logic**: Integrate a JavaScript-based Rubik's cube solver (e.g., `cubejs` package). Map internal state format to the solver string format.
6. **Playback Engine**: Build an animation system for face rotation, hooking it to the solution output. Add UI controls (Play/Pause/Scrub).
7. **Testing & Polish**: Visual cleanup, handling impossible cube states (input validation), animations smoothing.

## Testing and Acceptance Criteria
- **Acceptance 1 (Random/Solve)**: Generating a random scramble and clicking 'Solve' produces a verifiable valid sequence of moves restoring it to the solved state in the 3D viewer.
- **Acceptance 2 (Manual Input)**: Users can paint an entire cube using the color palette, and if valid, it returns a correct solution.
- **Acceptance 3 (Camera)**: The app successfully requests camera access, displays the feed, and captures colors with reasonable accuracy for a standard lit room.
- **Acceptance 4 (Playback)**: Users can scrub forward and backward through generated steps, and the visual state accurately matches the step's expected outcome.
- **Testing**:
  - Unit tests for internal cube state valid checks (e.g. max 9 of each color, valid edges).
  - Manual visual regression tests on 320px vs 1920px screen sizes.

## One-Shot vs Incremental Approaches
### One-Shot (Big Bang) Approach
- **Pros**: Can allow for architecture cross-cutting early on, preventing refactoring.
- **Cons**: Extremely hard to test intermediate mechanics; UI, webcam, and 3D interactions might conflict. Debugging a unified solver + camera + 3D rendering feature simultaneously is chaotic.
### Incremental Approach
- **Pros**: Reduces risk. We can build and verify the 3D cube model first, then add state manipulation, then visual animations, then manual input, and finally attach the webcam capture (the most error-prone feature due to lighting limitations).
- **Cons**: Might require slightly more architectural refactoring if the 3D model state doesn't natively map to the solver string format easily at first.
- **Decision**: We will use the **Incremental Approach**.
