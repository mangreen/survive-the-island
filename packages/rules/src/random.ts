/**
 * 規則用亂數：sfc32，128 位元狀態。
 *
 * 種子要夠長：地形排列是公開的，又和板塊背面出自同一個種子；32 位元的種子可以窮舉比對地形，
 * 反推出全部背面。種子由房主用安全亂數產生。這是朋友間的信任等級，不是密碼學強度。
 */
export type Seed = readonly [number, number, number, number];

/** 可存進遊戲狀態、之後接續的亂數狀態 */
export type RandomState = Seed;

export interface Random {
  /** 0 到 bound-1 的整數 */
  int(bound: number): number;
  shuffle<T>(items: readonly T[]): T[];
  state(): RandomState;
}

const UINT32 = 2 ** 32;

function fromState(initial: RandomState): Random {
  let [a, b, c, d] = initial;
  const next = (): number => {
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return t >>> 0;
  };
  const int = (bound: number): number => {
    // 丟掉尾端的值，避免取餘數造成偏向
    const limit = UINT32 - (UINT32 % bound);
    let value = next();
    while (value >= limit) value = next();
    return value % bound;
  };
  return {
    int,
    shuffle<T>(items: readonly T[]): T[] {
      const result = [...items];
      for (let i = result.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [result[i], result[j]] = [result[j]!, result[i]!];
      }
      return result;
    },
    state: () => [a >>> 0, b >>> 0, c >>> 0, d >>> 0],
  };
}

function createFromSeed(seed: Seed): Random {
  const valid = seed.length === 4 && seed.every((n) => Number.isInteger(n) && n >= 0 && n < UINT32);
  if (!valid) throw new Error('種子必須是四個 32 位元非負整數');
  const random = fromState(seed);
  // 讓四段種子充分混合
  for (let i = 0; i < 20; i++) random.int(2);
  return random;
}

export const createRandom = Object.assign(createFromSeed, { resume: fromState });
