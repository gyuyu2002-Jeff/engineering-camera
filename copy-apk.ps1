[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$src = "c:\Users\gyuyu\Documents\antigravity\工程相機\android\app\build\outputs\apk\debug\app-debug.apk"
$userProfile = $env:USERPROFILE

if (Test-Path $src) {
    $dests = @(
        "c:\Users\gyuyu\Documents\antigravity\工程相機\EngineeringCamera.apk",
        "c:\Users\gyuyu\Documents\antigravity\工程相機\工程萬用相機.apk",
        "$userProfile\Downloads\工程萬用相機.apk",
        "c:\Users\gyuyu\Documents\antigravity\工程相機\dist\工程萬用相機.apk",
        "c:\Users\gyuyu\Documents\antigravity\工程相機\public\工程萬用相機.apk"
    )
    foreach ($dst in $dests) {
        $parent = Split-Path -Parent $dst
        if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        [System.IO.File]::Copy($src, $dst, $true)
        Write-Host "[OK] Copied to: $dst"
    }
} else {
    Write-Host "[ERROR] Source APK not found"
}
