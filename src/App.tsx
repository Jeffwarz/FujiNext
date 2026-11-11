import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { normalizeTheme, type Theme } from './themes';
import { importHatariCfg } from './hatari/importCfg';
import { pickFile } from './hooks/useFilePicker';
import { Profile, AppSettings, DetectedRom, normalizeProfile } from './types/profile';
import { DEMO_PROFILES, DEMO_PROFILE_IDS, resetDemoProfiles, restoreDemoProfile, addNewDemoProfiles } from './demoProfiles';
import Sidebar from './components/Sidebar';
import MainPanel from './components/MainPanel';
import SettingsModal from './components/SettingsModal';
import './App.css';

const INITIAL_PROFILES: Profile[] = DEMO_PROFILES;

// Which ready-made profiles this install has already offered (so a deleted one stays deleted).
const SEEN_KEY = 'fujinext.seenDemoProfiles';
function readSeenDemos(): number[] {
  try {
    const v = JSON.parse(localStorage.getItem(SEEN_KEY) ?? 'null');
    // Installs from before this existed had the original five.
    return Array.isArray(v) ? v : [1, 2, 3, 4, 5];
  } catch { return [1, 2, 3, 4, 5]; }
}
function rememberSeenDemos(ids: number[]) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids)); } catch { /* not available */ }
}

const DEFAULT_SETTINGS: AppSettings = {
  hatariPath:   '',
  romsFolder:   '',
  floppyFolder: '',
  theme:        'dark',
};

export default function App() {
  const [profiles, setProfiles]       = useState<Profile[]>(INITIAL_PROFILES);
  const [activeId, setActiveId]       = useState<number>(1);
  const [settings, setSettings]       = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [detectedRoms, setDetectedRoms] = useState<DetectedRom[]>([]);
  const [romScanError, setRomScanError] = useState('');
  const [loaded, setLoaded]           = useState(false);

  // On startup: detect Hatari, load saved profiles + settings
  useEffect(() => {
    (async () => {
      try {
        const saved = await invoke<AppSettings | null>('load_settings');
        if (saved) setSettings(saved);
      } catch {}

      try {
        const detected = await invoke<string | null>('detect_hatari');
        if (detected) {
          setSettings(prev => prev.hatariPath ? prev : { ...prev, hatariPath: detected });
        }
      } catch {}

      try {
        const saved = await invoke<Profile[]>('load_profiles');
        if (saved && saved.length > 0) {
          const upgraded = addNewDemoProfiles(saved.map(normalizeProfile), readSeenDemos());
          rememberSeenDemos(upgraded.seen);
          setProfiles(upgraded.profiles);
          setActiveId(upgraded.profiles[0].id);
        }
      } catch {}

      rememberSeenDemos([...DEMO_PROFILE_IDS]);
      setLoaded(true);
    })();
  }, []);

  // Auto-save profiles whenever they change
  useEffect(() => {
    if (!loaded) return;
    invoke('save_profiles', { profiles }).catch(err =>
      console.error('Failed to save profiles:', err)
    );
  }, [profiles, loaded]);

  // Auto-save settings whenever they change
  useEffect(() => {
    if (!loaded) return;
    invoke('save_settings', { settings }).catch(err =>
      console.error('Failed to save settings:', err)
    );
  }, [settings, loaded]);

  // Scan ROM folder whenever it changes
  useEffect(() => {
    setRomScanError('');
    if (!settings.romsFolder) {
      setDetectedRoms([]);
      return;
    }
    invoke<DetectedRom[]>('scan_rom_folder', { folder: settings.romsFolder })
      .then(setDetectedRoms)
      .catch(err => {
        setDetectedRoms([]);
        setRomScanError(String(err));
      });
  }, [settings.romsFolder]);

  // The look follows the Settings choice ('dark' and 'light' are the modern looks).
  useEffect(() => {
    document.documentElement.dataset.theme = normalizeTheme(settings.theme);
  }, [settings.theme]);

  const activeProfile = profiles.find(p => p.id === activeId) ?? profiles[0];

  function updateProfile(updated: Profile) {
    setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
  }

  function addProfile(p: Profile) {
    setProfiles(prev => [...prev, p]);
    setActiveId(p.id);
  }

  /** Returns a sentence for the user, or '' if they cancelled. */
  async function importCfg(): Promise<string> {
    const path = await pickFile('Import a Hatari config file', [{ name: 'Hatari config', extensions: ['cfg'] }]);
    if (!path) return '';
    try {
      const text = await invoke<string>('read_text_file', { path });
      const result = importHatariCfg(text, path, Date.now());
      if (result.profile) addProfile(result.profile);
      return result.message;
    } catch (err) {
      return `Couldn't import that file: ${err}`;
    }
  }

  function duplicateProfile(id: number) {
    const src = profiles.find(p => p.id === id);
    if (!src) return;
    const copy: Profile = {
      ...JSON.parse(JSON.stringify(src)),
      id: Date.now(),
      name: src.name + ' (copy)',
      last: 'never',
      createdAt: Date.now(),
    };
    addProfile(copy);
  }

  function deleteProfile(id: number) {
    if (profiles.length <= 1) return;
    const remaining = profiles.filter(p => p.id !== id);
    setProfiles(remaining);
    if (activeId === id) setActiveId(remaining[0].id);
  }

  function renameProfile(id: number, name: string) {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  }

  function restoreOne(id: number) {
    setProfiles(prev => restoreDemoProfile(prev, id));
  }

  function handleResetDemos() {
    setProfiles(prev => resetDemoProfiles(prev));
  }

  return (
    <div className="app-shell">
      <Sidebar
        profiles={profiles}
        activeId={activeId}
        onSelect={setActiveId}
        onAdd={addProfile}
        onImport={importCfg}
        onDuplicate={duplicateProfile}
        onRename={renameProfile}
        onDelete={deleteProfile}
        onRestore={restoreOne}
        theme={normalizeTheme(settings.theme)}
        onThemeChange={(theme: Theme) => setSettings(prev => ({ ...prev, theme }))}
        onOpenSettings={() => setShowSettings(true)}
      />
      <MainPanel
        profile={activeProfile}
        hatariPath={settings.hatariPath}
        detectedRoms={detectedRoms}
        romsFolder={settings.romsFolder}
        romScanError={romScanError}
        onChange={updateProfile}
        onDuplicate={() => duplicateProfile(activeProfile.id)}
        onDelete={() => deleteProfile(activeProfile.id)}
      />
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={setSettings}
          onClose={() => setShowSettings(false)}
          onResetDemos={handleResetDemos}
        />
      )}
    </div>
  );
}