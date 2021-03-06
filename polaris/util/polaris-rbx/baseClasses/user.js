const request = require('request-promise');
const Cheerio = require('cheerio');
/* INFO WITH USER CLASS:
  * User.id: User ID. Always set
  * User.username: Roblox Name. Always set.
  * User.age, User.blurb, User.status, User.joinDate: Roblox Profile info. *Not* always set.
 */
class User {
	constructor (Roblox, userId) {
		this.roblox = Roblox;
		this.id = userId;
	}
	async getUsername () {
		if (this.username) {
			return this.username;
		} else {
			await this.updateUsername();
			return this.username;
		}
	}
	// RETURNS: USERNAME OR NULL FOR FAIL.
	async updateUsername () {
		const user = this;
		request(`https://api.roblox.com/users/${this.id}`)
			.then(function (res) {
				res = JSON.parse(res);
				user.username = res.Username;
			})
			.catch(function (err) {
				throw new Error(err);
			});
	}

	async getInfo () {
		// Check for player info fetched
		if (this.age) {
			return {
				age: this.age,
				blurb: this.blurb,
				status: this.status,
				username: this.username,
				joinDate: this.joinDate
			};
		} else {
			return this.updateInfo();
		}
	}

	async updateInfo () {
		if (!this.id) {
			return {error: {message: 'Id is not defined. Please try again - We\'re onto it.', status: 400}};
		}
		const user = this;
		try {
			const res = await request(`https://www.roblox.com/users/${user.id}/profile`);
			const body = Cheerio.load(res);

			user.blurb = body('.profile-about-content-text').text();
			user.status = body('div[data-statustext]').attr('data-statustext');
			user.joinDate = body('.profile-stats-container .text-lead').eq(0).text();

			user.joinDate = rbxDate(this.joinDate, 'CT');

			const currentTime = new Date();
			user.age = Math.round(Math.abs((user.joinDate.getTime() - currentTime.getTime()) / (24 * 60 * 60 * 1000)));
			const obj = {
				username: user.username,
				status: user.status,
				blurb: user.blurb,
				joinDate: user.joinDate,
				age: user.age
			};
			return obj;
		} catch (error) {
			if (error.statusCode === 400 || error.statusCode === 404) {
				return {error: {message: 'User not found - User is likely banned from Roblox.', status: error.statusCode, robloxId: user.id, userName: user.username}};
			}
			throw new Error(error);
		}
	}
}

module.exports = User;

// Froast's (sentanos') time function. I don't want to re-make something similar. Repo: https://github.com/
function isDST (time) {
	const today = new Date(time);
	const month = today.getMonth();
	const dow = today.getDay();
	const day = today.getDate();
	const hours = today.getHours();
	if (month < 2 || month > 10) {
		return false;
	}
	if (month > 2 && month < 10) {
		return true;
	}
	if (dow === 0) {
		if (month === 2) {
			if (day >= 8 && day <= 14) {
				return hours >= 2;
			}
		} else if (month === 10) {
			if (day >= 1 && day <= 7) {
				return hours < 2;
			}
		}
	}
	const previousSunday = day - dow;
	if (month === 2) {
		return previousSunday >= 8;
	}
	return previousSunday <= 0;
}

function rbxDate (time, timezone) {
	return new Date(time + ' ' + timezone.substring(0, 1) + (isDST(time) ? 'D' : 'S') + timezone.substring(1));
}
