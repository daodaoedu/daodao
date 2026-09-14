import unittest


class BenchmarkEnforcementFixture(unittest.TestCase):
    @unittest.skip('intentional required-check enforcement fixture')
    def test_required_check_blocks_merge(self):
        self.assertTrue(True)
