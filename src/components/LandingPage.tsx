import type { ReactNode } from 'react';
import { Shield, BarChart2, Filter, Lock, Download, Terminal, ExternalLink, CheckCircle } from 'lucide-react';

const features = [
  { icon: BarChart2, label: 'Compliance overview charts' },
  { icon: Filter,    label: 'Filter by user, app, OS, and policy status' },
  { icon: Lock,      label: 'Device trust type breakdown' },
  { icon: Download,  label: 'Export filtered data to CSV' },
];

const ENV_BLOCK = `AZURE_AD_CLIENT_ID="your-client-id"
AZURE_AD_CLIENT_SECRET="your-client-secret"
AZURE_AD_TENANT_ID="your-tenant-id"

# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-random-secret"
NEXTAUTH_URL="http://localhost:3000"`;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg text-slate-900">M365 Conditional Access</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200
                          text-amber-800 text-sm rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 bg-amber-500 rounded-full" />
            Setup required — Azure AD not configured
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Get started with M365 Conditional Access Reports
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Connect your Azure AD tenant to analyse sign-in logs and understand the impact
            of device compliance policies before enforcing them.
          </p>
        </div>

        {/* Feature pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          {features.map(({ icon: Icon, label }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Icon className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm text-slate-600">{label}</p>
            </div>
          ))}
        </div>

        {/* Setup steps */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-600" />
            Setup guide
          </h2>

          <ol className="space-y-10">
            {/* Step 1 */}
            <li className="flex gap-4">
              <StepBadge n={1} />
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Register an Azure AD app</h3>
                <p className="text-slate-500 text-sm mb-3">
                  In the Azure portal, create a new App Registration. Under{' '}
                  <strong className="text-slate-700">Authentication</strong>, add a Web redirect URI:
                </p>
                <CodeLine>http://localhost:3000/api/auth/callback/azure-ad</CodeLine>
                <a
                  href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-blue-600
                             hover:text-blue-700 font-medium"
                >
                  Open App Registrations
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </li>

            {/* Step 2 */}
            <li className="flex gap-4">
              <StepBadge n={2} />
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Grant API permissions</h3>
                <p className="text-slate-500 text-sm mb-3">
                  Under <strong className="text-slate-700">API permissions</strong>, add these{' '}
                  <em>Delegated</em> permissions and grant admin consent:
                </p>
                <ul className="space-y-2">
                  {['AuditLog.Read.All', 'Directory.Read.All'].map((perm) => (
                    <li key={perm} className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      <code className="font-mono">{perm}</code>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-slate-400">
                  The signing-in user also needs one of: Global Admin, Security Admin,
                  Security Reader, Global Reader, or Reports Reader.
                </p>
              </div>
            </li>

            {/* Step 3 */}
            <li className="flex gap-4">
              <StepBadge n={3} />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900 mb-1">Configure environment variables</h3>
                <p className="text-slate-500 text-sm mb-3">
                  Copy{' '}
                  <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                    .env.example
                  </code>{' '}
                  to{' '}
                  <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                    .env
                  </code>{' '}
                  and fill in your values:
                </p>
                <pre className="bg-slate-900 text-slate-100 rounded-xl px-5 py-4 text-xs
                                font-mono overflow-x-auto leading-relaxed">
                  {ENV_BLOCK}
                </pre>
              </div>
            </li>

            {/* Step 4 */}
            <li className="flex gap-4">
              <StepBadge n={4} />
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Restart the dev server</h3>
                <p className="text-slate-500 text-sm mb-3">
                  Environment variables are loaded at startup, so restart after editing{' '}
                  <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">.env</code>:
                </p>
                <CodeLine>npm run dev</CodeLine>
              </div>
            </li>
          </ol>
        </div>

        <p className="mt-8 text-center text-sm text-slate-400">
          Sign-in data is read-only and never stored server-side.
        </p>
      </div>
    </div>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center
                     justify-center text-sm font-bold shrink-0 mt-0.5">
      {n}
    </span>
  );
}

function CodeLine({ children }: { children: ReactNode }) {
  return (
    <code className="block bg-slate-50 border border-slate-200 rounded-lg px-3 py-2
                     text-sm text-slate-700 font-mono">
      {children}
    </code>
  );
}
