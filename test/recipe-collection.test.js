const { expect } = require('chai');
const { getAuthenticatedClient } = require('./helpers');

describe('RecipeCollection Integration Tests', function() {
	this.timeout(30000); // API calls can be slow

	let client;

	before(async function() {
		client = await getAuthenticatedClient();
	});

	afterEach(async function() {
		// Clean up: remove any test collections and recipes we created
		await client.getRecipeCollections(true);
		const testCollections = client.recipeCollections.filter(c =>
			c.name && c.name.startsWith('TEST_Collection_')
		);
		for (const collection of testCollections) {
			await collection.delete();
		}

		await client.getRecipes(true);
		const testRecipes = client.recipes.filter(r =>
			r.name && r.name.startsWith('TEST_Recipe_')
		);
		for (const recipe of testRecipes) {
			await recipe.delete();
		}
	});

	describe('creating collections', function() {
		it('should create a recipe collection', async function() {
			const name = `TEST_Collection_${Date.now()}`;
			const collection = await client.createRecipeCollection({ name });
			await collection.save();

			// Refresh and verify
			await client.getRecipeCollections(true);
			const found = client.recipeCollections.find(c => c.name === name);

			expect(found).to.exist;
			expect(found.name).to.equal(name);
			expect(found.recipeIds).to.deep.equal([]);
		});
	});

	describe('recipe membership', function() {
		it('should add and remove a recipe from a collection', async function() {
			const collectionName = `TEST_Collection_${Date.now()}`;
			const collection = await client.createRecipeCollection({ name: collectionName });
			await collection.save();

			const recipeName = `TEST_Recipe_${Date.now()}`;
			const recipe = await client.createRecipe({ name: recipeName });
			await recipe.save();

			// Refresh and add the recipe to the collection
			await client.getRecipeCollections(true);
			let found = client.recipeCollections.find(c => c.name === collectionName);
			await found.addRecipe(recipe.identifier);

			// Refresh and verify membership
			await client.getRecipeCollections(true);
			found = client.recipeCollections.find(c => c.name === collectionName);
			expect(found.recipeIds).to.include(recipe.identifier);

			// Remove the recipe from the collection
			await found.removeRecipe(recipe.identifier);

			// Refresh and verify removal
			await client.getRecipeCollections(true);
			found = client.recipeCollections.find(c => c.name === collectionName);
			expect(found.recipeIds).to.not.include(recipe.identifier);
		});
	});

	describe('deleting collections', function() {
		it('should delete a recipe collection', async function() {
			const name = `TEST_Collection_${Date.now()}`;
			const collection = await client.createRecipeCollection({ name });
			await collection.save();

			await client.getRecipeCollections(true);
			expect(client.recipeCollections.find(c => c.name === name)).to.exist;

			await collection.delete();

			await client.getRecipeCollections(true);
			expect(client.recipeCollections.find(c => c.name === name)).to.be.undefined;
		});
	});

	describe('cache contract', function() {
		it('should reflect create/membership/delete in cached reads without extra fetches', async function() {
			const original = client._getUserData.bind(client);
			let refreshes = 0;
			client._getUserData = async refresh => {
				if (refresh) refreshes++;
				return original(refresh);
			};

			try {
				const collectionName = `TEST_Collection_${Date.now()}`;
				const collection = await client.createRecipeCollection({ name: collectionName });
				await collection.save(); // may include the one-time warm-up fetch

				let found = (await client.getRecipeCollections(false)).find(c => c.identifier === collection.identifier);
				expect(found).to.exist;

				const recipeName = `TEST_Recipe_${Date.now()}`;
				const recipe = await client.createRecipe({ name: recipeName });
				await recipe.save();

				await collection.addRecipe(recipe.identifier);
				found = (await client.getRecipeCollections(false)).find(c => c.identifier === collection.identifier);
				expect(found.recipeIds).to.include(recipe.identifier);

				await collection.removeRecipe(recipe.identifier);
				found = (await client.getRecipeCollections(false)).find(c => c.identifier === collection.identifier);
				expect(found.recipeIds).to.not.include(recipe.identifier);

				await recipe.delete();
				await collection.delete();
				found = (await client.getRecipeCollections(false)).find(c => c.identifier === collection.identifier);
				expect(found).to.be.undefined;

				expect(refreshes).to.be.at.most(1);
			} finally {
				client._getUserData = original;
			}
		});
	});
});
