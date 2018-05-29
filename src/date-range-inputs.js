const BaseComponent = require('@clubajax/base-component');
require('./date-input');
const dates = require('@clubajax/dates');
const dom = require('@clubajax/dom');

const DELIMITER = ' - ';

class DateRangeInputs extends BaseComponent {

	set value (value) {
		this.setValue(value);
	}

	get value () {
		if (!this.leftInput.value || !this.rightInput.value) {
			return null;
		}
		return `${this.leftInput.value}${DELIMITER}${this.rightInput.value}`;
	}

	attributeChanged (prop, value) {
		if (prop === 'value') {
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
		if (!value) {
			return true; // TODO: required
		}
		const ds = value.split(/\s*-\s*/);
		return dates.isDate(ds[0]) && dates.isDate(ds[1]);
	}

	setValue (value, silent) {
		if (!this.isValid(value)) {
			console.error('Invalid dates', value);
			return;
		}
		onDomReady(this, () => {
			const ds = value ? value.split(/\s*-\s*/) : ['', ''];
			this.isBeingSet = true;
			this.leftInput.setValue(ds[0], silent);
			this.rightInput.setValue(ds[1], silent);
			this.isBeingSet = false;
		});
	}

	clear (silent) {
		this.leftInput.setValue('', true);
		this.rightInput.setValue('', true);
		if (!silent) {
			this.emit('change', { value: null });
		}
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
		this.leftInput = dom('date-input', {
			label: this['left-label'],
			required: this.required,
			placeholder: this.placeholder
		}, this);
		this.rightInput = dom('date-input', {
			label: this['right-label'],
			required: this.required,
			placeholder: this.placeholder
		}, this);

		this.leftInput.on('change', (e) => {
			const changesDate = dates.toDate(this.rightInput.value) < dates.toDate(e.value);
			if (!this.rightInput.value || changesDate) {
				if (e.value) {
					this.rightInput.setValue(e.value, true, true);
				}
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
			if (!this.leftInput.value || changesDate) {
				if (e.value) {
					this.leftInput.setValue(e.value, true, true);
				}
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

module.exports = BaseComponent.define('date-range-inputs', DateRangeInputs, {
	bools: ['range-expands', 'required'],
	props: ['left-label', 'right-label', 'name', 'placeholder'],
	attrs: ['value']
});