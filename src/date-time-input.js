const DateInput = require('./date-input');
const util = require('./util');

class DateTimeInput extends DateInput {
	constructor () {
		super();
		this.hasTime = true;
	}

	domReady () {
		this.mask = 'XX/XX/XXXX XX:XX pm';
		super.domReady();
	}

	formatDate (s) {
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
		const mask = 'XX/XX/XXXX';
		let f = '';
		const len = 8; //Math.min(s.length, mask.length);
		//const len = mask.length;
		for (let i = 0; i < len; i++) {
			if (mask[f.length] !== 'X') {
				f += sub(f.length);
			}
			f += s[i] || 'X';
		}
		return f;
	}

	formatTime (s) {
		s = s.replace(/\D/g, '');
		s = s.substring(0, 4);
		if (s.length >= 2) {
			s = s.split('');
			s.splice(2, 0, ':');
			s = s.join('');
		}
		if (s.length === 5) {
			s = this.setAMPM(s);
		}
		return s;
	}

	format (s) {
		console.log('fmt', s);
		const parts = s.split(' ');
		const dateStr = parts[0] || '';
		const timeStr = `${parts[1] || ''} ${parts[2] || ''}`;
		const date = this.formatDate(dateStr);
		const time = this.formatTime(timeStr);
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

	onKey (e) {
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
			setSelection(0);
			util.stopEvent(e);
			return;
		}

		if (str.length !== end && beg === end) {
			console.log('mid edit', beg, end, str.length);
			// handle selection or middle-string edit
			let temp = this.typedValue.substring(0, beg) + k + this.typedValue.substring(end);
			const nextCharPos = util.nextNumPos(beg + 1, temp);
			if (nextCharPos > -1) {
				console.log('before', temp);
				temp = util.removeCharAtPos(temp, beg + 1);
				console.log('after', temp);
			}


			const value = this.setValue(temp, true);

			const nextChar = value.charAt(beg + 1);
			console.log('nextChar', nextChar);

			setSelection(/[\s\/:]/.test(nextChar) ? beg + 2 : beg + 1);
			util.stopEvent(e);
			return;
		} else if (end !== beg) {
			// selection replace
			console.log('sel text', k);
			let temp = util.replaceText(this.typedValue, k, beg, end, 'X');
			const value = this.setValue(temp, true);

			setSelection(beg + 1);
			util.stopEvent(e);
			return;
		}

		console.log('end edit');
		this.setValue(str + k, true);
	}

}

customElements.define('date-time-input', DateTimeInput);

module.exports = DateTimeInput;