const dates = require('@clubajax/dates');

function round (n, r, down) {
	return (Math.ceil(n / r) * r) - (down ? r : 0);
}

function incMinutes (value, inc, mult = 1) {

	const type = is(value).type();
	const MN = type === 'time' ? [3,5] : [14,16];

	let mn = parseInt(value.substring(MN[0], MN[1]));
	const org = mn;

	mn = round(mn, mult, inc === -1);

	if (mn === org) {
		mn += (inc * mult);
	}

	if (mn > 59) {
		mn = 0;
	}
	if (mn < 0) {
		mn = 45;
	}

	return `${value.substring(0, MN[0])}${pad(mn)}${value.substring(MN[1])}`;
}

function incHours (value, inc) {
	const type = is(value).type();
	const HR = type === 'time' ? [0,2] : [11,13];
	let hr = parseInt(value.substring(HR[0], HR[1]));
	hr += inc;
	if (hr < 1) {
		hr = 12;
	} else if (hr > 12) {
		hr = 1;
	}
	return `${value.substring(0, HR[0])}${pad(hr)}${value.substring(HR[1])}`;
}

function incMonth (value, inc) {
	let mo = parseInt(value.substring(0,2));
	mo += inc;
	if (mo > 12) {
		mo = 1;
	} else if (mo <= 0) {
		mo = 12;
	}
	return `${pad(mo)}${value.substring(2)}`;
}

function incDate (value, inc) {
	const date = dates.toDate(value);
	const max = dates.getDaysInMonth(date);
	let dt = parseInt(value.substring(3,5));
	dt += inc;
	if (dt <= 0) {
		dt = max;
	} else if (dt > max) {
		dt = 1;
	}
	return `${value.substring(0,2)}${pad(dt)}${value.substring(6)}`;
}

function incYear (value, inc) {
	let yr = parseInt(value.substring(6,10));
	yr += inc;
	return `${value.substring(0,5)}/${pad(yr)} ${value.substring(11)}`;
}

function pad (num) {
	if (num < 10) {
		return '0' + num;
	}
	return '' + num;
}

function toDateTime (value) {
	// FIXME: toTime() or to strTime() or DELETE - only used in util
	if (typeof value === 'object') {
		value = dates.format(value, 'h:m a');
	} else {
		value = stripDate(value);
	}
	const hr = getHours(value);
	const mn = getMinutes(value);
	const sc = getSeconds(value);
	if (isNaN(hr) || isNaN(mn)) {
		throw new Error('Invalid time ' + time);
	}
	const date = new Date();
	date.setHours(hr);
	date.setMinutes(mn);
	date.setSeconds(sc);
	return date;
}

function isTimeValid (value) {
	// 12:34 am
	if (value.length < 8) {
		return false;
	}
	const hr = getHours(value);
	const mn = getMinutes(value);
	if (isNaN(hr) || isNaN(mn)) {
		return false;
	}
	if (!/[ap]m/i.test(value)) {
		return false;
	}
	if (hr < 0 || hr > 12) {
		return false;
	}
	if (mn < 0 || mn > 59) {
		return false;
	}
	return true;
}

function isDateTimeValid (value) {
	// 04/10/2018 19:11 am
	if (value.length !== 19) {
		return false;
	}
	if (charCount(value, ' ') !== 2) {
		return false;
	}
	if (charCount(value, ':') !== 1) {
		return false;
	}
	if (charCount(value, '/') !== 2) {
		return false;
	}
	const date = value.substring(0, 10);
	const time = value.substring(11);
	return dates.is(date).valid() && isTimeValid(time);
}

function isDateValid(value) {
    return dates.isValid(value);
}

function charCount (str, char) {
	str = str.trim();
	let count = 0;
	for (let i = 0; i < str.length; i++) {
		if (str.charAt(i) === char) {
			count++;
		}
	}
	return count;
}

function timeIsInRange (time, min, max, date) {
	if (!min && !max) {
		return true;
	}

	if (date) {
		// first check date range, before time range
		// console.log('date.range', date, '/', min, '/', max);
		return true;
	}


	// console.log('time.range', time, '/', min, '/', max);
	const d = toDateTime(time);
	// isGreater: 1st > 2nd
	if (min && !dates.is(d).greater(toDateTime(min))) {
		return false;
	}
	if (max && !dates.is(d).less(toDateTime(max))) {
		return false;
	}

	return true;
}

function addTimeToDate (time, date) {
	if (!isTimeValid(time)) {
		//console.warn('time is not valid', time);
		return date;
	}
	let hr = getHours(time);
	const mn = getMinutes(time);
	if (/pm/i.test(time) && hr !== 12) {
		hr += 12;
	}
	date.setHours(hr);
	date.setMinutes(mn);
	return date;
}

function nextNumPos (beg, s) {
	let char, i, found = false;
	for (i = 0; i < s.length; i++) {
		if (i < beg) {
			continue;
		}
		char = s.charAt(i);
		if (!isNaN(parseInt(char))) {
			char = parseInt(char);
		}
		if (typeof char === 'number') {
			found = true;
			break;
		}
	}

	return found ? i : -1;
}

const numReg = /[0-9]/;

function isNum (k) {
	return numReg.test(k);
}

