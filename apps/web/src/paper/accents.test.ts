/** 重點色只做點綴：整片塗亮色不像真的生物，白底加彩色線條才看得出方向。用紙片面積把關。 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PALETTE } from './palette';
import { serpent, shark, whale } from './pieces';

/** 紙片正面的法線：生物整個往後仰了 0.42 弧度 */
const FACE = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(1, 0, 0), -0.42);

/** 模型裡指定紙色、朝正反兩面的總面積（不算厚度的側邊） */
function areaOf(geometry: THREE.BufferGeometry, color: string): number {
  const position = geometry.getAttribute('position');
  const colors = geometry.getAttribute('color');
  const want = new THREE.Color(color);
  const index = geometry.getIndex();
  const count = index ? index.count : position.count;
  const [a, b, c] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  let area = 0;
  for (let i = 0; i < count; i += 3) {
    const [x, y, z] = [0, 1, 2].map((k) => (index ? index.getX(i + k) : i + k)) as [
      number,
      number,
      number,
    ];
    const same =
      Math.abs(colors.getX(x) - want.r) < 1e-4 &&
      Math.abs(colors.getY(x) - want.g) < 1e-4 &&
      Math.abs(colors.getZ(x) - want.b) < 1e-4;
    if (!same) continue;
    a.fromBufferAttribute(position, x);
    b.fromBufferAttribute(position, y);
    c.fromBufferAttribute(position, z);
    const normal = b.sub(a).cross(c.sub(a));
    const size = normal.length() / 2;
    if (size > 0 && Math.abs(normal.normalize().dot(FACE)) > 0.99) area += size;
  }
  return area;
}

describe('生物的重點色', () => {
  it('鯊魚的亮綠只是皮膚上的細反光，鰭維持身體原色', () => {
    const figure = shark();
    const skin = areaOf(figure, PALETTE.shark) + areaOf(figure, PALETTE.sharkBack);
    const sheen = areaOf(figure, PALETTE.sharkSheen) / skin;
    expect(sheen).toBeGreaterThan(0.03);
    expect(sheen).toBeLessThan(0.12);
  });

  it.each([
    ['海蛇背鰭', serpent, PALETTE.serpentStripe],
    ['鯨魚水柱', whale, PALETTE.whaleStripe],
  ])('%s以白色為底，彩色是看得見的線條', (_, build, stripe) => {
    const figure = build();
    const white = areaOf(figure, PALETTE.finWhite);
    const lines = areaOf(figure, stripe);
    expect(white).toBeGreaterThan(0);
    // 太細在遊戲畫面上看不見，太粗就變回整片彩色
    expect(lines / white).toBeGreaterThan(0.2);
    expect(lines / white).toBeLessThan(0.7);
  });
});
