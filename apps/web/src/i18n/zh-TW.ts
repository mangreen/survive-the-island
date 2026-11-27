import type { RoomSettingId, RoomSettingValue } from '../room-settings/options';

interface OptionText {
  label: string;
  /** 一句話：選了之後會怎樣 */
  effect: string;
}

type RoomSettingText = {
  [K in RoomSettingId]: {
    title: string;
    options: Record<RoomSettingValue<K>, OptionText>;
  };
};

const roomSettings: RoomSettingText = {
  tileBacks: {
    title: '板塊背面內容',
    options: {
      bounded: { label: '限制內隨機', effect: '每局重新分配，熟手也猜不到。' },
      classic: { label: '原版固定', effect: '各地形內容同原版，只洗位置。' },
    },
  },
  creatures: {
    title: '誰移動生物',
    options: {
      player: { label: '玩家控制', effect: '輪到的人選一隻移動，可不動。' },
      nature: { label: '自然模式', effect: '電腦移動，較常攻擊領先者。' },
    },
  },
  sinking: {
    title: '誰決定沉哪塊',
    options: {
      player: { label: '玩家選擇', effect: '輪到的人挑一塊沉，可用來卡人。' },
      nature: { label: '自然模式', effect: '電腦隨機挑，減少針對玩家。' },
    },
  },
};

export const zhTW = {
  appTitle: '絕命島求生',
  prototype: {
    subtitle: 'M0 技術原型：量效能、看美術風格。還不能玩。',
    stageLabel: '3D 棋盤，拖曳平移、滾輪或雙指縮放',
    quality: '畫質',
    qualities: { high: '高', medium: '中', low: '低' },
    load: '棋子數',
    loads: { start: '開局', full: '滿載' },
    grid: '格線座標',
    motion: '動畫',
    resetView: '重設視角',
    measure: '量測效能',
    roomSettings: '房間設定說明',
    close: '關閉',
    liveFps: 'FPS',
    liveLow: '最慢 1%',
    drawCalls: 'draw calls',
    triangles: '三角形',
    gridLegend: '橘：島嶼 40 格　綠：安全島上岸格　白圈：海蛇起點',
    webglError: '這個瀏覽器無法啟動 3D 畫面（WebGL）。',
    benchmark: {
      title: '效能量測',
      running: (done: number, total: number) =>
        `量測中 ${done}/${total}，約需 30 秒。請讓這個分頁保持在最上層。`,
      hidden: '量測中斷：分頁被切到背景，結果不準。請重新量測。',
      aborted: '量測已取消。',
      failed: '量測失敗，請重新整理後再試。',
      done: '量測完成。把下面整段文字貼給我就可以。',
      copy: '複製結果',
      copied: '已複製',
      copyFailed: '無法自動複製，請手動選取文字。',
    },
  },
  roomSettings: {
    heading: '房間設定',
    intro: '房主開局前設定；不確定就用預設。',
    defaultTag: '預設',
    ...roomSettings,
  },
} as const;
