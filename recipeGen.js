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

async function getRecipesByIngredients(ingredients, cuisine, axiosInstance = axios) {
    try {
      let url;
  
      if (ingredients.length > 1) {
        // Use findByIngredients for multiple ingredients
        if (cuisine === "any" || cuisine == null) {
          url = `https://api.spoonacular.com/recipes/findByIngredients?apiKey=${SPOONACULAR_API_KEY}&ingredients=${ingredients.join(',')}&ranking=2`;
        } else {
          url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${SPOONACULAR_API_KEY}&includeIngredients=${ingredients.join(',')}&cuisine=${cuisine}&ranking=2`;
        }
      } else {
        // Use complexSearch for single ingredient with sorting by popularity
        let ingredientEncoded = encodeURIComponent(ingredients[0]);
        url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${SPOONACULAR_API_KEY}&query=${ingredientEncoded}&sort=popularity&ranking=2`;
      }
  
      const response = await axiosInstance.get(url);
  
      let recipes;
      // Handle response based on the chosen endpoint
      if (ingredients.length > 1 || (response.data && response.data.results)) { 
        // findByIngredients or complexSearch with results
        recipes = response.data.results || response.data; 
      } else {
        // Handle the case where there are no results (e.g., complexSearch with no matches)
        recipes = [];  // Return an empty array if no results
      }
      
      // Fetch detailed information, handling errors for individual recipes
      const detailedRecipes = await Promise.all(
        recipes.map(async (recipe) => {
          try {
            return await getRecipeDetails(recipe.id, axiosInstance);
          } catch (detailError) {
            console.error(`Error fetching details for recipe ${recipe.id}:`, detailError);
            return null; // Exclude recipes with detail fetch errors
          }
        })
      );
       //filter out null from array
       const filteredRecipes = detailedRecipes.filter(recipe => recipe !== null);
  
  
      // Calculate ingredient matches (ignoring quantities) and sort
      const sortedRecipes = filteredRecipes
        .map(recipe => ({
          ...recipe,
          ingredientMatches: recipe.extendedIngredients.filter(ing =>
            ingredients.some(userIngredient => userIngredient.toLowerCase() === ing.name.toLowerCase())
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

  async function fetchRecipeDetails(recipeId) {
    try {
      const response = await fetch(`https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${SPOONACULAR_API_KEY}&includeNutrition=false`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching recipe details:", error);
      throw error; 
    }
  }

// Simple difficulty calculation function
function calculateDifficulty(steps, ingredients, cookTime) {
    let difficulty = 1; // Start with base difficulty of 1 (easy)

    if (steps > 5) {
        difficulty++; // Increase difficulty if steps exceed 10
    }
    if (ingredients > 5) {
        difficulty++; // Increase difficulty if ingredients exceed 8
    }
    if (cookTime > 45) {
        difficulty++; // Increase difficulty if cook time exceeds 45 minutes
    }

    return Math.min(difficulty, 3); // Cap the difficulty at 3 (hard)
}

async function getMissingIngredientsForRecipe(recipeId, username, fridgeData, shoppingListData) {
    try {
        const recipeDetails = await fetchRecipeDetails(recipeId);
        const ingredients = recipeDetails.extendedIngredients;
    
        return ingredients.filter(ingredient => {
            const existsInFridge = fridgeData.some(
                fridgeItem =>
                    fridgeItem.id === ingredient.id //&&
                    // fridgeItem.amount >= ingredient.amount &&
                    // fridgeItem.unit === ingredient.unit // Consider unit as well
            );
            const existsInShoppingList = shoppingListData.some(
                shoppingListItem =>
                    shoppingListItem.id === ingredient.id //&&
                    // shoppingListItem.amount >= ingredient.amount &&
                    // shoppingListItem.unit === ingredient.unit // Consider unit as well
            );
            return !existsInFridge && !existsInShoppingList;
        }).map(ingredient => ({
            id: ingredient.id,
            name: ingredient.original,
            amount: ingredient.amount,
            unit: ingredient.unit,
        })); // Return the full ingredient object (including amount and unit)
    } catch (error) {
        console.error(`Error fetching missing ingredients for recipe ${recipeId}:`, error);
        return [];
    }
  }

  
  module.exports = {
    getRecipesByIngredients,
    fetchRecipeDetails,
    calculateDifficulty,
    getMissingIngredientsForRecipe
  };