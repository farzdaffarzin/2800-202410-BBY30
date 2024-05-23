const express = require('express');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

const app = express();
app.use(express.json()); // Middleware to parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files (e.g., recipeDisplay.js)

// Load environment variables (replace with your actual path to .env file)
dotenv.config({ path: path.join(__dirname, '.env') });

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;

// Set EJS as the view engine
app.set('view engine', 'ejs'); 
app.set('views', path.join(__dirname, 'views'));

// Function to fetch recipes from Spoonacular API
async function getRecipesByIngredients(ingredients, cuisine, axiosInstance = axios) {  // Default to the global axios if not provided
    try {
        if (cuisine === "any") {
            const url = `https://api.spoonacular.com/recipes/findByIngredients?apiKey=${SPOONACULAR_API_KEY}&ingredients=${ingredients.join(',')}`;
            const response = await axiosInstance.get(url); // Use the provided or default axiosInstance
            return response.data;
        } else {
            const url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${SPOONACULAR_API_KEY}&ingredients=${ingredients.join(',')}&cuisine=${cuisine}`;
            const response = await axiosInstance.get(url); // Use the provided or default axiosInstance
            return response.data.results;
        }
    } catch (error) {
        console.error('Error fetching recipes:', error);
        throw error;
    }
}

module.exports = {
    getRecipesByIngredients,
};
