const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/webshopmc';
  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    let fallbackUri = null;
    if (uri.includes('mongodb://db:')) {
      fallbackUri = uri.replace('mongodb://db:', 'mongodb://127.0.0.1:');
    } else if (uri.includes('127.0.0.1')) {
      fallbackUri = uri.replace('127.0.0.1', 'db');
    } else if (uri.includes('localhost')) {
      fallbackUri = uri.replace('localhost', 'db');
    }

    if (fallbackUri) {
      try {
        const conn = await mongoose.connect(fallbackUri);
        console.log(`MongoDB Connected (Fallback): ${conn.connection.host}`);
        return;
      } catch (fallbackErr) {
        // Log original error if fallback also fails
      }
    }

    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
