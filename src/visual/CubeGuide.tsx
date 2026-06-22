import { Canvas, useFrame } from "@react-three/fiber";
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
      <Canvas camera={{ position: [4.2, 4.0, 5.2], fov: 38 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 5, 4]} intensity={1.7} />
        <RubikMesh stickers={stickers} activeMove={activeMove} />
      </Canvas>
    </div>
  );
}

function RubikMesh({ stickers, activeMove }: { stickers: Sticker3D[]; activeMove?: ParsedMove }) {
  const root = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!root.current) return;
    root.current.rotation.y = Math.sin(clock.elapsedTime * 0.35) * 0.12 - 0.55;
    root.current.rotation.x = -0.42;
  });

  return (
    <group ref={root}>
      <CubieBlocks />
      {stickers.map((sticker, index) => (
        <StickerPlane key={`${sticker.position.join(",")}-${sticker.normal.join(",")}-${index}`} sticker={sticker} activeMove={activeMove} />
      ))}
    </group>
  );
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
