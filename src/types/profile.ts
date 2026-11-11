export type MachineType = 'ST' | 'STE' | 'MegaSTE' | 'TT' | 'Falcon';

export type CpuSpeed = '8' | '16' | '32';

export type CpuType = '68000' | '68010' | '68020' | '68030' | '68040' | '68060';

export type FpuType = 'none' | '68881' | '68882' | 'internal';

export type StRamSize =
  | '512K' | '1M' | '2M' | '4M'
  | '8M'  | '10M' | '14M';

export type TtRamSize =
  | 'None'   | '4 MiB'  | '8 MiB'   | '16 MiB'
  | '32 MiB' | '64 MiB' | '128 MiB' | '256 MiB'
  | '512 MiB' | '1024 MiB';

export type MonitorType = 'Colour' | 'Mono' | 'VGA' | 'TV';

export type SoundFreq =
  | '11025' | '22050' | '44100' | '48000'
  | '6258'  | '12517' | '25033' | '50066';

export interface DriveEntry {
  id: number;
  img: string;
}

export interface DriveConfig {
  acsi:   DriveEntry[];
  scsi:   DriveEntry[];
  ide:    DriveEntry[];
  gemdos: string;
}

export type JoystickMode = 'off' | 'real' | 'keyboard';

export interface JoystickPort {
  mode:        JoystickMode;
  realId:      number;     // which connected game controller (0 = first)
  autoFire:    boolean;
  jumpOnFire2: boolean;    // second button acts as "up"
}

/** Hatari's six joystick ports, in its own order. */
export const JOYSTICK_PORTS: { name: string; note: string; stOnly?: boolean; notSt?: boolean }[] = [
  { name: 'ST joystick 0',         note: 'Port 0 (usually the mouse port)', },
  { name: 'ST joystick 1',         note: 'Port 1, the main joystick port', },
  { name: 'STE joypad A',          note: 'Extra STE/Falcon joypad port', notSt: true },
  { name: 'STE joypad B',          note: 'Extra STE/Falcon joypad port', notSt: true },
  { name: 'Parallel port stick 1', note: 'Via a parallel-port adapter', },
  { name: 'Parallel port stick 2', note: 'Via a parallel-port adapter', },
];

export interface PrinterConfig { enabled: boolean; file: string }
export interface Rs232Config   { enabled: boolean; inFile: string; outFile: string }
export interface MidiConfig    { enabled: boolean; inFile: string; outFile: string }

export interface Profile {
  id:        number;
  name:      string;
  notes:     string;
  machine:   MachineType;
  cpu:       CpuSpeed;
  cpuType:   CpuType;
  fpu:       FpuType;
  ram:       StRamSize;
  ttram:     TtRamSize;
  tos:       string;
  tosPath:   string;       // custom ROM path override
  monitor:   MonitorType;
  floppyA:   string;
  floppyB:   string;
  drives:    DriveConfig;
  bootFromHd: boolean;
  // features
  blitter:   boolean;
  rtc:       boolean;
  dsp:       boolean;
  timerD:    boolean;
  // display
  fullscreen:   boolean;
  borders:      boolean;
  doublePixels: boolean;
  aspectRatio:  boolean;
  // sound
  sound:      boolean;
  soundFreq:  SoundFreq;
  // joysticks and devices
  joysticks:  JoystickPort[];   // always 6, in Hatari's order
  printer:    PrinterConfig;
  rs232:      Rs232Config;
  midi:       MidiConfig;
  // meta
  last:       string;
  createdAt:  number;
}

export interface AppSettings {
  hatariPath:     string;   // path to hatari binary
  romsFolder:     string;   // folder scanned for TOS ROMs
  floppyFolder:   string;   // default floppy image folder
  theme:          'dark' | 'light';
}

export interface DetectedRom {
  path:       string;
  filename:   string;
  tosVersion: string | null;
  machine:    string | null;
  size:       number;
}

// Per-machine ST RAM options with real-hardware flag
export interface RamOption {
  v:     StRamSize;
  label: string;
  real:  boolean;           // true = valid on real hardware
}

