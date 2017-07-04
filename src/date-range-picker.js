require('./date-picker');
const BaseComponent = require('BaseComponent');
const dates = require('dates');
const dom = require('dom');

const props = ['value'];
const bools = ['range-expands'];

class DateRangePicker extends BaseComponent {

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
		// might need attributeChanged
		this.strDate = dates.isDateType(value) ? value : '';
		onDomReady(this, () => {
			this.setValue(this.strDate, true);
		});
	}

	constructor () {
		super();
	}

	setValue (value, noEmit) {
		if (!value) {
			this.valueDate = '';
			this.clearRange();

		} else if (typeof value === 'string') {
			var dateStrings = split(value);
			this.valueDate = dates.strToDate(value);
			this.firstRange = dates.strToDate(dateStrings[0]);
			this.secondRange = dates.strToDate(dateStrings[1]);
			this.setDisplay();
			this.setRange(noEmit);
		}
	}

	domReady () {
		this.leftCal = dom('date-picker', {'range-left': true}, this);
		this.rightCal = dom('date-picker', {'range-right': true}, this);
		this.rangeExpands = this['range-expands'];

		this.connectEvents();
		// if (this.initalValue) {
		// 	this.setValue(this.initalValue);
		// } else {
		// 	this.setDisplay();
		// }
	}

	setDisplay () {
		const
			first = this.firstRange ? new Date(this.firstRange.getTime()) : new Date(),
			second = new Date(first.getTime());

		second.setMonth(second.getMonth() + 1);
		this.leftCal.setDisplay(first);
		this.rightCal.setDisplay(second);
	}

	setRange (noEmit) {
		this.leftCal.setRange(this.firstRange, this.secondRange);
		this.rightCal.setRange(this.firstRange, this.secondRange);
		if (!noEmit && this.firstRange && this.secondRange) {

			const
				beg = dates.dateToStr(this.firstRange),
				end = dates.dateToStr(this.secondRange);

			this.emit('change', {
				firstRange: this.firstRange,
				secondRange: this.secondRange,
				begin: beg,
				end: end,
				value: beg + DELIMITER + end

			});
		}
	}

	clearRange () {
		this.leftCal.clearRange();
		this.rightCal.clearRange();
	}

	calculateRange (e, which) {
		e = e.detail || e;

		if (e.first === this.leftCal.firstRange) {
			if (!e.second) {
				this.rightCal.clearRange();
				this.rightCal.setRange(this.leftCal.firstRange, null);
			} else {
				this.rightCal.setRange(this.leftCal.firstRange, this.leftCal.secondRange);
			}
		}
	}

	connectEvents () {
		this.leftCal.on('display-change', function (e) {
			let
				m = e.detail.month,
				y = e.detail.year;
			if (m + 1 > 11) {
				m = 0;
				y++;
			} else {
				m++;
			}
			this.rightCal.setDisplay(y, m);
		}.bind(this));

		this.rightCal.on('display-change', function (e) {
			let
				m = e.detail.month,
				y = e.detail.year;
			if (m - 1 < 0) {
				m = 11;
				y--;
			} else {
				m--;
			}
			this.leftCal.setDisplay(y, m);
		}.bind(this));

		this.leftCal.on('change', function (e) {
			e.preventDefault();
			e.stopImmediatePropagation();
			return false;
		}.bind(this));

		this.rightCal.on('change', function (e) {
			e.preventDefault();
			e.stopImmediatePropagation();
			return false;
		}.bind(this));


		if (!this.rangeExpands) {
			this.rightCal.on('reset-range', function (e) {
				this.leftCal.clearRange();
			}.bind(this));

			this.leftCal.on('reset-range', function (e) {
				this.rightCal.clearRange();
			}.bind(this));
		}


		this.leftCal.on('select-range', function (e) {
			this.calculateRange(e, 'left');
			e = e.detail;
			if (this.rangeExpands && e.first && e.second) {
				if (isDateCloserToLeft(e.current, e.first, e.second)) {
					this.firstRange = e.current;
				} else {
					this.secondRange = e.current;
				}
				this.setRange();
			} else if (e.first && e.second) {
				// new range
				this.clearRange();
				this.firstRange = e.current;
				this.secondRange = null;
				this.setRange();
			} else if (e.first && !e.second) {
				this.secondRange = e.current;
				this.setRange();
			}
			else {
				this.firstRange = e.current;
				this.setRange();
			}
		}.bind(this));

		this.rightCal.on('select-range', function (e) {
			this.calculateRange(e, 'right');

			e = e.detail;
			if (this.rangeExpands && e.first && e.second) {
				if (isDateCloserToLeft(e.current, e.first, e.second)) {
					this.firstRange = e.current;
				} else {
					this.secondRange = e.current;
				}
				this.setRange();
			} else if (e.first && e.second) {
				// new range
				this.clearRange();
				this.firstRange = e.current;
				this.secondRange = null;
				this.setRange();
			} else if (e.first && !e.second) {
				this.secondRange = e.current;
				this.setRange();
			}
			else {
				this.firstRange = e.current;
				this.setRange();
			}
		}.bind(this));

		this.on(this.rightCal, 'mouseover', function () {
			this.leftCal.displayRangeToEnd();
		}.bind(this));
	}

	destroy () {
		this.rightCal.destroy();
		this.leftCal.destroy();
	}
}

const DELIMITER = ' - ';
const today = new Date();

function str (d) {
	if (!d) {
		return null;
	}
	return dates.dateToStr(d);
}

function split (value) {
	if (value.indexOf(',') > -1) {
		return value.split(/\s*,\s*/);
	}
	return value.split(/\s*-\s*/);
}

function isDateCloserToLeft (date, left, right) {
	const diff1 = dates.diff(date, left),
		diff2 = dates.diff(date, right);
	return diff1 <= diff2;
}

customElements.define('date-range-picker', DateRangePicker);

module.exports = DateRangePicker;