'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

const GRADE_OPTIONS = ['Recruit', 'Membru', 'Ofiter', 'Caporal', 'Sergent', 'Locotenent', 'Capitan', 'Consilier', 'Underboss', 'Boss']

interface Member {
  id: string
  discordId: string
  username: string
  avatar: string | null
  points: number
  roleIds: string[]
}

export default function GradePage() {
  const [members, setMembers]   = useState<Member[]>([])
  const [loading, setLoading]   = useState(true)
  const [grades, setGrades]     = useState<Record<string, string>>({})
  const [saving, setSaving]     = useState<string | null>(null)
  const [search, setSearch]     = useState('')
  const [msg, setMsg]           = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/members')
    const d = await r.json()
    setMembers(d.members || [])
    // Incarca grade salvate din localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('mg_grades') || '{}')
      setGrades(saved)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const setGrade = (userId: string, grade: string) => {
    const newGrades = { ...grades, [userId]: grade }
    setGrades(newGrades)
    try { localStorage.setItem('mg_grades', JSON.stringify(newGrades)) } catch {}
    setSaving(userId)
    setTimeout(() => {
      setSaving(null)
      setMsg(`✅ Grad setat pentru ${members.find(m => m.id === userId)?.username}!`)
      setTimeout(() => setMsg(''), 3000)
    }, 600)
  }

  const filtered = members.filter(m =>
    m.username.toLowerCase().includes(search.toLowerCase())
  )

  const gradeColor: Record<string, string> = {
    'Boss':        'text-red-400 border-red-500/30 bg-red-500/10',
    'Underboss':   'text-orange-400 border-orange-500/30 bg-orange-500/10',
    'Consilier':   'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    'Capitan':     'text-grove-green border-grove-border bg-grove-dim',
    'Locotenent':  'text-blue-400 border-blue-500/30 bg-blue-500/10',
    'Sergent':     'text-purple-400 border-purple-500/30 bg-purple-500/10',
    'Caporal':     'text-pink-400 border-pink-500/30 bg-pink-500/10',
    'Ofiter':      'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    'Membru':      'text-zinc-300 border-zinc-500/30 bg-zinc-500/10',
    'Recruit':     'text-zinc-500 border-zinc-700/30 bg-zinc-700/10',
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-3xl font-black text-white">Grade Membri</h1>
        <p className="text-zinc-500 text-sm mt-1">Setează gradul fiecărui membru în organizație</p>
      </div>

      {msg && (
        <div className="p-3 bg-grove-dim border border-grove-border rounded-xl text-grove-green text-sm">
          {msg}
        </div>
      )}

      {/* Search */}
      <div className="grove-card p-3">
        <input
          type="text"
          className="grove-input"
          placeholder="🔍 Caută după username..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Lista membri */}
      {loading ? (
        <div className="grove-card text-center py-10 text-zinc-600">Se încarcă...</div>
      ) : filtered.length === 0 ? (
        <div className="grove-card text-center py-10 text-zinc-600">Niciun membru găsit</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => {
            const currentGrade = grades[m.id] || 'Recruit'
            const colorClass   = gradeColor[currentGrade] || gradeColor['Recruit']

            return (
              <div key={m.id} className="grove-card flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full border-2 border-dark-border overflow-hidden shrink-0 bg-dark-muted flex items-center justify-center">
                  {m.avatar
                    ? <Image
                        src={`https://cdn.discordapp.com/avatars/${m.discordId}/${m.avatar}.png`}
                        alt={m.username}
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    : <span className="text-lg">👤</span>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm truncate">{m.username}</div>
                  <div className="text-xs text-zinc-600">{m.points} pts</div>
                </div>

                {/* Grad curent */}
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium shrink-0 hidden sm:block ${colorClass}`}>
                  {currentGrade}
                </span>

                {/* Select grad */}
                <select
                  value={currentGrade}
                  onChange={e => setGrade(m.id, e.target.value)}
                  className="grove-select w-36 shrink-0 text-sm py-2"
                >
                  {GRADE_OPTIONS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>

                {/* Status salvare */}
                {saving === m.id && (
                  <div className="w-4 h-4 border-2 border-grove-green/30 border-t-grove-green rounded-full animate-spin shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="text-xs text-zinc-700 text-center pb-4">
        Gradele se salvează local în browser. Pentru sincronizare completă adaugă un câmp în DB.
      </div>
    </div>
  )
}
