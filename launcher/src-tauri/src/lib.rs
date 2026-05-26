use md5::{Digest, Md5};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::HashMap,
    fs::OpenOptions,
    fs::{self, File},
    io::{self, Read, Write},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    thread,
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LauncherStatus {
    app_name: String,
    version: String,
    platform: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LaunchConfig {
    install_type: String,
    install_folder_name: String,
    minecraft_version: String,
    loader_type: String,
    mod_loader_version: String,
    options_file_url: String,
    resource_pack_url: String,
    #[serde(default)]
    mods: Vec<LaunchMod>,
    #[serde(default)]
    resource_packs: Vec<LaunchMod>,
}

#[derive(Deserialize, Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct LaunchMod {
    project_id: String,
    slug: String,
    title: String,
    minecraft_version: String,
    loader: String,
    version_id: String,
    version_number: String,
    file_name: String,
    file_url: String,
    #[serde(default)]
    sha1: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LaunchProgress {
    stage: String,
    message: String,
    percent: u8,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LaunchResult {
    install_dir: String,
    launched: bool,
    message: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MaintenanceResult {
    install_dir: String,
    message: String,
}

#[derive(Deserialize)]
struct VersionManifest {
    versions: Vec<VersionEntry>,
}

#[derive(Deserialize)]
struct VersionEntry {
    id: String,
    url: String,
}

#[derive(Deserialize, Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct VersionMetadata {
    #[serde(default)]
    id: String,
    #[serde(default)]
    main_class: String,
    #[serde(default)]
    assets: String,
    #[serde(default)]
    downloads: VersionDownloads,
    #[serde(default)]
    asset_index: Option<AssetIndexRef>,
    #[serde(default)]
    libraries: Vec<Library>,
    #[serde(default)]
    arguments: Option<Arguments>,
    #[serde(default)]
    minecraft_arguments: Option<String>,
}

#[derive(Deserialize, Serialize, Clone, Default)]
struct VersionDownloads {
    #[serde(default)]
    client: DownloadEntry,
}

#[derive(Deserialize, Serialize, Clone, Default)]
struct DownloadEntry {
    #[serde(default)]
    path: String,
    #[serde(default)]
    url: String,
}

#[derive(Deserialize, Serialize, Clone, Default)]
struct AssetIndexRef {
    id: String,
    url: String,
}

#[derive(Deserialize)]
struct AssetIndex {
    objects: HashMap<String, AssetObject>,
}

#[derive(Deserialize)]
struct AssetObject {
    hash: String,
}

#[derive(Deserialize, Serialize, Clone, Default)]
struct Arguments {
    #[serde(default)]
    game: Vec<Value>,
    #[serde(default)]
    jvm: Vec<Value>,
}

#[derive(Deserialize, Serialize, Clone, Default)]
struct Library {
    #[serde(default)]
    name: String,
    #[serde(default)]
    url: String,
    #[serde(default)]
    downloads: LibraryDownloads,
    #[serde(default)]
    rules: Vec<Rule>,
}

#[derive(Deserialize, Serialize, Clone, Default)]
struct LibraryDownloads {
    #[serde(default)]
    artifact: Option<DownloadEntry>,
    #[serde(default)]
    classifiers: HashMap<String, DownloadEntry>,
}

#[derive(Deserialize, Serialize, Clone, Default)]
struct Rule {
    action: String,
    #[serde(default)]
    os: Option<RuleOs>,
}

#[derive(Deserialize, Serialize, Clone, Default)]
struct RuleOs {
    #[serde(default)]
    name: String,
    #[serde(default)]
    arch: String,
}

struct LoaderProfile {
    metadata: VersionMetadata,
    forge_install: Option<ForgeInstallProfile>,
    installer_path: Option<PathBuf>,
}

#[derive(Deserialize, Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct ForgeInstallProfile {
    #[serde(default)]
    data: HashMap<String, ForgeDataValue>,
    #[serde(default)]
    processors: Vec<ForgeProcessor>,
    #[serde(default)]
    libraries: Vec<Library>,
}

#[derive(Deserialize, Serialize, Clone, Default)]
struct ForgeDataValue {
    #[serde(default)]
    client: String,
}

#[derive(Deserialize, Serialize, Clone, Default)]
struct ForgeProcessor {
    #[serde(default)]
    sides: Vec<String>,
    #[serde(default)]
    jar: String,
    #[serde(default)]
    classpath: Vec<String>,
    #[serde(default)]
    args: Vec<String>,
    #[serde(default)]
    outputs: HashMap<String, String>,
}

#[tauri::command]
fn get_launcher_status() -> LauncherStatus {
    LauncherStatus {
        app_name: "MC Launcher".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        platform: std::env::consts::OS.to_string(),
    }
}

fn check_java_executable(cmd: &str) -> bool {
    Command::new(cmd)
        .arg("-version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

fn find_java_path() -> String {
    // 1. Look in environment variables (trust explicitly set JAVA_HOME)
    if let Ok(java_home) = std::env::var("JAVA_HOME") {
        let ext = if cfg!(windows) { "java.exe" } else { "java" };
        let path = Path::new(&java_home).join("bin").join(ext);
        if path.exists() {
            return path.to_string_lossy().to_string();
        }
    }

    #[cfg(target_os = "windows")]
    {
        // 2. Prioritize modern JDK paths
        let common_paths = vec![
            "C:\\Program Files\\Java\\jdk-21\\bin\\java.exe",
            "C:\\Program Files\\Java\\jdk-17\\bin\\java.exe",
            "C:\\Program Files\\Eclipse Foundation\\jdk-21.0.2.13-hotspot\\bin\\java.exe",
            "C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.2.13-hotspot\\bin\\java.exe",
        ];

        for path in common_paths {
            if Path::new(path).exists() {
                return path.to_string();
            }
        }

        // 3. Scan Program Files dynamically for modern JDK/JRE
        let scan_roots = vec![
            "C:\\Program Files\\Java",
            "C:\\Program Files\\Eclipse Adoptium",
            "C:\\Program Files\\Eclipse Foundation",
            "C:\\Program Files\\AdoptOpenJDK",
        ];

        for root in scan_roots {
            if let Ok(entries) = fs::read_dir(root) {
                let mut paths = Vec::new();
                for entry in entries.filter_map(Result::ok) {
                    paths.push(entry.path());
                }
                // Sort descending so jdk-21 is checked before jdk-17, which is checked before jdk-8
                paths.sort_by(|a, b| b.cmp(a));

                for path in paths {
                    let java_exe = path.join("bin").join("java.exe");
                    if java_exe.exists() {
                        let path_str = java_exe.to_string_lossy().to_string();
                        // Ignore Java 8/1.8 folders if we can
                        if !path_str.contains("jre1.8") && !path_str.contains("jdk1.8") {
                            return path_str;
                        }
                    }
                }
            }
        }

        // 4. Minecraft Launcher bundled Java (usually Java 17 or 21)
        let app_data = std::env::var("APPDATA").unwrap_or_default();
        let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_default();
        
        let mc_paths = vec![
            format!("{}\\.minecraft\\runtime\\java-runtime-delta\\windows-x64\\java-runtime-delta\\bin\\java.exe", app_data),
            format!("{}\\.minecraft\\runtime\\java-runtime-gamma\\windows-x64\\java-runtime-gamma\\bin\\java.exe", app_data),
            format!("{}\\Packages\\Microsoft.429482752F352_8wekyb3d8bbwe\\LocalCache\\Local\\runtime\\java-runtime-delta\\windows-x64\\java-runtime-delta\\bin\\java.exe", local_app_data),
            "C:\\Program Files (x86)\\Minecraft Launcher\\runtime\\java-runtime-delta\\windows-x64\\java-runtime-delta\\bin\\java.exe".to_string(),
            "C:\\Program Files (x86)\\Minecraft Launcher\\runtime\\java-runtime-gamma\\windows-x64\\java-runtime-gamma\\bin\\java.exe".to_string(),
        ];

        for path in mc_paths {
            if !path.is_empty() && Path::new(&path).exists() {
                return path;
            }
        }
    }

    // 5. Fallback to 'java' command in PATH if it works
    if check_java_executable("java") {
        return "java".to_string();
    }

    "java".to_string()
}

fn emit_progress(app: &AppHandle, stage: &str, message: &str, percent: u8) {
    let _ = app.emit(
        "launch-progress",
        LaunchProgress {
            stage: stage.to_string(),
            message: message.to_string(),
            percent,
        },
    );
}

fn resolve_remote_url(api_base_url: &str, path_or_url: &str) -> Option<String> {
    if path_or_url.trim().is_empty() {
        return None;
    }

    if path_or_url.starts_with("http://") || path_or_url.starts_with("https://") {
        return Some(path_or_url.to_string());
    }

    Some(format!(
        "{}{}",
        api_base_url.trim_end_matches('/'),
        if path_or_url.starts_with('/') {
            path_or_url.to_string()
        } else {
            format!("/{path_or_url}")
        }
    ))
}

async fn download_to(
    client: &reqwest::Client,
    url: &str,
    destination: &Path,
) -> Result<(), String> {
    if destination.exists() {
        return Ok(());
    }

    let bytes = client
        .get(url)
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?
        .bytes()
        .await
        .map_err(|error| error.to_string())?;

    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    fs::write(destination, bytes).map_err(|error| error.to_string())
}

async fn download_to_replace(
    client: &reqwest::Client,
    url: &str,
    destination: &Path,
) -> Result<(), String> {
    if destination.exists() {
        fs::remove_file(destination).map_err(|error| error.to_string())?;
    }

    download_to(client, url, destination).await
}

fn library_path_from_name(name: &str) -> Option<PathBuf> {
    let (coordinates, extension) = name
        .split_once('@')
        .map(|(coordinates, extension)| (coordinates, extension))
        .unwrap_or((name, "jar"));
    let parts: Vec<&str> = coordinates.split(':').collect();
    if parts.len() < 3 {
        return None;
    }

    let group_path = parts[0].replace('.', "/");
    let artifact = parts[1];
    let version = parts[2];
    let classifier = if parts.len() > 3 {
        format!("-{}", parts[3])
    } else {
        String::new()
    };

    Some(PathBuf::from(format!(
        "{group_path}/{artifact}/{version}/{artifact}-{version}{classifier}.{extension}"
    )))
}

fn artifact_reference_path(reference: &str) -> Option<PathBuf> {
    let trimmed = reference
        .trim()
        .trim_matches('\'')
        .trim_start_matches('[')
        .trim_end_matches(']');

    library_path_from_name(trimmed)
}

fn library_key(name: &str) -> String {
    let parts: Vec<&str> = name.split(':').collect();

    if parts.len() >= 4 {
        name.to_string()
    } else if parts.len() >= 2 {
        format!("{}:{}", parts[0], parts[1])
    } else {
        name.to_string()
    }
}

fn rules_allow(rules: &[Rule]) -> bool {
    if rules.is_empty() {
        return true;
    }

    let mut allowed = false;

    for rule in rules {
        let os_matches = rule
            .os
            .as_ref()
            .map(|os| {
                let name_matches = os.name.is_empty() || os.name == "windows";
                let arch_matches = os.arch.is_empty() || os.arch == std::env::consts::ARCH;

                name_matches && arch_matches
            })
            .unwrap_or(true);

        if os_matches {
            allowed = rule.action == "allow";
        }
    }

    allowed
}

fn native_classifier(name: &str) -> Option<&str> {
    name.split(':')
        .nth(3)
        .filter(|classifier| classifier.starts_with("natives-"))
}

fn native_classifier_matches_current_platform(classifier: &str) -> bool {
    if !classifier.starts_with("natives-windows") {
        return false;
    }

    match std::env::consts::ARCH {
        "x86" => classifier == "natives-windows" || classifier == "natives-windows-x86",
        "aarch64" => classifier == "natives-windows" || classifier == "natives-windows-arm64",
        _ => classifier == "natives-windows" || classifier == "natives-windows-x64",
    }
}

fn matching_native_classifier<'a>(
    classifiers: &'a HashMap<String, DownloadEntry>,
) -> Option<(&'a String, &'a DownloadEntry)> {
    classifiers
        .iter()
        .find(|(classifier, _)| native_classifier_matches_current_platform(classifier))
}

fn dedupe_classpath_prefer_last(entries: Vec<(String, PathBuf)>) -> Vec<PathBuf> {
    let mut seen = std::collections::HashSet::new();
    let mut deduped = Vec::new();

    for (key, path) in entries.into_iter().rev() {
        if seen.insert(key) {
            deduped.push(path);
        }
    }

    deduped.reverse();
    deduped
}

fn forge_data_path(
    reference: &str,
    libraries_dir: &Path,
    forge_data_dir: &Path,
) -> Option<PathBuf> {
    let trimmed = reference.trim().trim_matches('\'');

    if trimmed.starts_with('[') && trimmed.ends_with(']') {
        return artifact_reference_path(trimmed).map(|path| libraries_dir.join(path));
    }

    if trimmed.starts_with("/data/") {
        return Some(forge_data_dir.join(trimmed.trim_start_matches('/')));
    }

    Some(PathBuf::from(trimmed))
}

fn forge_processor_main_class(jar_path: &Path) -> Result<String, String> {
    let manifest = String::from_utf8(zip_entry_bytes(jar_path, "META-INF/MANIFEST.MF")?)
        .map_err(|error| error.to_string())?;

    manifest
        .lines()
        .find_map(|line| line.strip_prefix("Main-Class: "))
        .map(|value| value.trim().to_string())
        .ok_or_else(|| {
            format!(
                "Processor jar has no Main-Class: {}",
                jar_path.to_string_lossy()
            )
        })
}

fn forge_processor_allowed(processor: &ForgeProcessor) -> bool {
    processor.sides.is_empty() || processor.sides.iter().any(|side| side == "client")
}

fn forge_outputs_ready(processor: &ForgeProcessor, vars: &HashMap<String, String>) -> bool {
    !processor.outputs.is_empty()
        && processor
            .outputs
            .keys()
            .filter_map(|key| vars.get(key))
            .all(|path| Path::new(path).exists())
}

fn replace_forge_processor_arg(
    input: &str,
    vars: &HashMap<String, String>,
    libraries_dir: &Path,
) -> Result<String, String> {
    let mut output = input.to_string();

    for (key, value) in vars {
        output = output.replace(key, value);
    }

    let trimmed = output.trim().trim_matches('\'');
    if trimmed.starts_with('[') && trimmed.ends_with(']') {
        let relative_path = artifact_reference_path(trimmed)
            .ok_or_else(|| format!("Invalid Forge artifact reference in processor arg: {input}"))?;
        let artifact_path = libraries_dir.join(relative_path);

        if !artifact_path.exists() {
            return Err(format!(
                "Missing Forge processor input artifact: {}\nExpected file: {}",
                trimmed,
                artifact_path.to_string_lossy()
            ));
        }

        return Ok(artifact_path.to_string_lossy().to_string());
    }

    Ok(output)
}

fn run_forge_processors(
    app: &AppHandle,
    install_profile: &ForgeInstallProfile,
    installer_path: &Path,
    libraries_dir: &Path,
    forge_data_dir: &Path,
    game_dir: &Path,
    minecraft_version: &str,
    client_jar_path: &Path,
) -> Result<(), String> {
    let processor_log_path = game_dir.join("forge-processors.log");
    let mut processor_log = File::create(&processor_log_path).map_err(|error| error.to_string())?;
    writeln!(processor_log, "Forge processor debug").map_err(|error| error.to_string())?;
    writeln!(processor_log, "minecraftVersion: {minecraft_version}")
        .map_err(|error| error.to_string())?;

    extract_zip_entry(
        installer_path,
        "data/client.lzma",
        &forge_data_dir.join("data/client.lzma"),
    )?;

    let mut vars: HashMap<String, String> = HashMap::new();
    vars.insert("{SIDE}".to_string(), "client".to_string());
    vars.insert("{ROOT}".to_string(), game_dir.to_string_lossy().to_string());
    vars.insert(
        "{LIBRARY_DIR}".to_string(),
        libraries_dir.to_string_lossy().to_string(),
    );
    vars.insert(
        "{INSTALLER}".to_string(),
        installer_path.to_string_lossy().to_string(),
    );
    vars.insert(
        "{MINECRAFT_VERSION}".to_string(),
        minecraft_version.to_string(),
    );
    vars.insert(
        "{MINECRAFT_JAR}".to_string(),
        client_jar_path.to_string_lossy().to_string(),
    );

    for (key, value) in &install_profile.data {
        if value.client.is_empty() {
            continue;
        }

        if let Some(path) = forge_data_path(&value.client, libraries_dir, forge_data_dir) {
            vars.insert(format!("{{{key}}}"), path.to_string_lossy().to_string());
        }
    }

    for processor in install_profile
        .processors
        .iter()
        .filter(|processor| forge_processor_allowed(processor))
    {
        if forge_outputs_ready(processor, &vars) {
            continue;
        }

        emit_progress(app, "forge", "Preparing Forge client", 36);
        let processor_jar = artifact_reference_path(&processor.jar)
            .map(|path| libraries_dir.join(path))
            .ok_or_else(|| format!("Invalid Forge processor artifact: {}", processor.jar))?;
        let main_class = forge_processor_main_class(&processor_jar)?;
        let mut processor_classpath = vec![processor_jar];

        for coordinate in &processor.classpath {
            if let Some(path) = artifact_reference_path(coordinate) {
                processor_classpath.push(libraries_dir.join(path));
            }
        }

        let separator = if cfg!(windows) { ";" } else { ":" };
        let classpath = processor_classpath
            .iter()
            .map(|path| path.to_string_lossy().to_string())
            .collect::<Vec<String>>()
            .join(separator);
        let args = processor
            .args
            .iter()
            .map(|arg| replace_forge_processor_arg(arg, &vars, libraries_dir))
            .collect::<Result<Vec<String>, String>>()?;

        writeln!(processor_log, "---").map_err(|error| error.to_string())?;
        writeln!(processor_log, "processor: {}", processor.jar)
            .map_err(|error| error.to_string())?;
        writeln!(processor_log, "mainClass: {main_class}").map_err(|error| error.to_string())?;
        writeln!(processor_log, "args: {}", args.join(" ")).map_err(|error| error.to_string())?;

        let output = Command::new(&find_java_path())
            .arg("-cp")
            .arg(classpath)
            .arg(main_class)
            .args(args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .map_err(|error| error.to_string())?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            writeln!(processor_log, "status: {}", output.status)
                .map_err(|error| error.to_string())?;
            writeln!(processor_log, "stderr:\n{stderr}").map_err(|error| error.to_string())?;
            writeln!(processor_log, "stdout:\n{stdout}").map_err(|error| error.to_string())?;
            return Err(format!(
                "Forge processor failed. See {}\n{}\n{}",
                processor_log_path.to_string_lossy(),
                stderr.trim(),
                stdout.trim()
            ));
        }

        writeln!(processor_log, "status: ok").map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn offline_uuid(username: &str) -> String {
    let source = format!("OfflinePlayer:{username}");
    let mut bytes = Md5::digest(source.as_bytes()).to_vec();

    bytes[6] = (bytes[6] & 0x0f) | 0x30;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    format!(
        "{:02x}{:02x}{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
        bytes[0],
        bytes[1],
        bytes[2],
        bytes[3],
        bytes[4],
        bytes[5],
        bytes[6],
        bytes[7],
        bytes[8],
        bytes[9],
        bytes[10],
        bytes[11],
        bytes[12],
        bytes[13],
        bytes[14],
        bytes[15]
    )
}

fn replace_placeholders(input: &str, vars: &HashMap<&str, String>) -> String {
    let mut output = input.to_string();

    for (key, value) in vars {
        output = output.replace(&format!("${{{key}}}"), value);
    }

    output
}

fn unresolved_placeholders(args: &[String]) -> Vec<String> {
    let mut placeholders = Vec::new();

    for arg in args {
        let mut remaining = arg.as_str();

        while let Some(start) = remaining.find("${") {
            let after_start = &remaining[start + 2..];
            let Some(end) = after_start.find('}') else {
                break;
            };
            let placeholder = &remaining[start..start + end + 3];

            if !placeholders.iter().any(|item| item == placeholder) {
                placeholders.push(placeholder.to_string());
            }

            remaining = &remaining[start + end + 3..];
        }
    }

    placeholders
}

fn launch_failure_summary(log_path: &Path) -> Option<String> {
    let content = fs::read_to_string(log_path).ok()?;
    let mut exception = None;
    let mut caused_by = None;

    for line in content.lines() {
        let trimmed = line.trim();

        if trimmed.starts_with("Exception in thread") {
            exception = Some(trimmed.to_string());
        } else if trimmed.starts_with("Caused by:") {
            caused_by = Some(trimmed.to_string());
        }
    }

    caused_by.or(exception)
}

fn zip_entry_bytes(zip_path: &Path, entry_name: &str) -> Result<Vec<u8>, String> {
    let file = File::open(zip_path).map_err(|error| error.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|error| error.to_string())?;
    let mut entry = archive
        .by_name(entry_name)
        .map_err(|error| error.to_string())?;
    let mut bytes = Vec::new();
    entry
        .read_to_end(&mut bytes)
        .map_err(|error| error.to_string())?;

    Ok(bytes)
}

fn zip_entry_json<T: for<'de> Deserialize<'de>>(
    zip_path: &Path,
    entry_name: &str,
) -> Result<T, String> {
    let bytes = zip_entry_bytes(zip_path, entry_name)?;

    serde_json::from_slice(&bytes).map_err(|error| error.to_string())
}

fn extract_zip_entry(zip_path: &Path, entry_name: &str, destination: &Path) -> Result<(), String> {
    if destination.exists() {
        return Ok(());
    }

    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let bytes = zip_entry_bytes(zip_path, entry_name)?;
    fs::write(destination, bytes).map_err(|error| error.to_string())
}

fn push_arg(value: &Value, args: &mut Vec<String>, vars: &HashMap<&str, String>) {
    match value {
        Value::String(item) => args.push(replace_placeholders(item, vars)),
        Value::Object(object) => {
            let allowed = object
                .get("rules")
                .and_then(Value::as_array)
                .map(|rules| {
                    let parsed_rules: Vec<Rule> = rules
                        .iter()
                        .filter_map(|rule| serde_json::from_value(rule.clone()).ok())
                        .collect();
                    rules_allow(&parsed_rules)
                })
                .unwrap_or(true);

            if !allowed {
                return;
            }

            match object.get("value") {
                Some(Value::String(item)) => args.push(replace_placeholders(item, vars)),
                Some(Value::Array(items)) => {
                    for item in items {
                        push_arg(item, args, vars);
                    }
                }
                _ => {}
            }
        }
        _ => {}
    }
}

fn safe_folder_name(folder_name: &str) -> String {
    let sanitized: String = folder_name
        .chars()
        .map(|character| match character {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '-',
            character if character.is_control() => '-',
            character => character,
        })
        .collect();
    let trimmed = sanitized.trim().trim_matches('.');

    if trimmed.is_empty() {
        "minecraft-client".to_string()
    } else {
        trimmed.to_string()
    }
}

fn safe_file_name(file_name: &str) -> String {
    safe_managed_file_name(file_name, "mod.jar", ".jar")
}

fn safe_pack_file_name(file_name: &str) -> String {
    safe_managed_file_name(file_name, "resource-pack.zip", ".zip")
}

fn safe_managed_file_name(file_name: &str, fallback: &str, extension: &str) -> String {
    Path::new(file_name)
        .file_name()
        .and_then(|name| name.to_str())
        .map(|name| safe_folder_name(name))
        .filter(|name| name.ends_with(extension))
        .unwrap_or_else(|| fallback.to_string())
}

fn game_dir_for_config(app: &AppHandle, config: &LaunchConfig) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    let profile_folder = safe_folder_name(&config.install_folder_name);

    Ok(app_data_dir.join("game").join(profile_folder))
}

#[tauri::command]
fn open_game_folder(app: AppHandle, config: LaunchConfig) -> Result<MaintenanceResult, String> {
    let game_dir = game_dir_for_config(&app, &config)?;
    fs::create_dir_all(&game_dir).map_err(|error| error.to_string())?;

    #[cfg(target_os = "windows")]
    Command::new("explorer")
        .arg(&game_dir)
        .spawn()
        .map_err(|error| error.to_string())?;

    #[cfg(target_os = "macos")]
    Command::new("open")
        .arg(&game_dir)
        .spawn()
        .map_err(|error| error.to_string())?;

    #[cfg(all(unix, not(target_os = "macos")))]
    Command::new("xdg-open")
        .arg(&game_dir)
        .spawn()
        .map_err(|error| error.to_string())?;

    Ok(MaintenanceResult {
        install_dir: game_dir.to_string_lossy().to_string(),
        message: "Game folder opened".to_string(),
    })
}

#[tauri::command]
fn uninstall_game(app: AppHandle, config: LaunchConfig) -> Result<MaintenanceResult, String> {
    let game_dir = game_dir_for_config(&app, &config)?;

    if game_dir.exists() {
        fs::remove_dir_all(&game_dir).map_err(|error| error.to_string())?;
    }

    Ok(MaintenanceResult {
        install_dir: game_dir.to_string_lossy().to_string(),
        message: "Game files removed".to_string(),
    })
}

#[tauri::command]
fn reinstall_game(app: AppHandle, config: LaunchConfig) -> Result<MaintenanceResult, String> {
    let game_dir = game_dir_for_config(&app, &config)?;

    if game_dir.exists() {
        fs::remove_dir_all(&game_dir).map_err(|error| error.to_string())?;
    }

    Ok(MaintenanceResult {
        install_dir: game_dir.to_string_lossy().to_string(),
        message: "Game files cleared. Press Play to reinstall.".to_string(),
    })
}

fn extract_natives(jar_path: &Path, natives_dir: &Path) -> Result<(), String> {
    fs::create_dir_all(natives_dir).map_err(|error| error.to_string())?;

    let file = File::open(jar_path).map_err(|error| error.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|error| error.to_string())?;

    for index in 0..archive.len() {
        let mut file = archive.by_index(index).map_err(|error| error.to_string())?;
        let name = file.name().replace('\\', "/");

        if !name.ends_with(".dll") {
            continue;
        }

        let output_path = natives_dir.join(Path::new(&name).file_name().unwrap_or_default());
        let mut output_file = File::create(output_path).map_err(|error| error.to_string())?;
        io::copy(&mut file, &mut output_file).map_err(|error| error.to_string())?;
    }

    Ok(())
}

async fn fetch_vanilla_metadata(
    client: &reqwest::Client,
    minecraft_version: &str,
) -> Result<VersionMetadata, String> {
    let manifest = client
        .get("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json")
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?
        .json::<VersionManifest>()
        .await
        .map_err(|error| error.to_string())?;

    let version_entry = manifest
        .versions
        .iter()
        .find(|version| version.id == minecraft_version)
        .ok_or_else(|| "Selected Minecraft version was not found in Mojang manifest".to_string())?;

    client
        .get(&version_entry.url)
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?
        .json::<VersionMetadata>()
        .await
        .map_err(|error| error.to_string())
}

async fn fetch_loader_profile(
    client: &reqwest::Client,
    config: &LaunchConfig,
    installers_dir: &Path,
) -> Result<Option<LoaderProfile>, String> {
    if config.install_type != "modded" {
        return Ok(None);
    }

    let loader = config.loader_type.to_lowercase();

    if loader == "forge" {
        let forge_id = format!("{}-{}", config.minecraft_version, config.mod_loader_version);
        let installer_url = format!(
            "https://maven.minecraftforge.net/net/minecraftforge/forge/{forge_id}/forge-{forge_id}-installer.jar"
        );
        let installer_path = installers_dir.join(format!("forge-{forge_id}-installer.jar"));
        download_to(client, &installer_url, &installer_path).await?;

        let metadata = zip_entry_json::<VersionMetadata>(&installer_path, "version.json")?;
        let forge_install =
            zip_entry_json::<ForgeInstallProfile>(&installer_path, "install_profile.json")?;

        return Ok(Some(LoaderProfile {
            metadata,
            forge_install: Some(forge_install),
            installer_path: Some(installer_path),
        }));
    }

    let url = if loader == "fabric" {
        format!(
            "https://meta.fabricmc.net/v2/versions/loader/{}/{}/profile/json",
            config.minecraft_version, config.mod_loader_version
        )
    } else if loader == "quilt" {
        format!(
            "https://meta.quiltmc.org/v3/versions/loader/{}/{}/profile/json",
            config.minecraft_version, config.mod_loader_version
        )
    } else {
        return Ok(None);
    };

    let profile = client
        .get(url)
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?
        .json::<VersionMetadata>()
        .await
        .map_err(|error| error.to_string())?;

    Ok(Some(LoaderProfile {
        metadata: profile,
        forge_install: None,
        installer_path: None,
    }))
}

#[tauri::command]
async fn prepare_and_launch(
    app: AppHandle,
    config: LaunchConfig,
    api_base_url: String,
    username: String,
    ram_gb: u8,
) -> Result<LaunchResult, String> {
    let client = reqwest::Client::new();
    let game_dir = game_dir_for_config(&app, &config)?;
    let versions_dir = game_dir.join("versions");
    let libraries_dir = game_dir.join("libraries");
    let assets_dir = game_dir.join("assets");
    let installers_dir = game_dir.join("installers");
    let forge_data_dir = game_dir.join("forge-data").join(format!(
        "{}-{}",
        config.minecraft_version, config.mod_loader_version
    ));
    let natives_dir = game_dir.join("natives").join(format!(
        "{}-{}",
        config.minecraft_version, config.install_type
    ));

    fs::create_dir_all(&game_dir).map_err(|error| error.to_string())?;

    emit_progress(&app, "metadata", "Loading Minecraft metadata", 5);
    let vanilla_metadata = fetch_vanilla_metadata(&client, &config.minecraft_version).await?;
    let loader_profile = fetch_loader_profile(&client, &config, &installers_dir).await?;

    let main_class = loader_profile
        .as_ref()
        .and_then(|profile| {
            (!profile.metadata.main_class.is_empty()).then(|| profile.metadata.main_class.clone())
        })
        .unwrap_or_else(|| vanilla_metadata.main_class.clone());

    let launch_version_id = loader_profile
        .as_ref()
        .and_then(|profile| (!profile.metadata.id.is_empty()).then(|| profile.metadata.id.clone()))
        .unwrap_or_else(|| config.minecraft_version.clone());

    let mut libraries = vanilla_metadata.libraries.clone();
    let mut launch_library_names = std::collections::HashSet::new();
    for library in &vanilla_metadata.libraries {
        launch_library_names.insert(library.name.clone());
    }

    if let Some(profile) = &loader_profile {
        for library in &profile.metadata.libraries {
            launch_library_names.insert(library.name.clone());
        }
        libraries.extend(profile.metadata.libraries.clone());
        if let Some(forge_install) = &profile.forge_install {
            libraries.extend(forge_install.libraries.clone());
        }
    }
    let version_dir = versions_dir.join(&launch_version_id);
    fs::create_dir_all(&version_dir).map_err(|error| error.to_string())?;
    fs::create_dir_all(game_dir.join("resourcepacks")).map_err(|error| error.to_string())?;

    let profile_snapshot = serde_json::json!({
        "installType": config.install_type,
        "installFolderName": config.install_folder_name,
        "minecraftVersion": config.minecraft_version,
        "loaderType": config.loader_type,
        "modLoaderVersion": config.mod_loader_version,
        "optionsFileUrl": config.options_file_url,
        "resourcePackUrl": config.resource_pack_url,
        "mods": &config.mods,
        "resourcePacks": &config.resource_packs
    });
    fs::write(
        game_dir.join("launcher-profile.json"),
        serde_json::to_vec_pretty(&profile_snapshot).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())?;
    let client_jar_path = version_dir.join(format!("{}.jar", config.minecraft_version));
    let version_json_path = version_dir.join(format!("{}.json", launch_version_id));
    fs::write(
        version_json_path,
        serde_json::to_vec_pretty(
            loader_profile
                .as_ref()
                .map(|profile| &profile.metadata)
                .unwrap_or(&vanilla_metadata),
        )
        .map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())?;

    emit_progress(&app, "download", "Downloading Minecraft client", 14);
    download_to(
        &client,
        &vanilla_metadata.downloads.client.url,
        &client_jar_path,
    )
    .await?;

    emit_progress(&app, "download", "Downloading libraries", 26);
    let mut classpath_candidates: Vec<(String, PathBuf)> = Vec::new();

    for library in libraries
        .iter()
        .filter(|library| rules_allow(&library.rules))
    {
        if let Some(artifact) = &library.downloads.artifact {
            let relative_path = if artifact.path.is_empty() {
                library_path_from_name(&library.name)
            } else {
                Some(PathBuf::from(&artifact.path))
            };

            if let (Some(relative_path), false) = (relative_path, artifact.url.is_empty()) {
                let destination = libraries_dir.join(relative_path);
                download_to(&client, &artifact.url, &destination).await?;
                if let Some(classifier) = native_classifier(&library.name) {
                    if native_classifier_matches_current_platform(classifier) {
                        extract_natives(&destination, &natives_dir)?;
                    }
                } else {
                    if launch_library_names.contains(&library.name) {
                        classpath_candidates.push((library_key(&library.name), destination));
                    }
                }
            }
        } else if !library.url.is_empty() {
            if let Some(relative_path) = library_path_from_name(&library.name) {
                let destination = libraries_dir.join(&relative_path);
                let library_url = format!(
                    "{}{}",
                    library.url.trim_end_matches('/'),
                    format!("/{}", relative_path.to_string_lossy()).replace('\\', "/")
                );
                download_to(&client, &library_url, &destination).await?;
                if let Some(classifier) = native_classifier(&library.name) {
                    if native_classifier_matches_current_platform(classifier) {
                        extract_natives(&destination, &natives_dir)?;
                    }
                } else {
                    if launch_library_names.contains(&library.name) {
                        classpath_candidates.push((library_key(&library.name), destination));
                    }
                }
            }
        }

        if let Some((_, native)) = matching_native_classifier(&library.downloads.classifiers) {
            let relative_path = if native.path.is_empty() {
                library_path_from_name(&library.name)
            } else {
                Some(PathBuf::from(&native.path))
            };

            if let (Some(relative_path), false) = (relative_path, native.url.is_empty()) {
                let destination = libraries_dir.join(relative_path);
                download_to(&client, &native.url, &destination).await?;
                extract_natives(&destination, &natives_dir)?;
            }
        }
    }

    if let Some(profile) = &loader_profile {
        if let (Some(forge_install), Some(installer_path)) =
            (&profile.forge_install, &profile.installer_path)
        {
            run_forge_processors(
                &app,
                forge_install,
                installer_path,
                &libraries_dir,
                &forge_data_dir,
                &game_dir,
                &config.minecraft_version,
                &client_jar_path,
            )?;

            for library in libraries.iter().filter(|library| {
                rules_allow(&library.rules) && launch_library_names.contains(&library.name)
            }) {
                if native_classifier(&library.name).is_some() {
                    continue;
                }

                if let Some(artifact) = &library.downloads.artifact {
                    if !artifact.url.is_empty() {
                        continue;
                    }

                    let relative_path = if artifact.path.is_empty() {
                        library_path_from_name(&library.name)
                    } else {
                        Some(PathBuf::from(&artifact.path))
                    };

                    if let Some(relative_path) = relative_path {
                        let destination = libraries_dir.join(relative_path);
                        if destination.exists()
                            && !classpath_candidates
                                .iter()
                                .any(|(_, path)| path == &destination)
                        {
                            classpath_candidates.push((library_key(&library.name), destination));
                        }
                    }
                }
            }
        }
    }

    let mut classpath_entries = dedupe_classpath_prefer_last(classpath_candidates);
    classpath_entries.push(client_jar_path.clone());

    if let Some(asset_index) = &vanilla_metadata.asset_index {
        emit_progress(&app, "download", "Downloading asset index", 45);
        let asset_index_path = assets_dir
            .join("indexes")
            .join(format!("{}.json", asset_index.id));
        download_to(&client, &asset_index.url, &asset_index_path).await?;

        emit_progress(&app, "download", "Downloading game assets", 56);
        let index_json =
            fs::read_to_string(&asset_index_path).map_err(|error| error.to_string())?;
        let parsed_index: AssetIndex =
            serde_json::from_str(&index_json).map_err(|error| error.to_string())?;
        let asset_count = parsed_index.objects.len().max(1);

        for (position, asset) in parsed_index.objects.values().enumerate() {
            let prefix = &asset.hash[0..2];
            let asset_path = assets_dir.join("objects").join(prefix).join(&asset.hash);
            let asset_url = format!(
                "https://resources.download.minecraft.net/{}/{}",
                prefix, asset.hash
            );
            download_to(&client, &asset_url, &asset_path).await?;

            if position % 75 == 0 {
                let percent = 56 + ((position * 18) / asset_count) as u8;
                emit_progress(&app, "download", "Downloading game assets", percent.min(74));
            }
        }
    }

    if let Some(options_url) = resolve_remote_url(&api_base_url, &config.options_file_url) {
        emit_progress(&app, "download", "Downloading options file", 78);
        download_to_replace(&client, &options_url, &game_dir.join("options.txt")).await?;
    }

    if let Some(resource_pack_url) = resolve_remote_url(&api_base_url, &config.resource_pack_url) {
        emit_progress(&app, "download", "Downloading resource pack", 84);
        download_to_replace(
            &client,
            &resource_pack_url,
            &game_dir.join("resourcepacks").join("server-pack.zip"),
        )
        .await?;
    }

    emit_progress(&app, "download", "Syncing resource packs", 86);
    let resourcepacks_dir = game_dir.join("resourcepacks");
    let managed_packs_manifest_path = game_dir.join("launcher-managed-resourcepacks.json");
    let previous_packs: Vec<String> = fs::read_to_string(&managed_packs_manifest_path)
        .ok()
        .and_then(|data| serde_json::from_str(&data).ok())
        .unwrap_or_default();
    let mut desired_packs = Vec::new();

    for selected_pack in &config.resource_packs {
        if selected_pack.minecraft_version != config.minecraft_version {
            continue;
        }

        let file_name = safe_pack_file_name(&selected_pack.file_name);
        desired_packs.push(file_name.clone());
        if let Some(file_url) = resolve_remote_url(&api_base_url, &selected_pack.file_url) {
            download_to(&client, &file_url, &resourcepacks_dir.join(&file_name)).await?;
        }
    }

    for file_name in previous_packs {
        if desired_packs.iter().any(|desired| desired == &file_name) {
            continue;
        }

        let path = resourcepacks_dir.join(safe_pack_file_name(&file_name));
        if path.exists() {
            let _ = fs::remove_file(path);
        }
    }

    fs::write(
        managed_packs_manifest_path,
        serde_json::to_vec_pretty(&desired_packs).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())?;

    if config.install_type == "modded" {
        emit_progress(&app, "download", "Syncing selected mods", 88);
        let mods_dir = game_dir.join("mods");
        fs::create_dir_all(&mods_dir).map_err(|error| error.to_string())?;
        let managed_manifest_path = game_dir.join("launcher-managed-mods.json");
        let previous_files: Vec<String> = fs::read_to_string(&managed_manifest_path)
            .ok()
            .and_then(|data| serde_json::from_str(&data).ok())
            .unwrap_or_default();
        let mut desired_files = Vec::new();

        for selected_mod in &config.mods {
            if selected_mod.minecraft_version != config.minecraft_version
                || selected_mod.loader.to_lowercase() != config.loader_type.to_lowercase()
            {
                continue;
            }

            let file_name = safe_file_name(&selected_mod.file_name);
            desired_files.push(file_name.clone());
            if let Some(file_url) = resolve_remote_url(&api_base_url, &selected_mod.file_url) {
                download_to(&client, &file_url, &mods_dir.join(&file_name)).await?;
            }
        }

        for file_name in previous_files {
            if desired_files.iter().any(|desired| desired == &file_name) {
                continue;
            }

            let path = mods_dir.join(safe_file_name(&file_name));
            if path.exists() {
                let _ = fs::remove_file(path);
            }
        }

        fs::write(
            managed_manifest_path,
            serde_json::to_vec_pretty(&desired_files).map_err(|error| error.to_string())?,
        )
        .map_err(|error| error.to_string())?;
    }

    emit_progress(&app, "launch", "Starting Minecraft", 92);
    let asset_index_id = vanilla_metadata
        .asset_index
        .as_ref()
        .map(|asset_index| asset_index.id.clone())
        .unwrap_or_else(|| vanilla_metadata.assets.clone());
    let classpath_separator = if cfg!(windows) { ";" } else { ":" };
    let classpath = classpath_entries
        .iter()
        .map(|path| path.to_string_lossy().to_string())
        .collect::<Vec<String>>()
        .join(classpath_separator);
    let player_uuid = offline_uuid(&username);
    let game_dir_string = game_dir.to_string_lossy().to_string();
    let assets_dir_string = assets_dir.to_string_lossy().to_string();
    let admin_version = config.minecraft_version.clone();

    let mut vars: HashMap<&str, String> = HashMap::new();
    vars.insert(
        "natives_directory",
        natives_dir.to_string_lossy().to_string(),
    );
    vars.insert("launcher_name", "MC Launcher".to_string());
    vars.insert("launcher_version", env!("CARGO_PKG_VERSION").to_string());
    vars.insert("classpath", classpath.clone());
    vars.insert("classpath_separator", classpath_separator.to_string());
    vars.insert(
        "library_directory",
        libraries_dir.to_string_lossy().to_string(),
    );
    vars.insert(
        "version_name",
        client_jar_path
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or(&config.minecraft_version)
            .to_string(),
    );
    vars.insert("game_directory", game_dir_string.clone());
    vars.insert("assets_root", assets_dir_string.clone());
    vars.insert("assets_index_name", asset_index_id.clone());
    vars.insert("auth_player_name", username.clone());
    vars.insert("auth_uuid", player_uuid.clone());
    vars.insert("auth_access_token", "0".to_string());
    vars.insert("user_type", "legacy".to_string());
    vars.insert("version_type", "release".to_string());

    let memory_gb = ram_gb.clamp(1, 16);
    let mut jvm_args = vec![format!("-Xmx{memory_gb}G")];
    if let Some(arguments) = &vanilla_metadata.arguments {
        for arg in &arguments.jvm {
            push_arg(arg, &mut jvm_args, &vars);
        }
    }
    if let Some(profile) = &loader_profile {
        if let Some(arguments) = &profile.metadata.arguments {
            for arg in &arguments.jvm {
                push_arg(arg, &mut jvm_args, &vars);
            }
        }
    }

    if !jvm_args
        .iter()
        .any(|arg| arg.starts_with("-Djava.library.path="))
    {
        jvm_args.push(format!(
            "-Djava.library.path={}",
            natives_dir.to_string_lossy()
        ));
    }

    if !jvm_args
        .iter()
        .any(|arg| arg == "-cp" || arg == "-classpath")
    {
        jvm_args.push("-cp".to_string());
        jvm_args.push(classpath.clone());
    }

    let mut loader_game_args = Vec::new();
    if let Some(profile) = &loader_profile {
        if let Some(arguments) = &profile.metadata.arguments {
            for arg in &arguments.game {
                push_arg(arg, &mut loader_game_args, &vars);
            }
        }
    }

    let log_path = game_dir.join("launcher-last.log");
    let mut log_header = File::create(&log_path).map_err(|error| error.to_string())?;
    writeln!(log_header, "MC Launcher launch debug").map_err(|error| error.to_string())?;
    writeln!(log_header, "version: {admin_version}").map_err(|error| error.to_string())?;
    writeln!(log_header, "mainClass: {main_class}").map_err(|error| error.to_string())?;
    writeln!(log_header, "gameDir: {}", game_dir.to_string_lossy())
        .map_err(|error| error.to_string())?;
    writeln!(log_header, "nativesDir: {}", natives_dir.to_string_lossy())
        .map_err(|error| error.to_string())?;
    writeln!(log_header, "classpathEntries: {}", classpath_entries.len())
        .map_err(|error| error.to_string())?;
    writeln!(log_header, "classpath: {classpath}").map_err(|error| error.to_string())?;
    writeln!(log_header, "javaArgs: {}", jvm_args.join(" ")).map_err(|error| error.to_string())?;
    writeln!(log_header, "loaderGameArgs: {}", loader_game_args.join(" "))
        .map_err(|error| error.to_string())?;
    writeln!(log_header, "--- java output ---").map_err(|error| error.to_string())?;
    drop(log_header);

    let mut unresolved = unresolved_placeholders(&jvm_args);
    unresolved.extend(unresolved_placeholders(&loader_game_args));
    if !unresolved.is_empty() {
        unresolved.sort();
        unresolved.dedup();
        let message = format!(
            "Launcher generated Java arguments with unresolved placeholders: {}. See {}",
            unresolved.join(", "),
            log_path.to_string_lossy()
        );
        emit_progress(&app, "error", &message, 100);
        return Ok(LaunchResult {
            install_dir: game_dir.to_string_lossy().to_string(),
            launched: false,
            message,
        });
    }

    let stdout = OpenOptions::new()
        .append(true)
        .open(&log_path)
        .map_err(|error| error.to_string())?;
    let stderr = stdout.try_clone().map_err(|error| error.to_string())?;

    let mut child = Command::new(&find_java_path())
        .args(jvm_args)
        .arg(main_class)
        .args(loader_game_args)
        .arg("--username")
        .arg(username)
        .arg("--version")
        .arg(admin_version)
        .arg("--gameDir")
        .arg(game_dir_string)
        .arg("--assetsDir")
        .arg(assets_dir_string)
        .arg("--assetIndex")
        .arg(asset_index_id)
        .arg("--uuid")
        .arg(player_uuid)
        .arg("--accessToken")
        .arg("0")
        .arg("--userType")
        .arg("legacy")
        .arg("--versionType")
        .arg("release")
        .current_dir(&game_dir)
        .stdout(Stdio::from(stdout))
        .stderr(Stdio::from(stderr))
        .spawn()
        .map_err(|error| format!("Failed to start Java: {error}"))?;

    thread::sleep(Duration::from_secs(3));
    let launched = match child.try_wait().map_err(|error| error.to_string())? {
        Some(status) => {
            let summary = launch_failure_summary(&log_path)
                .map(|summary| format!(" Reason: {summary}."))
                .unwrap_or_default();
            let message = format!(
                "Minecraft exited immediately ({status}).{} See {}",
                summary,
                log_path.to_string_lossy()
            );
            emit_progress(&app, "error", &message, 100);
            return Ok(LaunchResult {
                install_dir: game_dir.to_string_lossy().to_string(),
                launched: false,
                message,
            });
        }
        None => true,
    };

    let message = if launched {
        "Minecraft process started"
    } else {
        "Downloaded files, but Java launch failed or Java was not found"
    };

    emit_progress(&app, "done", message, 100);

    Ok(LaunchResult {
        install_dir: game_dir.to_string_lossy().to_string(),
        launched,
        message: message.to_string(),
    })
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_launcher_status,
            open_game_folder,
            reinstall_game,
            uninstall_game,
            prepare_and_launch
        ])
        .run(tauri::generate_context!())
        .expect("error while running MC Launcher");
}
