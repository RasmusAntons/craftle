class Recipe {
	static expandIngredientChoices(ingredientChoices) {
		let res = [];
		if (!Array.isArray(ingredientChoices))
			ingredientChoices = [ingredientChoices];
		for (let ingredientChoice of ingredientChoices) {
			if (ingredientChoice.tag)
				res.push(...tags[ingredientChoice.tag.replace('minecraft:', '')].values);
			else
				res.push(ingredientChoice.item);
		}
		while (res.some(s => s.startsWith('#'))) {
			res = res.reduce((r, e) => {
				if (e.startsWith('#'))
					r.push(...tags[e.replace('#minecraft:', '')].values);
				else
					r.push(e);
				return r;
			}, []);
		}
		return res;
	}

	static getCraftingFeedback() {
		const scoredFeedbackOptions = [];
		for (let recipe of targetRecipes)
			scoredFeedbackOptions.push(recipe.score());
		scoredFeedbackOptions.sort((a, b) => a[0] < b[0]);
		return scoredFeedbackOptions[0][1];
	}

	static dyes = [
		'minecraft:red_dye', 'minecraft:green_dye', 'minecraft:purple_dye', 'minecraft:cyan_dye',
		'minecraft:light_gray_dye', 'minecraft:gray_dye', 'minecraft:pink_dye', 'minecraft:lime_dye',
		'minecraft:yellow_dye', 'minecraft:light_blue_dye',  'minecraft:magenta_dye', 'minecraft:orange_dye',
		'minecraft:blue_dye', 'minecraft:black_dye', 'minecraft:brown_dye', 'minecraft:white_dye'
	];

	static fromJSON(jsonData) {
		switch (jsonData.type) {
			case 'minecraft:crafting_shaped':
				return new ShapedRecipe(jsonData);
			case 'minecraft:crafting_shapeless':
				return new ShapelessRecipe(jsonData);
			case 'minecraft:crafting_special_firework_rocket':
				return new SpecialFireworkRocketRecipe();
			case 'minecraft:crafting_special_armordye':
				return new SpecialArmordyeRecipe();
			case 'minecraft:crafting_special_bannerduplicate':
				return new SpecialBannerduplicateRecipe();
			case 'minecraft:crafting_special_bookcloning':
				return new SpecialBookcloningRecipe();
			case 'minecraft:crafting_special_firework_star':
				return new SpecialFireworkStarRecipe();
			case 'minecraft:crafting_special_firework_star_fade':
				return new SpecialFireworkStarFadeRecipe();
			case 'minecraft:crafting_special_mapcloning':
				return new SpecialMapcloningRecipe();
			default:
				throw `Invalid crafting recipe type: ${jsonData.type}`;
		}
	}
}

class ShapedRecipe extends Recipe {
	constructor(data) {
		super();
		this.data = data;
	}

	getIngredients() {
		const res = new Set();
		for (let [key, ingredientChoices] of Object.entries(this.data.key)) {
			for (let ingredientChoice of Recipe.expandIngredientChoices(ingredientChoices))
				res.add(ingredientChoice);
		}
		return res;
	}

	getPossibleResults() {
		return [this.data.result.item];
	}

	getResult() {
		if (this.checkExact())
			return this.data.result.item;
		else
			return null;
	}

	getResultCount() {
		return this.data.result.count || 1;
	}

	flatPattern(rowOffset, colOffset) {
		const res = new Array(9).fill(null);
		for (let [rowNumber, row] of this.data.pattern.entries()) {
			for (let [colNumber, key] of row.split('').entries()) {
				res[(rowNumber + rowOffset) * 3 + colNumber + colOffset] = (key !== ' ') ? key : null;
			}
		}
		return res;
	}

