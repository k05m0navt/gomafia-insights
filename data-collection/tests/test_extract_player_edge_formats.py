import sys
import unittest
from pathlib import Path

# Ensure data-collection/src package is importable by adding data-collection dir to sys.path
repo_root = Path(__file__).resolve().parents[2]
data_collection_dir = repo_root / 'data-collection'
if str(data_collection_dir) not in sys.path:
    sys.path.insert(0, str(data_collection_dir))

from src.tools.verify_parsing import extract_player_raw_from_html


data_collection_dir = repo_root / 'data-collection'


class ExtractPlayerEdgeFormatsTest(unittest.TestCase):
    def test_thinspace_fixture(self):
        fixture = data_collection_dir / 'tests' / 'fixtures' / 'fixture_thinspace.html'
        html = fixture.read_text(encoding='utf-8')
        raw = extract_player_raw_from_html(html, f"file://{fixture.resolve()}")

        self.assertIn('current_nickname', raw)
        self.assertIn('current_elo', raw)
        self.assertIn('games_played', raw)
        self.assertIn('games_won', raw)
        self.assertIn('win_rate', raw)

    def test_english_labels_fixture(self):
        fixture = data_collection_dir / 'tests' / 'fixtures' / 'fixture_english_labels.html'
        html = fixture.read_text(encoding='utf-8')
        raw = extract_player_raw_from_html(html, f"file://{fixture.resolve()}")

        self.assertIn('current_nickname', raw)
        self.assertEqual(raw.get('current_nickname'), 'EnglishPlayer')
        self.assertIn('current_elo', raw)
        self.assertIn('games_played', raw)
        self.assertIn('games_won', raw)
        self.assertIn('win_rate', raw)


if __name__ == '__main__':
    unittest.main()
