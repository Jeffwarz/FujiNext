// Turning an existing Hatari .cfg file into a FujiNext profile.

import { parseHatariCfg } from './config';
import { normalizeProfile, TOS_ROMS } from '../types/profile';
import type { Profile } from '../types/profile';

export interface CfgImport {
  profile: Profile | null;
  /** One plain sentence for the user: what was imported, or why nothing was. */
  message: string;
}

/** "C:\Users\me\hatari.cfg" or "/home/me/Old setup.cfg" → "Old setup" */
export function nameFromPath(path: string): string {
  const file = path.split(/[\\/]/).pop() ?? '';
  return file.replace(/\.cfg$/i, '').trim() || 'Imported profile';
}

export function importHatariCfg(text: string, path: string, id: number): CfgImport {
  // A Hatari config always has [Section] headers and key = value lines.
  if (!/^\s*\[[^\]]+\]/m.test(text) || !/=/.test(text)) {
    return { profile: null, message: `${nameFromPath(path)} doesn't look like a Hatari config file, so nothing was imported.` };
  }
  const parsed = parseHatariCfg(text);
  const recognised = parsed.machine !== undefined || parsed.ram !== undefined || parsed.cpuType !== undefined;
  if (!recognised) {
    return { profile: null, message: `No machine settings were found in ${nameFromPath(path)}, so nothing was imported.` };
  }

  // Without a ROM file the profile needs a sensible version label for its machine.
  const machine = parsed.machine ?? 'ST';
  const tos = TOS_ROMS.find(t => t.machines.includes(machine))?.ver;
  const name = nameFromPath(path);
  const profile = normalizeProfile({ ...parsed, ...(tos ? { tos } : {}), id, name, notes: `Imported from ${name}.cfg`, last: 'never', createdAt: id });
  const romNote = parsed.tosPath ? '' : ' It has no TOS file set, so one is chosen from your ROMs folder.';
  return { profile, message: `Imported "${name}" as a ${machine} profile.${romNote}` };
}
