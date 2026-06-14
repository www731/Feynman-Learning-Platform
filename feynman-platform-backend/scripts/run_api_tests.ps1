param(
    [ValidateSet("smoke", "core", "full")]
    [string]$Suite = "full",

    [ValidateSet("test", "local")]
    [string]$Environment = "test",

    [switch]$CreateVenv,
    [switch]$InstallDeps,
    [switch]$GenerateReport,
    [switch]$ServeReport,

    [string]$VenvName = ".venv-test"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$TestsPath = Join-Path $ProjectRoot "tests\test_api"
$PytestIni = Join-Path $ProjectRoot "tests\pytest.ini"
$RequirementsFile = Join-Path $ProjectRoot "tests\requirements-test.txt"
$EnvFile = Join-Path $ProjectRoot "tests\.env.test"

$VenvPath = Join-Path $ProjectRoot $VenvName
$PythonExe = Join-Path $VenvPath "Scripts\python.exe"

$AllureResults = Join-Path $ProjectRoot "allure-results"
$AllureReport = Join-Path $ProjectRoot "allure-report"

function Write-Step($message) {
    Write-Host ""
    Write-Host "==> $message" -ForegroundColor Cyan
}

function Ensure-Venv {
    if ($CreateVenv -or -not (Test-Path $PythonExe)) {
        Write-Step "Creating Python virtual environment: $VenvPath"
        py -3 -m venv $VenvPath
    }

    if (-not (Test-Path $PythonExe)) {
        throw "Python executable not found in virtual environment: $PythonExe"
    }
}

function Install-TestDependencies {
    Write-Step "Installing test dependencies"
    & $PythonExe -m pip install --upgrade pip
    & $PythonExe -m pip install -r $RequirementsFile
}

function Set-TestEnvironment {
    Write-Step "Setting test environment: $Environment"

    if ($Environment -eq "local") {
        $env:API_BASE_URL = "http://127.0.0.1:3000/api"
    }

    if (-not (Test-Path $EnvFile) -and $Environment -eq "test") {
        Write-Warning "tests\.env.test was not found. Pytest will use default values or system environment variables."
    }

    $env:PYTHONUTF8 = "1"
    $env:PYTHONIOENCODING = "utf-8"
}

function Get-MarkerExpression {
    switch ($Suite) {
        "smoke" { return "smoke" }
        "core"  { return "auth or knowledge or graph or ai or audio" }
        "full"  { return $null }
    }
}

function Run-Tests {
    Write-Step "Running test suite: $Suite"

    if (Test-Path $AllureResults) {
        Remove-Item $AllureResults -Recurse -Force
    }

    $pytestArgs = @(
        "-m", "pytest",
        $TestsPath,
        "-c", $PytestIni,
        "--alluredir=$AllureResults"
    )

    $marker = Get-MarkerExpression
    if ($null -ne $marker) {
        $pytestArgs += @("-m", $marker)
    }

    & $PythonExe @pytestArgs
}

function Generate-AllureReport {
    Write-Step "Generating Allure report"

    $allureCmd = Get-Command allure -ErrorAction SilentlyContinue
    if (-not $allureCmd) {
        throw "Allure CLI was not found. Please install Allure first."
    }

    & allure generate $AllureResults -o $AllureReport --clean
}

function Open-AllureReport {
    Write-Step "Opening Allure report"

    if (-not (Test-Path $AllureReport)) {
        throw "Allure report directory was not found: $AllureReport"
    }

    & allure open $AllureReport
}

Write-Step "Project root: $ProjectRoot"

Ensure-Venv

if ($InstallDeps) {
    Install-TestDependencies
}

Set-TestEnvironment
Run-Tests

if ($GenerateReport -or $ServeReport) {
    Generate-AllureReport
}

if ($ServeReport) {
    Open-AllureReport
}

Write-Host ""
Write-Host "Test execution completed." -ForegroundColor Green
Write-Host "Allure results directory: $AllureResults"
Write-Host "Allure report directory: $AllureReport"