const util = require('./util');

function onKey (e) {
	let str = this.typedValue || '';
	const beg = e.target.selectionStart;
	const end = e.target.selectionEnd;
	const k = e.key;

	if (k === 'Enter') {
		if (this.hide) {
			this.hide();
		}
		this.emit('change', { value: this.value });
	}

	if (k === 'Escape') {
		if (!this.isValid()) {
			this.value = this.strDate;
			this.hide();
			this.input.blur();
		}
	}

	if (util.isControl(e)) {
		util.stopEvent(e);
		return;
	}

	function setSelection (pos) {
		e.target.selectionEnd = pos;
	}

	if (!util.isNum(k)) {
		// handle paste, backspace
		if (this.input.value !== this.typedValue) {
			this.setValue(this.input.value, true);
		}

		const value = this.input.value;
		const type = util.is(value).type();

		if (util.isArrowKey[k]) {

			// FIXME: test is not adding picker time
			// 12/12/2017 06:30 am'
			const inc = k === 'ArrowUp' ? 1 : -1;
			if (/time/.test(type)) {
				const HR = type === 'time' ? [0,2] : [11,13];
				const MN = type === 'time' ? [3,5] : [14,16];
				if (end >= HR[0] && end <= HR[1]) {
					this.setValue(util.incHours(value, inc), true);
				} else if (end >= MN[0] && end <= MN[1]) {
					this.setValue(util.incMinutes(value, inc, 15), true);
				} else if (type === 'time' || beg > 16) {
					this.setValue(value.replace(/([ap]m)/i, str => /a/i.test(str) ? 'pm' : 'am' ), true);
				}
			}

			if (/date/.test(type)) {
				if (end <= 2 ) {
					this.setValue(util.incMonth(value, inc), true);
				} else if (end < 5) {
					this.setValue(util.incDate(value, inc), true);
				} else if (end < 11) {
					this.setValue(util.incYear(value, inc), true);
				}
			}

		} else if (/[ap]/i.test(k) && /time/.test(type)) {
			this.setValue(this.setAMPM(value, k === 'a' ? 'am' : 'pm'), true);
		}

		setSelection(beg);
		util.stopEvent(e);
		return;
	}
	if (str.length !== end && beg === end) {
		// handle selection or middle-string edit
		let temp = this.typedValue.substring(0, beg) + k + this.typedValue.substring(end);
		const nextCharPos = util.nextNumPos(beg + 1, temp);
		if (nextCharPos > -1) {
			temp = util.removeCharAtPos(temp, beg + 1);
		}

		const value = this.setValue(temp, true);
		const nextChar = str.charAt(beg + 1);

		setSelection(/[\s\/:]/.test(nextChar) ? beg + 2 : beg + 1);
		util.stopEvent(e);
		return;

	} else if (end !== beg) {
		// selection replace
		let temp = util.replaceText(this.typedValue, k, beg, end, 'X');
		const value = this.setValue(temp, true);

		setSelection(beg + 1);
		util.stopEvent(e);
		return;
	}


	this.setValue(str + k, true);
}

module.exports = onKey;