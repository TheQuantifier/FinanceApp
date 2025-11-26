#!/usr/bin/env python3
import sys
import json
import pytesseract
from PIL import Image
import fitz  # PyMuPDF

def ocr_image(path):
    try:
        img = Image.open(path)
        text = pytesseract.image_to_string(img)
        return text
    except Exception as e:
        return ""

def ocr_pdf(path):
    text = ""
    try:
        doc = fitz.open(path)
        for page in doc:
            text += page.get_text()
        return text
    except Exception:
        return ""

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"text": ""}))
        return

    file_path = sys.argv[1].lower()

    text = ""

    if file_path.endswith(".pdf"):
        text = ocr_pdf(sys.argv[1])
    else:
        text = ocr_image(sys.argv[1])

    # Always JSON
    print(json.dumps({"text": text}))

if __name__ == "__main__":
    main()