# Collectors package
from .base_scraper import BaseScraper

# Optional collector modules (may be missing in minimal setups)
try:
    from .player_scraper import PlayerScraper
except Exception:
    PlayerScraper = None

try:
    from .tournament_scraper import TournamentScraper
except Exception:
    TournamentScraper = None

__all__ = [
    'BaseScraper',
    'PlayerScraper', 
    'TournamentScraper'
] 