mod commands;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_visual_editor::init())
    .plugin(tauri_plugin_deep_link::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_store::Builder::default().build())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_mcp_bridge::init())
    .invoke_handler(tauri::generate_handler![
      commands::workspace::pick_workspace_folder,
      commands::workspace::restore_workspace_scope,
      commands::workspace::get_stored_workspace_root,
      commands::workspace::clear_stored_workspace_root,
      commands::workspace::register_workspace_scope,
      commands::workspace::delete_workspace_project,
      commands::blender::blender_is_available,
      commands::blender::blender_get_version,
      commands::blender::blender_export_project,
      commands::blender::blender_install_addon,
      commands::blender::blender_connect_live,
      commands::blender::blender_sync_scene,
      commands::sidecar::spawn_sidecar,
      commands::sidecar::stop_sidecar,
      commands::sidecar::sidecar_health,
      commands::voice_design_sidecar::spawn_voice_design_sidecar,
      commands::voice_design_sidecar::stop_voice_design_sidecar,
      commands::voice_design_sidecar::voice_design_sidecar_health,
      commands::voicebox::start_voicebox_app,
      commands::voicebox::voicebox_server_health,
    ])
    .setup(|app| {
      #[cfg(desktop)]
      if cfg!(debug_assertions) {
        if let Some(main) = app.get_webview_window("main") {
          let _ = main.show();
          let _ = main.set_focus();
        }
      }
      if let Ok(Some(root)) = commands::workspace::paths::load_trusted_root(app.handle()) {
        let _ = commands::workspace::paths::allow_workspace_directory(app.handle(), &root);
      }
      #[cfg(desktop)]
      {
        app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
        app.handle().plugin(tauri_plugin_process::init())?;
      }
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
