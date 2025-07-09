# save as dropbox_token_server.py
from flask import Flask, jsonify
import os, requests

app = Flask(__name__)

DROPBOX_APP_KEY = os.environ.get("DROPBOX_APP_KEY")
DROPBOX_APP_SECRET = os.environ.get("DROPBOX_APP_SECRET")
DROPBOX_REFRESH_TOKEN = os.environ.get("DROPBOX_REFRESH_TOKEN")

@app.route("/dropbox-token")
def dropbox_token():
    resp = requests.post(
        "https://api.dropbox.com/oauth2/token",
        auth=(DROPBOX_APP_KEY, DROPBOX_APP_SECRET),
        data={
            "grant_type": "refresh_token",
            "refresh_token": DROPBOX_REFRESH_TOKEN
        }
    )
    if resp.ok:
        return jsonify(resp.json())
    return jsonify({"error": "Failed to refresh token"}), 500

if __name__ == "__main__":
    app.run(port=5002)