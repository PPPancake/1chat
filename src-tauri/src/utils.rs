// 获取系统配置文件路径
pub fn get_app_dir_path(app_handle: tauri::AppHandle, name: String) -> String {
    // 获取文件的路径
    let mut file_path = app_handle.path_resolver().app_data_dir().unwrap();
    // 加入文件夹
    file_path.push(name);
    // 处理成系统路径的字符串格式，再转换为rust的字符串格式，正确性和一致性
    let file_path = file_path.into_os_string().into_string().unwrap();

    // 返回新的路径
    file_path
}
