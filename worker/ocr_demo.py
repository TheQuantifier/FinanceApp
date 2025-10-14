import sys, json, fitz, pytesseract
from PIL import Image
from io import BytesIO

def pdf_to_images(path, dpi=300):
    doc=fitz.open(path); out=[]
    for p in doc:
        pix=p.get_pixmap(dpi=dpi)
        out.append(Image.open(BytesIO(pix.tobytes("png"))))
    return out

def ocr(path):
    if path.lower().endswith(".pdf"):
        return "\n".join(pytesseract.image_to_string(img) for img in pdf_to_images(path))
    return pytesseract.image_to_string(Image.open(path))

print(json.dumps({"source": sys.argv[1], "ocr_text": ocr(sys.argv[1])})[:1000])