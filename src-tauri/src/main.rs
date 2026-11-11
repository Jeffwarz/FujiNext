// Prevents a console window appearing on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod platform;
mod rom;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::launch_hatari,
            commands::save_profiles,
            commands::load_profiles,
            commands::save_settings,
            commands::load_settings,
            commands::detect_hatari,
            commands::scan_rom_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running FujiNext™");
}