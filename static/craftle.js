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
let craftingOutputCount;
let attempts;
let cursorItemDiv;
let loadingProgress = 0;
let craftleNumber;
let isGameActive = false;
const MAX_ATTEMPTS = 36;

function mulberry32(a) {
	return function() {
		let t = a += 0x6D2B79F5;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	}
}

function resetGame() {
	attempts = 0;
	craftingInputs = new Array(9).fill(null);
	setIngredientIcon(cursorItemDiv, null);
	for (let ingredientInput of document.querySelectorAll('#crafting-input .ingredient'))
		setIngredientIcon(ingredientInput, null);
	updateCraftingOutput();
	for (let inventoryIngredient of document.querySelectorAll('.invslot .ingredient'))
		setIngredientIcon(inventoryIngredient, null);
	const attemptsDiv = document.getElementById('attempts');
	while (attemptsDiv.firstChild)
		attemptsDiv.removeChild(attemptsDiv.firstChild);
}


function initDaily() {
	resetGame();
	const today = new Date();
	const dayZero = new Date(2022, 2, 1);
	const timeSince = (today - dayZero) + ((dayZero.getTimezoneOffset() - today.getTimezoneOffset()) * 60 * 1000);
	craftleNumber = Math.floor(timeSince / (1000 * 60 * 60 * 24));
	document.getElementById('count').textContent = `#${craftleNumber}`;
	const lastGame = JSON.parse(localStorage.getItem('last-daily'));
	const dayNumber = (today.getFullYear() - 2000) * 365 + today.getMonth() * 12 + (today.getDate() - 1);
	const rng = mulberry32(dayNumber);
	targetItem = craftableItems[Math.floor(rng() * craftableItems.length)];
	targetRecipes = recipes.filter(r => r.getPossibleResults().includes(targetItem));
	if (lastGame && lastGame.craftleNumber === craftleNumber) {
		loadStats();
		const rulesPopupContainer = document.getElementById('stats-popup-container');
		rulesPopupContainer.style.opacity = '1';
		rulesPopupContainer.style.pointerEvents = 'all';
		isGameActive = false;
	} else {
		isGameActive = true;
	}
}

function initRandom() {
	resetGame();
	craftleNumber = null;
	document.getElementById('count').textContent = `random`;
	targetItem = craftableItems[Math.floor(Math.random() * craftableItems.length)];
	targetRecipes = recipes.filter(r => r.getPossibleResults().includes(targetItem));
	isGameActive = true;
}

