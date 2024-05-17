async function fetchFridge() {
    try {
        const response = await fetch('/getUserFridge', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            throw new Error('Failed to fetch fridge data: ' + response.status);
        }

        const fridge = await response.json();
        return fridge;
    } catch (err) {
        console.error("Error fetching fridge data:", err);
        return []; // Return empty array if there's an error
    }
}

async function storePresetInFridge(data) {
    var dataToStore = {
        ingredients: data
    }
    try {
        const fridgeResponse = await fetch('/insertIntoFridge', {
            method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToStore)
        });
        if (!fridgeResponse.ok) {
            throw new Error('Failed to insert item into fridge');
        }
    } catch (err) {
        console.error("Error updating fridge:", err);
    }
}

async function loadPresetFridge() {
    try {
        const response = await fetch('fridgePreset.json');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();

        const fridgeList = document.getElementById('fridge-contents');
        fridgeList.innerHTML = '';
        data.forEach(element => {
            let fridgeItem = document.createElement('li');
            fridgeItem.textContent = `${capitalizeFirstLetter(element.name)}`;
            fridgeList.appendChild(fridgeItem);
        });
        storePresetInFridge(data);

      } catch (err) {
        console.error('There was a problem fetching fridgePreset.json:', err);
      }
}

async function displayFridgeContents() {
    try {
        const user = await fetchFridge();
        const results = user.fridge;
        const fridgeList = document.getElementById('fridge-contents');
        // Displays message if user's fridge is empty
        if (results.length < 1) {
            fridgeList.innerHTML = '';
            let fridgeItem = document.createElement('li');
            fridgeItem.id = 'empty-message';
            fridgeItem.textContent = `Your fridge is empty!`;
            fridgeList.appendChild(fridgeItem);
            return;
        }
        
        // Clear contents, in case something was leftover
        fridgeList.innerHTML = '';
        results.forEach(element => {
            let fridgeItem = document.createElement('li');
            fridgeItem.textContent = `${capitalizeFirstLetter(element.name)}`;
            fridgeList.appendChild(fridgeItem);
        });
    } catch (error) {
        console.error("Error displaying fridge contents:", error);
    }
}

// Display user's fridge contents when they launch the page
displayFridgeContents();

function capitalizeFirstLetter(str) {
    if (!str) {
        return "";
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}
