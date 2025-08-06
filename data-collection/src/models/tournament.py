"""
Tournament and Game data models aligned with Prisma schema.
Handles tournament information, game details, and competition structure.
"""
from typing import Optional, List
from datetime import datetime
from enum import Enum
from pydantic import validator, Field
from .base import BaseModel, ValidationResult
import re
import logging

logger = logging.getLogger(__name__)


class GameType(str, Enum):
    """Types of Mafia games."""
    CLASSIC = "CLASSIC"
    BLITZ = "BLITZ"
    TOURNAMENT = "TOURNAMENT"
    TRAINING = "TRAINING"
    CHAMPIONSHIP = "CHAMPIONSHIP"


class GameFormat(str, Enum):
    """Game formats."""
    CLASSIC = "CLASSIC"
    SPEED = "SPEED"
    BLITZ = "BLITZ"
    TOURNAMENT = "TOURNAMENT"
    TRAINING = "TRAINING"
    CHAMPIONSHIP = "CHAMPIONSHIP"


class GameStatus(str, Enum):
    """Game status."""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class WinCondition(str, Enum):
    """How the game was won."""
    ELIMINATION = "ELIMINATION"
    VOTING = "VOTING"
    MAFIA_MAJORITY = "MAFIA_MAJORITY"
    TIMEOUT = "TIMEOUT"
    FORFEIT = "FORFEIT"


class TeamSide(str, Enum):
    """Team sides."""
    TOWN = "TOWN"
    MAFIA = "MAFIA"
    NEUTRAL = "NEUTRAL"


class TournamentType(str, Enum):
    """Tournament types."""
    INDIVIDUAL = "INDIVIDUAL"
    TEAM = "TEAM"
    MIXED = "MIXED"


class TournamentFormat(str, Enum):
    """Tournament formats."""
    SINGLE_ELIMINATION = "SINGLE_ELIMINATION"
    DOUBLE_ELIMINATION = "DOUBLE_ELIMINATION"
    ROUND_ROBIN = "ROUND_ROBIN"
    SWISS = "SWISS"
    LADDER = "LADDER"


