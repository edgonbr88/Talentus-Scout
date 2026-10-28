#!/usr/bin/env python3
import json
import urllib.parse
import urllib.request
import os
import sys
import argparse

TRELLO_KEY = os.environ.get("TRELLO_API_KEY", "13f24d5fc04deaf19fb1629c6d21e3f4")
TRELLO_TOKEN = os.environ.get("TRELLO_TOKEN", "ATTA1ffe73ca57a9e96f98cc48af45062f0b4e1d4caa6339153c8ab74634450dcc3f2D682B73")
TO_REFINE_LIST_ID = "6abc04998f4a3cbb55c8280d"

def get_cards_to_refine():
    url = f"https://api.trello.com/1/lists/{TO_REFINE_LIST_ID}/cards?key={TRELLO_KEY}&token={TRELLO_TOKEN}"
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read().decode("utf-8")
            cards = json.loads(data)
            return cards
    except Exception as e:
        print(f"Error fetching cards: {e}", file=sys.stderr)
        return []

def main():
    parser = argparse.ArgumentParser(description="Fetch cards pending refinement from Trello.")
    parser.add_argument("--json", action="store_true", help="Output raw JSON")
    args = parser.parse_args()

    cards = get_cards_to_refine()

    if args.json:
        print(json.dumps(cards, indent=2, ensure_ascii=False))
        return

    print(f"Total de tarjetas en 'to refine': {len(cards)}\n")
    if not cards:
        print("No hay tarjetas pendientes en la columna 'to refine'.")
        return

    for idx, card in enumerate(cards, start=1):
        cid = card.get("id")
        name = card.get("name")
        desc = card.get("desc", "").strip()
        url = card.get("shortUrl", card.get("url", ""))
        print(f"[{idx}] {name}")
        print(f"    ID: {cid}")
        print(f"    URL: {url}")
        if desc:
            desc_preview = desc[:120].replace('\n', ' ')
            print(f"    Descripción inicial: {desc_preview}...")
        else:
            print("    Descripción inicial: (Vacía)")
        print()

if __name__ == "__main__":
    main()
