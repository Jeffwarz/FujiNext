use std::path::PathBuf;
use std::process::Command;
use tauri::Manager;

use crate::platform;

// ── Launch Hatari ─────────────────────────────────────────────────────────────

/// Write the profile's config into FujiNext's own data folder and start Hatari
/// with `--configfile`, so the user's real Hatari configuration is never touched.
///
/// The config text is built by the frontend (src/hatari/config.ts), which is
/// the one place that knows Hatari's config format.
#[tauri::command]
pub fn launch_hatari(
    hatari_path: String,
    profile_id: u64,
    config_content: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let config_dir = app.path().app_data_dir()
        .map_err(|e| format!("Cannot find app data dir: {e}"))?
        .join("configs");

    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Failed to create config dir: {e}"))?;

    let config_path = config_dir.join(format!("profile-{profile_id}.cfg"));
    std::fs::write(&config_path, config_content)
        .map_err(|e| format!("Failed to write Hatari config to {:?}: {e}", config_path))?;

    let selected = if hatari_path.trim().is_empty() {
        platform::detect()
    } else {
        Some(PathBuf::from(hatari_path.trim()))
    };

    let selected = selected.ok_or_else(|| {
        "Hatari not found. Please set the Hatari path in Settings.".to_string()
    })?;

    // Accepts either the program itself or a macOS Hatari.app bundle.
    let hatari = platform::resolve_executable(&selected);
    if !hatari.is_file() {
        return Err(format!(
            "Hatari not found at {}. Check the path in Settings.",
            hatari.display()
        ));
    }

    let mut cmd = Command::new(&hatari);
    cmd.arg("--configfile").arg(&config_path);

    // Windows builds of Hatari look for their data files next to the executable.
    #[cfg(windows)]
    {
        if let Some(dir) = hatari.parent() {
            cmd.current_dir(dir);
        }
    }

    // On macOS, clear DYLD variables that can leak in from a dev server.
    #[cfg(target_os = "macos")]
    {
        cmd.env_remove("DYLD_INSERT_LIBRARIES");
        cmd.env_remove("DYLD_LIBRARY_PATH");
        cmd.env_remove("DYLD_FRAMEWORK_PATH");
    }

    cmd.spawn()
        .map_err(|e| format!("Failed to launch Hatari ({}): {e}", hatari.display()))?;

    Ok(())
}

// ── Detect Hatari installation ────────────────────────────────────────────────

#[tauri::command]
pub fn detect_hatari() -> Option<String> {
    platform::detect().map(|p| p.to_string_lossy().to_string())
}

// ── Profile persistence ───────────────────────────────────────────────────────

#[tauri::command]
pub fn save_profiles(
    profiles: Vec<serde_json::Value>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Cannot find app data dir: {e}"))?;

    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create data dir: {e}"))?;

    let path = data_dir.join("profiles.json");
    let json = serde_json::to_string_pretty(&profiles)
        .map_err(|e| format!("Failed to serialise profiles: {e}"))?;

    std::fs::write(&path, json)
        .map_err(|e| format!("Failed to write profiles: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn load_profiles(app: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Cannot find app data dir: {e}"))?;

    let path = data_dir.join("profiles.json");

    if !path.exists() {
        return Ok(vec![]);   // first run — no saved profiles yet
    }

    let json = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read profiles: {e}"))?;

    let profiles: Vec<serde_json::Value> = serde_json::from_str(&json)
        .map_err(|e| format!("Failed to parse profiles: {e}"))?;

    Ok(profiles)
}

// ── ROM folder scanning ───────────────────────────────────────────────────────

#[derive(Debug, Clone, serde::Serialize)]
pub struct DetectedRom {
    pub path:     String,
    pub filename: String,
    #[serde(rename = "tosVersion")]
    pub tos_version: Option<String>,
    pub machine:  Option<String>,
    pub size:     u64,
}

#[tauri::command]
pub fn scan_rom_folder(folder: String) -> Result<Vec<DetectedRom>, String> {
    if folder.is_empty() {
        return Ok(vec![]);
    }

    let path = std::path::Path::new(&folder);
    if !path.is_dir() {
        return Err(format!("Not a directory: {}", folder));
    }

    let mut detected = Vec::new();

    // Walk folder looking for ROM-ish files
    let entries = std::fs::read_dir(path)
        .map_err(|e| format!("Cannot read folder: {e}"))?;

    for entry in entries.flatten() {
        let entry_path = entry.path();
        if !entry_path.is_file() {
            continue;
        }

        let filename = entry_path.file_name()
            .and_then(|n| n.to_str())
            .map(|s| s.to_string())
            .unwrap_or_default();

        let ext_lower = entry_path.extension()
            .and_then(|e| e.to_str())
            .map(|s| s.to_lowercase())
            .unwrap_or_default();

        // Only consider likely ROM extensions
        if !matches!(ext_lower.as_str(), "img" | "rom" | "bin") {
            continue;
        }

        // File size check — real TOS ROMs are 192KB, 256KB, 512KB or 1024KB
        let metadata = std::fs::metadata(&entry_path)
            .map_err(|e| format!("Cannot stat {filename}: {e}"))?;
        let size = metadata.len();

        if !matches!(size, 196608 | 262144 | 524288 | 1048576) {
            continue;
        }

        // Prefer what the file itself says; guess from its name only if that fails.
        let (tos_version, machine) = identify_rom_file(&entry_path)
            .unwrap_or_else(|| detect_tos_from_filename(&filename));

        detected.push(DetectedRom {
            path:        entry_path.to_string_lossy().to_string(),
            filename,
            tos_version,
            machine,
            size,
        });
    }

    // Sort by filename
    detected.sort_by(|a, b| a.filename.cmp(&b.filename));

    Ok(detected)
}

