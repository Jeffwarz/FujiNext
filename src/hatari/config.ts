// Hatari .cfg generation and parsing.
//
// This is the single place that knows Hatari's config format. Every key written
// here is checked against the real Hatari source by config.test.ts (see
// tools/extract-hatari-keys.py), so a wrong key name or value type fails the
// tests instead of being silently ignored by Hatari.

import type {
  Profile, MachineType, CpuType, FpuType, MonitorType, StRamSize, TtRamSize, SoundFreq,
} from '../types/profile';

// ── Value tables (Hatari's own numeric codes) ────────────────────────────────

const MODEL_CODE: Record<MachineType, number> = {
  ST: 0, STE: 2, MegaSTE: 3, TT: 4, Falcon: 5,       // 1 = Mega ST, not offered in the UI
};

const CPU_LEVEL: Record<CpuType, number> = {
  '68000': 0, '68010': 1, '68020': 2, '68030': 3, '68040': 4, '68060': 5,
};

const FPU_CODE: Record<FpuType, number> = {
  none: 0, '68881': 68881, '68882': 68882, internal: 68040,
};

const MONITOR_CODE: Record<MonitorType, number> = {
  Mono: 0, Colour: 1, VGA: 2, TV: 3,
};

const ST_RAM_KB: Record<StRamSize, number> = {
  '512K': 512, '1M': 1024, '2M': 2048, '4M': 4096, '8M': 8192, '10M': 10240, '14M': 14336,
};

const TT_RAM_KB: Record<TtRamSize, number> = {
  'None': 0,
  '4 MiB': 4096, '8 MiB': 8192, '16 MiB': 16384, '32 MiB': 32768, '64 MiB': 65536,
  '128 MiB': 131072, '256 MiB': 262144, '512 MiB': 524288, '1024 MiB': 1048576,
};

const DSP_NONE = 0;
const DSP_FULL = 2;   // DSP_TYPE_EMU; "dummy" (1) is not offered in the UI

// ── Generation ───────────────────────────────────────────────────────────────

type Line = [key: string, value: string | number | boolean];

/** Hatari config values are single-line; strip anything that could inject a key. */
function text(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function render(section: string, lines: Line[]): string[] {
  return [
    `[${section}]`,
    ...lines.map(([key, value]) =>
      `${key} = ${typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : typeof value === 'string' ? text(value) : value}`),
    '',
  ];
}

function deviceLines(images: { id: number; img: string }[], count: number): Line[] {
  const lines: Line[] = [];
  for (let id = 0; id < count; id++) {
    const img = text(images.find(d => d.id === id)?.img ?? '');
    lines.push([`bUseDevice${id}`, img !== '']);
    if (img) lines.push([`sDeviceFile${id}`, img]);
  }
  return lines;
}

/**
 * Build the contents of a Hatari config file for a profile.
 *
 * Only settings the profile controls are written; everything else keeps
 * Hatari's defaults. The file is meant to be passed with --configfile, so the
 * user's own Hatari configuration is never touched.
 */
export function toHatariCfg(p: Profile): string {
  const gemdos = text(p.drives.gemdos);
  const tosPath = text(p.tosPath);

  // TT-RAM only exists on TT and Falcon. Hatari needs 32-bit addressing to use it:
  // on a Falcon with 24-bit addressing it warns and leaves the TT-RAM out.
  // This is what Hatari's own UI does when TT-RAM is set.
  const ttRamKb = p.machine === 'TT' || p.machine === 'Falcon' ? (TT_RAM_KB[p.ttram] ?? 0) : 0;

  const system: Line[] = [
    ['nModelType', MODEL_CODE[p.machine] ?? 0],
    ['nCpuLevel', CPU_LEVEL[p.cpuType] ?? 0],
    ['nCpuFreq', Number(p.cpu) || 8],
    ['n_FPUType', FPU_CODE[p.fpu] ?? 0],
    ['nDSPType', p.machine === 'Falcon' && p.dsp ? DSP_FULL : DSP_NONE],
    ['bAddressSpace24', ttRamKb === 0],
    ['bBlitter', p.blitter],
    ['bPatchTimerD', p.timerD],
  ];

  const rom: Line[] = tosPath ? [['szTosImageFileName', tosPath]] : [];

  return [
    ...render('Log', [['bConfirmQuit', false]]),
    ...render('Screen', [
      ['bFullScreen', p.fullscreen],
      ['nMonitorType', MONITOR_CODE[p.monitor] ?? 1],
      ['bAllowOverscan', p.borders],                 // "show borders"
      ['nZoomFactor', p.doublePixels ? '2.0' : '1.0'],
      ['bAspectCorrect', p.aspectRatio],
    ]),
    ...render('Sound', [
      ['bEnableSound', p.sound],
      ['nPlaybackFreq', Number(p.soundFreq) || 44100],
    ]),
    ...render('Memory', [
      ['nMemorySize', ST_RAM_KB[p.ram] ?? 1024],
      ['nTTRamSize', ttRamKb],
    ]),
    ...render('Floppy', [
      ['EnableDriveA', true],
      ['EnableDriveB', true],
      ...(p.floppyA ? [['szDiskAFileName', p.floppyA] as Line] : []),
      ...(p.floppyB ? [['szDiskBFileName', p.floppyB] as Line] : []),
    ]),
    ...render('HardDisk', [
      ['bBootFromHardDisk', p.bootFromHd],
      ['bUseHardDiskDirectory', gemdos !== ''],
      ...(gemdos ? [['szHardDiskDirectory', gemdos] as Line] : []),
    ]),
    ...render('ACSI', deviceLines(p.drives.acsi, 8)),
    ...render('SCSI', deviceLines(p.drives.scsi, 8)),
    ...render('IDE', deviceLines(p.drives.ide, 2)),
    ...render('ROM', rom),
    ...render('System', system),
  ].join('\n');
}

// ── Parsing (importing an existing Hatari .cfg) ──────────────────────────────

type Sections = Map<string, Map<string, string>>;

function readSections(input: string): Sections {
  const sections: Sections = new Map();
  let current = '';
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const header = /^\[(.+)]$/.exec(line);
    if (header) {
      current = header[1];
      if (!sections.has(current)) sections.set(current, new Map());
      continue;
    }
    const eq = line.indexOf('=');
    if (eq === -1 || !current) continue;
    sections.get(current)!.set(line.slice(0, eq).trim(), line.slice(eq + 1).trim());
  }
  return sections;
}

