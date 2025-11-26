#!/usr/bin/env python3
import sys
import json
import fitz       # PyMuPDF
import pytesseract
from PIL import Image
import io

def process_pdf(buffer):
    text = ""
    try:
        pdf = fitz.open(stream=buffer, filetype="pdf")
        for page in pdf:
            text += page.get_text()
        return text
    except:
        return ""

def process_image(buffer):
    try:
        img = Image.open(io.BytesIO(buffer))
        return pytesseract.image_to_string(img)
    except:
        return ""

def main():
    buffer = sys.stdin.buffer.read()   # read raw bytes

    # Detect PDF
    if buffer.startswith(b"%PDF"):
        text = process_pdf(buffer)
    else:
        text = process_image(buffer)

    print(json.dumps({"text": text}))

if __name__ == "__main__":
    main()