	checkExact() {
		let nRows = this.data.pattern.length;
		let nCols = Math.max(...this.data.pattern.map(e => e.length));
		for (let rowOffset = 0; rowOffset < (4 - nRows); ++rowOffset) {
			for (let colOffset = 0; colOffset < (4 - nCols); ++colOffset) {
				let correct = true;
				const flatPattern = this.flatPattern(rowOffset, colOffset);
				for (let i = 0; i < 9; ++i) {
					if ((flatPattern[i] === null) !== (craftingInputs[i] === null)) {
						correct = false;
						break;
					}
					if (flatPattern[i] !== null) {
						let ingredientChoices = this.data.key[flatPattern[i]];
						if (!Recipe.expandIngredientChoices(ingredientChoices).includes(craftingInputs[i])) {
							correct = false;
							break;
						}
					}
				}
				if (correct)
					return true;
			}
		}
		return false;
	}

	// returns [score, colours]
	// where score = 100 * green + 10 * yellow - 3 * rowOffset - collOffset
	scoreAtOffset(rowOffset, colOffset) {
		let expectedIngredients = this.flatPattern(rowOffset, colOffset).map(e =>
			(e === null) ? null : Recipe.expandIngredientChoices(this.data.key[e]));
		let resultColours = new Array(9).fill(null);
		let score = -3 * rowOffset - colOffset;
		for (let [inputSlot, craftingInput] of craftingInputs.entries()) {
			const bothNull = craftingInput == null && expectedIngredients[inputSlot] == null;
			const compatible = expectedIngredients[inputSlot] !== null && expectedIngredients[inputSlot].includes(craftingInput);
			if (bothNull || compatible) {
				resultColours[inputSlot] = 'green';
				expectedIngredients[inputSlot] = undefined;
				score += 100;
			}
		}
		for (let [inputSlot, craftingInput] of craftingInputs.entries()) {
			if (resultColours[inputSlot] !== null)
				continue;
			let matchingIngredientIdx = -1;
			for (let [ingredientIdx, expectedIngredientChoices] of expectedIngredients.entries()) {
				if (expectedIngredientChoices === undefined)
					continue;
				const bothNull = craftingInput == null && expectedIngredientChoices == null;
				const compatible = expectedIngredientChoices !== null && expectedIngredientChoices.includes(craftingInput);
				if (bothNull || compatible) {
					matchingIngredientIdx = ingredientIdx;
					break;
				}
			}
			if (matchingIngredientIdx >= 0) {
				resultColours[inputSlot] = 'yellow';
				expectedIngredients[matchingIngredientIdx] = undefined;
				score += 10;
			}
		}
		return [score, resultColours];
	}

	// returns the best scoreAtOffset for all possible offsets
	score() {
		const scoredFeedbackOptions = [];
		let nRows = this.data.pattern.length;
		let nCols = Math.max(...this.data.pattern.map(e => e.length));
		for (let rowOffset = 0; rowOffset < (4 - nRows); ++rowOffset) {
			for (let colOffset = 0; colOffset < (4 - nCols); ++colOffset) {
				scoredFeedbackOptions.push(this.scoreAtOffset(rowOffset, colOffset));
			}
		}
		scoredFeedbackOptions.sort((a, b) => a[0] < b[0]);
		return scoredFeedbackOptions[0];
	}
}

class ShapelessRecipe extends Recipe {
	constructor(data) {
		super();
		this.data = data;
	}

	getIngredients() {
		const res = new Set();
		for (let ingredientChoices of this.data.ingredients) {
			for (let ingredientChoice of Recipe.expandIngredientChoices(ingredientChoices))
				res.add(ingredientChoice);
		}
		return res;
	}

	getPossibleResults() {
		return [this.data.result.item];
	}

	getResult() {
		if (this.checkExact())
			return this.data.result.item;
		else
			return null;
	}

	getResultCount() {
		return this.data.result.count || 1;
	}

	checkExact() {
		const remainingInputs = [...craftingInputs];
		for (let ingredientChoices of this.data.ingredients) {
			let found = false;
			for (let ingredientChoice of Recipe.expandIngredientChoices(ingredientChoices)) {
				if (remainingInputs.includes(ingredientChoice)) {
					remainingInputs[remainingInputs.indexOf(ingredientChoice)] = null;
					found = true;
					break;
				}
			}
			if (!found)
				return false;
		}
		for (let remainingInput of remainingInputs)
			if (remainingInput !== null)
				return false;
		return true;
	}

