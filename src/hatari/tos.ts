// Turning a profile's TOS choice into the ROM file Hatari is told to load.
//
// A profile stores a version label ("TOS 4.04") and, if the user clicked a ROM
// under "Detected on disk" or browsed for one, an explicit file path. A label
// alone means nothing to Hatari: without a file it uses its own default, which
// is usually its bundled EmuTOS (or, if there is none, "Cannot load TOS file").
// So the label has to be matched to a real file in the user's ROMs folder.

import type { Profile, DetectedRom } from '../types/profile';

export type TosSource =
  | 'chosen'        // the user picked a specific file
  | 'matched'       // a file in the ROMs folder matching the chosen version
  | 'emutos-file'   // an EmuTOS file from the ROMs folder
  | 'default';      // nothing found: Hatari's own default applies

export interface TosResolution {
  path: string;
  source: TosSource;
  /** Something the user should know about; empty when all went as chosen. */
  note: string;
}

/** Older profiles say "EmuTOS 1.2"; the version really depends on the file. */
export function isEmuTosLabel(label: string): boolean {
  return /^emutos/i.test(label.trim());
}

export function normalizeTosLabel(label: string): string {
  return isEmuTosLabel(label) ? 'EmuTOS' : label;
}

export function resolveTos(profile: Profile, roms: DetectedRom[]): TosResolution {
  const chosen = profile.tosPath.trim();
  if (chosen) return { path: chosen, source: 'chosen', note: '' };

  const emuTos = roms.find(r => r.tosVersion === 'EmuTOS');

  if (isEmuTosLabel(profile.tos)) {
    return emuTos
      ? { path: emuTos.path, source: 'emutos-file', note: '' }
      : { path: '', source: 'default', note: "No EmuTOS file in your ROMs folder, so Hatari's own built-in EmuTOS was used." };
  }

  // Prefer a ROM made for this machine; otherwise any file of that version
  // (for example TOS 2.06 is one ROM used by several machines).
  const sameVersion = roms.filter(r => r.tosVersion === profile.tos);
  const match = sameVersion.find(r => r.machine === profile.machine) ?? sameVersion[0];
  if (match) return { path: match.path, source: 'matched', note: '' };

  const fallback = emuTos
    ? `EmuTOS (${emuTos.filename})`
    : "Hatari's own built-in EmuTOS";
  return {
    path: emuTos?.path ?? '',
    source: emuTos ? 'emutos-file' : 'default',
    note: `${profile.tos} was not found in your ROMs folder, so ${fallback} was used. ` +
          'Choose a ROM under "Detected on disk" to pick a specific file.',
  };
}

// ── Telling the user what will happen ────────────────────────────────────────

export interface RomContext {
  /** The ROMs folder from Settings ('' if not set). */
  romsFolder: string;
  /** Why scanning that folder failed ('' if it did not). */
  scanError: string;
}

export interface TosStatus {
  /** True when the ROM is the one the user asked for. */
  ok: boolean;
  text: string;
}

const fileName = (path: string): string => path.split(/[\\/]/).pop() || path;

/** One plain sentence on which ROM will load, and if not the chosen one, why. */
export function describeTos(profile: Profile, roms: DetectedRom[], ctx: RomContext): TosStatus {
  const r = resolveTos(profile, roms);

  if (r.source === 'chosen') return { ok: true, text: `Will load ${fileName(r.path)}.` };
  if (r.source === 'matched') return { ok: true, text: `Will load ${fileName(r.path)} (${profile.tos}).` };
  if (r.source === 'emutos-file' && r.note === '') return { ok: true, text: `Will load the EmuTOS file ${fileName(r.path)}.` };
  if (isEmuTosLabel(profile.tos)) return { ok: true, text: "Will use Hatari's built-in EmuTOS." };

  let why: string;
  if (ctx.scanError) {
    why = `FujiNext couldn't read your ROMs folder (${ctx.scanError}).`;
  } else if (!ctx.romsFolder.trim()) {
    why = 'No ROMs folder is set. Choose one in Settings so FujiNext can find your TOS files.';
  } else if (roms.length === 0) {
    why = `No TOS ROM files were found in ${ctx.romsFolder}.`;
  } else {
    const seen = roms.map(x => `${x.filename}${x.tosVersion ? ` is ${x.tosVersion}` : ' is not recognised'}`).join('; ');
    why = `${profile.tos} is not among the ROM files in your folder (${seen}).`;
  }
  const outcome = r.path
    ? `Hatari will use EmuTOS (${fileName(r.path)}) instead.`
    : "Hatari will use its own built-in EmuTOS, or fail to start if it has none.";
  return { ok: false, text: `${why} ${outcome}` };
}
