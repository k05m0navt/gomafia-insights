// =============================================================================
// PRISMA CLIENT CONFIGURATION
// =============================================================================
// This file sets up a singleton Prisma client instance to prevent multiple
// connections during development and ensure optimal connection pooling

import { PrismaClient } from '@/generated/prisma'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty',
})

// Prevent multiple instances during development
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Safely disconnect Prisma client
 */
export async function disconnectPrisma() {
  await prisma.$disconnect()
}

/**
 * Test database connection
 */
export async function testDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { success: true, message: 'Database connection successful' }
  } catch (error) {
    return { 
      success: false, 
      message: 'Database connection failed', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  try {
    const [
      playersCount,
      gamesCount,
      tournamentsCount,
      gameParticipationsCount
    ] = await Promise.all([
      prisma.player.count(),
      prisma.game.count(),
      prisma.tournament.count(),
      prisma.gameParticipation.count()
    ])

    return {
      players: playersCount,
      games: gamesCount,
      tournaments: tournamentsCount,
      gameParticipations: gameParticipationsCount,
    }
  } catch (error) {
    console.error('Failed to get database stats:', error)
    return null
  }
}

// Export types for use throughout the application
export type { 
  Player, 
  Game, 
  GameParticipation, 
  Tournament, 
  Club,
  NicknameHistory,
  TournamentPlayerStats,
  PlayerRole,
  TeamSide,
  GameOutcome,
  TeamOutcome,
  GameType,
  TournamentType,
  TournamentStatus
} from '@/generated/prisma' 