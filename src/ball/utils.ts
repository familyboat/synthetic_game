/**
 * 物理世界和渲染世界的单位之间的转换系数
 * unitOfRender = unitOfPhysics * scaleFactor
 */
const scaleFactor = 2 ** 5;

/**
 * 将渲染世界的单位转换为物理世界的单位
 */
export function toPhysics(unitOfRender: number): number {
  return unitOfRender / scaleFactor;
}

/**
 * 将物理世界的单位转换为渲染世界的单位
 */
export function toRender(unitOfPhysics: number): number {
  return unitOfPhysics * scaleFactor;
}

/**
 * 从数组中随机选择一个元素
 */
export function randomChoice<T>(input: Array<T>): T {
  const length = input.length;
  const index = Math.floor(Math.random() * length);

  return input[index];
}
