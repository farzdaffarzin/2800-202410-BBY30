document.addEventListener("DOMContentLoaded", function() {
    const ingredients = [
        "1 cup of flour",
        "2 eggs",
        "1/2 cup of sugar",
        "1/4 cup of butter",
        "1 tsp of vanilla extract"
    ];

    const ingredientsList = document.getElementById('ingredients-list');

    ingredients.forEach(ingredient => {
        const listItem = document.createElement('li');

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
        label.textContent = ingredient;

        listItem.appendChild(checkbox);
        listItem.appendChild(label);
        ingredientsList.appendChild(listItem);
    });
});