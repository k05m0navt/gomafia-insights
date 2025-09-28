"""
Base data model classes for GoMafia Analytics Data Collection Service.
Provides common functionality for data validation and database operations.
"""
from typing import Any, Dict, Optional, List
from datetime import datetime
from pydantic import BaseModel, field_validator, ConfigDict
import logging

logger = logging.getLogger(__name__)


class BaseModel(BaseModel):
    """Base model with common functionality for all data models."""
    
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Pydantic v2 config
    model_config = ConfigDict(
        extra='allow',
        use_enum_values=True,
        validate_assignment=True,
        arbitrary_types_allowed=True,
    )

    @field_validator('created_at', 'updated_at', mode='before')
    def parse_datetime(cls, v):
        """Parse datetime from various formats."""
        if v is None:
            return None
        if isinstance(v, str):
            try:
                # Try various datetime formats
                for fmt in [
                    "%Y-%m-%d %H:%M:%S",
                    "%Y-%m-%dT%H:%M:%S",
                    "%Y-%m-%dT%H:%M:%S.%f",
                    "%Y-%m-%dT%H:%M:%S%z",
                    "%d.%m.%Y",
                    "%d.%m.%Y %H:%M",
                ]:
                    try:
                        return datetime.strptime(v, fmt)
                    except ValueError:
                        continue
                
                # If no format worked, raise error
                raise ValueError(f"Unable to parse datetime: {v}")
            except Exception as e:
                logger.warning(f"Failed to parse datetime '{v}': {e}")
                return None
        return v
    
    def dict_for_supabase(self) -> Dict[str, Any]:
        """
        Convert model to dictionary suitable for Supabase insertion.
        Excludes None values and converts enums to strings.
        """
        data = self.dict(exclude_none=True, by_alias=True)
        
        # Convert datetime objects to ISO format strings
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
        
        return data
    
    def validate_required_fields(self, required_fields: List[str]) -> bool:
        """Validate that all required fields are present and not None."""
        data = self.dict()
        missing_fields = []
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                missing_fields.append(field)
        
        if missing_fields:
            logger.warning(f"Missing required fields: {missing_fields}")
            return False
        
        return True
    
    def log_validation_errors(self) -> None:
        """Log any validation errors for debugging."""
        try:
            self.dict()
        except Exception as e:
            logger.error(f"Validation error in {self.__class__.__name__}: {e}")
            logger.error(f"Model data: {self.__dict__}")
    
    @classmethod
    def from_scraped_data(cls, raw_data: Dict[str, Any]) -> 'BaseModel':
        """
        Create model instance from raw scraped data.
        Override this method in subclasses for specific parsing logic.
        """
        try:
            return cls(**raw_data)
        except Exception as e:
            logger.error(f"Failed to create {cls.__name__} from raw data: {e}")
            logger.error(f"Raw data: {raw_data}")
            raise
    
    def cleanup_data(self) -> None:
        """
        Clean up data fields, removing empty strings, normalizing text, etc.
        Override this method in subclasses for specific cleanup logic.
        """
        data = self.dict()
        for field_name, value in data.items():
            if isinstance(value, str):
                # Strip whitespace and convert empty strings to None
                cleaned_value = value.strip()
                if cleaned_value == "":
                    setattr(self, field_name, None)
                else:
                    setattr(self, field_name, cleaned_value)


class ValidationResult:
    """Result of data validation with details about issues found."""
    
    def __init__(self):
        self.is_valid = True
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.data_quality_score = 100.0
    
    def add_error(self, message: str) -> None:
        """Add a validation error."""
        self.errors.append(message)
        self.is_valid = False
        self.data_quality_score -= 20
    
    def add_warning(self, message: str) -> None:
        """Add a validation warning."""
        self.warnings.append(message)
        self.data_quality_score -= 5
    
    def get_summary(self) -> str:
        """Get a summary of validation results."""
        status = "VALID" if self.is_valid else "INVALID"
        return f"Validation: {status} (Quality: {self.data_quality_score:.1f}%) - {len(self.errors)} errors, {len(self.warnings)} warnings" 