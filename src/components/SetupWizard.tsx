'use client';

import { useState, useCallback } from 'react';
import {
  Shield, Terminal, CheckCircle2, XCircle, Copy, Check,
  ExternalLink, ChevronDown, ChevronUp, Loader2, AlertTriangle,
  Zap, Monitor, ArrowRight,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'scripts' | 'manual';

interface Creds {
  clientId:       string;
  clientSecret:   string;
  tenantId:       string;
  nextAuthSecret: string;
  appUrl:         string;
}

interface ValidateResult {
  ok: boolean;
  tenantName?: string | null;
  error?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomBase64(bytes = 32): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return btoa(String.fromCharCode(...arr));
  }
  // Fallback: instruct user to generate manually
  return '';
}

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="btn btn-secondary text-xs"
      title={copied ? 'Copied!' : label}
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-green-500" />
        : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

// ── ScriptBlock ───────────────────────────────────────────────────────────────

function ScriptBlock({ code, language }: { code: string; language: string }) {
  return (
    <div className="relative group">
      <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs font-mono
                      overflow-x-auto leading-relaxed whitespace-pre-wrap">
        <span className="text-slate-400 select-none">{language}$ </span>
        {code}
      </pre>
      <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={code} />
      </div>
    </div>
  );
}

// ── ScriptsTab ────────────────────────────────────────────────────────────────

