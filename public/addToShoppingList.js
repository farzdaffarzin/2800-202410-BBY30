async function addToShoppingList(ingredientId, ingredientName, ingredientAmount) {
    try {
        const response = await fetch('/addToShoppingList', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ingredientId: ingredientId, ingredientName: ingredientName, ingredientAmount: ingredientAmount })
        });

        if (!response.ok) {
            throw new Error('Failed to add ingredient to shopping list');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to add ingredient to shopping list');
        }

        return result;

    } catch (error) {
        return { success: false, message: error.message };
    }
}
// Add event listener to the list
document.getElementById('missingIngredientsList').addEventListener('click', async function(event) {
    if (event.target && event.target.nodeName === 'LI') {
        const ingredientId = event.target.getAttribute('data-id');
        const ingredientName = event.target.getAttribute('data-name');
        const ingredientAmount = event.target.getAttribute('data-amount');

        const result = await addToShoppingList(ingredientId, ingredientName, ingredientAmount);

        if (result.success) {
            event.target.textContent = ' Added to shopping list';
            event.target.style.pointerEvents = 'none';
        } else {
            event.target.textContent = ' (Failed to add to shopping list)';
        }
    
    }
});