import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Topbar } from '@/components/dashboard/Topbar'
import { AutoSyncTrigger } from '@/components/dashboard/AutoSyncTrigger'

const LEADERSHIP_ROLES = ['955126889171804170', '955126890472022066']

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user || !session.user.id) {
    redirect('/auth/login')
  }

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { banned: true },
  })
  if (user?.banned) redirect('/auth/error?error=banned')

  const roleIds      = session.user.roleIds || []
  const isLeadership = Boolean((session.user as any).isLeadership) || roleIds.some((r: string) => LEADERSHIP_ROLES.includes(r))

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      <AutoSyncTrigger />
      <Sidebar isLeadership={isLeadership} roleIds={roleIds} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar user={session.user} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 animate-fade-in">
          <div className="md:hidden h-8" />
          {children}
        </main>
      </div>
    </div>
  )
}
