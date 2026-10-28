#!/usr/bin/env python3
import json
import urllib.parse
import urllib.request
import os
import sys
import re
import argparse

TRELLO_KEY = os.environ.get("TRELLO_API_KEY", "13f24d5fc04deaf19fb1629c6d21e3f4")
TRELLO_TOKEN = os.environ.get("TRELLO_TOKEN", "ATTA1ffe73ca57a9e96f98cc48af45062f0b4e1d4caa6339153c8ab74634450dcc3f2D682B73")
BOARD_ID = "6abbbd64c01fb9f0420685dc"

def get_existing_ts_numbers():
    url = f"https://api.trello.com/1/boards/{BOARD_ID}/cards?key={TRELLO_KEY}&token={TRELLO_TOKEN}"
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read().decode("utf-8")
            cards = json.loads(data)
            ts_numbers = []
            for c in cards:
                m = re.search(r'TS-(\d+)', c.get("name", ""))
                if m:
                    ts_numbers.append((int(m.group(1)), c.get("name"), c.get("id")))
            ts_numbers.sort(key=lambda x: x[0])
            return ts_numbers
    except Exception as e:
        print(f"Error fetching cards: {e}", file=sys.stderr)
        return []

def main():
    parser = argparse.ArgumentParser(description="Get the next TS-XX task ID on the Trello board.")
    parser.add_argument("--list-all", action="store_true", help="List all existing TS cards")
    args = parser.parse_args()

    ts_cards = get_existing_ts_numbers()
    if args.list_all:
        print("Tarjetas TS registradas en el tablero:")
        for num, name, cid in ts_cards:
            print(f"  TS-{num:02d}: {name} (ID: {cid})")
        print()

    max_num = max([item[0] for item in ts_cards], default=0)
    next_num = max_num + 1
    next_id_str = f"TS-{next_num:02d}"
    print(next_id_str)

if __name__ == "__main__":
    main()
