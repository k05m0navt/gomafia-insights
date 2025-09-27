"""
Player data models aligned with Prisma schema.
Handles player statistics, game participation, and identity resolution.
"""
from typing import Optional
from datetime import datetime
from enum import Enum
from pydantic import field_validator, Field
from .base import BaseModel, ValidationResult
import re
import logging

logger = logging.getLogger(__name__)


class PlayerRole(str, Enum):
    """Player roles in Mafia games."""

    CIVILIAN = "CIVILIAN"
    MAFIA = "MAFIA"
    DON = "DON"
    SHERIFF = "SHERIFF"
    DOCTOR = "DOCTOR"
    MODERATOR = "MODERATOR"


class TeamSide(str, Enum):
    """Team sides in Mafia games."""

    TOWN = "TOWN"
    MAFIA = "MAFIA"
    NEUTRAL = "NEUTRAL"


class GameOutcome(str, Enum):
    """Individual player game outcome."""

    WON = "WON"
    LOST = "LOST"
    DRAW = "DRAW"
    ELIMINATED = "ELIMINATED"


class TeamOutcome(str, Enum):
    """Team game outcome."""

    TOWN_WIN = "TOWN_WIN"
    MAFIA_WIN = "MAFIA_WIN"
    DRAW = "DRAW"


