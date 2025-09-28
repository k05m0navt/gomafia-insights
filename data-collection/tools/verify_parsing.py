#!/usr/bin/env python3
"""
Thin executable wrapper for the existing verifier in `src.tools.verify_parsing`.
This script ensures the `data-collection/` directory (parent of this file) is on `sys.path`
so the `src` package can be imported and then delegates to `src.tools.verify_parsing.main`.

If required dependencies are missing, this wrapper can automatically create an isolated
virtual environment under `data-collection/.venv_verify_parsing`, install the
`data-collection/requirements.txt` (if present) or a small fallback set of packages,
and re-execute the script inside that venv. This is non-destructive and intended for
local developer convenience.
"""

from __future__ import annotations

import os
import sys
import subprocess
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

VENV_DIR = ROOT / '.venv_verify_parsing'
VENV_FLAG_ENV = 'VERIFY_PARSING_VENV_TRIED'


def _venv_python_path(venv_dir: Path) -> Path:
    """Return platform-appropriate python executable inside venv."""
    if os.name == 'nt':
        return venv_dir / 'Scripts' / 'python.exe'
    return venv_dir / 'bin' / 'python'


def _pip_install(venv_python: Path, args: list[str]) -> bool:
    """Run pip install using the venv python. Return True on success."""
    try:
        subprocess.check_call([str(venv_python), '-m', 'pip'] + args)
        return True
    except subprocess.CalledProcessError:
        return False


def _create_venv_and_install_requirements(venv_dir: Path, req_file: Optional[Path]) -> Optional[Path]:
    """Create a venv (if needed), install requirements (or fallback packages), and return the venv python path.

    Returns None on failure.
    """
    try:
        # Create venv if missing
        if not venv_dir.exists():
            print(f"Creating virtual environment at: {venv_dir}")
            subprocess.check_call([sys.executable, '-m', 'venv', str(venv_dir)])

        venv_python = _venv_python_path(venv_dir)
        if not venv_python.exists():
            print(f"Expected venv python not found at {venv_python}", file=sys.stderr)
            return None

        # Ensure pip is available and upgraded
        print('Ensuring pip is available in venv...')
        if not _pip_install(venv_python, ['install', '--upgrade', 'pip']):
            print('Failed to upgrade pip in venv', file=sys.stderr)

        # First attempt: install full requirements if present
        if req_file and req_file.exists():
            print(f"Installing requirements from {req_file} into venv...")
            success = _pip_install(venv_python, ['install', '-r', str(req_file)])
            if success:
                return venv_python
            else:
                print('Installing full requirements failed; will attempt minimal fallback set.', file=sys.stderr)

        # Fallback minimal packages (include common project runtime deps)
        fallback = ['requests', 'beautifulsoup4', 'lxml', 'pydantic', 'pydantic-settings']
        print(f"Installing fallback packages into venv: {fallback}")
        if _pip_install(venv_python, ['install'] + fallback):
            return venv_python

        print('Failed to install fallback packages into venv', file=sys.stderr)
        return None

    except subprocess.CalledProcessError as exc:
        print(f"Failed to create venv or install dependencies: {exc}", file=sys.stderr)
        return None
    except Exception as exc:
        print(f"Unexpected error while preparing venv: {exc}", file=sys.stderr)
        return None


def _reexec_in_venv(venv_python: Path) -> None:
    """Re-execute the current script using the venv python.
    This call does not return on success.
    """
    # Preserve an env flag so we don't loop indefinitely
    os.environ[VENV_FLAG_ENV] = '1'

    args = [str(venv_python), str(Path(__file__).resolve())]
    # Append original CLI args
    args.extend(sys.argv[1:])

    print(f"Re-executing under venv python: {venv_python}")
    os.execv(str(venv_python), args)


def _ensure_supabase_env_fallbacks() -> None:
    """Set minimal SUPABASE env vars if missing to allow non-destructive verification runs."""
    if not os.environ.get('SUPABASE_URL'):
        os.environ['SUPABASE_URL'] = 'http://localhost/'
    if not os.environ.get('SUPABASE_KEY'):
        os.environ['SUPABASE_KEY'] = 'local-testing-key'
    # Some BaseSettings configurations may use an env_prefix like 'SUPABASE_',
    # which results in lookup keys like 'SUPABASE_SUPABASE_URL'. Set those too as fallback.
    if not os.environ.get('SUPABASE_SUPABASE_URL'):
        os.environ['SUPABASE_SUPABASE_URL'] = os.environ.get('SUPABASE_URL')
    if not os.environ.get('SUPABASE_SUPABASE_KEY'):
        os.environ['SUPABASE_SUPABASE_KEY'] = os.environ.get('SUPABASE_KEY')


def _main_cli(argv: list[str] | None = None) -> None:
    # Ensure minimal SUPABASE env vars exist before importing config-backed modules
    _ensure_supabase_env_fallbacks()

    # Determine delegate args and whether user requested no venv bootstrap
    delegate_args = argv if argv is not None else sys.argv[1:]
    no_venv = False
    if '--no-venv' in delegate_args:
        no_venv = True
        # remove the flag before delegating or re-exec
        delegate_args = [a for a in delegate_args if a != '--no-venv']

    try:
        from src.tools.verify_parsing import main as verifier_main
    except ImportError as exc:  # pragma: no cover - import guard
        # Provide a clearer message and attempt to self-bootstrap a venv + deps when appropriate
        msg = str(exc)
        req_file = ROOT / 'requirements.txt'

        # If we've already attempted venv install, don't retry to avoid loops
        if os.environ.get(VENV_FLAG_ENV) == '1':
            print('Dependency import failed even after venv bootstrap attempt:', exc, file=sys.stderr)
            print('Please install dependencies manually or inspect the venv logs.', file=sys.stderr)
            sys.exit(3)

        print('Missing dependencies detected while importing verifier:', exc, file=sys.stderr)
        # Helpful suggestion for installing dependencies (tests look for this phrase)
        if req_file.exists():
            print(f"Install required packages: python3 -m pip install -r {req_file}", file=sys.stderr)
        else:
            print("Install required packages, e.g.: python3 -m pip install requests beautifulsoup4 lxml pydantic pydantic-settings", file=sys.stderr)

        # If user requested no venv, skip bootstrap and show instructions
        if no_venv:
            if req_file.exists():
                print(f"Missing dependencies; install manually: python3 -m pip install -r {req_file}", file=sys.stderr)
            else:
                print("Missing dependencies; install e.g.: python3 -m pip install requests beautifulsoup4 lxml pydantic pydantic-settings", file=sys.stderr)
            sys.exit(2)

        # Try to create venv and install requirements
        venv_python = _create_venv_and_install_requirements(VENV_DIR, req_file)
        if venv_python:
            _reexec_in_venv(venv_python)
        else:
            # If venv bootstrap failed, show helpful install instruction
            if req_file.exists():
                print(f"Install required packages manually: python3 -m pip install -r {req_file}", file=sys.stderr)
            else:
                print("Install missing packages, e.g.: python3 -m pip install requests beautifulsoup4 lxml", file=sys.stderr)
            sys.exit(2)
    except Exception as exc:  # pragma: no cover - import guard
        print('Failed to import src.tools.verify_parsing:', exc, file=sys.stderr)
        sys.exit(1)

    # Delegate to the existing main() function; pass delegate_args
    verifier_main(delegate_args)


if __name__ == '__main__':
    _main_cli(sys.argv[1:] if len(sys.argv) > 1 else None)
