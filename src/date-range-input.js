require('./date-range-picker');
const DateInput = require('./date-input');
const dates = require('dates');
const dom = require('dom');

const props = ['label', 'name', 'placeholder'];
const bools = ['range-expands'];

class DateRangeInput extends DateInput {

	static get observedAttributes () {
		return [...props, ...bools, 'value'];
	}

	get props () {
		return props;
	}

	get bools () {
		return bools;
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
		this.mask = 'XX/XX/XXXX - XX/XX/XXXX'
	}

	isValid (value) {
		const ds = value.split(/\s*-\s*/);
		return dates.isDateType(ds[0]) && dates.isDateType(ds[1]);
	}
}

customElements.define('date-range-input', DateRangeInput);

module.exports = DateRangeInput;