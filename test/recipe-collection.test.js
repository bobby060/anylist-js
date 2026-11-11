const { expect } = require('chai');
const { getAuthenticatedClient } = require('./helpers');

describe('RecipeCollection Integration Tests', function() {
	this.timeout(30000); // API calls can be slow

	let client;

	before(async function() {
		client = await getAuthenticatedClient();

		// One-time sweep for orphaned fixtures left by a previous crashed run.
		// Free — getAuthenticatedClient() already fetched the full account via getLists().
		const orphanCollections = (await client.getRecipeCollections(false)).filter(c =>
			c.name && c.name.startsWith('TEST_Collection_')
		);
		for (const collection of orphanCollections) {
			await collection.delete();
		}

		const orphanRecipes = (await client.getRecipes(false)).filter(r =>
			r.name && r.name.startsWith('TEST_Recipe_')
		);
		for (const recipe of orphanRecipes) {
			await recipe.delete();
		}
	});

	afterEach(async function() {
		// Caches are kept correct by save()/delete() — no refetch needed to clean up.
		const testCollections = client.recipeCollections.filter(c =>
			c.name && c.name.startsWith('TEST_Collection_')
		);
		for (const collection of testCollections) {
			await collection.delete();
		}

		const testRecipes = client.recipes.filter(r =>
			r.name && r.name.startsWith('TEST_Recipe_')
		);
		for (const recipe of testRecipes) {
			await recipe.delete();
		}
	});

	describe('creating collections', function() {
		it('should create a recipe collection and reflect it in a cached read', async function() {
			const name = `TEST_Collection_${Date.now()}`;
			const collection = await client.createRecipeCollection({ name });
			await collection.save();

			const collections = await client.getRecipeCollections(false);
			const found = collections.find(c => c.identifier === collection.identifier);

			expect(found).to.exist;
			expect(found.name).to.equal(name);
			expect(found.recipeIds).to.deep.equal([]);
		});

		it('should persist the new collection for a fresh client', async function() {
			const name = `TEST_Collection_${Date.now()}`;
			const collection = await client.createRecipeCollection({ name });
			await collection.save();

			const freshClient = await getAuthenticatedClient();
			await freshClient.getRecipeCollections(true);
			const found = freshClient.recipeCollections.find(c => c.name === name);

			expect(found).to.exist;
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

			await collection.addRecipe(recipe.identifier);
			let found = (await client.getRecipeCollections(false)).find(c => c.identifier === collection.identifier);
			expect(found.recipeIds).to.include(recipe.identifier);

			await collection.removeRecipe(recipe.identifier);
			found = (await client.getRecipeCollections(false)).find(c => c.identifier === collection.identifier);
			expect(found.recipeIds).to.not.include(recipe.identifier);
		});
	});

	describe('deleting collections', function() {
		it('should delete a recipe collection and reflect removal in a cached read', async function() {
			const name = `TEST_Collection_${Date.now()}`;
			const collection = await client.createRecipeCollection({ name });
			await collection.save();

			await collection.delete();

			const collections = await client.getRecipeCollections(false);
			expect(collections.find(c => c.identifier === collection.identifier)).to.be.undefined;
		});
	});

	describe('cache contract', function() {
		it('should reflect create/membership/delete in cached reads without any full-account fetch', async function() {
			const original = client._getUserData.bind(client);
			let refreshes = 0;
			client._getUserData = async refresh => {
				if (refresh) refreshes++;
				return original(refresh);
			};

			try {
				const collectionName = `TEST_Collection_${Date.now()}`;
				const collection = await client.createRecipeCollection({ name: collectionName });
				await collection.save();
				await client.getRecipeCollections(false);

				const recipeName = `TEST_Recipe_${Date.now()}`;
				const recipe = await client.createRecipe({ name: recipeName });
				await recipe.save();

				await collection.addRecipe(recipe.identifier);
				await client.getRecipeCollections(false);

				await collection.removeRecipe(recipe.identifier);
				await client.getRecipeCollections(false);

				await recipe.delete();
				await collection.delete();
				await client.getRecipeCollections(false);

				// Correctness of each step (create/add/remove/delete) is already covered
				// by the tests above — this one only has to prove the whole
				// create/membership/delete/read sequence costs zero network calls.
				expect(refreshes).to.equal(0);
			} finally {
				client._getUserData = original;
			}
		});
	});
});
