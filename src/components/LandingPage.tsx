import { Shield, BarChart2, Filter, Lock, Download, ArrowRight, Zap, Terminal } from 'lucide-react';
import Link from 'next/link';

const features = [
  { icon: BarChart2, label: 'Compliance overview charts' },
  { icon: Filter,    label: 'Filter by user, app, OS, and policy status' },
  { icon: Lock,      label: 'Device trust type breakdown' },
  { icon: Download,  label: 'Export filtered data to CSV' },
];

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
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200
                          text-amber-800 text-sm rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 bg-amber-500 rounded-full" />
            Setup required — Azure AD not configured
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Get started in under 2 minutes
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Connect your Azure AD tenant to analyse sign-in logs and understand the impact
            of device compliance policies before enforcing them.
          </p>
        </div>

        {/* Feature pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {features.map(({ icon: Icon, label }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Icon className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm text-slate-600">{label}</p>
            </div>
          ))}
        </div>

        {/* One-click setup CTA */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-6 h-6 text-blue-200" />
              <h2 className="text-xl font-bold">One-click app registration setup</h2>
            </div>
            <p className="text-blue-100 text-sm">
              Run one script and get all your environment variables automatically created.
              No Azure Portal required.
            </p>
          </div>

          <div className="px-8 py-6 grid md:grid-cols-2 gap-6">
            {/* PowerShell option */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">PowerShell (Windows)</span>
              </div>
              <pre className="bg-slate-900 text-green-400 rounded-lg px-4 py-3 text-xs font-mono
                              overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {`.\\scripts\\Setup-M365Dashboard.ps1`}
              </pre>
              <p className="text-xs text-slate-400">
                Authenticates interactively, creates the app registration, grants admin consent, and outputs your env vars.
              </p>
            </div>

            {/* Azure CLI option */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">Azure CLI (Mac / Linux / WSL)</span>
              </div>
              <pre className="bg-slate-900 text-green-400 rounded-lg px-4 py-3 text-xs font-mono
                              overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {`./scripts/setup-azure.sh`}
              </pre>
              <p className="text-xs text-slate-400">
                Same automated setup using the Azure CLI. Requires <code className="font-mono">az</code> installed.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 px-8 py-4 bg-slate-50 flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-slate-500">
              Both scripts create the app registration, add all permissions, grant admin consent, and output your .env values.
            </p>
            <Link href="/setup" className="btn btn-primary gap-2">
              Open Setup Wizard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Setup wizard link */}
        <div className="text-center">
          <p className="text-sm text-slate-500">
            Need step-by-step guidance, credential validation, or prefer the Azure Portal?
          </p>
          <Link href="/setup" className="text-sm text-blue-600 hover:underline font-medium mt-1 inline-block">
            Open the interactive setup wizard →
          </Link>
        </div>

        <p className="mt-10 text-center text-sm text-slate-400">
          Sign-in data is read-only and never stored server-side.
        </p>
      </div>
    </div>
  );
}
