require('BaseComponent/src/properties');
require('BaseComponent/src/template');
require('BaseComponent/src/refs');
const BaseComponent = require('BaseComponent');
const dom = require('dom');
const on = require('on');

console.log('DP LOADED');
const props = ['label', 'name'];
const bools = ['no-event', 'disabled', 'readonly', 'checked'];

class DatePicker extends BaseComponent {

	get templateString () {
		return `
<label>
	<icon-check></icon-check>
	<span ref="labelNode"></span>
</label>
`;
	}

	static get observedAttributes () {
		return [...props, ...bools];
	}

	get props () {
		return props;
	}

	get bools () {
		return bools;
	}

	get value () {

	}

	domReady () {
		dom('div', {html: 'DATE PICKER!!'}, this)
	}
}

customElements.define('date-picker', DatePicker);

module.exports = DatePicker;