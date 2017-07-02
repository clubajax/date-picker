require('BaseComponent/src/properties');
require('BaseComponent/src/template');
require('BaseComponent/src/refs');
const BaseComponent = require('BaseComponent');
const dates = require('dates');

const props = ['label', 'name'];
const bools = ['range-picker', 'range-left', 'range-right'];

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

	get templateString () {
		return `
<label>
	<span ref="labelNode"></span>
	<input type="date" ref="input"/>
</label>
		`;
	}

	constructor () {
		super();
	}

	domReady () {

	}
}

customElements.define('date-input', DateInput);

module.exports = DateInput;