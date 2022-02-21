let recipes;
let tags;
let items;
let targetItem;
let targetRecipes;
let ingredients;
let craftableItems;
let selectedIngredient = null;
let craftingInputs;
let craftingOutput;
let attempts;
let cursorItemDiv;
const MAX_ATTEMPTS = 36;

function mulberry32(a) {
	return function() {
		let t = a += 0x6D2B79F5;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	}
}

function initDaily() {
	const today = new Date();
	const dayNumber = (today.getFullYear() - 2000) * 365 + today.getMonth() * 12 + (today.getDate() - 1);
	const rng = mulberry32(dayNumber);
	targetItem = craftableItems[Math.floor(rng() * craftableItems.length)];
	targetRecipes = recipes.filter(r => r.getPossibleResults().includes(targetItem));
}

function initRandom() {
	targetItem = craftableItems[Math.floor(Math.random() * craftableItems.length)];
	targetRecipes = recipes.filter(r => r.getPossibleResults().includes(targetItem));
}

function initIngredients() {
	let ingredientsDiv = document.getElementById('ingredients');
	while (ingredients.firstChild)
		ingredients.removeChild(ingredients.firstChild);
	for (let ingredient of ingredients) {
		let ingredientDiv = document.createElement('div');
		ingredientDiv.classList.add('ingredient');
		setIngredientIcon(ingredientDiv, ingredient);
		ingredientDiv.dataset.id = ingredient;
		ingredientDiv.dataset.name = items[ingredient].name;
		ingredientsDiv.appendChild(ingredientDiv);
		ingredientDiv.addEventListener('mousedown', e => {
			if (e.button !== 0)
				return;
			selectedIngredient = ingredient;
			setIngredientIcon(cursorItemDiv, ingredient);
			cursorItemDiv.style.left = `${e.clientX - 24}px`;
			cursorItemDiv.style.top = `${e.clientY - 24}px`;
		});
	}
	const searchInput = document.querySelector('#search input')
	searchInput.value = '';
	searchInput.oninput = e => {
		for (let ingredientDiv of document.querySelectorAll('#ingredients .ingredient')) {
			const hide = (e.target.value && !ingredientDiv.dataset.name.toLowerCase().includes(e.target.value.toLowerCase()));
			ingredientDiv.style.display = hide ? 'none' : '';
		}
	};
}

function initCraftingTable() {
	craftingInputs = new Array(9).fill(null);
	craftingOutput = null;
	attempts = 0;
	for (let [i, ingredientInput] of Object.entries(document.querySelectorAll('#crafting-input .ingredient'))) {
		ingredientInput.addEventListener('mousedown', e => {
			if (e.button !== 0)
				return;
			const previousIngredient = craftingInputs[i];
			craftingInputs[i] = selectedIngredient;
			setIngredientIcon(ingredientInput, selectedIngredient);
			selectedIngredient = previousIngredient;
			cursorItemDiv.style.left = `${e.clientX - 24}px`;
			cursorItemDiv.style.top = `${e.clientY - 24}px`;
			setIngredientIcon(cursorItemDiv, selectedIngredient);
			updateCraftingOutput();
		});
	}
	const craftingOutputDiv = document.getElementById('crafting-output');
	craftingOutputDiv.addEventListener('mousedown', e => {
		if (e.button !== 0)
				return;
		if (craftingOutput !== null) {
			const inventoryDiv = document.querySelectorAll('.invslot .ingredient')[attempts];
			setIngredientIcon(inventoryDiv, craftingOutput);
			handleCraftingAttempt();
		}
	});
}

function setIngredientIcon(ingredientDiv, itemId) {
	if (!itemId) {
		ingredientDiv.style.backgroundImage = '';
		ingredientDiv.title = '';
		return;
	}
	if (!items[itemId]) {
		console.warn(`missing item definition for ${itemId}`)
		return;
	}
	const itemIcon = items[itemId]['icon'];
	if (itemIcon)
		ingredientDiv.style.backgroundImage = 'url(' + items[itemId]['icon'] + ')';
	else
		ingredientDiv.style.backgroundImage = '';
	ingredientDiv.title = items[itemId]['name'];
}

function handleCraftingAttempt() {
	++attempts;
	if (targetRecipes.some(r => r.getResult() === targetItem)) {
		alert('success');
	} else if (attempts === MAX_ATTEMPTS) {
		alert('fail');
	} else {
		const craftingFeedback = Recipe.getCraftingFeedback();
		for (let [i, craftSlot] of Object.entries(document.querySelectorAll('#crafting-input .craftslot'))) {
			craftSlot.style.backgroundColor = craftingFeedback[i] ? craftingFeedback[i] : '';
		}
	}
}

function updateCraftingOutput() {
	const craftingOutputDiv = document.getElementById('crafting-output');
	for (let recipe of recipes) {
		const resultItem = recipe.getResult();
		if (resultItem) {
			craftingOutput = resultItem;
			setIngredientIcon(craftingOutputDiv, craftingOutput);
			return;
		}
	}
	craftingOutput = null;
	setIngredientIcon(craftingOutputDiv, null);
}

document.addEventListener('DOMContentLoaded', () => {
	const fetchRecipes = fetch('recipes.json').then(r => r.json()).then(rs => {
		recipes = rs.map(r => Recipe.fromJSON(r));
	});
	const fetchTags = fetch('tags.json').then(r => r.json()).then(r => tags = r);
	const fetchItems = fetch('items.json').then(r => r.json()).then(r => items = r);
	Promise.all([fetchRecipes, fetchTags, fetchItems]).then(() => {
		ingredients = new Set();
		craftableItems = new Set();
		for (let recipe of recipes) {
			for (let ingredient of recipe.getIngredients())
				ingredients.add(ingredient);
			for (let craftableItem of recipe.getPossibleResults()) {
				ingredients.add(craftableItem); // TODO: remove, just for testing
				craftableItems.add(craftableItem);
			}
		}
		ingredients = Array.from(ingredients).sort();
		craftableItems = Array.from(craftableItems).sort();
		initIngredients();
		initCraftingTable();
		initDaily();
		document.getElementById('start-random').addEventListener('click', initRandom);
	});
	cursorItemDiv = document.getElementById('cursor-item');
	document.addEventListener('mousemove', e => {
		if (selectedIngredient) {
			cursorItemDiv.style.left = `${e.clientX - 24}px`;
			cursorItemDiv.style.top = `${e.clientY - 24}px`;
		}
	});
	document.addEventListener('mousedown', e => {
		if (e.button !== 0)
			return;
		if (e.target === document.body || e.target.id === 'ingredients') {
			selectedIngredient = null;
			setIngredientIcon(cursorItemDiv, selectedIngredient);
		}
	});
});
