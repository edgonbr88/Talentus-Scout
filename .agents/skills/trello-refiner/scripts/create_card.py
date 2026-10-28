#!/usr/bin/env python3
import json
import urllib.parse
import urllib.request
import os
import sys
import argparse

TRELLO_KEY = os.environ.get("TRELLO_API_KEY", "13f24d5fc04deaf19fb1629c6d21e3f4")
TRELLO_TOKEN = os.environ.get("TRELLO_TOKEN", "ATTA1ffe73ca57a9e96f98cc48af45062f0b4e1d4caa6339153c8ab74634450dcc3f2D682B73")
TO_DO_LIST_ID = "6abbbd64c01fb9f0420685d8"

def create_card(title, description, list_id=TO_DO_LIST_ID, pos="bottom"):
    url = f"https://api.trello.com/1/cards?key={TRELLO_KEY}&token={TRELLO_TOKEN}"
    payload = {
        "idList": list_id,
        "name": title,
        "desc": description,
        "pos": pos
    }
    data = urllib.parse.urlencode(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")

    try:
        with urllib.request.urlopen(req) as resp:
            resp_data = json.loads(resp.read().decode("utf-8"))
            print(f"Tarjeta creada con éxito: '{resp_data.get('name')}' (ID: {resp_data.get('id')})")
            print(f"URL: {resp_data.get('shortUrl', resp_data.get('url'))}")
            return resp_data
    except Exception as e:
        print(f"Error creando tarjeta en Trello: {e}", file=sys.stderr)
        return None

def main():
    parser = argparse.ArgumentParser(description="Create a new card in Trello.")
    parser.add_argument("--title", required=True, help="Title for the card (e.g. [TS-25] ...)")
    parser.add_argument("--desc", help="Description markdown string")
    parser.add_argument("--desc-file", help="Path to markdown file containing the description")
    parser.add_argument("--list-id", help="Target list ID (defaults to 'To Do')", default=TO_DO_LIST_ID)

    args = parser.parse_args()

    desc_content = args.desc or ""
    if args.desc_file:
        if not os.path.isfile(args.desc_file):
            print(f"Error: El archivo de descripción no existe: {args.desc_file}", file=sys.stderr)
            sys.exit(1)
        with open(args.desc_file, "r", encoding="utf-8") as f:
            desc_content = f.read()

    res = create_card(title=args.title, description=desc_content, list_id=args.list_id)
    if not res:
        sys.exit(1)

if __name__ == "__main__":
    main()
