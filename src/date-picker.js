const BaseComponent = require('@clubajax/base-component');
const dates = require('@clubajax/dates');
const dom = require('@clubajax/dom');
const util = require('./util');
const isValid = require('./isValid');
require('./time-input');

// ref:
// https://axesslab.com/accessible-datepickers/
// http://whatsock.com/tsg/Coding%20Arena/ARIA%20Date%20Pickers/ARIA%20Date%20Picker%20(Basic)/demo.htm

const EVENT_NAME = 'change';

class DatePicker extends BaseComponent {

    get templateString() {
        return `
<div class="calendar" ref="calNode">
<div class="cal-header" ref="headerNode">
	<button class="cal-yr-lft" ref="lftYrNode" tabindex="0" aria-label="Previous Year"></button>
	<button class="cal-lft" ref="lftMoNode" tabindex="0" aria-label="Previous Month"></button>
	<label class="cal-month" ref="monthNode"></label>	
	<button class="cal-rgt" ref="rgtMoNode" tabindex="0"  aria-label="Next Month"></button>
	<button class="cal-yr-rgt" ref="rgtYrNode" tabindex="0" aria-label="Next Year"></button>
</div>
<div class="cal-container" ref="container"></div>
<div class="cal-footer" ref="calFooter">
	<button ref="footerLink" class="today-button" aria-label="Set Date to Today"></button>
</div>
</div>
<input class="focus-loop" aria-hidden="true"/>
`;
    }

    set value(value) {
        this.setValue(dates.isDate(value) ? dates.toDate(value) : today);
    }

    get value() {
        if (!this.valueDate) {
            const value = this.getAttribute('value') || today;
            this.valueDate = dates.toDate(value);
        }
        return this.valueDate;
    }

    onMin(value) {
        this.minDate = util.getMinDate(value);
        this.minDate.setDate(this.minDate.getDate() - 1);
        if (this.timeInput) {
            this.timeInput.min = value;
        }
        this.render();
    }

    onMax(value) {
        this.maxDate = util.getMaxDate(value);
        if (this.timeInput) {
            this.timeInput.max = value;
        }
        this.render();
    }

    constructor() {
        super();
        this.dateType = 'date';
        this.current = new Date();
        this.previous = {};
    }

    setDisplay(...args) {
        // used by date-range-picker
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
        this.valueDate = dates.copy(this.current);
        this.noEvents = true;
        this.render();
    }

    getFormattedValue() {
        let str = this.valueDate === today ? '' : !!this.valueDate ? dates.format(this.valueDate) : '';
        if (this.time) {
            str += ` ${this.timeInput.value}`;
        }
        return str;
    }

    setAriaLabel() {
        const ariaLabel = this.valueDate ?
            this.timeInput ?
                util.toDateTimeAriaLabel(this.valueDate) :
                util.toDateAriaLabel(this.valueDate) :
            'not set';
        this.setAttribute('aria-label', `Date Picker, current date: ${ariaLabel}`);
    }

    setAriaMonthYearAlert(enabled) {
        if (enabled) {
            this.monthNode.setAttribute('role', 'alert');
        } else {
            this.monthNode.removeAttribute('role', 'alert');
        }
    }

    emitEvent(silent) {
        const date = this.valueDate;
        if (this.time) {
            if (!this.timeInput.valid) {
                this.timeInput.validate();
                return;
            }
            util.addTimeToDate(this.timeInput.value, date);
        }
        const event = {
            value: this.getFormattedValue(),
            silent,
            date
        };
        if (this['range-picker']) {
            event.first = this.firstRange;
            event.second = this.secondRange;
        }
        this[this.emitType](this.eventName, event, true);

        this.setAriaLabel();
    }

    emitDisplayEvents() {
        const month = this.current.getMonth(),
            year = this.current.getFullYear();

        if (!this.noEvents && (month !== this.previous.month || year !== this.previous.year)) {
            this.fire('display-change', {month: month, year: year});
        }

        this.noEvents = false;
        this.previous = {
            month: month,
            year: year
        };
    }

    onHide() {
        // not an attribute; called by owner
    }

    onShow() {
        this.current = dates.copy(this.valueDate);
        this.render();
        setTimeout(this.focus.bind(this), 100);
    }

