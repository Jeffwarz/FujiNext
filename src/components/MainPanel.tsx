import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Profile, DetectedRom } from '../types/profile';
import { toHatariCfg } from '../hatari/config';
import MachineTab  from './MachineTab';
import StorageTab  from './StorageTab';
import DisplayTab  from './DisplayTab';
import SoundTab    from './SoundTab';

interface Props {
  profile:       Profile;
  hatariPath:    string;
  detectedRoms:  DetectedRom[];
  onChange:      (p: Profile) => void;
  onDuplicate:   () => void;
  onDelete:      () => void;
}

type Tab = 'machine' | 'storage' | 'display' | 'sound';

const TABS: { id: Tab; label: string }[] = [
  { id: 'machine', label: 'Machine' },
  { id: 'storage', label: 'Storage' },
  { id: 'display', label: 'Display' },
  { id: 'sound',   label: 'Sound'   },
];

export default function MainPanel({ profile, hatariPath, detectedRoms, onChange, onDuplicate, onDelete }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('machine');
  const [status, setStatus]       = useState('Ready');

  function flash(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus('Ready'), 2500);
  }

  async function handleLaunch() {
    flash(`Launching ${profile.name}…`);
    try {
      await invoke('launch_hatari', {
        hatariPath,
        profileId: profile.id,
        configContent: toHatariCfg(profile),
      });
      // Update last run timestamp
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      onChange({ ...profile, last: `today ${timeStr}` });
      flash(`Hatari launched — ${profile.name}`);
    } catch (err) {
      flash(`Error: ${err}`);
    }
  }

  return (
    <div className="main-panel">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <span className="profile-title">{profile.name}</span>
          <span className="profile-last">Last run: {profile.last}</span>
        </div>
        <div className="toolbar-right">
          <button className="btn" onClick={onDuplicate}>Duplicate</button>
          <button className="btn btn-danger" onClick={onDelete}>Delete</button>
          <button className="btn btn-launch" onClick={handleLaunch}>▶ Launch</button>
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
            profile={profile}
            detectedRoms={detectedRoms}
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
      </div>

      {/* Status bar */}
      <div className="status-bar">
        <span>{status}</span>
        <span>{hatariPath ? `Hatari: ${hatariPath}` : 'Hatari: not found — check Settings'}</span>
      </div>
    </div>
  );
}