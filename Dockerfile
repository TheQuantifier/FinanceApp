# Use Node 20 on Debian
FROM node:20-bullseye

# Install Python + Tesseract for OCR worker
RUN apt-get update && \
    apt-get install -y python3 python3-pip tesseract-ocr libtesseract-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Install backend dependencies
COPY api/package*.json ./api/
RUN cd api && npm install

# Install Python OCR dependencies
COPY worker/requirements.txt ./worker/
RUN pip3 install --no-cache-dir -r worker/requirements.txt

# Copy entire repo
COPY . .

# Run from api
WORKDIR /usr/src/app/api

EXPOSE 4000

CMD ["node", "src/server.js"]