    setValue(valueObject) {
        this.hasTime = !!this.timeInput;
        const strDate = dates.format(valueObject, this.timeInput ? 'MM/dd/yyyy h:m a' : 'MM/dd/yyyy');
        if (isValid.call(this, strDate, this.dateType)) {
            this.valueDate = valueObject;
            this.current = dates.copy(this.valueDate);
            onDomReady(this, () => {
                this.render();
                this.setAriaLabel();
            });
        }
    }

    onClickDay(node, silent) {
        const
            day = +node.textContent,
            isFuture = node.classList.contains('future'),
            isPast = node.classList.contains('past'),
            isDisabled = node.classList.contains('disabled');

        if (isDisabled) {
            if (this.focusNode) {
                this.focusNode.focus();
            }
            return;
        }

        this.current.setDate(day);
        if (isFuture) {
            this.current.setMonth(this.current.getMonth() + 1);
        }
        if (isPast) {
            this.current.setMonth(this.current.getMonth() - 1);
        }

        this.valueDate = dates.copy(this.current);

        if (this.timeInput) {
            this.timeInput.setDate(this.valueDate);
        }

        this.emitEvent(silent);

        if (this['range-picker']) {
            this.clickSelectRange();
        }

        if (isFuture || isPast) {
            this.render();
        } else {
            this.selectDay();
        }
    }

    selectDay() {
        if (this['range-picker']) {
            return;
        }
        const now = this.querySelector('.selected');
        const node = this.dayMap[this.current.getDate()];
        if (now) {
            now.classList.remove('selected');
        }
        node.classList.add('selected');
    }

    focusDay() {
        const node = this.container.querySelector('div.highlighted[tabindex="0"]') ||
            this.container.querySelector('div.selected[tabindex="0"]');
        if (node) {
            node.focus();
        }
    }

    highlightDay(date) {
        let node;
        if (this.isValidDate(date)) {
            node = this.container.querySelector('div[tabindex="0"]');
            if (node) {
                node.setAttribute('tabindex', '-1');
            }

            const shouldRerender = date.getMonth() !== this.current || date.getFullYear() !== this.current.getFullYear();

            this.current = date;
            if (shouldRerender) {
                this.render();
            } else {
                const dateSelector = util.toAriaLabel(this.current);
                node = this.container.querySelector(`div[aria-label="${dateSelector}"]`);
                node.setAttribute('tabindex', '0');
            }
            this.focusDay();
        }
    }

    isValidDate(date) {
        // used by arrow keys
        date = dates.zeroTime(date);
        if (this.minDate) {
            if (dates.is(date).less(this.minDate)) {
                return false;
            }
        }
        if (this.maxDate) {
            if (dates.is(date).greater(this.maxDate)) {
                return false;
            }
        }
        return true;
    }

    onClickMonth(direction) {
        this.current.setMonth(this.current.getMonth() + direction);
        this.render();
    }

    onClickYear(direction) {
        this.current.setFullYear(this.current.getFullYear() + direction);
        this.render();
    }

    clearRange() {
        this.hoverDate = 0;
        this.setRange(null, null);
    }

    setRange(firstRange, secondRange) {
        this.firstRange = firstRange;
        this.secondRange = secondRange;
        this.displayRange();
        this.setRangeEndPoints();
    }

