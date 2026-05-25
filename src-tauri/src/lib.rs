mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_deep_link::init())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![
      commands::blender::blender_is_available,
      commands::blender::blender_get_version,
      commands::blender::blender_export_project,
      commands::blender::blender_install_addon,
      commands::blender::blender_connect_live,
      commands::blender::blender_sync_scene,
      commands::sidecar::spawn_sidecar,
      commands::sidecar::stop_sidecar,
      commands::sidecar::sidecar_health,
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
