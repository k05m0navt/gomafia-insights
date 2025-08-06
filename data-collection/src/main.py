"""
Main data collection orchestrator for GoMafia Analytics.
Coordinates scraping, validation, and database operations.
"""
import asyncio
import sys
import traceback
from datetime import datetime
from typing import List, Dict, Any, Optional
import logging

from .config import config
from .services import DatabaseService, setup_logging
from .services.logger import get_collector_logger
from .collectors import BaseScraper
from .models import PlayerData, TournamentData, GameData, GameParticipationData

logger = logging.getLogger('gomafia_collector.main')


class DataCollectionOrchestrator:
    """
    Main orchestrator for data collection operations.
    Coordinates scrapers, validators, and database operations.
    """
    
    def __init__(self):
        """Initialize the collection orchestrator."""
        self.db_service = DatabaseService()
        self.collection_logger = get_collector_logger('orchestrator')
        self.is_running = False
        
        # Collection statistics
        self.session_stats = {
            'start_time': None,
            'end_time': None,
            'collections_run': 0,
            'total_scraped': 0,
            'total_validated': 0,
            'total_inserted': 0,
            'total_errors': 0,
            'scraper_stats': {}
        }
    
    async def initialize(self) -> bool:
        """
        Initialize the orchestrator and verify connections.
        
        Returns:
            True if initialization successful, False otherwise
        """
        try:
            logger.info("Initializing Data Collection Orchestrator")
            
            # Validate configuration
            if not config.validate_config():
                logger.error("Configuration validation failed")
                return False
            
            # Test database connection
            if not await self.db_service.test_connection():
                logger.error("Database connection test failed")
                return False
            
            logger.info("Data Collection Orchestrator initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize orchestrator: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return False
    
    def start_collection_session(self, session_type: str) -> None:
        """Start a new collection session."""
        self.session_stats['start_time'] = datetime.now()
        self.session_stats['collections_run'] = 0
        self.session_stats['total_scraped'] = 0
        self.session_stats['total_validated'] = 0
        self.session_stats['total_inserted'] = 0
        self.session_stats['total_errors'] = 0
        self.session_stats['scraper_stats'] = {}
        
        self.collection_logger.start_collection(session_type)
        self.is_running = True
        
        logger.info(f"Started collection session: {session_type}")
    
    def end_collection_session(self, session_type: str) -> Dict[str, Any]:
        """End the current collection session and return summary."""
        self.session_stats['end_time'] = datetime.now()
        self.is_running = False
        
        summary = self.collection_logger.finish_collection(session_type)
        
        # Add session-specific stats
        if self.session_stats['start_time']:
            duration = (self.session_stats['end_time'] - self.session_stats['start_time']).total_seconds() / 60
            summary.update({
                'session_duration_minutes': round(duration, 2),
                'collections_run': self.session_stats['collections_run'],
                'total_scraped': self.session_stats['total_scraped'],
                'total_validated': self.session_stats['total_validated'],
                'total_inserted': self.session_stats['total_inserted'],
                'total_errors': self.session_stats['total_errors'],
                'scraper_performance': self.session_stats['scraper_stats']
            })
        
        # Log to database
        try:
            self.db_service.log_collection_run(
                data_type=session_type,
                total_scraped=self.session_stats['total_scraped'],
                total_validated=self.session_stats['total_validated'],
                total_inserted=self.session_stats['total_inserted'],
                duration_minutes=summary.get('session_duration_minutes', 0),
                success=summary.get('errors', 0) == 0,
                error_message=None if summary.get('errors', 0) == 0 else f"{summary.get('errors', 0)} errors occurred"
            )
        except Exception as e:
            logger.error(f"Failed to log collection run to database: {e}")
        
        logger.info(f"Collection session completed: {session_type}")
        logger.info(f"Session summary: {summary}")
        
        return summary
    
    async def collect_players(self, player_ids: Optional[List[int]] = None, 
                             limit: Optional[int] = None) -> Dict[str, Any]:
        """
        Collect player data from GoMafia.pro.
        
        Args:
            player_ids: Specific player IDs to collect (if None, collect from leaderboard)
            limit: Maximum number of players to collect
            
        Returns:
            Collection results summary
        """
        collection_type = "player_collection"
        self.start_collection_session(collection_type)
        
        scraped_players = []
        validated_players = []
        inserted_count = 0
        
        try:
            # TODO: Implement PlayerScraper
            # For now, create a placeholder that demonstrates the flow
            logger.info("Starting player data collection")
            
            # Placeholder: In real implementation, use PlayerScraper
            sample_player_data = [
                {
                    'go_mafia_id': 3170,
                    'current_nickname': 'TestPlayer',
                    'profile_url': 'https://gomafia.pro/stats/3170',
                    'current_elo': 1250,
                    'games_played': 100,
                    'games_won': 65,
                    'win_rate': 0.65
                }
            ]
            
            scraped_players = sample_player_data
            self.session_stats['total_scraped'] += len(scraped_players)
            self.collection_logger.log_scraped(len(scraped_players), "player profiles")
            
            # Validate scraped data
            for raw_player in scraped_players:
                try:
                    player_data = PlayerData.from_scraped_data(raw_player)
                    validation_result = player_data.validate_data()
                    
                    if validation_result.is_valid:
                        validated_players.append(player_data)
                    else:
                        logger.warning(f"Player validation failed: {validation_result.get_summary()}")
                        self.session_stats['total_errors'] += 1
                        
                except Exception as e:
                    logger.error(f"Error processing player data: {e}")
                    self.session_stats['total_errors'] += 1
            
            self.session_stats['total_validated'] += len(validated_players)
            self.collection_logger.log_validated(len(validated_players), "players")
            
            # Insert into database
            if validated_players:
                successful, failed = self.db_service.batch_upsert_players(validated_players)
                inserted_count = successful
                self.session_stats['total_inserted'] += successful
                self.session_stats['total_errors'] += failed
                self.collection_logger.log_inserted(successful, "players table")
                
                if failed > 0:
                    logger.warning(f"Failed to insert {failed} players")
            
        except Exception as e:
            logger.error(f"Error in player collection: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            self.session_stats['total_errors'] += 1
        
        return self.end_collection_session(collection_type)
    
    async def collect_tournaments(self, tournament_ids: Optional[List[str]] = None,
                                 include_games: bool = True) -> Dict[str, Any]:
        """
        Collect tournament data from GoMafia.pro.
        
        Args:
            tournament_ids: Specific tournament IDs to collect
            include_games: Whether to collect game data within tournaments
            
        Returns:
            Collection results summary
        """
        collection_type = "tournament_collection"
        self.start_collection_session(collection_type)
        
        try:
            logger.info("Starting tournament data collection")
            
            # TODO: Implement TournamentScraper
            # Placeholder implementation
            sample_tournament_data = [{
                'go_mafia_tournament_id': '1858',
                'name': 'Клубный Чемпионат Мира 2025',
                'start_date_text': '24.05.2025',
                'end_date_text': '25.05.2025',
                'participation_text': '230 из 230',
                'location': 'Россия, Москва',
                'tournament_type': 'TEAM'
            }]
            
            scraped_tournaments = sample_tournament_data
            self.session_stats['total_scraped'] += len(scraped_tournaments)
            self.collection_logger.log_scraped(len(scraped_tournaments), "tournaments")
            
            # Process tournaments
            for raw_tournament in scraped_tournaments:
                try:
                    tournament_data = TournamentData.from_scraped_data(raw_tournament)
                    validation_result = tournament_data.validate_data()
                    
                    if validation_result.is_valid:
                        tournament_id = self.db_service.upsert_tournament(tournament_data)
                        if tournament_id:
                            self.session_stats['total_inserted'] += 1
                            self.collection_logger.log_inserted(1, "tournaments table")
                            
                            if include_games:
                                # TODO: Collect games for this tournament
                                logger.info(f"Would collect games for tournament {tournament_id}")
                        else:
                            self.session_stats['total_errors'] += 1
                    else:
                        logger.warning(f"Tournament validation failed: {validation_result.get_summary()}")
                        self.session_stats['total_errors'] += 1
                        
                except Exception as e:
                    logger.error(f"Error processing tournament data: {e}")
                    self.session_stats['total_errors'] += 1
            
            self.session_stats['total_validated'] += len(scraped_tournaments)
            
        except Exception as e:
            logger.error(f"Error in tournament collection: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            self.session_stats['total_errors'] += 1
        
        return self.end_collection_session(collection_type)
    
    async def collect_all_data(self, incremental: bool = True) -> Dict[str, Any]:
        """
        Collect all data types in a coordinated manner.
        
        Args:
            incremental: Whether to collect only new/updated data
            
        Returns:
            Combined collection results summary
        """
        collection_type = "full_collection"
        self.start_collection_session(collection_type)
        
        all_results = {
            'players': None,
            'tournaments': None,
            'combined_stats': {}
        }
        
        try:
            logger.info("Starting comprehensive data collection")
            
            # Collect players first
            logger.info("Collecting player data...")
            player_results = await self.collect_players(limit=100 if incremental else None)
            all_results['players'] = player_results
            
            # Collect tournaments
            logger.info("Collecting tournament data...")
            tournament_results = await self.collect_tournaments(include_games=True)
            all_results['tournaments'] = tournament_results
            
            # Calculate combined statistics
            all_results['combined_stats'] = {
                'total_collections': 2,
                'total_scraped': (player_results.get('scraped', 0) + 
                                tournament_results.get('scraped', 0)),
                'total_inserted': (player_results.get('inserted', 0) + 
                                 tournament_results.get('inserted', 0)),
                'total_errors': (player_results.get('errors', 0) + 
                               tournament_results.get('errors', 0)),
                'overall_success_rate': 0.0
            }
            
            # Calculate overall success rate
            total_items = all_results['combined_stats']['total_scraped']
            if total_items > 0:
                success_rate = (all_results['combined_stats']['total_inserted'] / total_items) * 100
                all_results['combined_stats']['overall_success_rate'] = round(success_rate, 2)
            
            logger.info("Comprehensive data collection completed")
            logger.info(f"Combined results: {all_results['combined_stats']}")
            
        except Exception as e:
            logger.error(f"Error in comprehensive collection: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            self.session_stats['total_errors'] += 1
        
        summary = self.end_collection_session(collection_type)
        all_results['session_summary'] = summary
        
        return all_results
    
    def get_collection_status(self) -> Dict[str, Any]:
        """Get current collection status and statistics."""
        current_time = datetime.now()
        
        status = {
            'is_running': self.is_running,
            'current_time': current_time.isoformat(),
            'session_stats': self.session_stats.copy()
        }
        
        if self.session_stats['start_time']:
            if self.is_running:
                duration = (current_time - self.session_stats['start_time']).total_seconds() / 60
                status['current_session_duration_minutes'] = round(duration, 2)
        
        # Get recent collection history from database
        try:
            recent_stats = self.db_service.get_recent_collection_stats(hours=24)
            status['recent_stats_24h'] = recent_stats
        except Exception as e:
            logger.error(f"Failed to get recent stats: {e}")
            status['recent_stats_24h'] = {'error': str(e)}
        
        return status
    
    async def shutdown(self) -> None:
        """Gracefully shutdown the orchestrator."""
        logger.info("Shutting down Data Collection Orchestrator")
        
        if self.is_running:
            self.end_collection_session("shutdown")
        
        # Close database connections
        if hasattr(self.db_service, 'client'):
            # Supabase client doesn't need explicit closing, but we can log it
            logger.info("Database connections closed")
        
        logger.info("Data Collection Orchestrator shutdown completed")


async def main():
    """Main entry point for the data collection service."""
    try:
        # Set up logging
        setup_logging()
        logger.info("Starting GoMafia Analytics Data Collection Service")
        
        # Initialize orchestrator
        orchestrator = DataCollectionOrchestrator()
        
        if not await orchestrator.initialize():
            logger.error("Failed to initialize orchestrator")
            sys.exit(1)
        
        # Check command line arguments for collection type
        if len(sys.argv) > 1:
            collection_type = sys.argv[1].lower()
            
            if collection_type == "players":
                results = await orchestrator.collect_players()
            elif collection_type == "tournaments":
                results = await orchestrator.collect_tournaments()
            elif collection_type == "all":
                results = await orchestrator.collect_all_data()
            elif collection_type == "status":
                results = orchestrator.get_collection_status()
                print(f"Collection Status: {results}")
                return
            else:
                logger.error(f"Unknown collection type: {collection_type}")
                logger.info("Available types: players, tournaments, all, status")
                sys.exit(1)
        else:
            # Default: run full collection
            logger.info("No collection type specified, running full collection")
            results = await orchestrator.collect_all_data()
        
        logger.info(f"Collection completed successfully: {results}")
        
        # Shutdown
        await orchestrator.shutdown()
        
    except KeyboardInterrupt:
        logger.info("Collection interrupted by user")
    except Exception as e:
        logger.error(f"Unexpected error in main: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        sys.exit(1)


if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main()) 