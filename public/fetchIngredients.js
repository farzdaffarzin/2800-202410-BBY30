async function fetchIngredients() {
    const searchInput = document.getElementById('search-item').value;
    const sortingOption = document.querySelector('#search-options select').value;

    const formattedSearch = {
        ingredient: searchInput,
        sorting: sortingOption
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

    if (results.length < 1) {
        let foundIngredient = document.createElement('li');
        foundIngredient.innerHTML = "No ingredients found.";
        ingredientList.appendChild(foundIngredient);
    }

    results.forEach(element => {
        let foundIngredient = document.createElement('li');
        foundIngredient.innerHTML = `${capitalizeFirstLetter(element.name)}`;

        foundIngredient.addEventListener('click', async () => {
            const ingredients = {
                "id": element.id,
                "name": element.name,
                "quantity": 1,
                "unit": element.unit
            };
            document.getElementById('modal').style.display = 'block';
            setTimeout(() => {
                document.getElementById('modal').classList.add('fade-out');
                
                setTimeout(() => {
                    document.getElementById('modal').style.display = 'none';
                    document.getElementById('modal').classList.remove('fade-out');
                }, 1500);
            }, 1000);

            try {
                const response = await fetch('/insertIntoFridge', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ingredients }),
                });

                if (!response.ok) {
                    throw new Error('Failed to insert item into fridge');
                }
                const existsId = await response.json();
                console.log(existsId.exists);
                if (existsId.exists) {
                    const listItem = document.getElementById(existsId.exists);
                    console.log(listItem);
                    if (listItem) {
                        const currentText = listItem.textContent;
                        const regex = /(\d+)/; 
                        const currentQuantity = parseInt(currentText.match(regex)[0]); 
                        const newQuantity = currentQuantity + 1; 
                        listItem.textContent = currentText.replace(regex, newQuantity);
                    }
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
    itemToAdd.innerHTML = `${capitalizeFirstLetter(item.name)}, ${item.quantity}`;
    itemToAdd.id = item.id;
    return itemToAdd;
}

function reverseList() {
    const ingredientList = document.getElementById('search-results-list');
    const items = Array.from(ingredientList.children);
    ingredientList.innerHTML = ''; 

    items.reverse().forEach(item => {
        ingredientList.appendChild(item);
    });
}
