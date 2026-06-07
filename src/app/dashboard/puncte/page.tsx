import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'

export default async function PunctePage() {
  const session = await getServerSession(authOptions)
  const userId  = session!.user.id

  const [user, history] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.pointHistory.findMany({
      where: { userId }, orderBy: { createdAt: 'desc' }, take: 50,
      include: { moderator: { select: { username: true } } },
    }),
  ])

  return (
    <div className="space-y-6 animate-slide-up max-w-2xl">
      <div>
        <h1 className="text-3xl font-black text-white">Punctele Mele</h1>
        <p className="text-zinc-500 text-sm mt-1">Istoricul punctelor tale în organizație</p>
      </div>

      {/* Total */}
      <div className="grove-card text-center py-10">
        <div className="text-xs text-zinc-600 uppercase tracking-widest mb-2">Total Puncte</div>
        <div className="text-8xl font-black text-yellow-400 mb-2">{user?.points ?? 0}</div>
        <div className="text-zinc-600 text-sm">puncte acumulate</div>
      </div>

      {/* History */}
      <div className="grove-card">
        <h2 className="text-sm font-semibold text-grove-green uppercase tracking-widest mb-4">📜 Istoric</h2>
        {history.length === 0 ? (
          <p className="text-zinc-600 text-center py-6 text-sm">Nicio tranzacție</p>
        ) : (
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-dark-hover transition-colors border border-transparent hover:border-dark-border">
                <div>
                  <div className="text-sm text-white font-medium">{h.reason}</div>
                  <div className="text-xs text-zinc-600 mt-0.5">
                    De la {h.moderator.username} • {format(new Date(h.createdAt), 'dd MMM yyyy HH:mm', { locale: ro })}
                  </div>
                </div>
                <div className={`text-xl font-black ${h.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {h.amount > 0 ? '+' : ''}{h.amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
