'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { RefreshCw } from 'lucide-react'

const LIDER_ROLES    = ['955126889171804170']
const COLIDER_ROLE   = '955126890472022066'
const TESTER_ROLE    = '1462444900388704317'
const MEMBRU_ROLES   = ['1501319885488390184']
const MUNCITOR_ROLES = ['1342912254542348298']

interface Member {
  id: string; discordId: string; username: string
  avatar: string | null; points: number; roleIds: string[]
}

function getAutoGrade(roleIds: string[]): { label: string; color: string } {
  if (roleIds.includes(COLIDER_ROLE))                return { label: 'Co-Lider', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' }
  if (roleIds.some(r => LIDER_ROLES.includes(r)))    return { label: 'Lider',    color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' }
  if (roleIds.includes(TESTER_ROLE))                 return { label: 'Tester',   color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' }
  if (roleIds.some(r => MEMBRU_ROLES.includes(r)))   return { label: 'Membru',   color: 'text-grove-green border-grove-border bg-grove-dim' }
  if (roleIds.some(r => MUNCITOR_ROLES.includes(r))) return { label: 'Muncitor', color: 'text-zinc-400 border-zinc-600/30 bg-zinc-600/10' }
  return { label: 'Fără Grad', color: 'text-zinc-600 border-zinc-700/30 bg-zinc-700/10' }
}

export default function GradePage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch]   = useState('')
  const [msg, setMsg]         = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/members')
    const d = await r.json()
    setMembers(d.members || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const sync = async () => {
    setSyncing(true)
    setMsg('')
    const r = await fetch('/api/discord/members')
    const d = await r.json()
    if (r.ok) {
      setMsg(`✅ Sincronizat! ${d.total} membri găsiți (${d.created} noi, ${d.updated} actualizați)`)
      await load()
    } else {
      setMsg(`❌ Eroare: ${d.error}`)
    }
    setSyncing(false)
    setTimeout(() => setMsg(''), 6000)
  }

  const filtered = members.filter(m =>
    m.username.toLowerCase().includes(search.toLowerCase())
  )

  const gradeOrder = ['Lider', 'Co-Lider', 'Tester', 'Membru', 'Muncitor', 'Fără Grad']
  const grouped = gradeOrder.map(g => ({
    grade:   g,
    members: filtered.filter(m => getAutoGrade(m.roleIds).label === g),
  })).filter(g => g.members.length > 0)

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black text-white">Grade Membri</h1>
          <p className="text-zinc-500 text-sm mt-1">Gradele sunt detectate automat din rolurile Discord</p>
        </div>
        <button onClick={sync} disabled={syncing}
          className="grove-btn flex items-center gap-2 text-sm disabled:opacity-60">
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Se sincronizează...' : 'Sincronizează cu Discord'}
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-dark-hover rounded-xl text-sm text-grove-green border border-grove-border">{msg}</div>
      )}

      <div className="grove-card p-3">
        <input type="text" className="grove-input" placeholder="🔍 Caută după username..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="grove-card text-center py-10 text-zinc-600">Se încarcă...</div>
      ) : grouped.length === 0 ? (
        <div className="grove-card text-center py-10 text-zinc-600 text-sm">
          Niciun membru. Apasă "Sincronizează cu Discord" pentru a aduce toți membrii serverului.
        </div>
      ) : (
        grouped.map(group => (
          <div key={group.grade} className="space-y-2">
            <div className="text-xs text-zinc-600 uppercase tracking-widest px-1 flex items-center gap-2">
              {group.grade} <span className="text-zinc-700">({group.members.length})</span>
            </div>
            {group.members.map(m => {
              const grade = getAutoGrade(m.roleIds)
              return (
                <div key={m.id} className="grove-card flex items-center gap-3 py-2.5">
                  <div className="w-10 h-10 rounded-full border-2 border-dark-border overflow-hidden shrink-0 bg-dark-muted flex items-center justify-center">
                    {m.avatar
                      ? <Image src={`https://cdn.discordapp.com/avatars/${m.discordId}/${m.avatar}.png`} alt={m.username} width={40} height={40} className="object-cover" />
                      : <span className="text-lg">👤</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm truncate">{m.username}</div>
                    <div className="text-xs text-zinc-600">{m.points} Grove Coins</div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full border font-semibold shrink-0 ${grade.color}`}>
                    {grade.label}
                  </span>
                </div>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}
