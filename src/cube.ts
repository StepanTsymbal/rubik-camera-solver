export type FaceKey = "U" | "R" | "F" | "D" | "L" | "B";
export type MoveFace = FaceKey;

export const FACE_ORDER: FaceKey[] = ["U", "R", "F", "D", "L", "B"];
export const SCAN_ORDER: FaceKey[] = ["U", "F", "R", "B", "L", "D"];

export const FACE_NAMES: Record<FaceKey, string> = {
  U: "Top",
  R: "Right",
  F: "Front",
  D: "Bottom",
  L: "Left",
  B: "Back",
};

export const FACE_COLORS: Record<FaceKey, string> = {
  U: "#f8fafc",
  R: "#ef4444",
  F: "#22c55e",
  D: "#facc15",
  L: "#f97316",
  B: "#2563eb",
};

const CORNER_FACELETS = [
  [8, 9, 20],
  [6, 18, 38],
  [0, 36, 47],
  [2, 45, 11],
  [29, 26, 15],
  [27, 44, 24],
  [33, 53, 42],
  [35, 17, 51],
] as const;

const CORNER_COLORS: ReadonlyArray<readonly FaceKey[]> = [
  ["U", "R", "F"],
  ["U", "F", "L"],
  ["U", "L", "B"],
  ["U", "B", "R"],
  ["D", "F", "R"],
  ["D", "L", "F"],
  ["D", "B", "L"],
  ["D", "R", "B"],
];

const EDGE_FACELETS = [
  [5, 10],
  [7, 19],
  [3, 37],
  [1, 46],
  [32, 16],
  [28, 25],
  [30, 43],
  [34, 52],
  [23, 12],
  [21, 41],
  [50, 39],
  [48, 14],
] as const;

const EDGE_COLORS: ReadonlyArray<readonly FaceKey[]> = [
  ["U", "R"],
  ["U", "F"],
  ["U", "L"],
  ["U", "B"],
  ["D", "R"],
  ["D", "F"],
  ["D", "L"],
  ["D", "B"],
  ["F", "R"],
  ["F", "L"],
  ["B", "L"],
  ["B", "R"],
];

export type FaceCapture = {
  face: FaceKey;
  colors: string[];
};

export type CubeState = Record<FaceKey, string[]>;

export type ParsedMove = {
  face: MoveFace;
  turns: 1 | 2 | -1;
  notation: string;
  tip: string;
};

export function createEmptyState(): CubeState {
  return {
    U: Array(9).fill(""),
    R: Array(9).fill(""),
    F: Array(9).fill(""),
    D: Array(9).fill(""),
    L: Array(9).fill(""),
    B: Array(9).fill(""),
  };
}

export function capturesToState(captures: FaceCapture[]): CubeState {
  const next = createEmptyState();
  for (const capture of captures) {
    next[capture.face] = capture.colors.slice(0, 9);
  }
  return next;
}

export function stateToFacelets(state: CubeState): string {
  return FACE_ORDER.flatMap((face) => state[face]).join("");
}

export function validateCubeState(state: CubeState): string[] {
  const errors: string[] = [];
  const facelets = stateToFacelets(state);
  const hasMissingStickers = FACE_ORDER.some((face) => state[face].some((value) => value === ""));

  if (facelets.length !== 54 || hasMissingStickers) {
    errors.push("Capture all 54 stickers before solving.");
  }

  const counts = FACE_ORDER.reduce<Record<FaceKey, number>>((acc, face) => {
    acc[face] = 0;
    return acc;
  }, {} as Record<FaceKey, number>);

  for (const value of facelets) {
    if (FACE_ORDER.includes(value as FaceKey)) {
      counts[value as FaceKey] += 1;
    }
  }

  for (const face of FACE_ORDER) {
    if (counts[face] !== 9) {
      errors.push(`${FACE_NAMES[face]} has ${counts[face]} stickers; expected 9.`);
    }
  }

  const centers = FACE_ORDER.map((face) => state[face][4]).filter(Boolean);
  if (new Set(centers).size !== 6) {
    errors.push("Each center sticker must map to a different cube color.");
  }

  if (errors.length === 0) {
    errors.push(...validateCubieLegality(facelets));
  }

  return errors;
}

