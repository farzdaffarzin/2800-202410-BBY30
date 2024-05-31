async function addToShoppingList(ingredientId, ingredientName, ingredientAmount, ingredientUnit) {
    try {
        const response = await fetch('/addToShoppingList', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ingredientId: ingredientId, ingredientName: ingredientName, ingredientAmount: ingredientAmount, ingredientUnit: ingredientUnit })
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
    if (event.target && event.target.classList.contains('add-button')) {
        const liElement = event.target.parentElement;
        const ingredientId = liElement.getAttribute('data-id');
        const ingredientName = liElement.getAttribute('data-name');
        const ingredientAmount = liElement.getAttribute('data-amount');
        const ingredientUnit = liElement.getAttribute('data-unit');

        const result = await addToShoppingList(ingredientId, ingredientName, ingredientAmount, ingredientUnit);

        if (result.success) {
            event.target.textContent = ' Added';
            event.target.style.pointerEvents = 'none';
        } else {
            event.target.textContent = ' (Failed to add to shopping list)';
        }
    }
});
