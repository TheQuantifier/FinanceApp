// src/lib/gridfs.js
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

/**
 * Create a GridFS bucket **per user**.
 * This automatically generates:
 *   user_<userId>.files
 *   user_<userId>.chunks
 */
function getBucketForUser(userId) {
  if (!userId) {
    throw new Error("getBucketForUser requires a userId");
  }

  const db = mongoose.connection.db;

  return new mongoose.mongo.GridFSBucket(db, {
    bucketName: `user_${userId}`
  });
}

/**
 * Upload a file buffer to the user's bucket
 */
function uploadBufferToGridFS(userId, filename, buffer, mimetype) {
  return new Promise((resolve, reject) => {
    const bucket = getBucketForUser(userId);

    const uploadStream = bucket.openUploadStream(filename, {
      contentType: mimetype,
      metadata: {
        uploadDate: new Date(),
        filename,
        mimeType: mimetype
      }
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

/**
 * Download a file from the user's bucket as a Buffer
 */
function readFromGridFS(userId, fileId) {
  return new Promise((resolve, reject) => {
    const bucket = getBucketForUser(userId);

    const chunks = [];
    const stream = bucket.openDownloadStream(new ObjectId(fileId));

    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Stream a file directly to HTTP response for a specific user
 */
function streamFromGridFS(userId, fileId, res) {
  const bucket = getBucketForUser(userId);

  const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));

  downloadStream.on('error', (err) => {
    console.error('GridFS Stream Error:', err);
    res.status(404).json({ message: 'File not found' });
  });

  downloadStream.pipe(res);
}

/**
 * Delete a file from a user's bucket
 */
async function deleteFromGridFS(userId, fileId) {
  const bucket = getBucketForUser(userId);

  try {
    await bucket.delete(new ObjectId(fileId));
  } catch (err) {
    console.error("GridFS delete error:", err);
    throw err;
  }
}

module.exports = {
  getBucketForUser,
  uploadBufferToGridFS,
  readFromGridFS,
  streamFromGridFS,
  deleteFromGridFS,
};
