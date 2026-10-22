import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, MeshBasicMaterial } from "three";
import { COLORS } from "../constants/theme";
import type { GravityFieldEntity } from "../types";

interface Props {
  data: GravityFieldEntity;
}

export default function GravityFieldView({ data }: Props) {
  const ringMatRef = useRef<MeshBasicMaterial>(null);
  const coreRef = useRef<Mesh>(null);

  useFrame((_state, delta) => {
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.25;
      coreRef.current.rotation.x += delta * 0.1;
    }
    if (ringMatRef.current) {
      const color = !data.resolved ? COLORS.gate : data.passed ? COLORS.ok : COLORS.danger;
      ringMatRef.current.color.set(color);
    }
  });

  const strength = data.mu / 420;

  return (
    <group position={[data.position.x, data.position.y, data.position.z]}>
      {/* 영향 범위: 시야를 가리는 큰 구 대신, 진행 방향에 수직인 옅은 고리 두 개로 표시 */}
      {[0.5, 1].map((ratio) => (
        <mesh key={ratio}>
          <torusGeometry args={[data.influenceRadius * ratio, 0.05, 6, 64]} />
          <meshBasicMaterial color={COLORS.dim} transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.1 + strength * 0.4, 1]} />
        <meshStandardMaterial color="#3a3d43" emissive={COLORS.accent} emissiveIntensity={0.35} flatShading />
      </mesh>
      {/* 게이트 고리: 플레이어 쪽(-z)을 정면으로 바라보게 둔다 */}
      <mesh>
        <torusGeometry args={[data.gateRadius, 0.18, 12, 48]} />
        <meshBasicMaterial ref={ringMatRef} color={COLORS.gate} />
      </mesh>
    </group>
  );
}
