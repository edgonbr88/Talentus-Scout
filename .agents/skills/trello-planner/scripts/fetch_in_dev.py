#!/usr/bin/env python3
import json
import urllib.parse
import urllib.request
import os
import sys

TRELLO_KEY = "13f24d5fc04deaf19fb1629c6d21e3f4"
TRELLO_TOKEN = "ATTA1ffe73ca57a9e96f98cc48af45062f0b4e1d4caa6339153c8ab74634450dcc3f2D682B73"
IN_DEV_LIST_ID = "6abbbdd8ad4beef505ef70e1"

def get_cards_in_development():
    url = f"https://api.trello.com/1/lists/{IN_DEV_LIST_ID}/cards?key={TRELLO_KEY}&token={TRELLO_TOKEN}"
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read().decode("utf-8")
            cards = json.loads(data)
            return cards
    except Exception as e:
        print(f"Error fetching cards: {e}", file=sys.stderr)
        return []

if __name__ == "__main__":
    cards = get_cards_in_development()
    print(json.dumps(cards, indent=2, ensure_ascii=False))
