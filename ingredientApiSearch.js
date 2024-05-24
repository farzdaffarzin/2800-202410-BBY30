require("./utils.js");
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Retrieve API key
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;

// Configure Express app
app.set('view engine', 'ejs');
app.use(express.static('views'));
app.use(express.static('public'));

// Function to search for ingredients using Spoonacular API
async function ingredientSearch(ingredientName, userSortSelection) {
    var query = ingredientName;
    var sortOption = userSortSelection;
    var number = 99;

    // Construct request URL with API key and query parameters
    const requestUrl = `https://api.spoonacular.com/food/ingredients/search?apiKey=${SPOONACULAR_API_KEY}&query=${query}&number=${number}&sort=calories&sortDirection=desc`;
    try {
        // Make GET request to Spoonacular API
        const results = await axios.get(requestUrl);
        if (sortOption === "alphabet") {
            const ingredients = results.data.results;
            sortIngredients(ingredients);
            return ingredients;
        }
        return results.data.results; // Return search results
    } catch (err) {
        // Log and throw error if API request fails
        console.error('Error fetching ingredients:', err.message);
        throw err;
    }
}

function sortIngredients(ingredients) {
    return ingredients.sort((first, second) => first.name.localeCompare(second.name));
}

module.exports = {
    ingredientSearch
}