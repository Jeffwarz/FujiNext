import { describe, it, expect } from 'vitest';
import { resolveTos, isEmuTosLabel, normalizeTosLabel } from './tos';
import { makeDefaultProfile } from '../types/profile';
import type { DetectedRom, Profile } from '../types/profile';

const rom = (filename: string, tosVersion: string | null, machine: string | null): DetectedRom => ({
  path: `C:\\ROMs\\${filename}`, filename, tosVersion, machine, size: 524288,
});

const TOS404 = rom('TOS404.IMG', 'TOS 4.04', 'Falcon');
const TOS206 = rom('tos206us.img', 'TOS 2.06', 'MegaSTE');
const ETOS = rom('etos256us.img', 'EmuTOS', null);
const MYSTERY = rom('falcon.img', null, null);

const falcon = (over: Partial<Profile> = {}): Profile =>
  ({ ...makeDefaultProfile(1), machine: 'Falcon', tos: 'TOS 4.04', tosPath: '', ...over });

describe('resolveTos', () => {
  it('uses the file the user picked, whatever else is available', () => {
    const r = resolveTos(falcon({ tosPath: '/my/own/rom.img' }), [TOS404, ETOS]);
    expect(r).toEqual({ path: '/my/own/rom.img', source: 'chosen', note: '' });
  });

  it('finds the file for the chosen TOS version (the Windows Falcon case)', () => {
    const r = resolveTos(falcon(), [ETOS, TOS206, TOS404]);
    expect(r.path).toBe(TOS404.path);
    expect(r.source).toBe('matched');
    expect(r.note).toBe('');
  });

  it('matches a ROM made for another machine when it is the right version', () => {
    const st = { ...makeDefaultProfile(2), machine: 'ST' as const, tos: 'TOS 2.06' };
    expect(resolveTos(st, [TOS206]).path).toBe(TOS206.path);
  });

  it('prefers the ROM made for this machine', () => {
    const other = rom('tos404-other.img', 'TOS 4.04', 'ST');
    expect(resolveTos(falcon(), [other, TOS404]).path).toBe(TOS404.path);
  });

  it('says so when the version is missing, and falls back to an EmuTOS file', () => {
    const r = resolveTos(falcon(), [ETOS]);
    expect(r.path).toBe(ETOS.path);
    expect(r.source).toBe('emutos-file');
    expect(r.note).toContain('TOS 4.04 was not found');
    expect(r.note).toContain('etos256us.img');
  });

  it('says so when nothing at all is found (the Mac "Cannot load TOS" case)', () => {
    const r = resolveTos(falcon(), []);
    expect(r.path).toBe('');
    expect(r.source).toBe('default');
    expect(r.note).toContain('TOS 4.04 was not found');
  });

  it('does not use a ROM nobody could identify', () => {
    expect(resolveTos(falcon(), [MYSTERY]).path).toBe('');
  });

  it('uses an EmuTOS file when EmuTOS is chosen, including the old "EmuTOS 1.2" label', () => {
    for (const label of ['EmuTOS', 'EmuTOS 1.2']) {
      const r = resolveTos(falcon({ tos: label }), [TOS404, ETOS]);
      expect(r.path).toBe(ETOS.path);
      expect(r.note).toBe('');
    }
  });

  it('relies on the built-in EmuTOS when EmuTOS is chosen and no file exists', () => {
    const r = resolveTos(falcon({ tos: 'EmuTOS' }), [TOS404]);
    expect(r.path).toBe('');
    expect(r.source).toBe('default');
  });
});

describe('EmuTOS labels', () => {
  it('recognises old and new labels', () => {
    expect(isEmuTosLabel('EmuTOS 1.2')).toBe(true);
    expect(isEmuTosLabel('EmuTOS')).toBe(true);
    expect(isEmuTosLabel('TOS 4.04')).toBe(false);
    expect(normalizeTosLabel('EmuTOS 1.2')).toBe('EmuTOS');
    expect(normalizeTosLabel('TOS 1.04')).toBe('TOS 1.04');
  });
});
