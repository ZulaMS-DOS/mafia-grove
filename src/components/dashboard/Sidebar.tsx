'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  Menu, X, LayoutDashboard, Clock, FileText,
  LogOut, Star, Users, Coins, Settings, Shield,
  ChevronRight,
} from 'lucide-react'

const NAV_LINKS = [
  { href: '/dashboard',          icon: LayoutDashboard, label: 'Dashboard'    },
  { href: '/dashboard/clock',    icon: Clock,           label: 'Clock In/Out' },
  { href: '/dashboard/invoiri',  icon: FileText,        label: 'Invoiri'      },
  { href: '/dashboard/demisii',  icon: LogOut,          label: 'Demisii'      },
  { href: '/dashboard/puncte',   icon: Coins,           label: 'Puncte Mele'  },
]

const LEADERSHIP_LINKS = [
  { href: '/dashboard/leadership',            icon: Star,     label: 'Panou General'     },
  { href: '/dashboard/leadership/members',    icon: Users,    label: 'Membri'            },
  { href: '/dashboard/leadership/puncte',     icon: Coins,    label: 'Acordă Puncte'     },
  { href: '/dashboard/leadership/whitelist',  icon: Shield,   label: 'Whitelist Acces'   },
  { href: '/dashboard/leadership/invoiri',    icon: FileText, label: 'Invoiri Admin'     },
  { href: '/dashboard/leadership/demisii',    icon: Settings, label: 'Demisii Admin'     },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const pathname        = usePathname()
  const { data: session } = useSession()

  // Inchide pe mobile cand se schimba ruta
  useEffect(() => { setOpen(false) }, [pathname])

  // Blocheaza scroll pe mobile cand e deschis
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const NavLink = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => (
    <Link
      href={href}
      className={`
        flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all group
        ${pathname === href
          ? 'bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/20'
          : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
        }
      `}
    >
      <Icon size={18} className="flex-shrink-0" />
      <span className="flex-1">{label}</span>
      {pathname === href && <ChevronRight size={14} className="text-[#00ff66]/60" />}
    </Link>
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-[#1a1a1a]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-[#00ff66] tracking-wider">MAFIA GROVE</h1>
            <p className="text-xs text-gray-600 mt-0.5">Organization Dashboard</p>
          </div>
          {/* Buton close pe mobile */}
          <button
            className="md:hidden text-gray-500 hover:text-white p-1"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* User info */}
      {session?.user && (
        <div className="p-4 border-b border-[#1a1a1a]">
          <div className="flex items-center gap-3">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt="avatar"
                className="w-9 h-9 rounded-full border border-[#1a1a1a]"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#00ff66]/10 border border-[#00ff66]/20 flex items-center justify-center text-[#00ff66] text-xs font-bold">
                {session.user.name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{session.user.name}</p>
              <p className="text-xs text-[#00ff66]">
                {session.user.isLeadership ? '⭐ Leadership' : '👤 Membru'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV_LINKS.map(link => <NavLink key={link.href} {...link} />)}

        {session?.user?.isLeadership && (
          <>
            <div className="pt-4 pb-2 px-3">
              <p className="text-xs text-[#00ff66]/50 uppercase tracking-widest font-semibold">
                ⭐ Leadership
              </p>
            </div>
            {LEADERSHIP_LINKS.map(link => <NavLink key={link.href} {...link} />)}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-[#1a1a1a]">
        <button
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-400
                     hover:text-red-400 hover:bg-red-500/5 transition-all border border-transparent
                     hover:border-red-500/20"
        >
          <LogOut size={18} />
          Deconectare
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Buton hamburger (doar mobile) ── */}
      <button
        onClick={() => setOpen(true)}
        className="
          fixed top-4 left-4 z-50 md:hidden
          w-10 h-10 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl
          flex items-center justify-center text-[#00ff66]
          shadow-lg shadow-black/50
        "
        aria-label="Deschide meniu"
      >
        <Menu size={20} />
      </button>

      {/* ── Overlay (mobile) ── */}
      {open && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar desktop (static) ── */}
      <aside className="
        hidden md:flex flex-col
        w-64 flex-shrink-0 h-screen sticky top-0
        bg-[#0a0a0a] border-r border-[#1a1a1a]
      ">
        <SidebarContent />
      </aside>

      {/* ── Sidebar mobile (drawer) ── */}
      <aside className={`
        fixed top-0 left-0 h-full w-72 z-50
        bg-[#0a0a0a] border-r border-[#1a1a1a]
        transform transition-transform duration-300 ease-in-out
        md:hidden flex flex-col
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SidebarContent />
      </aside>
    </>
  )
}
