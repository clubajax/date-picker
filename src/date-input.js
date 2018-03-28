require('./date-picker');
const BaseComponent = require('@clubajax/base-component');
const dom = require('@clubajax/dom');
const on = require('@clubajax/on');
const dates = require('@clubajax/dates');
const util = require('./util');
const onKey = require('./onKey');

const defaultPlaceholder = 'MM/DD/YYYY';
const defaultMask = 'XX/XX/XXXX';
const props = ['label', 'name', 'placeholder', 'mask', 'min', 'max', 'time'];
const bools = ['required', 'time', 'static'];

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
		if (value === this.strDate) {
			return;
		}
		const isInit = !this.strDate;
		this.strDate = dates.isValid(value) ? value : '';
		onDomReady(this, () => {
			this.setValue(this.strDate, isInit);
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
</label>`;
	}

	constructor () {
		super();
		this.showing = false;
	}

	setValue (value, silent) {
		if (value === this.typedValue) {
			return;
		}
		value = this.format(value);
		this.typedValue = value;
		this.input.value = value;
		const len = this.input.value.length === this.mask.length;
		const valid = this.validate();
		if (valid) {
			this.strDate = value;
			this.picker.value = value;
			if (!silent) {
				this.emit('change', { value: value });
			}
		}

		if (!silent && valid && !this.static) {
			setTimeout(this.hide.bind(this), 300);
		}
		return value;
	}

	format (value) {
		return  util.formatDate(value, this.mask);
	}

	isValid (value = this.input.value) {
		if(!value && !this.required){
			return true;
		}
		return dates.isValid(this.input.value);
	}

	validate () {
		if (this.isValid(this.input.value)) {
			this.classList.remove('invalid');
			return true;
		}
		this.classList.add('invalid');
		return false;
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
			if (box.top + box.h > win.h) {
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

	blur () {
		if (this.input) {
			this.input.blur();
		}
	}

	domReady () {
		this.time = this.time || this.hasTime;
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
		this.connectKeys();

		this.picker = dom('date-picker', { time: this.time, tabindex: '0' }, this);
		this.picker.onDomReady(() => {
			this.picker.on('change', (e) => {
				this.setValue(e.value);
			});
			if (this.static) {
				this.show();
			} else {
				this.registerHandle(handleOpen(this.input, this.picker, this.show.bind(this), this.hide.bind(this)));
			}
		});
	}

	connectKeys () {
		this.on(this.input, 'keydown', util.stopEvent);
		this.on(this.input, 'keypress', util.stopEvent);
		this.on(this.input, 'keyup', (e) => {
			onKey.call(this, e);
		});
	}
}

function handleOpen (input, picker, show, hide) {
	let inputFocus = false;
	let pickerFocus = false;
	let timeFocus = false;

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

	const timeHandles = picker.timeInput ? [
		on(picker.timeInput.input, 'focus', () => {
			timeFocus = true;
		}),
		on(picker.timeInput.input, 'blur', () => {
			timeFocus = false;
		})
	] : [];

	return on.makeMultiHandle([
		...timeHandles,
		on(input, 'focus', () => {
			inputFocus = true;
			show();
			docHandle.resume();
		}),
		on(input, 'blur', () => {
			inputFocus = false;
			setTimeout(() => {
				if (!pickerFocus && !timeFocus) {
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
				if (!inputFocus && !timeFocus) {
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

customElements.define('date-input', DateInput);

module.exports = DateInput;