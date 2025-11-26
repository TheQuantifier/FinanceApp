# Use Node 20 on Debian
FROM node:20-bullseye

# Install Python + Tesseract for OCR worker
RUN apt-get update && \
    apt-get install -y python3 python3-pip tesseract-ocr libtesseract-dev && \
    rm -rf /var/lib/apt/lists/*

# Root directory of your project
WORKDIR /usr/src/app

# --- Install Node backend dependencies ---
# Copy ONLY backend package files first (for caching)
COPY api/package*.json ./api/

# Set working directory to backend folder
WORKDIR /usr/src/app/api

# Install backend node modules
RUN npm install

# --- Install Python OCR dependencies ---
WORKDIR /usr/src/app
COPY worker/requirements.txt ./worker/
RUN pip3 install --no-cache-dir -r worker/requirements.txt

# --- Copy the entire repo after dependencies ---
COPY . .

# Set working directory for the server
WORKDIR /usr/src/app/api

EXPOSE 4000

CMD ["node", "src/server.js"]