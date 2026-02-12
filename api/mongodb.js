const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'my-dynamic-site';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    try {
        const client = await MongoClient.connect(MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        const db = client.db(DB_NAME);
        cachedClient = client;
        cachedDb = db;

        console.log('✅ MongoDB 连接成功');
        return { client, db };
    } catch (error) {
        console.error('❌ MongoDB 连接失败:', error.message);
        throw error;
    }
}

module.exports = { connectToDatabase };
