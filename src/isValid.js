const util = require('./util');
const dates = require('@clubajax/dates');

function isValid (value = this.input.value) {
	if (!value && this.required) {
		this.emitError('This field is required');
		return false;
	} else if (!value) {
		return true;
	}

	const type = util.is(value).type();
	if (type !== 'time' && type !== 'date' && type !== 'datetime') {
		// incomplete string
		return false;
	}

	let msg;
	const strValue = value;
	value = dates.toDate(value);

	if (this.minDate) {
		if (dates.is(value).less(this.minDate)) {
			emitError.call(this, getMinMsg(this.min));
			return false;
		}
	}

	if (this.maxDate) {
		if (dates.is(value).greater(this.maxDate)) {
			emitError.call(this, getMaxMsg(this.max));
			return false;
		}
	}

	if (this.hasTime) {
		return util.timeIsValid(strValue);
	}

	emitError.call(this, null);

	return true;
}


function getMinMsg (min) {
	return min === 'now' ? 'Value must be in the future' : `Value is less than the minimum, ${min}`
}

function getMaxMsg (max) {
	return max === 'now' ? 'Value must be in the future' : `Value is greater than the maximum, ${max}`
}

function emitError (msg) {
	if (msg === this.validationError) {
		return;
	}
	this.validationError = msg;
	this.fire('validation', { message: msg }, true);
}

module.exports = isValid;