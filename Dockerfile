# ---------------------------------------------------------
# Base Image — Node 20 + Debian (Render compatible)
# ---------------------------------------------------------
FROM node:20-bullseye

# Make Python output unbuffered (critical for OCR piping)
ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=production

# ---------------------------------------------------------
# Install system dependencies (Python + Tesseract OCR)
# ---------------------------------------------------------
RUN apt-get update && \
    apt-get install -y \
        python3 \
        python3-pip \
        python3-venv \
        tesseract-ocr \
        tesseract-ocr-eng \
        libtesseract-dev && \
    rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------
# Set project root
# ---------------------------------------------------------
WORKDIR /usr/src/app

# ---------------------------------------------------------
# Install Node dependencies with caching
# ---------------------------------------------------------
COPY api/package*.json ./api/

WORKDIR /usr/src/app/api
RUN npm install --omit=dev

# ---------------------------------------------------------
# Install Python OCR worker dependencies
# ---------------------------------------------------------
WORKDIR /usr/src/app
COPY worker/requirements.txt ./worker/requirements.txt

RUN pip3 install --no-cache-dir -r worker/requirements.txt

# ---------------------------------------------------------
# Copy full project AFTER deps installed
# ---------------------------------------------------------
COPY . .

# ---------------------------------------------------------
# Set backend working directory
# ---------------------------------------------------------
WORKDIR /usr/src/app/api

EXPOSE 4000

CMD ["node", "src/server.js"]