	// returns [score, colours]
	// where score = 100 * green
	score() {
		let expectedIngredients = new Array(9).fill(null);
		let resultColours = new Array(9).fill(null);
		let score = 0;
		for (let [i, expectedIngredientChoices] of this.data.ingredients.entries())
			expectedIngredients[i] = Recipe.expandIngredientChoices(expectedIngredientChoices);
		for (let [inputSlot, craftingInput] of craftingInputs.entries()) {
			let matchingIngredientIdx = -1;
			for (let [ingredientIdx, expectedIngredientChoices] of expectedIngredients.entries()) {
				const bothNull = craftingInput == null && expectedIngredientChoices == null;
				const compatible = expectedIngredientChoices !== null && expectedIngredientChoices.includes(craftingInput);
				if (bothNull || compatible) {
					matchingIngredientIdx = ingredientIdx;
					break;
				}
			}
			if (matchingIngredientIdx >= 0) {
				resultColours[inputSlot] = 'green';
				expectedIngredients.splice(matchingIngredientIdx, 1);
				score += 100;
			}
		}
		return [score, resultColours];
	}
}

class SpecialFireworkRocketRecipe extends ShapelessRecipe {
	constructor() {
		super({ingredients: null});
	}

	getIngredients() {
		return new Set(['minecraft:paper', 'minecraft:gunpowder', 'minecraft:firework_star']);
	}

	getPossibleResults() {
		return ['minecraft:firework_rocket'];
	}

	getResult() {
		if (this.checkExact())
			return 'minecraft:firework_rocket';
		else
			return null;
	}

	getResultCount() {
		return 3;
	}

	checkExact() {
		let paper = 0;
		let gunpowder = 0;
		let fireworkStar = 0;
		for (let craftingInput of craftingInputs) {
			switch (craftingInput) {
				case 'minecraft:paper':
					++paper;
					break;
				case 'minecraft:gunpowder':
					++gunpowder
					break;
				case 'minecraft:firework_star':
					++fireworkStar;
					break
				case null:
					continue;
				default:
					return false;
			}
		}
		return (paper === 1 && 0 < gunpowder && gunpowder < 4 && 1 < gunpowder + fireworkStar)
	}

	score() {
		let gunpowder = Math.min(3, Math.max(1, craftingInputs.filter(e => e ==='minecraft:gunpowder').length));
		let fireworkStars = Math.min(7, craftingInputs.filter(e => e ==='minecraft:firework_star').length);
		this.data.ingredients = [{item: 'minecraft:paper'}];
		this.data.ingredients.push(...(new Array(gunpowder).fill({item: 'minecraft:gunpowder'})));
		this.data.ingredients.push(...(new Array(fireworkStars).fill({item: 'minecraft:firework_star'})));
		return super.score();
	}
}

class SpecialArmordyeRecipe extends ShapelessRecipe {
	constructor() {
		super({ingredients: null});
	}

	static leatherArmor = ['minecraft:leather_helmet', 'minecraft:leather_chestplate', 'minecraft:leather_leggings',
			'minecraft:leather_boots', 'minecraft:leather_horse_armor'];

	getIngredients() {
		return new Set(Recipe.dyes.concat(SpecialArmordyeRecipe.leatherArmor));
	}

	getPossibleResults() {
		return SpecialArmordyeRecipe.leatherArmor;
	}

	getResult() {
		if (this.checkExact())
			return SpecialArmordyeRecipe.leatherArmor.find(item => craftingInputs.includes(item));
		else
			return null;
	}

	getResultCount() {
		return 1;
	}

	checkExact() {
		let dyedItem = null;
		let dyes = 0;
		for (let craftingInput of craftingInputs) {
			if (SpecialArmordyeRecipe.leatherArmor.includes(craftingInput) && dyedItem === null) {
				dyedItem = craftingInput;
			} else if (Recipe.dyes.includes(craftingInput)) {
				++dyes;
			} else if (craftingInput !== null) {
				return false;
			}
		}
		return (dyedItem !== null && dyes > 0);
	}