function validateCubieLegality(facelets: string): string[] {
  const errors: string[] = [];
  const cornerState = readCorners(facelets, errors);
  const edgeState = readEdges(facelets, errors);

  if (!cornerState || !edgeState) return errors;

  if (cornerState.orientations.reduce((sum, value) => sum + value, 0) % 3 !== 0) {
    errors.push("A corner appears twisted; adjust one or more corner stickers.");
  }

  if (edgeState.orientations.reduce((sum, value) => sum + value, 0) % 2 !== 0) {
    errors.push("An edge appears flipped; adjust one or more edge stickers.");
  }

  if (permutationParity(cornerState.permutation) !== permutationParity(edgeState.permutation)) {
    errors.push("Corner and edge parity do not match; this scan is not a legal cube.");
  }

  return errors;
}

function readCorners(facelets: string, errors: string[]) {
  const permutation: number[] = [];
  const orientations: number[] = [];
  const seen = new Set<number>();

  for (const faceletIndexes of CORNER_FACELETS) {
    const colors = faceletIndexes.map((index) => facelets[index] as FaceKey);
    const piece = findPiece(colors, CORNER_COLORS);
    if (piece === -1) {
      errors.push(`Invalid corner color combination: ${colors.join("")}.`);
      return null;
    }
    if (seen.has(piece)) {
      errors.push(`Duplicate corner piece: ${CORNER_COLORS[piece].join("")}.`);
      return null;
    }

    const orientation = colors.findIndex((color) => color === "U" || color === "D");
    if (orientation === -1) {
      errors.push(`Invalid corner orientation: ${colors.join("")}.`);
      return null;
    }

    permutation.push(piece);
    orientations.push(orientation % 3);
    seen.add(piece);
  }

  return { permutation, orientations };
}

function readEdges(facelets: string, errors: string[]) {
  const permutation: number[] = [];
  const orientations: number[] = [];
  const seen = new Set<number>();

  for (const faceletIndexes of EDGE_FACELETS) {
    const colors = faceletIndexes.map((index) => facelets[index] as FaceKey);
    const piece = findPiece(colors, EDGE_COLORS);
    if (piece === -1) {
      errors.push(`Invalid edge color combination: ${colors.join("")}.`);
      return null;
    }
    if (seen.has(piece)) {
      errors.push(`Duplicate edge piece: ${EDGE_COLORS[piece].join("")}.`);
      return null;
    }

    const [first, second] = EDGE_COLORS[piece];
    permutation.push(piece);
    orientations.push(colors[0] === first && colors[1] === second ? 0 : 1);
    seen.add(piece);
  }

  return { permutation, orientations };
}

function findPiece(colors: FaceKey[], pieces: ReadonlyArray<readonly FaceKey[]>): number {
  const key = colors.slice().sort().join("");
  return pieces.findIndex((piece) => piece.slice().sort().join("") === key);
}

function permutationParity(permutation: number[]): 0 | 1 {
  let inversions = 0;
  for (let i = 0; i < permutation.length; i += 1) {
    for (let j = i + 1; j < permutation.length; j += 1) {
      if (permutation[i] > permutation[j]) inversions += 1;
    }
  }
  return (inversions % 2) as 0 | 1;
}

export function parseSolution(solution: string): ParsedMove[] {
  return solution
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((notation) => {
      const face = notation[0] as MoveFace;
      const suffix = notation.slice(1);
      const turns = suffix === "2" ? 2 : suffix === "'" ? -1 : 1;
      return {
        face,
        turns,
        notation,
        tip: moveToTip(face, turns),
      };
    });
}

function moveToTip(face: MoveFace, turns: ParsedMove["turns"]): string {
  const layer = FACE_NAMES[face].toUpperCase();
  const viewpoint = `as viewed from the ${layer} face`;
  if (turns === 2) return `Rotate the ${layer} layer 180 degrees.`;
  if (turns === -1) return `Rotate the ${layer} layer counterclockwise, ${viewpoint}.`;
  return `Rotate the ${layer} layer clockwise, ${viewpoint}.`;
}

