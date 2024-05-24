/**
 * Fetches the cost of a recipe for one serving using its id.
 * 
 * @param {number} recipeId, the id of the recipe to fetch the cost.
 * @returns {number} The cost of the recipe for one serving in dollars and cents format.
 */
async function fetchRecipeCost(recipeId) {
    try {
        // Send a POST request to the '/recipeCost' route to calculate the recipe cost
        const response = await fetch('/recipeCost', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ recipeId: recipeId })
        });

        // Parse the JSON response
        const result = await response.json();

        // Calculate the cost in dollars and cents; fixed to two decimal places
        const cost = (result.totalCost / 100).toFixed(2);

        // Return the calculated cost
        return cost;
    } catch (err) {
        // Handle errors
        console.error(err, 'Could not fetch recipe cost');
        return ''; // Return an empty string if an error occurs
    }
}
