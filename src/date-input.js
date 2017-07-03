require('./date-picker');
const BaseComponent = require('BaseComponent');
const dates = require('dates');

const defaultPlaceholder = 'MM/DD/YYYY';
const props = ['label', 'name', 'type', 'placeholder', 'value'];
const bools = [];

class DateInput extends BaseComponent {

	static get observedAttributes () {
		return [...props, ...bools];
	}

	get props () {
		return props;
	}

	get bools () {
		return bools;
	}

	set value (value) {
		// might need attributeChanged
		this.strDate = dates.isDateType(value) ? value : '';
		onDomReady(this, () => {
			this.setValue(this.strDate);
		});
	}

	onValue (value) {
		this.strDate = dates.isDateType(value) ? value : '';
		this.setValue(this.strDate);
	}

	get value () {
		return this.strDate;
	}
	
	get templateString () {
		return `
<label>
	<span ref="labelNode"></span>
	<input ref="input" />
	
</label>
<date-picker ref="picker" tabindex="0"></date-picker>`;
	}

	constructor () {
		super();
		this.showing = false;
	}

	setValue (value) {
		this.typedValue = value;
		this.input.value = value;
		const len = this.input.value.length === 10;
		let valid;
		if (len) {
			valid = dates.isValid(value);
		} else {
			valid = true;
		}
		dom.classList.toggle(this, 'invalid', !valid);
		if(valid && len){
			this.emit('change', {value: value});
		}
	}

	onKey (e) {
		let str = this.typedValue;
		const k = e.key;
		if(control[k]){
			if(k === 'Backspace'){
				// TODO: check Delete key
				this.setValue(this.input.value);
			}
			return;
		}
		if(!isNum(k)){
			stopEvent(e);
			return;
		}
		switch(str.length){
			case 0:
			case 1:
			case 3:
			case 4:
			case 6:
			case 7:
			case 8:
			case 9:
				str += k;
				break;
			case 2:
			case 5:
				str += '/' + k;
		}
		this.setValue(str);
	}

	show () {
		if(this.showing){
			return;
		}
		this.showing = true;
		this.picker.style.display = 'block';
	}

	hide () {
		if(!this.showing){
			return;
		}
		this.showing = false;
		this.picker.style.display = '';
	}

	domReady () {
		//this.setAttribute('tabindex', '0');
		this.labelNode.innerHTML = this.label || '';
		this.input.setAttribute('type', 'text');
		this.input.setAttribute('placeholder', this.placeholder || defaultPlaceholder);
		this.on(this.input, 'keydown', stopEvent);
		this.on(this.input, 'keypress', stopEvent);
		this.on(this.input, 'keyup', this.onKey.bind(this));
		// this.on('focus', this.show.bind(this));
		// this.on('blur', this.hide.bind(this));

		// look up how I did it in alloy

		//this.on(this.input, 'focus', this.show.bind(this));
		//this.on(this.input, 'blur', this.hide.bind(this));

		handleOpen(this.input, this.picker, this.show.bind(this), this.hide.bind(this))
	}
}

function handleOpen (input, picker, show, hide) {
	let inputFocus = false;
	let pickerFocus = false;
	const docHandle = on(document, 'keyup', (e) => {
		if(e.key === 'Escape'){
			hide();
		}
	});
	docHandle.pause();
	return on.makeMultiHandle([
		on(input, 'focus', () => {
			inputFocus = true;
			show();
			docHandle.resume();
		}),
		on(input, 'blur', () => {
			inputFocus = false;
			setTimeout(() => {
				if(!pickerFocus){
					hide();
					docHandle.pause();
				}
			}, 100);
		}),
		on(picker, 'focus', () => {
			pickerFocus = true;
			show();
			docHandle.resume();
		}),
		on(picker, 'blur', () => {
			pickerFocus = false;
			setTimeout(() => {
				if(!inputFocus){
					hide();
					docHandle.pause();
				}
			}, 100);

		})
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
	if(control[e.key]){
		return;
	}
	e.preventDefault();
	e.stopImmediatePropagation();
}

customElements.define('date-input', DateInput);

module.exports = DateInput;