class TournamentStatus(str, Enum):
    """Tournament status."""
    UPCOMING = "UPCOMING"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class TournamentData(BaseModel):
    """
    Tournament data model aligned with Prisma Tournament schema.
    Represents a Mafia tournament with all its metadata.
    """
    # Core identification
    go_mafia_tournament_id: Optional[str] = None  # e.g., "1858"
    
    # Tournament details (required)
    name: str = Field(..., min_length=1)
    short_name: Optional[str] = None
    description: Optional[str] = None
    
    # Tournament dates (required)
    start_date: datetime = Field(...)
    end_date: datetime = Field(...)
    registration_end: Optional[datetime] = None
    
    # Tournament format
    tournament_type: TournamentType = Field(default=TournamentType.INDIVIDUAL)
    format: TournamentFormat = Field(default=TournamentFormat.ROUND_ROBIN)
    status: TournamentStatus = Field(default=TournamentStatus.UPCOMING)
    
    # Location
    location: Optional[str] = None  # "Россия, Москва"
    venue: Optional[str] = None
    
    # Participation
    max_participants: Optional[int] = Field(None, gt=0)
    current_participants: Optional[int] = Field(None, ge=0)
    
    # Organization
    chief_judge: Optional[str] = None  # "Николай Ардыльян" (ГС турнира)
    organizer: Optional[str] = None    # "Марк Мирзоян" (Организатор)
    
    # Tournament progress
    current_round: int = Field(default=1, ge=1)
    total_rounds: Optional[int] = Field(None, gt=0)
    total_tables: Optional[int] = Field(None, gt=0)
    
    # Prize information
    entry_fee: Optional[float] = Field(None, ge=0.0)
    prize_pool: Optional[float] = Field(None, ge=0.0)
    
    # External links
    vk_community: Optional[str] = None
    broadcast_link: Optional[str] = None
    
    @validator('end_date')
    def validate_end_after_start(cls, v, values):
        """Ensure end date is after start date."""
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('End date must be after start date')
        return v
    
    @validator('current_participants')
    def validate_current_participants(cls, v, values):
        """Ensure current participants doesn't exceed maximum."""
        if v is not None and 'max_participants' in values:
            max_p = values['max_participants']
            if max_p is not None and v > max_p:
                raise ValueError(f'Current participants ({v}) cannot exceed maximum ({max_p})')
        return v
    
    @validator('tournament_type')
    def determine_tournament_type(cls, v, values):
        """Determine tournament type from name if not specified."""
        if 'name' in values:
            name_lower = values['name'].lower()
            if 'команд' in name_lower or 'team' in name_lower:
                return TournamentType.TEAM
            elif 'личн' in name_lower or 'individual' in name_lower:
                return TournamentType.INDIVIDUAL
        return v
    
    def validate_data(self) -> ValidationResult:
        """Comprehensive data validation for tournament data."""
        result = ValidationResult()
        
        # Required field validation
        required_fields = ['name', 'start_date', 'end_date']
        if not self.validate_required_fields(required_fields):
            result.add_error("Missing required tournament fields")
        
        # Date consistency
        if self.start_date and self.end_date:
            if self.end_date <= self.start_date:
                result.add_error("Tournament end date must be after start date")
            
            # Check if tournament duration is reasonable (max 30 days)
            duration = (self.end_date - self.start_date).days
            if duration > 30:
                result.add_warning(f"Very long tournament duration: {duration} days")
            elif duration == 0:
                result.add_warning("Single-day tournament")
        
        # Participation validation
        if self.current_participants and self.max_participants:
            if self.current_participants > self.max_participants:
                result.add_error(f"Current participants ({self.current_participants}) exceeds maximum ({self.max_participants})")
        
        # Round validation
        if self.total_rounds and self.current_round > self.total_rounds:
            result.add_error(f"Current round ({self.current_round}) exceeds total rounds ({self.total_rounds})")
        
        return result
    
    @classmethod
    def from_scraped_data(cls, raw_data: dict) -> 'TournamentData':
        """Create TournamentData from raw scraped tournament page data."""
        try:
            # Parse tournament dates from Russian format "24.05.2025"
            for date_field in ['start_date', 'end_date', 'registration_end']:
                if f"{date_field}_text" in raw_data:
                    date_text = raw_data[f"{date_field}_text"]
                    parsed_date = cls._parse_russian_date(date_text)
                    if parsed_date:
                        raw_data[date_field] = parsed_date
            
            # Parse participation numbers from "230 из 230" format
            if 'participation_text' in raw_data:
                participation_text = raw_data['participation_text']
                match = re.search(r'(\d+)\s*из\s*(\d+)', participation_text)
                if match:
                    raw_data['current_participants'] = int(match.group(1))
                    raw_data['max_participants'] = int(match.group(2))
            
            # Parse tournament type from name
            if 'name' in raw_data:
                name_lower = raw_data['name'].lower()
                if 'команд' in name_lower:
                    raw_data['tournament_type'] = TournamentType.TEAM
                elif 'личн' in name_lower:
                    raw_data['tournament_type'] = TournamentType.INDIVIDUAL
            
            # Parse entry fee and prize pool
            for money_field in ['entry_fee', 'prize_pool']:
                if f"{money_field}_text" in raw_data:
                    money_text = raw_data[f"{money_field}_text"]
                    amount = cls._parse_money_amount(money_text)
                    if amount:
                        raw_data[money_field] = amount
            
            # Create and clean up instance
            instance = cls(**raw_data)
            instance.cleanup_data()
            return instance
            
        except Exception as e:
            logger.error(f"Failed to create TournamentData from scraped data: {e}")
            logger.error(f"Raw data: {raw_data}")
            raise
    
    @staticmethod
    def _parse_russian_date(date_text: str) -> Optional[datetime]:
        """Parse Russian date format like '24.05.2025' or '24.05.2025 10:00'."""
        if not date_text:
            return None
        
        try:
            # Try different date formats
            formats = [
                "%d.%m.%Y %H:%M",
                "%d.%m.%Y",
                "%Y-%m-%d",
                "%Y-%m-%d %H:%M:%S",
            ]
            
            for fmt in formats:
                try:
                    return datetime.strptime(date_text.strip(), fmt)
                except ValueError:
                    continue
                    
            logger.warning(f"Could not parse date: {date_text}")
            return None
            
        except Exception as e:
            logger.warning(f"Date parsing error for '{date_text}': {e}")
            return None
    
    @staticmethod
    def _parse_money_amount(money_text: str) -> Optional[float]:
        """Parse money amounts from various formats."""
        if not money_text:
            return None
        
        try:
            # Remove common currency symbols and text
            clean_text = re.sub(r'[^\d.,]', '', money_text)
            clean_text = clean_text.replace(',', '.')
            
            if clean_text:
                return float(clean_text)
            return None
            
        except Exception as e:
            logger.warning(f"Money parsing error for '{money_text}': {e}")
            return None


