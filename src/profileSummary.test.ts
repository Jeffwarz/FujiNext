import { describe, it, expect } from 'vitest';
import { profileSpec, summaryTiles } from './profileSummary';
import { DEMO_PROFILES } from './demoProfiles';
import { makeDefaultProfile } from './types/profile';

const demo = (name: string) => DEMO_PROFILES.find(p => p.name === name)!;

describe('profileSpec', () => {
  it('describes memory and TOS in one line', () => {
    expect(profileSpec(demo('Gaming ST'))).toBe('512 KB · TOS 1.04');
    expect(profileSpec(demo('Falcon Dev'))).toBe('14 MiB + 32 MiB TT-RAM · TOS 4.04');
    expect(profileSpec(demo('Falcon Games'))).toBe('14 MiB · TOS 4.04');
  });
  it('ignores TT-RAM on machines that cannot have it', () => {
    expect(profileSpec({ ...makeDefaultProfile(1), machine: 'STE', ram: '4M', ttram: '64 MiB', tos: 'EmuTOS 1.2' })).toBe('4 MiB · EmuTOS');
  });
});

describe('summaryTiles', () => {
  it('always gives four tiles', () => {
    for (const p of DEMO_PROFILES) expect(summaryTiles(p)).toHaveLength(4);
  });
  it('shows CPU, memory and what is switched on', () => {
    const t = summaryTiles(demo('Falcon Games'));
    expect(t[0]).toMatchObject({ label: 'CPU', value: '68030', note: '16 MHz' });
    expect(t[1]).toMatchObject({ label: 'Memory', value: '14 MiB', note: 'No TT-RAM' });
    expect(t[2].value).toBe('VGA');
    expect(t[3]).toMatchObject({ value: 'DSP', note: '1 joystick' });
  });
  it('lists devices that are enabled', () => {
    const p = { ...demo('Music ST'), rs232: { enabled: true, inFile: '', outFile: '' } };
    const extras = summaryTiles(p)[3];
    expect(extras.value).toBe('MIDI');
    expect(extras.note).toContain('RS232');
  });
  it('says None when nothing extra is on', () => {
    const p = { ...makeDefaultProfile(1), joysticks: makeDefaultProfile(1).joysticks.map(j => ({ ...j, mode: 'off' as const })) };
    expect(summaryTiles(p)[3].value).toBe('None');
  });
});
