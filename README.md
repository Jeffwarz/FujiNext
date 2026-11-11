# FujiNext™

A profile manager and launcher for the [Hatari](https://hatari.tuxfamily.org/) Atari ST/STE/TT/Falcon emulator.
Pick a machine, point it at your ROM and disks, press **Launch**. Runs on macOS and Windows.

Download the latest installers from the [Releases page](https://github.com/Jeffwarz/FujiNext/releases).

FujiNext is only a front end: it never changes how Hatari itself works. It writes a Hatari
config file for the selected profile and starts Hatari with `--configfile`, so your own Hatari
configuration is left alone.

## Using it

1. Install Hatari (macOS: `brew install hatari` or the app bundle; Windows: the official installer).
2. Open **Settings**. FujiNext looks for Hatari in the usual places; browse to it if it isn't found.
3. Point it at a folder of TOS ROMs (EmuTOS works with every machine and needs no extra file).
4. Pick one of the starter profiles or make your own, then **Launch**.

Profiles and settings are saved as JSON in the app's data folder.

## Releasing

In GitHub, open **Actions → Release → Run workflow**, type a version such as `v1.0.0` and run it.
The macOS and Windows installers are attached to a draft release; check it, then press **Publish release**.

## Development

```bash
npm install
npm run tauri dev      # run the desktop app
npm test               # config generator tests
npx tsc --noEmit       # type-check
npm run tauri build    # installers for the current platform
```

Needs Node 22+, Rust (stable) and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

## How it is put together

| Part | Where | Notes |
|---|---|---|
| UI | `src/components/` | React |
| Profile model | `src/types/profile.ts` | |
| Hatari config generator and importer | `src/hatari/config.ts` | The only place that knows Hatari's config format |
| Launching, detection, storage | `src-tauri/src/` | `platform.rs` has the OS-specific parts and its own unit tests |

### Keeping the config correct

Hatari silently ignores config keys it doesn't recognise, so a typo would just mean a setting
that doesn't work. To prevent that, `src/hatari/hatariKeys.json` is a snapshot of Hatari's real
keys and their types, extracted from its source, and the tests check every key and value the
generator writes against it.

When you move to a newer Hatari, refresh the snapshot and re-run the tests:

```bash
git clone https://github.com/hatari/hatari /tmp/hatari
python3 -I tools/extract-hatari-keys.py /tmp/hatari > src/hatari/hatariKeys.json
npm test
```

## Legal

FujiNext is released under the [MIT License](LICENSE). Copyright (c) 2025 Jeff Warz. FujiNext™ is a trademark of Jeff Warz.

FujiNext™ is an independent open source project and is not affiliated with, endorsed by, or
associated with the Hatari development team or its contributors. Hatari is a separate open source
Atari emulator developed independently. FujiNext™ is also not affiliated with or endorsed by any
current or former holders of the Atari name or intellectual property. All Atari machine names are
referenced for descriptive and compatibility purposes only.
