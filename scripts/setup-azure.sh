#!/usr/bin/env bash
# =============================================================================
# setup-azure.sh — One-click Azure CLI setup for M365 Conditional Access Dashboard
#
# Creates a multi-tenant Azure AD app registration with all required permissions,
# grants admin consent, generates a client secret, and outputs environment variables.
#
# Requirements:
#   - Azure CLI  (https://aka.ms/installazurecli)
#   - openssl    (built-in on macOS/Linux)
#   - An Azure AD account with Global Administrator or Application Administrator role
#
# Usage:
#   chmod +x scripts/setup-azure.sh
#   ./scripts/setup-azure.sh
#
# Options (environment variables):
#   APP_NAME     Display name for the app registration  (default: M365-CA-Dashboard)
#   APP_URL      Production URL for redirect URIs        (default: https://m365-ca-review.vercel.app)
#   SECRET_YEARS Number of years until secret expires    (default: 2)
#
# Example:
#   APP_NAME="My Dashboard" APP_URL="https://ca.mycompany.com" ./scripts/setup-azure.sh
# =============================================================================

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
APP_NAME="${APP_NAME:-M365-CA-Dashboard}"
APP_URL="${APP_URL:-https://m365-ca-review.vercel.app}"
SECRET_YEARS="${SECRET_YEARS:-2}"

# ── Colours ───────────────────────────────────────────────────────────────────
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;37m'
BOLD='\033[1m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}[OK]${NC} $1"; }
warn() { echo -e "  ${YELLOW}[!!]${NC} $1"; }
err()  { echo -e "  ${RED}[ERR]${NC} $1"; }
step() { echo -e "  ${CYAN}$1${NC}"; }

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}  ┌────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}  │   M365 Conditional Access Dashboard — One-Click Setup  │${NC}"
echo -e "${CYAN}  └────────────────────────────────────────────────────────┘${NC}"
echo ""

# ── Microsoft Graph permission GUIDs ─────────────────────────────────────────
GRAPH_APP_ID="00000003-0000-0000-c000-000000000000"

# Application permissions (Role)
AUDIT_LOG_APP="b0afded3-3588-46d8-8b3d-9842eff778da"    # AuditLog.Read.All
DIRECTORY_READ_APP="7ab1d382-f21e-4acd-a863-ba3e13f7da61" # Directory.Read.All

# Delegated permissions (Scope)
AUDIT_LOG_DEL="e4cf2842-3c50-4b71-92d0-a5aa267be4d5"    # AuditLog.Read.All
DIRECTORY_READ_DEL="06da0dbc-49e2-44d2-8312-53f166ab848a" # Directory.Read.All

# ── Step 1: Check prerequisites ───────────────────────────────────────────────
step "Checking prerequisites..."

if ! command -v az &>/dev/null; then
  err "Azure CLI not found."
  echo -e "  Install it from: ${CYAN}https://aka.ms/installazurecli${NC}"
  echo -e "  macOS:  brew update && brew install azure-cli"
  echo -e "  Linux:  curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash"
  exit 1
fi

AZ_VERSION=$(az version --query '"azure-cli"' -o tsv 2>/dev/null || echo "unknown")
ok "Azure CLI found (v${AZ_VERSION})"

if ! command -v openssl &>/dev/null; then
  err "openssl not found — needed to generate NEXTAUTH_SECRET"
  exit 1
fi
ok "openssl found"

# ── Step 2: Sign in ──────────────────────────────────────────────────────────
echo ""
step "Signing in to Azure..."
echo -e "  ${GRAY}A browser window will open. Sign in with a Global Administrator${NC}"
echo -e "  ${GRAY}or Application Administrator account for your MSP tenant.${NC}"
echo ""

az login --only-show-errors >/dev/null

TENANT_ID=$(az account show --query tenantId -o tsv)
ACCOUNT_NAME=$(az account show --query user.name -o tsv)

ok "Signed in as: ${ACCOUNT_NAME}"
ok "Tenant ID:    ${TENANT_ID}"

# ── Step 3: Check for existing app ───────────────────────────────────────────
echo ""
step "Checking for existing app registration '${APP_NAME}'..."

EXISTING_APP=$(az ad app list --display-name "${APP_NAME}" --query "[0].appId" -o tsv 2>/dev/null || true)

if [[ -n "${EXISTING_APP}" ]]; then
  warn "An app named '${APP_NAME}' already exists (ID: ${EXISTING_APP})."
  read -rp "  Create a new one anyway? [y/N]: " CHOICE
  if [[ ! "${CHOICE}" =~ ^[Yy]$ ]]; then
    echo "  Aborted."
    exit 0
  fi
fi

# ── Step 4: Create app registration ──────────────────────────────────────────
echo ""
step "Creating app registration: '${APP_NAME}'..."

# Build redirect URI list
REDIRECT_URIS="http://localhost:3000/api/auth/callback/azure-ad"