export const RAM_OPTIONS: Record<MachineType, RamOption[]> = {
  ST: [
    { v: '512K', label: '512 KB', real: true  },
    { v: '1M',   label: '1 MiB',  real: true  },
    { v: '2M',   label: '2 MiB',  real: true  },
    { v: '4M',   label: '4 MiB',  real: true  },
    { v: '8M',   label: '8 MiB',  real: false },
    { v: '10M',  label: '10 MiB', real: false },
    { v: '14M',  label: '14 MiB', real: false },
  ],
  STE: [
    { v: '512K', label: '512 KB', real: true  },
    { v: '1M',   label: '1 MiB',  real: true  },
    { v: '2M',   label: '2 MiB',  real: true  },
    { v: '4M',   label: '4 MiB',  real: true  },
    { v: '8M',   label: '8 MiB',  real: false },
    { v: '10M',  label: '10 MiB', real: false },
    { v: '14M',  label: '14 MiB', real: false },
  ],
  MegaSTE: [
    { v: '1M',  label: '1 MiB',  real: true  },
    { v: '2M',  label: '2 MiB',  real: true  },
    { v: '4M',  label: '4 MiB',  real: true  },
    { v: '8M',  label: '8 MiB',  real: true  },
    { v: '10M', label: '10 MiB', real: true  },
    { v: '14M', label: '14 MiB', real: false },
  ],
  TT: [
    { v: '1M',  label: '1 MiB',  real: true  },
    { v: '2M',  label: '2 MiB',  real: true  },
    { v: '4M',  label: '4 MiB',  real: true  },
    { v: '8M',  label: '8 MiB',  real: true  },
    { v: '10M', label: '10 MiB', real: true  },
    { v: '14M', label: '14 MiB', real: false },
  ],
  Falcon: [
    { v: '1M',  label: '1 MiB',  real: true },
    { v: '4M',  label: '4 MiB',  real: true },
    { v: '8M',  label: '8 MiB',  real: true },
    { v: '10M', label: '10 MiB', real: true },
    { v: '14M', label: '14 MiB', real: true },
  ],
};

export interface CpuTypeOption {
  id:      CpuType;
  name:    string;
  desc:    string;
  realFor: MachineType[];
}

export const CPU_TYPE_OPTIONS: CpuTypeOption[] = [
  { id: '68000', name: '68000', desc: 'Base 16-bit chip',          realFor: ['ST', 'STE', 'MegaSTE'] },
  { id: '68010', name: '68010', desc: 'Loop-mode enhancements',     realFor: [] },
  { id: '68020', name: '68020', desc: '32-bit + inst. cache',       realFor: [] },
  { id: '68030', name: '68030', desc: '32-bit + MMU',               realFor: ['TT', 'Falcon'] },
  { id: '68040', name: '68040', desc: 'Built-in FPU & MMU',         realFor: [] },
  { id: '68060', name: '68060', desc: 'High-performance 68k',       realFor: [] },
];

export interface FpuOption {
  id:   FpuType;
  name: string;
  desc: string;
}

export const FPU_OPTIONS: FpuOption[] = [
  { id: 'none',     name: 'None',     desc: 'No FPU' },
  { id: '68881',    name: '68881',    desc: 'External FPU coprocessor' },
  { id: '68882',    name: '68882',    desc: 'External FPU (enhanced)' },
  { id: 'internal', name: 'Internal', desc: 'Built-in (040/060 only)' },
];

export const CPU_OPTIONS: Record<MachineType, { id: CpuSpeed; name: string; desc: string }[]> = {
  ST:      [{ id: '8',  name: '8 MHz',  desc: '68000 — stock speed'          },
            { id: '16', name: '16 MHz', desc: '68000 — overclocked'           }],
  STE:     [{ id: '8',  name: '8 MHz',  desc: '68000 — stock speed'          },
            { id: '16', name: '16 MHz', desc: '68000 — overclocked'           }],
  MegaSTE: [{ id: '8',  name: '8 MHz',  desc: '68000 — compatibility mode'   },
            { id: '16', name: '16 MHz', desc: '68000 — stock with 16KB cache' }],
  TT:      [{ id: '32', name: '32 MHz', desc: '68030 — stock TT speed'       },
            { id: '16', name: '16 MHz', desc: '68030 — reduced speed'         }],
  Falcon:  [{ id: '16', name: '16 MHz', desc: '68030 — stock Falcon speed'   },
            { id: '32', name: '32 MHz', desc: '68030 — overclocked'           }],
};

