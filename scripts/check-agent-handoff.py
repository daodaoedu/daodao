#!/usr/bin/env python3
"""Repository entrypoint for the packaged canonical handoff validator."""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location('handoff', Path(__file__).resolve().parents[1] / 'plugin/hooks/agent-handoff.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
validate = module.validate

if __name__ == '__main__':
    raise SystemExit(module.main())
