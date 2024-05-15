// Spoonacular
const key = 'd2f9861e57d94faaac601530b94f8853'; //process.env.API_KEY;
async function ingredientSearch(ingredientName, userSortSelection) {
    var query = ingredientName; 
    var sortOption = "alphabetical";

    // for some reason certain sorting options don't work, afaik, only calories and energy work
    if (!(userSortSelection === "calories") || !(userSortSelection === "energy")) {
        sortOption = "calories";
    }
    var number = 999;
    const requestUrl = `https://api.spoonacular.com/food/ingredients/search?apiKey=${key}&query=${query}&number=${number}&sort=${sortOption}&sortDirection=desc`;
    try {
        const results = await axios.get(requestUrl);
        // if (!(userSortSelection === "calories") || !(userSortSelection === "energy")) {
        //     if (userSortSelection === "alphabetical") {

        //     }
        // }
        return results.data.results;
    } catch (err) {
        var searchDiv = document.getElementById("search-results");
        var errorMessage = document.createElement("span")
        errorMessage.innerHTML += "Could not connect to spoonacular";
        searchDiv.appendChild(errorMessage);
        return null;
    }
    // write sorting
}

var fridge = {
    "food": [
        {
            "id":  19400,
            "name": "banana chips"
        },
        {
            "id": 10011677,
            "name": "banana shallot" 
        },
    ]
};

function sortIngredients(ingredients) {

    return;
}

document.addEventListener('DOMContentLoaded', () => { 
    document.getElementById('search-button').addEventListener('click', async () => {
        var sorting = document.getElementsByClassName("sort");
        var sortingOptions = [].slice.call(sorting);
        var sortSelection = "calories"; //default value
        for (i = 0; i < sortingOptions.length; i++) {
            console.log(sortingOptions[i]);
            if (sortingOptions[i].checked) {
                sortSelection = sortingOptions[i].value;
            }
        }
        console.log(sortSelection);

        var ingredientToLookUp = document.getElementById('search-item');
        if (!ingredientToLookUp) {
            console.log('cannot find input field');
            return;
        } else if (!ingredientToLookUp.value) {
            console.log('input field empty');
            return;
        }
        console.log(ingredientToLookUp.value);
        const results = await ingredientSearch(ingredientToLookUp.value, sortSelection);
        if (!results) {
            
            return;
        }
        if (results.length < 1) {
            console.log(`'${ingredientToLookUp.value}' could not be found.`);
        }
        results.forEach(element => {
            var list = document.getElementById("search-results-list");
            var item = document.createElement("li");
            item.innerHTML = element.name + ", " + element.id;
            item.classList.add("ingredient");
            item.setAttribute('data-id', element.id);
            item.setAttribute('data-name', element.name);
            item.onmousedown = () => {
                let itemToAdd = { 
                    "id": item.getAttribute('data-id'),
                    "name": item.getAttribute('data-name')
                }
                fridge.food.push(itemToAdd);
                fridge.food.forEach(i => {
                    console.log(i.id + ", " + i.name);
                }) 
            };
            list.appendChild(item);
            console.log(element.name + ", " + element.id); 
        });
    });
});

// // for recipes
// const cuisines = [
//     "African",
//     "Asian",
//     "American",
//     "British",
//     "Cajun",
//     "Caribbean",
//     "Chinese",
//     "Eastern European",
//     "European",
//     "French",
//     "German",
//     "Greek",
//     "Indian",
//     "Irish",
//     "Italian",
//     "Japanese",
//     "Jewish",
//     "Korean",
//     "Latin American",
//     "Mediterranean",
//     "Mexican",
//     "Middle Eastern",
//     "Nordic",
//     "Southern",
//     "Spanish",
//     "Thai",
//     "Vietnamese"
// ];
