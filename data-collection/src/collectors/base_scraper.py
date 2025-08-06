"""
Base scraper class for GoMafia Analytics Data Collection.
Provides common functionality for web scraping with retry logic and rate limiting.
"""
import asyncio
import random
import time
import logging
from typing import Optional, Dict, Any, List
from abc import ABC, abstractmethod
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
from bs4 import BeautifulSoup
import aiohttp
from asyncio_throttle import Throttler

from ..config import config
from ..services.logger import get_scraper_logger

logger = get_scraper_logger('base')


class BaseScraper(ABC):
    """
    Base class for all web scrapers.
    Provides common functionality including:
    - Rate limiting and delays
    - Retry logic with exponential backoff
    - Error handling and logging
    - HTML parsing utilities
    """
    
    def __init__(self, name: str):
        """
        Initialize base scraper.
        
        Args:
            name: Name of the scraper for logging purposes
        """
        self.name = name
        self.logger = get_scraper_logger(name)
        self.session = self._create_session()
        self.headers = config.get_headers()
        
        # Rate limiting
        self.delay_min = config.scraping.delay_min
        self.delay_max = config.scraping.delay_max
        self.max_retries = config.scraping.max_retries
        self.timeout = config.scraping.request_timeout
        
        # Statistics
        self.stats = {
            'requests_made': 0,
            'requests_failed': 0,
            'pages_scraped': 0,
            'items_extracted': 0,
            'errors': []
        }
    
    def _create_session(self) -> requests.Session:
        """Create a requests session with retry strategy."""
        session = requests.Session()
        
        # Define retry strategy
        retry_strategy = Retry(
            total=self.max_retries,
            status_forcelist=[429, 500, 502, 503, 504],
            method_whitelist=["HEAD", "GET", "OPTIONS"],
            backoff_factor=1
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        return session
    
    def _apply_delay(self) -> None:
        """Apply random delay between requests to avoid being blocked."""
        delay = random.uniform(self.delay_min, self.delay_max)
        time.sleep(delay)
        self.logger.debug(f"Applied delay: {delay:.2f} seconds")
    
    def fetch_page(self, url: str, **kwargs) -> Optional[requests.Response]:
        """
        Fetch a single page with retry logic and error handling.
        
        Args:
            url: URL to fetch
            **kwargs: Additional arguments for requests.get()
            
        Returns:
            Response object if successful, None if failed
        """
        self.logger.debug(f"Fetching: {url}")
        
        # Apply delay before request
        self._apply_delay()
        
        try:
            self.stats['requests_made'] += 1
            
            response = self.session.get(
                url,
                headers=self.headers,
                timeout=self.timeout,
                **kwargs
            )
            response.raise_for_status()
            
            self.logger.debug(f"Successfully fetched: {url} (Status: {response.status_code})")
            return response
            
        except requests.RequestException as e:
            self.stats['requests_failed'] += 1
            error_msg = f"Failed to fetch {url}: {e}"
            self.logger.error(error_msg)
            self.stats['errors'].append(error_msg)
            return None
        except Exception as e:
            self.stats['requests_failed'] += 1
            error_msg = f"Unexpected error fetching {url}: {e}"
            self.logger.error(error_msg)
            self.stats['errors'].append(error_msg)
            return None
    
    def parse_html(self, html_content: str, parser: str = 'lxml') -> Optional[BeautifulSoup]:
        """
        Parse HTML content using BeautifulSoup.
        
        Args:
            html_content: HTML content to parse
            parser: Parser to use (default: lxml)
            
        Returns:
            BeautifulSoup object if successful, None if failed
        """
        try:
            soup = BeautifulSoup(html_content, parser)
            return soup
        except Exception as e:
            self.logger.error(f"Failed to parse HTML: {e}")
            return None
    
    def extract_text(self, element, default: str = "") -> str:
        """
        Safely extract text from a BeautifulSoup element.
        
        Args:
            element: BeautifulSoup element
            default: Default value if extraction fails
            
        Returns:
            Extracted text or default value
        """
        if element is None:
            return default
        
        try:
            text = element.get_text(strip=True)
            return text if text else default
        except Exception as e:
            self.logger.warning(f"Failed to extract text: {e}")
            return default
    
    def extract_links(self, soup: BeautifulSoup, base_url: str = "") -> List[str]:
        """
        Extract all links from a BeautifulSoup object.
        
        Args:
            soup: BeautifulSoup object
            base_url: Base URL to prepend to relative links
            
        Returns:
            List of absolute URLs
        """
        links = []
        
        try:
            for link in soup.find_all('a', href=True):
                href = link['href']
                
                # Convert relative URLs to absolute
                if href.startswith('/'):
                    if base_url:
                        href = base_url.rstrip('/') + href
                    else:
                        href = config.scraping.base_url.rstrip('/') + href
                elif not href.startswith(('http://', 'https://')):
                    continue  # Skip invalid links
                
                links.append(href)
                
        except Exception as e:
            self.logger.error(f"Failed to extract links: {e}")
        
        return links
    
    def save_html_debug(self, html_content: str, filename: str) -> None:
        """
        Save HTML content to file for debugging purposes.
        Only saves if debug mode is enabled.
        
        Args:
            html_content: HTML content to save
            filename: Filename to save to
        """
        if config.development.save_raw_html and config.development.debug_scraping:
            try:
                debug_dir = "debug_html"
                import os
                os.makedirs(debug_dir, exist_ok=True)
                
                filepath = os.path.join(debug_dir, filename)
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(html_content)
                
                self.logger.debug(f"Saved debug HTML to: {filepath}")
                
            except Exception as e:
                self.logger.warning(f"Failed to save debug HTML: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get scraper statistics."""
        success_rate = 0.0
        if self.stats['requests_made'] > 0:
            success_rate = ((self.stats['requests_made'] - self.stats['requests_failed']) / 
                          self.stats['requests_made']) * 100
        
        return {
            'scraper_name': self.name,
            'requests_made': self.stats['requests_made'],
            'requests_failed': self.stats['requests_failed'],
            'success_rate': round(success_rate, 2),
            'pages_scraped': self.stats['pages_scraped'],
            'items_extracted': self.stats['items_extracted'],
            'error_count': len(self.stats['errors']),
            'recent_errors': self.stats['errors'][-5:] if self.stats['errors'] else []
        }
    
    def reset_stats(self) -> None:
        """Reset scraper statistics."""
        self.stats = {
            'requests_made': 0,
            'requests_failed': 0,
            'pages_scraped': 0,
            'items_extracted': 0,
            'errors': []
        }
        self.logger.info(f"Reset statistics for {self.name} scraper")
    
    @abstractmethod
    def scrape(self, *args, **kwargs) -> List[Dict[str, Any]]:
        """
        Main scraping method to be implemented by subclasses.
        
        Returns:
            List of scraped data dictionaries
        """
        pass
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - cleanup resources."""
        if hasattr(self, 'session'):
            self.session.close()
        
        if exc_type is not None:
            self.logger.error(f"Scraper {self.name} exited with error: {exc_val}")


class AsyncBaseScraper(ABC):
    """
    Async version of base scraper for high-performance scraping.
    Useful for scraping multiple pages concurrently.
    """
    
    def __init__(self, name: str):
        self.name = name
        self.logger = get_scraper_logger(f"async_{name}")
        
        # Rate limiting for async requests
        self.throttler = Throttler(rate_limit=config.scraping.max_parallel_requests)
        self.timeout = aiohttp.ClientTimeout(total=config.scraping.request_timeout)
        
        self.stats = {
            'requests_made': 0,
            'requests_failed': 0,
            'pages_scraped': 0,
            'items_extracted': 0,
            'errors': []
        }
    
    async def fetch_page_async(self, session: aiohttp.ClientSession, url: str, **kwargs) -> Optional[str]:
        """
        Async fetch a single page.
        
        Args:
            session: aiohttp session
            url: URL to fetch
            **kwargs: Additional arguments
            
        Returns:
            HTML content if successful, None if failed
        """
        async with self.throttler:
            try:
                self.stats['requests_made'] += 1
                
                async with session.get(url, **kwargs) as response:
                    response.raise_for_status()
                    content = await response.text()
                    
                    self.logger.debug(f"Successfully fetched async: {url}")
                    return content
                    
            except aiohttp.ClientError as e:
                self.stats['requests_failed'] += 1
                error_msg = f"Failed to fetch async {url}: {e}"
                self.logger.error(error_msg)
                self.stats['errors'].append(error_msg)
                return None
            except Exception as e:
                self.stats['requests_failed'] += 1
                error_msg = f"Unexpected error fetching async {url}: {e}"
                self.logger.error(error_msg)
                self.stats['errors'].append(error_msg)
                return None
    
    async def fetch_multiple_pages(self, urls: List[str]) -> List[Optional[str]]:
        """
        Fetch multiple pages concurrently.
        
        Args:
            urls: List of URLs to fetch
            
        Returns:
            List of HTML content (None for failed requests)
        """
        connector = aiohttp.TCPConnector(limit=config.scraping.max_parallel_requests)
        
        async with aiohttp.ClientSession(
            connector=connector,
            timeout=self.timeout,
            headers=config.get_headers()
        ) as session:
            tasks = [self.fetch_page_async(session, url) for url in urls]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Handle exceptions in results
            processed_results = []
            for result in results:
                if isinstance(result, Exception):
                    self.logger.error(f"Async fetch exception: {result}")
                    processed_results.append(None)
                else:
                    processed_results.append(result)
            
            return processed_results
    
    @abstractmethod
    async def scrape_async(self, *args, **kwargs) -> List[Dict[str, Any]]:
        """
        Main async scraping method to be implemented by subclasses.
        
        Returns:
            List of scraped data dictionaries
        """
        pass 