import Image from 'next/image'
import { Bell } from 'lucide-react'

interface Props {
  user: { name: string; image: string; isLeadership: boolean }
}

export function Topbar({ user }: Props) {
  return (
    <header className="h-14 bg-dark-card border-b border-dark-border flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-grove-green animate-pulse" />
        <span className="text-xs text-zinc-500 tracking-widest uppercase">Live</span>
      </div>

      <div className="flex items-center gap-4">
        {user.isLeadership && (
          <span className="badge-leadership text-xs">⭐ Leadership</span>
        )}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-white leading-none">{user.name}</div>
            <div className="text-xs text-zinc-600 mt-0.5">{user.isLeadership ? 'Admin Mafia' : 'Membru'}</div>
          </div>
          {user.image
            ? <Image src={user.image} alt={user.name} width={36} height={36} className="rounded-full border-2 border-grove-border" />
            : <div className="w-9 h-9 rounded-full bg-dark-muted border-2 border-dark-border flex items-center justify-center text-lg">🤵</div>
          }
        </div>
      </div>
    </header>
  )
}
