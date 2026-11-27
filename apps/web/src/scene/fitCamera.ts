import * as THREE from 'three';

export interface CameraFit {
  readonly distance: number;
  readonly target: THREE.Vector3;
}

/**
 * 找出能讓所有點留在畫面內的最近鏡頭距離，並讓內容上下置中。
 * camera 的 fov 與 aspect 由呼叫端先設好；函式會更新投影矩陣並移動 camera。
 */
export function fitCamera(
  camera: THREE.PerspectiveCamera,
  points: readonly THREE.Vector3[],
  elevationDegrees: number,
  margin = 0.03,
): CameraFit {
  const elevation = THREE.MathUtils.degToRad(elevationDegrees);
  const direction = new THREE.Vector3(0, Math.sin(elevation), Math.cos(elevation));
  const target = new THREE.Vector3();
  const projected = new THREE.Vector3();
  // 投影要反映目前的 aspect
  camera.updateProjectionMatrix();

  const bounds = (distance: number) => {
    camera.position.copy(target).addScaledVector(direction, distance);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    let maxX = 0;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const point of points) {
      projected.copy(point).project(camera);
      maxX = Math.max(maxX, Math.abs(projected.x));
      minY = Math.min(minY, projected.y);
      maxY = Math.max(maxY, projected.y);
    }
    return { maxX, minY, maxY };
  };

  let distance = 0;
  for (let pass = 0; pass < 6; pass++) {
    let near = 1;
    let far = 1000;
    for (let i = 0; i < 32; i++) {
      const middle = (near + far) / 2;
      const { maxX, minY, maxY } = bounds(middle);
      const fits = Math.max(maxX, -minY, maxY) <= 1 - margin;
      if (fits) far = middle;
      else near = middle;
    }
    distance = far;
    if (pass < 5) {
      const { minY, maxY } = bounds(distance);
      const halfHeight = distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      target.z -= (((minY + maxY) / 2) * halfHeight) / Math.sin(elevation);
    }
  }
  bounds(distance);
  return { distance, target };
}
