async function fetchIngredients() {
    const searchInput = document.getElementById('search-item').value;

    const formattedSearch = {
        ingredient: searchInput
    };

    try {
        const response = await fetch('/ingredients', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formattedSearch),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch ingredient data');
        }
        
        const ingredients = await response.json();
        displayIngredients(ingredients);
    } catch (err) {
        console.error("Error fetching ingredients:", err);
    }
}

function getSortingSelection(sorting) {
    var sortingOptions = [].slice.call(sorting);
    var sortSelection = "calories"; //default value
    for (i = 0; i < sortingOptions.length; i++) {
        if (sortingOptions[i].checked) {
            sortSelection = sortingOptions[i].value;
        }
    }
    return sortSelection;
}

async function displayIngredients(results) {
    const ingredientList = document.getElementById('search-results-list');
    const fridgeDisplay = document.getElementById('fridge-contents');
    results.forEach(element => {
        let foundIngredient = document.createElement('li'); 
        foundIngredient.innerHTML = `${element.name}, ${element.id}`;
        foundIngredient.addEventListener('click', async () => {
            const ingredientObject = {
                "id": element.id,
                "name": element.name
            };

            try {
                const response = await fetch('/insertIntoFridge', { 
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ingredientObject}),
                });
        
                if (!response.ok) {
                    throw new Error('Failed to insert item into fridge');
                }
            } catch (err) {
                console.error("Error updating fridge:", err);
            }

            let item = createFridgeItem(ingredientObject);
            fridgeDisplay.appendChild(item);
        });
        ingredientList.appendChild(foundIngredient);
    })
}

function createFridgeItem(item) {
    let itemToAdd = document.createElement('li');
    itemToAdd.innerHTML = `${item.name}, ${item.id}`;
    return itemToAdd;
}