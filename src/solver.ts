import { stateToFacelets, validateCubeState, type CubeState } from "./cube";

let initialized = false;

export async function solveCube(state: CubeState): Promise<string> {
  const validationErrors = validateCubeState(state);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join(" "));
  }

  const facelets = stateToFacelets(state);
  const module = await import("cubejs");
  await import("cubejs/lib/solve");
  const Cube = module.default;

  if (!initialized) {
    Cube.initSolver();
    initialized = true;
  }

  const cube = Cube.fromString(facelets);
  if (cube.isSolved()) {
    return "";
  }

  const solution = cube.solve(22).trim();
  if (/error/i.test(solution)) {
    throw new Error(solution || "Solver rejected this cube state.");
  }

  return solution;
}
