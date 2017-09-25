const BaseComponent = require('@clubajax/base-component');
require('./date-input');
const dates = require('dates');
const dom = require('@clubajax/dom');

const props = ['left-label', 'right-label', 'name', 'placeholder'];
const bools = ['range-expands', 'required'];

const DELIMITER = ' - ';

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

	set value (value) {
		if(!this.isValid(value)){
			console.error('Invalid dates', value);
			return;
		}
		onDomReady(this, () => {
			const ds = value.split(/\s*-\s*/);
			this.isBeingSet = true;
			this.leftInput.value = ds[0];
			this.rightInput.value = ds[1];
			this.isBeingSet = false;
		});
	}

	get value () {
		if(!this.leftInput.value || !this.rightInput.value){
			return null;
		}
		return `${this.leftInput.value}${DELIMITER}${this.rightInput.value}`;
	}

	attributeChanged (prop, value) {
		if(prop === 'value'){
			this.value = value;
		}
	}

	get values () {
		return {
			start: this.leftInput.value,
			end: this.leftInput.value
		};
	}

	constructor () {
		super();
		this.fireOwnDomready = true;
		this.mask = 'XX/XX/XXXX';
	}

	isValid (value) {
		const ds = value.split(/\s*-\s*/);
		return dates.isDate(ds[0]) && dates.isDate(ds[1]);
	}

	emitEvent () {
		clearTimeout(this.debounce);
		this.debounce = setTimeout(() => {
			const value = this.value;
			if (this.isValid(value)) {
				this.emit('change', { value });
			}
		}, 100);
	}

	connected () {
		this.leftInput = dom('date-input', { label: this['left-label'], required: this.required, placeholder: this.placeholder }, this);
		this.rightInput = dom('date-input', { label: this['right-label'], required: this.required, placeholder: this.placeholder }, this);

		this.leftInput.on('change', (e) => {
			const changesDate = dates.toDate(this.rightInput.value) < dates.toDate(e.value);
			console.log('set it');
			if (!this.rightInput.value || changesDate){
				this.rightInput.setValue(e.value, true, true);
				if (changesDate) {
					this.rightInput.flash(true);
				} else if (!this.isBeingSet) {
					this.rightInput.focus();
				}
			} else {
				this.emitEvent();
			}
			e.stopPropagation();
			e.preventDefault();
			return false;
		});

		this.rightInput.on('change', (e) => {
			const changesDate = dates.toDate(this.leftInput.value) > dates.toDate(e.value);
			if (!this.leftInput.value || changesDate){
				this.leftInput.setValue(e.value, true, true);
				if (changesDate) {
					this.leftInput.flash(true);
				} else if (!this.isBeingSet) {
					this.leftInput.focus();
				}
			} else {
				this.emitEvent();
			}
			e.stopPropagation();
			e.preventDefault();

			return false;
		});

		onDomReady([this.leftInput, this.rightInput], () => {
			this.fire('domready');
		});
		this.connected = function () {};
	}

	domReady () {

	}
}

customElements.define('date-range-inputs', DateRangeInputs);

module.exports = DateRangeInputs;