import json
import shutil
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'plugin/skills/develop/references/poc-compare/poc-report.py'


def probe(text='標題'):
    return {'rect': {'w': 200, 'h': 40}, 'text': text, 'directText': True, 'childCount': 1,
            'fontSize': '16px', 'color': 'rgb(0,0,0)'}


class PocReportTests(unittest.TestCase):
    def run_report(self, poc, impl, required=('card', 'button', 'dialog'), extra_poc_only=None):
        task = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, task, ignore_errors=True)
        out = task / 'notes/poc-compare'
        out.mkdir(parents=True)
        (out / 'a-poc.json').write_text(json.dumps({'probes': poc}))
        (out / 'a-impl.json').write_text(json.dumps({'probes': impl}))
        if extra_poc_only:
            (out / 'b-poc.json').write_text(json.dumps({'probes': extra_poc_only}))
        cats = ', '.join(f'"{c}"' for c in required)
        (out / 'config.mjs').write_text(f'export default {{ categories: {{ required: [{cats}] }} }}\n')
        result = subprocess.run([sys.executable, str(SCRIPT), '--task', str(task), '--no-composite'],
                                capture_output=True, text=True, check=True)
        coverage = json.loads((out / 'coverage.json').read_text())
        diff = json.loads((out / 'diff-items.json').read_text())
        self.totals = diff['totals']
        tables = (out / 'report-tables.md').read_text()
        return coverage, diff['items'], tables, result.stdout

    def test_probe_resolved_on_neither_side_is_reported_not_skipped(self):
        coverage, _, tables, stdout = self.run_report(
            {'card.title': probe(), 'button.typo': None, 'dialog.box': probe()},
            {'card.title': probe(), 'button.typo': None, 'dialog.box': probe()})
        self.assertEqual(coverage['unresolved'], ['a · button.typo'])
        self.assertIn('未解析', tables)
        self.assertIn('probe 解析 2/3 個（未解析 1 個）', tables)
        self.assertIn('probe 解析 2/3', stdout)
        self.assertEqual(self.totals['bad'], 1)

    def test_unresolved_probe_does_not_count_as_category_coverage(self):
        coverage, _, _, _ = self.run_report(
            {'card.title': probe(), 'button.typo': None, 'dialog.box': probe()},
            {'card.title': probe(), 'button.typo': None, 'dialog.box': probe()})
        self.assertNotIn('button', coverage['present'])
        self.assertIn('button', coverage['missing'])

    def test_element_in_poc_but_missing_from_impl_is_a_failure(self):
        _, items, _, _ = self.run_report(
            {'card.title': probe(), 'button.save': probe('儲存'), 'dialog.box': probe()},
            {'card.title': probe(), 'button.save': None, 'dialog.box': probe()})
        missing = [i for i in items if i['key'] == 'button.save']
        self.assertEqual([i['status'] for i in missing], ['❌'])
        self.assertEqual((self.totals['bad'], self.totals['warn']), (1, 0))

    def test_extra_element_only_in_impl_stays_a_warning(self):
        _, items, _, _ = self.run_report(
            {'card.title': probe(), 'button.extra': None, 'dialog.box': probe()},
            {'card.title': probe(), 'button.extra': probe('多的'), 'dialog.box': probe()})
        extra = [i for i in items if i['key'] == 'button.extra']
        self.assertEqual([i['status'] for i in extra], ['⚠️'])
        self.assertEqual((self.totals['bad'], self.totals['warn']), (0, 1))

    def test_checkpoint_without_impl_measurement_is_unresolved(self):
        coverage, _, _, stdout = self.run_report(
            {'card.title': probe(), 'button.save': probe('儲存'), 'dialog.box': probe()},
            {'card.title': probe(), 'button.save': probe('儲存'), 'dialog.box': probe()},
            extra_poc_only={'card.other': probe()})
        self.assertEqual(coverage['skipped_checkpoints'], ['b'])
        self.assertTrue(any(u.startswith('b · ') for u in coverage['unresolved']))
        self.assertIn('checkpoint 量到 1/2', stdout)

    def test_coverage_records_the_config_it_was_measured_with(self):
        import hashlib
        coverage, _, _, _ = self.run_report(
            {'card.title': probe(), 'button.save': probe('儲存'), 'dialog.box': probe()},
            {'card.title': probe(), 'button.save': probe('儲存'), 'dialog.box': probe()})
        config = Path(coverage['config_path']).read_bytes()
        self.assertEqual(coverage['config_sha256'], hashlib.sha256(config).hexdigest())

    def test_fully_resolved_matching_probes_stay_clean(self):
        coverage, items, _, _ = self.run_report(
            {'card.title': probe(), 'button.save': probe('儲存'), 'dialog.box': probe()},
            {'card.title': probe(), 'button.save': probe('儲存'), 'dialog.box': probe()})
        self.assertEqual(coverage['unresolved'], [])
        self.assertEqual(coverage['missing'], [])
        self.assertEqual(items, [])


if __name__ == '__main__':
    unittest.main()
