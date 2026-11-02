"""Private runtime image preparation preserves existing PE flags and relocations."""
import importlib.util
from pathlib import Path
import struct
import tempfile
import unittest

spec = importlib.util.spec_from_file_location(
    'windows_peflags', Path(__file__).resolve().parents[1] / 'windows-peflags.py')
peflags = importlib.util.module_from_spec(spec)
spec.loader.exec_module(peflags)


class PrivateImageFlags(unittest.TestCase):
    def image(self, flags=0x100, relocations=True):
        data = bytearray(512)
        data[:2] = b'MZ'
        struct.pack_into('<I', data, 0x3C, 0x80)
        data[0x80:0x84] = b'PE\0\0'
        struct.pack_into('<H', data, 0x98, 0x20B)
        struct.pack_into('<H', data, 0x98 + 70, flags)
        struct.pack_into('<I', data, 0x98 + 0x70 + 5 * 8, 0x1000 if relocations else 0)
        return data

    def test_enables_aslr_once_without_changing_other_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'private.exe'
            data = self.image()
            path.write_bytes(data)
            self.assertTrue(peflags.enable_aslr(path))
            struct.pack_into('<H', data, 0x98 + 70, 0x140)
            self.assertEqual(path.read_bytes(), data)
            self.assertFalse(peflags.enable_aslr(path))
            self.assertEqual(path.read_bytes(), data)

    def test_missing_relocations_cannot_be_claimed_as_aslr_capable(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'private.dll'
            data = self.image(relocations=False)
            path.write_bytes(data)
            with self.assertRaisesRegex(ValueError, 'without relocations'):
                peflags.enable_aslr(path)
            self.assertEqual(path.read_bytes(), data)

    def test_rejects_non_pe_input_without_modifying_it(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'private.exe'
            path.write_bytes(b'not an executable')
            with self.assertRaisesRegex(ValueError, 'Not a PE image'):
                peflags.enable_aslr(path)
            self.assertEqual(path.read_bytes(), b'not an executable')


if __name__ == '__main__':
    unittest.main()
