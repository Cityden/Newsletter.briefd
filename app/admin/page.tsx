import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminDashboard from './AdminDashboard'
import { sessionToken } from '@/lib/auth'

export default async function AdminPage() {
  const adminPassword = process.env.ADMIN_PASSWORD
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')

  if (!adminPassword || session?.value !== sessionToken(adminPassword)) {
    redirect('/admin/login')
  }

  return <AdminDashboard />
}
