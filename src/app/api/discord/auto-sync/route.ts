import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'
import { syncDiscordMembers } from '@/lib/syncMembers'

const SYNC_INTERVAL_MS = 5 * 60 * 1000

let lastSyncTime = 0
let syncInProgress = false

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const now = Date.now()

  if (now - lastSyncTime > SYNC_INTERVAL_MS && !syncInProgress) {
    syncInProgress = true
    try {
      await syncDiscordMembers()
      lastSyncTime = now
    } catch (e) {
      // esecul e silentios
    } finally {
      syncInProgress = false
    }
    return NextResponse.json({ synced: true })
  }

  return NextResponse.json({ synced: false, nextSyncIn: SYNC_INTERVAL_MS - (now - lastSyncTime) })
}
