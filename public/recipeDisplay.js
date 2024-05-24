



async function fetchRecipes() {
    const ingredientsInput = document.getElementById('ingredients').value;
    const ingredients = ingredientsInput.split(',').map(ing => ing.trim());

    if (ingredients.length === 0) {
        alert("Please enter at least one ingredient.");
        return;
    }

    try {
        const response = await fetch('/recipes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ingredients }),
        });

        const recipes = await response.json();
        displayRecipes(recipes);
    } catch (error) {
        console.error("Error fetching recipes:", error);
    }
}

async function generateRecipes() {
    const selectedIngredients = Array.from(document.querySelectorAll('#fridgeList input[type="checkbox"]:checked'))
        .map(el => el.value);

    const addedIngredients = Array.from(document.querySelectorAll('#addedIngredients li'))
        .map(el => el.textContent);

    const allIngredients = selectedIngredients.concat(addedIngredients);

    if (allIngredients.length === 0) {
        alert("Please select or add at least one ingredient.");
        return;
    }

    try {
        const response = await fetch('/recipes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ingredients: allIngredients }), // Use combined ingredients
        });

        const recipes = await response.json();
        displayRecipes(recipes);
    } catch (error) {
        console.error("Error fetching recipes:", error);
    }
}
// new function specifically handles the logic for generating recipes from the prompt page
async function generateRecipesFromPrompt() {
    const selectedIngredients = Array.from(document.querySelectorAll('#fridgeList input[type="checkbox"]:checked'))
        .map(el => el.value);
    const addedIngredients = Array.from(document.querySelectorAll('#addedIngredients li'))
        .map(el => el.textContent);

    const allIngredients = selectedIngredients.concat(addedIngredients);
    const cuisine = document.getElementById('cuisineSelector').value;

    console.log(cuisine);

    if (allIngredients.length === 0) {
        alert("Please select or add at least one ingredient.");
        return;
    }

    try {
        const response = await fetch('/recipes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ingredients: allIngredients, cuisine: cuisine }),
        });

        const recipes = await response.json();
        // Check if recipes were found
        if (recipes.length > 0) {
            displayRecipes(recipes);
        } else {
            const recipeList = document.getElementById('recipeList');
            recipeList.innerHTML = '<p>No recipes found for the given ingredients and cuisine.</p>';
        }

    } catch (error) {
        console.error("Error fetching recipes:", error);
        // You can add a more user-friendly error message here
    }
}
function addIngredient() {
    const addIngredientInput = document.getElementById('addIngredient');
    const newIngredient = addIngredientInput.value.trim();

    if (newIngredient !== "") {
        const addedIngredientsList = document.getElementById('addedIngredients');
        const listItem = document.createElement('li');
        listItem.textContent = newIngredient;
        addedIngredientsList.appendChild(listItem);
        addIngredientInput.value = ""; // Clear the input field
    }
}


// Function to display the fetched recipes as a list
async function displayRecipes(recipes) {
    const recipeList = document.getElementById('recipeList');
    recipeList.innerHTML = ''; // Clear previous results

    if (recipes.length === 0) {
        recipeList.innerHTML = '<p>No recipes found for the given ingredients.</p>';
        return;
    }

    const isPromptPage = window.location.pathname === '/prompt';
    const savedRecipeIds = isPromptPage ? [] : await getSavedRecipes();

    recipes.forEach(recipe => {
        const listItem = document.createElement('li');
        const titleLink = document.createElement('a');
        titleLink.textContent = recipe.title;
        titleLink.href = `/recipe/${recipe.id}`; // Use a regular link to navigate
        titleLink.classList.add('recipe-title');
        titleLink.dataset.recipeId = recipe.id;
        listItem.appendChild(titleLink);

        const saveButton = document.createElement('button');
        saveButton.id = `saveButton-${recipe.id}`;
        saveButton.textContent = savedRecipeIds.includes(recipe.id) ? 'Remove from Favorites' : 'Save to Favorites';
        saveButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent triggering the recipe detail fetch
            toggleFavorite(recipe.id);
        });
        listItem.appendChild(saveButton);

        recipeList.appendChild(listItem);
    });

    recipeList.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('recipe-title')) {
            const recipeId = target.dataset.recipeId;
            fetchRecipeDetails(recipeId);
        }
    });
}




async function toggleFavorite(recipeId) {
    console.log("Toggling favorite for recipe ID:", recipeId); // Add recipe ID to console log

    // Dynamically select the button based on recipe ID
    const saveButton = document.getElementById(`saveButton-${recipeId}`);
    if (!saveButton) {
        console.error("Button not found:", `saveButton-${recipeId}`);
        return;
    }

    const isSaved = saveButton.textContent.trim() === "Remove from Favorites";
    const action = isSaved ? 'remove-recipe' : 'save-recipe';
    const url = `/${action}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipeId }),
        });

        if (response.ok) {
            saveButton.textContent = isSaved ? 'Save to Favorites' : 'Remove from Favorites';
        } else {
            alert("Error toggling favorite. Please try again.");
        }
    } catch (error) {
        console.error("Error toggling favorite:", error);
        alert("An error occurred. Please try again later.");
    }
}


async function saveRecipe(recipeId) {
    try {
        const response = await fetch('/save-recipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipeId }),
        });

        if (response.ok) {
            // Update the UI to indicate the recipe was saved
            // (e.g., change button text, show a success message)
            const saveButton = document.getElementById('saveButton');
            saveButton.textContent = "Saved!";
            saveButton.disabled = true;
        } else {
            alert("Error saving recipe. Please try again.");
        }
    } catch (error) {
        console.error("Error saving recipe:", error);
        alert("An error occurred while saving. Please try again later.");
    }
}

async function getSavedRecipes() {
    try {
        const response = await fetch('/get-saved-recipes');
        if (response.ok) {
            const data = await response.json();
            return data.savedRecipes || [];
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error fetching saved recipes:', error);
        return []; // Return an empty array in case of an error
    }
}





