import { describe, it, expect } from 'vitest';
import hatariKeys from './hatariKeys.json';
import { toHatariCfg, parseHatariCfg } from './config';
import { DEMO_PROFILES } from '../demoProfiles';
import { makeDefaultProfile, RAM_ORDER, TTRAM_OPTIONS } from '../types/profile';
import type { Profile, MachineType, FpuType, MonitorType } from '../types/profile';

// Hatari's real keys and their value types, extracted from its source by
// tools/extract-hatari-keys.py.
const HATARI = hatariKeys.sections as Record<string, Record<string, string>>;

const MACHINES: MachineType[] = ['ST', 'STE', 'MegaSTE', 'TT', 'Falcon'];
const FPUS: FpuType[] = ['none', '68881', '68882', 'internal'];
const MONITORS: MonitorType[] = ['Mono', 'Colour', 'VGA', 'TV'];

/** A profile with every optional setting filled in, awkward paths included. */
function kitchenSink(machine: MachineType, i: number): Profile {
  return {
    ...makeDefaultProfile(100 + i),
    name: `sink ${machine}`,
    machine,
    cpu: machine === 'TT' ? '32' : '16',
    cpuType: machine === 'TT' || machine === 'Falcon' ? '68030' : '68000',
    fpu: FPUS[i % FPUS.length],
    ram: RAM_ORDER[i % RAM_ORDER.length],
    ttram: TTRAM_OPTIONS[(i * 3) % TTRAM_OPTIONS.length],
    monitor: MONITORS[i % MONITORS.length],
    tosPath: 'C:\\Users\\Jeff Warz\\ROMs\\tos 4.04.img',
    floppyA: '/Users/jeff/Atari Disks/game one.st',
    floppyB: 'D:\\disks\\b.msa',
    drives: {
      acsi: [{ id: 0, img: 'C:\\Atari\\hd 0.img' }],
      scsi: [{ id: 3, img: '/mnt/disks/scsi3.img' }],
      ide: [{ id: 1, img: '/mnt/disks/ide slave.img' }],
      gemdos: '/Users/jeff/Atari Drive C',
    },
    bootFromHd: true,
    blitter: true,
    dsp: true,
    timerD: false,
    fullscreen: true,
    borders: false,
    doublePixels: false,
    aspectRatio: false,
    sound: false,
    soundFreq: '50066',
  };
}

const ALL_PROFILES: Profile[] = [
  ...DEMO_PROFILES,
  makeDefaultProfile(99),
  ...MACHINES.map(kitchenSink),
  ...RAM_ORDER.map((ram, i) => ({ ...makeDefaultProfile(200 + i), ram })),
];

function entries(cfg: string): { section: string; key: string; value: string }[] {
  const out: { section: string; key: string; value: string }[] = [];
  let section = '';
  for (const line of cfg.split('\n')) {
    const header = /^\[(\w+)]$/.exec(line);
    if (header) { section = header[1]; continue; }
    const kv = /^(\w+) = (.*)$/.exec(line);
    if (kv) out.push({ section, key: kv[1], value: kv[2] });
    else if (line.trim() !== '') throw new Error(`Unparseable line in generated config: "${line}"`);
  }
  return out;
}

describe('generated config matches Hatari', () => {
  it.each(ALL_PROFILES.map(p => [p.name, p] as const))('%s: every key is a real Hatari key', (_name, profile) => {
    for (const { section, key } of entries(toHatariCfg(profile))) {
      expect(HATARI[section], `unknown section [${section}]`).toBeDefined();
      expect(HATARI[section][key], `[${section}] ${key} is not a Hatari key`).toBeDefined();
    }
  });

  it.each(ALL_PROFILES.map(p => [p.name, p] as const))('%s: every value has the right type', (_name, profile) => {
    for (const { section, key, value } of entries(toHatariCfg(profile))) {
      const type = HATARI[section][key];
      if (type === 'Int') expect(value, `[${section}] ${key}`).toMatch(/^-?\d+$/);
      if (type === 'Bool') expect(value, `[${section}] ${key}`).toMatch(/^(TRUE|FALSE)$/);
      if (type === 'Float') expect(value, `[${section}] ${key}`).toMatch(/^-?\d+(\.\d+)?$/);
    }
  });

  it('never writes the keys the first version got wrong', () => {
    const cfg = ALL_PROFILES.map(toHatariCfg).join('\n');
    for (const wrong of ['nMachineType', 'TTRamSize_KB', 'nFpuType', 'bDSPEnabled', 'bRealTimeClock',
      'bUseHardDiskDirectories', 'szHardDiskDirectories', 'bDriveAEnabled', 'bShowBorders', 'bZoomLowRes']) {
      expect(cfg).not.toContain(wrong);
    }
  });

  it('cannot be tricked into writing extra keys through a path', () => {
    const evil = { ...makeDefaultProfile(1), floppyA: 'a.st\n[System]\nnModelType = 5' };
    const written = entries(toHatariCfg(evil));
    expect(written.filter(e => e.key === 'nModelType')).toHaveLength(1);
    expect(written.find(e => e.key === 'nModelType')!.value).toBe('0');
  });
});

