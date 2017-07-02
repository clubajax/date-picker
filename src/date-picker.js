require('BaseComponent/src/properties');
require('BaseComponent/src/template');
require('BaseComponent/src/refs');
const BaseComponent = require('BaseComponent');
const dates = require('dates');

const props = ['label', 'name'];
const bools = ['no-event', 'disabled', 'readonly', 'checked', 'range-picker', 'range-left', 'range-right'];

class DatePicker extends BaseComponent {

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
<div class="calendar" ref="calNode">
<div class="cal-header" ref="headerNode">
	<span class="cal-lft" ref="lftNode"></span>
	<span class="cal-month" ref="monthNode"></span>
	<span class="cal-rgt" ref="rgtNode"></span>
</div>
<div class="cal-container" ref="container"></div>
<div class="cal-footer">
	<a href="javascript:void(0);" ref="footerLink"></a>
</div>
</div>`;
	}

	set value (value) {
		// might need attributeChanged
		this.valueDate = dates.isDateType(value) ? dates.strToDate(value) : today;
		this.current = this.valueDate;
		onDomReady(this, () => {
			this.render();
		});
	}

	get value () {
		if (!this.valueDate) {
			const value = this.getAttribute('value') || today;
			this.valueDate = dates.strToDate(value);
		}
		return this.valueDate;
	}

	constructor () {
		super();
		this.previous = {};
		this.modes = ['month', 'year', 'decade'];
		this.mode = 0;
	}

	setDisplay (...args/*year, month*/) {
		if (args.length === 2) {
			this.current.setFullYear(args[0]);
			this.current.setMonth(args[1]);
		} else if (typeof args[0] === 'object') {
			this.current.setFullYear(args[0].getFullYear());
			this.current.setMonth(args[0].getMonth());
		} else if (args[0] > 12) {
			this.current.setFullYear(args[0]);
		} else {
			this.current.setMonth(args[0]);
		}
		this.noEvents = true;
		this.render();
	}

	getFormattedValue () {
		return this.valueDate === today ? '' : !!this.valueDate ? dates.dateToStr(this.valueDate) : '';
	}

	emitValue () {
		// TODO options for timestamp or other formats
		const event = {
			value: this.getFormattedValue(),
			date: this.valueDate
		};
		if (this['range-picker']) {
			event.first = this.firstRange;
			event.second = this.secondRange;
		}
		this.emit('change', event);
	}

	emitDisplayEvents () {
		const month = this.current.getMonth(),
			year = this.current.getFullYear();

		if (!this.noEvents && (month !== this.previous.month || year !== this.previous.year)) {
			this.fire('display-change', { month: month, year: year });
		}

		this.noEvents = false;
		this.previous = {
			month: month,
			year: year
		};
	}

	onClickDay (node) {
		var
			day = +node.innerHTML,
			isFuture = node.classList.contains('future'),
			isPast = node.classList.contains('past');

		this.current.setDate(day);
		if (isFuture) {
			this.current.setMonth(this.current.getMonth() + 1);
		}
		if (isPast) {
			this.current.setMonth(this.current.getMonth() - 1);
		}

		this.valueDate = copy(this.current);

		this.emitValue();

		if (this['range-picker']) {
			this.clickSelectRange();
		}

		if (isFuture || isPast) {
			this.render();
		} else {
			this.selectDay();
		}
	}

	onClickMonth (direction) {
		switch (this.mode) {
			case 1: // year mode
				this.current.setFullYear(this.current.getFullYear() + (direction * 1));
				this.setMode(this.mode);
				break;
			case 2: // century mode
				this.current.setFullYear(this.current.getFullYear() + (direction * 12));
				this.setMode(this.mode);
				break;
			default:
				this.current.setMonth(this.current.getMonth() + (direction * 1));
				this.render();
				break;
		}
	}

	onClickYear (node) {
		var index = dates.getMonthIndex(node.innerHTML);
		this.current.setMonth(index);
		this.render();
	}

	onClickDecade (node) {
		var year = +node.innerHTML;
		this.current.setFullYear(year);
		this.setMode(this.mode - 1);
	}

	setMode (mode) {
		destroy(this.modeNode);
		this.mode = mode || 0;
		switch (this.modes[this.mode]) {
			case 'month':
				break;
			case 'year':
				this.setYearMode();
				break;
			case 'decade':
				this.setDecadeMode();
				break;
		}
	}

	setYearMode () {
		destroy(this.bodyNode);

		var
			i,
			node = dom('div', { class: 'cal-body year' });

		for (i = 0; i < 12; i++) {
			dom('div', { html: dates.months.abbr[i], class: 'year' }, node);
		}

		this.monthNode.innerHTML = this.current.getFullYear();
		this.container.appendChild(node);
		this.modeNode = node;
	}

	setDecadeMode () {
		var
			i,
			node = dom('div', { class: 'cal-body decade' }),
			year = this.current.getFullYear() - 6;

		for (i = 0; i < 12; i++) {
			dom('div', { html: year, class: 'decade' }, node);
			year += 1;
		}
		this.monthNode.innerHTML = (year - 12) + '-' + (year - 1);
		this.container.appendChild(node);
		this.modeNode = node;
	}

	selectDay () {
		if (this['range-picker']) {
			return;
		}
		var
			now = this.querySelector('.ay-selected'),
			node = this.dayMap[this.current.getDate()];
		if (now) {
			now.classList.remove('ay-selected');
		}
		node.classList.add('ay-selected');

	}

	clearRange () {
		this.hoverDate = 0;
		this.setRange(null, null);
	}

	setRange (firstRange, secondRange) {
		this.firstRange = firstRange;
		this.secondRange = secondRange;
		this.displayRange();
		this.setRangeEndPoints();
	}

	clickSelectRange () {
		var
			prevFirst = !!this.firstRange,
			prevSecond = !!this.secondRange,
			rangeDate = copy(this.current);

		if (this.isOwned) {
			this.fire('select-range', {
				first: this.firstRange,
				second: this.secondRange,
				current: rangeDate
			});
			return;
		}
		if (this.secondRange) {
			this.fire('reset-range');
			this.firstRange = null;
			this.secondRange = null;
		}
		if (this.firstRange && this.isValidRange(rangeDate)) {
			this.secondRange = rangeDate;
			this.hoverDate = 0;
			this.setRange(this.firstRange, this.secondRange);
		} else {
			this.firstRange = null;
		}
		if (!this.firstRange) {
			this.hoverDate = 0;
			this.setRange(rangeDate, null);
		}
		this.fire('select-range', {
			first: this.firstRange,
			second: this.secondRange,
			prevFirst: prevFirst,
			prevSecond: prevSecond
		});
	}

	hoverSelectRange (e) {
		if (this.firstRange && !this.secondRange && e.target.classList.contains('on')) {
			this.hoverDate = e.target._date;
			this.displayRange();
		}
	}

	displayRangeToEnd () {
		if (this.firstRange) {
			this.hoverDate = copy(this.current);
			this.hoverDate.setMonth(this.hoverDate.getMonth() + 1);
			this.displayRange();
		}
	}

	displayRange () {
		var
			beg = this.firstRange,
			end = this.secondRange ? this.secondRange.getTime() : this.hoverDate,
			map = this.dayMap;
		if (!beg || !end) {
			Object.keys(map).forEach(function (key, i) {
				map[key].classList.remove('ay-range');
			});
		} else {
			beg = beg.getTime();
			Object.keys(map).forEach(function (key, i) {
				if (inRange(map[key]._date, beg, end)) {
					map[key].classList.add('ay-range');
				} else {
					map[key].classList.remove('ay-range');
				}
			});
		}
	}

	hasRange () {
		return !!this.firstRange && !!this.secondRange;
	}

	isValidRange (date) {
		if (!this.firstRange) {
			return true;
		}
		return date.getTime() > this.firstRange.getTime();
	}

	setRangeEndPoints () {
		this.clearEndPoints();
		if (this.firstRange) {
			if (this.firstRange.getMonth() === this.current.getMonth()) {
				this.dayMap[this.firstRange.getDate()].classList.add('ay-range-first');
			}
			if (this.secondRange && this.secondRange.getMonth() === this.current.getMonth()) {
				this.dayMap[this.secondRange.getDate()].classList.add('ay-range-second');
			}
		}
	}

	clearEndPoints () {
		var first = this.querySelector('.ay-range-first'),
			second = this.querySelector('.ay-range-second');
		if (first) {
			first.classList.remove('ay-range-first');
		}
		if (second) {
			second.classList.remove('ay-range-second');
		}
	}

	domReady () {
		if (this.hasAttribute('range-left')) {
			this.rgtNode.style.display = 'none';
			this['range-picker'] = true;
			this.isOwned = true;
		}
		if (this.hasAttribute('range-right')) {
			this.lftNode.style.display = 'none';
			this['range-picker'] = true;
			this.isOwned = true;
		}
		if (this.isOwned) {
			this.classList.add('minimal');
		}

		this.current = copy(this.value);

		this.connect();
		this.render();
	}

	render () {
		// dateNum increments, starting with the first Sunday
		// showing on the monthly calendar. This is usually the
		// previous month, so dateNum will start as a negative number
		this.setMode(0);
		if (this.bodyNode) {
			dom.destroy(this.bodyNode);
		}

		this.dayMap = {};

		var
			node = dom('div', { class: 'cal-body' }),
			i, tx, nextMonth = 0, isThisMonth, day, css,
			today = new Date(),
			isRange = this['range-picker'],
			d = this.current,
			incDate = copy(d),
			daysInPrevMonth = dates.getDaysInPrevMonth(d),
			daysInMonth = dates.getDaysInMonth(d),
			dateNum = dates.getFirstSunday(d),
			dateToday = getSelectedDate(today, d),
			dateSelected = getSelectedDate(this.valueDate, d);

		this.monthNode.innerHTML = dates.getMonthName(d) + ' ' + d.getFullYear();

		for (i = 0; i < 7; i++) {
			dom("div", { html: dates.days.abbr[i], class: 'day-of-week' }, node);
		}

		for (i = 0; i < 42; i++) {
			tx = dateNum + 1 > 0 && dateNum + 1 <= daysInMonth ? dateNum + 1 : "&nbsp;";

			isThisMonth = false;
			if (dateNum + 1 > 0 && dateNum + 1 <= daysInMonth) {
				// current month
				tx = dateNum + 1;
				isThisMonth = true;
				css = 'day on';
				if (dateToday === tx) {
					css += ' today';
				}
				if (dateSelected === tx && !isRange) {
					css += ' ay-selected';
				}
			} else if (dateNum < 0) {
				// previous month
				tx = daysInPrevMonth + dateNum + 1;
				css = 'day off past';
			} else {
				// next month
				tx = ++nextMonth;
				css = 'day off future';
			}

			day = dom("div", { innerHTML: tx, class: css }, node);

			dateNum++;
			if (isThisMonth) {
				// Keep a map of all the days
				// use it for adding and removing selection/hover classes
				incDate.setDate(tx);
				day._date = incDate.getTime();
				this.dayMap[tx] = day;
			}
		}

		this.container.appendChild(node);
		this.bodyNode = node;
		this.setFooter();
		this.displayRange();
		this.setRangeEndPoints();

		this.emitDisplayEvents();
	}

	setFooter () {
		var
			d = new Date(),
			str = dates.days.full[d.getDay()] + ' ' + dates.months.full[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
		this.footerLink.innerHTML = str;
	}

	connect () {
		this.on(this.lftNode, 'click', () => {
			this.onClickMonth(-1);
		});

		this.on(this.rgtNode, 'click', () => {
			this.onClickMonth(1);
		});

		this.on(this.footerLink, 'click', () => {
			this.current = new Date();
			this.render();
		});

		this.on(this.container, 'click', (e) => {
			this.fire('pre-click', e, true, true);
			var node = e.target;
			if (node.classList.contains('day')) {
				this.onClickDay(node);
			}
			else if (node.classList.contains('year')) {
				this.onClickYear(node);
			}
			else if (node.classList.contains('decade')) {
				this.onClickDecade(node);
			}
		});

		this.on(this.monthNode, 'click', () => {
			if (this.mode + 1 === this.modes.length) {
				this.mode = 0;
				this.render();
			}
			else {
				this.setMode(this.mode + 1);
			}
		});

		if (this['range-picker']) {
			this.on(this.container, 'mouseover', this.hoverSelectRange.bind(this));
		}
	}
}

const today = new Date();

function getSelectedDate (date, current) {
	if (date.getMonth() === current.getMonth() && date.getFullYear() === current.getFullYear()) {
		return date.getDate();
	}
	return -999; // index must be out of range, and -1 is the last day of the previous month
}

function destroy (node) {
	if (node) {
		dom.destroy(node);
	}
}

function isThisMonth (date, currentDate) {
	return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
}

function inRange (dateTime, begTime, endTime) {
	return dateTime >= begTime && dateTime <= endTime;
}

function copy (date) {
	return new Date(date.getTime());
}

customElements.define('date-picker', DatePicker);

module.exports = DatePicker;