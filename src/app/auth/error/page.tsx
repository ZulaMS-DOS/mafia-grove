'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function ErrorContent() {
  const params = useSearchParams()
  const error = params.get('error')

  const messages: Record<string, string> = {
    not_in_guild: 'Nu ești pe serverul Discord Mafia Grove.',
    bot_error:    'Eroare la verificarea serverului. Încearcă din nou.',
    default:      'A apărut o eroare la autentificare.',
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#000', color:'#fff', fontFamily:'sans-serif' }}>
      <div style={{ background:'#0a0a0a', border:'1px solid #1a1a1a', borderRadius:'12px', padding:'40px', maxWidth:'400px', textAlign:'center' }}>
        <div style={{ fontSize:'48px', marginBottom:'16px' }}>🚫</div>
        <h1 style={{ color:'#00ff66', marginBottom:'16px' }}>Acces Refuzat</h1>
        <p style={{ color:'#888', marginBottom:'24px' }}>
          {messages[error || 'default'] || messages.default}
        </p>
        <a href="/auth/login" style={{ background:'#00ff66', color:'#000', padding:'12px 24px', borderRadius:'8px', textDecoration:'none', fontWeight:'bold' }}>
          Înapoi la Login
        </a>
      </div>
    </div>
  )
}

export default function AuthError() {
  return (
    <Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#000',color:'#00ff66'}}>Se încarcă...</div>}>
      <ErrorContent />
    </Suspense>
  )
}
