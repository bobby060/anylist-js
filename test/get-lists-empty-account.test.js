const { expect } = require('chai');
const AnyList = require('../lib/index');

// Unit test: no network. Stubs _getUserData() with the shapes a brand-new account
// (no lists shared or created, no recents, no favorites) can return.
describe('getLists() on an account with no data', function() {
	function clientWith(userData) {
		const client = new AnyList({ email: 'test@example.com', password: 'x', credentialsFile: null });
		client._getUserData = async () => userData;
		return client;
	}

	const cases = {
		'null shoppingListsResponse and starterListsResponse': {
			shoppingListsResponse: null,
			starterListsResponse: null,
		},
		'null recent/favorite responses': {
			shoppingListsResponse: { newLists: [], listResponses: [] },
			starterListsResponse: { recentItemListsResponse: null, favoriteItemListsResponse: null },
		},
		'missing listResponses arrays': {
			shoppingListsResponse: { newLists: null, listResponses: null },
			starterListsResponse: {
				recentItemListsResponse: { listResponses: null },
				favoriteItemListsResponse: { listResponses: null },
			},
		},
	};

	for (const [name, userData] of Object.entries(cases)) {
		it(`returns no lists instead of throwing (${name})`, async function() {
			const client = clientWith(userData);
			const lists = await client.getLists();
			expect(lists).to.deep.equal([]);
			expect(client.favoriteItems).to.deep.equal([]);
			expect(client.getListByName('Groceries')).to.equal(undefined);
		});
	}
});
