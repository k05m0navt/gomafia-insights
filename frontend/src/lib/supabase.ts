// =============================================================================
// SUPABASE CLIENT CONFIGURATION (LAZY)
// =============================================================================
// Provides lazy-initialized Supabase clients to avoid build-time env errors and
// ensure client-only usage where appropriate.

import { createClient } from '@supabase/supabase-js'

// =============================================================================
// LAZY CLIENT CACHES
// =============================================================================

let cachedSupabaseClient: ReturnType<typeof createClient> | null = null
let cachedSupabaseAdminClient: ReturnType<typeof createClient> | null = null

// =============================================================================
// LAZY ACCESSORS
// =============================================================================

/**
 * Returns a lazily initialized client-side Supabase client, or null if env
 * variables are not configured. Call only from client or guarded code paths.
 */
export function getSupabase() {
  if (cachedSupabaseClient) return cachedSupabaseClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  cachedSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 2
      }
    }
  })

  return cachedSupabaseClient
}

/**
 * Returns a lazily initialized server-side Supabase admin client, or null if
 * the service role key is not configured. Never expose this to the frontend.
 */
export function getSupabaseAdmin() {
  if (cachedSupabaseAdminClient) return cachedSupabaseAdminClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null
  }

  cachedSupabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  return cachedSupabaseAdminClient
}

// =============================================================================
// HELPER FUNCTIONS (GUARDED)
// =============================================================================

/**
 * Test Supabase connection using a lightweight query.
 */
export async function testSupabaseConnection() {
  const supabase = getSupabase()
  if (!supabase) {
    return {
      success: false,
      message: 'Supabase not configured (missing NEXT_PUBLIC_* env)'
    }
  }

  try {
    const { error } = await supabase.from('players').select('count').limit(1)
    if (error) {
      return {
        success: false,
        message: 'Supabase connection failed',
        error: error.message
      }
    }
    return { success: true, message: 'Supabase connection successful' }
  } catch (error) {
    return {
      success: false,
      message: 'Supabase connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get current authenticated user (client-side usage only).
 */
export async function getCurrentUser() {
  const supabase = getSupabase()
  if (!supabase) return null

  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Error getting user:', error)
      return null
    }
    return user
  } catch (error) {
    console.error('Error getting user:', error)
    return null
  }
}

/**
 * Sign in with email and password (client-side usage only).
 */
export async function signInWithEmailAndPassword(email: string, password: string) {
  const supabase = getSupabase()
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, user: data.user, session: data.session }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Sign out current user (client-side usage only).
 */
export async function signOut() {
  const supabase = getSupabase()
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Subscribe to real-time changes for a specific table. Returns the subscription
 * object or null if Supabase is not configured.
 */
export function subscribeToTable(
  table: string,
  callback: (payload: any) => void,
  filter?: string
) {
  const supabase = getSupabase()
  if (!supabase) return null

  const subscription = supabase
    .channel(`realtime-${table}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
        ...(filter && { filter })
      },
      callback
    )
    .subscribe()

  return subscription
}

/**
 * Subscribe to player updates.
 */
export function subscribeToPlayerUpdates(
  playerId: string,
  callback: (payload: any) => void
) {
  return subscribeToTable('players', callback, `go_mafia_id=eq.${playerId}`)
}

/**
 * Subscribe to tournament updates.
 */
export function subscribeToTournamentUpdates(
  tournamentId: string,
  callback: (payload: any) => void
) {
  return subscribeToTable(
    'game_participations',
    callback,
    `tournament_id=eq.${tournamentId}`
  )
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type SupabaseClient = NonNullable<ReturnType<typeof getSupabase>>
export type SupabaseAdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>

export interface AuthUser {
  id: string
  email?: string
  user_metadata?: {
    [key: string]: any
  }
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  user: AuthUser
} 