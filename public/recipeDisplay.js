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
        titleLink.addEventListener('click', () => fetchRecipeDetails(recipe.id));
        listItem.appendChild(titleLink);
        recipeList.appendChild(listItem);
    });
}

async function fetchRecipeDetails(recipeId) {
  try {
      const response = await fetch(`/recipes/${recipeId}`, {
          method: 'GET',
      }); const recipeDetails = await response.json();
      displayRecipeDetails(recipeDetails);
  } catch (error) {
      console.error("Error fetching recipe details:", error);
  }
}

// function to display full recipe details
function displayRecipeDetails(recipe) {
  const detailsDiv = document.getElementById('recipeDetails');
  detailsDiv.innerHTML = `
      <h3>${recipe.title}</h3>
      <img src="${recipe.image}" alt="${recipe.title}" width="300">
      <h4>Ingredients:</h4>
      <ul>${recipe.extendedIngredients.map(ing => `<li>${ing.original}</li>`).join('')}</ul>
      <h4>Instructions:</h4>
      <p>${recipe.instructions}</p>
  `;
  detailsDiv.style.display = 'block';
}
