import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Users, Clock, FileText, Star } from 'lucide-react'
import { ActiveClockIns } from '@/components/dashboard/ActiveClockIns'

const LEADERSHIP_ROLES = ['955126889171804170', '955126890472022066']

export default async function LiderPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  const roleIds = (session.user as any).roleIds || []
  const username = (session.user as any).username || session.user.name || ''

  // FIX PENTRU COMPILARE: Am adăugat "(session.user as any)" ca TypeScript să nu mai dea eroare de tipuri
  if (username !== 'zula213' && !roleIds.some((r: string) => LEADERSHIP_ROLES.includes(r))) {
    redirect('/dashboard')
  }

  const [totalMembers, totalPoints, totalClocks, pendingLeaves, pendingResigns, activeSessions] = await Promise.all([
    prisma.user.count(),
    prisma.user.aggregate({ _sum: { points: true } }),
    prisma.workSession.count(),
    prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
    prisma.resignation.count({ where: { status: 'PENDING' } }),
    prisma.workSession.count({ where: { clockOut: null } }),
  ])

  // Aduce membrii cu clock-in activ
  const activeClockIns = await prisma.workSession.findMany({
    where:   { clockOut: null },
    include: { user: { select: { username: true, avatar: true, discordId: true } } },
    orderBy: { clockIn: 'asc' },
  })

  const stats = [
    { icon: Users,    label: 'Total Membri',          value: totalMembers,                  color: 'text-grove-green' },
    { icon: Star,     label: 'Total Puncte Acordate', value: totalPoints._sum.points ?? 0,  color: 'text-yellow-400'  },
    { icon: Clock,    label: 'Total Clock-In-uri',    value: totalClocks,                   color: 'text-blue-400'    },
    { icon: FileText, label: 'Invoiri Pending',       value: pendingLeaves,                 color: 'text-orange-400'  },
    { icon: FileText, label: 'Demisii Pending',       value: pendingResigns,                color: 'text-red-400'     },
    { icon: Users,    label: 'Membri Activi Acum',    value: activeSessions,                color: 'text-green-400'   },
  ]

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-black text-white">Lider Panel</h1>
        <p className="text-zinc-500 text-sm mt-1">Statistici și gestionare organizație</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="grove-card text-center">
            <s.icon size={22} className={`${s.color} mx-auto mb-3`} />
            <div className={`text-4xl font-black ${s.color} mb-1`}>{s.value}</div>
            <div className="text-xs text-zinc-600 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Sectiunea Clock-In Activ */}
      <ActiveClockIns sessions={activeClockIns.map(s => ({
        id:        s.id,
        clockIn:   s.clockIn.toISOString(),
        username:  s.user.username,
        avatar:    s.user.avatar,
        discordId: s.user.discordId,
      }))} />

      <div className="grove-card border-grove-border">
        <h2 className="text-sm font-semibold text-grove-green uppercase tracking-widest mb-2">⭐ Panou Lider</h2>
        <p className="text-zinc-500 text-sm">Folosește meniul din stânga pentru a gestiona grade, invoiri, demisii și puncte.</p>
      </div>
    </div>
  )
}
