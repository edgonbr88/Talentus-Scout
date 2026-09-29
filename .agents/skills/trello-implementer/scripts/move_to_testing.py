#!/usr/bin/env python3
import json
import urllib.parse
import urllib.request
import sys
import os

TRELLO_KEY = "13f24d5fc04deaf19fb1629c6d21e3f4"
TRELLO_TOKEN = "ATTA1ffe73ca57a9e96f98cc48af45062f0b4e1d4caa6339153c8ab74634450dcc3f2D682B73"
IN_TESTING_LIST_ID = "6abbbe54690c92aab5836b30"

def move_card_to_testing(card_id, comment=None):
    # 1. Move card to 'in testing' list
    url = f"https://api.trello.com/1/cards/{card_id}?key={TRELLO_KEY}&token={TRELLO_TOKEN}"
    data = urllib.parse.urlencode({"idList": IN_TESTING_LIST_ID, "pos": "bottom"}).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="PUT")

    try:
        with urllib.request.urlopen(req) as resp:
            print(f"Card {card_id} moved to 'in testing' successfully.")
    except Exception as e:
        print(f"Error moving card {card_id}: {e}", file=sys.stderr)
        return False

    # 2. Add comment if provided
    if comment:
        comment_url = f"https://api.trello.com/1/cards/{card_id}/actions/comments?key={TRELLO_KEY}&token={TRELLO_TOKEN}"
        c_data = urllib.parse.urlencode({"text": comment}).encode("utf-8")
        c_req = urllib.request.Request(comment_url, data=c_data, method="POST")
        try:
            with urllib.request.urlopen(c_req) as c_resp:
                print(f"Comment added to card {card_id}.")
        except Exception as e:
            print(f"Warning: Failed to add comment: {e}", file=sys.stderr)

    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 move_to_testing.py <card_id> [optional_comment]")
        sys.exit(1)
    
    card_id = sys.argv[1]
    comment = sys.argv[2] if len(sys.argv) > 2 else "Implementación finalizada por trello_implementer. Pasando a 'in testing'."
    move_card_to_testing(card_id, comment)
