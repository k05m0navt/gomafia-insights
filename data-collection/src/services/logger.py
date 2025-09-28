"""
Logging service for GoMafia Analytics Data Collection.
Sets up structured logging with appropriate formatters and handlers.
"""
import logging
import logging.handlers
import os
import sys
from typing import Optional
import structlog
from datetime import datetime

from ..config import config


def setup_logging(log_level: Optional[str] = None) -> logging.Logger:
    """
    Set up structured logging for the data collection service.
    
    Args:
        log_level: Override default log level from config
        
    Returns:
        Configured logger instance
    """
    # Use provided level or config default
    level = log_level or config.logging.log_level
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    
    # Create logs directory if it doesn't exist
    log_dir = os.path.dirname(config.logging.log_file)
    if log_dir and not os.path.exists(log_dir):
        os.makedirs(log_dir, exist_ok=True)
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="ISO"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    # Configure standard logging
    logging.basicConfig(
        level=numeric_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[]
    )
    
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    console_formatter = ColoredFormatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)
    
    # File handler with rotation
    try:
        file_handler = logging.handlers.RotatingFileHandler(
            config.logging.log_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5
        )
        file_handler.setLevel(logging.DEBUG)  # Always log everything to file
        file_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_formatter)
        root_logger.addHandler(file_handler)
    except Exception as e:
        print(f"Warning: Could not set up file logging: {e}")
    
    # Sentry handler for production error tracking
    if config.logging.sentry_dsn and not config.development.development_mode:
        try:
            import sentry_sdk
            from sentry_sdk.integrations.logging import LoggingIntegration
            
            sentry_logging = LoggingIntegration(
                level=logging.INFO,        # Capture info and above as breadcrumbs
                event_level=logging.ERROR  # Send errors as events
            )
            
            sentry_sdk.init(
                dsn=config.logging.sentry_dsn,
                integrations=[sentry_logging],
                environment="production" if not config.development.development_mode else "development"
            )
        except ImportError:
            pass  # Sentry SDK not installed
        except Exception as e:
            print(f"Warning: Could not set up Sentry logging: {e}")
    
    # Configure specific loggers
    configure_library_loggers()
    
    # Get application logger
    app_logger = logging.getLogger('gomafia_collector')
    app_logger.info(f"Logging initialized - Level: {level}")
    
    return app_logger


def configure_library_loggers():
    """Configure logging levels for third-party libraries."""
    # Reduce noise from HTTP libraries
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('requests').setLevel(logging.WARNING)
    logging.getLogger('supabase').setLevel(logging.INFO)
    
    # Selenium can be very verbose
    logging.getLogger('selenium').setLevel(logging.WARNING)
    logging.getLogger('urllib3.connectionpool').setLevel(logging.WARNING)


class ColoredFormatter(logging.Formatter):
    """Colored formatter for console output."""
    
    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
    }
    RESET = '\033[0m'
    
    def format(self, record):
        # Add color to level name
        levelname = record.levelname
        if levelname in self.COLORS:
            record.levelname = f"{self.COLORS[levelname]}{levelname}{self.RESET}"
        
        # Format the message
        formatted = super().format(record)
        
        # Reset levelname for future use
        record.levelname = levelname
        
        return formatted


class CollectionLogger:
    """Specialized logger for collection operations with metrics tracking."""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(f'gomafia_collector.{name}')
        self.start_time: Optional[datetime] = None
        self.metrics = {
            'scraped': 0,
            'validated': 0,
            'inserted': 0,
            'errors': 0
        }
    
    def start_collection(self, collection_type: str):
        """Start a collection operation."""
        self.start_time = datetime.now()
        self.metrics = {'scraped': 0, 'validated': 0, 'inserted': 0, 'errors': 0}
        self.logger.info(f"Starting {collection_type} collection")
    
    def log_scraped(self, count: int, source: str = ""):
        """Log scraped items."""
        self.metrics['scraped'] += count
        self.logger.info(f"Scraped {count} items from {source} (Total: {self.metrics['scraped']})")
    
    def log_validated(self, count: int, validation_details: str = ""):
        """Log validated items."""
        self.metrics['validated'] += count
        self.logger.info(f"Validated {count} items {validation_details} (Total: {self.metrics['validated']})")
    
    def log_inserted(self, count: int, table: str = ""):
        """Log inserted items."""
        self.metrics['inserted'] += count
        self.logger.info(f"Inserted {count} items to {table} (Total: {self.metrics['inserted']})")
    
    def log_error(self, error: Exception, context: str = ""):
        """Log an error with context."""
        self.metrics['errors'] += 1
        self.logger.error(f"Error in {context}: {error}", exc_info=True)
    
    def finish_collection(self, collection_type: str) -> dict:
        """Finish collection and return summary metrics."""
        if self.start_time:
            duration = (datetime.now() - self.start_time).total_seconds() / 60
        else:
            duration = 0
        
        summary = {
            'collection_type': collection_type,
            'duration_minutes': duration,
            'scraped': self.metrics['scraped'],
            'validated': self.metrics['validated'],
            'inserted': self.metrics['inserted'],
            'errors': self.metrics['errors'],
            'success_rate': (self.metrics['inserted'] / max(self.metrics['scraped'], 1)) * 100
        }
        
        self.logger.info(
            f"Collection completed: {collection_type} - "
            f"{self.metrics['inserted']}/{self.metrics['scraped']} items processed "
            f"({summary['success_rate']:.1f}% success) in {duration:.1f} minutes"
        )
        
        return summary


# Pre-configured logger instances for different components
def get_collector_logger(name: str) -> CollectionLogger:
    """Get a specialized collector logger."""
    return CollectionLogger(name)


def get_scraper_logger(name: str) -> logging.Logger:
    """Get a logger for scraper components."""
    return logging.getLogger(f'gomafia_collector.scraper.{name}')


def get_database_logger() -> logging.Logger:
    """Get a logger for database operations."""
    return logging.getLogger('gomafia_collector.database')


def get_scheduler_logger() -> logging.Logger:
    """Get a logger for scheduler operations."""
    return logging.getLogger('gomafia_collector.scheduler') 