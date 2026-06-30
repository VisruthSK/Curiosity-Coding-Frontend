use std::{fs, path::Path};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
fn export_csv(app: AppHandle, file_name: String, content: String) -> Result<(), String> {
    let safe_name = sanitize_export_name(&file_name);
    let Some(path) = app
        .dialog()
        .file()
        .add_filter("CSV", &["csv"])
        .set_file_name(&safe_name)
        .blocking_save_file()
    else {
        return Ok(());
    };

    let path = path
        .into_path()
        .map_err(|error| format!("Could not resolve export path: {error}"))?;

    write_csv_file(&path, &content)
}

#[tauri::command]
fn open_external_url(app: AppHandle, url: String) -> Result<(), String> {
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| format!("Failed to open URL: {e}"))
}

fn sanitize_export_name(file_name: &str) -> String {
    let sanitized = file_name
        .chars()
        .map(|character| match character {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            character if character.is_control() => '_',
            character => character,
        })
        .collect::<String>()
        .trim()
        .to_string();

    if sanitized.is_empty() {
        "coded-data.csv".to_string()
    } else if sanitized.to_lowercase().ends_with(".csv") {
        sanitized
    } else {
        format!("{sanitized}.csv")
    }
}

fn write_csv_file(path: &Path, content: &str) -> Result<(), String> {
    fs::write(path, content).map_err(|error| format!("Could not write CSV: {error}"))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![export_csv, open_external_url])
        .run(tauri::generate_context!())
        .expect("failed to run Curiosity Coding Interface");
}

#[cfg(test)]
mod tests {
    use super::{sanitize_export_name, write_csv_file};
    use serde_json::Value;
    use std::{
        fs::{self, read_to_string},
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn keeps_valid_csv_export_names() {
        assert_eq!(
            sanitize_export_name("sample survey Opal.csv"),
            "sample survey Opal.csv"
        );
    }

    #[test]
    fn sanitizes_invalid_export_name_characters() {
        assert_eq!(
            sanitize_export_name("bad<>:\"/\\|?*name"),
            "bad_________name.csv"
        );
    }

    #[test]
    fn falls_back_for_blank_export_names() {
        assert_eq!(sanitize_export_name("   "), "coded-data.csv");
    }

    #[test]
    fn release_config_generates_signed_updater_metadata() {
        let config: Value = serde_json::from_str(include_str!("../tauri.conf.json"))
            .expect("tauri.conf.json should be valid JSON");

        assert_eq!(config["bundle"]["createUpdaterArtifacts"], true);
        assert_eq!(
            config["plugins"]["updater"]["endpoints"][0],
            "https://github.com/VisruthSK/Curiosity-Coding-Frontend/releases/latest/download/latest.json"
        );
        assert!(
            config["plugins"]["updater"]["pubkey"]
                .as_str()
                .is_some_and(|pubkey| !pubkey.trim().is_empty()),
            "updater pubkey must be configured for signed latest.json metadata"
        );
    }

    #[test]
    fn writes_csv_export_content_to_selected_path() {
        let path = std::env::temp_dir().join(format!(
            "curiosity-coding-export-{}.csv",
            unique_test_suffix()
        ));

        write_csv_file(&path, "Date,Label,Notes\n2026-06-01,2b,Desktop export")
            .expect("CSV export should write to the selected path");

        assert_eq!(
            read_to_string(&path).expect("CSV export file should be readable"),
            "Date,Label,Notes\n2026-06-01,2b,Desktop export"
        );

        let _ = fs::remove_file(path);
    }

    #[test]
    fn reports_csv_export_write_failures() {
        let missing_directory = std::env::temp_dir().join(format!(
            "curiosity-coding-missing-{}",
            unique_test_suffix()
        ));
        let path = missing_directory.join("export.csv");

        let error = write_csv_file(&path, "Date,Label\n2026-06-01,2b")
            .expect_err("missing parent directory should fail CSV export");

        assert!(error.starts_with("Could not write CSV:"));
    }

    fn unique_test_suffix() -> u128 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after Unix epoch")
            .as_nanos()
    }
}
