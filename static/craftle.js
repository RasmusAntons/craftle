let recipes;
let targetRecipe;
let ingredients;

function initRandom() {
	targetRecipe = recipes[Math.floor(Math.random() * recipes.length)];
}

function initIngredients() {
	let ingredientsDiv = document.getElementById('ingredients');
	while (ingredients.firstChild)
		ingredients.removeChild(ingredients.firstChild);
	for (let ingredient of ingredients) {
		let ingredientDiv = document.createElement('div');
		let ingredientId = ingredient.replace(':', '/');
		ingredientDiv.classList.add('ingredient');
		ingredientDiv.style.backgroundImage = `url("/img/${ingredientId}.png")`;
		ingredientsDiv.appendChild(ingredientDiv);
	}
}

document.addEventListener('DOMContentLoaded', () => {
	fetch('recipes.json').then(r => r.json()).then(r => {
		recipes = r.filter(e => ['minecraft:crafting_shaped', 'minecraft:crafting_shapeless'].includes(e.type));
		console.log(recipes);
		ingredients = new Set();
		for (let recipe of recipes) {
			let recipeIngredients;
			if (recipe.type === 'minecraft:crafting_shaped')
				recipeIngredients = Object.entries(recipe.key).map(([key, ingredient]) => ingredient);
			else
				recipeIngredients = recipe.ingredients;
			for (let ingredient of recipeIngredients) {
				if (Array.isArray(ingredient)) {
					for (let ingredientChoice of ingredient) {
						ingredients.add(ingredientChoice.tag || ingredientChoice.item);
					}
				} else {
					ingredients.add(ingredient.tag || ingredient.item);
				}
			}
		}
		ingredients = Array.from(ingredients).sort();
		initIngredients();
		document.getElementById('start-random').addEventListener('click', initRandom);
	});
});
