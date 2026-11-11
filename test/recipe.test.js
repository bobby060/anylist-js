const { expect } = require('chai');
const { getAuthenticatedClient } = require('./helpers');

describe('Recipe Integration Tests', function() {
	this.timeout(30000); // API calls can be slow

	let client;

	before(async function() {
		client = await getAuthenticatedClient();
	});

	afterEach(async function() {
		// Clean up: remove any test recipes we created
		await client.getRecipes(true);
		const testRecipes = client.recipes.filter(r =>
			r.name && r.name.startsWith('TEST_Recipe_')
		);
		for (const recipe of testRecipes) {
			await recipe.delete();
		}
	});

	describe('creating recipes', function() {
		it('should create a recipe and reflect it in a cached read', async function() {
			const name = `TEST_Recipe_${Date.now()}`;
			const recipe = await client.createRecipe({ name });
			await recipe.save();

			// No refreshCache arg — must come from the local cache save() just updated
			const recipes = await client.getRecipes(false);
			const found = recipes.find(r => r.identifier === recipe.identifier);

			expect(found).to.exist;
			expect(found.name).to.equal(name);
		});

		it('should persist the new recipe for a fresh client', async function() {
			const name = `TEST_Recipe_${Date.now()}`;
			const recipe = await client.createRecipe({ name });
			await recipe.save();

			const freshClient = await getAuthenticatedClient();
			await freshClient.getRecipes(true);
			const found = freshClient.recipes.find(r => r.name === name);

			expect(found).to.exist;
		});
	});

	describe('updating recipes', function() {
		it('should update a recipe and reflect it in a cached read', async function() {
			const name = `TEST_Recipe_${Date.now()}`;
			const recipe = await client.createRecipe({ name, note: 'original note' });
			await recipe.save();

			recipe.note = 'updated note';
			await recipe.save();

			const recipes = await client.getRecipes(false);
			const found = recipes.find(r => r.identifier === recipe.identifier);

			expect(found).to.exist;
			expect(found.note).to.equal('updated note');
			// Only one recipe should exist for this identifier — save() must replace, not duplicate
			expect(recipes.filter(r => r.identifier === recipe.identifier)).to.have.lengthOf(1);
		});

		it('should keep the same identifier when renaming', async function() {
			const name = `TEST_Recipe_${Date.now()}`;
			const recipe = await client.createRecipe({ name });
			await recipe.save();
			const originalId = recipe.identifier;

			recipe.name = `TEST_Recipe_${Date.now()}_renamed`;
			await recipe.save();

			const recipes = await client.getRecipes(false);
			const found = recipes.find(r => r.identifier === originalId);

			expect(found).to.exist;
			expect(found.name).to.equal(recipe.name);
		});
	});

	describe('deleting recipes', function() {
		it('should delete a recipe and reflect removal in a cached read', async function() {
			const name = `TEST_Recipe_${Date.now()}`;
			const recipe = await client.createRecipe({ name });
			await recipe.save();

			await recipe.delete();

			const recipes = await client.getRecipes(false);
			expect(recipes.find(r => r.identifier === recipe.identifier)).to.be.undefined;
		});
	});

	describe('cache contract', function() {
		it('should not trigger additional full-account fetches after the initial warm-up', async function() {
			const original = client._getUserData.bind(client);
			let refreshes = 0;
			client._getUserData = async refresh => {
				if (refresh) refreshes++;
				return original(refresh);
			};

			try {
				const name = `TEST_Recipe_${Date.now()}`;
				const recipe = await client.createRecipe({ name });
				await recipe.save(); // may include the one-time warm-up fetch

				await client.getRecipes(false);

				recipe.note = 'updated note';
				await recipe.save();

				await client.getRecipes(false);

				await recipe.delete();

				await client.getRecipes(false);

				expect(refreshes).to.be.at.most(1);
			} finally {
				client._getUserData = original;
			}
		});
	});
});
