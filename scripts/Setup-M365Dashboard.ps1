<#
.SYNOPSIS
  One-click setup for M365 Conditional Access Dashboard.
  Creates an Azure AD app registration with all required permissions.

.DESCRIPTION
  This script creates a multi-tenant Azure AD application registration in your MSP tenant,
  configures all required API permissions, grants admin consent, creates a client secret,
  and outputs the environment variable values ready to paste into your .env file or
  Vercel project settings.

  Run time: ~2 minutes.

.PARAMETER AppName
  Display name for the app registration. Default: "M365-CA-Dashboard"

.PARAMETER AppUrl
  The URL where your app is hosted (used for redirect URIs).
  Default: "https://m365-ca-review.vercel.app"
  For local-only use: "http://localhost:3000"

.PARAMETER SecretYears
  How many years until the client secret expires. Default: 2

.EXAMPLE
  # Basic usage — creates the app with default name and URL
  .\Setup-M365Dashboard.ps1

  # Custom name and production URL
  .\Setup-M365Dashboard.ps1 -AppName "Contoso CA Dashboard" -AppUrl "https://ca.contoso.com"

.NOTES
  Requirements:
    - PowerShell 5.1+ or PowerShell 7+
    - An Azure AD account with Global Administrator or Application Administrator role
    - Internet access to install the Microsoft.Graph module (first run only)

  One-liner install + run (PowerShell 7 / Windows PowerShell):
    irm https://raw.githubusercontent.com/cwtarbox09/m365-graph-reports/main/scripts/Setup-M365Dashboard.ps1 | iex
#>

