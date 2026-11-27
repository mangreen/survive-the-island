import { describe, expect, it } from 'vitest';
import { t } from '../i18n';
import { ROOM_SETTINGS, type RoomSettingId } from './options';

const ids = Object.keys(ROOM_SETTINGS) as RoomSettingId[];

describe('房間設定', () => {
  it('每項的預設值都是可選項目', () => {
    for (const id of ids) {
      expect(ROOM_SETTINGS[id].options).toContain(ROOM_SETTINGS[id].defaultValue);
    }
  });

  it('每個選項都有名稱與一句效果說明', () => {
    for (const id of ids) {
      const text = t.roomSettings[id];
      expect(Object.keys(text.options).sort()).toEqual([...ROOM_SETTINGS[id].options].sort());
      for (const option of Object.values(text.options)) {
        expect(option.label).not.toBe('');
        expect(option.effect).not.toBe('');
      }
    }
  });

  // 需求是「精簡的說明」：限制字數，避免之後越寫越長
  it('說明保持精簡', () => {
    expect(t.roomSettings.intro.length).toBeLessThanOrEqual(20);
    for (const id of ids) {
      expect(t.roomSettings[id].title.length).toBeLessThanOrEqual(8);
      for (const option of Object.values(t.roomSettings[id].options)) {
        expect(option.effect.length).toBeLessThanOrEqual(18);
      }
    }
  });
});
