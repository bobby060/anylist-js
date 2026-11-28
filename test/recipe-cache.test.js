const {expect} = require('chai');
const AnyList = require('../lib/index');

// Offline: no credentials, no network. _getUserData is stubbed with the shape
// of a decoded data/user-data/get response.
describe('Recipe cache (offline)', () => {
	let client;
	let fetches;

	function stubUserData(recipes) {
		fetches = 0;
		client._getUserData = async () => {
			fetches++;
			return {recipeDataResponse: {recipeDataId: 'data-1', recipes, recipeCollections: []}};
		};
	}

	beforeEach(() => {
		client = new AnyList({email: 'test@example.com', password: 'x'});
	});

	it('should load recipes on the first cached getRecipes() call', async () => {
		stubUserData([{identifier: 'r-cake', name: 'Cake'}]);

		const recipes = await client.getRecipes();

		expect(recipes.map(r => r.name)).to.deep.equal(['Cake']);
		expect(fetches).to.equal(1);
	});

	it('should serve the second cached call from the cache', async () => {
		stubUserData([{identifier: 'r-cake', name: 'Cake'}]);

		await client.getRecipes();
		await client.getRecipes();

		expect(fetches).to.equal(1);
	});

	it('should cache an account with no recipes as an empty list', async () => {
		stubUserData([]);

		expect(await client.getRecipes()).to.deep.equal([]);
		expect(await client.getRecipes()).to.deep.equal([]);
		expect(fetches).to.equal(1);
	});

	it('should give a recipe created before any read the account recipeDataId', async () => {
		stubUserData([{identifier: 'r-pie', name: 'Pie'}]);
		client.client = {post: async () => ({})};

		const recipe = await client.createRecipe({name: 'Cake'});
		await recipe.save();

		expect(recipe.recipeDataId).to.equal('data-1');
		expect((await client.getRecipes()).map(r => r.name)).to.deep.equal(['Pie', 'Cake']);
		expect(fetches).to.equal(1);
	});
});
