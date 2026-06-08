'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Shield, Users, Info } from 'lucide-react'

interface WhitelistEntry {
  id:        string
  discordId: string
  username?: string
  addedBy:   string
  createdAt: string
}

export default function WhitelistPage() {
  const [entries,   setEntries]   = useState<WhitelistEntry[]>([])
  const [discordId, setDiscordId] = useState('')
  const [username,  setUsername]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [message,   setMessage]   = useState<{ text: string; ok: boolean } | null>(null)

  async function load() {
    const r    = await fetch('/api/whitelist')
    const data = await r.json()
    setEntries(data.whitelist || [])
  }

  useEffect(() => { load() }, [])

  function showMsg(text: string, ok: boolean) {
    setMessage({ text, ok })
    setTimeout(() => setMessage(null), 3000)
  }

  async function add() {
    if (!discordId.trim()) { showMsg('Introdu un Discord ID!', false); return }
    setLoading(true)
    const r = await fetch('/api/whitelist', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ discordId: discordId.trim(), username: username.trim() || undefined }),
    })
    const data = await r.json()
    setLoading(false)
    if (r.ok) {
      setDiscordId('')
      setUsername('')
      showMsg('✅ Adăugat cu succes!', true)
      load()
    } else {
      showMsg(`❌ ${data.error}`, false)
    }
  }

  async function remove(id: string) {
    await fetch(`/api/whitelist/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#00ff66]/10 border border-[#00ff66]/20 flex items-center justify-center">
          <Shield size={20} className="text-[#00ff66]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Whitelist Acces</h1>
          <p className="text-gray-400 text-sm">Controlează cine poate accesa site-ul după Discord ID</p>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-[#00ff66]/5 border border-[#00ff66]/20 rounded-xl p-4 flex gap-3">
        <Info size={18} className="text-[#00ff66] mt-0.5 flex-shrink-0" />
        <div className="text-sm text-gray-300 space-y-1">
          <p>
            <strong className="text-white">Dacă lista are intrări:</strong> doar persoanele din listă
            + Leadership pot accesa site-ul, chiar dacă nu sunt pe serverul Discord.
          </p>
          <p>
            <strong className="text-white">Dacă lista e goală:</strong> oricine de pe server poate accesa.
          </p>
          <p className="text-xs text-gray-500">
            Discord ID: click dreapta pe un user în Discord → Copiază ID (Developer Mode activat)
          </p>
        </div>
      </div>

      {/* Formular adaugare */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Plus size={18} className="text-[#00ff66]" /> Adaugă persoană
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
              Discord ID <span className="text-red-400">*</span>
            </label>
            <input
              value={discordId}
              onChange={e => setDiscordId(e.target.value)}
              placeholder="ex: 123456789012345678"
              className="w-full bg-black border border-[#1a1a1a] rounded-lg px-4 py-2.5 text-white text-sm
                         focus:outline-none focus:border-[#00ff66]/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
              Nume (opțional — pentru identificare)
            </label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="ex: BigSmoke"
              className="w-full bg-black border border-[#1a1a1a] rounded-lg px-4 py-2.5 text-white text-sm
                         focus:outline-none focus:border-[#00ff66]/50 transition-colors"
            />
          </div>

          {message && (
            <p className={`text-sm ${message.ok ? 'text-[#00ff66]' : 'text-red-400'}`}>
              {message.text}
            </p>
          )}

          <button
            onClick={add}
            disabled={loading}
            className="flex items-center gap-2 bg-[#00ff66] text-black font-bold px-5 py-2.5
                       rounded-lg hover:bg-[#00ff66]/90 transition-colors disabled:opacity-50 text-sm"
          >
            <Plus size={16} />
            {loading ? 'Se adaugă...' : 'Adaugă în Whitelist'}
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#1a1a1a] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users size={18} className="text-[#00ff66]" />
            Persoane cu acces
          </h2>
          <span className="bg-[#00ff66]/10 text-[#00ff66] text-xs font-bold px-2.5 py-1 rounded-full border border-[#00ff66]/20">
            {entries.length}
          </span>
        </div>

        {entries.length === 0 ? (
          <div className="p-12 text-center">
            <Shield size={40} className="mx-auto mb-3 text-gray-700" />
            <p className="text-gray-500 text-sm">Lista e goală — toți membrii serverului pot accesa.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {entries.map(entry => (
              <div key={entry.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                <div>
                  <p className="text-white font-medium">{entry.username || '—'}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{entry.discordId}</p>
                  <p className="text-xs text-gray-700 mt-0.5">
                    {new Date(entry.createdAt).toLocaleDateString('ro-RO', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => remove(entry.id)}
                  className="text-red-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Elimină din whitelist"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
