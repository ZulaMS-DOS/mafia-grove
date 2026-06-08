import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { isLeadership } from '@/lib/discord'

export default async function MembersPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user.isLeadership) redirect('/dashboard')

  const members = await prisma.user.findMany({
    orderBy: { points: 'desc' },
    include: {
      sessions: { where: { clockOut: null }, select: { clockIn: true } },
      _count:   { select: { sessions: true, leaveRequests: true } },
    },
  })

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-black text-white">Membri</h1>
        <p className="text-zinc-500 text-sm mt-1">{members.length} membri înregistrați</p>
      </div>

      <div className="grove-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-dark-border">
              <tr>
                {['#','Utilizator','Rol','Status','Puncte','Clock-ins','Înregistrat'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-zinc-600 font-medium text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => {
                const isActive  = m.sessions.length > 0
                const isLeader  = isLeadership(m.roleIds)
                const avatarUrl = m.avatar
                  ? `https://cdn.discordapp.com/avatars/${m.discordId}/${m.avatar}.png`
                  : null

                return (
                  <tr key={m.id} className="border-b border-dark-border/50 hover:bg-dark-hover transition-colors">
                    <td className="py-3 px-4 text-zinc-600">{i + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {avatarUrl
                          ? <Image src={avatarUrl} alt="" width={28} height={28} className="rounded-full" />
                          : <div className="w-7 h-7 rounded-full bg-dark-muted flex items-center justify-center text-xs">👤</div>
                        }
                        <span className="text-white font-medium">{m.username}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {isLeader ? <span className="badge-leadership">⭐ Leadership</span> : <span className="badge-muted text-xs px-2 py-0.5 rounded-full border border-dark-border text-zinc-500">Membru</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className={`flex items-center gap-2 text-xs ${isActive ? 'text-grove-green' : 'text-zinc-600'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-grove-green animate-pulse' : 'bg-zinc-700'}`} />
                        {isActive ? 'Online' : 'Offline'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-yellow-400 font-bold">{m.points}</td>
                    <td className="py-3 px-4 text-zinc-500">{m._count.sessions}</td>
                    <td className="py-3 px-4 text-zinc-600 text-xs">{format(m.createdAt, 'dd MMM yyyy', { locale: ro })}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
