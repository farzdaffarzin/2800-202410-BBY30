const spoonacular_key = 'd2f9861e57d94faaac601530b94f8853';
async function ingredientSearch(ingredientName, userSortSelection) {
    var query = ingredientName; 
    var sortOption = "alphabetical";

    // for some reason certain sorting options don't work, afaik, only calories and energy work
    if (!(userSortSelection === "calories") || !(userSortSelection === "energy")) {
        sortOption = "calories";
    }
    var number = 999;
    const requestUrl = `https://api.spoonacular.com/food/ingredients/search?apiKey=${spoonacular_key}&query=${query}&number=${number}&sort=${sortOption}&sortDirection=desc`;
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
        errorMessage.innerHTML = "Could not connect to Spoonacular";
        searchDiv.appendChild(errorMessage);
        return null;
    }
    // write sorting
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