import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get recent games with tournament information - using startTime instead of createdAt
    const recentGames = await prisma.game.findMany({
      take: limit,
      orderBy: {
        startTime: 'desc'
      },
      include: {
        tournament: {
          select: {
            name: true,
            tournamentType: true
          }
        },
        participants: {
          select: {
            player: {
              select: {
                currentNickname: true
              }
            },
            role: true,
            personalOutcome: true
          }
        }
      }
    });

    // Get recent tournaments
    const recentTournaments = await prisma.tournament.findMany({
      take: Math.ceil(limit / 2),
      orderBy: {
        startDate: 'desc'
      },
      select: {
        id: true,
        name: true,
        tournamentType: true,
        status: true,
        startDate: true,
        _count: {
          select: {
            games: true,
            playerStats: true
          }
        }
      }
    });

    // Format the activity data
    const activities = [
      ...recentGames.map(game => ({
        id: `game-${game.id}`,
        type: 'game' as const,
        title: `Game #${game.id}`,
        description: game.tournament 
          ? `${game.tournament.name} - ${game.participants.length} players`
          : `Casual game - ${game.participants.length} players`,
        time: game.startTime.toISOString(),
        participants: game.participants.length,
        status: 'completed' as const,
        metadata: {
          tournamentType: game.tournament?.tournamentType,
          gameType: game.gameType,
          winningTeam: game.winningTeam
        }
      })),
      ...recentTournaments.map(tournament => ({
        id: `tournament-${tournament.id}`,
        type: 'tournament' as const,
        title: tournament.name,
        description: `${tournament.status} - ${tournament._count.games} games`,
        time: tournament.startDate.toISOString(),
        participants: tournament._count.playerStats,
        status: tournament.status.toLowerCase() as 'completed' | 'ongoing' | 'upcoming',
        metadata: {
          tournamentType: tournament.tournamentType,
          totalGames: tournament._count.games
        }
      }))
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
     .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: {
        activities,
        count: activities.length,
        timestamp: new Date().toISOString()
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch recent activity',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
