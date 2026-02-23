import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_auth')?.value;
    const expected = process.env.ADMIN_API_KEY?.trim();

    if (!expected || token !== expected) {
        redirect('/admin/login');
    }

    return <>{children}</>;
}
