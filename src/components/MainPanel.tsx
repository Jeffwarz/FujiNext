import { useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Profile, DetectedRom } from '../types/profile';
import { toHatariCfg } from '../hatari/config';
import { resolveTos, describeTos } from '../hatari/tos';
import { summaryTiles } from '../profileSummary';
import MachineTab  from './MachineTab';
import StorageTab  from './StorageTab';
import DisplayTab  from './DisplayTab';
import SoundTab    from './SoundTab';
import JoysticksTab from './JoysticksTab';
import DevicesTab  from './DevicesTab';

interface Props {
  profile:       Profile;
  hatariPath:    string;
  detectedRoms:  DetectedRom[];
  romsFolder:    string;
  romScanError:  string;
  onChange:      (p: Profile) => void;
  onDuplicate:   () => void;
  onDelete:      () => void;
}

type Tab = 'machine' | 'storage' | 'display' | 'sound' | 'joysticks' | 'devices';

const TABS: { id: Tab; label: string }[] = [
  { id: 'machine', label: 'Machine' },
  { id: 'storage', label: 'Storage' },
  { id: 'display', label: 'Display' },
  { id: 'sound',   label: 'Sound'   },
  { id: 'joysticks', label: 'Joysticks' },
  { id: 'devices',   label: 'Devices'   },
];

export default function MainPanel({ profile, hatariPath, detectedRoms, romsFolder, romScanError, onChange, onDuplicate, onDelete }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('machine');
  const [status, setStatus]       = useState('Ready');

  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function flash(msg: string, ms = 2500) {
    setStatus(msg);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setStatus('Ready'), ms);
  }

  const romStatus = describeTos(profile, detectedRoms, { romsFolder, scanError: romScanError });

  async function handleLaunch() {
    flash(`Launching ${profile.name}…`);
    // A version label like "TOS 4.04" is matched to a real file in the ROMs
    // folder; Hatari is only ever given a file path.
    const tos = resolveTos(profile, detectedRoms);
    const tosStatus = describeTos(profile, detectedRoms, { romsFolder, scanError: romScanError });
    try {
      await invoke('launch_hatari', {
        hatariPath,
        profileId: profile.id,
        configContent: toHatariCfg({ ...profile, tosPath: tos.path }),
      });
      // Update last run timestamp
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      onChange({ ...profile, last: `today ${timeStr}` });
      flash(
        tosStatus.ok ? `Hatari launched — ${profile.name}` : `Hatari launched — ${tosStatus.text}`,
        tosStatus.ok ? 2500 : 15000,
      );
    } catch (err) {
      flash(`Error: ${err}`);
    }
  }

  return (
    <div className="main-panel">
      {/* Overview: what this profile is, whether it is ready, and Launch */}
      <div className="hero">
        <div className="hero-top">
          <div>
            <div className="hero-title">{profile.name}</div>
            {profile.notes && <div className="hero-notes">{profile.notes}</div>}
            <div className={`hero-status ${romStatus.ok ? '' : 'warn'}`}>
              {romStatus.ok ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5 L9.5 18 L20 6.5" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4 L22 20 H2 Z M12 10 V14 M12 17 V17.5" /></svg>
              )}
              <span>{romStatus.ok ? `Ready. ${romStatus.text}` : romStatus.text}</span>
            </div>
            <div className="hero-last">Last run: {profile.last}</div>
          </div>
          <div className="hero-actions">
            <button className="btn" onClick={onDuplicate}>Duplicate</button>
            <button className="btn btn-danger" onClick={onDelete}>Delete</button>
            <button className="btn btn-launch big" onClick={handleLaunch}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4 L20 12 L6 20 Z" /></svg>
              Launch
            </button>
          </div>
        </div>
        <div className="tiles">
          {summaryTiles(profile).map(t => (
            <div className="tile" key={t.label}>
              <div className="tile-label">{t.label}</div>
              <div className="tile-value">{t.value}</div>
              <div className="tile-note">{t.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {TABS.map(t => (
          <div
            key={t.id}
            className={`tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </div>
        ))}
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {activeTab === 'machine' && (
          <MachineTab
            key={profile.id}
            profile={profile}
            detectedRoms={detectedRoms}
            romsFolder={romsFolder}
            romScanError={romScanError}
            onChange={p => { onChange(p); flash('Profile updated'); }}
          />
        )}
        {activeTab === 'storage' && (
          <StorageTab
            profile={profile}
            onChange={p => { onChange(p); flash('Profile updated'); }}
          />
        )}
        {activeTab === 'display' && (
          <DisplayTab
            profile={profile}
            onChange={p => { onChange(p); flash('Profile updated'); }}
          />
        )}
        {activeTab === 'sound' && (
          <SoundTab
            profile={profile}
            onChange={p => { onChange(p); flash('Profile updated'); }}
          />
        )}
        {activeTab === 'joysticks' && (
          <JoysticksTab
            profile={profile}
            onChange={p => { onChange(p); flash('Profile updated'); }}
          />
        )}
        {activeTab === 'devices' && (
          <DevicesTab
            profile={profile}
            onChange={p => { onChange(p); flash('Profile updated'); }}
          />
        )}
      </div>

      {/* Status bar */}
      <div className="status-bar">
        <span>{status}</span>
        <span>{hatariPath ? `Hatari: ${hatariPath}` : 'Hatari: not found — check Settings'}</span>
      </div>
    </div>
  );
}