	score() {
		this.data.ingredients = [{item: targetItem}];
		const dyes = craftingInputs.filter(e => Recipe.dyes.includes(e)).map(e => ({item: e}));
		dyes.splice(8);
		this.data.ingredients.push(...dyes);
		return super.score();
	}
}

class SpecialBannerduplicateRecipe extends ShapelessRecipe {
	constructor() {
		super({ingredients: null});
	}

	getIngredients() {
		return new Set(Recipe.expandIngredientChoices({tag: 'minecraft:banners'}));
	}

	getPossibleResults() {
		return Recipe.expandIngredientChoices({tag: 'minecraft:banners'});
	}

	getResult() {
		if (this.checkExact())
			return this.getPossibleResults().find(item => craftingInputs.includes(item));
		else
			return null;
	}

	getResultCount() {
		return 1;
	}

	checkExact() {
		let srcBanner = null;
		let dstBanner = null;
		let bannerChoices = this.getPossibleResults();
		for (let craftingInput of craftingInputs) {
			if (bannerChoices.includes(craftingInput)) {
				if (srcBanner === null)
					srcBanner = craftingInput;
				else if (dstBanner === null)
					dstBanner = craftingInput;
				else
					return false;
			} else if (craftingInput !== null) {
				return false;
			}
		}
		return (srcBanner !== null && srcBanner === dstBanner);
	}

	score() {
		this.data.ingredients = [{item: targetItem}, {item: targetItem}];
		return super.score();
	}
}

class SpecialBookcloningRecipe extends ShapelessRecipe {
	constructor() {
		super({ingredients: null});
	}

	getIngredients() {
		return new Set(['minecraft:written_book', 'minecraft:writable_book']);
	}

	getPossibleResults() {
		return ['minecraft:written_book'];
	}

	getResult() {
		if (this.checkExact())
			return 'minecraft:written_book';
		else
			return null;
	}

	getResultCount() {
		return craftingInputs.filter(e => e === 'minecraft:writable_book').length;
	}

	checkExact() {
		let srcBooks = 0;
		let dstBooks = 0;
		for (let craftingInput of craftingInputs) {
			if (craftingInput === 'minecraft:written_book') {
				++srcBooks;
			} else if (craftingInput === 'minecraft:writable_book') {
				++dstBooks;
			} else if (craftingInput !== null) {
				return false;
			}
		}
		return (srcBooks === 1 && dstBooks > 0);
	}

	score() {
		this.data.ingredients = [{item: 'minecraft:written_book'}];
		let dstBooks = Math.min(7, Math.min(1, craftingInputs.filter(e => e ==='minecraft:writable_book').length));
		this.data.ingredients.push(...(new Array(dstBooks).fill({item: 'minecraft:writable_book'})));
		return super.score();
	}
}

class SpecialFireworkStarRecipe extends ShapelessRecipe {
	constructor() {
		super({ingredients: null});
	}

	static extraIngredients = ['minecraft:skeleton_skull', 'minecraft:wither_skeleton_skull',
			'minecraft:player_head', 'minecraft:zombie_head', 'minecraft:creeper_head', 'minecraft:dragon_head',
			'minecraft:fire_charge', 'minecraft:gold_nugget'];

	getIngredients() {
		return new Set(Recipe.dyes.concat(SpecialFireworkStarRecipe.extraIngredients).concat([
			'minecraft:gunpowder', 'minecraft:feather', 'minecraft:glowstone_dust','minecraft:diamond'
		]));
	}

	getPossibleResults() {
		return ['minecraft:firework_star'];
	}

	getResult() {
		if (this.checkExact())
			return 'minecraft:firework_star';
		else
			return null;
	}

	getResultCount() {
		return 1;
	}

