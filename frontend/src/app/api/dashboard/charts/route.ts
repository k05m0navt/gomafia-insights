import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '30'; // days
    const days = parseInt(timeframe);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get games in timeframe for counting
    const gamesInTimeframe = await prisma.game.findMany({
      where: {
        startTime: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        startTime: true
      }
    });

    // Role distribution from game participations
    const roleDistribution = await prisma.gameParticipation.groupBy({
      by: ['role'],
      _count: {
        role: true
      },
      where: {
        game: {
          startTime: {
            gte: startDate,
            lte: endDate
          }
        }
      }
    });

    // Win rates by team side - simplified query
    const winRates = await prisma.gameParticipation.groupBy({
      by: ['teamSide', 'personalOutcome'],
      _count: {
        id: true
      },
      where: {
        game: {
          startTime: {
            gte: startDate,
            lte: endDate
          }
        }
      }
    });

    // Get top players by game participation for tournament participation chart
    const topPlayers = await prisma.gameParticipation.groupBy({
      by: ['playerId'],
      _count: {
        playerId: true
      },
      orderBy: {
        _count: {
          playerId: 'desc'
        }
      },
      take: 5
    });

    // Get player names for the top players
    const playerNames = await prisma.player.findMany({
      where: {
        id: {
          in: topPlayers.map(p => p.playerId)
        }
      },
      select: {
        id: true,
        currentNickname: true
      }
    });

    // Process and format the data for charts
    const chartData = {
      gamesOverTime: processGamesOverTime(gamesInTimeframe, days),
      roleDistribution: processRoleDistribution(roleDistribution),
      winRates: processWinRates(winRates),
      tournamentParticipation: processTournamentParticipation(topPlayers, playerNames),
      metadata: {
        timeframe: days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        generatedAt: new Date().toISOString()
      }
    };

    return NextResponse.json({
      success: true,
      data: chartData
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching chart data:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch chart data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper functions to process the data
function processGamesOverTime(games: any[], days: number) {
  const labels = [];
  const values = [];
  
  if (days <= 7) {
    // Daily labels for week or less
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      
      const dayGames = games.filter(game => {
        const gameDate = new Date(game.startTime);
        return gameDate.toDateString() === date.toDateString();
      });
      values.push(dayGames.length);
    }
  } else {
    // Weekly labels for longer periods
    const weeksBack = Math.ceil(days / 7);
    for (let i = weeksBack - 1; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // End of week
      
      labels.push(`Week ${weeksBack - i}`);
      
      const weekGames = games.filter(game => {
        const gameDate = new Date(game.startTime);
        return gameDate >= weekStart && gameDate <= weekEnd;
      });
      values.push(weekGames.length);
    }
  }
  
  return { labels, values };
}

function processRoleDistribution(data: any[]) {
  const roleMap = data.reduce((acc, item) => {
    acc[item.role] = item._count.role;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    labels: Object.keys(roleMap),
    values: Object.values(roleMap)
  };
}

function processWinRates(data: any[]) {
  const mafiaWins = data.filter(item => 
    item.teamSide === 'MAFIA' && item.personalOutcome === 'WON'
  ).reduce((sum, item) => sum + item._count.id, 0);
  
  const townWins = data.filter(item => 
    item.teamSide === 'TOWN' && item.personalOutcome === 'WON'
  ).reduce((sum, item) => sum + item._count.id, 0);
  
  const totalGames = mafiaWins + townWins;
  
  return {
    labels: ['Mafia Win Rate', 'Town Win Rate'],
    values: totalGames > 0 ? [
      Math.round((mafiaWins / totalGames) * 100),
      Math.round((townWins / totalGames) * 100)
    ] : [0, 0]
  };
}

function processTournamentParticipation(topPlayers: any[], playerNames: any[]) {
  const nameMap = playerNames.reduce((acc, player) => {
    acc[player.id] = player.currentNickname;
    return acc;
  }, {} as Record<string, string>);

  return {
    labels: topPlayers.map(p => nameMap[p.playerId] || 'Unknown Player'),
    values: topPlayers.map(p => p._count.playerId)
  };
}
