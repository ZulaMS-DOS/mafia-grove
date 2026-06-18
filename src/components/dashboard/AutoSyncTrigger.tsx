'use client'
import { useEffect } from 'react'

export function AutoSyncTrigger() {
  useEffect(() => {
    fetch('/api/discord/auto-sync').catch(() => {})
  }, [])

  return null
}
