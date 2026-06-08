'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Clock, FileText,
  LogOut, Star, Users, Coins, Shield, Menu, X
} from 'lucide-react'
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

interface SidebarProps {
  isLeadership: boolean
}

export function Sidebar({ isLeadership }: SidebarProps) {
  const path = usePathname()
  const [open, setOpen] = useState(false)

  const NavItem = ({
    href,
    icon: Icon,
    label,
  }: {
    href: string
    icon: React.ElementType
    label: string
  }) => {
    const active = path === href || (href !== '/dashboard' && path.startsWith(href))
    return (
      <Link
        href={href}
        onClick={() => setOpen(false)}
        className={clsx(
          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group',
          active
            ? 'bg-grove-dim text-grove-green border border-grove-border shadow-[0_0_12px_#00ff6615]'
            : 'text-zinc-500 hover:text-white hover:bg-dark-hover'
        )}
      >
        <Icon size={16} className={clsx('transition-colors shrink-0', active ? 'text-grove-green' : 'group-hover:text-grove-green')} />
        <span>{label}</span>
        {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-grove-green shrink-0" />}
      </Link>
    )
  }

  const SidebarContent = () => (
    <aside className="w-64 bg-dark-card flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-dark-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-grove-dim border border-grove-border flex items-center justify-center text-lg shrink-0">
            🏚️
          </div>
          <div>
            <div className="font-black text-white text-sm leading-none">MAFIA GROVE</div>
            <div className="text-grove-green text-xs mt-0.5">Dashboard</div>
          </div>
        </div>
        {/* Buton inchide pe mobil */}
        <button
          onClick={() => setOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-zinc-600 hover:text-white hover:bg-dark-hover transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-xs text-zinc-700 uppercase tracking-widest px-4 py-2">General</div>
        {memberNav.map(item => <NavItem key={item.href} {...item} />)}

        {isLeadership && (
          <>
            <div className="text-xs text-grove-green/50 uppercase tracking-widest px-4 py-2 mt-4">
              ⭐ Leadership
            </div>
            {leaderNav.map(item => <NavItem key={item.href} {...item} />)}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-dark-border">
        <button
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-zinc-600
                     hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut size={16} /> Ieșire
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* ── DESKTOP: sidebar fix ── */}
      <div className="hidden md:flex shrink-0 border-r border-dark-border">
        <SidebarContent />
      </div>

      {/* ── MOBIL: buton hamburger ── */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2.5 rounded-xl bg-dark-card border border-dark-border text-zinc-400 hover:text-grove-green shadow-lg transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* ── MOBIL: overlay inchidere ── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── MOBIL: drawer glisabil ── */}
      <div className={clsx(
        'md:hidden fixed top-0 left-0 h-full z-50 transition-transform duration-300 ease-in-out shadow-2xl',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent />
      </div>
    </>
  )
}
