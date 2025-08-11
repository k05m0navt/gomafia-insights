'use client'

import { useEffect } from 'react'
import { useRealtimeConnection } from '../../hooks/useRealtime'
import { getSupabase } from '../../lib/supabase'

export function RealtimeBootstrap() {
  const { connect } = useRealtimeConnection()

  useEffect(() => {
    // Only attempt connection if Supabase is configured
    if (getSupabase()) {
      void connect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
