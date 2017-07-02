require('BaseComponent/src/properties');
require('BaseComponent/src/template');
require('BaseComponent/src/refs');
const BaseComponent = require('BaseComponent');
const dates = require('dates');

const defaultPlaceholder = 'MM/DD/YYYY';
const props = ['label', 'name', 'type', 'placeholder', 'value'];
const bools = [];

class CustomInput extends BaseComponent {

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
		`;
	}

	constructor () {
		super();
	}

	setValue (value) {
		this.typedValue = value;
		this.input.value = value;
		let valid;
		if (this.input.value.length === 10) {
			valid = dates.isValid(value);
		} else {
			valid = true;
		}
		dom.classList.toggle(this, 'invalid', !valid);
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

	domReady () {
		this.labelNode.innerHTML = this.label || '';
		this.input.setAttribute('type', 'text');
		this.input.setAttribute('placeholder', this.placeholder || defaultPlaceholder);
		this.on(this.input, 'keydown', stopEvent);
		this.on(this.input, 'keypress', stopEvent);
		this.on(this.input, 'keyup', this.onKey.bind(this));

	}
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
};
function stopEvent (e) {
	if(control[e.key]){
		return;
	}
	e.preventDefault();
	e.stopImmediatePropagation();
}

customElements.define('custom-input', CustomInput);

module.exports = CustomInput;