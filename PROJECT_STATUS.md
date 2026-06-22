# Project Status

Last updated: 2026-06-22

## Current State

The app is a working prototype for a camera-assisted Rubik's Cube solver.

Implemented:

- Webcam capture using a fixed 3x3 sampling grid.
- White-balance calibration from the center sample.
- LAB nearest-color classification.
- Six-face capture flow in app order: Top, Front, Right, Back, Left, Bottom.
- Manual sticker correction via clickable mini net and color palette.
- Cube validation for counts, centers, invalid pieces, duplicate pieces, orientation sums, and parity.
- Dynamic `cubejs@1.1.0` solver loading.
- Solved-state guard before calling solve.
- 3D cube preview with move playback.
- Animated move direction cue and mobile-friendlier viewer layout.
- `Test Cube` button that loads a fresh valid scramble each click.
- Valid PNG test assets under `generated/`.

## Git Notes

- Main branch: `master`
- Merged feature branch: `feature/mobile-3d-guidance`
- Latest merge commit at time of this note: `c8463cc Merge mobile 3D guidance`
- Working tree was clean after merge and build.

Useful commands:

```powershell
git status
git log --oneline -5
npm run build
npm run dev -- --port 5173
```

## Important Behavior Notes

- `cube.solve(22)` uses 22 as a maximum search depth, not as an optimal solution request.
- Move direction uses standard cube notation: clockwise/counterclockwise is viewed from the named face.
- The 3D preview state has been verified against `cubejs` for basic moves and a generated full solution.
- The app still relies on fixed-grid sampling; camera alignment and lighting matter.

## Recommended Next Iteration

Start with tests. This should be the next engineering step because move direction and validation are easy to regress.

Suggested test coverage:

- `stateToFacelets` and face order.
- `parseSolution` for normal, inverse, and double moves.
- `applyMoves` matching `cubejs` for basic moves and sample algorithms.
- `validateCubeState` for solved, invalid counts, invalid opposite-color pieces, flipped edge, twisted corner, and parity mismatch.
- `solveCube` smoke tests for solved and a known valid scramble.

After tests, improve scanning:

- Capture and store raw RGB/LAB samples for all 54 stickers.
- Cluster into 6 color groups across the whole cube.
- Map clusters using center stickers.
- Surface low-confidence stickers for correction.
- Add OpenCV.js contour detection and perspective correction.

Then improve guidance:

- Animate the actual active layer turn between states.
- Add exact piece/sticker highlighting for validation errors.
- Refine mobile flow with sticky playback controls and less scrolling.

## Known Limitations

- No OpenCV.js detection or perspective correction yet.
- No Web Worker for CV or solver initialization yet.
- Color classification remains basic under mixed lighting.
- Validation errors are accurate but not yet localized to exact mini-net stickers.
- 3D guide shows animated direction cues but does not rotate the actual layer during transitions.
- Browser camera permission must be accepted manually.

## Generated Test Assets

Generated files:

- `generated/valid-rubik-scan-sheet.png`
- `generated/valid-rubik-1-top.png`
- `generated/valid-rubik-2-front.png`
- `generated/valid-rubik-3-right.png`
- `generated/valid-rubik-4-back.png`
- `generated/valid-rubik-5-left.png`
- `generated/valid-rubik-6-bottom.png`

Regenerate with:

```powershell
python scripts\generate_valid_cube_pngs.py
```
