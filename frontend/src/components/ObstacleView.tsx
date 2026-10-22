import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import type { ObstacleEntity } from "../types";

interface Props {
  data: ObstacleEntity;
}

export default function ObstacleView({ data }: Props) {
  const ref = useRef<Mesh>(null);

  useFrame((_state, delta) => {
    if (!ref.current) return;
    ref.current.position.set(data.position.x, data.position.y, data.position.z);
    ref.current.scale.setScalar(Math.min(1, data.age / 0.8)); // 갑자기 튀어나오지 않고 서서히 나타난다
    ref.current.rotation.x += delta * 0.25;
    ref.current.rotation.y += delta * 0.35;
  });

  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[data.radius, 0]} />
      <meshStandardMaterial color="#8a6a4f" flatShading roughness={1} />
    </mesh>
  );
}
