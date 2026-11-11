import { describe, it, expect } from 'vitest';
import { importHatariCfg, nameFromPath } from './importCfg';
import { toHatariCfg } from './config';
import { makeDefaultProfile, TOS_ROMS } from '../types/profile';

describe('importHatariCfg', () => {
  it('imports a config FujiNext wrote itself', () => {
    const src = { ...makeDefaultProfile(1), machine: 'Falcon' as const, cpuType: '68030' as const, ram: '14M' as const, tosPath: 'C:\\ROMs\\TOS404.IMG' };
    const r = importHatariCfg(toHatariCfg(src), 'C:\\Users\\me\\Falcon setup.cfg', 77);
    expect(r.profile).toMatchObject({ id: 77, name: 'Falcon setup', machine: 'Falcon', ram: '14M', tosPath: 'C:\\ROMs\\TOS404.IMG' });
    expect(r.profile!.joysticks).toHaveLength(6);
  });

  it('imports a hand-written config using whole-MB RAM and CRLF line ends', () => {
    const text = '[System]\r\nnModelType = 2\r\n[Memory]\r\nnMemorySize = 4\r\n';
    const r = importHatariCfg(text, '/home/me/ste.cfg', 5);
    expect(r.profile).toMatchObject({ machine: 'STE', ram: '4M', name: 'ste' });
    expect(TOS_ROMS.find(t => t.ver === r.profile!.tos)?.machines).toContain('STE');
    expect(r.message).toContain('no TOS file');
  });

  it('gives every imported profile a TOS label that suits its machine', () => {
    const r = importHatariCfg('[System]\nnModelType = 5\n', 'f.cfg', 1);
    expect(r.profile!.tos).toMatch(/^TOS 4|EmuTOS/);
  });

  it('refuses files that are not Hatari configs', () => {
    expect(importHatariCfg('hello world', 'notes.cfg', 1).profile).toBeNull();
    expect(importHatariCfg('[Other]\nfoo = bar\n', 'x.cfg', 1).profile).toBeNull();
    expect(importHatariCfg('', 'empty.cfg', 1).message).toContain("doesn't look like");
  });

  it('names profiles from the file name', () => {
    expect(nameFromPath('/a/b/My Game.CFG')).toBe('My Game');
    expect(nameFromPath('')).toBe('Imported profile');
  });
});
