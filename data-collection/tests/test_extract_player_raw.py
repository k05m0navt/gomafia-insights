import sys
import unittest
from pathlib import Path

# Ensure data-collection/src package is importable by adding data-collection directory to sys.path
repo_root = Path(__file__).resolve().parents[2]
data_collection_dir = repo_root / 'data-collection'
if str(data_collection_dir) not in sys.path:
    sys.path.insert(0, str(data_collection_dir))

from src.tools.verify_parsing import extract_player_raw_from_html


class ExtractPlayerRawTest(unittest.TestCase):
    def test_extracts_core_fields_from_fixture(self):
        fixture = repo_root / 'data-collection' / 'debug_html' / 'page_20250828T093650Z.html'
        html = fixture.read_text(encoding='utf-8')

        raw = extract_player_raw_from_html(html, f"file://{fixture.resolve()}")

        # Core extracted fields
        self.assertIn('current_nickname', raw)
        self.assertTrue(raw.get('current_nickname'))
        self.assertIn('profile_url', raw)
        # profile_url should be canonical (https) when ID present or fallback to provided URL
        self.assertRegex(raw.get('profile_url', ''), r'^https?://')
        self.assertIn('full_text_snippet', raw)


if __name__ == '__main__':
    unittest.main()
