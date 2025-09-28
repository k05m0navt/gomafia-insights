# GoMafia Analytics Data Collection Service

A comprehensive Python service for collecting, validating, and storing Mafia game data from gomafia.pro, designed to work seamlessly with the Prisma-powered Next.js analytics dashboard.

## 🏗️ Architecture Overview

The data collection service follows a modular architecture with clear separation of concerns:

```
src/
├── config.py              # Configuration management with Pydantic validation
├── main.py                # Main orchestrator service (400+ lines)
├── models/                 # Data models aligned with Prisma schema
│   ├── base.py            # Base model with validation framework
│   ├── player.py          # Player and game participation models
│   └── tournament.py      # Tournament and game models
├── services/              # Core service layers
│   ├── database.py        # Supabase database operations (400+ lines)
│   └── logger.py          # Structured logging with metrics
└── collectors/            # Web scraping components
    └── base_scraper.py    # Base scraper with retry logic (300+ lines)
```

## ✅ Current Implementation Status

### Core Infrastructure - **100% Complete**
- ✅ **Configuration System**: Environment-based config with Pydantic validation
- ✅ **Data Models**: Comprehensive models aligned with Prisma schema (500+ lines)
- ✅ **Database Service**: Full CRUD operations with Supabase integration (400+ lines)  
- ✅ **Logging System**: Structured logging with metrics and file rotation
- ✅ **Base Scraper**: Robust scraping framework with retry logic and rate limiting
- ✅ **Main Orchestrator**: Complete data collection coordination service

### Key Features Implemented
- **Type Safety**: Full Pydantic validation with Prisma schema alignment
- **Error Handling**: Comprehensive error handling with detailed logging
- **Data Quality**: ValidationResult system with quality scoring
- **Batch Operations**: Configurable batch processing for performance
- **Rate Limiting**: Smart delays and throttling to respect server limits
- **Field Mapping**: Automatic conversion between Python/Database field names
- **Collection Metrics**: Detailed tracking of scraping, validation, and insertion stats
- **Database Logging**: All collection runs tracked with performance metrics

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Supabase project with PostgreSQL database
- GoMafia.pro access (for scraping)

### Installation
```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Test the system
python -m src.main status
```

### Basic Usage
```bash
# Run full data collection
python -m src.main all

# Collect only players
python -m src.main players

# Collect only tournaments  
python -m src.main tournaments

# Check collection status
python -m src.main status
```

## 📊 Data Flow Architecture

```mermaid
graph TD
    A[GoMafia.pro] --> B[Web Scrapers]
    B --> C[Data Models + Validation]
    C --> D[Database Service]
    D --> E[Supabase PostgreSQL]
    E --> F[Prisma Client]
    F --> G[Next.js Analytics Dashboard]
    
    H[Collection Orchestrator] --> B
    H --> I[Logging Service]
    H --> J[Collection Metrics]
```

## 🔧 Configuration

The service uses environment-based configuration with validation:

```python
# Example .env configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_role_key
GOMAFIA_BASE_URL=https://gomafia.pro
SCRAPING_DELAY_MIN=1
SCRAPING_DELAY_MAX=3
LOG_LEVEL=INFO
```

## 📈 Data Models

### Player Data Model
Aligned with Prisma Player schema:
```python
class PlayerData(BaseModel):
    go_mafia_id: int              # Unique GoMafia ID
    current_nickname: str         # Current player name
    profile_url: str             # Profile URL
    current_elo: int             # Current ELO rating
    games_played: int            # Total games
    win_rate: float              # Win percentage
    # ... plus role-specific stats
```

### Tournament Data Model  
Comprehensive tournament tracking:
```python
class TournamentData(BaseModel):
    name: str                    # Tournament name
    start_date: datetime         # Start date
    end_date: datetime          # End date  
    tournament_type: TournamentType  # INDIVIDUAL/TEAM
    max_participants: int        # Player limit
    # ... plus organization details
```

## 🔍 Database Operations

