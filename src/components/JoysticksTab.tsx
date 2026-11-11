import { Profile, JoystickPort, JoystickMode, JOYSTICK_PORTS } from '../types/profile';

interface Props {
  profile:  Profile;
  onChange: (p: Profile) => void;
}

const MODES: { id: JoystickMode; label: string; hint: string }[] = [
  { id: 'off',      label: 'Off',                hint: 'Nothing connected' },
  { id: 'real',     label: 'Game controller',    hint: 'A joystick or gamepad plugged into this computer' },
  { id: 'keyboard', label: 'Keyboard',           hint: "Cursor keys and Hatari's default fire key" },
];

export default function JoysticksTab({ profile: p, onChange }: Props) {
  function update(port: number, patch: Partial<JoystickPort>) {
    onChange({ ...p, joysticks: p.joysticks.map((j, i) => (i === port ? { ...j, ...patch } : j)) });
  }

  return (
    <div className="tab-inner">
      <div className="section-label">Joysticks</div>
      <div className="field-hint" style={{ marginBottom: 10 }}>
        Choose what is plugged into each port. Most games use ST joystick 1; a few use port 0.
        Keyboard keys follow Hatari's defaults.
      </div>

      {JOYSTICK_PORTS.map((port, i) => {
        const j = p.joysticks[i];
        const unavailable = port.notSt && p.machine === 'ST';
        return (
          <div key={port.name} className="card" style={unavailable ? { opacity: 0.55 } : undefined}>
            <div className="field-row">
              <span className="field-label">{port.name}</span>
              <div className="cpu-grid" style={{ flex: 1 }}>
                {MODES.map(m => (
                  <div
                    key={m.id}
                    className={`cpu-opt ${j.mode === m.id ? 'sel' : ''}`}
                    title={m.hint}
                    onClick={() => update(i, { mode: m.id })}
                  >
                    <div className="cpu-opt-name">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="field-hint">
              {port.note}{unavailable ? ' — the plain ST has no joypad ports, so this will have no effect.' : ''}
            </div>

            {j.mode !== 'off' && (
              <>
                {j.mode === 'real' && (
                  <div className="field-row">
                    <span className="field-label">Controller</span>
                    <select
                      className="form-select"
                      value={j.realId}
                      onChange={e => update(i, { realId: Number(e.target.value) })}
                    >
                      {[0, 1, 2, 3].map(n => (
                        <option key={n} value={n}>Controller {n + 1}{n === 0 ? ' (first found)' : ''}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="toggle-row">
                  <span className="toggle-label">Auto-fire</span>
                  <button className={`toggle ${j.autoFire ? 'on' : 'off'}`} aria-pressed={j.autoFire}
                          onClick={() => update(i, { autoFire: !j.autoFire })} />
                </div>
                <div className="toggle-row">
                  <div>
                    <span className="toggle-label">Button 2 jumps</span>
                    <div className="toggle-note">Second fire button acts as "up"</div>
                  </div>
                  <button className={`toggle ${j.jumpOnFire2 ? 'on' : 'off'}`} aria-pressed={j.jumpOnFire2}
                          onClick={() => update(i, { jumpOnFire2: !j.jumpOnFire2 })} />
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
