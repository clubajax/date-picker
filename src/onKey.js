const util = require('./util');

function onKey (e, type) {
	let str = this.typedValue || '';
	const beg = e.target.selectionStart;
	const end = e.target.selectionEnd;
    const k = e.key;

	if (k === 'Enter') {
		const valid = this.validate();
		if (valid) {
			if (this.hide) {
				this.hide();
			}
			this.emit('change', { value: this.value });
		}
	}

	if (k === 'Escape') {
		this.blur();
    }

    // if (k === 'Backspace') {
    //     // this.blur();
    //     return true;
    // }
    
    

    if (util.isControl(e)) {
		util.stopEvent(e);
		return;
	}

	function setSelection (pos) {
		e.target.selectionEnd = pos;
	}

    if (!util.isNum(k)) {
		let value = this.input.value;

		// handle paste, backspace
		if (type === 'datetime' && k === ' ' && util.charCount(value, ' ') !== 2) {
			// insert missing space
			this.typedValue = '';
			value = value.replace(' ', '');
			this.setValue(`${value.substring(0, 10)} ${value.substring(10, 15)} ${value.substring(15)}`, true);
			setSelection(11);
			util.stopEvent(e);
			return;

		} else if (value !== this.typedValue) {
			// console.log('not typed');
			this.setValue(value, true);
		}

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
		} else {
			//console.log('CHAR IS', k);
		}

		setSelection(beg);
		util.stopEvent(e);
		return;
	}

    if (str.length !== end && beg === end) {
		// handle selection or middle-string edit
		let temp = this.typedValue.substring(0, beg) + k + this.typedValue.substring(end + 1);
		const nextCharPos = util.nextNumPos(beg + 1, temp);
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