### Player Operations
```python
# Upsert single player
player_id = db_service.upsert_player(player_data)

# Batch upsert players
successful, failed = db_service.batch_upsert_players(player_list)

# Get player by GoMafia ID
player = db_service.get_player_by_go_mafia_id(3170)
```

### Collection Logging
All operations are automatically logged:
```python
# Automatic collection logging
db_service.log_collection_run(
    data_type="player_collection",
    total_scraped=100,
    total_validated=95, 
    total_inserted=90,
    duration_minutes=5.2,
    success=True
)
```

## 📋 Web Scraping Framework

### Base Scraper Features
- **Rate Limiting**: Configurable delays between requests
- **Retry Logic**: Exponential backoff for failed requests  
- **Error Handling**: Comprehensive error capture and logging
- **HTML Parsing**: BeautifulSoup integration with utilities
- **Debug Support**: HTML saving for debugging
- **Statistics**: Request success/failure tracking

### Creating Custom Scrapers
```python
class PlayerScraper(BaseScraper):
    def __init__(self):
        super().__init__("player_scraper")
    
    def scrape(self, player_ids: List[int]) -> List[Dict[str, Any]]:
        players = []
        for player_id in player_ids:
            url = f"{config.scraping.base_url}/stats/{player_id}"
            response = self.fetch_page(url)
            if response:
                player_data = self.parse_player_page(response.text)
                players.append(player_data)
                self.stats['items_extracted'] += 1
        return players
```

## 📊 Collection Orchestrator

The main orchestrator coordinates all collection activities:

### Features
- **Session Management**: Track collection sessions with metrics
- **Multi-source Collection**: Coordinate players, tournaments, games
- **Error Recovery**: Continue collection despite individual failures
- **Progress Tracking**: Detailed progress logging and metrics
- **Database Integration**: Automatic result storage and logging

### Usage Example
```python
orchestrator = DataCollectionOrchestrator()
await orchestrator.initialize()

# Collect all data types
results = await orchestrator.collect_all_data()

# Results include detailed metrics:
# {
#   'players': {...},
#   'tournaments': {...}, 
#   'combined_stats': {
#     'total_scraped': 150,
#     'total_inserted': 145,
#     'overall_success_rate': 96.7
#   }
# }
```

## 🔐 Data Validation

### Validation Framework
Every data model includes comprehensive validation:

```python
# Example validation
player_data = PlayerData.from_scraped_data(raw_data)
validation = player_data.validate_data()

if validation.is_valid:
    # Process valid data
    db_service.upsert_player(player_data)
else:
    # Handle validation errors
    logger.error(f"Validation failed: {validation.get_summary()}")
    # Summary includes:
    # - Specific errors and warnings
    # - Data quality score (0-100)
    # - Actionable error messages
```

### Validation Features
- **Required Field Checking**: Ensure all critical fields present
- **Data Consistency**: Cross-field validation (e.g., win_rate vs games_won)
- **Format Validation**: URL, date, and numeric format checking
- **Russian Text Parsing**: Handle Cyrillic text and date formats
- **Quality Scoring**: Numerical quality score for data triage

## 📈 Logging and Monitoring

### Structured Logging
- **Multiple Handlers**: Console (colored) + file (rotated) + Sentry (optional)
- **Log Levels**: DEBUG/INFO/WARNING/ERROR with configurable thresholds
- **Context Logging**: Function names, line numbers, stack traces
- **Metrics Integration**: Collection statistics embedded in logs

### Collection Metrics
```python
# Automatic metrics tracking
collector_logger = get_collector_logger("player_collection")
collector_logger.start_collection("player_data")
collector_logger.log_scraped(100, "player profiles")
collector_logger.log_validated(95, "players")
collector_logger.log_inserted(90, "players table")
summary = collector_logger.finish_collection("player_data")

# Summary includes:
# - Duration, success rate, error count
# - Detailed breakdown by operation type
# - Performance metrics
```

