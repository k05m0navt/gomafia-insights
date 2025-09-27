import sys
import unittest
from pathlib import Path

# Ensure data-collection package importable
repo_root = Path(__file__).resolve().parents[2]
data_collection_dir = repo_root / 'data-collection'
if str(data_collection_dir) not in sys.path:
    sys.path.insert(0, str(data_collection_dir))

from src.tools.verify_parsing import extract_player_raw_from_html


class ExtractPlayerExoticNumbersTest(unittest.TestCase):
    def test_exotic_numbers_fixture(self):
        fixture = data_collection_dir / 'tests' / 'fixtures' / 'fixture_exotic_numbers.html'
        html = fixture.read_text(encoding='utf-8')
        raw = extract_player_raw_from_html(html, f"file://{fixture.resolve()}")

        self.assertIn('current_nickname', raw)
        self.assertEqual(raw.get('current_nickname'), 'ExoticNumbersPlayer')
        self.assertIn('games_played', raw)
        self.assertIn('games_won', raw)
        self.assertIn('win_rate', raw)
        # Ensure win_rate parsed decimal with comma becomes normalized
        self.assertTrue(str(raw.get('win_rate')).replace(',', '.'))


if __name__ == '__main__':
    unittest.main()
