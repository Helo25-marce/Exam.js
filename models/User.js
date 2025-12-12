const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI;
let db;

async function connectDB() {
  if (db) return db;
  const client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  console.log('Connecté à MongoDB');
  return db;
}

async function getUsersCollection() {
  const database = await connectDB();
  return database.collection('users');
}

module.exports = { getUsersCollection, ObjectId };