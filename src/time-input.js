const BaseComponent = require('@clubajax/base-component');
const dom = require('@clubajax/dom');
const on = require('@clubajax/on');
const dates = require('dates');
const util = require('./util');

const defaultPlaceholder = 'HH:MM am/pm';
const defaultMask = 'XX:XX';
const props = ['label', 'name', 'placeholder', 'mask', 'min', 'max'];
const bools = ['required'];

const FLASH_TIME = 1000;

class TimeInput extends BaseComponent {
	static get observedAttributes () {
		return [...props, ...bools, 'value'];
	}

	get props () {
		return props;
	}

	get bools () {
		return bools;
	}

	attributeChanged (name, value) {
		// need to manage value manually
		if (name === 'value') {
			this.value = value;
		}
	}

	set value (value) {
		this.strDate = value; //isValid(value) ? value : '';
		onDomReady(this, () => {
			this.setValue(this.strDate);
		});
	}

	get value () {
		return this.strDate;
	}

	onLabel (value) {
		this.labelNode.innerHTML = value;
	}

	onMin (value) {

	}

	onMax (value) {

	}

	get templateString () {
		return `
<label>
	<span ref="labelNode"></span>
	<input ref="input" class="empty" />
</label>`;
	}

	constructor () {
		super();
	}

	isValid (value) {
		if(!value && !this.required){
			return true;
		}
		return util.timeIsValid(this.input.value);
	}

	setValue (value, silent, ampm) {

		if (ampm) {
			this.setAMPM(value, ampm);
		}
		value = this.format(value);

		console.log('setValue', value);
		this.typedValue = value;
		this.input.value = value;
		const len = this.input.value.length === this.mask.length;
		let valid;
		if (len) {
			valid = util.isValid(value);
		} else {
			valid = false;
		}

		if (valid || !len) {
			this.strDate = value;
			if (!silent) {
				this.emit('change', { value: value });
			}
		}

		if (valid) {
			this.classList.remove('invalid')
		} else if (!silent) {
			this.classList.add('invalid')
		}
	}

	xformat (s) {
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

		s = s.replace(/\D/g, '').substring(0,4);

		console.log('fmt', s);

		const mask = this.mask;
		let f = '';
		const len = Math.max(s.length, mask.length);
		for (let i = 0; i < len; i++) {
			if (mask[f.length] !== 'X') {
				f += sub(f.length);
			}
			f += s[i];
		}

		return this.setAMPM(f);

		// const defaultMask = 'XX:XX pm';
	}

	format (s) {
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
			this.setValidity();
			this.emit('change', { value: this.value });
		}

		if(k === 'Escape'){
			if(!this.isValid()){
				this.value = this.strDate;
				this.input.blur();
			}
		}

		function setSelection (amt) {
			if (end - beg) {
				e.target.selectionEnd = end - (end - beg - 1);
			} else {
				e.target.selectionEnd = end + amt;
			}
		}

		if (isControl(e)) {
			stopEvent(e);
			return;
		}

		if (!isNum(k)) {
			// TODO handle paste, backspace
			if (isArrowKey[k]) {
				const inc = k === 'ArrowUp' ? 1 : -1;
				if (end <= 2) {
					this.setValue(util.incHours(this.input.value, inc), true);
				} else if (end <= 5) {
					this.setValue(util.incMinutes(this.input.value, inc, 15), true);
				} else {
					this.setValue(this.input.value, true, this.isAM ? 'pm' : 'am');
				}
			}

			if (/[ap]/.test(k)) {
				console.log('am/m...');
				this.setValue(this.input.value, true, k === 'a' ? 'am' : 'pm');
			}  else if (this.input.value !== this.typedValue) {
				console.log('do WUT?');
				this.setValue(this.input.value, true);
			}
			setSelection(0);
			stopEvent(e);
			return;
		}

		if (str.length !== end || beg !== end) {
			console.log('middle', beg);
			// handle selection or middle-string edit
			const temp = this.typedValue.substring(0, beg) + k + this.typedValue.substring(end);
			this.setValue(temp, true);

			// "2" means typed right before colon
			setSelection(beg === 2 ? 2 : 1);
			stopEvent(e);
			return;
		}

		this.setValue(str + k, true);
	}

	focus () {
		onDomReady(this, () => {
			this.input.focus();
		});
	}

	setValidity () {
		console.log('setValidity');
		if (this.isValid(this.input.value)) {
			this.classList.remove('invalid');
		} else {
			this.classList.add('invalid');
		}
	}

	domReady () {
		this.mask = this.mask || defaultMask;
		this.maskLength = this.mask.match(/X/g).join('').length;
		this.input.setAttribute('type', 'text');
		this.input.setAttribute('placeholder', this.placeholder || defaultPlaceholder);
		if (this.name) {
			this.input.setAttribute('name', this.name);
		}
		if (this.label) {
			this.labelNode.innerHTML = this.label;
		}
		this.connectKeys();
	}

	connectKeys () {
		this.on(this.input, 'keydown', stopEvent);
		this.on(this.input, 'keypress', stopEvent);
		this.on(this.input, 'keyup', (e) => {
			this.onKey(e);
		});
		this.on(this.input, 'blur', this.setValidity.bind(this));
	}
}



const numReg = /[0-9]/;
function isNum (k) {
	return numReg.test(k);
}

const isArrowKey = {
	'ArrowUp': 1,
	'ArrowDown': 1
};

function isControl (e) {
	// console.log('e', e);
	return control[e.key];
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
function stopEvent (e) {
	if (e.metaKey || control[e.key]) {
		return;
	}
	e.preventDefault();
	e.stopImmediatePropagation();
}

function pad (num) {
	if (num < 10) {
		return '0' + num;
	}
	return '' + num;
}

customElements.define('time-input', TimeInput);

module.exports = TimeInput;