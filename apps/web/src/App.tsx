import { t } from './i18n';
import { RoomSettingsHelp } from './room-settings/RoomSettingsHelp';

export function App() {
  return (
    <main className="page">
      <h1>{t.appTitle}</h1>
      <RoomSettingsHelp />
    </main>
  );
}
