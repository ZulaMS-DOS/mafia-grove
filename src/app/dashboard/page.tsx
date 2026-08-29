import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Clock, Coins, FileText, LogOut } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import Image from 'next/image'
import { redirect } from 'next/navigation' // Am importat funcția de redirecționare

function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  // CONTROL DE ACCES PENTRU UTILIZATORII FĂRĂ GRAD:
  // Dacă marcajul din route.ts este activ, îl trimitem direct la pagina ta de eroare custom
  if ((session?.user as any)?.noGradeRedirect) {
    redirect('/auth/error?error=no_grade')
  }

  const userId  = session!.user.id
  const user    = session!.user

  const now        = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 7); weekStart.setHours(0, 0, 0, 0)
  const taxWeek    = getWeekStart()

  const [dbUser, activeSession, todaySessions, weekSessions, myInvoiri, taxPayment] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.workSession.findFirst({ where: { userId, clockOut: null } }),
    prisma.workSession.findMany({ where: { userId, clockIn: { gte: todayStart }, clockOut: { not: null } } }),
    prisma.workSession.findMany({ where: { userId, clockIn: { gte: weekStart }, clockOut: { not: null } } }),
    prisma.leaveRequest.count({ where: { userId, status: 'PENDING' } }),
    (prisma as any).taxPayment.findFirst({
      where: { userId, weekStart: taxWeek, paid: true },
    }),
  ])

  const minsToday = todaySessions.reduce((a, s) => a + (s.totalMinutes ?? 0), 0)
  const minsWeek  = weekSessions.reduce( (a, s) => a + (s.totalMinutes ?? 0), 0)
  const fmtDur    = (m: number) => `${Math.floor(m/60)}h ${m%60}m`
  const taxaPaid  = taxPayment?.paid ?? false

  return (
    <div className="space-y-5 animate-slide-up max-w-2xl mx-auto">

      {/* Profil + status */}
      <div className="grove-card flex items-center gap-4">
        {user.image
          ? <Image src={user.image} alt={user.name} width={56} height={56} className="rounded-2xl border-2 border-grove-border shrink-0" />
          : <div className="w-14 h-14 rounded-2xl bg-dark-muted flex items-center justify-center text-2xl shrink-0">🤵</div>
        }
        <div className="flex-1 min-w-0">
          <div className="font-black text-zinc-900 text-lg truncate">{user.name}</div>
          <div className="text-zinc-500 text-sm">Bratkov Legacy</div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${
            activeSession
              ? 'text-grove-green border-grove-border bg-grove-dim'
              : 'text-zinc-600 border-zinc-700/30 bg-zinc-800/30'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${activeSession ? 'bg-grove-green animate-pulse' : 'bg-zinc-600'}`} />
            {activeSession ? 'ONLINE' : 'OFFLINE'}
          </div>
          {activeSession && (
            <div className="text-xs text-zinc-600 mt-1">
              Din {format(activeSession.clockIn, 'HH:mm', { locale: ro })}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="grove-card text-center">
          <Clock size={18} className="text-zinc-900 mx-auto mb-1.5" />
          <div className="text-2xl font-black text-zinc-900">{fmtDur(minsToday)}</div>
          <div className="text-xs text-zinc-600 mt-1 uppercase tracking-wider">Ore Azi</div>
        </div>
        <div className="grove-card text-center">
          <Clock size={18} className="text-blue-400 mx-auto mb-1.5" />
          <div className="text-2xl font-black text-blue-400">{fmtDur(minsWeek)}</div>
          <div className="text-xs text-zinc-600 mt-1 uppercase tracking-wider">Ore Săptămână</div>
        </div>
      </div>

      {/* Taxa status */}
      <a href="/dashboard/taxa"
        className={`grove-card flex items-center justify-between hover:opacity-90 transition-opacity cursor-pointer ${
          taxaPaid ? 'border-green-500/40 bg-green-500/5' : 'border-red-500/40 bg-red-500/5'
        }`}>
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Taxa Săptămânală</div>
          <div className={`text-xl font-black ${taxaPaid ? 'text-green-400' : 'text-red-400'}`}>
            {taxaPaid ? '✓ ACHITATĂ' : '✗ NEACHITATĂ'}
          </div>
        </div>
        <div className={`text-3xl ${taxaPaid ? '✅' : '❌'}`}>
          {taxaPaid ? '✅' : '❌'}
        </div>
      </a>

      {/* Actiuni rapide */}
      <div className="grove-card">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Acțiuni Rapide</h2>
        <div className="grid grid-cols-2 gap-2">
          <a href="/dashboard/clock"
            className="flex items-center gap-3 p-3 rounded-xl bg-grove-dim border border-grove-border text-grove-green hover:bg-grove-dim/80 transition-colors">
            <Clock size={16} className="shrink-0" />
            <span className="text-sm font-semibold">Clock In/Out</span>
          </a>
          <a href="/dashboard/taxa"
            className="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/15 transition-colors">
            <Coins size={16} className="shrink-0" />
            <span className="text-sm font-semibold">Taxa Sindicat</span>
          </a>
          <a href="/dashboard/invoiri"
            className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/15 transition-colors">
            <FileText size={16} className="shrink-0" />
            <span className="text-sm font-semibold">Invoire</span>
          </a>
          <a href="/dashboard/demisii"
            className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-colors">
            <LogOut size={16} className="shrink-0" />
            <span className="text-sm font-semibold">Demisie</span>
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 border-t border-dark-border">
        <p className="text-xs text-zinc-700">
          © {new Date().getFullYear()} Bratkov Legacy · Made by <span className="text-grove-green font-semibold">Zula</span>
        </p>
      </div>

    </div>
  )
}
