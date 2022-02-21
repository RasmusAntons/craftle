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
		for (let expandedElement of res) {
			if (expandedElement.startsWith('#'))
				console.log(ingredientChoices, expandedElement);
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

	static fromJSON(jsonData) {
		switch (jsonData.type) {
			case 'minecraft:crafting_shaped':
				return new ShapedRecipe(jsonData);
			case 'minecraft:crafting_shapeless':
				return new ShapelessRecipe(jsonData);
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
			if (expectedIngredients[inputSlot] === undefined)
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
