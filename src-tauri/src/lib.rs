use std::{fs, path::Path};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;
use url::Url;

#[tauri::command]
async fn export_csv(app: AppHandle, file_name: String, content: String) -> Result<(), String> {
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
    let validated = validate_external_url(&url)?;
    app.opener()
        .open_url(validated.as_str(), None::<&str>)
        .map_err(|e| format!("Failed to open URL: {e}"))
}

#[tauri::command]
fn log_update_failure(app: AppHandle, error: String) -> Result<(), String> {
    use tauri::Manager;
    let log_dir = app.path().app_log_dir().map_err(|e| e.to_string())?;
    write_update_failure_log(&log_dir, &error)
}

fn write_update_failure_log(log_dir: &Path, error: &str) -> Result<(), String> {
    use std::io::Write;
    fs::create_dir_all(log_dir).map_err(|e| e.to_string())?;
    let log_path = log_dir.join("updater_errors.log");
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|e| e.to_string())?;
    
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    writeln!(file, "[timestamp={}] Update check failed: {}", now, error).map_err(|e| e.to_string())?;
    Ok(())
}

/// Validates a URL against the allowlist of permitted external domains.
/// Returns the canonical URL string if valid, or an error message if not.
fn validate_external_url(raw: &str) -> Result<String, String> {
    let parsed = Url::parse(raw).map_err(|_| "Invalid URL".to_string())?;

    if parsed.scheme() != "https" {
        return Err("Only HTTPS URLs are allowed".to_string());
    }

    const ALLOWED_HOSTS: &[&str] = &["www.dropbox.com", "docs.google.com"];

    let host = parsed.host_str().ok_or("URL must have a host")?;

    if !ALLOWED_HOSTS.contains(&host) {
        return Err(format!("Domain '{host}' is not allowed"));
    }

    Ok(parsed.to_string())
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
        .invoke_handler(tauri::generate_handler![export_csv, open_external_url, log_update_failure])
        .run(tauri::generate_context!())
        .expect("failed to run Curiosity Coding Interface");
}

#[cfg(test)]
mod tests {
    use super::{sanitize_export_name, validate_external_url, write_csv_file, write_update_failure_log};
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
    fn writes_update_failure_log_to_file() {
        let temp_dir = std::env::temp_dir().join(format!(
            "curiosity-coding-log-{}",
            unique_test_suffix()
        ));
        
        write_update_failure_log(&temp_dir, "Connection timed out")
            .expect("should write log successfully");

        let log_file = temp_dir.join("updater_errors.log");
        assert!(log_file.exists());
        let content = read_to_string(&log_file).unwrap();
        assert!(content.contains("Update check failed: Connection timed out"));
        assert!(content.contains("timestamp="));

        let _ = fs::remove_dir_all(temp_dir);
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

    // ── URL validation tests ───────────────────────────────────────────

    #[test]
    fn allows_dropbox_https_url() {
        assert!(validate_external_url("https://www.dropbox.com/some/rubric").is_ok());
    }

    #[test]
    fn allows_google_docs_https_url() {
        assert!(validate_external_url("https://docs.google.com/document/d/abc123").is_ok());
    }

    #[test]
    fn rejects_http_url() {
        let err = validate_external_url("http://www.dropbox.com/rubric")
            .expect_err("HTTP should be rejected");
        assert!(err.contains("HTTPS"));
    }

    #[test]
    fn rejects_non_allowlisted_domain() {
        let err = validate_external_url("https://evil.example.com/payload")
            .expect_err("non-allowlisted domain should be rejected");
        assert!(err.contains("evil.example.com"));
    }

    #[test]
    fn rejects_malformed_url() {
        assert!(validate_external_url("not a url").is_err());
    }

    #[test]
    fn rejects_javascript_scheme() {
        let err = validate_external_url("javascript:alert(1)")
            .expect_err("javascript scheme should be rejected");
        assert!(err.contains("HTTPS") || err.contains("Invalid"));
    }

    #[test]
    fn rejects_file_scheme() {
        let err = validate_external_url("file:///C:/secrets.txt")
            .expect_err("file scheme should be rejected");
        assert!(err.contains("HTTPS") || err.contains("Invalid"));
    }

    // ── Updater config test ────────────────────────────────────────────

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
