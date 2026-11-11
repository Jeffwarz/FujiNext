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
