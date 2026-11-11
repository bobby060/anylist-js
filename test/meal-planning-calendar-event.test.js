const { expect } = require('chai');
const { getAuthenticatedClient } = require('./helpers');

// Far-future date so these fixtures can never collide with a real meal plan entry.
const TEST_DATE = '2099-08-15';

describe('MealPlanningCalendarEvent Integration Tests', function() {
	this.timeout(30000); // API calls can be slow

	let client;

	before(async function() {
		client = await getAuthenticatedClient();

		// One-time sweep for orphaned fixtures left by a previous crashed run.
		// Free — getAuthenticatedClient() already fetched the full account via getLists().
		const orphans = (await client.getMealPlanningCalendarEvents(false)).filter(e =>
			e.title && e.title.startsWith('TEST_Event_')
		);
		for (const event of orphans) {
			await event.delete();
		}
	});

	afterEach(async function() {
		// client.mealPlanningCalendarEvents is kept correct by save()/delete() — no refetch needed.
		const testEvents = client.mealPlanningCalendarEvents.filter(e =>
			e.title && e.title.startsWith('TEST_Event_')
		);
		for (const event of testEvents) {
			await event.delete();
		}
	});

	describe('creating events', function() {
		it('should create an event and reflect it in a cached read', async function() {
			const title = `TEST_Event_${Date.now()}`;
			const event = await client.createEvent({ title, date: TEST_DATE });
			await event.save();

			const events = await client.getMealPlanningCalendarEvents(false);
			const found = events.find(e => e.identifier === event.identifier);

			expect(found).to.exist;
			expect(found.title).to.equal(title);
		});

		it('should persist the new event for a fresh client', async function() {
			const title = `TEST_Event_${Date.now()}`;
			const event = await client.createEvent({ title, date: TEST_DATE });
			await event.save();

			const freshClient = await getAuthenticatedClient();
			await freshClient.getMealPlanningCalendarEvents(true);
			const found = freshClient.mealPlanningCalendarEvents.find(e => e.title === title);

			expect(found).to.exist;
		});
	});

	describe('updating events', function() {
		it('should update an event in place without duplicating it', async function() {
			const title = `TEST_Event_${Date.now()}`;
			const event = await client.createEvent({ title, date: TEST_DATE });
			await event.save();
			expect(event._isNew).to.equal(false);

			event.title = `${title}_updated`;
			await event.save();

			const events = await client.getMealPlanningCalendarEvents(false);
			expect(events.filter(e => e.identifier === event.identifier)).to.have.lengthOf(1);
			expect(events.find(e => e.identifier === event.identifier).title).to.equal(event.title);
		});
	});

	describe('deleting events', function() {
		it('should delete an event and reflect removal in a cached read', async function() {
			const title = `TEST_Event_${Date.now()}`;
			const event = await client.createEvent({ title, date: TEST_DATE });
			await event.save();

			await event.delete();

			const events = await client.getMealPlanningCalendarEvents(false);
			expect(events.find(e => e.identifier === event.identifier)).to.be.undefined;
		});
	});

	describe('cache contract', function() {
		it('should not trigger any full-account fetch after the initial warm-up', async function() {
			const original = client._getUserData.bind(client);
			let refreshes = 0;
			client._getUserData = async refresh => {
				if (refresh) refreshes++;
				return original(refresh);
			};

			try {
				const title = `TEST_Event_${Date.now()}`;
				const event = await client.createEvent({ title, date: TEST_DATE });
				await event.save();

				await client.getMealPlanningCalendarEvents(false);

				event.title = `${title}_updated`;
				await event.save();

				await client.getMealPlanningCalendarEvents(false);

				await event.delete();

				await client.getMealPlanningCalendarEvents(false);

				// By this point in the suite the cache is already warm, so this whole
				// create/update/delete/read sequence should cost zero network calls.
				expect(refreshes).to.equal(0);
			} finally {
				client._getUserData = original;
			}
		});
	});
});
