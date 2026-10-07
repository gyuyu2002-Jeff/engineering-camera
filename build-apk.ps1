param(
  [switch]$SkipExtraction = $false
)

$ErrorActionPreference = "Stop"

Write-Host "=== 開始建置工程萬用相機 APK ===" -ForegroundColor Cyan

$zipPath = "$env:TEMP\msjdk17.zip"
$targetJdkBase = "$env:LOCALAPPDATA\Programs\jdk-17"

if (-not $SkipExtraction -and (Test-Path $zipPath)) {
  Write-Host "正在解壓縮 JDK 17..." -ForegroundColor Yellow
  if (-not (Test-Path $targetJdkBase)) {
    New-Item -ItemType Directory -Force -Path $targetJdkBase | Out-Null
  }
  tar.exe -xf $zipPath -C $targetJdkBase
}

# 尋找解壓後的 JDK 目錄
$foundJdk = Get-ChildItem $targetJdkBase -Directory | Where-Object { Test-Path (Join-Path $_.FullName "bin\javac.exe") } | Select-Object -First 1

if ($foundJdk) {
  $env:JAVA_HOME = $foundJdk.FullName
  $env:Path = "$($foundJdk.FullName)\bin;$env:Path"
  Write-Host "JAVA_HOME 設定為: $env:JAVA_HOME" -ForegroundColor Green
} else {
  Write-Host "警告: 找不到 javac.exe，嘗試檢查既有 JAVA_HOME" -ForegroundColor Red
}

$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
Write-Host "ANDROID_HOME 設定為: $env:ANDROID_HOME" -ForegroundColor Green

# 確保 Android 授權目錄存在
$licenseDir = "$env:ANDROID_HOME\licenses"
if (-not (Test-Path $licenseDir)) {
  New-Item -ItemType Directory -Force -Path $licenseDir | Out-Null
}
# 寫入預設接受的 Android SDK 授權雜湊
Set-Content -Path "$licenseDir\android-sdk-license" -Value "24333f8a63b1d79f0094324e12ac20c055c04056`n8473980fb720215f66d355f3ff7d1f4244e7de88`nd56f5187479451eabf01fb78af6dfcb131a6481e"

Write-Host "同步前端資源到 Android 專案..." -ForegroundColor Yellow
npx cap sync android

# 確保 Java 相容性設為 17
$capBuildGradle = "android\app\capacitor.build.gradle"
if (Test-Path $capBuildGradle) {
  (Get-Content $capBuildGradle) -replace 'VERSION_21', 'VERSION_17' | Set-Content $capBuildGradle
}
$nodeCapGradle = "node_modules\@capacitor\android\capacitor\build.gradle"
if (Test-Path $nodeCapGradle) {
  (Get-Content $nodeCapGradle) -replace 'VERSION_21', 'VERSION_17' | Set-Content $nodeCapGradle
}

# 確保使用高速 Gradle 映像鏡像
$wrapperProps = "android\gradle\wrapper\gradle-wrapper.properties"
(Get-Content $wrapperProps) -replace 'services\.gradle\.org', 'mirrors.cloud.tencent.com' -replace '-all\.zip', '-bin.zip' | Set-Content $wrapperProps

# 確保非 ASCII 路徑檢查允許
$gradleProps = "android\gradle.properties"
if ((Get-Content $gradleProps) -notmatch "android\.overridePathCheck") {
  Add-Content $gradleProps "`nandroid.overridePathCheck=true"
}

Write-Host "執行 Gradle 組譯 APK (assembleDebug)..." -ForegroundColor Yellow
$rootDir = (Get-Item $PSScriptRoot).FullName
Set-Location (Join-Path $rootDir "android")

cmd.exe /c "gradlew.bat assembleDebug"

Set-Location $rootDir

$outputApk = Join-Path $rootDir "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $outputApk) {
  $finalApk = Join-Path $rootDir "工程萬用相機.apk"
  $finalEng = Join-Path $rootDir "EngineeringCamera.apk"
  Copy-Item $outputApk $finalApk -Force
  Copy-Item $outputApk $finalEng -Force
  Copy-Item $outputApk (Join-Path $rootDir "public\工程萬用相機.apk") -Force
  Copy-Item $outputApk (Join-Path $rootDir "dist\工程萬用相機.apk") -Force
  $dlPath = "$env:USERPROFILE\Downloads\工程萬用相機.apk"
  if (Test-Path "$env:USERPROFILE\Downloads") {
    Copy-Item $outputApk $dlPath -Force
    Write-Host "已同步複製至下載夾: $dlPath" -ForegroundColor Cyan
  }
  Write-Host "========================================" -ForegroundColor Green
  Write-Host "🎉 成功產出 APK: $finalApk" -ForegroundColor Green
  Write-Host "========================================" -ForegroundColor Green
} else {
  Write-Host "找不到輸出的 APK 檔案: $outputApk" -ForegroundColor Red
}
