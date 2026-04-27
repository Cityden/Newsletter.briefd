import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminDashboard from './AdminDashboard'

export default async function AdminPage() {
  const adminPassword = process.env.ADMIN_PASSWORD
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')

  if (!adminPassword || session?.value !== adminPassword) {
    redirect('/admin/login')
  }

  return <AdminDashboard />
}
