// src/lib/gridfs.js
const mongoose = require('mongoose');
const { mongoDbName } = require('../config/env');

// Create a GridFS bucket
function getBucket() {
  const db = mongoose.connection.db;
  return new mongoose.mongo.GridFSBucket(db, {
    bucketName: 'receipts'
  });
}

// Upload a file buffer to GridFS
function uploadBufferToGridFS(filename, buffer, mimetype) {
  return new Promise((resolve, reject) => {
    const bucket = getBucket();

    const uploadStream = bucket.openUploadStream(filename, {
      contentType: mimetype
    });

    uploadStream.end(buffer);

    uploadStream.on('finish', () => {
      resolve(uploadStream.id); // ObjectId of stored file
    });

    uploadStream.on('error', (err) => {
      reject(err);
    });
  });
}

// Download a file from GridFS as buffer
function readFromGridFS(fileId) {
  return new Promise((resolve, reject) => {
    const bucket = getBucket();

    const chunks = [];
    const stream = bucket.openDownloadStream(fileId);

    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', (err) => reject(err));
  });
}

// Stream a file from GridFS directly to an HTTP response
function streamFromGridFS(fileId, res) {
  const bucket = getBucket();

  const downloadStream = bucket.openDownloadStream(fileId);

  downloadStream.on('error', (err) => {
    console.error('GridFS Stream Error:', err);
    res.status(404).json({ message: 'File not found' });
  });

  // Pipe raw file data to response
  downloadStream.pipe(res);
}

module.exports = {
  uploadBufferToGridFS,
  readFromGridFS,
  streamFromGridFS
};