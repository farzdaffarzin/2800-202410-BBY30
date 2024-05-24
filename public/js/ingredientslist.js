document.addEventListener("DOMContentLoaded", async function() {
    async function fetchShoppingList() {
        try {
            const response = await fetch('/getShoppingList');
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to fetch shopping list');
            }

            return result.shoppingList;
        } catch (error) {
            console.error(error);
            return [];
        }
    }

    function renderShoppingList(shoppingList) {
        const ingredientsList = document.getElementById('ingredients-list');
        ingredientsList.innerHTML = ''; // Clear the existing list

        shoppingList.forEach(ingredient => {
            const listItem = document.createElement('li');
            listItem.setAttribute('data-id', ingredient.id);
            listItem.setAttribute('data-name', ingredient.name);
            listItem.setAttribute('data-price', ingredient.price);
            listItem.setAttribute('data-unit', ingredient.unit);
            listItem.setAttribute('data-amount', ingredient.amount);

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.addEventListener('change', function() {
                if (this.checked) {
                    listItem.classList.add('strikethrough');
                } else {
                    listItem.classList.remove('strikethrough');
                }
            });

            const label = document.createElement('label');
            label.textContent += ingredient.name;
    
            const price = document.createElement('span');
            price.textContent = `$${ingredient.price.toFixed(2)}`;
            price.classList.add('ingredient-price'); // Add a class for styling
    
            const leftContainer = document.createElement('div');
            leftContainer.classList.add('left-container');
            leftContainer.appendChild(checkbox);
            leftContainer.appendChild(label);
    
            listItem.appendChild(leftContainer);
            listItem.appendChild(price);
            ingredientsList.appendChild(listItem);
        });
    }

    const shoppingList = await fetchShoppingList();
    console.log(shoppingList);
    renderShoppingList(shoppingList);
});
