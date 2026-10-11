const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/analytics_db';

  try {
    console.log(`[Database] Attempting connection to MongoDB at: ${uri}`);
    
    // Quick probe with timeout
    const connectPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 1500,
      connectTimeoutMS: 1500
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timeout (1.5s)')), 1500)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    isConnected = true;
    console.log('✅ [Database] MongoDB connected successfully to ' + uri);
  } catch (err) {
    isConnected = false;
    console.warn(`⚠️ [Database] Could not connect to MongoDB (${err.message}).`);
    console.log('💡 [Database] Running with in-memory / JSON fallback store.');
    console.log('   All APIs, session tracking, and heatmaps remain 100% operational!');
    console.log('   To persist to MongoDB, ensure mongod is running or set MONGODB_URI in server/.env');
  }

  return isConnected;
};

const isMongoConnected = () => isConnected;

module.exports = {
  connectDB,
  isMongoConnected
};