describe('machine settings use Hatari codes', () => {
  const value = (p: Profile, key: string) => entries(toHatariCfg(p)).find(e => e.key === key)?.value;

  it.each([['ST', '0'], ['STE', '2'], ['MegaSTE', '3'], ['TT', '4'], ['Falcon', '5']] as const)(
    '%s -> nModelType %s', (machine, code) => {
      expect(value({ ...makeDefaultProfile(1), machine }, 'nModelType')).toBe(code);
    });

  it('writes RAM in KB, ST and TT', () => {
    const p = { ...makeDefaultProfile(1), machine: 'TT' as const, ram: '4M' as const, ttram: '64 MiB' as const };
    expect(value(p, 'nMemorySize')).toBe('4096');
    expect(value(p, 'nTTRamSize')).toBe('65536');
  });

  it('turns on 32-bit addressing when a Falcon or TT has TT-RAM', () => {
    // Without it Hatari warns and leaves the TT-RAM out (seen on a Falcon Dev profile).
    for (const machine of ['Falcon', 'TT'] as const) {
      const p = { ...makeDefaultProfile(1), machine, ttram: '64 MiB' as const };
      expect(value(p, 'bAddressSpace24')).toBe('FALSE');
      expect(value(p, 'nTTRamSize')).toBe('65536');
    }
  });

  it('keeps 24-bit addressing when there is no TT-RAM', () => {
    expect(value({ ...makeDefaultProfile(1), machine: 'Falcon', ttram: 'None' }, 'bAddressSpace24')).toBe('TRUE');
  });

  it('ignores TT-RAM on machines that cannot have it', () => {
    for (const machine of ['ST', 'STE', 'MegaSTE'] as const) {
      const p = { ...makeDefaultProfile(1), machine, ttram: '64 MiB' as const };
      expect(value(p, 'nTTRamSize')).toBe('0');
      expect(value(p, 'bAddressSpace24')).toBe('TRUE');
    }
  });

  it('keeps the 68060 level and FPU codes', () => {
    const p = { ...makeDefaultProfile(1), cpuType: '68060' as const, fpu: 'internal' as const };
    expect(value(p, 'nCpuLevel')).toBe('5');
    expect(value(p, 'n_FPUType')).toBe('68040');
  });

  it('only enables the DSP on a Falcon', () => {
    expect(value({ ...makeDefaultProfile(1), machine: 'Falcon', dsp: true }, 'nDSPType')).toBe('2');
    expect(value({ ...makeDefaultProfile(1), machine: 'TT', dsp: true }, 'nDSPType')).toBe('0');
  });

  it('mounts a GEMDOS folder only when one is set', () => {
    const none = entries(toHatariCfg(makeDefaultProfile(1)));
    expect(none.find(e => e.key === 'bUseHardDiskDirectory')!.value).toBe('FALSE');
    expect(none.find(e => e.key === 'szHardDiskDirectory')).toBeUndefined();
    const set = { ...makeDefaultProfile(1), drives: { acsi: [], scsi: [], ide: [], gemdos: '/x y' } };
    expect(value(set, 'bUseHardDiskDirectory')).toBe('TRUE');
    expect(value(set, 'szHardDiskDirectory')).toBe('/x y');
  });
});

describe('parseHatariCfg', () => {
  const roundTripped = (p: Profile) => parseHatariCfg(toHatariCfg(p));

  it.each(ALL_PROFILES.map(p => [p.name, p] as const))('%s survives a round trip', (_name, p) => {
    const back = roundTripped(p);
    expect(back).toMatchObject({
      machine: p.machine, cpuType: p.cpuType, cpu: p.cpu, fpu: p.fpu,
      ram: p.ram, monitor: p.monitor,
      // TT-RAM is only written for TT and Falcon
      ttram: p.machine === 'TT' || p.machine === 'Falcon' ? p.ttram : 'None',
      fullscreen: p.fullscreen, borders: p.borders, aspectRatio: p.aspectRatio, doublePixels: p.doublePixels,
      sound: p.sound, soundFreq: p.soundFreq,
      blitter: p.blitter, timerD: p.timerD, bootFromHd: p.bootFromHd,
    });
    expect(back.drives).toEqual({
      acsi: p.drives.acsi, scsi: p.drives.scsi, ide: p.drives.ide, gemdos: p.drives.gemdos,
    });
    if (p.tosPath) expect(back.tosPath).toBe(p.tosPath);
    if (p.floppyA) expect(back.floppyA).toBe(p.floppyA);
  });

  it('keeps 512 KB instead of rounding it up to 1 MB', () => {
    expect(parseHatariCfg('[Memory]\nnMemorySize = 512\n').ram).toBe('512K');
  });

  it('reads the old whole-MB RAM format Hatari still accepts', () => {
    expect(parseHatariCfg('[Memory]\nnMemorySize = 4\n').ram).toBe('4M');
    expect(parseHatariCfg('[Memory]\nnMemorySize = 0\n').ram).toBe('512K');
  });

  it('ignores comments, unknown keys and malformed lines', () => {
    const parsed = parseHatariCfg('# note\n; note\n[System]\nnModelType = 4\nbogus\nnotAKey = 1\n');
    expect(parsed.machine).toBe('TT');
  });

  it('copes with Windows line endings', () => {
    expect(parseHatariCfg('[System]\r\nnModelType = 5\r\n').machine).toBe('Falcon');
  });
});
