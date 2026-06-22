import { FACE_ORDER, type FaceKey } from "./cube";

export type Rgb = {
  r: number;
  g: number;
  b: number;
};

type Lab = {
  l: number;
  a: number;
  b: number;
};

const REFERENCE_RGB: Record<FaceKey, Rgb> = {
  U: { r: 245, g: 245, b: 245 },
  R: { r: 190, g: 35, b: 45 },
  F: { r: 25, g: 155, b: 70 },
  D: { r: 245, g: 210, b: 35 },
  L: { r: 235, g: 110, b: 35 },
  B: { r: 35, g: 85, b: 185 },
};

export function sampleGrid(video: HTMLVideoElement, canvas: HTMLCanvasElement): Rgb[] {
  const width = video.videoWidth;
  const height = video.videoHeight;
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context || width === 0 || height === 0) return [];

  context.drawImage(video, 0, 0, width, height);

  const size = Math.min(width, height) * 0.62;
  const left = (width - size) / 2;
  const top = (height - size) / 2;
  const cell = size / 3;
  const samples: Rgb[] = [];

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const cx = Math.round(left + col * cell + cell / 2);
      const cy = Math.round(top + row * cell + cell / 2);
      samples.push(averagePatch(context, cx, cy, Math.max(8, Math.round(cell * 0.16))));
    }
  }

  return samples;
}

export function classifyFace(samples: Rgb[], whiteBalance?: Rgb): FaceKey[] {
  const normalized = samples.map((rgb) => applyWhiteBalance(rgb, whiteBalance));
  return balancedNearestColors(normalized);
}

function averagePatch(context: CanvasRenderingContext2D, cx: number, cy: number, radius: number): Rgb {
  const x = Math.max(0, cx - radius);
  const y = Math.max(0, cy - radius);
  const width = radius * 2;
  const height = radius * 2;
  const image = context.getImageData(x, y, width, height).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let i = 0; i < image.length; i += 4) {
    r += image[i];
    g += image[i + 1];
    b += image[i + 2];
    count += 1;
  }

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}

function applyWhiteBalance(rgb: Rgb, white?: Rgb): Rgb {
  if (!white) return rgb;
  const target = 235;
  return {
    r: clamp((rgb.r * target) / Math.max(1, white.r)),
    g: clamp((rgb.g * target) / Math.max(1, white.g)),
    b: clamp((rgb.b * target) / Math.max(1, white.b)),
  };
}

function balancedNearestColors(samples: Rgb[]): FaceKey[] {
  const palette = FACE_ORDER.map((face) => ({ face, lab: rgbToLab(REFERENCE_RGB[face]) }));
  const assignments: Array<{ index: number; face: FaceKey; distance: number }> = [];

  samples.forEach((sample, index) => {
    const lab = rgbToLab(sample);
    palette.forEach(({ face, lab: target }) => {
      assignments.push({ index, face, distance: deltaE76(lab, target) });
    });
  });

  assignments.sort((a, b) => a.distance - b.distance);

  const result: Array<FaceKey | undefined> = Array(samples.length);
  const counts = new Map<FaceKey, number>(FACE_ORDER.map((face) => [face, 0]));

  for (const assignment of assignments) {
    if (result[assignment.index]) continue;
    if ((counts.get(assignment.face) ?? 0) >= 9) continue;
    result[assignment.index] = assignment.face;
    counts.set(assignment.face, (counts.get(assignment.face) ?? 0) + 1);
  }

  return result.map((face) => face ?? "U");
}

function rgbToLab(rgb: Rgb): Lab {
  let r = pivotRgb(rgb.r / 255);
  let g = pivotRgb(rgb.g / 255);
  let b = pivotRgb(rgb.b / 255);

  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

  const fx = pivotXyz(x);
  const fy = pivotXyz(y);
  const fz = pivotXyz(z);

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function pivotRgb(value: number): number {
  return value > 0.04045 ? Math.pow((value + 0.055) / 1.055, 2.4) : value / 12.92;
}

function pivotXyz(value: number): number {
  return value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
}

function deltaE76(a: Lab, b: Lab): number {
  return Math.hypot(a.l - b.l, a.a - b.a, a.b - b.b);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
