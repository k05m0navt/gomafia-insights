// =============================================================================
// TEST API ROUTE - Foundation Phase Verification
// =============================================================================
// This route tests the database connections and validates our setup

import { NextRequest, NextResponse } from 'next/server'
import { testDatabaseConnection, getDatabaseStats } from '@/lib/prisma'
import { testSupabaseConnection } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Test Prisma connection
    const prismaTest = await testDatabaseConnection()
    
    // Test Supabase connection (this will fail until database is set up)
    const supabaseTest = await testSupabaseConnection()
    
    // Get database stats (this will return zeros until data is available)
    const dbStats = await getDatabaseStats()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        prisma: prismaTest,
        supabase: supabaseTest,
      },
      database: {
        stats: dbStats,
        schema: {
          models: [
            'Player',
            'Game', 
            'GameParticipation',
            'Tournament',
            'TournamentPlayerStats',
            'Club',
            'ClubMembership',
            'NicknameHistory',
            'IdentityResolution',
            'ManualReviewQueue',
            'CollectionLog'
          ],
          enums: [
            'PlayerRole',
            'TeamSide', 
            'GameOutcome',
            'TeamOutcome',
            'GameType',
            'GameFormat',
            'GameStatus',
            'WinCondition',
            'TournamentType',
            'TournamentFormat',
            'TournamentStatus',
            'ClubRole',
            'ResolutionType',
            'ReviewStatus'
          ]
        }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasDirectUrl: !!process.env.DIRECT_URL,
      },
      phase: {
        current: "Foundation Phase",
        status: "Database foundation and Prisma setup",
        nextPhase: "Core Phase - Data collection service implementation"
      }
    })
  } catch (error) {
    console.error('Test API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      phase: {
        current: "Foundation Phase", 
        status: "Setup validation failed"
      }
    }, { status: 500 })
  }
}

// Support OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
} 