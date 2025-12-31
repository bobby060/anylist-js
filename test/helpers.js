const AnyList = require('../lib/index');

/**
 * Creates an authenticated AnyList client for integration tests.
 * Requires ANYLIST_USERNAME and ANYLIST_PASSWORD environment variables.
 */
async function getAuthenticatedClient() {
	const email = process.env.ANYLIST_USERNAME;
	const password = process.env.ANYLIST_PASSWORD;

	if (!email || !password) {
		throw new Error(
			'Integration tests require ANYLIST_USERNAME and ANYLIST_PASSWORD environment variables'
		);
	}

	const client = new AnyList({ email, password });
	await client.login(false); // Don't connect websocket for tests
	await client.getLists();

	return client;
}

/**
 * Find or create a test list for running tests against.
 */
async function getTestList(client, listName = 'Integration Test List') {
	let list = client.lists.find(l => l.name === listName);

	if (!list) {
		// Create the test list if it doesn't exist
		throw new Error(
			`Test list "${listName}" not found. Please create it manually in AnyList first.`
		);
	}

	return list;
}

module.exports = {
	getAuthenticatedClient,
	getTestList,
};