/// Best-effort filename-based TOS detection.
/// Returns (tos_version, machine_type) where possible.
/// Read the start of a ROM file and identify it from its header (see rom.rs).
fn identify_rom_file(path: &std::path::Path) -> Option<(Option<String>, Option<String>)> {
    use std::io::Read;
    let mut header = [0u8; crate::rom::HEADER_LEN];
    std::fs::File::open(path).ok()?.read_exact(&mut header).ok()?;
    let info = crate::rom::identify(&header)?;
    Some((Some(info.tos_version), info.machine.map(|m| m.to_string())))
}

fn detect_tos_from_filename(filename: &str) -> (Option<String>, Option<String>) {
    let lower = filename.to_lowercase();

    // EmuTOS
    if lower.contains("emutos") || lower.starts_with("etos") {
        return (Some("EmuTOS".to_string()), None);
    }

    // Standard TOS version detection — match "tos" + version number
    let ver_patterns: &[(&str, &str, &str)] = &[
        // (pattern to match, TOS version, machine)
        ("tos 1.00",  "TOS 1.00", "ST"),
        ("tos100",    "TOS 1.00", "ST"),
        ("tos 1.02",  "TOS 1.02", "ST"),
        ("tos102",    "TOS 1.02", "ST"),
        ("tos 1.04",  "TOS 1.04", "ST"),
        ("tos104",    "TOS 1.04", "ST"),
        ("tos 1.06",  "TOS 1.06", "STE"),
        ("tos106",    "TOS 1.06", "STE"),
        ("tos 1.62",  "TOS 1.62", "STE"),
        ("tos162",    "TOS 1.62", "STE"),
        ("tos 2.05",  "TOS 2.05", "MegaSTE"),
        ("tos205",    "TOS 2.05", "MegaSTE"),
        ("tos 2.06",  "TOS 2.06", "MegaSTE"),
        ("tos206",    "TOS 2.06", "MegaSTE"),
        ("tos 3.06",  "TOS 3.06", "TT"),
        ("tos306",    "TOS 3.06", "TT"),
        ("tos 4.04",  "TOS 4.04", "Falcon"),
        ("tos404",    "TOS 4.04", "Falcon"),
        ("tos 4.02",  "TOS 4.02", "Falcon"),
        ("tos402",    "TOS 4.02", "Falcon"),
    ];

    for (pattern, ver, machine) in ver_patterns {
        if lower.contains(pattern) {
            return (Some(ver.to_string()), Some(machine.to_string()));
        }
    }

    // No match
    (None, None)
}

// ── Settings persistence ──────────────────────────────────────────────────────

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AppSettings {
    #[serde(rename = "hatariPath")]
    pub hatari_path:   String,
    #[serde(rename = "romsFolder")]
    pub roms_folder:   String,
    #[serde(rename = "floppyFolder")]
    pub floppy_folder: String,
    pub theme:         String,
}

#[tauri::command]
pub fn save_settings(
    settings: AppSettings,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Cannot find app data dir: {e}"))?;

    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create data dir: {e}"))?;

    let path = data_dir.join("settings.json");
    let json = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialise settings: {e}"))?;

    std::fs::write(&path, json)
        .map_err(|e| format!("Failed to write settings: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn load_settings(app: tauri::AppHandle) -> Result<Option<AppSettings>, String> {
    let data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Cannot find app data dir: {e}"))?;

    let path = data_dir.join("settings.json");

    if !path.exists() {
        return Ok(None);
    }

    let json = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read settings: {e}"))?;

    let settings: AppSettings = serde_json::from_str(&json)
        .map_err(|e| format!("Failed to parse settings: {e}"))?;

    Ok(Some(settings))
}

// ── File / folder pickers ─────────────────────────────────────────────────────
// These are now handled directly by @tauri-apps/plugin-dialog on the frontend.
// Rust-side pick_file / pick_folder commands are no longer needed.