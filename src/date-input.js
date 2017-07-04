require('./date-picker');
const BaseComponent = require('BaseComponent');
const dates = require('dates');

const defaultPlaceholder = 'MM/DD/YYYY';
const defaultMask = 'XX/XX/XXXX';
const props = ['label', 'name', 'type', 'placeholder', 'value', 'mask'];
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
			this.picker.value = value;
			this.emit('change', {value: value});
		}
	}

	format (s) {
		s = s.replace(/\D/g, '');
		const mask = this.mask;
		let f = '';
		const len = Math.min(s.length, this.maskLength);
		for (let i = 0; i < len; i++){
			if(mask[f.length] !== 'X'){
				f += mask[f.length];
			}
			f += s[i];
		}
		return f;
	}

	onKey (e) {
		let str = this.typedValue || '';
		const beg = e.target.selectionStart;
		const end = e.target.selectionEnd;
		const k = e.key;
		//console.log(k, ':', beg, end, '/', str.length);
		if(!isNum(k)){
			// handle paste, backspace
			if(this.input.value !== this.typedValue) {
				this.setValue(this.input.value);
			}
			stopEvent(e);
			return;
		}
		if(str.length !== end || beg !== end){
			// handle selection or middle-string edit
			const temp = this.typedValue.substring(0, beg) + k + this.typedValue.substring(end);
			this.setValue(this.format(temp));
			//console.log('sel', end);
			if(end - beg) {
				e.target.selectionEnd = end - (end - beg - 1);
			} else {
				e.target.selectionEnd = end + 1;
			}
			stopEvent(e);
			return;
		}

		this.setValue(this.format(str + k));
	}

	show () {
		if(this.showing){
			return;
		}
		this.showing = true;
		this.picker.classList.add('show');

		window.requestAnimationFrame(() => {
			const win = dom.box(window);
			const box = dom.box(this.picker);
			if(box.x + box.w > win.h){
				this.picker.classList.add('right-align');
			}
			if(box.y + box.h > win.h){
				this.picker.classList.add('bottom-align');
			}
		});
	}

	hide () {
		if(!this.showing || window.keepPopupsOpen){
			return;
		}
		this.showing = false;
		dom.classList.remove(this.picker, 'right-align bottom-align show');
	}

	domReady () {
		console.log('this.mask', this.mask);
		this.mask = this.mask || defaultMask;
		this.maskLength = this.mask.match(/X/g).join('').length;
		console.log('this.mask', this.mask);
		this.labelNode.innerHTML = this.label || '';
		this.input.setAttribute('type', 'text');
		this.input.setAttribute('placeholder', this.placeholder || defaultPlaceholder);
		this.picker.on('change', (e) => {
			this.setValue(e.value);
		});
		this.connectKeys();
		this.registerHandle(handleOpen(this.input, this.picker, this.show.bind(this), this.hide.bind(this)));
	}

	connectKeys () {
		this.on(this.input, 'keydown', stopEvent);
		this.on(this.input, 'keypress', stopEvent);
		this.on(this.input, 'keyup', (e) => {
			this.onKey(e);
		});
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
	if(e.metaKey || control[e.key]){
		return;
	}
	e.preventDefault();
	e.stopImmediatePropagation();
}

customElements.define('date-input', DateInput);

module.exports = DateInput;