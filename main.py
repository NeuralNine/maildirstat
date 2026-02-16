from flask import Flask, jsonify, render_template

from utils import parse_mbox


app = Flask(__name__)


MAILS = parse_mbox("INBOX")


@app.route("/")
def index():
    mails_meta = [
        {
            "subject": m["subject"],
            "sender": m["sender"],
            "date": m["date"],
            "size": m["size"],
            "colorIdx": m["color_idx"],
        } for m in MAILS
    ]

    return render_template("index.html", mails_meta=mails_meta)


@app.route("/mail/<int:idx>")
def mail_body(idx):
    return jsonify(body=MAILS[idx]["body"])


if __name__ == "__main__":
    app.run(port=5000)

