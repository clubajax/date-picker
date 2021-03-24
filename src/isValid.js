const util = require('./util');
const dates = require('@clubajax/dates');

function isValid (value = this.input.value, type) {
	if (!value && this.required) {
		this.emitError('This field is required');
		return false;
	} else if (!value) {
		return true;
	}

	if (value.length > 19) {
		emitError.call(this, 'Not a valid date and time');
		return false;
	}
	if (type !== 'time' && type !== 'date' && type !== 'datetime') {
		// incomplete string
		emitError.call(this, 'Not a valid date and time');
		return false;
	}

	if (type === 'time' && !util.isTimeValid(value)) {
		emitError.call(this, 'Not a valid time');
		return false;
    }
    
    if (type === 'date' && !util.isDateValid(value)) {
        emitError.call(this, 'Not a valid date');
        return false;
    }

	if (type === 'datetime' && !util.isDateTimeValid(value)) {
		emitError.call(this, 'Not a valid date and time');
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

	// if (type === 'datetime' && this.minDate && dates.is(value).equalDate(this.minDate)) {
	// 	console.log('CHECK TIME', value, this.minDate);
	// }

	if (/time/.test(type) && !util.isTimeValid(strValue)) {
		return false;
	}

	emitError.call(this, null);

	return true;
}


function getMinMsg (min) {
	return min === 'now' ? 'Value must be in the future' : `Value is less than the minimum, ${min}`
}

function getMaxMsg (max) {
	return max === 'now' ? 'Value must be in the past' : `Value is greater than the maximum, ${max}`
}

function emitError (msg) {
	if (msg === this.validationError) {
		return;
	}
    this.validationError = msg;
	this.fire('validation', { message: msg }, true);
}

module.exports = isValid;
