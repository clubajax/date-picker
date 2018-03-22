const DateInput = require('./date-input');

class DateTimeInput extends DateInput {
	constructor () {
		super();
		this.hasTime = true;
	}

	onKey (e) {
		console.log('MY KEY', e.key);
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

		function setSelection (amt) {
			// TODO
			// This might not be exactly right...
			// have to allow for the slashes
			if (end - beg) {
				e.target.selectionEnd = end - (end - beg - 1);
			} else {
				e.target.selectionEnd = end + amt;
			}
		}

		if (!isNum(k)) {
			// handle paste, backspace
			if (this.input.value !== this.typedValue) {
				this.setValue(this.input.value, true);
			}
			setSelection(0);
			stopEvent(e);
			return;
		}
		if (str.length !== end || beg !== end) {
			// handle selection or middle-string edit
			const temp = this.typedValue.substring(0, beg) + k + this.typedValue.substring(end);
			this.setValue(this.format(temp), true);

			setSelection(1);
			stopEvent(e);
			return;
		}

		this.setValue(this.format(str + k), true);
	}

}

customElements.define('date-time-input', DateTimeInput);

module.exports = DateTimeInput;