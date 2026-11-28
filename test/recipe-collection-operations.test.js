const {expect} = require('chai');
const AnyList = require('../lib/index');

// Offline: no credentials, no network. The HTTP client is stubbed and the
// operations it would send are decoded back from the form body.
describe('RecipeCollection operations (offline)', () => {
	let client;
	let posts;

	function sentOperations(form) {
		const body = form.getBuffer();
		const start = body.indexOf('\r\n\r\n') + 4;
		const end = body.lastIndexOf(Buffer.from(`\r\n--${form.getBoundary()}--`));
		return client.protobuf.PBRecipeOperationList.decode(body.subarray(start, end)).operations;
	}

	beforeEach(() => {
		posts = [];
		client = new AnyList({email: 'test@example.com', password: 'x'});
		client.client = {post: async (path, {body}) => posts.push({path, body})};
		client.recipeDataId = 'data-1';
	});

	it('should send only the removed recipe on removeRecipe', async () => {
		const collection = await client.createRecipeCollection({name: 'Desserts', recipeIds: ['r-cake', 'r-pie', 'r-tart']});

		await collection.removeRecipe('r-pie');

		const [op] = sentOperations(posts[0].body);
		expect(op.metadata.handlerId).to.equal('remove-recipes-from-collection');
		expect(op.recipeCollection.recipeIds).to.deep.equal(['r-pie']);
		expect(collection.recipeIds).to.deep.equal(['r-cake', 'r-tart']);
	});

	it('should remove the last recipe from a one-recipe collection', async () => {
		const collection = await client.createRecipeCollection({name: 'Desserts', recipeIds: ['r-cake']});

		await collection.removeRecipe('r-cake');

		expect(sentOperations(posts[0].body)[0].recipeCollection.recipeIds).to.deep.equal(['r-cake']);
		expect(collection.recipeIds).to.deep.equal([]);
	});

	it('should send nothing for a recipe that is not in the collection', async () => {
		const collection = await client.createRecipeCollection({name: 'Desserts', recipeIds: ['r-cake']});

		await collection.removeRecipe('r-soup');

		expect(posts).to.have.length(0);
		expect(collection.recipeIds).to.deep.equal(['r-cake']);
	});

	it('should still send the full list for other operations', async () => {
		const collection = await client.createRecipeCollection({name: 'Desserts', recipeIds: ['r-cake', 'r-pie']});

		await collection.save();

		expect(sentOperations(posts[0].body)[0].recipeCollection.recipeIds).to.deep.equal(['r-cake', 'r-pie']);
	});
});
