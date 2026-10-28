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

def refine_and_move_to_do(card_id, title=None, description=None, comment=None, target_list_id=TO_DO_LIST_ID):
    # 1. Prepare PUT payload
    payload = {
        "idList": target_list_id,
        "pos": "bottom"
    }
    if title:
        payload["name"] = title
    if description:
        payload["desc"] = description

    url = f"https://api.trello.com/1/cards/{card_id}?key={TRELLO_KEY}&token={TRELLO_TOKEN}"
    data = urllib.parse.urlencode(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="PUT")

    try:
        with urllib.request.urlopen(req) as resp:
            resp_data = json.loads(resp.read().decode("utf-8"))
            print(f"Tarjeta '{resp_data.get('name')}' ({card_id}) actualizada y movida a 'To Do' exitosamente.")
            print(f"URL: {resp_data.get('shortUrl', resp_data.get('url'))}")
    except Exception as e:
        print(f"Error actualizando y moviendo la tarjeta {card_id}: {e}", file=sys.stderr)
        return False

    # 2. Add comment if requested
    if comment:
        comment_url = f"https://api.trello.com/1/cards/{card_id}/actions/comments?key={TRELLO_KEY}&token={TRELLO_TOKEN}"
        c_data = urllib.parse.urlencode({"text": comment}).encode("utf-8")
        c_req = urllib.request.Request(comment_url, data=c_data, method="POST")
        try:
            with urllib.request.urlopen(c_req) as c_resp:
                print(f"Comentario añadido a la tarjeta {card_id}.")
        except Exception as e:
            print(f"Advertencia: No se pudo agregar el comentario a la tarjeta: {e}", file=sys.stderr)

    return True

def main():
    parser = argparse.ArgumentParser(description="Refine a card and move it to 'To Do' in Trello.")
    parser.add_argument("card_id", help="ID of the card to refine")
    parser.add_argument("--title", help="New title for the card (e.g. [TS-20] ...)")
    parser.add_argument("--desc", help="New description markdown string")
    parser.add_argument("--desc-file", help="Path to markdown file containing the new description")
    parser.add_argument("--comment", help="Comment to add to the card after moving to To Do",
                        default="Tarjeta refinada con éxito por trello_refiner y movida a 'To Do'. Se incorporaron especificaciones técnicas y resolución de dudas.")
    parser.add_argument("--target-list", help="Target list ID (defaults to 'To Do')", default=TO_DO_LIST_ID)

    args = parser.parse_args()

    desc_content = args.desc
    if args.desc_file:
        if not os.path.isfile(args.desc_file):
            print(f"Error: El archivo de descripción no existe: {args.desc_file}", file=sys.stderr)
            sys.exit(1)
        with open(args.desc_file, "r", encoding="utf-8") as f:
            desc_content = f.read()

    if not args.title and not desc_content:
        print("Advertencia: No se especificó nuevo título ni descripción. Solo se moverá la tarjeta.", file=sys.stderr)

    success = refine_and_move_to_do(
        card_id=args.card_id,
        title=args.title,
        description=desc_content,
        comment=args.comment,
        target_list_id=args.target_list
    )

    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
