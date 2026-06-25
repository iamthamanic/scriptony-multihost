"""
Configure espeak-ng for Kokoro/phonemizer before pipeline init.

The espeakng_loader wheel ships a libespeak-ng.dylib built with CI paths
(/Users/runner/work/...) that break phonemization on macOS. Prefer a system
Homebrew espeak-ng when available, then re-patch EspeakWrapper after misaki
imports the broken loader defaults.

Location: tools/kokoro-server/espeak_bootstrap.py
"""

from __future__ import annotations

import os
import platform
import shutil
import subprocess
from pathlib import Path

_CONFIGURED = False


def _brew_espeak_prefix() -> Path | None:
    brew = shutil.which("brew")
    if not brew:
        return None
    try:
        prefix = subprocess.check_output(
            [brew, "--prefix", "espeak-ng"],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except (subprocess.CalledProcessError, OSError):
        return None
    root = Path(prefix)
    lib = root / "lib" / "libespeak-ng.dylib"
    data = root / "share" / "espeak-ng-data"
    if lib.is_file() and data.is_dir() and (data / "phontab").is_file():
        return root
    return None


def _loader_espeak_paths() -> tuple[str, str]:
    import espeakng_loader

    espeakng_loader.make_library_available()
    return espeakng_loader.get_library_path(), espeakng_loader.get_data_path()


def resolve_espeak_paths() -> tuple[str, str, str]:
    """
    Returns (library_path, data_path, source_label).
    source_label is 'homebrew' or 'espeakng_loader'.
    """
    override_lib = os.environ.get("KOKORO_ESPEAK_LIBRARY", "").strip()
    override_data = os.environ.get("KOKORO_ESPEAK_DATA", "").strip()
    if override_lib and override_data:
        if not Path(override_lib).is_file():
            raise RuntimeError(f"KOKORO_ESPEAK_LIBRARY not found: {override_lib}")
        if not Path(override_data).is_dir():
            raise RuntimeError(f"KOKORO_ESPEAK_DATA not found: {override_data}")
        return override_lib, override_data, "env"

    prefix = _brew_espeak_prefix()
    if prefix is not None:
        lib = str(prefix / "lib" / "libespeak-ng.dylib")
        data = str(prefix / "share" / "espeak-ng-data")
        return lib, data, "homebrew"

    lib, data = _loader_espeak_paths()
    return lib, data, "espeakng_loader"


def configure_espeak_for_kokoro() -> tuple[str, str, str]:
    """Idempotent espeak setup for Kokoro + misaki + phonemizer."""
    global _CONFIGURED
    from phonemizer.backend.espeak.wrapper import EspeakWrapper

    lib, data, source = resolve_espeak_paths()

    # misaki.espeak resets EspeakWrapper to espeakng_loader on first import.
    import misaki.espeak  # noqa: F401

    EspeakWrapper.set_library(lib)
    EspeakWrapper.set_data_path(data)
    os.environ["PHONEMIZER_ESPEAK_LIBRARY"] = lib
    os.environ["PHONEMIZER_ESPEAK_PATH"] = data

    _CONFIGURED = True
    return lib, data, source


def ensure_espeak_for_kokoro() -> tuple[str, str, str]:
    if _CONFIGURED:
        lib = os.environ.get("PHONEMIZER_ESPEAK_LIBRARY", "")
        data = os.environ.get("PHONEMIZER_ESPEAK_PATH", "")
        return lib, data, "cached"
    return configure_espeak_for_kokoro()


def homebrew_install_hint() -> str | None:
    if platform.system() != "Darwin":
        return None
    if _brew_espeak_prefix() is not None:
        return None
    return "brew install espeak-ng"
