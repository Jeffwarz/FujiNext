import { useState } from 'react';
import { Profile, MachineType, makeDefaultProfile } from '../types/profile';
import { TOS_ROMS } from '../types/profile';

interface Props {
  profiles:       Profile[];
  activeId:       number;
  onSelect:       (id: number) => void;
  onAdd:          (p: Profile) => void;
  onImport:       () => Promise<string>;
  onDuplicate:    (id: number) => void;
  onRename:       (id: number, name: string) => void;
  onDelete:       (id: number) => void;
  onOpenSettings: () => void;
}

const BADGE_CLASS: Record<MachineType, string> = {
  ST:      'badge-st',
  STE:     'badge-ste',
  MegaSTE: 'badge-megaste',
  TT:      'badge-tt',
  Falcon:  'badge-falcon',
};

const BADGE_LABEL: Record<MachineType, string> = {
  ST:      'ST',
  STE:     'STE',
  MegaSTE: 'Mega STE',
  TT:      'TT',
  Falcon:  'Falcon',
};

export default function Sidebar({ profiles, activeId, onSelect, onAdd, onImport, onDuplicate, onRename, onDelete, onOpenSettings }: Props) {
  const [filter, setFilter]           = useState('');
  const [importMsg, setImportMsg]   = useState('');
  const [showWizard, setShowWizard]   = useState(false);
  const [editingId, setEditingId]     = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ id: number; x: number; y: number } | null>(null);

  const filtered = profiles.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  );

  function startEditing(p: Profile) {
    setEditingId(p.id);
    setEditingName(p.name);
  }

  function commitEdit() {
    if (editingId !== null) {
      const trimmed = editingName.trim();
      if (trimmed) onRename(editingId, trimmed);
    }
    setEditingId(null);
    setEditingName('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName('');
  }

  function handleContextMenu(e: React.MouseEvent, p: Profile) {
    e.preventDefault();
    onSelect(p.id);
    setContextMenu({ id: p.id, x: e.clientX, y: e.clientY });
  }

  function closeContextMenu() {
    setContextMenu(null);
  }

  return (
    <>
      <aside className="sidebar">
        {/* Header */}
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">
              <svg viewBox="0 0 100 100" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <rect x="42" y="8"  width="16" height="52" rx="8" fill="#fff"/>
                <rect x="12" y="28" width="16" height="36" rx="8" fill="#fff"/>
                <rect x="72" y="28" width="16" height="36" rx="8" fill="#fff"/>
                <rect x="12" y="60" width="76" height="16" rx="8" fill="#fff"/>
              </svg>
            </div>
            FujiNext™
          </div>
        </div>

        {/* Search */}
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input
            type="text"
            placeholder="Search profiles..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>

        {/* Profile list */}
        <div className="profile-list">
          {filtered.length === 0 && (
            <div className="no-results">No profiles match</div>
          )}
          {filtered.map(p => (
            <div
              key={p.id}
              className={`profile-item ${p.id === activeId ? 'active' : ''}`}
              onClick={() => { if (editingId !== p.id) onSelect(p.id); }}
              onDoubleClick={() => { onSelect(p.id); startEditing(p); }}
              onContextMenu={e => handleContextMenu(e, p)}
              title="Double-click to rename · Right-click for options"
            >
              <span className={`machine-badge ${BADGE_CLASS[p.machine]}`}>
                {BADGE_LABEL[p.machine]}
              </span>
              {editingId === p.id ? (
                <input
                  className="profile-name-input"
                  value={editingName}
                  autoFocus
                  onChange={e => setEditingName(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="profile-name">{p.name}</span>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-new" onClick={() => setShowWizard(true)} style={{ flex: 1 }}>
              + New profile
            </button>
            <button className="btn-new" onClick={onOpenSettings} style={{ width: 40 }} title="Settings">
              ⚙
            </button>
          </div>
          <button
            className="btn-new"
            style={{ width: '100%', marginTop: 6 }}
            title="Create a profile from an existing Hatari .cfg file"
            onClick={async () => {
              const msg = await onImport();
              if (msg) { setImportMsg(msg); setTimeout(() => setImportMsg(''), 12000); }
            }}
          >
            Import .cfg file…
          </button>
          {importMsg && <div className="field-hint" style={{ marginTop: 6 }} role="status">{importMsg}</div>}
          <div className="sidebar-copyright">
            <div className="copyright-name">FujiNext™ <span className="copyright-version">v1.0</span></div>
            <div className="copyright-owner">© 2025 Jeff Warz</div>
            <div className="copyright-disclaimer">
              Not affiliated with the Hatari project or any holder of the Atari name or trademark.
              All machine names referenced for compatibility purposes only.
            </div>
          </div>
        </div>
      </aside>

      {/* Context menu */}
      {contextMenu && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 200 }}
            onClick={closeContextMenu}
            onContextMenu={e => { e.preventDefault(); closeContextMenu(); }}
          />
          <div
            className="context-menu"
            style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 201 }}
          >
            <div className="context-item" onClick={() => {
              const p = profiles.find(p => p.id === contextMenu.id);
              if (p) startEditing(p);
              closeContextMenu();
            }}>Rename</div>
            <div className="context-item" onClick={() => {
              onDuplicate(contextMenu.id);
              closeContextMenu();
            }}>Duplicate</div>
            <div className="context-divider" />
            <div className="context-item danger" onClick={() => {
              onDelete(contextMenu.id);
              closeContextMenu();
            }}>Delete</div>
          </div>
        </>
      )}

      {/* New profile wizard */}
      {showWizard && (
        <NewProfileWizard
          onClose={() => setShowWizard(false)}
          onCreated={p => { onAdd(p); setShowWizard(false); }}
        />
      )}
    </>
  );
}

// ─── New Profile Wizard ───────────────────────────────────────────────────────

interface WizardProps {
  onClose:   () => void;
  onCreated: (p: Profile) => void;
}

type WizardStep = 'name' | 'machine' | 'tos';

const MACHINE_OPTIONS: { machine: MachineType; cpu: string; ram: string }[] = [
  { machine: 'ST',      cpu: '68000', ram: '512K – 4 MiB'  },
  { machine: 'STE',     cpu: '68000', ram: '512K – 4 MiB'  },
  { machine: 'MegaSTE', cpu: '68000', ram: '1 – 10 MiB'    },
  { machine: 'TT',      cpu: '68030', ram: '1 – 10 MiB'    },
  { machine: 'Falcon',  cpu: '68030', ram: '1 – 14 MiB'    },
];

function NewProfileWizard({ onClose, onCreated }: WizardProps) {
  const [step, setStep]       = useState<WizardStep>('name');
  const [name, setName]       = useState('');
  const [notes, setNotes]     = useState('');
  const [machine, setMachine] = useState<MachineType>('ST');
  const [tos, setTos]         = useState('TOS 1.04');

  const compatTos = TOS_ROMS.filter(t => t.machines.includes(machine));

  const STEP_LABELS: Record<WizardStep, string> = {
    name:    'Step 1 of 3 — Name your system',
    machine: 'Step 2 of 3 — Choose machine type',
    tos:     'Step 3 of 3 — TOS ROM',
  };

  function handleNext() {
    if (step === 'name')    { setStep('machine'); return; }
    if (step === 'machine') {
      const first = TOS_ROMS.find(t => t.machines.includes(machine));
      if (first) setTos(first.ver);
      setStep('tos');
      return;
    }
    const defaults = makeDefaultProfile(Date.now());
    const defRam: Record<MachineType, Profile['ram']> = {
      ST: '512K', STE: '512K', MegaSTE: '4M', TT: '4M', Falcon: '4M',
    };
    const defCpu: Record<MachineType, Profile['cpu']> = {
      ST: '8', STE: '8', MegaSTE: '16', TT: '32', Falcon: '16',
    };
    onCreated({
      ...defaults,
      name:      name.trim() || 'New system',
      notes,
      machine,
      cpu:       defCpu[machine],
      ram:       defRam[machine],
      tos,
      bootFromHd: false,
      blitter:   machine !== 'ST',
      rtc:       ['MegaSTE', 'TT', 'Falcon'].includes(machine),
    });
  }

  function handleBack() {
    if (step === 'machine') { setStep('name');    return; }
    if (step === 'tos')     { setStep('machine'); return; }
    onClose();
  }

  return (
    <div className="overlay">
      <div className="wizard">
        <div className="wizard-header">
          <div className="wizard-title">New profile</div>
          <div className="wizard-sub">{STEP_LABELS[step]}</div>
        </div>

        <div className="wizard-body">
          {step === 'name' && (
            <>
              <div className="form-row">
                <label className="form-label">Profile name</label>
                <input
                  className="form-input"
                  placeholder="e.g. Gaming ST, Falcon Dev..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNext()}
                  autoFocus
                />
              </div>
              <div className="form-row">
                <label className="form-label">Notes (optional)</label>
                <input
                  className="form-input"
                  placeholder="What's this system for?"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </>
          )}

          {step === 'machine' && (
            <div className="machine-options">
              {MACHINE_OPTIONS.map(opt => (
                <div
                  key={opt.machine}
                  className={`machine-opt ${machine === opt.machine ? 'sel' : ''}`}
                  onClick={() => setMachine(opt.machine)}
                >
                  <div className="machine-opt-name">{BADGE_LABEL[opt.machine]}</div>
                  <div className="machine-opt-desc">{opt.cpu} · {opt.ram}</div>
                </div>
              ))}
            </div>
          )}

          {step === 'tos' && (
            <div className="tos-list">
              {compatTos.map(t => (
                <div
                  key={t.ver}
                  className={`tos-item ${tos === t.ver ? 'sel' : ''}`}
                  onClick={() => setTos(t.ver)}
                >
                  <div className="tos-flag">{t.flag}</div>
                  <div className="tos-info">
                    <div className="tos-ver">{t.ver}</div>
                    <div className="tos-note">{t.note}</div>
                  </div>
                  <div className="tos-year">{t.year}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="wizard-footer">
          <button className="btn-ghost" onClick={handleBack}>
            {step === 'name' ? 'Cancel' : 'Back'}
          </button>
          <button className="btn-primary" onClick={handleNext}>
            {step === 'tos' ? 'Create profile' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}