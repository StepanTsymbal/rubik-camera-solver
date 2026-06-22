# Rubik Camera Solver: Agent Notes

## Project Goal

Build a camera-assisted Rubik's Cube solver web application.

Core workflow:

1. Capture all 6 cube faces from the webcam.
2. Convert sampled sticker colors into a 54-character cube facelet string.
3. Validate the cube state.
4. Solve with a Kociemba-style two-phase solver.
5. Show step-by-step move guidance on a 3D cube.

## Current Stack

- Frontend: React + TypeScript + Vite
- 3D: Three.js via `@react-three/fiber`
- Solver: `cubejs@1.1.0`
- Icons: `lucide-react`
- Styling: plain CSS in `src/styles.css`

## Important Commands

```powershell
npm install
npm run dev -- --port 5173
npm run build
npm audit --omit=dev
```

Local app URL:

```text
http://127.0.0.1:5173
```

The dev server may have been started as a hidden process. To stop a server on port `5173`:

```powershell
Get-NetTCPConnection -LocalPort 5173 |
  Where-Object { $_.OwningProcess -ne 0 } |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force }
```

## Current Implementation

Main files:

- `src/main.tsx`: app shell, scanner workflow, capture state, solve button, playback controls.
- `src/cube.ts`: cube facelet types, validation, move parsing, move application for 3D preview.
- `src/color.ts`: webcam grid sampling, white-balance correction, RGB to LAB conversion, nearest-color classification.
- `src/solver.ts`: dynamic `cubejs` solver loading and facelet solve path.
- `src/visual/CubeGuide.tsx`: React Three Fiber cube visualization.
- `src/styles.css`: responsive UI styling.

## Scanner Behavior

The scanner currently uses fixed 3x3 grid sampling, not full OpenCV contour detection.

User flow:

1. Show the white-center face to the camera.
2. Align the 9 stickers in the overlay.
3. Click `Calibrate`.
4. Capture faces in this sequence:
   - Top
   - Front
   - Right
   - Back
   - Left
   - Bottom
5. Click `Solve Cube`.
6. Use `Next` / `Back` for 3D move playback.

Calibration currently samples only the center grid cell as the white reference.

## Solver Notes

`cubejs@1.1.0` is pinned intentionally.

Reason:

- Newer `cubejs` versions pull in an old `npm` dependency with many production audit findings.
- `cubejs@1.1.0` has no production vulnerabilities after install.

Solver loading requires both:

```ts
const module = await import("cubejs");
await import("cubejs/lib/solve");
```

`cubejs/lib/solve` patches solver methods onto the `Cube` class as a side effect.

There is a solved-state guard in `src/solver.ts` because `cubejs` can return a non-empty algorithm even for a solved cube.

## Known Limitations

- No OpenCV.js contour detection yet.
- No perspective correction / `warpPerspective` yet.
- No Web Worker for CV or solver initialization yet.
- Color classification is basic LAB nearest-color matching with white-balance normalization.
- Validation checks counts and centers, but does not yet fully prove edge/corner parity legality before solver call.
- 3D playback previews state after each move, but does not animate layer turns with rotation arcs yet.
- Camera permission must be accepted manually in the browser.

## Recommended Next Improvements

1. Add a CV worker.
   - Move frame processing and color sampling off the main thread.
   - Prepare for OpenCV.js WASM loading.

2. Add OpenCV.js detection.
   - Detect square contours inside or near the guide.
   - Use perspective transform to normalize tilted cube faces.
   - Keep fixed-grid fallback for low-confidence frames.

3. Improve color classification.
   - Capture all 54 raw RGB/LAB samples first.
   - Cluster into 6 color groups.
   - Map clusters to faces by center stickers.
   - Surface confidence per sticker and allow manual correction.

4. Add manual correction UI.
   - Let users click a sticker in the mini net and assign a color.
   - This is important because lighting/camera variation will cause occasional misreads.

5. Strengthen legality validation.
   - Add edge/corner permutation and orientation validation.
   - Report actionable errors before calling the solver.

6. Improve 3D guidance.
   - Animate the active layer turn.
   - Add orientation arrows.
   - Make tips more viewpoint-aware, especially for `B`, `D`, and inverse moves.

7. Add tests.
   - Unit-test facelet ordering, move parsing, move application, and validation.
   - Add solver smoke tests for solved and known scrambled states.

## Verification Status

Last verified:

```powershell
npm run build
npm audit --omit=dev
```

Both passed. Vite may warn that the graphics chunk is larger than 500 kB because Three.js is bundled separately as `graphics`.

## Development Notes

- Keep dependencies current, but do not upgrade `cubejs` without rechecking production audit output.
- Keep scanner code tolerant of browser camera failures.
- Avoid adding UI-only explanatory copy inside the app; controls should be clear through labels, layout, and state.
- Prefer small, focused modules over mixing scanner, solver, and visualization logic.
