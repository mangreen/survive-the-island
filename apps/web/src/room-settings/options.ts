/**
 * 房間設定的選項清單。三項彼此獨立，開局前由房主決定，所有玩家看得到。
 * 這裡只有選項 id 與預設值；說明文字在語系檔。
 * 規則端的行為在 M1 實作，屆時型別移到規則套件。
 */
export const ROOM_SETTINGS = {
  tileBacks: { options: ['bounded', 'classic'], defaultValue: 'bounded' },
  creatures: { options: ['player', 'nature'], defaultValue: 'player' },
  sinking: { options: ['player', 'nature'], defaultValue: 'player' },
} as const;

export type RoomSettingId = keyof typeof ROOM_SETTINGS;

export type RoomSettingValue<K extends RoomSettingId> =
  (typeof ROOM_SETTINGS)[K]['options'][number];
