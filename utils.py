import re
from email.header import decode_header


def decode_mime(value):
    out = []
    parts = decode_header(value)

    for text, charset in parts:
        if isinstance(text, bytes):
            out.append(text.decode(charset or "utf-8", errors="replace"))
        else:
            out.append(text)

    return "".join(out)


def parse_mbox_bytes(raw, top_k=200, grouped=False):
    all_mails = []

    for part in re.split(rb"^From .+\r?\n", raw, flags=re.MULTILINE):
        if not part.strip():
            continue

        header_end = part.find(b"\n\n")
        if header_end == -1:
            header_end = part.find(b"\r\n\r\n")

        headers = part[:header_end] if header_end != -1 else part
        body = part[header_end:] if header_end != -1 else b""

        subject = "(no subject)"
        sender = "(unknown)"
        date = ""

        for line in headers.splitlines():
            lower = line.lower()

            if lower.startswith(b"subject:"):
                subject = decode_mime(
                    line[8:].decode("utf-8", errors="replace").strip()
                )
            elif lower.startswith(b"from:"):
                sender = decode_mime(line[5:].decode("utf-8", errors="replace").strip())
            elif lower.startswith(b"date:"):
                date = line[5:].decode("utf-8", errors="replace").strip()

        text = body.decode("utf-8", errors="replace").strip()

        if len(text) > 2000:
            text = text[:2000] + "\n\n[... truncated ...]"

        all_mails.append(
            {
                "subject": subject,
                "sender": sender,
                "date": date,
                "size": len(part),
                "body": text,
                "color_idx": 0,
            }
        )

    if not grouped:
        all_mails.sort(key=lambda m: m["size"], reverse=True)
        mails = all_mails[:top_k]

        for i, mail in enumerate(mails):
            mail["color_idx"] = i % 10

        return {"mails": mails, "groups": []}

    grouped_mails = {}

    for mail in all_mails:
        grouped_mails.setdefault(mail["sender"], []).append(mail)

    groups = []

    for sender, sender_mails in grouped_mails.items():
        sender_mails.sort(key=lambda m: m["size"], reverse=True)
        groups.append(
            {
                "sender": sender,
                "size": sum(mail["size"] for mail in sender_mails),
                "mails": sender_mails,
            }
        )

    groups.sort(key=lambda g: g["size"], reverse=True)

    selected_groups = []
    selected_mail_count = 0

    for group in groups:
        selected_groups.append(group)
        selected_mail_count += len(group["mails"])

        if selected_mail_count >= top_k:
            break

    mails = []
    groups_meta = []

    for color_idx, group in enumerate(selected_groups):
        mail_indices = []

        for mail in group["mails"]:
            mail["color_idx"] = color_idx
            mails.append(mail)
            mail_indices.append(len(mails) - 1)

        groups_meta.append(
            {
                "sender": group["sender"],
                "size": group["size"],
                "mail_indices": mail_indices,
                "color_idx": color_idx,
            }
        )

    return {"mails": mails, "groups": groups_meta}


def parse_mbox(path, top_k=200, grouped=False):
    with open(path, "rb") as f:
        raw = f.read()

    return parse_mbox_bytes(raw, top_k=top_k, grouped=grouped)
