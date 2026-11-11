import { Profile, defaultJoysticks } from './types/profile';

// The five default demo profiles that ship with FujiNext™.
// IDs 1-5 are reserved for these and should never be used for user profiles.
export const DEMO_PROFILE_IDS = [1, 2, 3, 4, 5];

export const DEMO_PROFILES: Profile[] = [
  {
    id: 1, name: 'Gaming ST', notes: 'Max game compatibility',
    machine: 'ST', cpu: '8', cpuType: '68000', fpu: 'none', ram: '512K', ttram: 'None',
    tos: 'TOS 1.04', tosPath: '', monitor: 'Colour',
    floppyA: '', floppyB: '',
    drives: { acsi: [], scsi: [], ide: [], gemdos: '' },
    bootFromHd: false,
    blitter: false, rtc: false, dsp: false, timerD: true,
    fullscreen: false, borders: true, doublePixels: true, aspectRatio: true,
    sound: true, soundFreq: '44100', last: 'never', createdAt: 1,
    joysticks: defaultJoysticks(), printer: { enabled: false, file: '' },
    rs232: { enabled: false, inFile: '', outFile: '' }, midi: { enabled: false, inFile: '', outFile: '' },
  },
  {
    id: 2, name: 'Mega STE Office', notes: '',
    machine: 'MegaSTE', cpu: '16', cpuType: '68000', fpu: 'none', ram: '4M', ttram: 'None',
    tos: 'TOS 2.06', tosPath: '', monitor: 'Colour',
    floppyA: '', floppyB: '',
    drives: { acsi: [], scsi: [], ide: [], gemdos: '' },
    bootFromHd: false,
    blitter: true, rtc: true, dsp: false, timerD: true,
    fullscreen: false, borders: true, doublePixels: true, aspectRatio: true,
    sound: true, soundFreq: '44100', last: 'never', createdAt: 2,
    joysticks: defaultJoysticks(), printer: { enabled: false, file: '' },
    rs232: { enabled: false, inFile: '', outFile: '' }, midi: { enabled: false, inFile: '', outFile: '' },
  },
  {
    id: 3, name: 'Falcon Dev', notes: 'DSP development setup',
    machine: 'Falcon', cpu: '16', cpuType: '68030', fpu: 'none', ram: '14M', ttram: '64 MiB',
    tos: 'TOS 4.04', tosPath: '', monitor: 'VGA',
    floppyA: '', floppyB: '',
    drives: { acsi: [], scsi: [], ide: [], gemdos: '' },
    bootFromHd: false,
    blitter: false, rtc: true, dsp: true, timerD: true,
    fullscreen: false, borders: true, doublePixels: false, aspectRatio: true,
    sound: true, soundFreq: '44100', last: 'never', createdAt: 3,
    joysticks: defaultJoysticks(), printer: { enabled: false, file: '' },
    rs232: { enabled: false, inFile: '', outFile: '' }, midi: { enabled: false, inFile: '', outFile: '' },
  },
  {
    id: 4, name: 'TT Max', notes: '',
    machine: 'TT', cpu: '32', cpuType: '68030', fpu: 'none', ram: '10M', ttram: '256 MiB',
    tos: 'TOS 3.06', tosPath: '', monitor: 'Mono',
    floppyA: '', floppyB: '',
    drives: { acsi: [], scsi: [], ide: [], gemdos: '' },
    bootFromHd: false,
    blitter: false, rtc: true, dsp: false, timerD: true,
    fullscreen: false, borders: false, doublePixels: false, aspectRatio: true,
    sound: false, soundFreq: '44100', last: 'never', createdAt: 4,
    joysticks: defaultJoysticks(), printer: { enabled: false, file: '' },
    rs232: { enabled: false, inFile: '', outFile: '' }, midi: { enabled: false, inFile: '', outFile: '' },
  },
  {
    id: 5, name: 'Upgraded STE', notes: 'Demos and music',
    machine: 'STE', cpu: '8', cpuType: '68000', fpu: 'none', ram: '4M', ttram: 'None',
    tos: 'TOS 1.62', tosPath: '', monitor: 'Colour',
    floppyA: '', floppyB: '',
    drives: { acsi: [], scsi: [], ide: [], gemdos: '' },
    bootFromHd: false,
    blitter: true, rtc: false, dsp: false, timerD: true,
    fullscreen: false, borders: true, doublePixels: true, aspectRatio: true,
    sound: true, soundFreq: '44100', last: 'never', createdAt: 5,
    joysticks: defaultJoysticks(), printer: { enabled: false, file: '' },
    rs232: { enabled: false, inFile: '', outFile: '' }, midi: { enabled: false, inFile: '', outFile: '' },
  },
];

/**
 * Reset demo profiles to their original state while preserving
 * any user-created or duplicated profiles.
 *
 * Rules:
 *  - Demo IDs 1-5 are restored to their default configurations.
 *  - If a demo profile was deleted, it's recreated.
 *  - Profiles with any other ID are left completely untouched.
 */
export function resetDemoProfiles(current: Profile[]): Profile[] {
  // Keep all non-demo profiles as-is
  const userProfiles = current.filter(p => !DEMO_PROFILE_IDS.includes(p.id));

  // Rebuild with fresh demo copies + all user profiles
  return [
    ...DEMO_PROFILES.map(p => ({ ...JSON.parse(JSON.stringify(p)), drives: { ...p.drives, acsi: [], scsi: [], ide: [] } })),
    ...userProfiles,
  ];
}