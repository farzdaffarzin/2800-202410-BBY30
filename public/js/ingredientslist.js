var itemsToDelete = [];

document.addEventListener("DOMContentLoaded", async function () {
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
            checkbox.addEventListener('change', function () {
                if (this.checked) {
                    listItem.classList.add('strikethrough');
                    if (!itemsToDelete.includes(ingredient.id)) {
                        console.log(`added ${ingredient.name}`);
                        itemsToDelete.push(ingredient.id);
                    }
                } else {
                    listItem.classList.remove('strikethrough');
                    const index = itemsToDelete.indexOf(ingredient.id);
                    if (index > -1) {
                        console.log(`removed ${ingredient.name}`);
                        itemsToDelete.splice(index, 1);
                    }
                }
            });

            const label = document.createElement('label');
            label.textContent = ingredient.name; // Use '=' instead of '+=' to avoid appending

            const price = document.createElement('span');
            // Check if the price is defined before accessing it
            if (typeof ingredient.price !== 'undefined') {
                price.textContent = `$${ingredient.price.toFixed(2)}`;
            } else {
                price.textContent = 'Price not available';
            }
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

    document.getElementById('delete-checked-items').addEventListener('click', async () => {
        console.log('aaaa');
        const checkedItems = document.querySelectorAll('#ingredients-list input[type="checkbox"]:checked');
        const idsToDelete = Array.from(checkedItems).map(item => item.closest('li').getAttribute('data-id'));

        if (idsToDelete.length > 0) {
            try {
                const response = await fetch('/delete-ingredients', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ids: idsToDelete })
                });

                if (response.ok) {
                    idsToDelete.forEach(id => {
                        const listItem = document.querySelector(`#ingredients-list li[data-id="${id}"]`);
                        if (listItem)
                            listItem.remove();
                    });
                } else {
                    console.error('Failed to delete ingredients');
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }
    });
});