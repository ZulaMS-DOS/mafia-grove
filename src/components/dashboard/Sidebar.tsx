'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Clock, FileText, LogOut, Star, Users, Coins,
  Shield, Menu, X, UserCog, Megaphone,
  LayoutDashboard, ShoppingCart, Dices, ListTodo, AlertTriangle, Bug, Zap, Sword, Trophy, ScrollText
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import clsx from 'clsx'

const ROLES = {
  LIDER:        '955126889171804170',
  CO_LIDER:     '955126890472022066',
  TESTER:       '1462444900388704317',
  MEMBRU:       '1501319885488390184',
  GROVE_KILLER: '955126892984410162',
  MUNCITOR:     '1342912254542348298',
}

const baseNav = [
  { href: '/dashboard',              icon: LayoutDashboard, label: 'Dashboard'    },
  { href: '/dashboard/clock',        icon: Clock,           label: 'Clock In/Out' },
  { href: '/dashboard/invoiri',      icon: FileText,        label: 'Invoiri'      },
  { href: '/dashboard/demisii',      icon: LogOut,          label: 'Demisii'      },
  { href: '/dashboard/shop',         icon: ShoppingCart,    label: 'Shop'         },
  { href: '/dashboard/wheel',        icon: Dices,           label: 'Fortune Wheel'},
  { href: '/dashboard/tasks',        icon: ListTodo,        label: 'Tasks'        },
  { href: '/dashboard/leaderboard',  icon: Trophy,          label: 'Leaderboard'  },
]

const testerNav = [
  { href: '/dashboard/lider/amenzi', icon: AlertTriangle, label: 'Amenzi (Admin)' },
]

const liderNav = [
  { href: '/dashboard/lider/grade',     icon: UserCog,       label: 'Grade Membri'      },
  { href: '/dashboard/lider/amenzi',    icon: AlertTriangle, label: 'Amenzi'            },
  { href: '/dashboard/lider/shop',      icon: ShoppingCart,  label: 'Gestionare Shop'   },
  { href: '/dashboard/lider/wheel',     icon: Dices,         label: 'Fortune Wheel'     },
  { href: '/dashboard/lider/tasks',     icon: ListTodo,      label: 'Tasks'             },
  { href: '/dashboard/lider/members',   icon: Users,         label: 'Membri'            },
  { href: '/dashboard/lider/whitelist', icon: Shield,        label: 'Whitelist'         },
  { href: '/dashboard/lider/anunturi',  icon: Megaphone,     label: 'Postează Anunț'    },
  { href: '/dashboard/lider/taxa',      icon: Coins,         label: 'Taxa Sindicat'     },
  { href: '/dashboard/lider/ban',       icon: Shield,        label: 'Gestionare Acces'  },
  { href: '/dashboard/lider/logs',      icon: ScrollText,    label: 'Logs Bot'          },
]

const superAdminNav = [
  { href: '/dashboard/lider/puncte', icon: Coins, label: 'Gestionare Puncte' },
]

interface SidebarProps {
  isLeadership: boolean
  roleIds: string[]
}

export function Sidebar({ isLeadership, roleIds }: SidebarProps) {
  const path = usePathname()
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  const has = (role: string) => roleIds.includes(role)
  const isTester      = has(ROLES.TESTER)       && !isLeadership
  const isMembru      = has(ROLES.MEMBRU)
  const isGroveKiller = has(ROLES.GROVE_KILLER)
  const isMuncitor    = has(ROLES.MUNCITOR)

  const showImportant      = isLeadership || isTester || isMembru || isGroveKiller || isMuncitor
  const showTaxa           = isLeadership || isTester || isMembru
  const showTaskSaptamanal = isGroveKiller
  const showSageti         = isMuncitor

  const NavItem = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const active = path === href
    return (
      <Link href={href} onClick={() => setOpen(false)}
        className={clsx(
          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group',
          active
            ? 'bg-grove-dim text-grove-green border border-grove-border shadow-[0_0_12px_#00ff6615]'
            : 'text-zinc-500 hover:text-white hover:bg-dark-hover'
        )}>
        <Icon size={16} className={clsx('transition-colors shrink-0', active ? 'text-grove-green' : 'group-hover:text-grove-green')} />
        <span>{label}</span>
        {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-grove-green shrink-0" />}
      </Link>
    )
  }

  const SidebarContent = () => (
    <aside className="w-64 bg-dark-card flex flex-col h-full">
      <div className="p-5 border-b border-dark-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="font-black text-white text-lg leading-none" style={{ fontFamily: 'var(--font-bangers), cursive', letterSpacing: '0.05em' }}>
            <span style={{ color: '#00ff66' }}>GROVE</span> STREET
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="md:hidden p-1.5 rounded-lg text-zinc-600 hover:text-white hover:bg-dark-hover">
          <X size={18} />
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-xs text-zinc-700 uppercase tracking-widest px-4 py-2">General</div>
        {baseNav.map(item => <NavItem key={item.href} {...item} />)}

        {showImportant && (
          <>
            <div className="text-xs text-zinc-700 uppercase tracking-widest px-4 py-2 mt-3">Important</div>
            <NavItem href="/dashboard/anunturi"   icon={Megaphone}     label="Anunțuri"       />
            <NavItem href="/dashboard/amenzi"     icon={AlertTriangle} label="Amenzile Mele"  />
            <NavItem href="/dashboard/bug-report" icon={Bug}           label="Bug Report"     />
            {showTaxa           && <NavItem href="/dashboard/taxa"            icon={Coins} label="Taxa Sindicat"   />}
            {showTaskSaptamanal && <NavItem href="/dashboard/task-saptamanal" icon={Sword} label="Task Săptămânal" />}
            {showSageti         && <NavItem href="/dashboard/sageti"          icon={Zap}   label="Task Săgeată"   />}
          </>
        )}

        {isTester && (
          <>
            <div className="text-xs text-yellow-400/50 uppercase tracking-widest px-4 py-2 mt-3">🔧 Tester</div>
            {testerNav.map(item => <NavItem key={item.href} {...item} />)}
          </>
        )}

        {isLeadership && (
          <>
            <div className="text-xs text-grove-green/50 uppercase tracking-widest px-4 py-2 mt-3">⭐ Lider</div>
            {liderNav.map(item => <NavItem key={item.href} {...item} />)}
            {session?.user.discordId === '949760812518617138' && (
              superAdminNav.map(item => <NavItem key={item.href} {...item} />)
            )}
          </>
        )}
      </nav>
      <div className="p-3 border-t border-dark-border space-y-2">
        <button onClick={() => signOut({ callbackUrl: '/auth/login' })}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200">
          <LogOut size={16} /> Ieșire
        </button>
        <p className="text-center text-[10px] text-zinc-700 pt-1">© 2026 Zula | Grove Street</p>
      </div>
    </aside>
  )

  return (
    <>
      <div className="hidden md:flex shrink-0 border-r border-dark-border"><SidebarContent /></div>
      <button onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2.5 rounded-xl bg-dark-card border border-dark-border text-zinc-400 hover:text-grove-green shadow-lg transition-colors">
        <Menu size={20} />
      </button>
      {open && <div className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />}
      <div className={clsx('md:hidden fixed top-0 left-0 h-full z-50 transition-transform duration-300 ease-in-out shadow-2xl', open ? 'translate-x-0' : '-translate-x-full')}>
        <SidebarContent />
      </div>
    </>
  )
}