function ScriptsTab() {
  const [platform, setPlatform] = useState<'powershell' | 'bash'>('powershell');

  const psCommand =
    `# Run this in PowerShell as your MSP tenant admin\n` +
    `irm https://raw.githubusercontent.com/cwtarbox09/m365-graph-reports/main/scripts/Setup-M365Dashboard.ps1 | iex`;

  const bashCommand =
    `# Run this in your terminal as your MSP tenant admin\n` +
    `curl -fsSL https://raw.githubusercontent.com/cwtarbox09/m365-graph-reports/main/scripts/setup-azure.sh | bash`;

  const localPs   = `.\\scripts\\Setup-M365Dashboard.ps1`;
  const localBash = `./scripts/setup-azure.sh`;

  return (
    <div className="space-y-6">
      {/* Platform picker */}
      <div className="flex gap-2">
        {([
          { id: 'powershell', label: 'PowerShell (Windows)', icon: Monitor },
          { id: 'bash',       label: 'Azure CLI (Mac / Linux / WSL)', icon: Terminal },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setPlatform(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              platform === id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Requirements */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">
          {platform === 'powershell' ? 'Requirements' : 'Requirements'}
        </p>
        {platform === 'powershell' ? (
          <ul className="space-y-0.5 text-blue-700 text-xs">
            <li>• PowerShell 5.1+ or PowerShell 7 (pre-installed on Windows)</li>
            <li>• Global Administrator or Application Administrator role in your MSP tenant</li>
            <li>• The Microsoft.Graph module is installed automatically if missing</li>
          </ul>
        ) : (
          <ul className="space-y-0.5 text-blue-700 text-xs">
            <li>• <a href="https://aka.ms/installazurecli" target="_blank" rel="noopener noreferrer" className="underline">Azure CLI</a> installed</li>
            <li>• Global Administrator or Application Administrator role in your MSP tenant</li>
            <li>• openssl (built-in on macOS and Linux)</li>
          </ul>
        )}
      </div>

      {/* Script */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-2">
          Run from your cloned repo:
        </p>
        <ScriptBlock
          language={platform === 'powershell' ? 'PS' : 'sh'}
          code={platform === 'powershell' ? localPs : localBash}
        />
        <p className="text-xs text-slate-400 mt-2">
          Or run directly without cloning (downloads and executes the script):
        </p>
        <ScriptBlock
          language={platform === 'powershell' ? 'PS' : 'sh'}
          code={platform === 'powershell' ? psCommand : bashCommand}
        />
      </div>

      {/* What it does */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-slate-700 mb-3">What the script does (~2 minutes):</p>
        <ol className="space-y-2 text-sm text-slate-600">
          {[
            'Opens a Microsoft sign-in window — authenticate with your MSP admin account',
            'Creates a multi-tenant app registration in your Azure AD tenant',
            'Adds Application & Delegated permissions (AuditLog.Read.All, Directory.Read.All)',
            'Grants admin consent for the Application permissions automatically',
            'Creates a 2-year client secret',
            'Prints all required environment variables to the terminal',
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold
                               flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
        <p>
          Copy your <code className="font-mono font-bold">AZURE_AD_CLIENT_SECRET</code> from the
          terminal immediately — it cannot be retrieved again once the window is closed.
        </p>
      </div>
    </div>
  );
}

// ── ManualTab ─────────────────────────────────────────────────────────────────

function ManualTab() {
  const permUrls = {
    appRegs: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
    newReg:  'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/CreateApplicationBlade',
  };

  const steps = [
    {
      title: 'Create the app registration',
      body: (
        <div className="space-y-2 text-sm">
          <p className="text-slate-500">
            Go to <strong>Azure Portal → Entra ID → App registrations → New registration</strong>
          </p>
          <ul className="space-y-1.5 text-slate-600 text-xs">
            <li>• <strong>Name:</strong> M365-CA-Dashboard (or any name)</li>
            <li>• <strong>Supported account types:</strong> Accounts in any organizational directory (Multi-tenant)</li>
            <li>• <strong>Redirect URI (Web):</strong> <code className="font-mono bg-slate-100 px-1 rounded">http://localhost:3000/api/auth/callback/azure-ad</code></li>
          </ul>
          <div className="flex gap-2 mt-3">
            <a href={permUrls.newReg} target="_blank" rel="noopener noreferrer"
               className="btn btn-primary text-xs">
              <ExternalLink className="w-3.5 h-3.5" />
              Open New Registration
            </a>
          </div>
          <p className="text-xs text-slate-400">After creating, copy the <strong>Application (client) ID</strong> and <strong>Directory (tenant) ID</strong> from the Overview page.</p>
        </div>
      ),
    },
    {
      title: 'Add API permissions',
      body: (
        <div className="space-y-2 text-sm">
          <p className="text-slate-500">In your app registration → <strong>API permissions → Add a permission → Microsoft Graph</strong></p>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="bg-slate-50 rounded-lg p-3 text-xs">
              <p className="font-semibold text-slate-700 mb-2">Application permissions</p>
              {['AuditLog.Read.All', 'Directory.Read.All'].map(p => (
                <div key={p} className="flex items-center gap-1.5 text-slate-600">
                  <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                  <code className="font-mono">{p}</code>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-xs">
              <p className="font-semibold text-slate-700 mb-2">Delegated permissions</p>
              {['AuditLog.Read.All', 'Directory.Read.All'].map(p => (
                <div key={p} className="flex items-center gap-1.5 text-slate-600">
                  <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                  <code className="font-mono">{p}</code>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Then click <strong>Grant admin consent</strong> at the top of the permissions list.</p>
        </div>
      ),
    },
    {
      title: 'Create a client secret',
      body: (
        <div className="space-y-2 text-sm">
          <p className="text-slate-500">In your app registration → <strong>Certificates &amp; secrets → New client secret</strong></p>
          <ul className="space-y-1.5 text-slate-600 text-xs">
            <li>• Give it a description and set an expiry (24 months recommended)</li>
            <li>• Copy the <strong>Value</strong> immediately — it won&apos;t be shown again</li>
          </ul>
        </div>
      ),
    },
    {
      title: 'Add redirect URIs for production',
      body: (
        <div className="space-y-2 text-sm">
          <p className="text-slate-500">In your app registration → <strong>Authentication → Add URI</strong></p>
          <ul className="space-y-1 font-mono text-xs text-slate-600">
            <li>https://your-app.vercel.app/api/auth/callback/azure-ad</li>
            <li>https://your-app.vercel.app/tenants</li>
          </ul>
          <p className="text-xs text-slate-400">Replace <code>your-app.vercel.app</code> with your actual Vercel domain.</p>
        </div>
      ),
    },
  ];

  const [expanded, setExpanded] = useState<number[]>([0]);
  const toggle = (i: number) => setExpanded(prev =>
    prev.includes(i) ? prev.filter(n => n !== i) : [...prev, i],
  );

  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggle(i)}
            className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
          >
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold
                             flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <span className="flex-1 font-medium text-slate-800 text-sm">{step.title}</span>
            {expanded.includes(i)
              ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
              : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
          </button>
          {expanded.includes(i) && (
            <div className="border-t border-slate-100 p-4 bg-white">
              {step.body}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── CredentialsForm ───────────────────────────────────────────────────────────

interface CredentialsFormProps {
  isLocal: boolean;
}

function CredentialsForm({ isLocal }: CredentialsFormProps) {
  const [creds, setCreds] = useState<Creds>({
    clientId:       '',
    clientSecret:   '',
    tenantId:       '',
    nextAuthSecret: randomBase64(32),
    appUrl:         isLocal ? 'http://localhost:3000' : 'https://m365-ca-review.vercel.app',
  });

  const [validating, setValidating]   = useState(false);
  const [writing,    setWriting]      = useState(false);
  const [result,     setResult]       = useState<ValidateResult | null>(null);
  const [written,    setWritten]      = useState(false);

  const set = (key: keyof Creds) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCreds(prev => ({ ...prev, [key]: e.target.value }));
    setResult(null);
    setWritten(false);
  };

  const allFilled = creds.clientId && creds.clientSecret && creds.tenantId && creds.nextAuthSecret;

  const validate = useCallback(async () => {
    setValidating(true);
    setResult(null);
    try {
      const resp = await fetch('/api/setup/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId:     creds.clientId.trim(),
          clientSecret: creds.clientSecret.trim(),
          tenantId:     creds.tenantId.trim(),
        }),
      });
      const data = await resp.json();
      setResult(data.ok ? { ok: true, tenantName: data.tenantName } : { ok: false, error: data.error });
    } catch {
      setResult({ ok: false, error: 'Network error — could not reach validation endpoint' });
    } finally {
      setValidating(false);
    }
  }, [creds]);

  const writeEnv = useCallback(async () => {
    setWriting(true);
    try {
      const resp = await fetch('/api/setup/write-env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId:       creds.clientId.trim(),
          clientSecret:   creds.clientSecret.trim(),
          tenantId:       creds.tenantId.trim(),
          nextAuthSecret: creds.nextAuthSecret.trim(),
        }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setWritten(true);
      } else {
        setResult({ ok: false, error: data.error });
      }
    } catch {
      setResult({ ok: false, error: 'Failed to write .env.local' });
    } finally {
      setWriting(false);
    }
  }, [creds]);

  const envBlock = [
    `AZURE_AD_CLIENT_ID="${creds.clientId}"`,
    `AZURE_AD_CLIENT_SECRET="${creds.clientSecret}"`,
    `AZURE_AD_TENANT_ID="${creds.tenantId}"`,
    `NEXTAUTH_SECRET="${creds.nextAuthSecret}"`,
    `NEXTAUTH_URL="${creds.appUrl}"`,
  ].join('\n');

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-slate-700 font-semibold">
        <ArrowRight className="w-4 h-4 text-blue-500" />
        Paste your credentials from the script output
      </div>

      {/* Form fields */}
      <div className="grid grid-cols-1 gap-4">
        {([
          { key: 'clientId',     label: 'Client ID (Application ID)',  placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', type: 'text'     },
          { key: 'clientSecret', label: 'Client Secret Value',          placeholder: 'Paste the secret VALUE (not the ID)',  type: 'password' },
          { key: 'tenantId',     label: 'Tenant ID (Directory ID)',     placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', type: 'text'     },
          { key: 'appUrl',       label: 'App URL (NEXTAUTH_URL)',       placeholder: 'https://your-app.vercel.app',          type: 'url'      },
        ] as const).map(({ key, label, placeholder, type }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <input
              type={type}
              value={creds[key]}
              onChange={set(key)}
              placeholder={placeholder}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-slate-700">NextAuth Secret</label>
            <button
              type="button"
              onClick={() => setCreds(p => ({ ...p, nextAuthSecret: randomBase64(32) }))}
              className="text-xs text-blue-600 hover:underline"
            >
              Regenerate
            </button>
          </div>
          <input
            type="text"
            value={creds.nextAuthSecret}
            onChange={set('nextAuthSecret')}
            placeholder="Random 32-byte base64 string"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-400 mt-1">Auto-generated above. The scripts also output this value.</p>
        </div>
      </div>

      {/* Validate button */}
      <div className="flex gap-2">
        <button
          onClick={validate}
          disabled={!allFilled || validating}
          className="btn btn-primary disabled:opacity-50"
        >
          {validating && <Loader2 className="w-4 h-4 animate-spin" />}
          {validating ? 'Validating…' : 'Validate Credentials'}
        </button>
      </div>

      {/* Validation result */}
      {result && (
        <div className={`rounded-xl p-4 text-sm flex gap-3 ${
          result.ok
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {result.ok
            ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-500" />
            : <XCircle     className="w-4 h-4 mt-0.5 shrink-0 text-red-500"   />}
          <div>
            {result.ok ? (
              <>
                <p className="font-semibold">Credentials verified!</p>
                {result.tenantName && <p className="text-xs mt-0.5">Tenant: {result.tenantName}</p>}
              </>
            ) : (
              <p>{result.error}</p>
            )}
          </div>
        </div>
      )}

      {/* Next steps after validation */}
      {result?.ok && (
        <div className="space-y-4">
          {isLocal ? (
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-800">
                Local development — write to .env.local
              </p>
              <p className="text-xs text-slate-500">
                This will create a <code className="font-mono">.env.local</code> file in your
                project root. Restart <code className="font-mono">npm run dev</code> after.
              </p>
              {written ? (
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  .env.local written! Restart your dev server to apply.
                </div>
              ) : (
                <button
                  onClick={writeEnv}
                  disabled={writing}
                  className="btn btn-primary"
                >
                  {writing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {writing ? 'Writing…' : 'Write .env.local'}
                </button>
              )}
            </div>
          ) : null}

          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">
              {isLocal ? 'Or copy for Vercel / other hosts' : 'Copy to Vercel → Project Settings → Environment Variables'}
            </p>
            <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs font-mono
                            overflow-x-auto leading-relaxed whitespace-pre">
              {envBlock}
            </pre>
            <CopyButton text={envBlock} label="Copy all values" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main SetupWizard ──────────────────────────────────────────────────────────

interface Props {
  isLocal: boolean;
}

export default function SetupWizard({ isLocal }: Props) {
  const [tab, setTab] = useState<Tab>('scripts');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-semibold text-slate-900">M365 Conditional Access Dashboard</span>
            <span className="ml-3 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              Setup Required
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* Hero */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Set up your app registration</h1>
          <p className="text-slate-500">
            The dashboard needs an Azure AD app registration in your MSP tenant to authenticate
            users and read sign-in data from Microsoft Graph.
            Use the automated scripts below — it takes under 2 minutes.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-100 flex">
            {([
              { id: 'scripts', label: 'Quick Setup (recommended)', icon: Zap },
              { id: 'manual',  label: 'Manual Setup',               icon: Terminal },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                  tab === id
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
          <div className="p-6">
            {tab === 'scripts' ? <ScriptsTab /> : <ManualTab />}
          </div>
        </div>

        {/* Credentials form — always visible */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <CredentialsForm isLocal={isLocal} />
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-400">
          Sign-in data is read-only and never stored server-side.
          Customer credentials are never stored — only tenant IDs.
        </p>
      </div>
    </div>
  );
}
