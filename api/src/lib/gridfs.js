// src/lib/gridfs.js
const mongoose = require('mongoose');
const { mongoDbName } = require('../config/env');
const { ObjectId } = require('mongodb');

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

// Download a file from GridFS as a buffer
function readFromGridFS(fileId) {
  return new Promise((resolve, reject) => {
    const bucket = getBucket();

    const chunks = [];
    const stream = bucket.openDownloadStream(new ObjectId(fileId));

    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', (err) => reject(err));
  });
}

// Stream directly to HTTP response
function streamFromGridFS(fileId, res) {
  const bucket = getBucket();

  const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));

  downloadStream.on('error', (err) => {
    console.error('GridFS Stream Error:', err);
    res.status(404).json({ message: 'File not found' });
  });

  downloadStream.pipe(res);
}

// ✅ Delete file from GridFS (required for DELETE route)
async function deleteFromGridFS(fileId) {
  const bucket = getBucket();
  try {
    await bucket.delete(new ObjectId(fileId));
  } catch (err) {
    console.error("GridFS delete error:", err);
    throw err;
  }
}

module.exports = {
  uploadBufferToGridFS,
  readFromGridFS,
  streamFromGridFS,
  deleteFromGridFS,       // ← export new method
};