export function applyMoves(state: CubeState, moves: ParsedMove[]): CubeState {
  let stickers = cubeStateToStickers(state);
  for (const move of moves) {
    const count = move.turns === 2 ? 2 : 1;
    const dir = move.turns === -1 ? 1 : -1;
    for (let i = 0; i < count; i += 1) {
      stickers = stickers.map((sticker) => shouldRotate(sticker.position, move.face)
        ? rotateSticker(sticker, move.face, dir)
        : sticker);
    }
  }
  return stickersToCubeState(stickers);
}

export type Sticker3D = {
  color: FaceKey;
  position: [number, number, number];
  normal: [number, number, number];
};

export function cubeStateToStickers(state: CubeState): Sticker3D[] {
  const stickers: Sticker3D[] = [];

  const addFace = (face: FaceKey, positionForIndex: (index: number) => [number, number, number], normal: [number, number, number]) => {
    state[face].forEach((color, index) => {
      stickers.push({ color: (color || face) as FaceKey, position: positionForIndex(index), normal });
    });
  };

  addFace("U", (i) => [(i % 3) - 1, 1, Math.floor(i / 3) - 1], [0, 1, 0]);
  addFace("D", (i) => [(i % 3) - 1, -1, 1 - Math.floor(i / 3)], [0, -1, 0]);
  addFace("F", (i) => [(i % 3) - 1, 1 - Math.floor(i / 3), 1], [0, 0, 1]);
  addFace("B", (i) => [1 - (i % 3), 1 - Math.floor(i / 3), -1], [0, 0, -1]);
  addFace("R", (i) => [1, 1 - Math.floor(i / 3), 1 - (i % 3)], [1, 0, 0]);
  addFace("L", (i) => [-1, 1 - Math.floor(i / 3), (i % 3) - 1], [-1, 0, 0]);

  return stickers;
}

function stickersToCubeState(stickers: Sticker3D[]): CubeState {
  const next = createEmptyState();
  for (const sticker of stickers) {
    const [x, y, z] = sticker.position;
    const [nx, ny, nz] = sticker.normal;
    if (ny === 1) next.U[(z + 1) * 3 + (x + 1)] = sticker.color;
    if (ny === -1) next.D[(1 - z) * 3 + (x + 1)] = sticker.color;
    if (nz === 1) next.F[(1 - y) * 3 + (x + 1)] = sticker.color;
    if (nz === -1) next.B[(1 - y) * 3 + (1 - x)] = sticker.color;
    if (nx === 1) next.R[(1 - y) * 3 + (1 - z)] = sticker.color;
    if (nx === -1) next.L[(1 - y) * 3 + (z + 1)] = sticker.color;
  }
  return next;
}

function shouldRotate(position: [number, number, number], face: MoveFace): boolean {
  const [x, y, z] = position;
  return (
    (face === "U" && y === 1) ||
    (face === "D" && y === -1) ||
    (face === "R" && x === 1) ||
    (face === "L" && x === -1) ||
    (face === "F" && z === 1) ||
    (face === "B" && z === -1)
  );
}

function rotateSticker(sticker: Sticker3D, face: MoveFace, dir: 1 | -1): Sticker3D {
  const axis = face === "U" || face === "D" ? "y" : face === "R" || face === "L" ? "x" : "z";
  const sign: 1 | -1 = face === "D" || face === "L" || face === "B" ? (dir === 1 ? -1 : 1) : dir;
  return {
    ...sticker,
    position: rotateVector(sticker.position, axis, sign),
    normal: rotateVector(sticker.normal, axis, sign),
  };
}

function rotateVector(vector: [number, number, number], axis: "x" | "y" | "z", dir: 1 | -1): [number, number, number] {
  const [x, y, z] = vector;
  if (axis === "x") return [x, -dir * z, dir * y];
  if (axis === "y") return [dir * z, y, -dir * x];
  return [-dir * y, dir * x, z];
}