const control = {
	'Shift': 1,
	'Enter': 1,
	// 'Backspace': 1,
	'Delete': 1,
	'ArrowLeft': 1,
	'ArrowRight': 1,
	'Escape': 1,
	'Command': 1,
	'Tab': 1,
	'Meta': 1,
	'Alt': 1
};

const isArrowKey = {
	'ArrowUp': 1,
	'ArrowDown': 1
};

function isControl (e) {
	return control[e.key];
}

function timeToSeconds (value) {
	const isAM = /am/i.test(value);
	let hr = getHours(value);
	if (isAM && hr === 12) {
		hr = 0;
	} else if (!isAM && hr !== 12) {
		hr += 12;
	}
	let mn = getMinutes(value);
	const sc = getSeconds(value);
	if (isNaN(hr) || isNaN(mn)) {
		throw new Error('Invalid time ' + time);
	}
	mn *= 60;
	hr *= 3600;
	return hr + mn + sc;
}

function getHours (value) {
	return parseInt(value.substring(0, 2));
}

function getMinutes (value) {
	return parseInt(value.substring(3, 5));
}

function getSeconds (value) {
	if (value.split(':').length === 3) {
		return parseInt(value.substring(6, 8));
	}
	return 0;
}

function stripDate (str) {
	return str.replace(/\d+[\/-]\d+[\/-]\d+\s*/, '');
}

function stopEvent (e) {
	if (e.metaKey || control[e.key]) {
		return;
	}
	e.preventDefault();
	e.stopImmediatePropagation();
	return false;
}

function removeCharAtPos (str, pos) {
	return str.substring(0, pos) + str.substring(pos + 1);
}

function replaceText (str, chars, beg, end, xChars) {
	chars = chars.padEnd(end - beg, xChars);
	return str.substring(0, beg) + chars + str.substring(end);
}

function formatDate (s, mask) {
	function sub (pos) {
		let subStr = '';
		for (let i = pos; i < mask.length; i++) {
			if (mask[i] === 'X') {
				break;
			}
			subStr += mask[i];
		}
		return subStr;
	}

	s = s.replace(/(?!X)\D/g, '');
	const maskLength = mask.match(/X/g).join('').length;
	let f = '';
	const len = Math.min(s.length, maskLength);
	for (let i = 0; i < len; i++) {
		if (mask[f.length] !== 'X') {
			f += sub(f.length);
		}
		f += s[i];
	}
	return f;
}

function formatTime (s) {
	s = s.replace(/(?!X)\D/g, '');
	s = s.substring(0, 4);
	if (s.length < 4) {
		s = `0${s}`;
	}
	if (s.length >= 2) {
		s = s.split('');
		s.splice(2, 0, ':');
		s = s.join('');
	}
	return s;
}

function getAMPM (value) {
	const result = /[ap]m/.exec(value);
	return result ? result[0] : null;
}

function getMinDate (value) {
	if (value === 'now') {
		value = new Date();
	} else {
		value = dates.toDate(value);
	}
	value.setMinutes(value.getMinutes() - 2);
	return value;
}

function getMaxDate (value) {
	if (value === 'now') {
		value = new Date();
	} else {
		value = dates.toDate(value);
	}
	value.setMinutes(value.getMinutes() + 2);
	return value;
}

function getMinTime (value) {
	if (value === 'now') {
		value = new Date();
	} else {
		value = dates.toDate(value);
	}
	value.setSeconds(value.getSeconds() - 2);
	return value;
}

function getMaxTime (value) {
	if (value === 'now') {
		value = new Date();
	} else {
		value = dates.toDate(value);
	}
	value.setSeconds(value.getSeconds() + 2);
	return value;
}

function mergeTime (date, datetime) {
	return `${date.trim()} ${datetime.substring(11)}`;
}

function toDateAriaLabel(date) {
    date = dates.toDate(date);
    return dates.format(date, 'd, E MMMM yyyy');
}

function toDateTimeAriaLabel(date) {
    date = dates.toDate(date);
    return dates.format(date, 'd, E MMMM yyyy');
}

function is (value) {
	return {
		less (time) {
			return timeToSeconds(value) < timeToSeconds(time);
		},
		greater (time) {
			return timeToSeconds(value) > timeToSeconds(time);
		},
		dateAndTime () {
			return dates.is(value).date() && dates.is(value).time();
		},
		time () {
			return dates.is(value).time();
		},
		date () {
			return dates.is(value).date();
		},
		type () {
			if (this.dateAndTime()) {
				return 'datetime';
			}
			if (this.time()) {
				return 'time';
			}
			if (this.date()) {
				return 'date';
			}
			return '';
		}
	}
}

module.exports = {
	is,
	addTimeToDate,
	isTimeValid,
    isDateTimeValid,
    isDateValid,
	incMinutes,
	incHours,
	incMonth,
	incDate,
	incYear,
	round,
	pad,
	isNum,
	control,
	isArrowKey,
	isControl,
	stopEvent,
	nextNumPos,
	removeCharAtPos,
	replaceText,
	formatDate,
	formatTime,
	getAMPM,
	getMinDate,
	getMaxDate,
    toDateAriaLabel,
    toDateTimeAriaLabel,
	getMinTime,
	getMaxTime,
	timeIsInRange,
	toDateTime,
	timeToSeconds,
	stripDate,
	charCount,
	mergeTime
};
