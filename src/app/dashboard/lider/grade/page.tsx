'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

// Doar 3 grade
const GRADE_OPTIONS = ['Muncitor', 'Membru', 'Lider']

const gradeColor: Record<string, string> = {
  'Lider':    'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  'Membru':   'text-grove-green border-grove-border bg-grove-dim',
  'Muncitor': 'text-zinc-400 border-zinc-600/30 bg-zinc-600/10',
}

interface Member {
  id: string; discordId: string; username: string
  avatar: string | null; points: number; roleIds: string[]
}

// Role IDs Discord
const LIDER_ROLES    = ['955126889171804170', '955126890472022066']
const MEMBRU_ROLES   = ['1501319885488390184']
const MUNCITOR_ROLES = ['1342912254542348298']

function getAutoGrade(roleIds: string[]): string {
  if (roleIds.some(r => LIDER_ROLES.includes(r)))    return 'Lider'
  if (roleIds.some(r => MEMBRU_ROLES.includes(r)))   return 'Membru'
  if (roleIds.some(r => MUNCITOR_ROLES.includes(r))) return 'Muncitor'
  return 'Muncitor'
}

export default function GradePage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/members')
    const d = await r.json()
    setMembers(d.members || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = members.filter(m =>
    m.username.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-3xl font-black text-white">Grade Membri</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Gradele sunt detectate automat din rolurile Discord
        </p>
      </div>

      <div className="grove-card p-3">
        <input type="text" className="grove-input" placeholder="🔍 Caută după username..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Legenda grade */}
      <div className="flex gap-3 flex-wrap">
        {GRADE_OPTIONS.map(g => (
          <div key={g} className={`text-xs px-3 py-1.5 rounded-full border font-semibold ${gradeColor[g]}`}>
            {g}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grove-card text-center py-10 text-zinc-600">Se încarcă...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => {
            const grade      = getAutoGrade(m.roleIds)
            const colorClass = gradeColor[grade]
            return (
              <div key={m.id} className="grove-card flex items-center gap-3">
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
                <span className={`text-xs px-3 py-1 rounded-full border font-semibold shrink-0 ${colorClass}`}>
                  {grade}
                </span>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="grove-card text-center py-8 text-zinc-600">Niciun rezultat</div>
          )}
        </div>
      )}
    </div>
  )
}
