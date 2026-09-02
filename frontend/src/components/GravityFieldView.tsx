import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, MeshBasicMaterial } from "three";
import type { GravityFieldEntity } from "../types";

interface Props {
  data: GravityFieldEntity;
}

const NEUTRAL_COLOR = "#7c5cff";
const PASSED_COLOR = "#4ce08a";
const MISSED_COLOR = "#ff5c6c";

export default function GravityFieldView({ data }: Props) {
  const ringMatRef = useRef<MeshBasicMaterial>(null);
  const coreRef = useRef<Mesh>(null);

  useFrame((_state, delta) => {
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.6;
      coreRef.current.rotation.x += delta * 0.25;
    }
    if (ringMatRef.current) {
      const color = !data.resolved ? NEUTRAL_COLOR : data.passed ? PASSED_COLOR : MISSED_COLOR;
      ringMatRef.current.color.set(color);
    }
  });

  const strength = data.mu / 420;

  return (
    <group position={[data.position.x, data.position.y, data.position.z]}>
      <mesh>
        <sphereGeometry args={[data.influenceRadius, 24, 24]} />
        <meshBasicMaterial color="#7c5cff" transparent opacity={0.05} wireframe />
      </mesh>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.1 + strength * 0.4, 1]} />
        <meshStandardMaterial color="#3a2b6e" emissive="#7c5cff" emissiveIntensity={0.6} flatShading />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[data.gateRadius, 0.12, 12, 40]} />
        <meshBasicMaterial ref={ringMatRef} color={NEUTRAL_COLOR} />
      </mesh>
    </group>
  );
}
