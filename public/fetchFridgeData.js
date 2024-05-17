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


async function displayFridgeContents() {
    try {
        const user = await fetchFridge();
        const results = user.fridge;
        const fridgeList = document.getElementById('fridge-contents');
        // Clear contents, in case something was leftover
        fridgeList.innerHTML = '';
        results.forEach(element => {
            let fridgeItem = document.createElement('li');
            fridgeItem.textContent = `${element.name}, ${element.id}`;
            fridgeList.appendChild(fridgeItem);
        });
    } catch (error) {
        console.error("Error displaying fridge contents:", error);
    }
}

// Display user's fridge contents when they launch the page
displayFridgeContents();