'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Clock, FileText, LogOut, Star, Users, Coins, Shield } from 'lucide-react'
import { signOut } from 'next-auth/react'
import clsx from 'clsx'

const memberNav = [
  { href: '/dashboard',         icon: LayoutDashboard, label: 'Dashboard'    },
  { href: '/dashboard/clock',   icon: Clock,           label: 'Clock In/Out' },
  { href: '/dashboard/invoiri', icon: FileText,        label: 'Invoiri'      },
  { href: '/dashboard/demisii', icon: LogOut,          label: 'Demisii'      },
  { href: '/dashboard/puncte',  icon: Coins,           label: 'Puncte'       },
]

const leaderNav = [
  { href: '/dashboard/leadership',           icon: Star,   label: 'Leadership Panel'  },
  { href: '/dashboard/leadership/puncte',    icon: Coins,  label: 'Gestionare Puncte' },
  { href: '/dashboard/leadership/members',   icon: Users,  label: 'Membri'            },
  { href: '/dashboard/leadership/whitelist', icon: Shield, label: 'Whitelist'         },
]

export function Sidebar({ isLeadership }: { isLeadership: boolean }) {
  const path = usePathname()

  const NavItem = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const active = path === href || (href !== '/dashboard' && path.startsWith(href))
    return (
      <Link href={href} className={clsx(
        'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
        active ? 'bg-grove-dim text-grove-green border border-grove-border' : 'text-zinc-500 hover:text-white hover:bg-dark-hover'
      )}>
        <Icon size={16} className={clsx('transition-colors', active ? 'text-grove-green' : 'group-hover:text-grove-green')} />
        {label}
        {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-grove-green" />}
      </Link>
    )
  }

  return (
    <aside className="w-60 bg-dark-card border-r border-dark-border flex flex-col shrink-0">
      <div className="p-5 border-b border-dark-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-grove-dim border border-grove-border flex items-center justify-center text-lg">🏚️</div>
          <div>
            <div className="font-black text-white text-sm leading-none">MAFIA GROVE</div>
            <div className="text-grove-green text-xs mt-0.5">Dashboard</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-xs text-zinc-700 uppercase tracking-widest px-4 py-2">General</div>
        {memberNav.map(item => <NavItem key={item.href} {...item} />)}
        {isLeadership && (
          <>
            <div className="text-xs text-grove-green/50 uppercase tracking-widest px-4 py-2 mt-4">⭐ Leadership</div>
            {leaderNav.map(item => <NavItem key={item.href} {...item} />)}
          </>
        )}
      </nav>
      <div className="p-3 border-t border-dark-border">
        <button onClick={() => signOut({ callbackUrl: '/auth/login' })}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200">
          <LogOut size={16} /> Ieșire
        </button>
      </div>
    </aside>
  )
}
