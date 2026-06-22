import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AmbientLight, DirectionalLight, Group, Mesh } from "three";
import { FACE_COLORS, cubeStateToStickers, type CubeState, type ParsedMove, type Sticker3D } from "../cube";

type CubeGuideProps = {
  state: CubeState;
  activeMove?: ParsedMove;
};

export function CubeGuide({ state, activeMove }: CubeGuideProps) {
  const stickers = useMemo(() => cubeStateToStickers(state), [state]);
  return (
    <div className="cube-stage">
      <Canvas camera={{ position: [5.2, 4.8, 6.4], fov: 42 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 5, 4]} intensity={1.7} />
        <RubikMesh stickers={stickers} activeMove={activeMove} />
      </Canvas>
    </div>
  );
}

function RubikMesh({ stickers, activeMove }: { stickers: Sticker3D[]; activeMove?: ParsedMove }) {
  const root = useRef<Group>(null);
  const { size } = useThree();
  const sceneScale = size.width < 460 ? 0.66 : size.width < 720 ? 0.78 : 1;

  useFrame(({ clock }) => {
    if (!root.current) return;
    root.current.rotation.y = Math.sin(clock.elapsedTime * 0.35) * 0.12 - 0.55;
    root.current.rotation.x = -0.42;
  });

  return (
    <group ref={root} scale={sceneScale}>
      <CubieBlocks />
      {stickers.map((sticker, index) => (
        <StickerPlane key={`${sticker.position.join(",")}-${sticker.normal.join(",")}-${index}`} sticker={sticker} activeMove={activeMove} />
      ))}
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
    ref.current.scale.setScalar(pulse);
  });

  return (
    <group ref={ref} position={config.position} rotation={config.rotation}>
      <mesh>
        <torusGeometry args={[1.85, 0.035, 12, 72, config.arc]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.28} roughness={0.35} />
      </mesh>
      <mesh position={config.headPosition} rotation={config.headRotation}>
        <coneGeometry args={[0.16, 0.38, 3]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.34} roughness={0.35} />
      </mesh>
    </group>
  );
}

function moveCueConfig(move: ParsedMove): {
  position: [number, number, number];
  rotation: [number, number, number];
  headPosition: [number, number, number];
  headRotation: [number, number, number];
  arc: number;
} {
  const clockwise = move.turns !== -1;
  const arc = move.turns === 2 ? Math.PI * 1.85 : Math.PI * 1.35;
  const headAngle = clockwise ? arc : -arc;
  const headPosition: [number, number, number] = [Math.cos(headAngle) * 1.85, Math.sin(headAngle) * 1.85, 0];
  const headRotation: [number, number, number] = [0, 0, headAngle + (clockwise ? -Math.PI / 2 : Math.PI / 2)];

  if (move.face === "U") return { position: [0, 1.18, 0], rotation: [-Math.PI / 2, 0, clockwise ? 0 : Math.PI], headPosition, headRotation, arc };
  if (move.face === "D") return { position: [0, -1.18, 0], rotation: [Math.PI / 2, 0, clockwise ? Math.PI : 0], headPosition, headRotation, arc };
  if (move.face === "R") return { position: [1.18, 0, 0], rotation: [0, Math.PI / 2, clockwise ? 0 : Math.PI], headPosition, headRotation, arc };
  if (move.face === "L") return { position: [-1.18, 0, 0], rotation: [0, -Math.PI / 2, clockwise ? Math.PI : 0], headPosition, headRotation, arc };
  if (move.face === "B") return { position: [0, 0, -1.18], rotation: [0, Math.PI, clockwise ? Math.PI : 0], headPosition, headRotation, arc };
  return { position: [0, 0, 1.18], rotation: [0, 0, clockwise ? 0 : Math.PI], headPosition, headRotation, arc };
}

function CubieBlocks() {
  const positions = useMemo(() => {
    const items: Array<[number, number, number]> = [];
    for (let x = -1; x <= 1; x += 1) {
      for (let y = -1; y <= 1; y += 1) {
        for (let z = -1; z <= 1; z += 1) {
          items.push([x, y, z]);
        }
      }
    }
    return items;
  }, []);

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
