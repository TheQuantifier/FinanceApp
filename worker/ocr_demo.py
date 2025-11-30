#!/usr/bin/env python3
import sys
import json
import fitz          # PyMuPDF
import pytesseract
from PIL import Image, ImageFile
import io

# Prevent truncated-image crashes in Pillow
ImageFile.LOAD_TRUNCATED_IMAGES = True


def process_pdf(buffer: bytes) -> str:
    try:
        pdf = fitz.open(stream=buffer, filetype="pdf")
        text = ""
        for page in pdf:
            text += page.get_text() or ""
        return text
    except Exception as e:
        # Output to stderr so Node can capture useful debugging info
        print(f"PDF processing error: {e}", file=sys.stderr)
        return ""


def process_image(buffer: bytes) -> str:
    try:
        img = Image.open(io.BytesIO(buffer))
        text = pytesseract.image_to_string(img)
        return text or ""
    except Exception as e:
        print(f"Image processing error: {e}", file=sys.stderr)
        return ""


def main():
    # Read raw bytes from stdin (sent by Node)
    try:
        buffer = sys.stdin.buffer.read()
    except Exception as e:
        print(f"Failed reading stdin: {e}", file=sys.stderr)
        print(json.dumps({"text": ""}))
        return

    if not buffer:
        print(json.dumps({"text": ""}))
        return

    # Detect PDFs safely
    is_pdf = buffer.startswith(b"%PDF") or buffer[:4] == b"\x25\x50\x44\x46"

    if is_pdf:
        text = process_pdf(buffer)
    else:
        text = process_image(buffer)

    # Always output valid JSON
    try:
        print(json.dumps({"text": text}))
    except Exception as e:
        print(f"JSON output error: {e}", file=sys.stderr)
        print('{"text": ""}')


if __name__ == "__main__":
    main()
