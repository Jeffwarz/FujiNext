import { describe, it, expect } from 'vitest';
import { DEMO_PROFILES, DEMO_PROFILE_IDS, resetDemoProfiles } from './demoProfiles';
import { makeDefaultProfile } from './types/profile';

describe('resetDemoProfiles', () => {
  const mine = { ...makeDefaultProfile(1731331200000), name: 'My Falcon', printer: { enabled: true, file: 'x.txt' } };

  it('restores the samples and leaves the user\'s own profiles untouched', () => {
    const edited = DEMO_PROFILES.map(p => ({ ...p, name: 'changed', joysticks: [] as never[] }));
    const out = resetDemoProfiles([...edited, mine]);
    expect(out.filter(p => DEMO_PROFILE_IDS.includes(p.id)).map(p => p.name)).toEqual(DEMO_PROFILES.map(p => p.name));
    expect(out.find(p => p.id === mine.id)).toEqual(mine);
    expect(out).toHaveLength(DEMO_PROFILES.length + 1);
  });

  it('brings back a deleted sample', () => {
    expect(resetDemoProfiles([mine]).map(p => p.id)).toEqual([...DEMO_PROFILE_IDS, mine.id]);
  });

  it('gives fresh copies, so editing one never changes the built-in originals', () => {
    const out = resetDemoProfiles([]);
    out[0].joysticks[1].mode = 'keyboard';
    out[0].printer.enabled = true;
    expect(DEMO_PROFILES[0].joysticks[1].mode).toBe('real');
    expect(DEMO_PROFILES[0].printer.enabled).toBe(false);
  });
});

import { restoreDemoProfile, addNewDemoProfiles } from './demoProfiles';
import { toHatariCfg } from './hatari/config';
import hatariKeys from './hatari/hatariKeys.json';

describe('ready-made profiles', () => {
  it('have unique reserved ids and sensible machines', () => {
    expect(new Set(DEMO_PROFILES.map(p => p.id)).size).toBe(DEMO_PROFILES.length);
    expect(DEMO_PROFILES.map(p => p.id)).toEqual(DEMO_PROFILE_IDS);
  });

  it('all make valid Hatari configs, and none asks for TT-RAM on a machine without it', () => {
    for (const p of DEMO_PROFILES) {
      const cfg = toHatariCfg(p);
      expect(cfg).toContain('[System]');
      for (const m of cfg.matchAll(/^\[(.+)]$/gm)) expect(Object.keys(hatariKeys.sections)).toContain(m[1]);
      if (p.machine !== 'TT' && p.machine !== 'Falcon') expect(p.ttram).toBe('None');
    }
  });

  it('the Falcon samples use a realistic TT-RAM size', () => {
    for (const p of DEMO_PROFILES.filter(p => p.machine === 'Falcon')) {
      expect(['None', '4 MiB', '8 MiB', '16 MiB', '32 MiB']).toContain(p.ttram);
    }
  });

  it('EmuTOS Quick Start needs no ROM files, and Music ST has MIDI on', () => {
    expect(DEMO_PROFILES.find(p => p.name === 'EmuTOS Quick Start')!.tos).toBe('EmuTOS');
    expect(DEMO_PROFILES.find(p => p.name === 'Music ST')!.midi.enabled).toBe(true);
  });
});

describe('restoring one profile', () => {
  const mine = { ...makeDefaultProfile(1731331200000), name: 'Mine' };
  it('puts one sample back and touches nothing else', () => {
    const edited = DEMO_PROFILES.map(p => ({ ...p, name: 'edited' }));
    const out = restoreDemoProfile([...edited, mine], 3);
    expect(out.find(p => p.id === 3)!.name).toBe('Falcon Dev');
    expect(out.filter(p => p.id !== 3)).toEqual([...edited, mine].filter(p => p.id !== 3));
  });
  it('re-adds a deleted sample, and ignores ids that are not samples', () => {
    expect(restoreDemoProfile([mine], 7).map(p => p.id)).toEqual([mine.id, 7]);
    const list = [mine];
    expect(restoreDemoProfile(list, mine.id)).toBe(list);
  });
});

describe('new samples reaching existing users', () => {
  const mine = { ...makeDefaultProfile(1731331200000), name: 'Mine' };
  const original5 = DEMO_PROFILES.filter(p => p.id <= 5);
  it('adds the new ones once, and keeps the user\'s own profiles', () => {
    const r = addNewDemoProfiles([...original5, mine], [1, 2, 3, 4, 5]);
    expect(r.profiles.map(p => p.id)).toEqual([1, 2, 3, 4, 5, mine.id, 6, 7, 8]);
    expect(r.seen).toEqual(DEMO_PROFILE_IDS);
  });
  it('does not bring back one the user deleted', () => {
    const r = addNewDemoProfiles([mine], DEMO_PROFILE_IDS);
    expect(r.profiles).toEqual([mine]);
  });
});
