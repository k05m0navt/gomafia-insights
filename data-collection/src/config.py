"""
Configuration module for GoMafia Analytics Data Collection Service.
Handles environment variables and application settings with validation.
"""
import os
from typing import Optional, List
from pydantic import validator
try:
    from pydantic_settings import BaseSettings
except Exception:
    from pydantic import BaseSettings
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class DatabaseConfig(BaseSettings):
    """Database connection configuration."""
    supabase_url: str
    supabase_key: str
    supabase_secret: Optional[str] = None
    database_url: Optional[str] = None
    direct_url: Optional[str] = None
    
    class Config:
        env_prefix = "SUPABASE_"
        case_sensitive = False


class ScrapingConfig(BaseSettings):
    """Web scraping configuration."""
    base_url: str = "https://gomafia.pro"
    delay_min: int = 1
    delay_max: int = 3
    request_timeout: int = 30
    max_retries: int = 3
    batch_size: int = 100
    max_parallel_requests: int = 5
    
    # Selenium WebDriver settings
    webdriver_path: Optional[str] = None
    headless_browser: bool = True
    browser_timeout: int = 30
    
    class Config:
        env_prefix = "GOMAFIA_"
        case_sensitive = False


class SchedulingConfig(BaseSettings):
    """Data collection scheduling configuration."""
    collection_schedule_cron: str = "0 */6 * * *"  # Every 6 hours
    tournament_schedule_cron: str = "0 8,20 * * *"  # Daily at 8 AM and 8 PM
    leaderboard_schedule_cron: str = "0 */2 * * *"  # Every 2 hours
    
    class Config:
        env_prefix = "COLLECTION_"
        case_sensitive = False


class LoggingConfig(BaseSettings):
    """Logging and monitoring configuration."""
    log_level: str = "INFO"
    log_file: str = "logs/data_collection.log"
    sentry_dsn: Optional[str] = None
    
    class Config:
        env_prefix = "LOG_"
        case_sensitive = False


class DevelopmentConfig(BaseSettings):
    """Development and debugging configuration."""
    development_mode: bool = True
    debug_scraping: bool = False
    save_raw_html: bool = False
    data_validation_strict: bool = True
    
    class Config:
        env_prefix = "DEVELOPMENT_"
        case_sensitive = False


class AppConfig:
    """Main application configuration that combines all config sections."""
    
    def __init__(self):
        try:
            self.database = DatabaseConfig()
        except Exception:
            # If required DB env vars are missing, allow running in dry-run mode when SKIP_DB_TEST=1
            if os.environ.get('SKIP_DB_TEST') == '1':
                class _DummyDB:
                    supabase_url = None
                    supabase_key = None
                    supabase_secret = None
                    database_url = None
                    direct_url = None
                self.database = _DummyDB()
            else:
                raise
        self.scraping = ScrapingConfig()
        self.scheduling = SchedulingConfig()
        self.logging = LoggingConfig()
        self.development = DevelopmentConfig()
    
    def validate_config(self) -> bool:
        """Validate that all required configuration is present."""
        try:
            # Check required database settings
            if not self.database.supabase_url or not self.database.supabase_key:
                raise ValueError("Missing required Supabase configuration")
            
            # Check scraping settings
            if self.scraping.delay_min >= self.scraping.delay_max:
                raise ValueError("SCRAPING_DELAY_MIN must be less than SCRAPING_DELAY_MAX")
            
            # Check file paths exist
            log_dir = os.path.dirname(self.logging.log_file)
            if log_dir and not os.path.exists(log_dir):
                os.makedirs(log_dir, exist_ok=True)
            
            return True
            
        except Exception as e:
            print(f"Configuration validation failed: {e}")
            return False
    
    def get_headers(self) -> dict:
        """Get HTTP headers for web scraping requests."""
        return {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }


# Global configuration instance
config = AppConfig() 