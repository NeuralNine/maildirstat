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


def parse_mbox(path, top_k=100):
    with open(path, "rb") as f:
        raw = f.read()

    mails = []

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
                subject = decode_mime(line[8:].decode("utf-8", errors="replace").strip())
            elif lower.startswith(b"from:"):
                sender = decode_mime(line[5:].decode("utf-8", errors="replace").strip())
            elif lower.startswith(b"date:"):
                date = line[5:].decode("utf-8", errors="replace").strip()

        text = body.decode("utf-8", errors="replace").strip()

        if len(text) > 2000:
            text = text[:2000] + "\n\n[... truncated ...]"

        mails.append(
            {
                "subject": subject,
                "sender": sender,
                "date": date,
                "size": len(part),
                "body": text,
                "color_idx": len(mails) % 10,
            }
        )

    mails.sort(key=lambda m: m["size"], reverse=True)

    return mails[:top_k]

