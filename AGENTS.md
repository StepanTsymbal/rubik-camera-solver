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

- `src/main.tsx`: app shell, scanner workflow, capture state, manual correction UI, test-cube loader, solve button, playback controls.
- `src/cube.ts`: cube facelet types, validation, move parsing, move application for 3D preview.
- `src/color.ts`: webcam grid sampling, white-balance correction, RGB to LAB conversion, nearest-color classification.
- `src/solver.ts`: dynamic `cubejs` solver loading and facelet solve path.
- `src/visual/CubeGuide.tsx`: React Three Fiber cube visualization, active-layer highlighting, animated move direction cue.
- `src/styles.css`: responsive UI styling.
- `scripts/generate_valid_cube_pngs.py`: creates a valid scrambled cube scan sheet and six face PNGs for camera testing.

Current Git state:

- Repository is initialized.
- `master` includes the merged `feature/mobile-3d-guidance` branch.
- Latest merge commit at time of this note: `c8463cc Merge mobile 3D guidance`.

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

After capture, users can click stickers in the mini net and select a replacement color from the palette. Manual edits clear stale solution playback.

The `Test Cube` button fills the net with a fresh valid random scramble each click. Use this for solver and playback testing without camera input.

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

`cube.solve(22)` uses 22 as a maximum depth, not as a shortest-solution target. It often returns non-optimal solutions near that bound. Every valid 3x3 cube is solvable in 20 face turns or fewer under the usual face-turn metric, but this solver is not proving optimality.

Move direction rule shown in the app:

- Clockwise/counterclockwise is judged as if looking directly at the named face.
- Example: `B'` means turn the back layer counterclockwise as viewed from the back face.

## Known Limitations

- No OpenCV.js contour detection yet.
- No perspective correction / `warpPerspective` yet.
- No Web Worker for CV or solver initialization yet.
- Color classification is basic LAB nearest-color matching with white-balance normalization.
- Validation checks counts, centers, cubie combinations, orientation sums, and parity, but errors do not yet point to exact sticker locations in the net.
- 3D playback previews state after each move and shows an animated direction cue, but does not animate the actual layer turning between states yet.
- Camera permission must be accepted manually in the browser.
- In-app browser automation was blocked in this environment by a browser runtime sandbox path issue, so visual QA has been manual plus build checks.

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

4. Improve validation UX.
   - Point validation errors to exact stickers or pieces in the mini net.
   - Highlight impossible edge/corner pieces directly.
   - Replace raw combinations like `FBR` with face names and positions.

5. Improve solver behavior.
   - Try progressively lower solve depths before falling back to 22.
   - Consider showing solution length and generated scramble/test state details.

6. Improve 3D guidance.
   - Animate the active layer turn.
   - Keep the current animated direction cue as an always-on orientation helper.
   - Make tips more viewpoint-aware for physical handling, especially for `B`, `D`, and inverse moves.

7. Add tests.
   - Unit-test facelet ordering, move parsing, move application, and validation.
   - Add solver smoke tests for solved and known scrambled states.
   - Add regression coverage proving preview moves match `cubejs`.

## Verification Status

Last verified:

```powershell
npm run build
```

Passed after the mobile 3D guidance merge. Vite may warn that the graphics chunk is larger than 500 kB because Three.js is bundled separately as `graphics`.

Earlier production audit status:

```powershell
npm audit --omit=dev
```

Passed with `cubejs@1.1.0`.

## Development Notes

- Keep dependencies current, but do not upgrade `cubejs` without rechecking production audit output.
- Keep scanner code tolerant of browser camera failures.
- Avoid adding UI-only explanatory copy inside the app; controls should be clear through labels, layout, and state.
- Prefer small, focused modules over mixing scanner, solver, and visualization logic.
