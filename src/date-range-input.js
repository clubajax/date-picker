require('./date-range-picker');
const DateInput = require('./date-input');
const dates = require('@clubajax/dates');

class DateRangeInput extends DateInput {


	get templateString () {
		return `
<label>
	<span ref="labelNode"></span>
	<div class="input-wrapper">
		<input ref="input" class="empty" />
		<button class="icon-button" ref="icon"><icon-calendar /></button>
    </div>
    <div class="input-error" ref="errorNode"></div>
</label>
<date-range-picker ref="picker" tabindex="0"></date-range-picker>`;
	}

	connected () {
		this.mask = 'XX/XX/XXXX - XX/XX/XXXX'
	}

	isValid (value) {
		const ds = (value || '').split(/\s*-\s*/);
		return dates.isDate(ds[0]) && dates.isDate(ds[1]);
	}
}

customElements.define('date-range-input', DateRangeInput);

module.exports = DateRangeInput;
