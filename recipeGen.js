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
async function getRecipesByIngredients(ingredients) {
    try {
        const url = `https://api.spoonacular.com/recipes/findByIngredients?apiKey=${SPOONACULAR_API_KEY}&ingredients=${ingredients.join(',')}`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching recipes:', error);
        throw error; // Let the calling function handle the error
    }
}

// Route to render the recipe demo page
app.get('/', (req, res) => {
    res.render('recipeDemo'); 
});

// Route to fetch recipe details by ID
app.get('/recipes/:id', async (req, res) => {
    try {
        const recipeId = req.params.id;
        const response = await axios.get(
            `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${SPOONACULAR_API_KEY}&includeNutrition=false`
        );

        const recipeDetails = response.data;

        // Extract only necessary details (you can customize this)
        const simplifiedDetails = {
            title: recipeDetails.title,
            image: recipeDetails.image,
            extendedIngredients: recipeDetails.extendedIngredients,
            instructions: recipeDetails.instructions,
        };

        res.json(simplifiedDetails); 
    } catch (error) {
        console.error("Error fetching recipe details:", error);
        res.status(500).json({ error: 'Failed to fetch recipe details' });
    }
});

// Route to handle recipe search by ingredients
app.post('/recipes', async (req, res) => {
    try {
        const ingredients = req.body.ingredients || ['chicken', 'broccoli', 'rice']; // Default ingredients if none provided

        const recipes = await getRecipesByIngredients(ingredients);

        // (Optional) Store recipes in MongoDB if needed...

        res.json(recipes);
    } catch (error) {
        // Error handling for different cases:
        if (error.response && error.response.status === 404) {
            res.status(404).json({ error: 'No recipes found for the given ingredients' });
        } else if (error.response) { // Spoonacular API error
            res.status(error.response.status).json({ error: error.response.data });
        } else { // Other errors (e.g., network issues)
            res.status(500).json({ error: 'Failed to fetch recipes' });
        }
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = {
    getRecipesByIngredients, // Export the function for potential use elsewhere
};
