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
function displayRecipes(recipes) {
    const recipeList = document.getElementById('recipeList');
    recipeList.innerHTML = ''; // Clear previous results

    if (recipes.length === 0) {
        recipeList.innerHTML = '<p>No recipes found for the given ingredients.</p>';
        return;
    }

    recipes.forEach(recipe => {
        const listItem = document.createElement('li');
        const titleLink = document.createElement('a');
        titleLink.textContent = recipe.title;
        titleLink.classList.add('recipe-title');

        // Add data attribute for recipe ID
        titleLink.dataset.recipeId = recipe.id; // Set recipe ID as a data attribute

        listItem.appendChild(titleLink);
        recipeList.appendChild(listItem);
    });

    // Event Delegation:
    recipeList.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('recipe-title')) {
            const recipeId = target.dataset.recipeId; 
            console.log("Fetching details for recipe:", recipeId); // Debugging
            fetchRecipeDetails(recipeId);
        }
    });
}


// Function to fetch and display recipe details
async function fetchRecipeDetails(recipeId) {
    try {
        // Redirect to the recipe details page (using JavaScript's window.location)
        window.location.href = `/recipes/${recipeId}`; 
    } catch (error) {
        console.error("Error fetching recipe details:", error);
        // Handle error and show a user-friendly message
    }
}

  


