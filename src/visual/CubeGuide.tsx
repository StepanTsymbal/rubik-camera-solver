import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { AmbientLight, DirectionalLight, DoubleSide, Group, Mesh } from "three";
import { FACE_COLORS, FACE_NAMES, cubeStateToStickers, stateToFacelets, type CubeState, type ParsedMove, type Sticker3D } from "../cube";

type CubeGuideProps = {
  state: CubeState;
  activeMove?: ParsedMove;
  appliedMove?: ParsedMove;
};

type LayerAnimation = {
  move: ParsedMove;
  targetState: CubeState;
};

export function CubeGuide({ state, activeMove, appliedMove }: CubeGuideProps) {
  const [displayState, setDisplayState] = useState(state);
  const [animation, setAnimation] = useState<LayerAnimation | undefined>();
  const displayFacelets = useMemo(() => stateToFacelets(displayState), [displayState]);
  const targetFacelets = useMemo(() => stateToFacelets(state), [state]);
  const stickers = useMemo(() => cubeStateToStickers(displayState), [displayState]);
  const guideMove = animation?.move ?? activeMove;

  useEffect(() => {
    if (displayFacelets === targetFacelets) return;
    if (!appliedMove) {
      setAnimation(undefined);
      setDisplayState(state);
      return;
    }
    setAnimation({ move: appliedMove, targetState: state });
  }, [appliedMove, displayFacelets, state, targetFacelets]);

  return (
    <div className="cube-stage">
      {guideMove ? <MoveHud move={guideMove} /> : null}
      <Canvas camera={{ position: [5.2, 4.8, 6.4], fov: 42 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 5, 4]} intensity={1.7} />
        <RubikMesh
          stickers={stickers}
          activeMove={guideMove}
          animationMove={animation?.move}
          onAnimationComplete={() => {
            if (!animation) return;
            setDisplayState(animation.targetState);
            setAnimation(undefined);
          }}
        />
      </Canvas>
    </div>
  );
}

function MoveHud({ move }: { move: ParsedMove }) {
  const direction = move.turns === 2 ? "180 turn" : move.turns === -1 ? "counterclockwise" : "clockwise";
  const symbol = move.turns === 2 ? "180" : move.turns === -1 ? "CCW" : "CW";

  return (
    <div className="move-hud" aria-hidden="true">
      <strong>{move.notation}</strong>
      <span>{FACE_NAMES[move.face]}</span>
      <em>{symbol}</em>
      <small>{direction}, view from {FACE_NAMES[move.face]}</small>
    </div>
  );
}

function RubikMesh({
  stickers,
  activeMove,
  animationMove,
  onAnimationComplete,
}: {
  stickers: Sticker3D[];
  activeMove?: ParsedMove;
  animationMove?: ParsedMove;
  onAnimationComplete: () => void;
}) {
  const root = useRef<Group>(null);
  const layer = useRef<Group>(null);
  const animationStart = useRef<number | undefined>(undefined);
  const { size } = useThree();
  const sceneScale = size.width < 460 ? 0.66 : size.width < 720 ? 0.78 : 1;
  const stillCubies = CUBIE_POSITIONS.filter((position) => !animationMove || !isInLayer(position, animationMove.face));
  const animatedCubies = CUBIE_POSITIONS.filter((position) => animationMove && isInLayer(position, animationMove.face));
  const stillStickers = stickers.filter((sticker) => !animationMove || !isInLayer(sticker.position, animationMove.face));
  const animatedStickers = stickers.filter((sticker) => animationMove && isInLayer(sticker.position, animationMove.face));

  useEffect(() => {
    animationStart.current = undefined;
    if (layer.current) {
      layer.current.rotation.set(0, 0, 0);
    }
  }, [animationMove?.notation]);

  useFrame(({ clock }) => {
    if (root.current) {
      root.current.rotation.y = Math.sin(clock.elapsedTime * 0.35) * 0.12 - 0.55;
      root.current.rotation.x = -0.42;
    }

    if (!layer.current || !animationMove) return;
    if (animationStart.current === undefined) {
      animationStart.current = clock.elapsedTime;
    }
    const elapsed = clock.elapsedTime - animationStart.current;
    const progress = Math.min(1, elapsed / 0.42);
    const eased = easeOutCubic(progress);
    const { axis, angle } = layerTurn(animationMove);
    layer.current.rotation.set(0, 0, 0);
    layer.current.rotation[axis] = angle * eased;

    if (progress >= 1) {
      animationStart.current = undefined;
      onAnimationComplete();
    }
  });

  return (
    <group ref={root} scale={sceneScale}>
      <CubieBlocks positions={stillCubies} />
      {stillStickers.map((sticker, index) => (
        <StickerPlane key={`${sticker.position.join(",")}-${sticker.normal.join(",")}-${index}`} sticker={sticker} activeMove={activeMove} />
      ))}
      {animationMove ? (
        <group ref={layer}>
          <CubieBlocks positions={animatedCubies} />
          {animatedStickers.map((sticker, index) => (
            <StickerPlane key={`animated-${sticker.position.join(",")}-${sticker.normal.join(",")}-${index}`} sticker={sticker} activeMove={animationMove} />
          ))}
        </group>
      ) : null}
      {activeMove ? <MoveCue move={activeMove} /> : null}
    </group>
  );
}

