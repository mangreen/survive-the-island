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
  serpent: '#b5c93f',
  serpentBelly: '#d2483a',
  shark: '#5d6b78',
  whale: '#3f5f8a',
  belly: '#e6e0cf',
  skin: '#f0c9a0',
} as const;

/** 六位玩家的紙色。另外靠棋子底座形狀區分的做法留到 M6。 */
export const PLAYER_COLORS = [
  '#c8483a',
  '#3b6db3',
  '#e0a526',
  '#4f8f4a',
  '#8259a8',
  '#e6e1d6',
] as const;