function initIngredients() {
	let ingredientsDiv = document.getElementById('ingredients');
	while (ingredients.firstChild)
		ingredients.removeChild(ingredients.firstChild);
	for (let ingredient of ingredients) {
		let ingredientDiv = document.createElement('div');
		ingredientDiv.classList.add('ingredient');
		const ingredientStack = document.createElement('div');
		ingredientStack.classList.add('stack');
		ingredientDiv.appendChild(ingredientStack);
		setIngredientIcon(ingredientDiv, ingredient);
		ingredientDiv.dataset.id = ingredient;
		ingredientDiv.dataset.name = items[ingredient].name;
		ingredientsDiv.appendChild(ingredientDiv);
		ingredientDiv.addEventListener('mousedown', e => {
			const shift = e.getModifierState('Shift');
			if (selectedIngredient === null && (e.button === 0 || e.button === 2)) {
				selectedIngredient = ingredient;
				setIngredientIcon(cursorItemDiv, ingredient, shift ? items[ingredient].stack : 1);
				cursorItemDiv.style.left = `${e.clientX - 24}px`;
				cursorItemDiv.style.top = `${e.clientY - 24}px`;
			} else if (e.button === 0) {
				if (selectedIngredient === ingredient) {
					incrementStack(cursorItemDiv, items[ingredient].stack, shift ? items[ingredient].stack : 1);
				} else {
					selectedIngredient = null;
					setIngredientIcon(cursorItemDiv, selectedIngredient);
				}
			} else if (e.button === 2) {
				if (decrementStack(cursorItemDiv) === 0)
					selectedIngredient = null;
			}
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
			if (e.button !== 0 && e.button !== 2)
				return;
			if (selectedIngredient === null && craftingInputs[i] === null)
				return;
			const previousIngredient = craftingInputs[i];
			const previousStack = ingredientInput.firstChild.textContent;
			const previousStackN = Number(previousStack || 1);
			const cursorStackN = Number(cursorItemDiv.firstChild.textContent || 1);
			if (e.button === 0 && e.getModifierState('Shift')) { // drop ingredient
				craftingInputs[i] = null;
				setIngredientIcon(ingredientInput, null);
			} else if (selectedIngredient) {
				if (selectedIngredient === craftingInputs[i]) { // merge stacks
					let transferSize = Math.min((e.button === 0) ? cursorStackN : 1, items[previousIngredient].stack - previousStackN);
					incrementStack(ingredientInput, items[previousIngredient].stack, transferSize);
					if (decrementStack(cursorItemDiv, transferSize) === 0)
						selectedIngredient = null;
				} else if (e.button === 0 || previousIngredient) { // swap stacks
					craftingInputs[i] = selectedIngredient;
					setIngredientIcon(ingredientInput, selectedIngredient);
					ingredientInput.firstChild.textContent = cursorItemDiv.firstChild.textContent;
					selectedIngredient = previousIngredient;
					setIngredientIcon(cursorItemDiv, selectedIngredient);
					cursorItemDiv.firstChild.textContent = previousStack;
				} else { // drop one item
					craftingInputs[i] = selectedIngredient;
					setIngredientIcon(ingredientInput, selectedIngredient);
					if (decrementStack(cursorItemDiv, 1) === 0)
						selectedIngredient = null;
				}
			} else {
				 if (e.button === 0) { // pick up entire stack
					craftingInputs[i] = null;
					setIngredientIcon(ingredientInput, null);
					selectedIngredient = previousIngredient;
					setIngredientIcon(cursorItemDiv, selectedIngredient);
					cursorItemDiv.firstChild.textContent = previousStack;
				} else { // pick up half stack
					const transferSize = Math.ceil(previousStackN / 2);
					if (decrementStack(ingredientInput, transferSize) === 0)
						craftingInputs[i] = null;
					selectedIngredient = previousIngredient;
					setIngredientIcon(cursorItemDiv, previousIngredient, transferSize);
				}
				cursorItemDiv.style.left = `${e.clientX - 24}px`;
				cursorItemDiv.style.top = `${e.clientY - 24}px`;
			}
			updateCraftingOutput();
		});
	}
	const craftingOutputDiv = document.getElementById('crafting-output');
	craftingOutputDiv.addEventListener('mousedown', e => {
		if (e.button !== 0)
				return;
		if (craftingOutput !== null) {
			handleCraftingAttempt();
		}
	});
}

