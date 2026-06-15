import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { canGiveFines, canManageRequests, isFullLeadership } from '@/lib/discord'

export async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return { session: null, error: NextResponse.json({ error: 'Neautentificat' }, { status: 401 }) }
  }
  return { session, error: null }
}

export async function requireLeadership() {
  const { session, error } = await requireAuth()
  if (error || !session) return { session: null, error: error ?? NextResponse.json({ error: 'Neautentificat' }, { status: 401 }) }
  if (!isFullLeadership(session.user.roleIds || [])) {
    return { session: null, error: NextResponse.json({ error: 'Acces interzis — Leadership only' }, { status: 403 }) }
  }
  return { session, error: null }
}

export async function requireFineGiver() {
  const { session, error } = await requireAuth()
  if (error || !session) return { session: null, error: error ?? NextResponse.json({ error: 'Neautentificat' }, { status: 401 }) }
  if (!canGiveFines(session.user.roleIds || [])) {
    return { session: null, error: NextResponse.json({ error: 'Acces interzis' }, { status: 403 }) }
  }
  return { session, error: null }
}

export async function requireRequestManager() {
  const { session, error } = await requireAuth()
  if (error || !session) return { session: null, error: error ?? NextResponse.json({ error: 'Neautentificat' }, { status: 401 }) }
  if (!canManageRequests(session.user.roleIds || [])) {
    return { session: null, error: NextResponse.json({ error: 'Acces interzis' }, { status: 403 }) }
  }
  return { session, error: null }
}
