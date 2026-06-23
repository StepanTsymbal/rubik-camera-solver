import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Camera, Cuboid, RefreshCw, RotateCcw, Shuffle, StepBack, StepForward, Wand2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import orientationGuide from "./assets/orientation-guide.png";
import "./styles.css";
import {
  COLOR_NAMES,
  FACE_COLORS,
  FACE_NAMES,
  FACE_ORDER,
  SCAN_ORDER,
  applyMoves,
  capturesToState,
  createEmptyState,
  faceToCenterColor,
  mapStateColors,
  normalizeStateByCenters,
  parseSolution,
  stateToFacelets,
  validateScannedState,
  type CubeState,
  type FaceCapture,
  type FaceKey,
  type ParsedMove,
} from "./cube";
import { classifyFace, sampleGrid, type Rgb } from "./color";
import { solveCube } from "./solver";
import { CubeGuide } from "./visual/CubeGuide";

function App() {
  const [captures, setCaptures] = useState<FaceCapture[]>([]);
  const [whiteBalance, setWhiteBalance] = useState<Rgb | undefined>();
  const [solution, setSolution] = useState<ParsedMove[]>([]);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState("Point the white face at the grid and calibrate.");
  const [isSolving, setIsSolving] = useState(false);
  const [selectedSticker, setSelectedSticker] = useState<{ face: FaceKey; index: number } | null>(null);
  const [transitionMove, setTransitionMove] = useState<ParsedMove | undefined>();

  const state = useMemo(() => capturesToState(captures), [captures]);
  const solverState = useMemo(() => normalizeStateByCenters(state), [state]);
  const displayColorMap = useMemo(() => faceToCenterColor(state), [state]);
  const validationErrors = useMemo(() => validateScannedState(state), [state]);
  const currentFace = SCAN_ORDER[captures.length] ?? "D";
  const previewState = useMemo(() => {
    if (solution.length === 0) return state;
    return mapStateColors(applyMoves(solverState, solution.slice(0, step)), displayColorMap);
  }, [state, solverState, solution, step, displayColorMap]);
  const capturedFaces = useMemo(() => new Set(captures.map((capture) => capture.face)), [captures]);

  const handleFaceCapture = (colors: FaceKey[]) => {
    if (captures.length >= SCAN_ORDER.length) return;
    const face = SCAN_ORDER[captures.length];
    setCaptures((prev) => [...prev.filter((capture) => capture.face !== face), { face, colors }]);
    setSolution([]);
    setStep(0);
    setTransitionMove(undefined);
    setSelectedSticker({ face, index: 4 });
    setStatus(`${FACE_NAMES[face]} face captured.`);
  };

  const handleFaceRescan = (face: FaceKey, colors: FaceKey[]) => {
    setCaptures((prev) => prev.map((capture) => (capture.face === face ? { face, colors } : capture)));
    setSolution([]);
    setStep(0);
    setTransitionMove(undefined);
    setSelectedSticker({ face, index: 4 });
    setStatus(`${FACE_NAMES[face]} face rescanned.`);
  };

  const handleReset = () => {
    setCaptures([]);
    setSolution([]);
    setStep(0);
    setTransitionMove(undefined);
    setSelectedSticker(null);
    setStatus("Point the white face at the grid and calibrate.");
  };

  const handleLoadTestCube = async () => {
    const { captures: testCaptures, scramble } = await createTestCaptures();
    setCaptures(testCaptures);
    setSolution([]);
    setStep(0);
    setTransitionMove(undefined);
    setSelectedSticker(null);
    setStatus(`Test cube loaded: ${scramble}`);
  };

  const handleStickerColor = (color: FaceKey) => {
    if (!selectedSticker) return;
    const { face, index } = selectedSticker;
    setCaptures((prev) =>
      prev.map((capture) => {
        if (capture.face !== face) return capture;
        const colors = [...capture.colors];
        colors[index] = color;
        return { ...capture, colors };
      }),
    );
    setSolution([]);
    setStep(0);
    setTransitionMove(undefined);
    setStatus(`${FACE_NAMES[face]} sticker ${index + 1} set to ${COLOR_NAMES[color]}.`);
  };

  const handleSolve = async () => {
    setIsSolving(true);
    setSolution([]);
    setStep(0);
    setTransitionMove(undefined);
    try {
      const notation = await solveCube(state);
      const parsed = parseSolution(notation);
      setSolution(parsed);
      setStatus(parsed.length === 0 ? "Cube is already solved." : `Solution found in ${parsed.length} moves.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to solve this cube.");
    } finally {
      setIsSolving(false);
    }
  };

  const handleStep = (nextStep: number) => {
    if (nextStep === step) return;
    const move = nextStep > step ? solution[nextStep - 1] : solution[nextStep];
    setTransitionMove(nextStep > step ? move : invertMove(move));
    setStep(nextStep);
  };

  return (
    <main className="app-shell">
      <section className="workspace">
        <ScannerPanel
          currentFace={currentFace}
          complete={captures.length === SCAN_ORDER.length}
          capturedFaces={capturedFaces}
          whiteBalance={whiteBalance}
          onCalibrate={setWhiteBalance}
          onCapture={handleFaceCapture}
          onRescan={handleFaceRescan}
        />

        <section className="side-panel" aria-label="Cube controls">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Rubik Camera Solver</p>
              <h1>Scan, solve, follow.</h1>
            </div>
            <button className="icon-button" type="button" onClick={handleReset} title="Reset scan">
              <RotateCcw size={18} />
            </button>
          </div>

          <Progress captures={captures} currentFace={currentFace} complete={captures.length === SCAN_ORDER.length} />

          <div className="status-line" role="status">
            {status}
          </div>

          {validationErrors.length > 0 && captures.length === SCAN_ORDER.length ? (
            <div className="validation">
              {validationErrors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}

          <button className="secondary-action test-action" type="button" onClick={handleLoadTestCube}>
            <Shuffle size={18} />
            Test Cube
          </button>

          <button
            className="primary-action"
            type="button"
            disabled={captures.length !== SCAN_ORDER.length || validationErrors.length > 0 || isSolving}
            onClick={handleSolve}
          >
            <Wand2 size={18} />
            {isSolving ? "Solving..." : "Solve Cube"}
          </button>

          <FaceletEditor
            state={state}
            selectedSticker={selectedSticker}
            onSelect={setSelectedSticker}
            onColor={handleStickerColor}
          />

          <PlaybackControls solution={solution} step={step} onStep={handleStep} />
        </section>
      </section>

      <section className="viewer-band" aria-label="3D move guide">
        <div className="viewer-copy">
          <div className="viewer-title">
            <Cuboid size={20} />
            <h2>3D Guide</h2>
          </div>
          <p>{solution[step]?.tip ?? "The scanned cube appears here. Solve it to unlock move-by-move guidance."}</p>
          <code>{solution[step]?.notation ?? stateToFacelets(state).padEnd(54, "-")}</code>
        </div>
        <CubeGuide state={previewState} activeMove={solution[step]} appliedMove={transitionMove} />
      </section>
    </main>
  );
}

function invertMove(move: ParsedMove | undefined): ParsedMove | undefined {
  if (!move) return undefined;
  const turns = move.turns === 2 ? 2 : move.turns === 1 ? -1 : 1;
  const notation = turns === 2 ? `${move.face}2` : turns === -1 ? `${move.face}'` : move.face;
  return {
    ...move,
    turns,
    notation,
    tip: move.tip,
  };
}

async function createTestCaptures(): Promise<{ captures: FaceCapture[]; scramble: string }> {
  const module = await import("cubejs");
  const Cube = module.default as unknown as {
    new (): {
      move: (algorithm: string) => void;
      asString: () => string;
    };
  };
  const cube = new Cube();
  const scramble = createScramble(18);
  cube.move(scramble);
  return { captures: faceletsToCaptures(cube.asString()), scramble };
}

function createScramble(length: number): string {
  const faces: FaceKey[] = ["U", "R", "F", "D", "L", "B"];
  const suffixes = ["", "'", "2"];
  const opposite: Record<FaceKey, FaceKey> = { U: "D", D: "U", R: "L", L: "R", F: "B", B: "F" };
  const moves: string[] = [];
  let previous: FaceKey | undefined;
  let previousPrevious: FaceKey | undefined;

  while (moves.length < length) {
    const face = faces[Math.floor(Math.random() * faces.length)];
    if (face === previous) continue;
    if (previousPrevious && previous && face === previousPrevious && previous === opposite[face]) continue;
    moves.push(`${face}${suffixes[Math.floor(Math.random() * suffixes.length)]}`);
    previousPrevious = previous;
    previous = face;
  }

  return moves.join(" ");
}

function faceletsToCaptures(facelets: string): FaceCapture[] {
  return SCAN_ORDER.map((face) => {
    const offset = FACE_ORDER.indexOf(face) * 9;
    return {
      face,
      colors: facelets.slice(offset, offset + 9).split("") as FaceKey[],
    };
  });
}

type ScannerPanelProps = {
  currentFace: FaceKey;
  complete: boolean;
  capturedFaces: Set<FaceKey>;
  whiteBalance?: Rgb;
  onCalibrate: (rgb: Rgb) => void;
  onCapture: (colors: FaceKey[]) => void;
  onRescan: (face: FaceKey, colors: FaceKey[]) => void;
};

function ScannerPanel({ currentFace, complete, capturedFaces, whiteBalance, onCalibrate, onCapture, onRescan }: ScannerPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [autoCapture, setAutoCapture] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState(0);
  const [rescanFace, setRescanFace] = useState<FaceKey | "">("");
  const [showScanHelp, setShowScanHelp] = useState(false);
  const autoTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let stream: MediaStream | undefined;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((mediaStream) => {
        stream = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      })
      .catch(() => setCameraError("Camera access is blocked or unavailable."));

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    window.clearInterval(autoTimerRef.current);
    setAutoCountdown(0);

    if (!autoCapture || complete) return;

    setAutoCountdown(3);
    autoTimerRef.current = window.setInterval(() => {
      setAutoCountdown((value) => {
        if (value <= 1) {
          window.clearInterval(autoTimerRef.current);
          capture();
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(autoTimerRef.current);
  }, [autoCapture, complete, currentFace]);

  const readSamples = () => {
    if (!videoRef.current || !canvasRef.current) return [];
    return sampleGrid(videoRef.current, canvasRef.current);
  };

  const calibrate = () => {
    const samples = readSamples();
    if (samples.length === 0) return;
    onCalibrate(samples[4]);
  };

  const capture = () => {
    const samples = readSamples();
    if (samples.length === 0) return;
    onCapture(classifyFace(samples, whiteBalance));
  };

  const rescan = () => {
    if (!rescanFace) return;
    const samples = readSamples();
    if (samples.length === 0) return;
    onRescan(rescanFace, classifyFace(samples, whiteBalance));
  };

  return (
    <section className="scanner-panel" aria-label="Camera scanner">
      <div className="camera-frame">
        <video ref={videoRef} autoPlay playsInline muted />
        <GridOverlay />
        <ScanGuideOverlay
          currentFace={currentFace}
          complete={complete}
          capturedCount={capturedFaces.size}
          countdown={autoCountdown}
          onHelp={() => setShowScanHelp(true)}
        />
        {cameraError ? <div className="camera-error">{cameraError}</div> : null}
        {showScanHelp ? <ScanHelpDialog onClose={() => setShowScanHelp(false)} /> : null}
      </div>
      <canvas ref={canvasRef} hidden />
      <div className="scanner-toolbar">
        <div>
          <p className="eyebrow">Current Face</p>
          <strong>{complete ? "Scan complete" : `${FACE_NAMES[currentFace]} face`}</strong>
        </div>
        <div className="button-row">
          <label className="toggle-action">
            <input type="checkbox" checked={autoCapture} disabled={complete} onChange={(event) => setAutoCapture(event.target.checked)} />
            Auto
          </label>
          <button className="secondary-action" type="button" onClick={calibrate} title="Calibrate white balance">
            <Camera size={18} />
            Calibrate
          </button>
          <button className="primary-action compact" type="button" onClick={capture} disabled={complete}>
            Capture
          </button>
        </div>
      </div>
      {complete ? (
        <div className="rescan-toolbar">
          <label>
            <span>Rescan</span>
            <select value={rescanFace} onChange={(event) => setRescanFace(event.target.value as FaceKey | "")}>
              <option value="">Choose face</option>
              {SCAN_ORDER.map((face) => (
                <option key={face} value={face}>{FACE_NAMES[face]}</option>
              ))}
            </select>
          </label>
          <button className="secondary-action" type="button" disabled={!rescanFace} onClick={rescan}>
            <RefreshCw size={18} />
            Replace
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ScanGuideOverlay({
  currentFace,
  complete,
  capturedCount,
  countdown,
  onHelp,
}: {
  currentFace: FaceKey;
  complete: boolean;
  capturedCount: number;
  countdown: number;
  onHelp: () => void;
}) {
  const step = Math.min(capturedCount + 1, SCAN_ORDER.length);

  return (
    <div className="scan-guide-card" aria-hidden="true">
      <div className="scan-guide-primary">
        <p className="eyebrow">Rotate To</p>
        <strong>{complete ? "Scan complete" : `${FACE_NAMES[currentFace]} face`}</strong>
      </div>
      <div className="scan-guide-detail">
        <span className="scan-color-chip" style={{ background: FACE_COLORS[currentFace] }} />
        <span>{complete ? "Review or solve" : `${FACE_NAMES[currentFace]} center facing camera`}</span>
      </div>
      <span className="scan-step">{complete ? `${SCAN_ORDER.length} / ${SCAN_ORDER.length}` : `${step} / ${SCAN_ORDER.length}`}</span>
      <button className="scan-help-button" type="button" onClick={onHelp} aria-label="Scan setup help">
        ?
      </button>
      {countdown > 0 ? <em>{countdown}</em> : null}
    </div>
  );
}

function ScanHelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="scan-help-backdrop" role="dialog" aria-modal="true" aria-label="Scan setup help">
      <div className="scan-help-panel">
        <div className="scan-help-header">
          <strong>Scan setup</strong>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close scan help">
            <X size={16} />
          </button>
        </div>
        <p>Use the center stickers as the reference. Centers stay fixed even when the cube is shuffled.</p>
        <div className="scan-orientation-diagram" aria-hidden="true">
          <img src={orientationGuide} alt="" />
          <div>
            <strong>Start position</strong>
            <span>White center on top, green center facing camera.</span>
          </div>
        </div>
        <ol>
          <li>Hold the white center on top.</li>
          <li>Turn the cube so the green center faces the camera.</li>
          <li>Scan the requested center colors in order.</li>
        </ol>
        <div className="scan-help-colors">
          {SCAN_ORDER.map((face, index) => (
            <span key={face}>
              <i style={{ background: FACE_COLORS[face] }} />
              {index + 1}. {FACE_NAMES[face]}
            </span>
          ))}
        </div>
        <p className="scan-help-note">Uses captured center stickers to map cube colors.</p>
      </div>
    </div>
  );
}

function GridOverlay() {
  return (
    <div className="grid-overlay" aria-hidden="true">
      {Array.from({ length: 9 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function Progress({ captures, currentFace, complete }: { captures: FaceCapture[]; currentFace: FaceKey; complete: boolean }) {
  const capturedCenterByFace = new Map(captures.map((capture) => [capture.face, capture.colors[4] as FaceKey]));
  const customSchemeFaces = SCAN_ORDER.filter((face) => {
    const center = capturedCenterByFace.get(face);
    return center && center !== face;
  });
  const hasCustomScheme = customSchemeFaces.length > 0;

  return (
    <>
      <div className="scan-progress" aria-label="Scan progress">
        {SCAN_ORDER.map((face) => {
          const capturedCenter = capturedCenterByFace.get(face);
          const done = Boolean(capturedCenter);
          const active = !complete && face === currentFace;
          const chipColor = capturedCenter ? FACE_COLORS[capturedCenter] : FACE_COLORS[face];
          const colorLabel = capturedCenter
            ? `${COLOR_NAMES[capturedCenter]} center`
            : `Typical ${COLOR_NAMES[face]}`;

          return (
            <div className={done ? "progress-item done" : active ? "progress-item active" : "progress-item"} key={face}>
              <span style={{ background: chipColor }} />
              <div>
                <strong>{FACE_NAMES[face]}</strong>
                <small>{colorLabel}</small>
              </div>
            </div>
          );
        })}
      </div>
      {hasCustomScheme ? (
        <p className="scheme-note">
          This scan uses the captured center colors for face mapping.
        </p>
      ) : null}
    </>
  );
}

function FaceletEditor({
  state,
  selectedSticker,
  onSelect,
  onColor,
}: {
  state: CubeState;
  selectedSticker: { face: FaceKey; index: number } | null;
  onSelect: (sticker: { face: FaceKey; index: number }) => void;
  onColor: (color: FaceKey) => void;
}) {
  const selectedColor = selectedSticker ? state[selectedSticker.face][selectedSticker.index] : "";

  return (
    <div className="facelet-editor">
      <div className="net-grid" aria-label="Captured facelets">
        {(["U", "L", "F", "R", "B", "D"] as FaceKey[]).map((face) => (
          <div className={`mini-face face-${face}`} key={face}>
            <span className="mini-label">{face}</span>
            {state[face].map((color, index) => {
              const selected = selectedSticker?.face === face && selectedSticker.index === index;
              return (
                <button
                  aria-label={`${FACE_NAMES[face]} sticker ${index + 1}${color ? `, ${COLOR_NAMES[color as FaceKey]}` : ""}`}
                  className={selected ? "sticker-swatch selected" : "sticker-swatch"}
                  disabled={!color}
                  key={`${face}-${index}`}
                  onClick={() => onSelect({ face, index })}
                  style={{ background: color ? FACE_COLORS[color as FaceKey] : "#d7dde8" }}
                  type="button"
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="color-palette" aria-label="Sticker color correction">
        {FACE_ORDER.map((face) => (
          <button
            aria-label={COLOR_NAMES[face]}
            className={selectedColor === face ? "palette-swatch active" : "palette-swatch"}
            disabled={!selectedSticker}
            key={face}
            onClick={() => onColor(face)}
            style={{ background: FACE_COLORS[face] }}
            title={COLOR_NAMES[face]}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}

function PlaybackControls({
  solution,
  step,
  onStep,
}: {
  solution: ParsedMove[];
  step: number;
  onStep: (step: number) => void;
}) {
  const active = solution[step];
  return (
    <div className="playback">
      <div className="move-readout">
        <span>Move {solution.length === 0 ? 0 : Math.min(step + 1, solution.length)} / {solution.length}</span>
        <strong>{active?.notation ?? "-"}</strong>
      </div>
      <div className="button-row">
        <button className="icon-button wide" type="button" onClick={() => onStep(Math.max(0, step - 1))} disabled={step === 0}>
          <StepBack size={18} />
          Back
        </button>
        <button
          className="icon-button wide"
          type="button"
          onClick={() => onStep(Math.min(solution.length, step + 1))}
          disabled={solution.length === 0 || step >= solution.length}
        >
          <StepForward size={18} />
          Next
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