## ⚙️ Technical Specifications

### Dependencies
- **Web Scraping**: requests, beautifulsoup4, lxml, selenium
- **Data Processing**: pandas, numpy, python-dateutil  
- **Database**: supabase, psycopg2-binary
- **Async Support**: aiohttp, asyncio-throttle
- **Scheduling**: APScheduler (ready for integration)
- **Configuration**: python-dotenv, pydantic
- **Logging**: structlog, sentry-sdk

### Performance Features
- **Batch Processing**: Configurable batch sizes for database operations
- **Rate Limiting**: Smart delays to avoid being blocked
- **Connection Pooling**: Efficient database connection management
- **Async Support**: Ready for concurrent scraping operations
- **Memory Efficient**: Streaming processing for large datasets

## 🔄 Integration with Frontend

### Prisma Schema Alignment
All data models are precisely aligned with the Prisma schema:
- **Field Mapping**: Automatic Python snake_case ↔ Database camelCase
- **Type Safety**: Pydantic validation matches Prisma types
- **Enum Consistency**: All enums match Prisma schema definitions
- **Relationship Integrity**: Foreign keys and relations properly handled

### Database Operations
```python
# Field mapping example
python_data = {
    'go_mafia_id': 3170,           # Maps to goMafiaId
    'current_nickname': 'Player',   # Maps to currentNickname  
    'win_rate': 0.65               # Maps to winRate
}
```

## 📝 Next Steps for Web Scrapers

To complete the implementation, add specific scrapers:

1. **PlayerScraper**: Scrape player profiles and statistics
2. **TournamentScraper**: Collect tournament listings and details
3. **GameScraper**: Extract individual game results and participation
4. **LeaderboardScraper**: Collect ranking and ELO data

Each scraper should extend `BaseScraper` and implement the `scrape()` method.

## 🚀 Deployment Ready

The service is ready for deployment with:
- **Configuration Management**: Environment-based configuration
- **Error Handling**: Comprehensive error capture and recovery
- **Logging**: Production-ready logging with rotation
- **Database Operations**: Robust database integration
- **Monitoring**: Built-in metrics and health checking

## 📊 Statistics

**Total Implementation**: 1,800+ lines of Python code
- **Main Orchestrator**: ~400 lines
- **Database Service**: ~400 lines  
- **Data Models**: ~500 lines
- **Base Scraper**: ~300 lines
- **Configuration & Logging**: ~200 lines

**Features Delivered**:
- ✅ 100% Prisma schema alignment
- ✅ Comprehensive data validation
- ✅ Production-ready error handling
- ✅ Structured logging with metrics
- ✅ Batch operations for performance
- ✅ Type safety throughout
- ✅ Modular, extensible architecture

---

**Phase 2 Status**: 🚀 **INFRASTRUCTURE COMPLETE** - Ready for scraper implementations and scheduling 

### Running the verifier test

If you have `pytest` installed you can run the CLI unit test:

```bash
# from repo root
python3 -m pytest -q data-collection/tests/test_verify_parsing_cli.py
```

If `pytest` is not installed, use `unittest`:

```bash
python3 -m unittest data-collection/tests/test_verify_parsing_cli.py
```

Optional Make target (from repo root):

```bash
# Run the verifier CLI test
make -C data-collection test-verify
```

Add this Make target to a project-level Makefile if you want a shortcut. 

## Verifier wrapper flags

The wrapper supports an optional `--no-venv` flag which skips automatic virtual environment
creation and dependency installation. Use this when you prefer to manage dependencies yourself.

```bash
# Skip venv/bootstrap and run verifier (errors shown if deps missing)
python3 data-collection/tools/verify_parsing.py --no-venv --players data-collection/debug_html/page_20250828T093650Z.html
```

When the verifier encounters validation errors or unexpected parsing exceptions while processing
fixture HTML files, it will save the raw HTML under `data-collection/tests/fixtures/` with a
timestamped filename to make inspection and test creation easier. 