from flask import Flask, jsonify, render_template, request

from utils import parse_mbox_bytes


app = Flask(__name__)


MAIL_SOURCE = None
FLAT_MAILS = {"mails": [], "groups": []}
GROUPED_MAILS = None
CURRENT_TOP_K = 100


@app.route("/")
def index():
    return render_template(
        "index.html",
        mails_meta=[],
        groups_meta=[],
        grouped=False,
    )


@app.route("/load", methods=["POST"])
def load():
    global MAIL_SOURCE, FLAT_MAILS, GROUPED_MAILS, CURRENT_TOP_K

    grouped = request.args.get("grouped") == "1"
    top_k = int(request.args.get("top_k", "100"))
    file = request.files.get("file")

    if file and file.filename:
        MAIL_SOURCE = file.read()
        FLAT_MAILS = parse_mbox_bytes(MAIL_SOURCE, top_k=top_k, grouped=False)
        GROUPED_MAILS = None
        CURRENT_TOP_K = top_k
    elif MAIL_SOURCE is not None and top_k != CURRENT_TOP_K:
        FLAT_MAILS = parse_mbox_bytes(MAIL_SOURCE, top_k=top_k, grouped=False)
        GROUPED_MAILS = None
        CURRENT_TOP_K = top_k

    if MAIL_SOURCE is None:
        return jsonify(mails=[], groups=[], grouped=grouped)

    if grouped:
        if GROUPED_MAILS is None:
            GROUPED_MAILS = parse_mbox_bytes(
                MAIL_SOURCE, top_k=CURRENT_TOP_K, grouped=True
            )

        mails_data = GROUPED_MAILS
    else:
        mails_data = FLAT_MAILS

    mails_meta = [
        {
            "subject": m["subject"],
            "sender": m["sender"],
            "date": m["date"],
            "size": m["size"],
            "colorIdx": m["color_idx"],
        }
        for m in mails_data["mails"]
    ]

    groups_meta = [
        {
            "sender": group["sender"],
            "totalSize": group["size"],
            "mailIndices": group["mail_indices"],
            "colorIdx": group["color_idx"],
        }
        for group in mails_data["groups"]
    ]

    return jsonify(mails=mails_meta, groups=groups_meta, grouped=grouped)


@app.route("/data")
def data():
    global FLAT_MAILS, GROUPED_MAILS, CURRENT_TOP_K

    grouped = request.args.get("grouped") == "1"
    top_k = int(request.args.get("top_k", "100"))

    if MAIL_SOURCE is None:
        return jsonify(mails=[], groups=[], grouped=grouped)

    if top_k != CURRENT_TOP_K:
        FLAT_MAILS = parse_mbox_bytes(MAIL_SOURCE, top_k=top_k, grouped=False)
        GROUPED_MAILS = None
        CURRENT_TOP_K = top_k

    if grouped:
        if GROUPED_MAILS is None:
            GROUPED_MAILS = parse_mbox_bytes(
                MAIL_SOURCE, top_k=CURRENT_TOP_K, grouped=True
            )

        mails_data = GROUPED_MAILS
    else:
        mails_data = FLAT_MAILS

    mails_meta = [
        {
            "subject": m["subject"],
            "sender": m["sender"],
            "date": m["date"],
            "size": m["size"],
            "colorIdx": m["color_idx"],
        }
        for m in mails_data["mails"]
    ]

    groups_meta = [
        {
            "sender": group["sender"],
            "totalSize": group["size"],
            "mailIndices": group["mail_indices"],
            "colorIdx": group["color_idx"],
        }
        for group in mails_data["groups"]
    ]

    return jsonify(mails=mails_meta, groups=groups_meta, grouped=grouped)


@app.route("/mail/<int:idx>")
def mail_body(idx):
    global GROUPED_MAILS

    grouped = request.args.get("grouped") == "1"

    if grouped and GROUPED_MAILS is None:
        GROUPED_MAILS = parse_mbox_bytes(MAIL_SOURCE, top_k=CURRENT_TOP_K, grouped=True)

    if grouped:
        assert GROUPED_MAILS is not None
        mails = GROUPED_MAILS["mails"]
    else:
        mails = FLAT_MAILS["mails"]

    return jsonify(body=mails[idx]["body"])


if __name__ == "__main__":
    app.run(port=5000)
