const { expect } = require('chai');
const { getAuthenticatedClient } = require('./helpers');

// A 64x64 solid-colour JPEG, so the test uploads a few hundred bytes rather than
// a real photo.
const TINY_JPEG = Buffer.from(
	'/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8S' +
	'EhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEU' +
	'Hh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAAR' +
	'CABAAEADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAT/xAAUEAEAAAAAAAAAAAAA' +
	'AAAAAAAA/8QAFgEBAQEAAAAAAAAAAAAAAAAAAAQH/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/a' +
	'AAwDAQACEQMRAD8AqARM0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf/9k=',
	'base64',
);

describe('Photo Integration Tests', function() {
	this.timeout(30000); // API calls can be slow

	let client;

	before(async function() {
		client = await getAuthenticatedClient();
	});

	describe('uploadPhoto', function() {
		it('should return a 32-character hex photo ID', async function() {
			const photoId = await client.uploadPhoto(TINY_JPEG);

			expect(photoId).to.be.a('string');
			expect(photoId).to.match(/^[0-9a-f]{32}$/);
		});

		it('should make the photo retrievable from the photo bucket', async function() {
			const photoId = await client.uploadPhoto(TINY_JPEG);

			const response = await fetch(`https://photos.anylist.com/${photoId}.jpg`);

			expect(response.status).to.equal(200);
			expect(response.headers.get('content-type')).to.equal('image/jpeg');
		});

		it('should return a different ID for each upload', async function() {
			const first = await client.uploadPhoto(TINY_JPEG);
			const second = await client.uploadPhoto(TINY_JPEG);

			expect(first).to.not.equal(second);
		});

		it('should throw when given something other than a Buffer', async function() {
			try {
				await client.uploadPhoto('not a buffer');
				expect.fail('expected uploadPhoto to throw');
			} catch (error) {
				expect(error).to.be.an.instanceOf(TypeError);
				expect(error.message).to.equal('photo must be a Buffer of JPEG bytes');
			}
		});
	});
});
