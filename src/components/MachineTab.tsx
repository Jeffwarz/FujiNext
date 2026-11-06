import { useState } from 'react';
import {
  Profile, MachineType, CpuType, DetectedRom,
  RAM_OPTIONS, CPU_OPTIONS, CPU_TYPE_OPTIONS, FPU_OPTIONS, TOS_ROMS, TTRAM_OPTIONS,
  HW_MAX_LABEL, isExtendedRam,
} from '../types/profile';
import { pickFile, ROM_FILTERS } from '../hooks/useFilePicker';
import { normalizeTosLabel, describeTos } from '../hatari/tos';

interface Props {
  profile:       Profile;
  detectedRoms:  DetectedRom[];
  romsFolder:    string;
  romScanError:  string;
  onChange:      (p: Profile) => void;
}

function set<K extends keyof Profile>(p: Profile, key: K, val: Profile[K]): Profile {
  return { ...p, [key]: val };
}

export default function MachineTab({ profile: p, detectedRoms, romsFolder, romScanError, onChange }: Props) {
  const tosStatus = describeTos(p, detectedRoms, { romsFolder, scanError: romScanError });
  // The ROM list is folded away while all is well; it opens by itself when it needs attention.
  const [tosOpen, setTosOpen] = useState(!tosStatus.ok);
  const ramOpts  = RAM_OPTIONS[p.machine];
  const cpuOpts  = CPU_OPTIONS[p.machine];
  const tosOpts  = TOS_ROMS.filter(t => t.machines.includes(p.machine));
  const extended = isExtendedRam(p.machine, p.ram);
  const hasTTRAM = p.machine === 'TT' || p.machine === 'Falcon';

  // Filter detected ROMs to those compatible with the current machine
  // A ROM matches if:
  //  - its detected machine equals the current machine, or
  //  - it's EmuTOS (compatible with all machines), or
  //  - it couldn't be auto-identified (show anyway so the user can pick it)
  const relevantDetected = detectedRoms.filter(rom => {
    if (rom.tosVersion === 'EmuTOS') return true;
    if (rom.machine === p.machine) return true;
    if (!rom.machine) return true;
    return false;
  });

  function changeMachine(m: MachineType) {
    const defCpu: Record<MachineType, Profile['cpu']> = {
      ST: '8', STE: '8', MegaSTE: '16', TT: '32', Falcon: '16',
    };
    const defCpuType: Record<MachineType, CpuType> = {
      ST: '68000', STE: '68000', MegaSTE: '68000', TT: '68030', Falcon: '68030',
    };
    const defRam: Record<MachineType, Profile['ram']> = {
      ST: '512K', STE: '512K', MegaSTE: '4M', TT: '4M', Falcon: '4M',
    };
    const firstTos = TOS_ROMS.find(t => t.machines.includes(m))?.ver ?? p.tos;
    onChange({
      ...p,
      machine: m,
      cpu:     defCpu[m],
      cpuType: defCpuType[m],
      fpu:     'none',
      ram:     defRam[m],
      tos:     firstTos,
      ttram:   'None',
      blitter: m !== 'ST',
      rtc:     ['MegaSTE', 'TT', 'Falcon'].includes(m),
    });
  }

  return (
    <div className="tab-inner">

      {/* Machine type */}
      <div className="section-label">Machine type</div>
      <div className="card">
        <div className="machine-options">
          {(['ST','STE','MegaSTE','TT','Falcon'] as MachineType[]).map(m => (
            <div
              key={m}
              className={`machine-opt ${p.machine === m ? 'sel' : ''}`}
              onClick={() => changeMachine(m)}
            >
              <div className="machine-opt-name">{m === 'MegaSTE' ? 'Mega STE' : m}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CPU speed */}
      <div className="section-label">CPU speed</div>
      <div className="card">
        <div className="cpu-grid">
          {cpuOpts.map(o => (
            <div
              key={o.id}
              className={`cpu-opt ${p.cpu === o.id ? 'sel' : ''}`}
              onClick={() => onChange(set(p, 'cpu', o.id))}
            >
              <div className="cpu-opt-name">{o.name}</div>
              <div className="cpu-opt-desc">{o.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CPU type */}
      <div className="section-label">CPU type</div>
      <div className="card">
        <div className="cpu-grid">
          {CPU_TYPE_OPTIONS.map(o => {
            const isReal = o.realFor.includes(p.machine);
            return (
              <div
                key={o.id}
                className={`cpu-opt ${p.cpuType === o.id ? 'sel' : ''}`}
                onClick={() => onChange(set(p, 'cpuType', o.id))}
              >
                <div className="cpu-opt-name">
                  {o.name}
                  {isReal && <span className="real-tag"> ★</span>}
                </div>
                <div className="cpu-opt-desc">{o.desc}</div>
              </div>
            );
          })}
        </div>
        <div className="ram-legend">
          <span><span className="legend-star">★</span> Stock chip for this machine</span>
        </div>
      </div>

      {/* FPU */}
      <div className="section-label">FPU</div>
      <div className="card">
        <div className="cpu-grid">
          {FPU_OPTIONS.map(o => (
            <div
              key={o.id}
              className={`cpu-opt ${p.fpu === o.id ? 'sel' : ''}`}
              onClick={() => onChange(set(p, 'fpu', o.id))}
            >
              <div className="cpu-opt-name">{o.name}</div>
              <div className="cpu-opt-desc">{o.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ST RAM */}
      <div className="section-label">ST RAM</div>
      <div className="card">
        <div className="ram-chips">
          {ramOpts.map(o => (
            <div
              key={o.v}
              className={`ram-chip ${p.ram === o.v ? 'sel' : ''} ${o.real ? '' : 'ext'}`}
              onClick={() => onChange(set(p, 'ram', o.v))}
            >
              {o.label}
              {!o.real && <span className="ext-tag">ext</span>}
            </div>
          ))}
        </div>
        <div className="ram-legend">
          <span><span className="legend-solid" /> Real hardware</span>
          <span><span className="legend-dashed" /> Hatari extended (beyond real HW max of {HW_MAX_LABEL[p.machine]})</span>
        </div>
        {extended && (
          <div className="ram-warn">
            Hatari will patch TOS system variables to support this extended memory size.
            Not possible on real {p.machine === 'MegaSTE' ? 'Mega STE' : p.machine} hardware.
          </div>
        )}
      </div>

      {/* TT RAM — TT and Falcon only */}
      {hasTTRAM && (
        <>
          <div className="section-label">
            TT RAM
            <span className="section-note"> — 32-bit fast RAM, {p.machine} only</span>
          </div>
          <div className="card">
            <div className="field-row">
              <span className="field-label">Size</span>
              <select
                className="form-select"
                value={p.ttram}
                onChange={e => onChange(set(p, 'ttram', e.target.value as Profile['ttram']))}
              >
                {TTRAM_OPTIONS.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <span className="field-hint">Up to 1024 MiB in 4 MiB steps</span>
            </div>
          </div>
        </>
      )}

      {/* TOS ROM */}
      <div className="section-label">TOS ROM</div>
      <div className="card">

        {/* What Hatari will actually be given, and why if it isn't the chosen ROM */}
        <div className={`rom-status ${tosStatus.ok ? 'ok' : 'warn'}`}>
          {tosStatus.ok ? '✓' : '⚠'} {tosStatus.text}
        </div>

        <button
          type="button"
          className="fold-toggle"
          aria-expanded={tosOpen}
          onClick={() => setTosOpen(open => !open)}
        >
          <span className="fold-chevron">{tosOpen ? '▾' : '▸'}</span>
          {tosOpen ? 'Hide ROM choices' : 'Change ROM'}
          {!tosOpen && relevantDetected.length > 0 && (
            <span className="fold-count">{relevantDetected.length} detected</span>
          )}
        </button>

        {tosOpen && (
        <div className="fold-body">

        {/* Detected ROMs from the configured ROMs folder */}
        {relevantDetected.length > 0 && (
          <>
            <div className="rom-group-label">
              <span className="rom-found-dot" /> Detected on disk ({relevantDetected.length})
            </div>
            <div className="tos-list" style={{ marginBottom: 12 }}>
              {relevantDetected.map(rom => (
                <div
                  key={rom.path}
                  className={`tos-item ${p.tosPath === rom.path ? 'sel' : ''}`}
                  onClick={() => onChange(set(p, 'tosPath', rom.path))}
                  title={rom.path}
                >
                  <div className="tos-flag">💾</div>
                  <div className="tos-info">
                    <div className="tos-ver">
                      {rom.tosVersion || rom.filename}
                    </div>
                    <div className="tos-note">
                      {rom.filename} · {formatSize(rom.size)}
                    </div>
                  </div>
                  {rom.machine && <div className="tos-year">{rom.machine}</div>}
                </div>
              ))}
            </div>
            <div className="rom-group-label">Generic versions</div>
          </>
        )}

        {/* Generic TOS list — always shown */}
        <div className="tos-list">
          {tosOpts.map(t => (
            <div
              key={t.ver}
              className={`tos-item ${normalizeTosLabel(p.tos) === normalizeTosLabel(t.ver) && !p.tosPath ? 'sel' : ''}`}
              onClick={() => onChange({ ...p, tos: t.ver, tosPath: '' })}
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

        <div className="custom-rom-row">
          <span className="field-label">Custom ROM</span>
          <input
            className="form-input"
            placeholder="Leave blank to use selection above"
            value={p.tosPath}
            onChange={e => onChange(set(p, 'tosPath', e.target.value))}
          />
          <button className="btn-sm" onClick={async () => {
            const path = await pickFile('Select TOS ROM image', ROM_FILTERS);
            if (path) onChange(set(p, 'tosPath', path));
          }}>Browse</button>
          {p.tosPath && (
            <button className="btn-sm danger" onClick={() => onChange(set(p, 'tosPath', ''))}>
              Clear
            </button>
          )}
        </div>

        </div>
        )}
      </div>

      {/* Features */}
      <div className="section-label">Features</div>
      <div className="card">
        <Toggle
          label="Blitter chip"
          value={p.blitter}
          onChange={v => onChange(set(p, 'blitter', v))}
        />
        <Toggle
          label="Real-time clock"
          value={p.rtc}
          onChange={v => onChange(set(p, 'rtc', v))}
        />
        <Toggle
          label="DSP emulation (Falcon only)"
          value={p.dsp}
          onChange={v => onChange(set(p, 'dsp', v))}
          disabled={p.machine !== 'Falcon'}
        />
        <Toggle
          label="Timer-D patch (speeds up emulation)"
          value={p.timerD}
          onChange={v => onChange(set(p, 'timerD', v))}
        />
      </div>

    </div>
  );
}

// ─── Toggle helper ────────────────────────────────────────────────────────────

interface ToggleProps {
  label:    string;
  value:    boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

function Toggle({ label, value, onChange, disabled }: ToggleProps) {
  return (
    <div className={`toggle-row ${disabled ? 'disabled' : ''}`}>
      <span className="toggle-label">{label}</span>
      <button
        className={`toggle ${value ? 'on' : 'off'}`}
        onClick={() => !disabled && onChange(!value)}
        aria-pressed={value}
      />
    </div>
  );
}

// Format byte count as KB/MB
function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024)        return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} bytes`;
}