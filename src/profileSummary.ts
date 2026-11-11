// Short plain-language descriptions of a profile, for the sidebar cards and the
// overview tiles. Nothing here changes what Hatari is told; it only describes it.

import { RAM_OPTIONS } from './types/profile';
import type { Profile } from './types/profile';

export const MACHINE_NAME: Record<Profile['machine'], string> = {
  ST: 'ST', STE: 'STE', MegaSTE: 'Mega STE', TT: 'TT', Falcon: 'Falcon',
};

const ramLabel = (p: Profile): string =>
  RAM_OPTIONS[p.machine].find(o => o.v === p.ram)?.label ?? p.ram;

const hasTtRam = (p: Profile): boolean =>
  (p.machine === 'TT' || p.machine === 'Falcon') && p.ttram !== 'None';

/** "14 MiB + 32 MiB TT-RAM · TOS 4.04" */
export function profileSpec(p: Profile): string {
  const ram = hasTtRam(p) ? `${ramLabel(p)} + ${p.ttram} TT-RAM` : ramLabel(p);
  const os = /^emutos/i.test(p.tos) ? 'EmuTOS' : p.tos;
  return `${ram} · ${os}`;
}

export interface Tile { label: string; value: string; note: string }

/** The four overview tiles shown above the tabs. */
export function summaryTiles(p: Profile): Tile[] {
  const extras: string[] = [];
  if (p.machine === 'Falcon' && p.dsp) extras.push('DSP');
  if (p.midi.enabled) extras.push('MIDI');
  if (p.rs232.enabled) extras.push('RS232');
  if (p.printer.enabled) extras.push('Printer');
  const sticks = p.joysticks.filter(j => j.mode !== 'off').length;
  if (sticks > 0) extras.push(sticks === 1 ? '1 joystick' : `${sticks} joysticks`);

  return [
    { label: 'CPU', value: p.cpuType.replace(/^68/, '68'), note: `${p.cpu} MHz${p.fpu === 'none' ? '' : ' · FPU'}` },
    { label: 'Memory', value: ramLabel(p), note: hasTtRam(p) ? `+ ${p.ttram} TT-RAM` : 'No TT-RAM' },
    { label: 'Monitor', value: p.monitor, note: p.fullscreen ? 'Full screen' : p.doublePixels ? 'Doubled pixels' : 'Normal size' },
    { label: 'Extras', value: extras.length ? extras[0] : 'None', note: extras.length > 1 ? extras.slice(1).join(' · ') : (extras.length ? ' ' : 'Nothing extra switched on') },
  ];
}
