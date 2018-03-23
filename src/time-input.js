const BaseComponent = require('@clubajax/base-component');
const dom = require('@clubajax/dom');
const on = require('@clubajax/on');
const dates = require('@clubajax/dates');
const util = require('./util');
const onKey = require('./onKey');

const defaultPlaceholder = 'HH:MM am/pm';
const defaultMask = 'XX:XX';
const props = ['label', 'name', 'placeholder', 'mask', 'event-name', 'min', 'max'];
const bools = ['required'];
const EVENT_NAME = 'change';

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
		if (dates.isValidObject(value)) {
			const org = value;
			value = dates.format(value, 'h:m a');
			this.setAMPM(value);
		}
		this.strDate = value; //isValid(value) ? value : '';
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
		this.typedValue = '';
	}

	setValue (value, silent, ampm) {

		if (ampm) {
			this.setAMPM(value, ampm);
		}
		value = util.formatTime(value);
		if (value.length === 5) {
			value = this.setAMPM(value);
		}

		this.typedValue = value;
		this.input.value = value;
		const valid = this.validate();

		if (valid) {
			this.strDate = value;
			if (!silent) {
				this.emitEvent();
			}
		}
		return value;
	}

	isValid (value = this.input.value) {
		if (!value && !this.required) {
			return true;
		}
		return util.timeIsValid(value);
	}

	validate () {
		if (this.isValid()) {
			this.classList.remove('invalid');
			return true;
		}
		this.classList.add('invalid');
		return false;
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

	emitEvent () {
		const value = this.value;
		if (value === this.lastValue || !this.isValid(value)) {
			return;
		}
		this.lastValue = value;
		this[this.emitType](this.eventName, { value }, true);
	}

	connectKeys () {
		this.on(this.input, 'keydown', util.stopEvent);
		this.on(this.input, 'keypress', util.stopEvent);
		this.on(this.input, 'keyup', (e) => {
			onKey.call(this, e);
		});
		this.on(this.input, 'blur', () => {
			this.blur();
		});
	}
}

customElements.define('time-input', TimeInput);

module.exports = TimeInput;