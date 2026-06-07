import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import { Clock, FileText, Star, Users } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const user    = session!.user
  const userId  = user.id

  const now        = new Date()
  const todayStart = new Date(now); todayStart.setHours(0,0,0,0)
  const weekStart  = new Date(now); weekStart.setDate(now.getDate()-7); weekStart.setHours(0,0,0,0)

  const [dbUser, activeSessions, todaySessions, weekSessions, invoiriPending, recentActivity, totalMembers] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.workSession.findFirst({ where: { userId, clockOut: null } }),
    prisma.workSession.findMany({ where: { userId, clockIn: { gte: todayStart }, clockOut: { not: null } } }),
    prisma.workSession.findMany({ where: { userId, clockIn: { gte: weekStart  }, clockOut: { not: null } } }),
    prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
    prisma.workSession.findMany({ orderBy: { clockIn: 'desc' }, take: 5, include: { user: { select: { username: true, avatar: true } } } }),
    prisma.user.count(),
  ])

  const minsToday = todaySessions.reduce((a,s) => a + (s.totalMinutes ?? 0), 0)
  const minsWeek  = weekSessions.reduce( (a,s) => a + (s.totalMinutes ?? 0), 0)

  const fmtDur = (m: number) => `${Math.floor(m/60)}h ${m%60}m`

  const stats = [
    { icon: Clock,     label: 'Azi',       value: fmtDur(minsToday), color: 'text-grove-green' },
    { icon: Clock,     label: 'Săptămâna', value: fmtDur(minsWeek),  color: 'text-blue-400'    },
    { icon: Star,      label: 'Puncte',    value: dbUser?.points ?? 0, color: 'text-yellow-400' },
    { icon: FileText,  label: 'Invoiri pending', value: invoiriPending, color: 'text-orange-400' },
    { icon: Users,     label: 'Membri',    value: totalMembers,       color: 'text-purple-400'  },
  ]

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-4 p-5 bg-dark-card border border-dark-border rounded-2xl">
        {user.image
          ? <Image src={user.image} alt={user.name} width={64} height={64} className="rounded-2xl border-2 border-grove-border" />
          : <div className="w-16 h-16 rounded-2xl bg-dark-muted flex items-center justify-center text-3xl">🤵</div>
        }
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black text-white">{user.name}</h1>
            {user.isLeadership && <span className="badge-leadership">⭐ Leadership</span>}
          </div>
          <div className="text-zinc-500 text-sm">{user.isLeadership ? 'Admin Mafia Grove' : 'Membru Mafia Grove'}</div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-semibold flex items-center gap-2 justify-end ${activeSessions ? 'text-grove-green' : 'text-zinc-600'}`}>
            <div className={`w-2 h-2 rounded-full ${activeSessions ? 'bg-grove-green animate-pulse' : 'bg-zinc-700'}`} />
            {activeSessions ? 'CLOCK IN' : 'OFFLINE'}
          </div>
          {activeSessions && (
            <div className="text-xs text-zinc-500 mt-1">
              Din {format(activeSessions.clockIn, 'HH:mm', { locale: ro })}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(s => (
          <div key={s.label} className="grove-card text-center">
            <s.icon size={20} className={`${s.color} mx-auto mb-2`} />
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-zinc-600 mt-1 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grove-card">
        <h2 className="text-sm font-semibold text-grove-green uppercase tracking-widest mb-4">📋 Activitate Recentă</h2>
        <div className="space-y-2">
          {recentActivity.length === 0 && (
            <p className="text-zinc-600 text-sm py-4 text-center">Nicio activitate recentă</p>
          )}
          {recentActivity.map(s => (
            <div key={s.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-dark-hover transition-colors">
              <div className="flex items-center gap-3">
                {s.user.avatar
                  ? <Image src={`https://cdn.discordapp.com/avatars/${s.userId}/${s.user.avatar}.png`} alt="" width={28} height={28} className="rounded-full" />
                  : <div className="w-7 h-7 rounded-full bg-dark-muted flex items-center justify-center text-xs">👤</div>
                }
                <span className="text-sm text-zinc-300">{s.user.username}</span>
              </div>
              <div className="text-right">
                <div className="text-xs text-grove-green">{s.clockOut ? '🔴 Clock Out' : '🟢 Clock In'}</div>
                <div className="text-xs text-zinc-600">{format(s.clockIn, 'dd MMM HH:mm', { locale: ro })}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