class PlayerData(BaseModel):
    """
    Player data model aligned with Prisma Player schema.
    Represents a stable player identity with current statistics.
    """

    # Core identity (required)
    go_mafia_id: int = Field(..., gt=0, description="Unique GoMafia.pro player ID")
    current_nickname: str = Field(
        ..., min_length=1, description="Current player nickname"
    )
    profile_url: str = Field(..., description="GoMafia.pro profile URL")

    # Optional profile information
    registered_year: Optional[int] = None

    # Current ELO and rankings (computed by database triggers)
    current_elo: int = Field(default=1200, ge=0)
    table_elo: int = Field(default=1200, ge=0)
    max_elo: int = Field(default=1200, ge=0)

    # Overall statistics (computed by triggers)
    games_played: int = Field(default=0, ge=0)
    games_won: int = Field(default=0, ge=0)
    win_rate: float = Field(default=0.0, ge=0.0, le=1.0)
    average_points: float = Field(default=0.0)

    # Role-specific statistics
    civilian_games: int = Field(default=0, ge=0)
    mafia_games: int = Field(default=0, ge=0)
    don_games: int = Field(default=0, ge=0)
    sheriff_games: int = Field(default=0, ge=0)

    civilian_win_rate: float = Field(default=0.0, ge=0.0, le=1.0)
    mafia_win_rate: float = Field(default=0.0, ge=0.0, le=1.0)
    don_win_rate: float = Field(default=0.0, ge=0.0, le=1.0)
    sheriff_win_rate: float = Field(default=0.0, ge=0.0, le=1.0)

    # Performance metrics
    best_win_streak: int = Field(default=0, ge=0)
    current_streak: int = Field(default=0)
    total_points: float = Field(default=0.0)
    awards_count: int = Field(default=0, ge=0)

    # Activity tracking
    last_game_at: Optional[datetime] = None
    last_tournament_at: Optional[datetime] = None
    is_active: bool = Field(default=True)

    @field_validator("profile_url")
    def validate_profile_url(cls, v):
        """Validate GoMafia.pro profile URL format."""
        if not v.startswith("https://gomafia.pro/"):
            raise ValueError("Profile URL must start with https://gomafia.pro/")
        return v

    @field_validator("go_mafia_id", mode="before")
    def extract_id_from_url_if_needed(cls, v, info):
        """Extract player ID from URL if profile_url is present."""
        values = info.data if hasattr(info, "data") else {}
        if "profile_url" in values:
            url = values["profile_url"]
            match = re.search(r"/stats/(\d+)", url)
            if match:
                extracted_id = int(match.group(1))
                if isinstance(v, int) and v != extracted_id:
                    logger.warning(
                        f"Player ID mismatch: provided {v}, URL contains {extracted_id}"
                    )
                return extracted_id
        return v

    @field_validator(
        "win_rate",
        "civilian_win_rate",
        "mafia_win_rate",
        "don_win_rate",
        "sheriff_win_rate",
        mode="after",
    )
    def validate_win_rate(cls, v, info):
        """Validate and calculate win rates."""
        _ = info.data if hasattr(info, "data") else {}
        if v is None:
            return 0.0

        # Ensure win rate is between 0 and 1
        if v > 1.0:
            v = v / 100.0  # Convert percentage to decimal

        return round(v, 4)

    @field_validator("registered_year")
    def validate_registered_year(cls, v):
        """Validate registration year."""
        if v is not None:
            current_year = datetime.now().year
            if v < 2000 or v > current_year:
                logger.warning(f"Invalid registration year: {v}")
                return None
        return v

    def validate_data(self) -> ValidationResult:
        """Comprehensive data validation for player data."""
        result = ValidationResult()

        # Required field validation
        required_fields = ["go_mafia_id", "current_nickname", "profile_url"]
        if not self.validate_required_fields(required_fields):
            result.add_error("Missing required player fields")

        # Consistency validation
        if self.games_won > self.games_played:
            result.add_error(
                f"Games won ({self.games_won}) cannot exceed games played "
                f"({self.games_played})"
            )

        if self.games_played > 0:
            calculated_win_rate = self.games_won / self.games_played
            if abs(calculated_win_rate - self.win_rate) > 0.01:
                result.add_warning(
                    f"Win rate inconsistency: calculated {calculated_win_rate:.3f}, "
                    f"stored {self.win_rate:.3f}"
                )

        # Role games consistency
        total_role_games = (
            self.civilian_games + self.mafia_games + self.don_games + self.sheriff_games
        )
        if total_role_games > self.games_played:
            result.add_error(
                f"Total role games ({total_role_games}) exceeds total games played "
                f"({self.games_played})"
            )

        # ELO validation
        if self.max_elo < self.current_elo:
            result.add_warning(
                f"Max ELO ({self.max_elo}) is less than current ELO "
                f"({self.current_elo})"
            )

        return result

    @classmethod
    def from_scraped_data(cls, raw_data: dict) -> "PlayerData":
        """Create PlayerData from raw scraped data with parsing and normalization."""
        try:
            # Parse registration year from text like "на сайте с 2022 года"
            if "registration_text" in raw_data:
                reg_text = raw_data.get("registration_text", "")
                year_match = re.search(r"(\d{4})", reg_text)
                if year_match:
                    raw_data["registered_year"] = int(year_match.group(1))

            # Parse ELO values
            for elo_field in ["current_elo", "table_elo", "max_elo"]:
                if elo_field in raw_data and isinstance(raw_data[elo_field], str):
                    elo_match = re.search(r"(\d+)", raw_data[elo_field])
                    if elo_match:
                        raw_data[elo_field] = int(elo_match.group(1))

            # Parse statistics
            for stat_field in ["games_played", "games_won"]:
                if stat_field in raw_data and isinstance(raw_data[stat_field], str):
                    stat_match = re.search(r"(\d+)", raw_data[stat_field])
                    if stat_match:
                        raw_data[stat_field] = int(stat_match.group(1))

            # Parse win rate percentages
            for rate_field in [
                "win_rate",
                "civilian_win_rate",
                "mafia_win_rate",
                "don_win_rate",
                "sheriff_win_rate",
            ]:
                if rate_field in raw_data and isinstance(raw_data[rate_field], str):
                    rate_text = raw_data[rate_field].replace("%", "").replace(",", ".")
                    try:
                        rate_value = float(rate_text)
                        if rate_value > 1.0:
                            rate_value = rate_value / 100.0
                        raw_data[rate_field] = rate_value
                    except ValueError:
                        logger.warning(
                            f"Failed to parse {rate_field}: {raw_data[rate_field]}"
                        )

            # Create and clean up instance
            instance = cls(**raw_data)
            instance.cleanup_data()
            return instance

        except Exception as e:
            logger.error(f"Failed to create PlayerData from scraped data: {e}")
            logger.error(f"Raw data: {raw_data}")
            raise


