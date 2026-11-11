import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AppSettings } from '../types/profile';
import { pickFile, pickFolder } from '../hooks/useFilePicker';

interface Props {
  settings:     AppSettings;
  onSave:       (s: AppSettings) => void;
  onClose:      () => void;
  onResetDemos: () => void;
}

export default function SettingsModal({ settings, onSave, onClose, onResetDemos }: Props) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [confirmReset, setConfirmReset] = useState(false);

  async function browseHatari() {
    const path = await pickFile('Select Hatari binary');
    if (path) setDraft({ ...draft, hatariPath: path });
  }

  async function browseRoms() {
    const path = await pickFolder('Select TOS ROMs folder');
    if (path) setDraft({ ...draft, romsFolder: path });
  }

  async function browseFloppies() {
    const path = await pickFolder('Select default floppy folder');
    if (path) setDraft({ ...draft, floppyFolder: path });
  }

  async function autoDetectHatari() {
    const detected = await invoke<string | null>('detect_hatari');
    if (detected) setDraft({ ...draft, hatariPath: detected });
  }

  function handleSave() {
    onSave(draft);
    onClose();
  }

  return (
    <div className="overlay">
      <div className="wizard" style={{ width: 520 }}>
        <div className="wizard-header">
          <div className="wizard-title">Settings</div>
          <div className="wizard-sub">Configure paths and preferences</div>
        </div>

        <div className="wizard-body">

          {/* Hatari binary */}
          <div className="section-label" style={{ marginTop: 0 }}>Hatari</div>
          <div className="card">
            <div className="form-row">
              <label className="form-label">Hatari binary path</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  placeholder="e.g. /opt/homebrew/bin/hatari"
                  value={draft.hatariPath}
                  onChange={e => setDraft({ ...draft, hatariPath: e.target.value })}
                />
                <button className="btn-sm" onClick={browseHatari}>Browse</button>
                <button className="btn-sm" onClick={autoDetectHatari}>Auto-detect</button>
              </div>
              <div className="field-hint" style={{ marginTop: 4 }}>
                The path to your Hatari executable. Auto-detect will check common install locations.
              </div>
            </div>
          </div>

          {/* Default folders */}
          <div className="section-label">Default folders</div>
          <div className="card">
            <div className="form-row">
              <label className="form-label">TOS ROMs folder</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  placeholder="Folder containing your TOS ROM images"
                  value={draft.romsFolder}
                  onChange={e => setDraft({ ...draft, romsFolder: e.target.value })}
                />
                <button className="btn-sm" onClick={browseRoms}>Browse</button>
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: 0 }}>
              <label className="form-label">Floppy images folder</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  placeholder="Default location for floppy disk images"
                  value={draft.floppyFolder}
                  onChange={e => setDraft({ ...draft, floppyFolder: e.target.value })}
                />
                <button className="btn-sm" onClick={browseFloppies}>Browse</button>
              </div>
            </div>
          </div>

          {/* Theme */}
          <div className="section-label">Appearance</div>
          <div className="card">
            <div className="toggle-row" style={{ borderBottom: 'none', padding: '4px 0' }}>
              <div>
                <span className="toggle-label">Theme</span>
                <div className="toggle-note">Choose how FujiNext looks</div>
              </div>
              <select
                className="form-select"
                value={draft.theme}
                onChange={e => setDraft({ ...draft, theme: e.target.value as 'light' | 'dark' })}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
          </div>

          {/* Advanced — reset demo profiles */}
          <div className="section-label">Advanced</div>
          <div className="card">
            <div className="toggle-row" style={{ borderBottom: 'none', padding: '4px 0' }}>
              <div style={{ flex: 1 }}>
                <span className="toggle-label">Restore ready-made profiles</span>
                <div className="toggle-note">
                  Put all the ready-made profiles back to their original setups, and bring back any you deleted.
                  Profiles you created, duplicated or imported are never changed.
                  To restore just one, right-click it in the list.
                </div>
              </div>
              {!confirmReset ? (
                <button className="btn-sm" onClick={() => setConfirmReset(true)}>
                  Reset...
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-sm" onClick={() => setConfirmReset(false)}>
                    Cancel
                  </button>
                  <button className="btn-sm danger" onClick={() => {
                    onResetDemos();
                    setConfirmReset(false);
                  }}>
                    Confirm reset
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

        <div className="wizard-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save settings</button>
        </div>
      </div>
    </div>
  );
}