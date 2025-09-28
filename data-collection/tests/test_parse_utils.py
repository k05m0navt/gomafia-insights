import sys
import unittest
from pathlib import Path

# Ensure data-collection/src package is importable
repo_root = Path(__file__).resolve().parents[2]
data_collection_dir = repo_root / 'data-collection'
if str(data_collection_dir) not in sys.path:
    sys.path.insert(0, str(data_collection_dir))

from src.tools.verify_parsing import parse_int_like, parse_float_like, extract_player_raw_from_html


class ParseUtilsTest(unittest.TestCase):
    def test_parse_int_like_examples(self):
        self.assertEqual(parse_int_like('1,250'), 1250)
        self.assertEqual(parse_int_like('1 250'), 1250)
        self.assertEqual(parse_int_like('1250'), 1250)
        self.assertEqual(parse_int_like('0'), 0)

    def test_parse_float_like_examples(self):
        self.assertAlmostEqual(parse_float_like('65%'), 0.65)
        self.assertAlmostEqual(parse_float_like('0.65'), 0.65)
        self.assertAlmostEqual(parse_float_like('0,65'), 0.65)
        self.assertAlmostEqual(parse_float_like('65'), 65.0)

    def test_extract_from_next_data_fixture(self):
        fixture = repo_root / 'data-collection' / 'tests' / 'fixtures' / 'fixture_next_data.html'
        html = fixture.read_text(encoding='utf-8')
        raw = extract_player_raw_from_html(html, f"file://{fixture.resolve()}")
        self.assertEqual(raw.get('current_nickname'), 'TestUser')
        self.assertIn('current_elo', raw)
        self.assertEqual(int(raw.get('current_elo')), 1500)
        self.assertIn('games_played', raw)
        self.assertIn('games_won', raw)

    def test_extract_from_ldjson_fixture(self):
        fixture = repo_root / 'data-collection' / 'tests' / 'fixtures' / 'fixture_ldjson.html'
        html = fixture.read_text(encoding='utf-8')
        raw = extract_player_raw_from_html(html, f"file://{fixture.resolve()}")
        # LD+JSON fixture contains 'LDUser' as name
        self.assertTrue(raw.get('current_nickname') in ('LDUser', 'LDUser — GoMafia', 'LDUser'))
        self.assertIn('current_elo', raw)
        self.assertIn('games_played', raw)
        self.assertIn('games_won', raw)


if __name__ == '__main__':
    unittest.main()
