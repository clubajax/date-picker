const BaseComponent = require('@clubajax/base-component');
const dom = require('@clubajax/dom');
const on = require('@clubajax/on');
const dates = require('@clubajax/dates');
const util = require('./util');
const onKey = require('./onKey');
const isValid = require('./isValid');

const defaultPlaceholder = 'HH:MM am/pm';
const defaultMask = 'XX:XX';
const EVENT_NAME = 'change';


class TimeInput extends BaseComponent {

	attributeChanged (name, value) {
		// need to manage value manually
		if (name === 'value') {
			this.value = value;
		}
	}

	set value (value) {
		if (dates.isValidObject(value)) {
			// this.orgDate = value;
			// this.setDate(value);
			value = dates.format(value, 'h:m a');
			this.setAMPM(value);
		}
		this.strDate = util.stripDate(value);
		onDomReady(this, () => {
			this.setValue(this.strDate);
		});
	}

	get value () {
		return this.strDate;
	}

	get valid () {
		return this.isValid();
	}

	onLabel (value) {
		this.labelNode.innerHTML = value;
	}

	onMin (value) {
		// this.minTime = dates.format(util.getMinTime(value), 'h:m a');
		this.minDate = util.getMinDate(value);
		this.validate();
	}

	onMax (value) {
		// this.maxTime = dates.format(util.getMaxTime(value), 'h:m a');
		this.maxDate = util.getMaxDate(value);
		this.validate();
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
		this.dateType = 'time';
		this.typedValue = '';
	}

    setValue(value, silent, ampm) {
		let valid = this.validate(value);
		const isReady = /[ap]m/i.test(value) || value.replace(/(?!X)\D/g, '').length >= 4;
		if (isReady) {
			this.setAMPM(value, getAMPM(value, ampm));
			value = util.formatTime(value);
			if (value.length === 5) {
				value = this.setAMPM(value);
			}
		}

		this.typedValue = value;
		this.input.value = value;
		valid = this.validate();

		if (valid) {
			this.strDate = value;
			if (!silent) {
				this.emitEvent();
			}
		}
		return value;
	}

	setDate (value) {
		// sets the current date, but not the time
		// used when inside a date picker for min/max
		this.date = value;
		this.validate();
	}

	isValid (value = this.input.value) {
		if (this.date) {
			if (/X/.test(value)) {
				return false;
			}
			value = dates.format(util.addTimeToDate(value, this.date), 'MM/dd/yyyy h:m a');
		}
		return isValid.call(this, value, this.dateType);
	}

	validate () {
		if (this.isValid()) {
			this.classList.remove('invalid');
			this.emitError(null);
			return true;
		}
		this.classList.add('invalid');
		return false;
	}

	onChange (e) {
		if (this.date && this.isValid(e.target.value)) {
			this.setValue(e.target.value, true);
			this.emitEvent(true);
		}
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

	focus () {
		this.onDomReady(() => {
			this.input.focus();
		});
	}

	blur () {
		this.onDomReady(() => {
			this.input.blur();
			this.validate();
			this.emitEvent();
		})
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
		this.eventName = this['event-name'] || EVENT_NAME;
		this.emitType = this.eventName === EVENT_NAME ? 'emit' : 'fire';
		this.connectKeys();
	}

	emitEvent (silent) {
		const value = this.value;
		if (value === this.lastValue || !this.isValid(value)) {
			return;
		}
		this.lastValue = value;
		this[this.emitType](this.eventName, { value, silent }, true);
	}

	emitError (msg) {
		if (msg === this.validationError) {
			return;
		}
		this.validationError = msg;
		this.fire('validation', { message: msg }, true);
	}

	connectKeys () {
		this.on(this.input, 'keypress', util.stopEvent);
		this.on(this.input, 'keyup', (e) => {
			onKey.call(this, e, this.dateType);
			this.onChange(e);
		});
        this.on(this.input, 'blur', () => this.blur.bind(this));
		this.on(this.input, 'input', (e) => this.onChange.bind(this));
	}
}

function getAMPM (value, ampm) {
	if (ampm) {
		return ampm;
	}
	if (/a/i.test(value)) {
		return 'am';
	}
	if (/p/i.test(value)) {
		return 'pm';
	}
	return '';
}

module.exports = BaseComponent.define('time-input', TimeInput, {
	bools: ['required', 'range-expands'],
	props: ['label', 'name', 'placeholder', 'mask', 'event-name', 'min', 'max'],
	attrs: ['value']
});
