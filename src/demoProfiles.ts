import { Profile, makeDefaultProfile, defaultJoysticks } from './types/profile';

// The ready-made profiles that ship with FujiNext™.
// These IDs are reserved for them; profiles you create, duplicate or import
// get other IDs and are never touched by the "restore originals" options.
export const DEMO_PROFILE_IDS = [1, 2, 3, 4, 5, 6, 7, 8];

function demo(id: number, over: Partial<Profile>): Profile {
  return { ...makeDefaultProfile(id), id, createdAt: id, last: 'never', joysticks: defaultJoysticks(), ...over };
}

export const DEMO_PROFILES: Profile[] = [
  demo(1, {
    name: 'Gaming ST', notes: 'Max game compatibility',
    machine: 'ST', ram: '512K', tos: 'TOS 1.04',
  }),
  demo(2, {
    name: 'Mega STE Office', notes: '',
    machine: 'MegaSTE', cpu: '16', ram: '4M', tos: 'TOS 2.06', blitter: true, rtc: true,
  }),
  demo(3, {
    name: 'Falcon Dev', notes: 'DSP development setup',
    machine: 'Falcon', cpu: '16', cpuType: '68030', ram: '14M', ttram: '32 MiB',
    tos: 'TOS 4.04', monitor: 'VGA', rtc: true, dsp: true, doublePixels: false,
  }),
  demo(4, {
    name: 'TT Max', notes: '',
    machine: 'TT', cpu: '32', cpuType: '68030', ram: '10M', ttram: '256 MiB',
    tos: 'TOS 3.06', monitor: 'Mono', rtc: true, borders: false, doublePixels: false, sound: false,
  }),
  demo(5, {
    name: 'Upgraded STE', notes: 'Demos and music',
    machine: 'STE', ram: '4M', tos: 'TOS 1.62', blitter: true,
  }),
  demo(6, {
    name: 'Falcon Games', notes: 'Falcon games and demos, with DSP sound',
    machine: 'Falcon', cpu: '16', cpuType: '68030', ram: '14M',
    tos: 'TOS 4.04', monitor: 'VGA', rtc: true, dsp: true, doublePixels: false,
  }),
  demo(7, {
    name: 'Music ST', notes: 'Sequencers and MIDI, on a mono monitor',
    machine: 'ST', ram: '4M', tos: 'TOS 1.04', monitor: 'Mono', doublePixels: false,
    midi: { enabled: true, inFile: '', outFile: '' },
  }),
  demo(8, {
    name: 'EmuTOS Quick Start', notes: 'Needs no TOS ROM files — good for a first try',
    machine: 'STE', ram: '4M', tos: 'EmuTOS', blitter: true,
  }),
];

const fresh = (p: Profile): Profile => JSON.parse(JSON.stringify(p));

/**
 * Restore every ready-made profile to its original setup.
 *
 *  - Ready-made IDs are put back exactly as shipped (deleted ones return).
 *  - Every other profile (created, duplicated or imported) is left untouched.
 */
export function resetDemoProfiles(current: Profile[]): Profile[] {
  const userProfiles = current.filter(p => !DEMO_PROFILE_IDS.includes(p.id));
  return [...DEMO_PROFILES.map(fresh), ...userProfiles];
}

/** Restore just one ready-made profile, in place; anything else is returned as is. */
export function restoreDemoProfile(current: Profile[], id: number): Profile[] {
  const original = DEMO_PROFILES.find(p => p.id === id);
  if (!original) return current;
  return current.some(p => p.id === id)
    ? current.map(p => (p.id === id ? fresh(original) : p))
    : [...current, fresh(original)];
}

/**
 * Add ready-made profiles that were introduced after the user's profiles were
 * saved. `seen` lists the ready-made IDs this install has already offered, so
 * one the user deleted is not brought back behind their back.
 */
export function addNewDemoProfiles(current: Profile[], seen: number[]): { profiles: Profile[]; seen: number[] } {
  const added = DEMO_PROFILES.filter(p => !seen.includes(p.id) && !current.some(c => c.id === p.id));
  return { profiles: [...current, ...added.map(fresh)], seen: [...DEMO_PROFILE_IDS] };
}
