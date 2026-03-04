import { requireAuth } from '@/lib/auth';
import { AdminLayout } from '@/components/admin/admin-layout';
import { ScrapedNewsManager } from '@/components/admin/scraped-news-manager';

export default async function NoticiasExternasPage() {
  const user = await requireAuth();

  return (
    <AdminLayout user={user}>
      <ScrapedNewsManager />
    </AdminLayout>
  );
}
