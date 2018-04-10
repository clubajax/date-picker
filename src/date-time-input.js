const DateInput = require('./date-input');
const dates = require('@clubajax/dates');
const util = require('./util');

class DateTimeInput extends DateInput {
	constructor () {
		super();
		this.dateType = 'datetime';
		this.hasTime = false;
	}

	domReady () {
		this.mask = 'XX/XX/XXXX XX:XX pm';
		super.domReady();
		if (!this.value) {
			this.value = dates.format(new Date(), 'MM/dd/yyyy h:m a');
		}
	}

	format (value) {
		const parts = value.split(' ');
		if (parts.length !== 3 ) {
			return value;
		}
		const dateStr = parts[0] || '';
		const timeStr = `${parts[1] || ''} ${parts[2] || ''}`;
		const date = util.formatDate(dateStr, this.mask);
		let time = util.formatTime(timeStr);
		time = this.setAMPM(time, util.getAMPM(value));
		return `${date} ${time}`;
	}

	setAMPM (value, ampm) {
		let isAM;
		if (ampm) {
			isAM = /a/i.test(ampm);
		} else if (/[ap]/.test(value)) {
			isAM = /a/i.test(value);
		} else {
			isAM = this.isAM;
		}
		value = value.replace(/\s*[ap]m/i, '') + (isAM ? ' am' : ' pm');
		this.isAM = isAM;
		this.isPM = !isAM;
		return value;
	}
}

customElements.define('date-time-input', DateTimeInput);

module.exports = DateTimeInput;