	checkExact() {
		let gunpowder = 0;
		let dyes = 0;
		let extra = 0;
		let diamond = 0;
		let glowstone = 0;
		for (let craftingInput of craftingInputs) {
			if (craftingInput === 'minecraft:gunpowder') {
				++gunpowder;
			} else if (Recipe.dyes.includes(craftingInput)) {
				++dyes;
			} else if (SpecialFireworkStarRecipe.extraIngredients.includes(craftingInput)) {
				++extra;
			} else if (craftingInput === 'minecraft:diamond') {
				++diamond;
			} else if (craftingInput === 'minecraft:glowstone_dust') {
				++glowstone;
			} else if (craftingInput !== null) {
				return false;
			}
		}
		return (gunpowder === 1 && dyes > 0 && extra < 2 && diamond < 2 && glowstone < 2);
	}

	score() {
		this.data.ingredients = [{item: 'minecraft:gunpowder'}];
		if (craftingInputs.some(e => e === 'minecraft:diamond'))
			this.data.ingredients.push({item: 'minecraft:diamond'});
		if (craftingInputs.some(e => e === 'minecraft:glowstone'))
			this.data.ingredients.push({item: 'minecraft:glowstone'});
		const extra = craftingInputs.find(e => SpecialFireworkStarRecipe.extraIngredients.includes(e));
		if (extra)
			this.data.ingredients.push({item: extra});
		const dyes = craftingInputs.filter(e => Recipe.dyes.includes(e)).map(e => ({item: e}));
		dyes.splice(9 - this.data.ingredients.length);
		if (dyes.length > 0)
			this.data.ingredients.push(...dyes);
		else
			this.data.ingredients.push({item: 'minecraft:red_dye'});
		return super.score();
	}
}

class SpecialFireworkStarFadeRecipe extends ShapelessRecipe {
	constructor() {
		super({ingredients: null});
	}

	getIngredients() {
		return new Set(Recipe.dyes.concat(SpecialFireworkStarRecipe.extraIngredients).concat([
			'minecraft:firework_star'
		]));
	}

	getPossibleResults() {
		return ['minecraft:firework_star'];
	}

	getResult() {
		if (this.checkExact())
			return 'minecraft:firework_star';
		else
			return null;
	}

	getResultCount() {
		return 1;
	}

	checkExact() {
		let firework_star = 0;
		let dyes = 0;
		for (let craftingInput of craftingInputs) {
			if (craftingInput === 'minecraft:firework_star') {
				++firework_star;
			} else if (Recipe.dyes.includes(craftingInput)) {
				++dyes;
			} else if (craftingInput !== null) {
				return false;
			}
		}
		return (firework_star === 1 && dyes > 0);
	}

	score() {
		this.data.ingredients = [{item: 'minecraft:firework_star'}];
		const dyes = craftingInputs.filter(e => Recipe.dyes.includes(e)).map(e => ({item: e}));
		dyes.splice(8);
		if (dyes.length > 0)
			this.data.ingredients.push(...dyes);
		else
			this.data.ingredients.push({item: 'minecraft:red_dye'});
		return super.score();
	}
}

class SpecialMapcloningRecipe extends ShapelessRecipe {
	constructor() {
		super({ingredients: null});
	}

	getIngredients() {
		return new Set(['minecraft:filled_map', 'minecraft:map']);
	}

	getPossibleResults() {
		return ['minecraft:filled_map'];
	}

	getResult() {
		if (this.checkExact())
			return 'minecraft:filled_map';
		else
			return null;
	}

	getResultCount() {
		return craftingInputs.filter(e => e === 'minecraft:map').length + 1;
	}

	checkExact() {
		let srcMaps = 0;
		let dstMaps = 0;
		for (let craftingInput of craftingInputs) {
			if (craftingInput === 'minecraft:filled_map') {
				++srcMaps;
			} else if (craftingInput === 'minecraft:map') {
				++dstMaps;
			} else if (craftingInput !== null) {
				return false;
			}
		}
		return (srcMaps === 1 && dstMaps > 0);
	}

	score() {
		this.data.ingredients = [{item: 'minecraft:filled_map'}];
		let dstBooks = Math.min(8, Math.max(1, craftingInputs.filter(e => e ==='minecraft:map').length));
		this.data.ingredients.push(...(new Array(dstBooks).fill({item: 'minecraft:map'})));
		return super.score();
	}
}
