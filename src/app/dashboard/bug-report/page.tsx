'use client'
import { useState, useEffect, useCallback } from 'react'
import { Bug, Plus, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { useSession } from 'next-auth/react'

const LEADERSHIP_ROLES = ['955126889171804170', '955126890472022066']

const STATUS_CONFIG = {
  OPEN:        { label: 'Deschis',     color: 'text-red-400 bg-red-500/10 border-red-500/20',    icon: AlertCircle  },
  IN_PROGRESS: { label: 'În lucru',    color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: Clock },
  RESOLVED:    { label: 'Rezolvat',    color: 'text-grove-green bg-grove-dim border-grove-border', icon: CheckCircle },
}

interface BugReport {
  id: string; title: string; description: string
  mediaUrls: string[]; status: keyof typeof STATUS_CONFIG
  createdAt: string
  user?: { username: string; avatar: string | null }
}

export default function BugReportPage() {
  const { data: session }   = useSession()
  const [tab, setTab]       = useState<'raporteaza'|'rapoartele-mele'|'toate'>('raporteaza')
  const [reports, setReports]     = useState<BugReport[]>([])
  const [myReports, setMyReports] = useState<BugReport[]>([])
  const [loading, setLoading]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState('')

  const [title, setTitle]         = useState('')
  const [description, setDesc]    = useState('')
  const [mediaUrls, setMediaUrls] = useState('')

  const roleIds    = session?.user.roleIds || []
  const isLeader   = roleIds.some((r: string) => LEADERSHIP_ROLES.includes(r))

  const showMsg = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 4000) }

  const loadMine = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/bug-reports')
    const d = await r.json()
    setMyReports(d.reports || [])
    setLoading(false)
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/bug-reports?all=true')
    const d = await r.json()
    setReports(d.reports || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (tab === 'rapoartele-mele') loadMine()
    if (tab === 'toate') loadAll()
  }, [tab, loadMine, loadAll])

  const submit = async () => {
    if (!title.trim() || !description.trim()) { showMsg('⚠️ Completează titlul și descrierea!'); return }
    setSaving(true)

    const urls = mediaUrls.split('\n').map(u => u.trim()).filter(Boolean)

    const r = await fetch('/api/bug-reports', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title, description, mediaUrls: urls }),
    })

    if (r.ok) {
      showMsg('✅ Bug report trimis! Mulțumim!')
      setTitle(''); setDesc(''); setMediaUrls('')
    } else {
      showMsg('❌ Eroare la trimitere')
    }
    setSaving(false)
  }

  const changeStatus = async (id: string, status: string) => {
    await fetch('/api/bug-reports', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, status }),
    })
    await loadAll()
  }

  const remove = async (id: string) => {
    if (!confirm('Ștergi bug report-ul?')) return
    await fetch('/api/bug-reports', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    showMsg('🗑️ Șters!')
    if (tab === 'toate') await loadAll()
    else await loadMine()
  }

  const tabs = [
    { key: 'raporteaza',      label: '🐛 Raportează Bug' },
    { key: 'rapoartele-mele', label: '📋 Rapoartele Mele' },
    ...(isLeader ? [{ key: 'toate', label: '🔧 Toate Rapoartele' }] : []),
  ] as const

  const ReportCard = ({ r, showUser }: { r: BugReport; showUser: boolean }) => {
    const cfg = STATUS_CONFIG[r.status]
    const Icon = cfg.icon
    return (
      <div className="grove-card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {showUser && r.user && (
              <div className="text-xs text-zinc-500 mb-1">👤 {r.user.username}</div>
            )}
            <div className="text-white font-bold text-base">{r.title}</div>
            <div className="text-zinc-400 text-sm mt-1 whitespace-pre-wrap">{r.description}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-semibold ${cfg.color}`}>
              <Icon size={11} /> {cfg.label}
            </span>
          </div>
        </div>

        {r.mediaUrls.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-zinc-600 uppercase tracking-widest">Fișiere atașate</div>
            <div className="flex flex-wrap gap-2">
              {r.mediaUrls.map((url, i) => {
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
                const isVideo = /\.(mp4|mov|webm|avi)$/i.test(url)
                return isImage ? (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt="" className="h-20 w-20 object-cover rounded-lg border border-dark-border hover:border-grove-border transition-colors" />
                  </a>
                ) : (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-dark-hover border border-dark-border text-zinc-400 hover:text-grove-green text-xs transition-colors">
                    {isVideo ? '🎬' : '🔗'} Fișier {i + 1}
                  </a>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-zinc-700">
            {format(new Date(r.createdAt), 'dd MMM yyyy HH:mm', { locale: ro })}
          </span>
          {isLeader && (
            <div className="flex items-center gap-2">
              <select
                value={r.status}
                onChange={e => changeStatus(r.id, e.target.value)}
                className="text-xs bg-dark-hover border border-dark-border rounded-lg px-2 py-1 text-zinc-400 focus:outline-none focus:border-grove-border"
              >
                <option value="OPEN">Deschis</option>
                <option value="IN_PROGRESS">În lucru</option>
                <option value="RESOLVED">Rezolvat</option>
              </select>
              <button onClick={() => remove(r.id)}
                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20">
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-slide-up max-w-2xl">
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <Bug size={28} className="text-red-400" /> Bug Report
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Raportează probleme sau erori găsite pe site</p>
      </div>

      <div className="flex gap-1 border-b border-dark-border">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-4 py-2.5 text-sm font-medium transition-all ${
              tab === t.key ? 'text-grove-green border-b-2 border-grove-green' : 'text-zinc-500 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {msg && <div className="p-3 bg-dark-hover rounded-xl text-sm text-grove-green border border-grove-border">{msg}</div>}

      {tab === 'raporteaza' && (
        <div className="grove-card space-y-4">
          <h2 className="text-sm font-semibold text-grove-green uppercase tracking-widest">+ Raportează un Bug</h2>
          <div>
            <label className="grove-label">Titlu *</label>
            <input className="grove-input" placeholder="ex: Roata nu se învârte"
              value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="grove-label">Descriere *</label>
            <textarea className="grove-input min-h-[100px] resize-none" placeholder="Descrie problema în detaliu — ce ai făcut, ce s-a întâmplat, ce ar trebui să se întâmple..."
              value={description} onChange={e => setDesc(e.target.value)} />
          </div>
          <div>
            <label className="grove-label">Link-uri media (poze/video) — unul per linie</label>
            <textarea className="grove-input min-h-[80px] resize-none font-mono text-sm"
              placeholder={"https://imgur.com/poza.png\nhttps://youtube.com/clip/..."}
              value={mediaUrls} onChange={e => setMediaUrls(e.target.value)} />
            <p className="text-xs text-zinc-600 mt-1">Încarcă pozele pe Imgur sau alt site și pune link-ul aici</p>
          </div>
          <button onClick={submit} disabled={saving}
            className="grove-btn flex items-center gap-2 text-sm w-full justify-center">
            <Plus size={14} /> {saving ? 'Se trimite...' : 'Trimite Bug Report'}
          </button>
        </div>
      )}

      {tab === 'rapoartele-mele' && (
        <div className="space-y-3">
          {loading ? (
            <div className="grove-card text-center py-10 text-zinc-600">Se încarcă...</div>
          ) : myReports.length === 0 ? (
            <div className="grove-card text-center py-12">
              <Bug size={40} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-600 text-sm">Nu ai trimis niciun bug report încă.</p>
            </div>
          ) : (
            myReports.map(r => <ReportCard key={r.id} r={r} showUser={false} />)
          )}
        </div>
      )}

      {tab === 'toate' && isLeader && (
        <div className="space-y-3">
          {loading ? (
            <div className="grove-card text-center py-10 text-zinc-600">Se încarcă...</div>
          ) : reports.length === 0 ? (
            <div className="grove-card text-center py-12">
              <CheckCircle size={40} className="text-grove-green/30 mx-auto mb-3" />
              <p className="text-zinc-600 text-sm">Niciun bug report! 🎉</p>
            </div>
          ) : (
            <>
              <div className="flex gap-3 text-xs text-zinc-500">
                <span>Total: <strong className="text-white">{reports.length}</strong></span>
                <span>Deschise: <strong className="text-red-400">{reports.filter(r => r.status === 'OPEN').length}</strong></span>
                <span>În lucru: <strong className="text-yellow-400">{reports.filter(r => r.status === 'IN_PROGRESS').length}</strong></span>
                <span>Rezolvate: <strong className="text-grove-green">{reports.filter(r => r.status === 'RESOLVED').length}</strong></span>
              </div>
              {reports.map(r => <ReportCard key={r.id} r={r} showUser={true} />)}
            </>
          )}
        </div>
      )}
    </div>
  )
}