function MoveCue({ move }: { move: ParsedMove }) {
  const ref = useRef<Group>(null);
  const config = moveCueConfig(move);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 6) * 0.04;
    const turn = clock.elapsedTime * 1.35 * (config.clockwise ? -1 : 1);
    ref.current.scale.setScalar(pulse);
    ref.current.rotation.z = config.rotation[2] + turn;
  });

  return (
    <group ref={ref} position={config.position} rotation={config.rotation}>
      <mesh position={[0, 0, -0.035]}>
        <planeGeometry args={[3.35, 3.35]} />
        <meshStandardMaterial color="#f59e0b" transparent opacity={0.13} side={DoubleSide} depthWrite={false} />
      </mesh>
      <mesh>
        <torusGeometry args={[1.72, 0.06, 16, 96, config.arc]} />
        <meshStandardMaterial color="#f97316" emissive="#f59e0b" emissiveIntensity={0.42} roughness={0.32} />
      </mesh>
      {[0.62, 1].map((ratio) => {
        const angle = config.signedArc * ratio;
        const position: [number, number, number] = [Math.cos(angle) * 1.72, Math.sin(angle) * 1.72, 0];
        const rotation: [number, number, number] = [0, 0, angle + (config.clockwise ? -Math.PI / 2 : Math.PI / 2)];
        return (
          <mesh key={ratio} position={position} rotation={rotation}>
            <coneGeometry args={[0.24, 0.58, 32]} />
            <meshStandardMaterial color="#f97316" emissive="#f59e0b" emissiveIntensity={0.5} roughness={0.32} />
          </mesh>
        );
      })}
    </group>
  );
}

function moveCueConfig(move: ParsedMove): {
  position: [number, number, number];
  rotation: [number, number, number];
  arc: number;
  signedArc: number;
  clockwise: boolean;
} {
  const clockwise = move.turns !== -1;
  const arc = move.turns === 2 ? Math.PI * 1.85 : Math.PI * 1.35;
  const signedArc = clockwise ? arc : -arc;
  const base = { arc, signedArc, clockwise };

  if (move.face === "U") return { ...base, position: [0, 1.2, 0], rotation: [-Math.PI / 2, 0, clockwise ? 0 : Math.PI] };
  if (move.face === "D") return { ...base, position: [0, -1.2, 0], rotation: [Math.PI / 2, 0, clockwise ? Math.PI : 0] };
  if (move.face === "R") return { ...base, position: [1.2, 0, 0], rotation: [0, Math.PI / 2, clockwise ? 0 : Math.PI] };
  if (move.face === "L") return { ...base, position: [-1.2, 0, 0], rotation: [0, -Math.PI / 2, clockwise ? Math.PI : 0] };
  if (move.face === "B") return { ...base, position: [0, 0, -1.2], rotation: [0, Math.PI, clockwise ? Math.PI : 0] };
  return { ...base, position: [0, 0, 1.2], rotation: [0, 0, clockwise ? 0 : Math.PI] };
}

function CubieBlocks({ positions }: { positions: Array<[number, number, number]> }) {
  return (
    <>
      {positions.map((position) => (
        <mesh key={position.join(",")} position={position}>
          <boxGeometry args={[0.96, 0.96, 0.96]} />
          <meshStandardMaterial color="#111827" roughness={0.65} metalness={0.08} />
        </mesh>
      ))}
    </>
  );
}

const CUBIE_POSITIONS: Array<[number, number, number]> = [];
for (let x = -1; x <= 1; x += 1) {
  for (let y = -1; y <= 1; y += 1) {
    for (let z = -1; z <= 1; z += 1) {
      CUBIE_POSITIONS.push([x, y, z]);
    }
  }
}

function StickerPlane({ sticker, activeMove }: { sticker: Sticker3D; activeMove?: ParsedMove }) {
  const ref = useRef<Mesh>(null);
  const position = sticker.position.map((value, axis) => value + sticker.normal[axis] * 0.501) as [number, number, number];
  const [nx, ny, nz] = sticker.normal;
  const rotation: [number, number, number] =
    ny === 1 ? [-Math.PI / 2, 0, 0] :
    ny === -1 ? [Math.PI / 2, 0, 0] :
    nx === 1 ? [0, Math.PI / 2, 0] :
    nx === -1 ? [0, -Math.PI / 2, 0] :
    nz === -1 ? [0, Math.PI, 0] :
    [0, 0, 0];

  useFrame(({ clock }) => {
    if (!ref.current || !activeMove) return;
    const highlight = isInLayer(sticker.position, activeMove.face);
    ref.current.scale.setScalar(highlight ? 1 + Math.sin(clock.elapsedTime * 8) * 0.035 : 1);
  });

  return (
    <mesh ref={ref} position={position} rotation={rotation}>
      <planeGeometry args={[0.78, 0.78]} />
      <meshStandardMaterial color={FACE_COLORS[sticker.color]} roughness={0.42} metalness={0.03} />
    </mesh>
  );
}

function isInLayer([x, y, z]: [number, number, number], face: string): boolean {
  return (
    (face === "U" && y === 1) ||
    (face === "D" && y === -1) ||
    (face === "R" && x === 1) ||
    (face === "L" && x === -1) ||
    (face === "F" && z === 1) ||
    (face === "B" && z === -1)
  );
}

function layerTurn(move: ParsedMove): { axis: "x" | "y" | "z"; angle: number } {
  const axis = move.face === "U" || move.face === "D" ? "y" : move.face === "R" || move.face === "L" ? "x" : "z";
  const count = move.turns === 2 ? 2 : 1;
  const dir = move.turns === -1 ? 1 : -1;
  const sign = move.face === "D" || move.face === "L" || move.face === "B" ? -dir : dir;
  return { axis, angle: sign * count * Math.PI / 2 };
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}
