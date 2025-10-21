# worker/ocr_demo.py
import sys
import json
import re
from datetime import datetime
from io import BytesIO

try:
    import fitz  # PyMuPDF
    from PIL import Image
    import pytesseract
except ImportError as e:
    print(json.dumps({"source": sys.argv[1] if len(sys.argv) > 1 else None, "ocr_text": f"Missing dependency: {e}"}))
    sys.exit(1)


def pdf_to_images(path, dpi=300):
    """Convert PDF pages to PIL images."""
    try:
        doc = fitz.open(path)
        images = []
        for page in doc:
            pix = page.get_pixmap(dpi=dpi)
            img = Image.open(BytesIO(pix.tobytes("png")))
            images.append(img)
        return images
    except Exception as e:
        raise RuntimeError(f"PDF processing error: {e}")


def ocr(path):
    """Extract text from PDF or image."""
    try:
        if path.lower().endswith(".pdf"):
            return "\n".join(pytesseract.image_to_string(img) for img in pdf_to_images(path))
        return pytesseract.image_to_string(Image.open(path))
    except Exception as e:
        return f"OCR failed: {e}"


def extract_fields(text):
    """
    Attempt to extract basic fields:
    - Date (yyyy-mm-dd)
    - Amount ($ or numbers)
    - Source (first line)
    - Notes (rest)
    """
    result = {
        "Date": None,
        "Amount": None,
        "Source": None,
        "Category": None,
        "Notes": text.strip(),
        "Type": "expense"
    }

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if lines:
        result["Source"] = lines[0]
        result["Notes"] = "\n".join(lines[1:]) if len(lines) > 1 else ""

    # Look for a date in format yyyy-mm-dd or mm/dd/yyyy
    date_match = re.search(r"(\d{4}-\d{2}-\d{2})|(\d{1,2}/\d{1,2}/\d{4})", text)
    if date_match:
        raw_date = date_match.group(0)
        try:
            dt = datetime.strptime(raw_date, "%Y-%m-%d")
        except ValueError:
            try:
                dt = datetime.strptime(raw_date, "%m/%d/%Y")
            except ValueError:
                dt = None
        if dt:
            result["Date"] = dt.strftime("%Y-%m-%d")

    # Look for amounts (numbers with optional $ or ,)
    amount_match = re.search(r"\$?\s*([\d,]+(?:\.\d{1,2})?)", text)
    if amount_match:
        amt_str = amount_match.group(1).replace(",", "")
        try:
            result["Amount"] = float(amt_str)
        except ValueError:
            pass

    # Very basic category detection (optional)
    categories = ["food", "transport", "utilities", "salary", "entertainment", "other"]
    for cat in categories:
        if re.search(rf"\b{cat}\b", text, re.IGNORECASE):
            result["Category"] = cat
            break

    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"source": None, "ocr_text": "No file path provided"}))
        sys.exit(1)

    path = sys.argv[1]
    text = ocr(path)
    parsed = extract_fields(text)
    output = {"source": path, "ocr_text": text}
    output.update(parsed)
    print(json.dumps(output))
