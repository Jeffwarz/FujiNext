//! Finding and starting Hatari on macOS, Windows and Linux.
//!
//! Everything here uses only the standard library and takes its inputs as
//! parameters, so it can be unit tested without Tauri or a real Hatari install
//! (`cargo test platform`, or `rustc --test src/platform.rs`).

use std::ffi::OsStr;
use std::path::{Path, PathBuf};

/// Name of the Hatari executable on this platform.
pub fn exe_name(os: &str) -> &'static str {
    if os == "windows" { "hatari.exe" } else { "hatari" }
}

/// Places Hatari is commonly installed. `env` looks up an environment variable.
pub fn candidate_paths(os: &str, env: impl Fn(&str) -> Option<String>) -> Vec<PathBuf> {
    let mut out: Vec<PathBuf> = Vec::new();
    match os {
        "macos" => out.extend([
            "/opt/homebrew/bin/hatari",
            "/usr/local/bin/hatari",
            "/Applications/Hatari.app",
        ].map(PathBuf::from)),
        "windows" => {
            for var in ["ProgramFiles", "ProgramFiles(x86)", "ProgramW6432"] {
                if let Some(base) = env(var) {
                    out.push(PathBuf::from(base).join("Hatari").join("hatari.exe"));
                }
            }
            if let Some(base) = env("LOCALAPPDATA") {
                out.push(PathBuf::from(base).join("Programs").join("Hatari").join("hatari.exe"));
            }
        }
        _ => out.extend([
            "/usr/bin/hatari",
            "/usr/local/bin/hatari",
            "/snap/bin/hatari",
        ].map(PathBuf::from)),
    }
    out
}

/// Search a PATH-style variable for `exe`. `is_file` is injected for testing.
pub fn find_in_path(path_var: &OsStr, exe: &str, is_file: impl Fn(&Path) -> bool) -> Option<PathBuf> {
    std::env::split_paths(path_var)
        .map(|dir| dir.join(exe))
        .find(|candidate| is_file(candidate))
}

/// Locate Hatari on this machine, or `None` if it is not in a known place.
pub fn detect() -> Option<PathBuf> {
    let os = std::env::consts::OS;
    for candidate in candidate_paths(os, |name| std::env::var(name).ok()) {
        if candidate.exists() {
            return Some(resolve_executable(&candidate));
        }
    }
    let path_var = std::env::var_os("PATH")?;
    find_in_path(&path_var, exe_name(os), |p| p.is_file())
}

/// Turn what the user selected into something that can be executed.
///
/// On macOS people pick `Hatari.app`, which is a folder; the program is inside
/// it at `Contents/MacOS/`. Anything else is returned unchanged.
pub fn resolve_executable(selected: &Path) -> PathBuf {
    let is_bundle = selected
        .extension()
        .map(|e| e.eq_ignore_ascii_case("app"))
        .unwrap_or(false);
    if is_bundle && selected.is_dir() {
        let macos_dir = selected.join("Contents").join("MacOS");
        if let Ok(read) = std::fs::read_dir(&macos_dir) {
            let mut files: Vec<PathBuf> = read.flatten().map(|e| e.path()).filter(|p| p.is_file()).collect();
            files.sort();
            // Prefer a file called "hatari" in any case; otherwise the only/first file.
            if let Some(found) = files.iter().find(|p| {
                p.file_name().map(|n| n.eq_ignore_ascii_case("hatari")).unwrap_or(false)
            }) {
                return found.clone();
            }
            if let Some(first) = files.into_iter().next() {
                return first;
            }
        }
    }
    selected.to_path_buf()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("fujinext-test-{}-{}", name, std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn exe_name_is_platform_specific() {
        assert_eq!(exe_name("windows"), "hatari.exe");
        assert_eq!(exe_name("macos"), "hatari");
        assert_eq!(exe_name("linux"), "hatari");
    }

    #[test]
    fn windows_candidates_come_from_environment_not_hardcoded_drive() {
        let env = |name: &str| match name {
            "ProgramFiles" => Some(r"D:\Apps".to_string()),
            "LOCALAPPDATA" => Some(r"D:\Users\jeff\AppData\Local".to_string()),
            _ => None,
        };
        let found = candidate_paths("windows", env);
        assert!(found.contains(&PathBuf::from(r"D:\Apps").join("Hatari").join("hatari.exe")));
        assert!(found.contains(
            &PathBuf::from(r"D:\Users\jeff\AppData\Local").join("Programs").join("Hatari").join("hatari.exe")
        ));
        assert_eq!(found.len(), 2, "unset variables must be skipped, not guessed");
    }

    #[test]
    fn windows_without_environment_gives_no_candidates() {
        assert!(candidate_paths("windows", |_| None).is_empty());
    }

    #[test]
    fn macos_candidates_include_homebrew_and_app_bundle() {
        let found = candidate_paths("macos", |_| None);
        assert!(found.contains(&PathBuf::from("/opt/homebrew/bin/hatari")));
        assert!(found.contains(&PathBuf::from("/Applications/Hatari.app")));
    }

    #[test]
    fn path_search_returns_first_match_in_path_order() {
        let path_var = std::env::join_paths(["/a", "/b", "/c"]).unwrap();
        let found = find_in_path(&path_var, "hatari", |p| p.starts_with("/b") || p.starts_with("/c"));
        assert_eq!(found, Some(PathBuf::from("/b").join("hatari")));
    }

    #[test]
    fn path_search_returns_none_when_missing() {
        let path_var = std::env::join_paths(["/a", "/b"]).unwrap();
        assert_eq!(find_in_path(&path_var, "hatari", |_| false), None);
    }

    #[test]
    fn app_bundle_resolves_to_inner_binary() {
        let root = temp_dir("bundle");
        let macos = root.join("Hatari.app").join("Contents").join("MacOS");
        fs::create_dir_all(&macos).unwrap();
        fs::write(macos.join("Hatari"), b"").unwrap();
        fs::write(macos.join("helper"), b"").unwrap();
        let resolved = resolve_executable(&root.join("Hatari.app"));
        assert_eq!(resolved, macos.join("Hatari"));
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn app_bundle_with_single_differently_named_binary_still_resolves() {
        let root = temp_dir("bundle-odd");
        let macos = root.join("Thing.app").join("Contents").join("MacOS");
        fs::create_dir_all(&macos).unwrap();
        fs::write(macos.join("Atari ST"), b"").unwrap();
        assert_eq!(resolve_executable(&root.join("Thing.app")), macos.join("Atari ST"));
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn plain_executable_path_is_unchanged() {
        let p = Path::new(r"C:\Program Files\Hatari\hatari.exe");
        assert_eq!(resolve_executable(p), p.to_path_buf());
    }
}