export const TOS_ROMS = [
  { ver: 'TOS 1.00',    machines: ['ST'] as MachineType[],                             year: '1987', flag: '🇬🇧', note: 'Original ST ROM'                  },
  { ver: 'TOS 1.02',    machines: ['ST'] as MachineType[],                             year: '1987', flag: '🇬🇧', note: 'Rainbow TOS — bug fixes'           },
  { ver: 'TOS 1.04',    machines: ['ST', 'STE'] as MachineType[],                      year: '1989', flag: '🇬🇧', note: 'Blitter TOS — best game compat'    },
  { ver: 'TOS 1.06',    machines: ['STE'] as MachineType[],                            year: '1990', flag: '🇬🇧', note: 'STE TOS'                           },
  { ver: 'TOS 1.62',    machines: ['STE'] as MachineType[],                            year: '1991', flag: '🇬🇧', note: 'Improved STE TOS'                  },
  { ver: 'TOS 2.05',    machines: ['MegaSTE'] as MachineType[],                        year: '1991', flag: '🇬🇧', note: 'Mega STE base ROM'                 },
  { ver: 'TOS 2.06',    machines: ['ST', 'STE', 'MegaSTE'] as MachineType[],           year: '1992', flag: '🇬🇧', note: 'Final 16-bit TOS'                  },
  { ver: 'TOS 3.06',    machines: ['TT'] as MachineType[],                             year: '1992', flag: '🇬🇧', note: 'TT TOS — required'                 },
  { ver: 'TOS 4.04',    machines: ['Falcon'] as MachineType[],                         year: '1993', flag: '🇬🇧', note: 'Falcon TOS — recommended'          },
  { ver: 'EmuTOS',      machines: ['ST','STE','MegaSTE','TT','Falcon'] as MachineType[], year: 'free', flag: '🆓', note: 'Open source — all machines. Version depends on your Hatari or ROM file' },
];

export const TTRAM_OPTIONS: TtRamSize[] = [
  'None', '4 MiB', '8 MiB', '16 MiB', '32 MiB',
  '64 MiB', '128 MiB', '256 MiB', '512 MiB', '1024 MiB',
];

export const HW_MAX_RAM: Record<MachineType, StRamSize> = {
  ST:      '4M',
  STE:     '4M',
  MegaSTE: '10M',
  TT:      '10M',
  Falcon:  '14M',
};

export const HW_MAX_LABEL: Record<MachineType, string> = {
  ST:      '4 MiB',
  STE:     '4 MiB',
  MegaSTE: '10 MiB',
  TT:      '10 MiB',
  Falcon:  '14 MiB',
};

export const RAM_ORDER: StRamSize[] = ['512K','1M','2M','4M','8M','10M','14M'];

export function isExtendedRam(machine: MachineType, ram: StRamSize): boolean {
  return RAM_ORDER.indexOf(ram) > RAM_ORDER.indexOf(HW_MAX_RAM[machine]);
}

export function makeDefaultProfile(id: number): Profile {
  return {
    id,
    name:         'New system',
    notes:        '',
    machine:      'ST',
    cpu:          '8',
    cpuType:      '68000',
    fpu:          'none',
    ram:          '512K',
    ttram:        'None',
    tos:          'TOS 1.04',
    tosPath:      '',
    monitor:      'Colour',
    floppyA:      '',
    floppyB:      '',
    drives: { acsi: [], scsi: [], ide: [], gemdos: '' },
    bootFromHd:   false,
    blitter:      false,
    rtc:          false,
    dsp:          false,
    timerD:       true,
    fullscreen:   false,
    borders:      true,
    doublePixels: true,
    aspectRatio:  true,
    sound:        true,
    soundFreq:    '44100',
    joysticks:    defaultJoysticks(),
    printer:      { enabled: false, file: '' },
    rs232:        { enabled: false, inFile: '', outFile: '' },
    midi:         { enabled: false, inFile: '', outFile: '' },
    last:         'never',
    createdAt:    Date.now(),
  };
}

export function defaultJoysticks(): JoystickPort[] {
  return Array.from({ length: 6 }, (_, i) => ({
    mode: i === 1 ? 'real' as JoystickMode : 'off' as JoystickMode,
    realId: 0, autoFire: false, jumpOnFire2: i !== 1,
  }));
}

/** Fill in anything a profile saved by an older version does not have. */
export function normalizeProfile(saved: Partial<Profile>): Profile {
  const base = makeDefaultProfile(saved.id ?? Date.now());
  const joysticks = base.joysticks.map((d, i) => ({ ...d, ...(saved.joysticks?.[i] ?? {}) }));
  return {
    ...base, ...saved, joysticks,
    printer: { ...base.printer, ...saved.printer },
    rs232:   { ...base.rs232,   ...saved.rs232 },
    midi:    { ...base.midi,    ...saved.midi },
  };
}