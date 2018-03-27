function round (n, r, down) {
	return (Math.ceil(n / r) * r) - (down ? r : 0);
}

function incMinutes (value, inc, mult = 1) {
	let mn = parseInt(value.substring(3, 5));
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

	return `${value.substring(0, 3)}${pad(mn)}${value.substring(5)}`;
}

function incHours (value, inc) {
	let hr = parseInt(value.substring(0, 2));
	hr += inc;
	if (hr < 1) {
		hr = 12;
	} else if (hr > 12) {
		hr = 1;
	}
	return `${pad(hr)}${value.substring(2)}`;
}

function pad (num) {
	if (num < 10) {
		return '0' + num;
	}
	return '' + num;
}

function toDateTime (value) {
	// FIXME: toTime() or to strTime()
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

function timeIsValid (value) {
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

function timeIsInRange (time, min, max, date) {
	if (!min && !max) {
		return true;
	}

	if (date) {
		// first check date range, before time range
		console.log('date.range', date, '/', min, '/', max);
		return true;
	}


	console.log('time.range', time, '/', min, '/', max);
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
	if (!timeIsValid(time)) {
		console.warn('time is not valid', time);
		return date;
	}
	let hr = getHours(time);
	const mn = getMinutes(time);
	const isPM = /pm/i.test(time);
	if (isPM && hr !== 12) {
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

	console.log(char);
	return found ? i : -1;
}

const numReg = /[0123456789]/;

function isNum (k) {
	return numReg.test(k);
}

const control = {
	'Shift': 1,
	'Enter': 1,
	'Backspace': 1,
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
	value.setHours(0);
	value.setMinutes(0);
	value.setSeconds(0);
	value.setMilliseconds(0);
	return value;
}

function getMaxDate (value) {
	if (value === 'now') {
		value = new Date();
	} else {
		value = dates.toDate(value);
	}
	value.setHours(23);
	value.setMinutes(59);
	value.setSeconds(59);
	value.setMilliseconds(999);
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

function toAriaLabel (date) {
	return dates.format(date, 'd, E MMMM yyyy');
}

function isSameDate (d1, d2) {
	// TODO: move to @dates
	// or as: compare(d1, d2, 'year,month,date')?
	return d1.getFullYear() === d2.getFullYear() &&
		d1.getMonth() === d2.getMonth() &&
		d1.getDate() === d2.getDate();
}

function is (time1) {
	return {
		less (time2) {
			return timeToSeconds(time1) < timeToSeconds(time2);
		},
		greater (time2) {
			return timeToSeconds(time1) > timeToSeconds(time2);
		}
	}
}

module.exports = {
	is,
	addTimeToDate,
	timeIsValid,
	incMinutes,
	incHours,
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
	toAriaLabel,
	getMinTime,
	getMaxTime,
	timeIsInRange,
	toDateTime,
	isSameDate,
	timeToSeconds
};
