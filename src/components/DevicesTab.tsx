import { Profile } from '../types/profile';
import { pickFile } from '../hooks/useFilePicker';

interface Props {
  profile:  Profile;
  onChange: (p: Profile) => void;
}

function FileRow({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="field-row">
      <span className="field-label">{label}</span>
      <input className="form-input" value={value} placeholder={placeholder}
             onChange={e => onChange(e.target.value)} />
      <button className="btn-sm" onClick={async () => {
        const path = await pickFile(label);
        if (path) onChange(path);
      }}>Browse</button>
      {value && <button className="btn-sm danger" onClick={() => onChange('')}>Clear</button>}
    </div>
  );
}

function Toggle({ label, note, value, onChange }: {
  label: string; note: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="toggle-row">
      <div>
        <span className="toggle-label">{label}</span>
        <div className="toggle-note">{note}</div>
      </div>
      <button className={`toggle ${value ? 'on' : 'off'}`} aria-pressed={value}
              onClick={() => onChange(!value)} />
    </div>
  );
}

export default function DevicesTab({ profile: p, onChange }: Props) {
  return (
    <div className="tab-inner">

      <div className="section-label">Printer</div>
      <div className="card">
        <Toggle label="Enable printer emulation" value={p.printer.enabled}
                note="Anything the Atari prints is saved to a file"
                onChange={v => onChange({ ...p, printer: { ...p.printer, enabled: v } })} />
        {p.printer.enabled && (
          <FileRow label="Print to file" value={p.printer.file}
                   placeholder="Leave blank to use Hatari's default file"
                   onChange={v => onChange({ ...p, printer: { ...p.printer, file: v } })} />
        )}
      </div>

      <div className="section-label">RS232 serial port</div>
      <div className="card">
        <Toggle label="Enable RS232 emulation" value={p.rs232.enabled}
                note="Serial port, for modems and null-modem links"
                onChange={v => onChange({ ...p, rs232: { ...p.rs232, enabled: v } })} />
        {p.rs232.enabled && (
          <>
            <FileRow label="Read input from" value={p.rs232.inFile}
                     placeholder="Leave blank to use Hatari's default"
                     onChange={v => onChange({ ...p, rs232: { ...p.rs232, inFile: v } })} />
            <FileRow label="Write output to" value={p.rs232.outFile}
                     placeholder="Leave blank to use Hatari's default"
                     onChange={v => onChange({ ...p, rs232: { ...p.rs232, outFile: v } })} />
            <div className="field-hint">
              These are device or file paths (a serial port, a named pipe, or a plain file).
              Hatari's default is a Linux/Mac device that does not exist on Windows, so set both there.
            </div>
          </>
        )}
      </div>

      <div className="section-label">MIDI</div>
      <div className="card">
        <Toggle label="Enable MIDI emulation" value={p.midi.enabled}
                note="MIDI ports, for music software and keyboards"
                onChange={v => onChange({ ...p, midi: { ...p.midi, enabled: v } })} />
        {p.midi.enabled && (
          <>
            <FileRow label="Read input from" value={p.midi.inFile}
                     placeholder="Leave blank to use Hatari's default"
                     onChange={v => onChange({ ...p, midi: { ...p.midi, inFile: v } })} />
            <FileRow label="Write output to" value={p.midi.outFile}
                     placeholder="Leave blank to use Hatari's default"
                     onChange={v => onChange({ ...p, midi: { ...p.midi, outFile: v } })} />
          </>
        )}
      </div>

    </div>
  );
}
