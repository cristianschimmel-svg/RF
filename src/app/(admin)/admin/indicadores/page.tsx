import { requireAuth } from '@/lib/auth';
import { AdminLayout } from '@/components/admin/admin-layout';
import { IndicadoresClient } from './indicadores-client';

export default async function AdminIndicadoresPage() {
  const user = await requireAuth();

  return (
    <AdminLayout user={user as any}>
      <IndicadoresClient />
    </AdminLayout>
  );
}
