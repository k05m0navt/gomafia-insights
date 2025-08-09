import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get basic statistics for the dashboard
    const [
      totalPlayers,
      totalGames,
      activeTournaments,
      recentGames
    ] = await Promise.all([
      // Total registered players
      prisma.player.count(),
      
      // Total games played
      prisma.game.count(),
      
      // Active tournaments - using ACTIVE status
      prisma.tournament.count({
        where: {
          status: 'ACTIVE'
        }
      }),
      
      // Recent games (last 24 hours) - using startTime instead of createdAt
      prisma.game.count({
        where: {
          startTime: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    // Calculate average ELO rating
    const avgEloResult = await prisma.player.aggregate({
      _avg: {
        currentElo: true
      }
    });

    const stats = {
      totalPlayers,
      totalGames,
      activeTournaments,
      recentGames,
      averageElo: Math.round(avgEloResult._avg.currentElo || 0),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: stats
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