    clickSelectRange() {
        const
            prevFirst = !!this.firstRange,
            prevSecond = !!this.secondRange,
            rangeDate = dates.copy(this.current);

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

    hoverSelectRange(e) {
        if (this.firstRange && !this.secondRange && e.target.classList.contains('on')) {
            this.hoverDate = e.target._date;
            this.displayRange();
        }
    }

    displayRangeToEnd() {
        if (this.firstRange) {
            this.hoverDate = dates.copy(this.current);
            this.hoverDate.setMonth(this.hoverDate.getMonth() + 1);
            this.displayRange();
        }
    }

    displayRange() {
        let beg = this.firstRange;
        let end = this.secondRange ? this.secondRange.getTime() : this.hoverDate;
        const map = this.dayMap;
        if (!beg || !end) {
            Object.keys(map).forEach(function (key, i) {
                map[key].classList.remove('range');
            });
        } else {
            beg = beg.getTime();
            Object.keys(map).forEach(function (key, i) {
                if (inRange(map[key]._date, beg, end)) {
                    map[key].classList.add('range');
                } else {
                    map[key].classList.remove('range');
                }
            });
        }
    }

    hasRange() {
        return !!this.firstRange && !!this.secondRange;
    }

    isValidRange(date) {
        if (!this.firstRange) {
            return true;
        }
        return date.getTime() > this.firstRange.getTime();
    }

    setRangeEndPoints() {
        this.clearEndPoints();
        if (this.firstRange) {
            if (this.firstRange.getMonth() === this.current.getMonth()) {
                this.dayMap[this.firstRange.getDate()].classList.add('range-first');
            }
            if (this.secondRange && this.secondRange.getMonth() === this.current.getMonth()) {
                this.dayMap[this.secondRange.getDate()].classList.add('range-second');
            }
        }
    }

    clearEndPoints() {
        const first = this.querySelector('.range-first'),
            second = this.querySelector('.range-second');
        if (first) {
            first.classList.remove('range-first');
        }
        if (second) {
            second.classList.remove('range-second');
        }
    }

    domReady() {
        this.eventName = this['event-name'] || EVENT_NAME;
        this.emitType = this.eventName === EVENT_NAME ? 'emit' : 'fire';
        this.setAttribute('tabindex', '0');

        if (this['range-left']) {
            this.classList.add('left-range');
            this['range-picker'] = true;
            this.isOwned = true;
        }
        if (this['range-right']) {
            this.classList.add('right-range');
            this['range-picker'] = true;
            this.isOwned = true;
        }
        if (this.isOwned) {
            this.classList.add('minimal');
        }
        this.current = dates.copy(this.value);
        this.render();
        this.connect();
        this.setAriaLabel();
    }

    render() {

        const focused = getFocusedDay();
        // dateNum increments, starting with the first Sunday
        // showing on the monthly calendar. This is usually the
        // previous month, so dateNum will start as a negative number
        destroy(this.bodyNode);

        this.dayMap = {};

        let
            node = dom('div', {class: 'cal-body'}),
            i, tx, isThisMonth, day, css, isSelected, isToday, hasSelected, defaultDateSelector, minmax, isHighlighted,
            nextMonth = 0,
            isRange = this['range-picker'],
            d = this.current,
            incDate = dates.copy(d),
            daysInPrevMonth = dates.getDaysInPrevMonth(d),
            daysInMonth = dates.getDaysInMonth(d),
            dateNum = dates.getFirstSunday(d),
            dateToday = getSelectedDate(today, d),
            dateSelected = getSelectedDate(this.valueDate, d, true),
            highlighted = d.getDate(),
            dateObj = dates.add(new Date(d.getFullYear(), d.getMonth(), 1), dateNum);

        this.monthNode.innerHTML = dates.getMonthName(d) + ' ' + d.getFullYear();

        for (i = 0; i < 7; i++) {
            dom("div", {html: dates.days.abbr[i], class: 'day-of-week'}, node);
        }

        for (i = 0; i < 42; i++) {

            minmax = dates.isLess(dateObj, this.minDate) || dates.isGreater(dateObj, this.maxDate);

            tx = dateNum + 1 > 0 && dateNum + 1 <= daysInMonth ? dateNum + 1 : "&nbsp;";

            isThisMonth = false;
            isSelected = false;
            isHighlighted = false;
            isToday = false;

            if (dateNum + 1 > 0 && dateNum + 1 <= daysInMonth) {
                // current month
                tx = dateNum + 1;
                isThisMonth = true;
                css = 'day on';
                if (dateToday === tx) {
                    isToday = true;
                    css += ' today';
                }
                if (dateSelected === tx && !isRange) {
                    isSelected = true;
                    hasSelected = true;
                    css += ' selected';
                } else if (tx === highlighted) {
                    css += ' highlighted';
                    isHighlighted = true;
                }

                // if (tx === defaultDate) {
                // 	defaultDateSelector = util.toAriaLabel(dateObj);
                // }
            } else if (dateNum < 0) {
                // previous month
                tx = daysInPrevMonth + dateNum + 1;
                css = 'day off past';
            } else {
                // next month
                tx = ++nextMonth;
                css = 'day off future';
            }

            if (minmax) {
                css = 'day disabled';
                if (isSelected) {
                    css += ' selected';
                }
                if (isToday) {
                    css += ' today';
                }
            }

            const ariaLabel = util.toDateAriaLabel(dateObj);
            day = dom("div", {
                html: `<span>${tx}</span>`,
                class: css,
                'aria-label': ariaLabel,
                tabindex: isSelected || isHighlighted ? 0 : -1
            }, node);

            dateNum++;
            dateObj.setDate(dateObj.getDate() + 1);
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

        if (this.timeInput) {
            this.timeInput.setDate(this.current);
        }

        if (focused) {
            this.focusNode = dom.query(this.bodyNode, `[aria-label="${focused}"]`);
            if (this.focusNode) {
                this.focusNode.focus();
            }
        }
    }

    setFooter() {
        if (this.timeInput) {
            if (this.current) {
                this.timeInput.value = this.valueDate;
            }
            return;
        }
        if (this.time) {
            this.timeInput = dom('time-input', {
                label: 'Time:',
                required: true,
                value: this.value,
                min: this.minDate,
                max: this.maxDate,
                'event-name': 'time-change'
            }, this.calFooter);
            this.timeInput.setDate(this.current);
            this.timeInput.on('time-change', (e) => {
                this.emitEvent(e.detail.silent);
            });
            destroy(this.footerLink);
        } else {
            const d = new Date();
            this.footerLink.innerHTML = dates.format(d, 'E MMMM dd, yyyy');
        }
    }

    connect() {
        this.on(this.container, 'click', (e) => {
            this.fire('pre-click', e, true, true);
            const node = e.target.closest('.day');
            if (node) {
                this.onClickDay(node);
            }
        });

        this.on(this.container, 'keydown', (e) => {
            let num;
            switch (e.key) {
                case 'ArrowLeft':
                    num = -1;
                    break;
                case 'ArrowRight':
                    num = 1;
                    break;
                case 'ArrowUp':
                    num = -7;
                    break;
                case 'ArrowDown':
                    num = 7;
                    break;
                case 'Enter':
                    this.onClickDay(e.target);
                    break;
                case ' ':
                    this.onClickDay(e.target, true);
                    this.focusDay();
                    return util.stopEvent(e);
            }

            if (num) {
                this.highlightDay(dates.add(this.current, num));
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
            }
        });

        this.on(document, 'keydown', (e) => {
            if (e.key === ' ' && isControl(e.target, this)) {
                this.emit(e.target, 'click');
                return util.stopEvent(e);
            }
        });

        this.on(this.lftMoNode, 'click', () => {
            this.onClickMonth(-1);
        });

        this.on(this.rgtMoNode, 'click', () => {
            this.onClickMonth(1);
        });

        this.on(this.lftYrNode, 'click', () => {
            this.onClickYear(-1);
        });

        this.on(this.rgtYrNode, 'click', () => {
            this.onClickYear(1);
        });

        this.on(this.footerLink, 'click', () => {
            this.setValue(new Date());
            this.emitEvent();
        });

        [this.lftMoNode, this.rgtMoNode, this.lftYrNode, this.rgtYrNode].forEach((node) => {
            this.on(node, 'blur', () => {
                this.setAriaMonthYearAlert(false);
            });
            this.on(node, 'focus', () => {
                setTimeout(() => {
                    this.setAriaMonthYearAlert(true);
                }, 30);
            });
        });

        if (this['range-picker']) {
            this.on(this.container, 'mouseover', this.hoverSelectRange.bind(this));
        }
    }
}

const today = new Date();

function isControl(node, picker) {
    return node === picker.lftMoNode || node === picker.rgtMoNode || node === picker.lftYrNode || node === picker.rgtYrNode || node === picker.footerLink;
}

function getSelectedDate(date, current) {
    if (date.getMonth() === current.getMonth() && date.getFullYear() === current.getFullYear()) {
        return date.getDate();
    }
    return -999; // index must be out of range, and -1 is the last day of the previous month
}

function destroy(node) {
    if (node) {
        dom.destroy(node);
    }
}

function inRange(dateTime, begTime, endTime) {
    return dateTime >= begTime && dateTime <= endTime;
}

function getFocusedDay() {
    const node = document.activeElement;
    if (!node || !dom.classList.contains(node, 'day')) {
        return null;
    }
    return node.getAttribute('aria-label');
}

// range-left/range-right mean that this is one side of a date-range-picker
module.exports = BaseComponent.define('date-picker', DatePicker, {
    bools: ['range-picker', 'range-left', 'range-right', 'time'],
    props: ['min', 'max', 'event-name']
});
