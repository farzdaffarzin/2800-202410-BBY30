
const express = require('express');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
const SPOONACULAR_API_KEY = "d2f9861e57d94faaac601530b94f8853";

// Set EJS as the view engine
app.set('view engine', 'ejs');

async function getRecipesByIngredients(ingredients) {
    try {
        const url = `https://api.spoonacular.com/recipes/findByIngredients?apiKey=${SPOONACULAR_API_KEY}&ingredients=${ingredients.join(',')}`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching recipes:', error);
        throw error;
    }
}
app.get('/', (req, res) => {
    res.render('recipeDemo'); // Render the 'recipeDemo.ejs' template
});

app.get('/recipes/:id', async (req, res) => {
    try {
        const recipeId = req.params.id;
        const response = await axios.get(
            `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${SPOONACULAR_API_KEY}&includeNutrition=false`
        );

        const recipeDetails = response.data;

        // Optionally, customize the returned details:
        const simplifiedDetails = {
            title: recipeDetails.title,
            image: recipeDetails.image,
            extendedIngredients: recipeDetails.extendedIngredients,
            instructions: recipeDetails.instructions,
        };

        res.json(simplifiedDetails); // Send only necessary details
    } catch (error) {
        console.error("Error fetching recipe details:", error);
        res.status(500).json({ error: 'Failed to fetch recipe details' });
    }
});

app.post('/recipes', async (req, res) => {
    try {
        const ingredients = req.body.ingredients || ['chicken', 'broccoli', 'rice'];

        const recipes = await getRecipesByIngredients(ingredients);

        // Store recipes in MongoDB (if implemented)
        // ...

        res.json(recipes);
    } catch (error) {
        // More specific error handling
        if (error.response && error.response.status === 404) {
            res.status(404).json({ error: 'No recipes found for the given ingredients' });
        } else if (error.response) {
            // Spoonacular API error
            res.status(error.response.status).json({ error: error.response.data });
        } else {
            // Other errors (e.g., network issues)
            res.status(500).json({ error: 'Failed to fetch recipes' });
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = {
    getRecipesByIngredients, // Export the function
};