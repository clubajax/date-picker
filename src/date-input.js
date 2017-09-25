require('./date-picker');
const BaseComponent = require('@clubajax/base-component');
const dates = require('dates');

const defaultPlaceholder = 'MM/DD/YYYY';
const defaultMask = 'XX/XX/XXXX';
const props = ['label', 'name', 'placeholder', 'mask', 'min', 'max'];
const bools = ['required'];

const FLASH_TIME = 1000;

class DateInput extends BaseComponent {

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
		this.strDate = dates.isValid(value) ? value : '';
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
		const d = dates.toDate(value);
		this.minDate = d;
		this.minInt = d.getTime();
		this.picker.min = value;
	}

	onMax (value) {
		const d = dates.toDate(value);
		this.maxDate = d;
		this.maxInt = d.getTime();
		this.picker.max = value;
	}


	get templateString () {
		return `
<label>
	<span ref="labelNode"></span>
	<input ref="input" class="empty" />
	
</label>
<date-picker ref="picker" tabindex="0"></date-picker>`;
	}

	constructor () {
		super();
		this.showing = false;
	}

	isValid (value) {
		if(!value && !this.required){
			return true;
		}
		return dates.isDate(this.input.value);
	}

	setValue (value, silent, noHide) {
		this.typedValue = value;
		this.input.value = value;
		const len = this.input.value.length === this.mask.length;
		let valid;
		if (len) {
			valid = dates.isValid(value);
		} else {
			valid = false;
		}

		if (valid || !len) {
			this.strDate = value;
			this.picker.value = value;
			if (!silent) {
				this.emit('change', { value: value });
			}
		}

		if (valid) {
			this.classList.remove('invalid')
		} else if (!silent) {
			this.classList.add('invalid')
		}

		if (!silent && valid) {
			setTimeout(this.hide.bind(this), 300);
		}
	}

	format (s) {
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

		s = s.replace(/\D/g, '');
		const mask = this.mask;
		let f = '';
		const len = Math.min(s.length, this.maskLength);
		for (let i = 0; i < len; i++) {
			if (mask[f.length] !== 'X') {
				f += sub(f.length);
			}
			f += s[i];
		}
		return f;
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

	flash (addFocus) {
		this.classList.add('warning');
		setTimeout(() => {
			this.classList.remove('warning');
		}, FLASH_TIME);

		if(addFocus){
			this.focus();
		}
	}

	show () {
		if (this.showing) {
			return;
		}
		this.showing = true;
		this.picker.classList.add('show');

		window.requestAnimationFrame(() => {
			const win = dom.box(window);
			const box = dom.box(this.picker);
			if (box.x + box.w > win.h) {
				this.picker.classList.add('right-align');
			}
			if (box.y + box.h > win.h) {
				this.picker.classList.add('bottom-align');
			}
		});
	}

	hide () {
		if (!this.showing || window.keepPopupsOpen) {
			return;
		}
		this.showing = false;
		dom.classList.remove(this.picker, 'right-align bottom-align show');
		dom.classList.toggle(this, 'invalid', !this.isValid());
	}

	focus () {
		onDomReady(this, () => {
			this.input.focus();
		});
	}

	domReady () {
		this.mask = this.mask || defaultMask;
		this.maskLength = this.mask.match(/X/g).join('').length;
		this.input.setAttribute('type', 'text');
		this.input.setAttribute('placeholder', this.placeholder || defaultPlaceholder);
		this.picker.on('change', (e) => {
			this.setValue(e.value, true);
		});
		this.connectKeys();
		this.registerHandle(handleOpen(this.input, this.picker, this.show.bind(this), this.hide.bind(this)));
	}

	connectKeys () {
		this.on(this.input, 'keydown', stopEvent);
		this.on(this.input, 'keypress', stopEvent);
		this.on(this.input, 'keyup', (e) => {
			this.onKey(e);
		});
	}
}

function handleOpen (input, picker, show, hide) {
	let inputFocus = false;
	let pickerFocus = false;
	const docHandle = on(document, 'keyup', (e) => {
		if (e.key === 'Escape') {
			hide();
		}
	});
	docHandle.pause();
	const changeHandle = on(picker, 'change', () => {
		if (!inputFocus) {
			setTimeout(() => {
				hide();
				docHandle.pause();
				changeHandle.pause();
			}, 100);
		}
	});
	changeHandle.pause();

	return on.makeMultiHandle([
		on(input, 'focus', () => {
			inputFocus = true;
			show();
			docHandle.resume();
		}),
		on(input, 'blur', () => {
			inputFocus = false;
			setTimeout(() => {
				if (!pickerFocus) {
					hide();
					docHandle.pause();
				}
			}, 100);
		}),
		on(picker, 'focus', () => {
			pickerFocus = true;
			show();
			docHandle.resume();
			changeHandle.resume();
		}),
		on(picker, 'blur', () => {
			pickerFocus = false;
			setTimeout(() => {
				if (!inputFocus) {
					hide();
					docHandle.pause();
					changeHandle.pause();
				}
			}, 100);

		}),
		changeHandle,
		docHandle
	]);
}

const numReg = /[0123456789]/;
function isNum (k) {
	return numReg.test(k);
}

const control = {
	'Enter': 1,
	'Backspace': 1,
	'Delete': 1,
	'ArrowLeft': 1,
	'ArrowRight': 1,
	'Escape': 1,
	'Command': 1,
	'Tab': 1
};
function stopEvent (e) {
	if (e.metaKey || control[e.key]) {
		return;
	}
	e.preventDefault();
	e.stopImmediatePropagation();
}

customElements.define('date-input', DateInput);

module.exports = DateInput;