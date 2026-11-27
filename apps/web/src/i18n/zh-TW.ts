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
  roomSettings: {
    heading: '房間設定',
    intro: '開局前由房主設定，所有玩家都看得到。三項互不影響；不確定時保留預設值即可。',
    defaultTag: '預設',
    goodForPrefix: '適合：',
    ...roomSettings,
  },
} as const;
