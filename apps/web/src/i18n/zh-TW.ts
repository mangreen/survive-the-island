import type { RoomSettingId, RoomSettingValue } from '../room-settings/options';

interface OptionText {
  label: string;
  /** 選了之後遊戲裡會發生什麼 */
  effect: string;
  /** 什麼情況適合選它 */
  goodFor: string;
}

type RoomSettingText = {
  [K in RoomSettingId]: {
    title: string;
    /** 這項設定決定什麼 */
    question: string;
    options: Record<RoomSettingValue<K>, OptionText>;
  };
};

const roomSettings: RoomSettingText = {
  tileBacks: {
    title: '板塊內容分配',
    question: '島嶼板塊的背面藏什麼？',
    options: {
      bounded: {
        label: '限制內隨機',
        effect:
          '每局重新分配。各內容總數不變，每種地形的各內容張數與原版最多差 1；火山一定在山地，沙灘最多 1 個漩渦。',
        goodFor: '想讓熟手也猜不到',
      },
      classic: {
        label: '原版固定',
        effect: '每種地形藏的內容組合與原版相同，只打亂擺放位置。',
        goodFor: '想照原版玩、靠熟悉的機率判斷',
      },
    },
  },
  creatures: {
    title: '生物行動',
    question: '擲生物骰之後，誰來移動生物？',
    options: {
      player: {
        label: '玩家控制',
        effect: '當回合玩家選一隻符合骰面的生物移動，也可以不移動。',
        goodFor: '喜歡用生物對付對手',
      },
      nature: {
        label: '自然模式',
        effect: '電腦移動生物。能攻擊時有 60% 機率攻擊，較常找獲救人數多的玩家。防禦板塊照常可用。',
        goodFor: '不想被玩家指名攻擊',
      },
    },
  },
  sinking: {
    title: '沉島翻板',
    question: '每回合沉掉哪一片板塊？（一律先沙灘、再森林、最後山地）',
    options: {
      player: {
        label: '玩家選擇',
        effect: '當回合玩家在規則允許的板塊中挑一片。',
        goodFor: '喜歡卡位、把對手推下海',
      },
      nature: {
        label: '自然模式',
        effect: '電腦在規則允許的板塊中隨機挑一片。翻開的內容仍由當回合玩家查看與取得。',
        goodFor: '想減少針對特定玩家',
      },
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
    intro: '開局前由房主設定，所有玩家都看得到。三項互不影響；不確定時保留預設值即可。',
    defaultTag: '預設',
    goodForPrefix: '適合：',
    ...roomSettings,
  },
} as const;