class GameData(BaseModel):
    """
    Game data model aligned with Prisma Game schema.
    Represents a single Mafia game with all its details.
    """
    # Core identification
    go_mafia_game_id: Optional[str] = None
    
    # Game identification
    table_number: Optional[int] = Field(None, gt=0)
    table_name: Optional[str] = None
    moderator_name: Optional[str] = None
    
    # Game timing (required)
    start_time: datetime = Field(...)
    end_time: Optional[datetime] = None
    duration: Optional[int] = Field(None, gt=0)  # Duration in minutes
    
    # Game configuration
    game_type: GameType = Field(default=GameType.TOURNAMENT)
    game_format: GameFormat = Field(default=GameFormat.TOURNAMENT)
    status: GameStatus = Field(default=GameStatus.COMPLETED)
    
    # Game outcome - TEAM-based (required)
    winning_team: TeamSide = Field(...)
    win_condition: Optional[WinCondition] = None
    
    # Tournament context
    tournament_id: Optional[str] = None
    tournament_round: Optional[int] = Field(None, gt=0)
    tournament_stage: Optional[str] = None  # "Qualification", "Semifinal", "Final"
    
    # Game configuration
    player_count: int = Field(default=10, ge=4, le=20)
    mafia_count: int = Field(default=0, ge=0)
    civilian_count: int = Field(default=0, ge=0)
    special_roles: List[str] = Field(default_factory=list)
    
    # Game venue/context
    venue: Optional[str] = None
    
    @validator('end_time')
    def validate_end_after_start(cls, v, values):
        """Ensure end time is after start time."""
        if v is not None and 'start_time' in values and v <= values['start_time']:
            raise ValueError('End time must be after start time')
        return v
    
    @validator('duration', always=True)
    def calculate_duration(cls, v, values):
        """Calculate duration from start and end times if not provided."""
        if v is None and 'start_time' in values and 'end_time' in values:
            start_time = values['start_time']
            end_time = values['end_time']
            if start_time and end_time:
                duration_seconds = (end_time - start_time).total_seconds()
                return int(duration_seconds / 60)  # Convert to minutes
        return v
    
    @validator('civilian_count', always=True)
    def calculate_civilian_count(cls, v, values):
        """Calculate civilian count from total players and mafia count."""
        if v == 0 and 'player_count' in values and 'mafia_count' in values:
            return values['player_count'] - values['mafia_count']
        return v
    
    def validate_data(self) -> ValidationResult:
        """Comprehensive data validation for game data."""
        result = ValidationResult()
        
        # Required field validation
        required_fields = ['start_time', 'winning_team']
        if not self.validate_required_fields(required_fields):
            result.add_error("Missing required game fields")
        
        # Time validation
        if self.end_time and self.start_time:
            if self.end_time <= self.start_time:
                result.add_error("Game end time must be after start time")
            
            calculated_duration = (self.end_time - self.start_time).total_seconds() / 60
            if calculated_duration < 5 or calculated_duration > 300:  # 5 minutes to 5 hours
                result.add_warning(f"Unusual game duration: {calculated_duration:.1f} minutes")
        
        # Player count validation
        if self.mafia_count + self.civilian_count != self.player_count:
            total_roles = self.mafia_count + self.civilian_count
            if total_roles > 0:  # Only warn if we have role counts
                result.add_warning(f"Player count mismatch: {total_roles} roles vs {self.player_count} players")
        
        # Mafia count validation (should be roughly 25-35% of players)
        if self.player_count > 0 and self.mafia_count > 0:
            mafia_ratio = self.mafia_count / self.player_count
            if mafia_ratio < 0.2 or mafia_ratio > 0.4:
                result.add_warning(f"Unusual mafia ratio: {mafia_ratio:.2f} ({self.mafia_count}/{self.player_count})")
        
        # Tournament context validation
        if self.tournament_id and not self.tournament_round:
            result.add_warning("Tournament game missing round number")
        
        return result
    
    @classmethod
    def from_scraped_data(cls, raw_data: dict) -> 'GameData':
        """Create GameData from raw scraped game data."""
        try:
            # Parse game times
            for time_field in ['start_time', 'end_time']:
                if f"{time_field}_text" in raw_data:
                    time_text = raw_data[f"{time_field}_text"]
                    parsed_time = cls._parse_game_time(time_text)
                    if parsed_time:
                        raw_data[time_field] = parsed_time
            
            # Parse winning team from Russian text
            if 'winning_team_text' in raw_data:
                team_text = raw_data['winning_team_text'].lower()
                if 'мирные' in team_text or 'town' in team_text:
                    raw_data['winning_team'] = TeamSide.TOWN
                elif 'мафия' in team_text or 'mafia' in team_text:
                    raw_data['winning_team'] = TeamSide.MAFIA
                else:
                    raw_data['winning_team'] = TeamSide.TOWN  # Default to town
            
            # Parse player counts
            for count_field in ['player_count', 'mafia_count', 'civilian_count']:
                if f"{count_field}_text" in raw_data:
                    count_text = raw_data[f"{count_field}_text"]
                    match = re.search(r'(\d+)', count_text)
                    if match:
                        raw_data[count_field] = int(match.group(1))
            
            # Parse table number
            if 'table_text' in raw_data:
                table_text = raw_data['table_text']
                match = re.search(r'(\d+)', table_text)
                if match:
                    raw_data['table_number'] = int(match.group(1))
            
            # Parse duration if provided as text
            if 'duration_text' in raw_data:
                duration_text = raw_data['duration_text']
                duration_minutes = cls._parse_duration_text(duration_text)
                if duration_minutes:
                    raw_data['duration'] = duration_minutes
            
            # Create and clean up instance
            instance = cls(**raw_data)
            instance.cleanup_data()
            return instance
            
        except Exception as e:
            logger.error(f"Failed to create GameData from scraped data: {e}")
            logger.error(f"Raw data: {raw_data}")
            raise
    
    @staticmethod
    def _parse_game_time(time_text: str) -> Optional[datetime]:
        """Parse game time from various formats."""
        if not time_text:
            return None
        
        try:
            # Try different time formats
            formats = [
                "%H:%M %d.%m.%Y",
                "%d.%m.%Y %H:%M",
                "%Y-%m-%d %H:%M:%S",
                "%Y-%m-%dT%H:%M:%S",
                "%d.%m.%Y",
                "%H:%M",
            ]
            
            for fmt in formats:
                try:
                    return datetime.strptime(time_text.strip(), fmt)
                except ValueError:
                    continue
                    
            logger.warning(f"Could not parse game time: {time_text}")
            return None
            
        except Exception as e:
            logger.warning(f"Game time parsing error for '{time_text}': {e}")
            return None
    
    @staticmethod
    def _parse_duration_text(duration_text: str) -> Optional[int]:
        """Parse game duration from text like '45 мин' or '1ч 23м'."""
        if not duration_text:
            return None
        
        try:
            total_minutes = 0
            
            # Look for hours
            hour_match = re.search(r'(\d+)\s*[чh]', duration_text.lower())
            if hour_match:
                total_minutes += int(hour_match.group(1)) * 60
            
            # Look for minutes
            minute_match = re.search(r'(\d+)\s*[мm]', duration_text.lower())
            if minute_match:
                total_minutes += int(minute_match.group(1))
            
            # If no specific format found, try to extract just a number (assume minutes)
            if total_minutes == 0:
                number_match = re.search(r'(\d+)', duration_text)
                if number_match:
                    total_minutes = int(number_match.group(1))
            
            return total_minutes if total_minutes > 0 else None
            
        except Exception as e:
            logger.warning(f"Duration parsing error for '{duration_text}': {e}")
            return None 