"""Check the API's model on this machine: engine, memory, latency, sample answers.

    python scripts/check_deploy.py            # run on the VPS after unzipping the model

Needs only the repo + models/ (no datasets). Reports resident memory after loading
and per-request latency of the full pipeline on the hand-written test commands.
"""

from __future__ import annotations

import os
import statistics
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

from common import load_unseen  # noqa: E402


def rss_mb() -> float:
    """Current resident memory of this process in MB (Linux, macOS, Windows)."""
    if os.name == "nt":
        import ctypes
        from ctypes import wintypes

        class PMC(ctypes.Structure):
            _fields_ = [("cb", wintypes.DWORD), ("PageFaultCount", wintypes.DWORD),
                        ("PeakWorkingSetSize", ctypes.c_size_t), ("WorkingSetSize", ctypes.c_size_t),
                        ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
                        ("QuotaPagedPoolUsage", ctypes.c_size_t),
                        ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
                        ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
                        ("PagefileUsage", ctypes.c_size_t), ("PeakPagefileUsage", ctypes.c_size_t)]

        pmc = PMC()
        pmc.cb = ctypes.sizeof(PMC)
        handle = ctypes.windll.kernel32.GetCurrentProcess()
        ctypes.windll.psapi.GetProcessMemoryInfo(handle, ctypes.byref(pmc), pmc.cb)
        return pmc.WorkingSetSize / 1e6
    try:
        for line in open("/proc/self/status"):
            if line.startswith("VmRSS:"):
                return int(line.split()[1]) / 1024
    except OSError:
        pass
    import resource  # macOS
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1e6


def main() -> None:
    base = rss_mb()
    t0 = time.time()
    from saypay_nlu import engine_name, parse
    engine = engine_name()  # loads the models
    load_s = time.time() - t0
    loaded = rss_mb()

    rows = load_unseen("blind_v2.tsv")
    for r in rows[:5]:  # warm-up
        parse(r["text"], r["contacts"])
    lat, correct = [], 0
    for r in rows:
        t = time.perf_counter()
        res = parse(r["text"], r["contacts"])
        lat.append((time.perf_counter() - t) * 1000)
        correct += res.intent == r["intent"]
    lat.sort()
    print(f"engine            {engine}")
    print(f"load time         {load_s:.1f} s")
    print(f"memory            {loaded:.0f} MB resident ({loaded - base:.0f} MB for models)")
    print(f"latency           p50 {statistics.median(lat):.1f} ms, p95 {lat[int(0.95 * len(lat)) - 1]:.1f} ms")
    print(f"blind test set   {correct}/{len(rows)} correct ({100 * correct / len(rows):.1f}%)")
    for text in ["حوّل 0.1 إيثيريوم لأمي", "Rahul ko 500 bhejo", "send a message to ahmed"]:
        r = parse(text, ["Amma", "Ahmed", "Rahul"])
        print(f"  {text!r:32} -> {r.intent} {r.confidence:.2f} amount={r.amount} contact={r.contact}")


if __name__ == "__main__":
    main()
