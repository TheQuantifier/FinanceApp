// src/config/mongo.js
const mongoose = require('mongoose');
const { mongoUri, mongoDbName } = require('./env');

mongoose.set('strictQuery', true);

const connectMongo = async () => {
  try {
    await mongoose.connect(mongoUri, {
      dbName: mongoDbName,
    });
    console.log(`✅ Connected to MongoDB database: ${mongoDbName}`);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = { connectMongo };