import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Clock, Coins, FileText, LogOut } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import Image from 'next/image'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const userId  = session!.user.id
  const user    = session!.user

  const now        = new Date()
  const todayStart = new Date(now); todayStart.setHours(0,0,0,0)
  const weekStart  = new Date(now); weekStart.setDate(now.getDate()-7); weekStart.setHours(0,0,0,0)

  const [dbUser, activeSession, todaySessions, weekSessions, myInvoiri, myDemisii] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.workSession.findFirst({ where: { userId, clockOut: null } }),
    prisma.workSession.findMany({ where: { userId, clockIn: { gte: todayStart }, clockOut: { not: null } } }),
    prisma.workSession.findMany({ where: { userId, clockIn: { gte: weekStart  }, clockOut: { not: null } } }),
    prisma.leaveRequest.count({ where: { userId, status: 'PENDING' } }),
    prisma.resignation.count({ where: { userId, status: 'PENDING' } }),
  ])

  const minsToday = todaySessions.reduce((a, s) => a + (s.totalMinutes ?? 0), 0)
  const minsWeek  = weekSessions.reduce( (a, s) => a + (s.totalMinutes ?? 0), 0)
  const fmtDur    = (m: number) => `${Math.floor(m/60)}h ${m%60}m`

  return (
    <div className="space-y-5 animate-slide-up max-w-2xl mx-auto">

      {/* Profil */}
      <div className="grove-card flex items-center gap-4">
        {user.image
          ? <Image src={user.image} alt={user.name} width={56} height={56} className="rounded-2xl border-2 border-grove-border shrink-0" />
          : <div className="w-14 h-14 rounded-2xl bg-dark-muted flex items-center justify-center text-2xl shrink-0">🤵</div>
        }
        <div className="flex-1 min-w-0">
          <div className="font-black text-white text-lg truncate">{user.name}</div>
          <div className="text-zinc-500 text-sm">Membru Mafia Grove</div>
        </div>
        <div className="text-right shrink-0">
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${activeSession ? 'text-grove-green' : 'text-zinc-600'}`}>
            <div className={`w-2 h-2 rounded-full ${activeSession ? 'bg-grove-green animate-pulse' : 'bg-zinc-700'}`} />
            {activeSession ? 'ONLINE' : 'OFFLINE'}
          </div>
          {activeSession && (
            <div className="text-xs text-zinc-600 mt-0.5">
              Din {format(activeSession.clockIn, 'HH:mm', { locale: ro })}
            </div>
          )}
        </div>
      </div>

      {/* Stats principale */}
      <div className="grid grid-cols-2 gap-3">
        <div className="grove-card text-center">
          <Clock size={20} className="text-grove-green mx-auto mb-2" />
          <div className="text-2xl font-black text-grove-green">{fmtDur(minsToday)}</div>
          <div className="text-xs text-zinc-600 mt-1 uppercase tracking-wider">Ore Azi</div>
        </div>
        <div className="grove-card text-center">
          <Clock size={20} className="text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-black text-blue-400">{fmtDur(minsWeek)}</div>
          <div className="text-xs text-zinc-600 mt-1 uppercase tracking-wider">Ore Săptămână</div>
        </div>
        <div className="grove-card text-center">
          <Coins size={20} className="text-yellow-400 mx-auto mb-2" />
          <div className="text-2xl font-black text-yellow-400">{dbUser?.points ?? 0}</div>
          <div className="text-xs text-zinc-600 mt-1 uppercase tracking-wider">Grove Coins</div>
        </div>
        <div className="grove-card text-center">
          <div className="text-xl mb-1">📋</div>
          <div className="text-2xl font-black text-orange-400">{myInvoiri}</div>
          <div className="text-xs text-zinc-600 mt-1 uppercase tracking-wider">Invoiri Pending</div>
        </div>
      </div>

      {/* Actiuni rapide */}
      <div className="grove-card">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Acțiuni Rapide</h2>
        <div className="grid grid-cols-2 gap-2">
          <a href="/dashboard/clock"
            className="flex items-center gap-3 p-3 rounded-xl bg-grove-dim border border-grove-border text-grove-green hover:bg-grove-dim/80 transition-colors">
            <Clock size={18} className="shrink-0" />
            <span className="text-sm font-semibold">Clock In/Out</span>
          </a>
          <a href="/dashboard/puncte"
            className="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/15 transition-colors">
            <Coins size={18} className="shrink-0" />
            <span className="text-sm font-semibold">Punctele Mele</span>
          </a>
          <a href="/dashboard/invoiri"
            className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/15 transition-colors">
            <FileText size={18} className="shrink-0" />
            <span className="text-sm font-semibold">Invoire</span>
          </a>
          <a href="/dashboard/demisii"
            className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-colors">
            <LogOut size={18} className="shrink-0" />
            <span className="text-sm font-semibold">Demisie</span>
          </a>
        </div>
      </div>

    </div>
  )
}
