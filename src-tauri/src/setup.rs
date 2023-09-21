use tauri::{App, Manager};
// macOS 平台上用于定义窗口外观特性的枚举类型
use window_vibrancy::{self, NSVisualEffectMaterial, NSVisualEffectState};

/// tauri setup
pub fn init(app: &mut App) -> std::result::Result<(), Box<dyn std::error::Error>> {
    let win = app.get_window("main").unwrap(); // 获取应用程序中名为main的窗口对象

    // 如果是在macOS下，则额外设置外观
    #[cfg(target_os = "macos")]
    window_vibrancy::apply_vibrancy(&win, NSVisualEffectMaterial::FullScreenUI, Some(NSVisualEffectState::Active), None)
        .expect("Unsupported platform! 'apply_vibrancy' is only supported on macOS");

    Ok(())
}
