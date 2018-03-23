const util = require('./util');

function onKey (e) {
	let str = this.typedValue || '';
	const beg = e.target.selectionStart;
	const end = e.target.selectionEnd;
	const k = e.key;

	if(k === 'Enter'){
		this.hide();
		this.emit('change', { value: this.value });
	}

	if(k === 'Escape'){
		if(!this.isValid()){
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

		if (/[ap]/.test(k)) {
			this.setValue(this.setAMPM(this.input.value, k === 'a' ? 'am' : 'pm'), true);
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
		const nextChar = value.charAt(beg + 1);

		setSelection(/[\s\/:]/.test(nextChar) ? beg + 2 : beg + 1);
		util.stopEvent(e);
		return;
	} else if (end !== beg) {
		console.log('sel');
		// selection replace
		let temp = util.replaceText(this.typedValue, k, beg, end, 'X');
		console.log('temp');
		const value = this.setValue(temp, true);

		setSelection(beg + 1);
		util.stopEvent(e);
		return;
	}

	this.setValue(str + k, true);
}

module.exports = onKey;