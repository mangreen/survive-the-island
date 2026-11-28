/** 本遊戲自己的配色：低彩度的海面襯托暖色紙片。奶油色代替白、深棕代替黑。 */
export const PALETTE = {
  ink: '#3a2a20',
  cream: '#f4ead2',
  sea: '#4f8c99',
  seaDeep: '#3f7787',
  seaLight: '#79aeb1',
  seaFoam: '#cfe2d6',
  gridLine: '#d7e6da',
  sand: '#e9cd8c',
  sandLight: '#f3dfa8',
  sandDark: '#cfa964',
  grass: '#8fa850',
  leaf: '#79a24f',
  leafDark: '#527a41',
  trunk: '#8a5a3a',
  rock: '#a89482',
  rockLight: '#c3b19c',
  rockShade: '#8f7c6e',
  rockDark: '#6f5f57',
  wood: '#b9763f',
  woodDark: '#8d5630',
  // 生物顏色所有版本統一：海蛇紅、鯊魚綠、鯨魚藍、怪獸紫（怪獸模型到 Island 版才做）
  serpent: '#8c1f2f',
  // 每種生物配一個鮮豔的重點色，只做點綴：背鰭和水柱是白底彩線，鯊魚是皮膚反光
  finWhite: '#fbf6ea',
  serpentStripe: '#f5142c',
  serpentEye: '#f4ead2',
  // 淺灰綠身體、深一點的背、灰白肚子：像真鯊魚上深下淺，又認得出是綠色生物
  shark: '#96b88e',
  sharkBack: '#64855d',
  sharkBelly: '#e6e8da',
  sharkSheen: '#8cf56a',
  sharkMouth: '#8c2b33',
  whale: '#27408f',
  whaleStripe: '#0a7cff',
  belly: '#e6e0cf',
  skin: '#f0c9a0',
} as const;

/** 六位玩家的紙色：橘紅、亮藍、檸檬黃、薄荷綠、亮紫、粉紅。另外靠棋子底座形狀區分的做法留到 M6。 */
export const PLAYER_COLORS = [
  '#ff7a12',
  '#3f95ff',
  '#ffe600',
  '#6fe3b4',
  '#b25ce0',
  '#ff7ab8',
] as const;
