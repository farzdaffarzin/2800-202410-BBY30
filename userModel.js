
const { MongoClient, ObjectId } = require('mongodb');
const { getClient } = require('./databaseConnection');

class User {
    static async findByIdAndUpdate(id, update) {
        const client = getClient();
        const database = client.db(process.env.MONGODB_DATABASE);
        const collection = database.collection('users');
        return collection.findOneAndUpdate({ _id: new ObjectId(id) }, update, { returnOriginal: false });
    }

    static async findById(id) {
        const client = getClient();
        const database = client.db(process.env.MONGODB_DATABASE);
        const collection = database.collection('users');
        return collection.findOne({ _id: new ObjectId(id) });
    }
}

module.exports = User;