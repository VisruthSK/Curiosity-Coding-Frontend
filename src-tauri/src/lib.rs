use std::fs;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

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

    fs::write(path, content).map_err(|error| format!("Could not write CSV: {error}"))
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

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![export_csv])
        .run(tauri::generate_context!())
        .expect("failed to run Curiosity Coding Webtool");
}

#[cfg(test)]
mod tests {
    use super::sanitize_export_name;
    use serde_json::Value;

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
}
