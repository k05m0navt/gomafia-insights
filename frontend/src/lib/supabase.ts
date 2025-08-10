// =============================================================================
// SUPABASE CLIENT CONFIGURATION
// =============================================================================
// This file sets up Supabase clients for authentication, real-time features,
// and server-side operations

import { createClient } from '@supabase/supabase-js'

// =============================================================================
// ENVIRONMENT VARIABLES VALIDATION
// =============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// =============================================================================
// CLIENT-SIDE SUPABASE CLIENT
// =============================================================================

/**
 * Client-side Supabase client for authentication and real-time features
 * Use this in React components and client-side code
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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

// =============================================================================
// SERVER-SIDE SUPABASE CLIENT
// =============================================================================

/**
 * Server-side Supabase client with service role key
 * Use this in API routes and server-side operations
 * WARNING: Never expose this client to the frontend
 */
export const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Test Supabase connection
 */
export async function testSupabaseConnection() {
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
 * Get current authenticated user
 */
export async function getCurrentUser() {
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
 * Sign in with email and password
 */
export async function signInWithEmailAndPassword(email: string, password: string) {
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
 * Sign out current user
 */
export async function signOut() {
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
 * Subscribe to real-time changes for a specific table
 */
export function subscribeToTable(
  table: string, 
  callback: (payload: any) => void,
  filter?: string
) {
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
 * Subscribe to player updates
 */
export function subscribeToPlayerUpdates(
  playerId: string, 
  callback: (payload: any) => void
) {
  return subscribeToTable(
    'players',
    callback,
    `go_mafia_id=eq.${playerId}`
  )
}

/**
 * Subscribe to tournament updates
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

export type SupabaseClient = typeof supabase
export type SupabaseAdminClient = typeof supabaseAdmin

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