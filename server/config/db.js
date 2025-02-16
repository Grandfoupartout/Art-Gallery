const { MongoClient } = require("mongodb");
const { MongoDBChatMessageHistory } = require("@langchain/mongodb");
const mongoose = require("mongoose");
require("dotenv").config();

// MongoDB connection for main database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/galerie', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// MongoDB client for chat history
const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("galerie"); // Use the same database name
const chatHistoryCollection = db.collection("chatHistory"); // Separate collection for chat history

const getChatHistory = async (sessionId) => {
  try {
    return new MongoDBChatMessageHistory({
      collection: chatHistoryCollection,
      sessionId: sessionId,
      config: {
        ignoreConsistencyErrors: true // Helps with potential race conditions
      }
    });
  } catch (error) {
    console.error('Error getting chat history:', error);
    throw error;
  }
};

// Error handlers
mongoose.connection.on('error', err => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

// Cleanup on application shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    await client.close();
    console.log('MongoDB connections closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error during MongoDB connection closure:', err);
    process.exit(1);
  }
});

module.exports = { 
  connectDB,
  client, 
  db,
  getChatHistory,
  chatHistoryCollection 
}; 