class GameParticipationData(BaseModel):
    """
    Game participation data model aligned with Prisma GameParticipation schema.
    Represents a player's performance in a specific game.
    """

    # Required identifiers
    player_go_mafia_id: int = Field(..., gt=0)
    game_identifier: str = Field(..., min_length=1)  # Will be used to match with Game

    # Player position and identity
    seat_position: int = Field(..., ge=1, le=10)
    nickname_at_time: str = Field(..., min_length=1)

    # Role assignment
    role: PlayerRole
    team_side: TeamSide

    # Game outcome
    game_outcome: TeamOutcome
    personal_outcome: GameOutcome

    # Performance scoring
    base_points: float = Field(default=0.0)
    bonus_points: float = Field(default=0.0)
    penalty_points: float = Field(default=0.0)
    total_points: float = Field(default=0.0)

    # ELO tracking
    elo_before: int = Field(..., ge=0)
    elo_after: int = Field(..., ge=0)
    elo_change: int = Field(default=0)

    # Game performance metrics (optional)
    voting_accuracy: Optional[float] = Field(None, ge=0.0, le=1.0)
    night_actions: Optional[int] = Field(None, ge=0)
    speech_quality: Optional[float] = Field(None, ge=0.0, le=10.0)

    # Game context
    game_start_time: datetime
    game_end_time: Optional[datetime] = None
    game_duration: Optional[int] = None  # Duration in minutes

    # Tournament context (optional)
    tournament_id: Optional[str] = None
    tournament_round: Optional[int] = None
    tournament_stage: Optional[str] = None

    # Metadata
    data_source: str = Field(default="gomafia_tournament")

    @field_validator("elo_change", mode="after")
    def calculate_elo_change(cls, v, info):
        """Calculate ELO change from before and after values."""
        values = info.data if hasattr(info, "data") else {}
        if "elo_before" in values and "elo_after" in values:
            return values["elo_after"] - values["elo_before"]
        return v

    @field_validator("total_points", mode="after")
    def calculate_total_points(cls, v, info):
        """Calculate total points from base, bonus, and penalty."""
        values = info.data if hasattr(info, "data") else {}
        base = values.get("base_points", 0.0)
        bonus = values.get("bonus_points", 0.0)
        penalty = values.get("penalty_points", 0.0)
        return base + bonus - penalty

    @field_validator("personal_outcome", mode="after")
    def determine_personal_outcome(cls, v, info):
        """Determine personal outcome based on team outcome and team side."""
        values = info.data if hasattr(info, "data") else {}
        if "game_outcome" in values and "team_side" in values:
            game_outcome = values["game_outcome"]
            team_side = values["team_side"]

            if game_outcome == TeamOutcome.DRAW:
                return GameOutcome.DRAW
            elif (
                game_outcome == TeamOutcome.TOWN_WIN and team_side == TeamSide.TOWN
            ) or (
                game_outcome == TeamOutcome.MAFIA_WIN and team_side == TeamSide.MAFIA
            ):
                return GameOutcome.WON
            else:
                return GameOutcome.LOST
        return v

    @field_validator("game_duration", mode="after")
    def calculate_game_duration(cls, v, info):
        """Calculate game duration from start and end times."""
        values = info.data if hasattr(info, "data") else {}
        if v is None and "game_start_time" in values and "game_end_time" in values:
            start_time = values["game_start_time"]
            end_time = values["game_end_time"]
            if start_time and end_time:
                duration = (end_time - start_time).total_seconds() / 60
                return int(duration)
        return v

    def validate_data(self) -> ValidationResult:
        """Comprehensive data validation for game participation data."""
        result = ValidationResult()

        # Required field validation
        required_fields = [
            "player_go_mafia_id",
            "game_identifier",
            "seat_position",
            "nickname_at_time",
            "role",
            "team_side",
            "elo_before",
            "elo_after",
        ]
        if not self.validate_required_fields(required_fields):
            result.add_error("Missing required game participation fields")

        # Role and team consistency
        if (
            self.role in [PlayerRole.DON, PlayerRole.MAFIA]
            and self.team_side != TeamSide.MAFIA
        ):
            result.add_error(
                f"Role {self.role} should be on MAFIA team, not {self.team_side}"
            )
        elif (
            self.role in [PlayerRole.CIVILIAN, PlayerRole.SHERIFF, PlayerRole.DOCTOR]
            and self.team_side != TeamSide.TOWN
        ):
            result.add_error(
                f"Role {self.role} should be on TOWN team, not {self.team_side}"
            )

        # ELO validation
        if abs(self.elo_change) > 200:
            result.add_warning(f"Large ELO change: {self.elo_change}")

        # Points validation
        if abs(self.total_points) > 10:
            result.add_warning(f"Unusual total points: {self.total_points}")

        # Time validation
        if self.game_end_time and self.game_start_time:
            if self.game_end_time <= self.game_start_time:
                result.add_error("Game end time must be after start time")

            duration = (self.game_end_time - self.game_start_time).total_seconds() / 60
            if duration < 10 or duration > 300:  # 10 minutes to 5 hours
                result.add_warning(f"Unusual game duration: {duration:.1f} minutes")

        return result

    @classmethod
    def from_scraped_data(cls, raw_data: dict) -> "GameParticipationData":
        """Create GameParticipationData from raw scraped game data."""
        try:
            # Parse role from Russian text
            role_mapping = {
                "мирный": PlayerRole.CIVILIAN,
                "мирная": PlayerRole.CIVILIAN,
                "civilian": PlayerRole.CIVILIAN,
                "мафия": PlayerRole.MAFIA,
                "mafia": PlayerRole.MAFIA,
                "дон": PlayerRole.DON,
                "don": PlayerRole.DON,
                "шериф": PlayerRole.SHERIFF,
                "sheriff": PlayerRole.SHERIFF,
                "доктор": PlayerRole.DOCTOR,
                "doctor": PlayerRole.DOCTOR,
                "ведущий": PlayerRole.MODERATOR,
                "moderator": PlayerRole.MODERATOR,
            }

            if "role_text" in raw_data:
                role_text = raw_data["role_text"].lower().strip()
                for russian_role, enum_role in role_mapping.items():
                    if russian_role in role_text:
                        raw_data["role"] = enum_role
                        break

            # Determine team side from role
            if "role" in raw_data:
                role = raw_data["role"]
                if role in [PlayerRole.DON, PlayerRole.MAFIA]:
                    raw_data["team_side"] = TeamSide.MAFIA
                elif role in [
                    PlayerRole.CIVILIAN,
                    PlayerRole.SHERIFF,
                    PlayerRole.DOCTOR,
                ]:
                    raw_data["team_side"] = TeamSide.TOWN
                else:
                    raw_data["team_side"] = TeamSide.NEUTRAL

            # Parse game outcome from Russian text
            if "outcome_text" in raw_data:
                outcome_text = raw_data["outcome_text"].lower()
                if "мирные" in outcome_text or "town" in outcome_text:
                    raw_data["game_outcome"] = TeamOutcome.TOWN_WIN
                elif "мафия" in outcome_text or "mafia" in outcome_text:
                    raw_data["game_outcome"] = TeamOutcome.MAFIA_WIN
                else:
                    raw_data["game_outcome"] = TeamOutcome.DRAW

            # Parse ELO values
            for elo_field in ["elo_before", "elo_after"]:
                if elo_field in raw_data and isinstance(raw_data[elo_field], str):
                    elo_match = re.search(r"(\d+)", raw_data[elo_field])
                    if elo_match:
                        raw_data[elo_field] = int(elo_match.group(1))

            # Parse points
            for points_field in [
                "base_points",
                "bonus_points",
                "penalty_points",
                "total_points",
            ]:
                if points_field in raw_data and isinstance(raw_data[points_field], str):
                    points_text = raw_data[points_field].replace(",", ".")
                    try:
                        raw_data[points_field] = float(points_text)
                    except ValueError:
                        logger.warning(
                            f"Failed to parse {points_field}: {raw_data[points_field]}"
                        )

            # Create and clean up instance
            instance = cls(**raw_data)
            instance.cleanup_data()
            return instance

        except Exception as e:
            logger.error(
                f"Failed to create GameParticipationData from scraped data: {e}"
            )
            logger.error(f"Raw data: {raw_data}")
            raise
