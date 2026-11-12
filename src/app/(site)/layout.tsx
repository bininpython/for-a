import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { getPublicContent } from '@/lib/data/public';

export const revalidate = 60;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { settings } = await getPublicContent();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader logoUrl={settings?.logo_url} />
      <main className="flex-1">{children}</main>
      <SiteFooter settings={settings} />
    </div>
  );
}
