require('./date-range-picker');
const DateInput = require('./date-input');
const dates = require('dates');
const dom = require('dom');

const props = ['value'];
const bools = ['range-expands'];

class DateRangeInput extends DateInput {

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

	}

	get templateString () {
		return `
<label>
	<span ref="labelNode"></span>
	<input ref="input" />
	
</label>
<date-range-picker ref="picker" tabindex="0"></date-range-picker>`;
	}

	constructor () {
		super();
	}

	onKey () {

	}

	connectKeys () {
		this.on(this.input, 'keyup', this.onKey.bind(this));
	}

	// domReady () {
	// 	dom();
	// }
}

customElements.define('date-range-input', DateRangeInput);

module.exports = DateRangeInput;