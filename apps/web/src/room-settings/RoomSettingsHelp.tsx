import { useState } from 'react';
import { t } from '../i18n';
import { ROOM_SETTINGS, type RoomSettingId } from './options';

const IDS = Object.keys(ROOM_SETTINGS) as RoomSettingId[];

type Selection = Record<RoomSettingId, string>;

const DEFAULTS = Object.fromEntries(
  IDS.map((id) => [id, ROOM_SETTINGS[id].defaultValue]),
) as Selection;

/**
 * 房間設定與說明。M0 用來讓人確認文案與版面，選了不會影響任何對局；
 * 建房流程（M2、M3）會沿用這個元件並接上真正的房間狀態。
 */
export function RoomSettingsHelp() {
  const [selected, setSelected] = useState<Selection>(DEFAULTS);
  const text = t.roomSettings;

  return (
    <section className="room-settings">
      <h2>{text.heading}</h2>
      <p className="intro">{text.intro}</p>
      {IDS.map((id) => {
        const setting = text[id];
        const options = Object.entries(setting.options) as [
          string,
          { label: string; effect: string },
        ][];
        return (
          <fieldset key={id}>
            <legend>{setting.title}</legend>
            {options.map(([value, option]) => (
              <label key={value} className="option">
                <input
                  type="radio"
                  name={id}
                  value={value}
                  checked={selected[id] === value}
                  onChange={() => setSelected((current) => ({ ...current, [id]: value }))}
                />
                <span>
                  <strong>{option.label}</strong>
                  {value === ROOM_SETTINGS[id].defaultValue && (
                    <em className="tag">{text.defaultTag}</em>
                  )}
                  <span className="effect">{option.effect}</span>
                </span>
              </label>
            ))}
          </fieldset>
        );
      })}
    </section>
  );
}
