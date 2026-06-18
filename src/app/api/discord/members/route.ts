import { NextResponse } from 'next/server'
import { requireLeadership } from '@/lib/middleware'
import { syncDiscordMembers } from '@/lib/syncMembers'

export async function GET() {
  const { error } = await requireLeadership()
  if (error) return error

  try {
    const result = await syncDiscordMembers()
    return NextResponse.json({ success: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Eroare sincronizare' }, { status: 500 })
  }
}
