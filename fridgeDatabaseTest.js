require("./utils.js");
const express = require('express');
const axios = require('axios');
require('dotenv').config();
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const port = process.env.port || 4500;

// Middleware to parse JSON request bodies
app.use(express.json());

// Retrieve environment variables for MongoDB and API key
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
const node_session_secret = process.env.NODE_SESSION_SECRET;

// Include database connection
var {database} = include('databaseConnection');

// Access user collection from MongoDB
const userCollection = database.db(mongodb_database).collection('users');

// Create MongoStore instance for session storage
var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
    crypto: {
        secret: mongodb_session_secret
    }
});

// Configure Express app
app.set('view engine', 'ejs');
app.use(express.static('views'));
app.use(express.static('public'));

// Configure session middleware
app.use(session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true
}));

// Function to search for ingredients using Spoonacular API
async function ingredientSearch(ingredientName, userSortSelection) {
    var query = ingredientName;
    var sortOption = userSortSelection;
    var number = 99;

    // Construct request URL with API key and query parameters
    const requestUrl = `https://api.spoonacular.com/food/ingredients/search?apiKey=${SPOONACULAR_API_KEY}&query=${query}&number=${number}&sort=${sortOption}&sortDirection=desc`;
    try {
        // Make GET request to Spoonacular API
        const results = await axios.get(requestUrl);
        return results.data.results; // Return search results
    } catch (err) {
        // Log and throw error if API request fails
        console.error('Error fetching ingredients:', err.message);
        throw err;
    }
}

// Route for home page
app.get("/", async (req, res) => {
    res.render('fridge'); // Render fridge page
});

// Route for fetching user fridge data
app.post('/getUserFridge', async (req, res) => {
    try {
        // Username for testing
        // In actual use you'd get req.session.username and use it here
        const username = "razielTest";

        // Find user's fridge data from MongoDB
        const userFridgeData = await userCollection.findOne(
            { username: username },
            { projection: { _id: 0, username: 0, password: 0} } // Exclude username and password from projection
        );

        if (!userFridgeData) {
            return res.status(404).json({ error: 'User fridge data not found' });
        }

        // Return user data; only the fridge
        res.json(userFridgeData);
    } catch (error) {
        // Handle error if fetching fridge data fails
        console.error('Error fetching fridge data:', error);
        res.status(500).json({ error: 'Failed to fetch fridge data' });
    }
});

// Route for inserting an item into the user's fridge
app.post('/insertIntoFridge', async (req, res) => {
    try {
        // Username for testing
        // In actual use you'd get req.session.username and use it here
        const username = "razielTest";

        // Finds and inserts ingredient into user's fridge
        const result = await userCollection.updateOne(
            { username: username },
            { $push: { fridge: req.body.ingredientObject } } 
        );

        if (!result) {
            return res.status(404).json({ error: 'User fridge data not found' });
        }

        res.json(result);
    } catch (err) {
        // Handle error if fetching fridge data fails
        console.error('Error updating fridge data:', err);
        res.status(500).json({ error: 'Failed to update fridge data' });
    }
});

// Route for ingredient search
app.post('/ingredients', async (req, res) => {
    try {
        // Extract ingredient to search from request body
        const ingredientToSearch = req.body.ingredient;
        if (!ingredientToSearch) {
            // Return error response if ingredient is not provided
            res.status(400).json({ error: 'Ingredient not provided in the request' });
            return;
        }

        // Search for ingredients using Spoonacular API
        const results = await ingredientSearch(ingredientToSearch, "calories");
        res.json(results); // Return search results
    } catch (err) {
        // Handle errors if ingredient search fails
        if (err.response && err.response.status === 404) {
            res.status(404).json({ error: 'No ingredients found' });
            return;
        } 

        if (err.response) {
            res.status(err.response.status).json({ error: err.response.data });
            return;
        } 
        res.status(500).json({ error: 'Failed to fetch ingredients' });
    }
});

app.listen(4000, () => {
    console.log(`Server is running on port ${4000}`);
});
