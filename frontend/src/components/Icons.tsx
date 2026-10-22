import { Gauge, Lightning, Meteor, Planet, Rocket, ArrowsLeftRight } from "@phosphor-icons/react";
import type { ConceptId } from "../learning/concepts";

const ICONS = {
  gravity: Planet,
  newton3: ArrowsLeftRight,
  freefall: Meteor,
  newton2: Rocket,
  energy: Lightning,
  inertia: Gauge,
} satisfies Record<ConceptId, typeof Planet>;

/** 개념별 아이콘 (아이콘 라이브러리 하나만 쓴다) */
export function ConceptIcon({ id, size = 16 }: { id: ConceptId; size?: number }) {
  const Icon = ICONS[id];
  return <Icon size={size} weight="regular" aria-hidden />;
}
