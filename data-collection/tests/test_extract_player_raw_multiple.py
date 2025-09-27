import sys
import unittest
from pathlib import Path

# Ensure data-collection/src package is importable
repo_root = Path(__file__).resolve().parents[2]
data_collection_dir = repo_root / 'data-collection'
if str(data_collection_dir) not in sys.path:
    sys.path.insert(0, str(data_collection_dir))

from src.tools.verify_parsing import extract_player_raw_from_html


class ExtractPlayerRawMultipleTest(unittest.TestCase):
    def test_all_debug_html_fixtures_parse(self):
        fixtures_dir = data_collection_dir / 'debug_html'
        html_files = sorted(fixtures_dir.glob('*.html'))
        self.assertTrue(len(html_files) > 0, f"No fixtures found in {fixtures_dir}")

        for f in html_files:
            with self.subTest(f=f.name):
                html = f.read_text(encoding='utf-8')
                raw = extract_player_raw_from_html(html, f"file://{f.resolve()}")

                # Basic expectations
                self.assertIsInstance(raw, dict)
                self.assertIn('profile_url', raw)
                self.assertTrue(raw.get('profile_url'))
                self.assertIn('full_text_snippet', raw)


if __name__ == '__main__':
    unittest.main()


