const { expect } = require('chai');
const { getAuthenticatedClient, getTestList } = require('./helpers');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('Item Integration Tests', function() {
	this.timeout(30000); // API calls can be slow

	let client;
	let testList;

	before(async function() {
		client = await getAuthenticatedClient();
		testList = await getTestList(client);
	});

	afterEach(async function() {
		// Clean up: remove any test items we created
		await client.getLists(); // Refresh
		testList = client.lists.find(l => l.name === testList.name);

		const testItems = testList.items.filter(i =>
			i.name && i.name.startsWith('TEST_')
		);

		for (const item of testItems) {
			await testList.removeItem(item);
		}
	});

	describe('adding items', function() {
		it('should add an item without quantity', async function() {
			const item = client.createItem({
				name: 'TEST_NoQuantity',
			});

			await testList.addItem(item);

			// Refresh and verify
			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);

			const found = testList.getItemByName('TEST_NoQuantity');
			expect(found).to.exist;
			expect(found.name).to.equal('TEST_NoQuantity');
		});

		it('should add an item with quantity', async function() {
			const item = client.createItem({
				name: 'TEST_WithQuantity',
				quantity: '5',
			});

			await testList.addItem(item);
			
			// Refresh and verify
			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);

			const found = testList.getItemByName('TEST_WithQuantity');
			expect(found).to.exist;
			expect(found.name).to.equal('TEST_WithQuantity');
			expect(found.quantity).to.equal('5');
		});

		it('should add an item with numeric quantity', async function() {
			const item = client.createItem({
				name: 'TEST_NumericQuantity',
				quantity: 12,
			});

			await testList.addItem(item);

			// Refresh and verify
			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);

			const found = testList.getItemByName('TEST_NumericQuantity');
			expect(found).to.exist;
			expect(found.quantity).to.equal('12');
		});

		it('should add an item with details and quantity', async function() {
			const item = client.createItem({
				name: 'TEST_DetailsAndQuantity',
				details: 'organic',
				quantity: '2 lbs',
			});

			await testList.addItem(item);

			// Refresh and verify
			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);

			const found = testList.getItemByName('TEST_DetailsAndQuantity');
			expect(found).to.exist;
			expect(found.details).to.equal('organic');
			expect(found.quantity).to.equal('2 lbs');
		});
	});

	describe('updating item quantity', function() {
		it('should update quantity on an existing item', async function() {
			// Create item without quantity
			const item = client.createItem({
				name: 'TEST_UpdateQuantity',
			});
			await testList.addItem(item);

			// Refresh to get the item from API
			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);
			const found = testList.getItemByName('TEST_UpdateQuantity');

			// Update quantity
			found.quantity = '10';
			await found.save();

			// Refresh and verify
			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);
			const updated = testList.getItemByName('TEST_UpdateQuantity');

			expect(updated.quantity).to.equal('10');
		});

		it('should clear quantity by setting to empty string', async function() {
			// Create item with quantity
			const item = client.createItem({
				name: 'TEST_ClearQuantity',
				quantity: '5',
			});
			await testList.addItem(item);

			// Refresh
			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);
			const found = testList.getItemByName('TEST_ClearQuantity');
			expect(found.quantity).to.equal('5');

			// Clear quantity
			found.quantity = '';
			await found.save();

			// Refresh and verify
			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);
			const updated = testList.getItemByName('TEST_ClearQuantity');

			// Quantity should be empty/undefined
			expect(updated.quantity).to.satisfy(q => q === '' || q === undefined || q === null);
		});
	});

	describe('removing items', function() {
		it('should remove an item with quantity without error', async function() {
			const item = client.createItem({
				name: 'TEST_RemoveWithQuantity',
				quantity: '3',
			});
			await testList.addItem(item);

			// Refresh
			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);
			const found = testList.getItemByName('TEST_RemoveWithQuantity');
			expect(found).to.exist;

			// Remove should not throw
			await testList.removeItem(found);

			// Verify removed
			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);
			const removed = testList.getItemByName('TEST_RemoveWithQuantity');
			expect(removed).to.be.undefined;
		});
	});

	describe('reading items with quantity from API', function() {
		it('should read quantity from items fetched from API', async function() {
			// Add item with quantity
			const item = client.createItem({
				name: 'TEST_ReadQuantity',
				quantity: '7',
			});
			await testList.addItem(item);

			// Create fresh client to ensure we're reading from API
			const freshClient = await getAuthenticatedClient();
			await freshClient.getLists();

			const freshList = freshClient.lists.find(l => l.name === testList.name);
			const found = freshList.getItemByName('TEST_ReadQuantity');

			expect(found).to.exist;
			expect(found.quantity).to.equal('7');
		});
	});

	describe('item details', function() {
		it('should add an item with details', async function() {
			const item = client.createItem({
				name: 'TEST_WithDetails',
				details: 'extra virgin, cold pressed',
			});

			await testList.addItem(item);
			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);

			const found = testList.getItemByName('TEST_WithDetails');
			expect(found).to.exist;
			expect(found.details).to.equal('extra virgin, cold pressed');
		});

		it('should update item details', async function() {
			const item = client.createItem({
				name: 'TEST_UpdateDetails',
				details: 'original details',
			});
			await testList.addItem(item);

			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);
			const found = testList.getItemByName('TEST_UpdateDetails');

			found.details = 'updated details';
			await found.save();

			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);
			const updated = testList.getItemByName('TEST_UpdateDetails');

			expect(updated.details).to.equal('updated details');
		});

		it('should handle special characters in details', async function() {
			const item = client.createItem({
				name: 'TEST_SpecialDetails',
				details: 'café, naïve, 日本語, emoji 🍎',
			});
			await testList.addItem(item);

			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);

			const found = testList.getItemByName('TEST_SpecialDetails');
			expect(found.details).to.equal('café, naïve, 日本語, emoji 🍎');
		});
	});

	describe('item checked status', function() {
		it('should add an unchecked item by default', async function() {
			const item = client.createItem({
				name: 'TEST_DefaultUnchecked',
			});
			await testList.addItem(item);

			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);

			const found = testList.getItemByName('TEST_DefaultUnchecked');
			// API returns null or false for unchecked items
			expect(found.checked).to.satisfy(c => c === false || c === null);
		});

		it('should check an item', async function() {
			const item = client.createItem({
				name: 'TEST_CheckItem',
			});
			await testList.addItem(item);

			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);
			const found = testList.getItemByName('TEST_CheckItem');

			found.checked = true;
			await found.save();

			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);
			const updated = testList.getItemByName('TEST_CheckItem');

			expect(updated.checked).to.equal(true);
		});

		it('should uncheck a checked item', async function() {
			const item = client.createItem({
				name: 'TEST_UncheckItem',
				checked: true,
			});
			await testList.addItem(item);

			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);
			const found = testList.getItemByName('TEST_UncheckItem');
			expect(found.checked).to.equal(true);

			found.checked = false;
			await found.save();

			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);
			const updated = testList.getItemByName('TEST_UncheckItem');

			// API may return null or false for unchecked
			expect(updated.checked).to.satisfy(c => c === false || c === null);
		});
	});

	describe('item name', function() {
		it('should update item name', async function() {
			const item = client.createItem({
				name: 'TEST_OriginalName',
			});
			await testList.addItem(item);

			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);
			const found = testList.getItemByName('TEST_OriginalName');

			found.name = 'TEST_UpdatedName';
			await found.save();

			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);

			expect(testList.getItemByName('TEST_OriginalName')).to.be.undefined;
			expect(testList.getItemByName('TEST_UpdatedName')).to.exist;
		});

		it('should handle special characters in name', async function() {
			const item = client.createItem({
				name: 'TEST_Spëcial Çharacters & Symbols!',
			});
			await testList.addItem(item);

			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);

			const found = testList.getItemByName('TEST_Spëcial Çharacters & Symbols!');
			expect(found).to.exist;
		});
	});

	describe('multiple property updates', function() {
		it('should update multiple properties at once', async function() {
			const item = client.createItem({
				name: 'TEST_MultiUpdate',
				details: 'original',
				quantity: '1',
			});
			await testList.addItem(item);

			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);
			const found = testList.getItemByName('TEST_MultiUpdate');

			found.name = 'TEST_MultiUpdateRenamed';
			found.details = 'updated details';
			found.quantity = '5';
			found.checked = true;
			await found.save();

			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);
			const updated = testList.getItemByName('TEST_MultiUpdateRenamed');

			expect(updated).to.exist;
			expect(updated.details).to.equal('updated details');
			expect(updated.quantity).to.equal('5');
			expect(updated.checked).to.equal(true);
		});
	});

	describe('item retrieval', function() {
		it('should find item by identifier', async function() {
			const item = client.createItem({
				name: 'TEST_FindById',
			});
			const originalId = item.identifier;
			await testList.addItem(item);

			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);

			const found = testList.getItemById(originalId);
			expect(found).to.exist;
			expect(found.name).to.equal('TEST_FindById');
		});

		it('should return undefined for non-existent item by name', async function() {
			const found = testList.getItemByName('TEST_NonExistent_12345');
			expect(found).to.be.undefined;
		});

		it('should return undefined for non-existent item by id', async function() {
			const found = testList.getItemById('non-existent-id-12345');
			expect(found).to.be.undefined;
		});
	});

	describe('item toJSON', function() {
		it('should serialize item to JSON', async function() {
			const item = client.createItem({
				name: 'TEST_ToJSON',
				details: 'test details',
				quantity: '3',
			});
			await testList.addItem(item);

			await client.getLists();
			testList = client.lists.find(l => l.name === testList.name);
			const found = testList.getItemByName('TEST_ToJSON');

			const json = found.toJSON();

			expect(json).to.be.an('object');
			expect(json.name).to.equal('TEST_ToJSON');
			expect(json.details).to.equal('test details');
			expect(json.quantity).to.equal('3');
			expect(json.identifier).to.be.a('string');
			expect(json.listId).to.equal(testList.identifier);
		});
	});

	describe('item validation', function() {
		it('should throw when setting checked to non-boolean', function() {
			const item = client.createItem({ name: 'TEST_Validation' });
			expect(() => { item.checked = 'yes'; }).to.throw('Checked must be a boolean.');
		});

		it('should throw when setting manualSortIndex to non-number', function() {
			const item = client.createItem({ name: 'TEST_Validation' });
			expect(() => { item.manualSortIndex = '5'; }).to.throw('Sort index must be a number.');
		});

		it('should throw when trying to change identifier', async function() {
			const item = client.createItem({ name: 'TEST_Validation' });
			expect(() => { item.identifier = 'new-id'; }).to.throw('You cannot update an item ID.');
		});
	});
});