if [[ "${APP_URL}" != "http://localhost"* ]]; then
  REDIRECT_URIS="${REDIRECT_URIS} ${APP_URL}/api/auth/callback/azure-ad ${APP_URL}/tenants"
fi

APP_ID=$(az ad app create \
  --display-name "${APP_NAME}" \
  --sign-in-audience AzureADMultipleOrgs \
  --web-redirect-uris ${REDIRECT_URIS} \
  --query appId \
  --output tsv \
  --only-show-errors)

ok "App registration created — Client ID: ${APP_ID}"

# Store object ID (different from app/client ID — needed for some operations)
APP_OBJECT_ID=$(az ad app show --id "${APP_ID}" --query id -o tsv --only-show-errors)

# ── Step 5: Add API permissions ───────────────────────────────────────────────
echo ""
step "Adding API permissions..."

# Application permissions (Role)
az ad app permission add \
  --id "${APP_ID}" \
  --api "${GRAPH_APP_ID}" \
  --api-permissions "${AUDIT_LOG_APP}=Role" "${DIRECTORY_READ_APP}=Role" \
  --only-show-errors

# Delegated permissions (Scope)
az ad app permission add \
  --id "${APP_ID}" \
  --api "${GRAPH_APP_ID}" \
  --api-permissions "${AUDIT_LOG_DEL}=Scope" "${DIRECTORY_READ_DEL}=Scope" \
  --only-show-errors

ok "API permissions added (AuditLog.Read.All + Directory.Read.All — Application & Delegated)"

# ── Step 6: Create service principal & grant admin consent ───────────────────
echo ""
step "Creating service principal..."

az ad sp create --id "${APP_ID}" --only-show-errors >/dev/null 2>&1 || true

ok "Service principal created"

echo ""
step "Granting admin consent for Application permissions..."
echo -e "  ${GRAY}(AuditLog.Read.All + Directory.Read.All as app-only)${NC}"

# Brief pause for SP to propagate in the directory
sleep 15

if az ad app permission admin-consent --id "${APP_ID}" --only-show-errors 2>/dev/null; then
  ok "Admin consent granted"
else
  warn "Could not auto-grant admin consent. Grant manually:"
  echo -e "  ${GRAY}Azure Portal → App Registrations → '${APP_NAME}' → API permissions → Grant admin consent${NC}"
fi

# ── Step 7: Create client secret ─────────────────────────────────────────────
echo ""
step "Creating client secret (${SECRET_YEARS}-year expiry)..."

# Calculate expiry date
if date --version &>/dev/null 2>&1; then
  # GNU date (Linux)
  EXPIRY=$(date -d "+${SECRET_YEARS} years" +%Y-%m-%d)
else
  # BSD date (macOS)
  EXPIRY=$(date -v "+${SECRET_YEARS}y" +%Y-%m-%d)
fi

CLIENT_SECRET=$(az ad app credential reset \
  --id "${APP_ID}" \
  --display-name "M365-Dashboard-Auto" \
  --end-date "${EXPIRY}" \
  --query password \
  --output tsv \
  --only-show-errors)

ok "Client secret created (expires: ${EXPIRY})"

# ── Step 8: Generate NextAuth secret ─────────────────────────────────────────
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# ── Step 9: Output ─────────────────────────────────────────────────────────
ENV_OUTPUT="AZURE_AD_CLIENT_ID=\"${APP_ID}\"
AZURE_AD_CLIENT_SECRET=\"${CLIENT_SECRET}\"
AZURE_AD_TENANT_ID=\"${TENANT_ID}\"
NEXTAUTH_SECRET=\"${NEXTAUTH_SECRET}\"
NEXTAUTH_URL=\"${APP_URL}\""

echo ""
echo -e "${GREEN}  ╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}  ║              Setup complete! Copy these values:          ║${NC}"
echo -e "${GREEN}  ╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}${ENV_OUTPUT}${NC}"
echo ""
echo -e "${YELLOW}  ┌──────────────────────────────────────────────────────────┐${NC}"
echo -e "${YELLOW}  │ IMPORTANT — save AZURE_AD_CLIENT_SECRET now.             │${NC}"
echo -e "${YELLOW}  │ It will NOT be retrievable after this session ends.      │${NC}"
echo -e "${YELLOW}  └──────────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "${CYAN}  Next steps:${NC}"
echo -e "  ${GRAY}Local dev  → Paste values into your .env file, then: npm run dev${NC}"
echo -e "  ${GRAY}Vercel     → Project Settings → Environment Variables → add each value${NC}"
echo -e "  ${GRAY}Customers  → Visit /tenants to add customer tenants (one consent click each)${NC}"
echo ""

# Save to file for convenience
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_FILE="${SCRIPT_DIR}/.env.generated"

if echo "${ENV_OUTPUT}" > "${OUT_FILE}" 2>/dev/null; then
  echo -e "  ${GRAY}Values also saved to: ${OUT_FILE}${NC}"
  echo -e "  ${GRAY}(Rename to .env if you want to use it for local development)${NC}"
  echo ""
fi
