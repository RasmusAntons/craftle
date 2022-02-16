let recipes;
let targetRecipe;
let ingredients;
let selectedIngredient = null;
let craftingInputs;
let craftingOutput;

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
		ingredientDiv.addEventListener('click', () => {
			selectedIngredient = ingredient;
		});
	}
}

function initCraftingTable() {
	craftingInputs = new Array(9).fill(null);
	craftingOutput = null;
	for (let [i, ingredientInput] of Object.entries(document.querySelectorAll('#crafting-input .ingredient'))) {
		ingredientInput.addEventListener('click', () => {
			craftingInputs[i] = selectedIngredient;
			if (selectedIngredient) {
				let ingredientId = selectedIngredient.replace(':', '/');
				ingredientInput.style.backgroundImage = `url("/img/${ingredientId}.png")`;
			} else {
				ingredientInput.style.backgroundImage = '';
			}
			selectedIngredient = null;
			updateCraftingOutput();
		});
	}
}

function updateCraftingOutput() {
	const craftingOutputDiv = document.getElementById('crafting-output');
	for (let recipe of recipes) {
		if (checkExactRecipe(recipe)) {
			craftingOutput = recipe.result.item;
			let ingredientId = craftingOutput.replace(':', '/');
			craftingOutputDiv.style.backgroundImage = `url("/img/${ingredientId}.png")`;
			return;
		}
	}
	craftingOutput = null;
	craftingOutputDiv.style.backgroundImage = '';
}

function checkExactRecipe(recipe) {
	if (recipe.type === 'minecraft:crafting_shapeless') {
		const remainingInputs = [...craftingInputs];
		for (let recipeIngredient of recipe.ingredients) {
			if (Array.isArray(recipeIngredient)) {
				let found = false;
				for (let ingredientChoice of recipeIngredient) {
					if (remainingInputs.includes(ingredientChoice.tag || ingredientChoice.item)) {
						remainingInputs[remainingInputs.indexOf(ingredientChoice.tag || ingredientChoice.item)] = null;
						found = true;
						break;
					}
				}
				if (!found)
					return false;
			} else {
				if (remainingInputs.includes(recipeIngredient.tag || recipeIngredient.item)) {
					remainingInputs[remainingInputs.indexOf(recipeIngredient.tag || recipeIngredient.item)] = null;
				} else {
					return false;
				}
			}
		}
		for (let remainingInput of remainingInputs)
			if (remainingInput !== null)
				return false;
		return true;
	}
	return false;
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
		initCraftingTable();
		document.getElementById('start-random').addEventListener('click', initRandom);
	});
});
