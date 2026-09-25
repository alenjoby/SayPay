"""Try the parser from a shell:

    python -m saypay_nlu "حول 0.1 لأمي" --contacts Amma,Ahmed
"""

import argparse
import json

from . import parse


def main() -> None:
    ap = argparse.ArgumentParser(description="Parse a SayPay voice command")
    ap.add_argument("text")
    ap.add_argument("--contacts", default="", help="comma-separated contact names")
    args = ap.parse_args()
    contacts = [c.strip() for c in args.contacts.split(",") if c.strip()]
    result = parse(args.text, contacts)
    out = result.as_dict()
    out["scores"] = result.scores
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