function invert<K extends string, V extends number>(table: Record<K, V>): Map<number, K> {
  return new Map((Object.entries(table) as [K, V][]).map(([k, v]) => [v, k]));
}

const num = (v: string | undefined): number | undefined => {
  if (v === undefined || v === '') return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
};
const bool = (v: string | undefined): boolean | undefined =>
  v === undefined || v === '' ? undefined : /^(true|1|yes)$/i.test(v);

function nearest<K extends string>(table: Record<K, number>, kb: number | undefined): K | undefined {
  if (kb === undefined) return undefined;
  // Hatari also accepts RAM sizes in whole MB (0 = 512 KB); normalise first.
  const value = kb === 0 ? 512 : kb <= 14 ? kb * 1024 : kb;
  const entries = Object.entries(table) as [K, number][];
  return entries.find(([, v]) => v === value)?.[0];
}

/**
 * Read a Hatari .cfg into profile fields. Only values that are present and
 * recognised are returned, so the result can be spread over a default profile.
 */
export function parseHatariCfg(input: string): Partial<Profile> {
  const s = readSections(input);
  const get = (section: string, key: string) => s.get(section)?.get(key);
  const out: Partial<Profile> = {};

  const model = invert(MODEL_CODE).get(num(get('System', 'nModelType')) ?? -1);
  if (model) out.machine = model;
  const level = invert(CPU_LEVEL).get(num(get('System', 'nCpuLevel')) ?? -1);
  if (level) out.cpuType = level;
  const freq = num(get('System', 'nCpuFreq'));
  if (freq === 8 || freq === 16 || freq === 32) out.cpu = String(freq) as Profile['cpu'];
  const fpu = invert(FPU_CODE).get(num(get('System', 'n_FPUType')) ?? -1);
  if (fpu) out.fpu = fpu;
  const dsp = num(get('System', 'nDSPType'));
  if (dsp !== undefined) out.dsp = dsp !== DSP_NONE;
  const blitter = bool(get('System', 'bBlitter'));
  if (blitter !== undefined) out.blitter = blitter;
  const timerD = bool(get('System', 'bPatchTimerD'));
  if (timerD !== undefined) out.timerD = timerD;

  const ram = nearest(ST_RAM_KB, num(get('Memory', 'nMemorySize')));
  if (ram) out.ram = ram;
  const ttKb = num(get('Memory', 'nTTRamSize'));
  const tt = ttKb === undefined ? undefined : (Object.entries(TT_RAM_KB).find(([, v]) => v === ttKb)?.[0] as TtRamSize | undefined);
  if (tt) out.ttram = tt;

  const monitor = invert(MONITOR_CODE).get(num(get('Screen', 'nMonitorType')) ?? -1);
  if (monitor) out.monitor = monitor;
  const fullscreen = bool(get('Screen', 'bFullScreen'));
  if (fullscreen !== undefined) out.fullscreen = fullscreen;
  const borders = bool(get('Screen', 'bAllowOverscan'));
  if (borders !== undefined) out.borders = borders;
  const aspect = bool(get('Screen', 'bAspectCorrect'));
  if (aspect !== undefined) out.aspectRatio = aspect;
  const zoom = Number.parseFloat(get('Screen', 'nZoomFactor') ?? '');
  if (Number.isFinite(zoom)) out.doublePixels = zoom >= 2;

  const sound = bool(get('Sound', 'bEnableSound'));
  if (sound !== undefined) out.sound = sound;
  const freqHz = get('Sound', 'nPlaybackFreq');
  if (freqHz && ['6258', '11025', '12517', '22050', '25033', '44100', '48000', '50066'].includes(freqHz)) {
    out.soundFreq = freqHz as SoundFreq;
  }

  const tos = get('ROM', 'szTosImageFileName');
  if (tos) out.tosPath = tos;
  const a = get('Floppy', 'szDiskAFileName');
  if (a) out.floppyA = a;
  const b = get('Floppy', 'szDiskBFileName');
  if (b) out.floppyB = b;
  const boot = bool(get('HardDisk', 'bBootFromHardDisk'));
  if (boot !== undefined) out.bootFromHd = boot;

  const drives = (section: string, count: number) =>
    Array.from({ length: count }, (_, id) => ({ id, img: get(section, `sDeviceFile${id}`) ?? '' }))
      .filter((d, id) => d.img !== '' && bool(get(section, `bUseDevice${id}`)) !== false);
  const gemdos = bool(get('HardDisk', 'bUseHardDiskDirectory')) === false ? '' : (get('HardDisk', 'szHardDiskDirectory') ?? '');
  out.drives = { acsi: drives('ACSI', 8), scsi: drives('SCSI', 8), ide: drives('IDE', 2), gemdos };

  return out;
}
