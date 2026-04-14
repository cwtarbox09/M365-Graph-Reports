import { redirect } from 'next/navigation';
import SetupWizard from '@/components/SetupWizard';

export const dynamic = 'force-dynamic';

export default function SetupPage() {
  // Redirect to dashboard if already configured
  const isConfigured =
    process.env.AZURE_AD_CLIENT_ID &&
    process.env.AZURE_AD_CLIENT_SECRET &&
    process.env.AZURE_AD_TENANT_ID &&
    process.env.NEXTAUTH_SECRET;

  if (isConfigured) redirect('/');

  const isLocal = process.env.NODE_ENV === 'development';

  return <SetupWizard isLocal={isLocal} />;
}
