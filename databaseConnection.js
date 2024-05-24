const { MongoClient } = require("mongodb");
require('dotenv').config();

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;

const atlasURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_database}?retryWrites=true`;
let client;

async function connectToDatabase() {
    try {
        client = await MongoClient.connect(atlasURI);
        console.log("Connected to MongoDB Atlas");

        const db = client.db(process.env.MONGODB_DATABASE);

        // Await the connection to the sessions collection
        const sessionsCollection = await db.collection("sessions");

        return { client, sessionsCollection }; 
    } catch (error) {
        console.error("Error connecting to MongoDB Atlas:", error);
        throw error; // Rethrow the error to handle it in the calling code
    }
}

function getClient() {
    if (!client) {
        throw new Error("Database client is not initialized. Make sure to call connectToDatabase first.");
    }
    return client;
}

module.exports = { connectToDatabase, getClient };
