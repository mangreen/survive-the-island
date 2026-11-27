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
  serpentCrest: '#f1e3bd',
  shark: '#6cc24a',
  sharkBelly: '#f3ec9a',
  sharkMouth: '#8c2b33',
  whale: '#27408f',
  belly: '#e6e0cf',
  skin: '#f0c9a0',
} as const;

/** 六位玩家的紙色：紅、藍、黃、薄荷綠、紫、粉紅。另外靠棋子底座形狀區分的做法留到 M6。 */
export const PLAYER_COLORS = [
  '#c8483a',
  '#2f6fe0',
  '#e0a526',
  '#6fe3b4',
  '#8d3f9f',
  '#ff7ab8',
] as const;