function setIngredientIcon(ingredientDiv, itemId, stack) {
	ingredientDiv.firstChild.textContent = (stack > 1) ? stack.toString() : '';
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

function incrementStack(ingredientDiv, maxStack, amount) {
	if (amount === undefined)
		amount = 1;
	const newStack = Math.min(Number(ingredientDiv.firstChild.textContent || 1) + amount, maxStack);
	ingredientDiv.firstChild.textContent = (newStack > 1) ? newStack.toString() : '';
}

function decrementStack(ingredientDiv, amount) {
	if (amount === undefined)
		amount = 1;
	const newStack = Math.max(Number(ingredientDiv.firstChild.textContent || 1) - amount, 0);
	if (newStack > 0) {
		ingredientDiv.firstChild.textContent = (newStack > 1) ? newStack.toString() : '';
	} else {
		setIngredientIcon(ingredientDiv, null);
	}
	return newStack;
}

function loadStats(lastGame, dailyStats) {
	if (!lastGame)
		lastGame = JSON.parse(localStorage.getItem('last-daily'));
	let attemptsStr;
	if (lastGame) {
		const lastCraftleNumber = (lastGame.craftleNumber === null) ? 'random' : `#${lastGame.craftleNumber}`;
		document.getElementById('stats-number').textContent = lastCraftleNumber;
		setIngredientIcon(document.getElementById('stats-target'), lastGame.targetItem);
		const lastAttempts = (lastGame.attempts === null) ? 'X' : lastGame.attempts;
		attemptsStr = `${lastAttempts}/${MAX_ATTEMPTS}`;
		document.getElementById('stats-attempts').textContent = attemptsStr;
	}
	if (!dailyStats)
		dailyStats = JSON.parse(localStorage.getItem('daily-stats'));
	if (dailyStats) {
		document.getElementById('stats-played').textContent = dailyStats.played;
		document.getElementById('stats-solved').textContent = dailyStats.solved;
		document.getElementById('stats-average').textContent = dailyStats.average.toFixed(2);
	}
	const statsCopy = document.getElementById('stats-copy');
	console.log(lastGame);
	if (lastGame && lastGame.craftleNumber !== null) {
		statsCopy.style.display = 'block';
		statsCopy.onclick = () => {
			const shareText = `Craftle #${lastGame.craftleNumber} ${attemptsStr}\nhttps://craftle.enigmatics.org`;
			navigator.clipboard.writeText(shareText).then(() => {
				statsCopy.firstElementChild.textContent = 'Copied';
				setTimeout(() => statsCopy.firstElementChild.textContent = 'Copy', 2500);
			});
		};
	} else {
		statsCopy.style.display = 'none';
	}
}

function updateStats(success, open) {
	const lastGame = {
		craftleNumber: craftleNumber,
		targetItem: targetItem,
		attempts: success ? attempts : null,
		possibleRecipes: targetRecipes
	};
	let dailyStats
	if (craftleNumber) {
		localStorage.setItem('last-daily', JSON.stringify(lastGame));
		dailyStats = JSON.parse(localStorage.getItem('daily-stats')) || {played: 0, solved: 0, average: 0};
		dailyStats.played += 1;
		if (success)
			dailyStats.solved += 1;
		dailyStats.average = dailyStats.average * ((dailyStats.played - 1) / dailyStats.played) + attempts / dailyStats.played;
		localStorage.setItem('daily-stats', JSON.stringify(dailyStats));
	}
	loadStats(lastGame, dailyStats);
	if (open) {
		const rulesPopupContainer = document.getElementById('stats-popup-container');
		rulesPopupContainer.style.opacity = '1';
		rulesPopupContainer.style.pointerEvents = 'all';
	}
}

function handleCraftingAttempt() {
	if (!isGameActive)
		return;
	const inventoryDiv = document.querySelectorAll('.invslot .ingredient')[attempts];
	setIngredientIcon(inventoryDiv, craftingOutput, craftingOutputCount);
	++attempts;
	if (targetRecipes.some(r => r.getResult() === targetItem)) {
		isGameActive = false;
		updateStats(true, true);
	} else if (attempts === MAX_ATTEMPTS) {
		isGameActive = false;
		updateStats(false, true);
		return;
	}
	const craftingFeedback = Recipe.getCraftingFeedback();
	const craftingAttemptTemplate = document.getElementById('crafting-attempt-template');
	const craftingAttemptDiv = craftingAttemptTemplate.content.cloneNode(true);
	for (let [i, craftSlot] of Object.entries(craftingAttemptDiv.querySelectorAll('.craftslot'))) {
		craftSlot.style.backgroundColor = craftingFeedback[i] ? craftingFeedback[i] : '';
		setIngredientIcon(craftSlot.firstChild, craftingInputs[i]);
	}
	for (let [i, ingredientInput] of Object.entries(document.querySelectorAll('#crafting-input .ingredient'))) {
		if (craftingInputs[i] !== null){
			if (decrementStack(ingredientInput) === 0)
				craftingInputs[i] = null;
		}
	}
	updateCraftingOutput();
	const craftingAttemptsDiv = document.getElementById('attempts');
	craftingAttemptsDiv.appendChild(craftingAttemptDiv);
	craftingAttemptsDiv.scrollTop = craftingAttemptsDiv.scrollHeight;
}

function updateCraftingOutput() {
	const craftingOutputDiv = document.getElementById('crafting-output');
	for (let recipe of recipes) {
		const resultItem = recipe.getResult();
		if (resultItem) {
			craftingOutput = resultItem;
			craftingOutputCount = recipe.getResultCount();
			setIngredientIcon(craftingOutputDiv, craftingOutput, craftingOutputCount);
			return;
		}
	}
	craftingOutput = null;
	setIngredientIcon(craftingOutputDiv, null);
}

function updateLoadingProgress(complete) {
	const loadingOverlay = document.getElementById('loading-overlay');
	const loadingProgressBox = document.getElementById('loading-progress-box');
	const loadingProgressBar = document.getElementById('loading-progress');
	if (complete) {
		loadingProgressBar.style.width = '100%';
		loadingProgressBox.style.opacity = '0';
		setTimeout(() => {
			loadingOverlay.style.opacity = '0';
			loadingOverlay.style.pointerEvents = 'none';
			if (!localStorage.getItem('shown-rules')) {
				const rulesPopupContainer = document.getElementById('rules-popup-container');
				rulesPopupContainer.style.opacity = '1';
				rulesPopupContainer.style.pointerEvents = 'all';
				localStorage.setItem('shown-rules', 'true');
			}
		}, 1000);
	} else {
		++loadingProgress;
		const width = 100 - (100 / Math.pow(2, loadingProgress));
		loadingProgressBar.style.width = `${width}%`;
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const fetchRecipes = fetch('recipes.json').then(r => r.json()).then(rs => {
		recipes = rs.map(r => Recipe.fromJSON(r));
	}).then(() => updateLoadingProgress());
	const fetchTags = fetch('tags.json').then(r => r.json()).then(r => tags = r).then(() => updateLoadingProgress());
	const fetchItems = fetch('items.json').then(r => r.json()).then(r => items = r).then(() => updateLoadingProgress());
	Promise.all([fetchRecipes, fetchTags, fetchItems]).then(() => {
		updateLoadingProgress(true);
		ingredients = new Set();
		craftableItems = new Set();
		for (let recipe of recipes) {
			for (let ingredient of recipe.getIngredients())
				ingredients.add(ingredient);
			for (let craftableItem of recipe.getPossibleResults()) {
				craftableItems.add(craftableItem);
			}
		}
		ingredients = Array.from(ingredients).sort();
		craftableItems = Array.from(craftableItems).sort();
		initIngredients();
		initCraftingTable();
		initDaily();
		loadStats();
		document.getElementById('start-random').addEventListener('click', initRandom);
		document.getElementById('start-daily').addEventListener('click', initDaily);
	});
	for (let popupName of ['rules', 'stats']) {
		document.getElementById(popupName).addEventListener('click', () => {
			const rulesPopupContainer = document.getElementById(`${popupName}-popup-container`);
			rulesPopupContainer.style.opacity = '1';
			rulesPopupContainer.style.pointerEvents = 'all';
		});
	}
	cursorItemDiv = document.getElementById('cursor-item');
	document.addEventListener('mousemove', e => {
		if (selectedIngredient) {
			cursorItemDiv.style.left = `${e.clientX - 24}px`;
			cursorItemDiv.style.top = `${e.clientY - 24}px`;
		}
	});
	document.addEventListener('mousedown', e => {
		if (e.target === document.body || e.target.id === 'ingredients') {
			if (e.button === 0) {
				selectedIngredient = null;
				setIngredientIcon(cursorItemDiv, selectedIngredient);
			} else if (e.button === 2) {
				if (decrementStack(cursorItemDiv) === 0)
					selectedIngredient = null;
			}
		} else if (e.button === 0 && e.target.classList.contains('popup-container')) {
			e.target.style.opacity = '0';
			e.target.style.pointerEvents = 'none';
		}
	});
	document.addEventListener('contextmenu', e => {
		const contextEnabled = ['searchbar'];
		if (!contextEnabled.includes(e.target.id))
			e.preventDefault();
	});
});
