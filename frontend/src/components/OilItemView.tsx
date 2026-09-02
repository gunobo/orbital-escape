import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import type { OilItemEntity } from "../types";

interface Props {
  data: OilItemEntity;
}

export default function OilItemView({ data }: Props) {
  const ref = useRef<Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 2;
    ref.current.position.y = data.position.y + Math.sin(state.clock.elapsedTime * 3) * 0.3;
  });

  return (
    <mesh ref={ref} position={[data.position.x, data.position.y, data.position.z]}>
      <torusKnotGeometry args={[data.radius * 0.6, data.radius * 0.25, 64, 12]} />
      <meshStandardMaterial color="#ffb703" emissive="#ff8c00" emissiveIntensity={0.8} />
    </mesh>
  );
}
