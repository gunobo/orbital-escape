import * as THREE from "three";

const raycaster = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

/**
 * 마우스(정규화 좌표 -1..1)가 가리키는 선과, z = planeZ 평면이 만나는 월드 좌표를 구한다.
 * 다음 게이트가 있는 깊이의 평면을 쓰면 "화면에서 고리를 가리키면 그 고리 중심이 목표"가 된다.
 * 선이 평면과 만나지 않으면(카메라 뒤쪽 등) false.
 */
export function aimPointOnPlane(
  camera: THREE.Camera,
  pointer: { x: number; y: number },
  planeZ: number,
  out: THREE.Vector3,
): boolean {
  plane.constant = -planeZ;
  raycaster.setFromCamera(new THREE.Vector2(pointer.x, pointer.y), camera);
  return raycaster.ray.intersectPlane(plane, out) !== null;
}
