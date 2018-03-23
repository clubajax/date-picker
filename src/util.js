function round(n, r, down) {
	return (Math.ceil( n / r ) * r) - (down ? r : 0);
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

function getHours (value) {
	return parseInt(value.substring(0, 2));
}

function getMinutes (value) {
	return parseInt(value.substring(3, 5));
}

function stopEvent (e) {
	if (e.metaKey || control[e.key]) {
		return;
	}
	e.preventDefault();
	e.stopImmediatePropagation();
}

module.exports = {
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
	stopEvent
};
