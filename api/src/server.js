// src/server.js
const http = require('http');
const app = require('./app');
const { connectMongo } = require('./config/mongo');
const { port } = require('./config/env');

const server = http.createServer(app);

const start = async () => {
  await connectMongo();

  server.listen(port, () => {
    console.log(`🚀 API server listening on port ${port}`);
  });
};

start().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

// Optional safety nets
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});