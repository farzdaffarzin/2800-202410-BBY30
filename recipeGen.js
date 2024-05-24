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

async function getRecipeDetails(recipeId, axiosInstance = axios) { 
    const url = `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${SPOONACULAR_API_KEY}&includeNutrition=false`;
    const response = await axiosInstance.get(url); 
    return response.data;
  }

// Function to fetch recipes from Spoonacular API
async function getRecipesByIngredients(ingredients, cuisine, axiosInstance = axios) {
    try {
      let recipes;
      if (cuisine === "any" || cuisine == null) {
        const url = `https://api.spoonacular.com/recipes/findByIngredients?apiKey=${SPOONACULAR_API_KEY}&ingredients=${ingredients.join(',')}&ranking=2`; //ranking 2 means maximize used ingredients
        const response = await axiosInstance.get(url);
        recipes = response.data;
      } else {
        const url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${SPOONACULAR_API_KEY}&includeIngredients=${ingredients.join(',')}&cuisine=${cuisine}&ranking=2`; //ranking 2 means maximize used ingredients
        const response = await axiosInstance.get(url);
        recipes = response.data.results;
      }
  
  
     // Fetch detailed information for each recipe to get the full ingredient list
      const detailedRecipes = await Promise.all(
        recipes.map(recipe => getRecipeDetails(recipe.id, axiosInstance))
      );
       
  
      // Calculate ingredient matches and sort
      const sortedRecipes = detailedRecipes
        .map(recipe => ({
          ...recipe,
          ingredientMatches: recipe.extendedIngredients.filter(ing =>
            ingredients.includes(ing.name.toLowerCase()) // Case-insensitive matching
          ).length
        }))
        .sort((a, b) => b.ingredientMatches - a.ingredientMatches); 
       
      return sortedRecipes;
  
    } catch (error) {
        // Handle different error scenarios
        if (error.response) {
          // Spoonacular API error
          if (error.response.status === 402) {
            throw new Error("API request limit reached.");
          } else {
            console.error("Spoonacular API Error:", error.response.data);
            throw new Error("Spoonacular API Error. Please try again later.");
          }
        } else if (error.request) {
          // Network error (request not sent)
          console.error("Network Error:", error.request);
          throw new Error("Network Error. Please check your connection and try again.");
        } else {
          // Other errors
          console.error("Unexpected Error:", error);
          throw new Error("An unexpected error occurred. Please try again later.");
        }
      }
    }
  
  module.exports = {
    getRecipesByIngredients,
  };