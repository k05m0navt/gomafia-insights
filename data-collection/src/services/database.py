"""
Database service for GoMafia Analytics Data Collection.
Handles all interactions with Supabase PostgreSQL database.
"""
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import traceback
import os

from supabase import create_client, Client
from postgrest.exceptions import APIError

from ..config import config
from ..models import PlayerData, GameParticipationData, TournamentData, GameData
from ..models.base import ValidationResult

logger = logging.getLogger(__name__)


class DatabaseService:
    """
    Service class for all database operations.
    Provides methods to insert, update, and query data from Supabase.
    """
    
    def __init__(self):
        """Initialize database connection."""
        try:
            self.client: Client = create_client(
                config.database.supabase_url,
                config.database.supabase_key
            )
            logger.info("Database service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database service: {e}")
            raise
    
    async def test_connection(self) -> bool:
        """Test database connection."""
        try:
            # Allow skipping DB test for dry-run/dev via env var
            if os.environ.get('SKIP_DB_TEST') == '1':
                logger.info("Skipping database connection test (SKIP_DB_TEST=1)")
                return True
            # Simple query to test connection
            response = self.client.table('players').select('id').limit(1).execute()
            logger.info("Database connection test successful")
            return True
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False
    
    # =================================================================
    # PLAYER OPERATIONS
    # =================================================================
    
    def upsert_player(self, player_data: PlayerData) -> Optional[str]:
        """
        Insert or update player data using goMafiaId as unique key.
        Returns the player ID if successful, None if failed.
        """
        try:
            # Validate data before insertion
            validation = player_data.validate_data()
            if not validation.is_valid:
                logger.error(f"Player data validation failed: {validation.get_summary()}")
                return None
            
            # Convert to database format
            db_data = player_data.dict_for_supabase()
            
            # Map Python field names to database field names (snake_case)
            db_data = self._convert_player_fields_to_db(db_data)
            
            # Upsert using goMafiaId as conflict resolution
            response = self.client.table('players').upsert(
                db_data,
                on_conflict='goMafiaId'
            ).execute()
            
            if response.data:
                player_id = response.data[0]['id']
                logger.info(f"Successfully upserted player {player_data.current_nickname} (ID: {player_id})")
                return player_id
            else:
                logger.error(f"No data returned from player upsert for {player_data.current_nickname}")
                return None
                
        except APIError as e:
            logger.error(f"Database API error upserting player {player_data.current_nickname}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error upserting player {player_data.current_nickname}: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return None
    
    def get_player_by_go_mafia_id(self, go_mafia_id: int) -> Optional[Dict[str, Any]]:
        """Get player by their GoMafia ID."""
        try:
            response = self.client.table('players').select('*').eq('goMafiaId', go_mafia_id).execute()
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error fetching player with goMafiaId {go_mafia_id}: {e}")
            return None
    
    def batch_upsert_players(self, players: List[PlayerData]) -> Tuple[int, int]:
        """
        Batch upsert multiple players.
        Returns (successful_count, failed_count).
        """
        successful = 0
        failed = 0
        
        # Process in batches to avoid API limits
        batch_size = config.scraping.batch_size
        
        for i in range(0, len(players), batch_size):
            batch = players[i:i + batch_size]
            batch_data = []
            
            for player in batch:
                try:
                    # Validate each player
                    validation = player.validate_data()
                    if validation.is_valid:
                        db_data = self._convert_player_fields_to_db(player.dict_for_supabase())
                        batch_data.append(db_data)
                    else:
                        logger.warning(f"Skipping invalid player data: {validation.get_summary()}")
                        failed += 1
                except Exception as e:
                    logger.error(f"Error preparing player data: {e}")
                    failed += 1
            
            if batch_data:
                try:
                    response = self.client.table('players').upsert(
                        batch_data,
                        on_conflict='goMafiaId'
                    ).execute()
                    
                    if response.data:
                        successful += len(response.data)
                        logger.info(f"Successfully upserted batch of {len(response.data)} players")
                    else:
                        failed += len(batch_data)
                        
                except APIError as e:
                    logger.error(f"Database API error in batch upsert: {e}")
                    failed += len(batch_data)
                except Exception as e:
                    logger.error(f"Unexpected error in batch upsert: {e}")
                    failed += len(batch_data)
        
        logger.info(f"Batch player upsert completed: {successful} successful, {failed} failed")
        return successful, failed
    
    def _convert_player_fields_to_db(self, player_data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert Python field names to database field names for players."""
        field_mapping = {
            'go_mafia_id': 'goMafiaId',
            'current_nickname': 'currentNickname',
            'profile_url': 'profileUrl',
            'registered_year': 'registeredYear',
            'current_elo': 'currentElo',
            'table_elo': 'tableElo',
            'max_elo': 'maxElo',
            'games_played': 'gamesPlayed',
            'games_won': 'gamesWon',
            'win_rate': 'winRate',
            'average_points': 'averagePoints',
            'civilian_games': 'civilianGames',
            'mafia_games': 'mafiaGames',
            'don_games': 'donGames',
            'sheriff_games': 'sheriffGames',
            'civilian_win_rate': 'civilianWinRate',
            'mafia_win_rate': 'mafiaWinRate',
            'don_win_rate': 'donWinRate',
            'sheriff_win_rate': 'sheriffWinRate',
            'best_win_streak': 'bestWinStreak',
            'current_streak': 'currentStreak',
            'total_points': 'totalPoints',
            'awards_count': 'awardsCount',
            'last_game_at': 'lastGameAt',
            'last_tournament_at': 'lastTournamentAt',
            'is_active': 'isActive',
            'created_at': 'createdAt',
            'updated_at': 'updatedAt'
        }
        
        converted_data = {}
        for python_key, value in player_data.items():
            db_key = field_mapping.get(python_key, python_key)
            converted_data[db_key] = value
        
        return converted_data
    
    # =================================================================
    # TOURNAMENT OPERATIONS
    # =================================================================
    
    def upsert_tournament(self, tournament_data: TournamentData) -> Optional[str]:
        """Insert or update tournament data."""
        try:
            validation = tournament_data.validate_data()
            if not validation.is_valid:
                logger.error(f"Tournament data validation failed: {validation.get_summary()}")
                return None
            
            db_data = tournament_data.dict_for_supabase()
            db_data = self._convert_tournament_fields_to_db(db_data)
            
            # Upsert using goMafiaTournamentId if available, otherwise by name and dates
            if tournament_data.go_mafia_tournament_id:
                response = self.client.table('tournaments').upsert(
                    db_data,
                    on_conflict='goMafiaTournamentId'
                ).execute()
            else:
                # Check if tournament already exists by name and start date
                existing = self.client.table('tournaments').select('id').eq(
                    'name', tournament_data.name
                ).eq('startDate', tournament_data.start_date.isoformat()).execute()
                
                if existing.data:
                    # Update existing
                    db_data['id'] = existing.data[0]['id']
                    response = self.client.table('tournaments').upsert(db_data).execute()
                else:
                    # Insert new
                    response = self.client.table('tournaments').insert(db_data).execute()
            
            if response.data:
                tournament_id = response.data[0]['id']
                logger.info(f"Successfully upserted tournament {tournament_data.name} (ID: {tournament_id})")
                return tournament_id
            else:
                logger.error(f"No data returned from tournament upsert for {tournament_data.name}")
                return None
                
        except Exception as e:
            logger.error(f"Error upserting tournament {tournament_data.name}: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return None
    
    def _convert_tournament_fields_to_db(self, tournament_data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert Python field names to database field names for tournaments."""
        field_mapping = {
            'go_mafia_tournament_id': 'goMafiaTournamentId',
            'short_name': 'shortName',
            'start_date': 'startDate',
            'end_date': 'endDate',
            'registration_end': 'registrationEnd',
            'tournament_type': 'tournamentType',
            'max_participants': 'maxParticipants',
            'current_participants': 'currentParticipants',
            'chief_judge': 'chiefJudge',
            'current_round': 'currentRound',
            'total_rounds': 'totalRounds',
            'total_tables': 'totalTables',
            'entry_fee': 'entryFee',
            'prize_pool': 'prizePool',
            'vk_community': 'vkCommunity',
            'broadcast_link': 'broadcastLink',
            'created_at': 'createdAt',
            'updated_at': 'updatedAt'
        }
        
        converted_data = {}
        for python_key, value in tournament_data.items():
            db_key = field_mapping.get(python_key, python_key)
            converted_data[db_key] = value
        
        return converted_data
    
    # =================================================================
    # GAME OPERATIONS
    # =================================================================
    
    def upsert_game(self, game_data: GameData, tournament_id: Optional[str] = None) -> Optional[str]:
        """Insert or update game data."""
        try:
            validation = game_data.validate_data()
            if not validation.is_valid:
                logger.error(f"Game data validation failed: {validation.get_summary()}")
                return None
            
            db_data = game_data.dict_for_supabase()
            db_data = self._convert_game_fields_to_db(db_data)
            
            # Set tournament ID if provided
            if tournament_id:
                db_data['tournamentId'] = tournament_id
            
            # Upsert game
            response = self.client.table('games').upsert(db_data).execute()
            
            if response.data:
                game_id = response.data[0]['id']
                logger.info(f"Successfully upserted game (ID: {game_id})")
                return game_id
            else:
                logger.error("No data returned from game upsert")
                return None
                
        except Exception as e:
            logger.error(f"Error upserting game: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return None
    
    def _convert_game_fields_to_db(self, game_data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert Python field names to database field names for games."""
        field_mapping = {
            'go_mafia_game_id': 'goMafiaGameId',
            'table_number': 'tableNumber',
            'table_name': 'tableName',
            'moderator_name': 'moderatorName',
            'start_time': 'startTime',
            'end_time': 'endTime',
            'game_type': 'gameType',
            'game_format': 'gameFormat',
            'winning_team': 'winningTeam',
            'win_condition': 'winCondition',
            'tournament_id': 'tournamentId',
            'tournament_round': 'tournamentRound',
            'tournament_stage': 'tournamentStage',
            'player_count': 'playerCount',
            'mafia_count': 'mafiaCount',
            'civilian_count': 'civilianCount',
            'special_roles': 'specialRoles',
            'created_at': 'createdAt',
            'updated_at': 'updatedAt'
        }
        
        converted_data = {}
        for python_key, value in game_data.items():
            db_key = field_mapping.get(python_key, python_key)
            converted_data[db_key] = value
        
        return converted_data
    
    # =================================================================
    # GAME PARTICIPATION OPERATIONS
    # =================================================================
    
    def insert_game_participation(self, participation_data: GameParticipationData, 
                                 game_id: str, player_id: str) -> Optional[str]:
        """Insert game participation data."""
        try:
            validation = participation_data.validate_data()
            if not validation.is_valid:
                logger.error(f"Game participation validation failed: {validation.get_summary()}")
                return None
            
            db_data = participation_data.dict_for_supabase()
            db_data = self._convert_participation_fields_to_db(db_data)
            
            # Set foreign key references
            db_data['gameId'] = game_id
            db_data['playerId'] = player_id
            
            # Remove fields that shouldn't be in the database
            db_data.pop('player_go_mafia_id', None)
            db_data.pop('game_identifier', None)
            
            response = self.client.table('game_participations').insert(db_data).execute()
            
            if response.data:
                participation_id = response.data[0]['id']
                logger.info(f"Successfully inserted game participation (ID: {participation_id})")
                return participation_id
            else:
                logger.error("No data returned from game participation insert")
                return None
                
        except Exception as e:
            logger.error(f"Error inserting game participation: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return None
    
    def _convert_participation_fields_to_db(self, participation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert Python field names to database field names for game participation."""
        field_mapping = {
            'seat_position': 'seatPosition',
            'nickname_at_time': 'nicknameAtTime',
            'team_side': 'teamSide',
            'game_outcome': 'gameOutcome',
            'personal_outcome': 'personalOutcome',
            'base_points': 'basePoints',
            'bonus_points': 'bonusPoints',
            'penalty_points': 'penaltyPoints',
            'total_points': 'totalPoints',
            'elo_before': 'eloBefore',
            'elo_after': 'eloAfter',
            'elo_change': 'eloChange',
            'voting_accuracy': 'votingAccuracy',
            'night_actions': 'nightActions',
            'speech_quality': 'speechQuality',
            'game_start_time': 'gameStartTime',
            'game_end_time': 'gameEndTime',
            'game_duration': 'gameDuration',
            'tournament_id': 'tournamentId',
            'tournament_round': 'tournamentRound',
            'tournament_stage': 'tournamentStage',
            'data_source': 'dataSource',
            'created_at': 'createdAt',
            'updated_at': 'updatedAt'
        }
        
        converted_data = {}
        for python_key, value in participation_data.items():
            db_key = field_mapping.get(python_key, python_key)
            converted_data[db_key] = value
        
        return converted_data
    
    # =================================================================
    # COLLECTION LOGGING
    # =================================================================
    
    def log_collection_run(self, data_type: str, total_scraped: int, 
                          total_validated: int, total_inserted: int,
                          duration_minutes: float, success: bool,
                          error_message: Optional[str] = None) -> None:
        """Log a data collection run."""
        try:
            log_data = {
                'dataType': data_type,
                'totalScraped': total_scraped,
                'totalValidated': total_validated,
                'totalInserted': total_inserted,
                'durationMinutes': duration_minutes,
                'success': success,
                'errorMessage': error_message,
                'collectionTime': datetime.now().isoformat()
            }
            
            self.client.table('collection_logs').insert(log_data).execute()
            logger.info(f"Logged collection run: {data_type}")
            
        except Exception as e:
            logger.error(f"Error logging collection run: {e}")
    
    # =================================================================
    # UTILITY METHODS
    # =================================================================
    
    def get_recent_collection_stats(self, hours: int = 24) -> Dict[str, Any]:
        """Get recent collection statistics."""
        try:
            cutoff_time = datetime.now().timestamp() - (hours * 3600)
            cutoff_iso = datetime.fromtimestamp(cutoff_time).isoformat()
            
            response = self.client.table('collection_logs').select('*').gte(
                'collectionTime', cutoff_iso
            ).execute()
            
            if response.data:
                stats = {
                    'total_runs': len(response.data),
                    'successful_runs': sum(1 for r in response.data if r['success']),
                    'total_scraped': sum(r['totalScraped'] for r in response.data),
                    'total_inserted': sum(r['totalInserted'] for r in response.data),
                    'average_duration': sum(r['durationMinutes'] for r in response.data) / len(response.data)
                }
                return stats
            
            return {'total_runs': 0}
            
        except Exception as e:
            logger.error(f"Error getting collection stats: {e}")
            return {'error': str(e)} 