const BaseComponent = require('BaseComponent');
require('./date-input');
const dates = require('dates');
const dom = require('dom');

const props = ['left-label', 'right-label', 'name', 'placeholder'];
const bools = ['range-expands'];

class DateRangeInputs extends BaseComponent {

	static get observedAttributes () {
		return [...props, ...bools, 'value'];
	}

	get props () {
		return props;
	}

	get bools () {
		return bools;
	}

	constructor () {
		super();
		this.mask = 'XX/XX/XXXX'
	}

	isValid (value) {
		const ds = value.split(/\s*-\s*/);
		return dates.isDate(ds[0]) && dates.isDate(ds[1]);
	}

	domReady () {
		this.leftInput = dom('date-input', { label: this['left-label'] }, this);
		this.rightInput = dom('date-input', { label: this['right-label'] }, this);

		this.leftInput.on('change', (e) => {
			//this.rightInput.min = e.value;
			const changesDate = dates.toDate(this.rightInput.value) < dates.toDate(e.value);
			if (!this.rightInput.value || changesDate){
				this.rightInput.value = e.value;
				if (changesDate) {
					this.rightInput.flash();
				}
			}
		});

		this.rightInput.on('change', (e) => {
			//this.leftInput.max = e.value;
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