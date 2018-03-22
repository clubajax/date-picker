const BaseComponent = require('@clubajax/base-component');
const dom = require('@clubajax/dom');
const on = require('@clubajax/on');
const dates = require('@clubajax/dates');
const util = require('./util');

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

	isValid (value = this.input.value) {
		if(!value && !this.required){
			return true;
		}
		return util.timeIsValid(value);
	}

	setValue (value, silent, ampm) {

		if (ampm) {
			this.setAMPM(value, ampm);
		}
		value = this.format(value);

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
				this.emitEvent();
			}
		}

		this.setValidity();
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
			this.emitEvent();
			util.stopEvent(e);
			return;
		}

		if(k === 'Escape'){
			if(!this.isValid()){
				this.value = this.strDate;
			}
			this.input.blur();
			util.stopEvent(e);
			return;
		}

		function setSelection (amt) {
			if (end - beg) {
				e.target.selectionEnd = end - (end - beg - 1);
			} else {
				e.target.selectionEnd = end + amt;
			}
		}

		if (util.isControl(e)) {
			util.stopEvent(e);
			return;
		}

		if (!util.isNum(k)) {
			// TODO handle paste, backspace
			if (util.isArrowKey[k]) {
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
				this.setValue(this.input.value, true, k === 'a' ? 'am' : 'pm');
			}  else if (this.input.value !== this.typedValue) {
				console.log('do WUT?', k);
				this.setValue(this.input.value, true);
			}
			setSelection(0);
			util.stopEvent(e);
			return;
		}

		if (str.length !== end || beg !== end) {
			// handle selection or middle-string edit
			const temp = this.typedValue.substring(0, beg) + k + this.typedValue.substring(end);
			this.setValue(temp, true);

			// "2" means typed right before colon
			setSelection(beg === 2 ? 2 : 1);
			util.stopEvent(e);
			return;
		}

		this.setValue(str + k, true);
	}

	focus () {
		this.onDomReady(() => {
			this.input.focus();
		});
	}

	blur () {
		this.onDomReady(() => {
			this.input.blur();
			this.setValidity();
			this.emitEvent();
		})
	}

	setValidity () {
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
			this.onKey(e);
		});
		this.on(this.input, 'blur', () => {
			this.blur();
		});
	}
}

customElements.define('time-input', TimeInput);

module.exports = TimeInput;