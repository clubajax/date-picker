const BaseComponent = require('@clubajax/base-component');
require('./date-input');
const dates = require('dates');
const dom = require('@clubajax/dom');

const props = ['left-label', 'right-label', 'name', 'placeholder', 'value'];
const bools = ['range-expands', 'required'];

class DateRangeInputs extends BaseComponent {

	static get observedAttributes () {
		return [...props, ...bools];
	}

	get props () {
		return props;
	}

	get bools () {
		return bools;
	}

	onValue (value) {
		if(!this.isValid(value)){
			console.error('Invalid dates', value);
			return;
		}
		const ds = value.split(/\s*-\s*/);
		this.leftInput.value = ds[0];
		this.rightInput.value = ds[1];
	}

	constructor () {
		super();
		this.mask = 'XX/XX/XXXX';
	}

	isValid (value) {
		const ds = value.split(/\s*-\s*/);
		return dates.isDate(ds[0]) && dates.isDate(ds[1]);
	}

	domReady () {
		this.leftInput = dom('date-input', { label: this['left-label'], required: this.required, placeholder: this.placeholder }, this);
		this.rightInput = dom('date-input', { label: this['right-label'], required: this.required, placeholder: this.placeholder }, this);

		this.leftInput.on('change', (e) => {
			const changesDate = dates.toDate(this.rightInput.value) < dates.toDate(e.value);
			if (!this.rightInput.value || changesDate){
				this.rightInput.value = e.value;
				if (changesDate) {
					this.rightInput.flash();
				}
			}
		});

		this.rightInput.on('change', (e) => {
			const changesDate = dates.toDate(this.leftInput.value) > dates.toDate(e.value);
			if (!this.leftInput.value || changesDate){
				this.leftInput.value = e.value;
				if (changesDate) {
					this.leftInput.flash();
				}
			}
		});
	}
}

customElements.define('date-range-inputs', DateRangeInputs);

module.exports = DateRangeInputs;