param(
  [string] $AppName     = 'M365-CA-Dashboard',
  [string] $AppUrl      = 'https://m365-ca-review.vercel.app',
  [int]    $SecretYears = 2
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── Helpers ───────────────────────────────────────────────────────────────────
function Write-Step  { param($msg) Write-Host "  $msg" -ForegroundColor Cyan }
function Write-OK    { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "  [!!] $msg" -ForegroundColor Yellow }
function Write-Err   { param($msg) Write-Host "  [ERR] $msg" -ForegroundColor Red }

function Write-Banner {
  Write-Host ""
  Write-Host "  ┌────────────────────────────────────────────────────────┐" -ForegroundColor Cyan
  Write-Host "  │   M365 Conditional Access Dashboard — One-Click Setup  │" -ForegroundColor Cyan
  Write-Host "  └────────────────────────────────────────────────────────┘" -ForegroundColor Cyan
  Write-Host ""
}

# ── Microsoft Graph permission GUIDs ─────────────────────────────────────────
$GRAPH_APP_ID          = '00000003-0000-0000-c000-000000000000'

# Application permissions (Role)
$AUDIT_LOG_APP         = 'b0afded3-3588-46d8-8b3d-9842eff778da'  # AuditLog.Read.All
$DIRECTORY_READ_APP    = '7ab1d382-f21e-4acd-a863-ba3e13f7da61'  # Directory.Read.All

# Delegated permissions (Scope)
$AUDIT_LOG_DEL         = 'e4cf2842-3c50-4b71-92d0-a5aa267be4d5'  # AuditLog.Read.All
$DIRECTORY_READ_DEL    = '06da0dbc-49e2-44d2-8312-53f166ab848a'  # Directory.Read.All

# ── Entry Point ───────────────────────────────────────────────────────────────
Write-Banner

# ── Step 1: Ensure Microsoft.Graph module ────────────────────────────────────
Write-Step "Checking Microsoft.Graph PowerShell module..."

$requiredModules = @('Microsoft.Graph.Applications', 'Microsoft.Graph.Authentication')
foreach ($mod in $requiredModules) {
  if (-not (Get-Module -ListAvailable -Name $mod)) {
    Write-Warn "$mod not found — installing (this takes ~1 minute on first run)..."
    try {
      Install-Module $mod -Scope CurrentUser -Force -AllowClobber -Repository PSGallery
      Write-OK "$mod installed"
    } catch {
      Write-Err "Failed to install $mod. Run manually: Install-Module $mod -Scope CurrentUser -Force"
      exit 1
    }
  }
}
Write-OK "Microsoft.Graph module ready"

# ── Step 2: Connect to Microsoft Graph ───────────────────────────────────────
Write-Host ""
Write-Step "Connecting to Microsoft Graph..."
Write-Host "    A browser sign-in window will open. Use a Global Administrator or" -ForegroundColor Gray
Write-Host "    Application Administrator account for your MSP tenant." -ForegroundColor Gray
Write-Host ""

try {
  Connect-MgGraph `
    -Scopes 'Application.ReadWrite.All', 'AppRoleAssignment.ReadWrite.All' `
    -NoWelcome
} catch {
  Write-Err "Authentication failed: $_"
  exit 1
}

$context  = Get-MgContext
$tenantId = $context.TenantId
Write-OK "Connected — Tenant: $tenantId"

# ── Step 3: Check if app already exists ──────────────────────────────────────
Write-Host ""
Write-Step "Checking for existing app registration '$AppName'..."

$existing = Get-MgApplication -Filter "displayName eq '$AppName'" -ErrorAction SilentlyContinue

if ($existing) {
  Write-Warn "An app named '$AppName' already exists (ID: $($existing.AppId))."
  $choice = Read-Host "  Continue and create a new one? [y/N]"
  if ($choice -notmatch '^[Yy]') {
    Write-Host "  Aborted." -ForegroundColor Yellow
    Disconnect-MgGraph | Out-Null
    exit 0
  }
}

# ── Step 4: Build redirect URI list ──────────────────────────────────────────
$redirectUris = [System.Collections.Generic.List[string]]::new()
$redirectUris.Add('http://localhost:3000/api/auth/callback/azure-ad')

# Only add production URIs if a non-localhost URL was provided
if ($AppUrl -notmatch '^http://localhost') {
  $redirectUris.Add("$AppUrl/api/auth/callback/azure-ad")
  $redirectUris.Add("$AppUrl/tenants")
}

# ── Step 5: Create the app registration ──────────────────────────────────────
Write-Host ""
Write-Step "Creating app registration: '$AppName'..."

$appBody = @{
  DisplayName    = $AppName
  SignInAudience = 'AzureADMultipleOrgs'
  Web            = @{
    RedirectUris = $redirectUris.ToArray()
  }
  RequiredResourceAccess = @(
    @{
      ResourceAppId  = $GRAPH_APP_ID
      ResourceAccess = @(
        # Application permissions (Role)
        @{ Id = $AUDIT_LOG_APP;       Type = 'Role'  }
        @{ Id = $DIRECTORY_READ_APP;  Type = 'Role'  }
        # Delegated permissions (Scope)
        @{ Id = $AUDIT_LOG_DEL;       Type = 'Scope' }
        @{ Id = $DIRECTORY_READ_DEL;  Type = 'Scope' }
      )
    }
  )
}

try {
  $app = New-MgApplication -BodyParameter $appBody
} catch {
  Write-Err "Failed to create app registration: $_"
  Disconnect-MgGraph | Out-Null
  exit 1
}

Write-OK "App registration created — Client ID: $($app.AppId)"

# ── Step 6: Create the service principal ────────────────────────────────────
Write-Host ""
Write-Step "Creating service principal in your tenant..."

try {
  $sp = New-MgServicePrincipal -AppId $app.AppId
  Write-OK "Service principal created — Object ID: $($sp.Id)"
} catch {
  Write-Err "Failed to create service principal: $_"
  Write-Warn "You can create it manually: New-MgServicePrincipal -AppId '$($app.AppId)'"
}

# ── Step 7: Grant admin consent for Application permissions ──────────────────
Write-Host ""
Write-Step "Granting admin consent for Application permissions..."
Write-Host "    (AuditLog.Read.All + Directory.Read.All as app-only)" -ForegroundColor Gray

Start-Sleep -Seconds 10  # Allow the service principal to propagate

try {
  $graphSp = Get-MgServicePrincipal -Filter "appId eq '$GRAPH_APP_ID'"

  @($AUDIT_LOG_APP, $DIRECTORY_READ_APP) | ForEach-Object {
    New-MgServicePrincipalAppRoleAssignment `
      -ServicePrincipalId $sp.Id `
      -PrincipalId        $sp.Id `
      -ResourceId         $graphSp.Id `
      -AppRoleId          $_ | Out-Null
  }
  Write-OK "Admin consent granted for Application permissions"
} catch {
  Write-Warn "Could not auto-grant admin consent: $_"
  Write-Host "    → Grant manually: Azure Portal → App Registrations → '$AppName' → API Permissions → Grant admin consent" -ForegroundColor Yellow
}

# ── Step 8: Create client secret ─────────────────────────────────────────────
Write-Host ""
Write-Step "Creating client secret (expires in $SecretYears year(s))..."

try {
  $secretResult = Add-MgApplicationPassword `
    -ApplicationId      $app.Id `
    -PasswordCredential @{
      DisplayName = 'M365-Dashboard-Auto'
      EndDateTime = (Get-Date).AddYears($SecretYears)
    }
  Write-OK "Client secret created (expires: $($secretResult.EndDateTime.ToString('yyyy-MM-dd')))"
} catch {
  Write-Err "Failed to create client secret: $_"
  Write-Warn "Create it manually in Azure Portal → App Registrations → '$AppName' → Certificates & secrets"
  Disconnect-MgGraph | Out-Null
  exit 1
}

# ── Step 9: Generate NextAuth secret ─────────────────────────────────────────
$nextAuthBytes = [byte[]]::new(32)
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($nextAuthBytes)
$nextAuthSecret = [Convert]::ToBase64String($nextAuthBytes)

# ── Step 10: Output the environment variables ─────────────────────────────────
Disconnect-MgGraph | Out-Null

$envOutput = @"
AZURE_AD_CLIENT_ID="$($app.AppId)"
AZURE_AD_CLIENT_SECRET="$($secretResult.SecretText)"
AZURE_AD_TENANT_ID="$tenantId"
NEXTAUTH_SECRET="$nextAuthSecret"
NEXTAUTH_URL="$AppUrl"
"@

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║              Setup complete! Copy these values:          ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host $envOutput -ForegroundColor White
Write-Host ""
Write-Host "  ┌──────────────────────────────────────────────────────────┐" -ForegroundColor Yellow
Write-Host "  │ IMPORTANT — save AZURE_AD_CLIENT_SECRET now.             │" -ForegroundColor Yellow
Write-Host "  │ It will NOT be shown again after this window is closed.  │" -ForegroundColor Yellow
Write-Host "  └──────────────────────────────────────────────────────────┘" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Cyan
Write-Host "    Local dev  →  Paste values into your .env file, then: npm run dev" -ForegroundColor Gray
Write-Host "    Vercel     →  Project Settings → Environment Variables → add each value" -ForegroundColor Gray
Write-Host "    Customers  →  Visit /tenants to add customer tenants (one consent click each)" -ForegroundColor Gray
Write-Host ""

# Save output to a file for convenience
$outFile = Join-Path $PSScriptRoot '.env.generated'
try {
  $envOutput | Out-File -FilePath $outFile -Encoding UTF8 -Force
  Write-Host "  Values also saved to: $outFile" -ForegroundColor Gray
  Write-Host "  (Rename to .env and fill in NEXTAUTH_URL if needed)" -ForegroundColor Gray
  Write-Host ""
} catch {
  # Non-fatal — user still has the console output
}
