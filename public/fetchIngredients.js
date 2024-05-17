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

    // Clear previous ingredient search results
    ingredientList.innerHTML = '';
    
    results.forEach(element => {
        let foundIngredient = document.createElement('li'); 
        foundIngredient.innerHTML = `${capitalizeFirstLetter(element.name)}`;

        foundIngredient.addEventListener('click', async () => {
            const ingredients = {
                "id": element.id,
                "name": element.name
            };

            try {
                const response = await fetch('/insertIntoFridge', { 
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ingredients}),
                });
        
                if (!response.ok) {
                    throw new Error('Failed to insert item into fridge');
                }
                const existsData = await response.json();
                if (existsData.exists && existsData.exists === true) {
                    // Display message saying the item is already in the user's fridge here
                    alert("That item is already in your fridge!");
                    return;
                } else {
                    let item = createFridgeItem(ingredients);
                    var emptyMessage = document.getElementById('empty-message')
                    if (emptyMessage) {
                        emptyMessage.remove();
                    }
                    fridgeDisplay.appendChild(item);
                }
                
            } catch (err) {
                console.error("Error updating fridge:", err);
            }            
        });
        ingredientList.appendChild(foundIngredient);
    })
}

function createFridgeItem(item) {
    let itemToAdd = document.createElement('li');
    itemToAdd.innerHTML = `${capitalizeFirstLetter(item.name)}`;
    return itemToAdd;
}
