import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Topbar }  from '@/components/dashboard/Topbar'

const LEADERSHIP_ROLES = ['955126889171804170', '955126890472022066']
const MEMBRU_ROLES     = ['1501319885488390184']

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  // Verifica daca userul e banat
  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { banned: true },
  })
  if (user?.banned) redirect('/auth/error?error=banned')

  const roleIds      = session.user.roleIds || []
  const isLeadership = roleIds.some((r: string) => LEADERSHIP_ROLES.includes(r))
  const isMembru     = roleIds.some((r: string) => MEMBRU_ROLES.includes(r))

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      <Sidebar isLeadership={isLeadership} isMembru={isMembru} />
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
