FROM node:20-bullseye

# Install Python + Tesseract OCR
RUN apt-get update && \
    apt-get install -y python3 python3-pip tesseract-ocr libtesseract-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Install backend deps
COPY api/package*.json ./api/
RUN cd api && npm install

# Python deps
COPY worker/requirements.txt ./worker/
RUN pip3 install -r worker/requirements.txt

# Copy rest of repo
COPY . .

WORKDIR /usr/src/app/api

EXPOSE 5000

CMD ["node", "src/server.js"]