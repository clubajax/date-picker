(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
const BaseComponent = require('BaseComponent');
const dom = require('dom');

function setBoolean (node, prop) {
	Object.defineProperty(node, prop, {
		enumerable: true,
		configurable: true,
		get () {
			return node.hasAttribute(prop);
		},
		set (value) {
			this.isSettingAttribute = true;
			if (value) {
				this.setAttribute(prop, '');
			} else {
				this.removeAttribute(prop);
			}
			const fn = this[onify(prop)];
			if(fn){
				fn.call(this, value);
			}

			this.isSettingAttribute = false;
		}
	});
}

function setProperty (node, prop) {
	let propValue;
	Object.defineProperty(node, prop, {
		enumerable: true,
		configurable: true,
		get () {
			return propValue !== undefined ? propValue : dom.normalize(this.getAttribute(prop));
		},
		set (value) {
			this.isSettingAttribute = true;
			this.setAttribute(prop, value);
			const fn = this[onify(prop)];
			if(fn){
				onDomReady(this, () => {
					value = fn.call(this, value) || value;
					if(value !== undefined){
						propValue = value;
					}
				});
			}
			this.isSettingAttribute = false;
		}
	});
}

function setObject (node, prop) {
	Object.defineProperty(node, prop, {
		enumerable: true,
		configurable: true,
		get () {
			return this['__' + prop];
		},
		set (value) {
			this['__' + prop] = value;
		}
	});
}

function setProperties (node) {
	let props = node.props || node.properties;
	if (props) {
		props.forEach(function (prop) {
			if (prop === 'disabled') {
				setBoolean(node, prop);
			}
			else {
				setProperty(node, prop);
			}
		});
	}
}

function setBooleans (node) {
	let props = node.bools || node.booleans;
	if (props) {
		props.forEach(function (prop) {
			setBoolean(node, prop);
		});
	}
}

function setObjects (node) {
	let props = node.objects;
	if (props) {
		props.forEach(function (prop) {
			setObject(node, prop);
		});
	}
}

function cap (name) {
	return name.substring(0,1).toUpperCase() + name.substring(1);
}

function onify (name) {
	return 'on' + name.split('-').map(word => cap(word)).join('');
}

function isBool (node, name) {
	return (node.bools || node.booleans || []).indexOf(name) > -1;
}

function boolNorm (value) {
	if(value === ''){
		return true;
	}
	return dom.normalize(value);
}

function propNorm (value) {
	return dom.normalize(value);
}

BaseComponent.addPlugin({
	name: 'properties',
	order: 10,
	init: function (node) {
		setProperties(node);
		setBooleans(node);
	},
	preAttributeChanged: function (node, name, value) {
		if (node.isSettingAttribute) {
			return false;
		}
		if(isBool(node, name)){
			value = boolNorm(value);
			node[name] = !!value;
			if(!value){
				node[name] = false;
				node.isSettingAttribute = true;
				node.removeAttribute(name);
				node.isSettingAttribute = false;
			} else {
				node[name] = true;
			}
			return;
		}

		node[name] = propNorm(value);
	}
});
},{"BaseComponent":"BaseComponent","dom":"dom"}],2:[function(require,module,exports){
const dom = require('dom');
const BaseComponent = require('BaseComponent');

function assignRefs (node) {
    dom.queryAll(node, '[ref]').forEach(function (child) {
        let name = child.getAttribute('ref');
        node[name] = child;
    });
}

function assignEvents (node) {
    // <div on="click:onClick">
    dom.queryAll(node, '[on]').forEach(function (child) {
        let
            keyValue = child.getAttribute('on'),
            event = keyValue.split(':')[0].trim(),
            method = keyValue.split(':')[1].trim();
        node.on(child, event, function (e) {
            node[method](e)
        })
    });
}

BaseComponent.addPlugin({
    name: 'refs',
    order: 30,
    preConnected: function (node) {
        assignRefs(node);
        assignEvents(node);
    }
});
},{"BaseComponent":"BaseComponent","dom":"dom"}],3:[function(require,module,exports){
const BaseComponent  = require('BaseComponent');
const dom = require('dom');

var
    lightNodes = {},
    inserted = {};

function insert (node) {
    if(inserted[node._uid] || !hasTemplate(node)){
        return;
    }
    collectLightNodes(node);
    insertTemplate(node);
    inserted[node._uid] = true;
}

function collectLightNodes(node){
    lightNodes[node._uid] = lightNodes[node._uid] || [];
    while(node.childNodes.length){
        lightNodes[node._uid].push(node.removeChild(node.childNodes[0]));
    }
}

function hasTemplate (node) {
    return !!node.getTemplateNode();
}

function insertTemplateChain (node) {
    var templates = node.getTemplateChain();
    templates.reverse().forEach(function (template) {
        getContainer(node).appendChild(BaseComponent.clone(template));
    });
    insertChildren(node);
}

function insertTemplate (node) {
    if(node.nestedTemplate){
        insertTemplateChain(node);
        return;
    }
    var
        templateNode = node.getTemplateNode();

    if(templateNode) {
        node.appendChild(BaseComponent.clone(templateNode));
    }
    insertChildren(node);
}

function getContainer (node) {
    var containers = node.querySelectorAll('[ref="container"]');
    if(!containers || !containers.length){
        return node;
    }
    return containers[containers.length - 1];
}

function insertChildren (node) {
    var i,
        container = getContainer(node),
        children = lightNodes[node._uid];

    if(container && children && children.length){
        for(i = 0; i < children.length; i++){
            container.appendChild(children[i]);
        }
    }
}

BaseComponent.prototype.getLightNodes = function () {
    return lightNodes[this._uid];
};

BaseComponent.prototype.getTemplateNode = function () {
    // caching causes different classes to pull the same template - wat?
    //if(!this.templateNode) {
        if (this.templateId) {
            this.templateNode = dom.byId(this.templateId.replace('#',''));
        }
        else if (this.templateString) {
            this.templateNode = dom.toDom('<template>' + this.templateString + '</template>');
        }
    //}
    return this.templateNode;
};

BaseComponent.prototype.getTemplateChain = function () {

    let
        context = this,
        templates = [],
        template;

    // walk the prototype chain; Babel doesn't allow using
    // `super` since we are outside of the Class
    while(context){
        context = Object.getPrototypeOf(context);
        if(!context){ break; }
        // skip prototypes without a template
        // (else it will pull an inherited template and cause duplicates)
        if(context.hasOwnProperty('templateString') || context.hasOwnProperty('templateId')) {
            template = context.getTemplateNode();
            if (template) {
                templates.push(template);
            }
        }
    }
    return templates;
};

BaseComponent.addPlugin({
    name: 'template',
    order: 20,
    preConnected: function (node) {
        insert(node);
    }
});
},{"BaseComponent":"BaseComponent","dom":"dom"}],4:[function(require,module,exports){
/* UMD.define */ (function (root, factory) {
    if (typeof customLoader === 'function'){ customLoader(factory, 'dates'); }
    else if (typeof define === 'function' && define.amd){ define([], factory); }
    else if(typeof exports === 'object'){ module.exports = factory(); }
    else{ root.returnExports = factory();
        window.dates = factory(); }
}(this, function () {

    'use strict';
    // dates.js
    //  date helper lib
    //
    var
        // tests that it is a date string, not a valid date. 88/88/8888 would be true
        dateRegExp = /^(\d{1,2})([\/-])(\d{1,2})([\/-])(\d{4})\b/,
        // 2015-05-26T00:00:00
        tsRegExp = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\b/,

        daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        days = [],
        days3 = [],
        dayDict = {},

        months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        monthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
        monthAbbr = [],
        monthDict = {},

        datePattern = /yyyy|yy|mm|m|MM|M|dd|d/g,
        datePatternLibrary = {
            yyyy: function(date) {
                return date.getFullYear();
            },
            yy: function(date) {
                return (date.getFullYear() + '').substring(2);
            },
            mm: function(date) {
                return pad(date.getMonth() + 1);
            },
            m: function(date) {
                return date.getMonth() + 1;
            },
            MM: function(date) {
                return months[date.getMonth()];
            },
            M: function(date) {
                return monthAbbr[date.getMonth()];
            },
            dd: function(date) {
                return pad(date.getDate());
            },
            d: function(date) {
                return date.getDate();
            }
        },

        dates,

        length = (function() {
            var
                sec = 1000,
                min = sec * 60,
                hr = min * 60,
                day = hr * 24,
                week = day * 7;
            return {
                sec: sec,
                min: min,
                hr: hr,
                day: day,
                week: week
            };
        }());

    // populate day-related structures
    daysOfWeek.forEach(function(day, index) {
        dayDict[day] = index;
        var abbr = day.substr(0, 2);
        days.push(abbr);
        dayDict[abbr] = index;
        abbr = day.substr(0, 3);
        days3.push(abbr);
        dayDict[abbr] = index;
    });

    // populate month-related structures
    months.forEach(function(month, index) {
        monthDict[month] = index;
        var abbr = month.substr(0, 3);
        monthAbbr.push(abbr);
        monthDict[abbr] = index;
    });

    function isLeapYear(dateOrYear) {
        var year = dateOrYear instanceof Date ? dateOrYear.getFullYear() : dateOrYear;
        return !(year % 400) || (!(year % 4) && !!(year % 100));
    }

    function isValidObject (date) {
        var ms;
        if (typeof date === 'object' && date instanceof Date) {
            ms = date.getTime();
            return !isNaN(ms) && ms > 0;
        }
        return false;
    }

    function isDateType(value) {
        var parts, day, month, year, hours, minutes, seconds, ms;
        switch (typeof value) {
            case 'object':
                return isValidObject(value);
            case 'string':
                // is it a date in US format?
                parts = dateRegExp.exec(value);
                if (parts && parts[2] === parts[4]) {
                    month = +parts[1];
                    day = +parts[3];
                    year = +parts[5];
                    // rough check of a year
                    if (0 < year && year < 2100 && 1 <= month && month <= 12 && 1 <= day &&
                        day <= (month === 2 && isLeapYear(year) ? 29 : monthLengths[month - 1])) {
                        return true;
                    }
                }
                // is it a timestamp in a standard format?
                parts = tsRegExp.exec(value);
                if (parts) {
                    year = +parts[1];
                    month = +parts[2];
                    day = +parts[3];
                    hours = +parts[4];
                    minutes = +parts[5];
                    seconds = +parts[6];
                    if (0 < year && year < 2100 && 1 <= month && month <= 12 && 1 <= day &&
                        day <= (month === 2 && isLeapYear(year) ? 29 : monthLengths[month - 1]) &&
                        hours < 24 && minutes < 60 && seconds < 60) {
                        return true;
                    }
                }
            // intentional fall-down
        }
        return false;
    }

    function pad(num) {
        return (num < 10 ? '0' : '') + num;
    }

    function getMonth(dateOrIndex) {
        return typeof dateOrIndex === 'number' ? dateOrIndex : dateOrIndex.getMonth();
    }

    function getMonthIndex(name) {
        // TODO: do we really want a 0-based index? or should it be a 1-based one?
        var index = monthDict[name];
        return typeof index === 'number' ? index : void 0;
        // TODO: we return undefined for wrong month names --- is it right?
    }

    function getMonthName(date) {
        return months[getMonth(date)];
    }

    function getFirstSunday(date) {
        // TODO: what does it return? a negative index related to the 1st of the month?
        var d = new Date(date.getTime());
        d.setDate(1);
        return -d.getDay();
    }

    function getDaysInPrevMonth(date) {
        var d = new Date(date);
        d.setMonth(d.getMonth() - 1);
        return getDaysInMonth(d);
    }

    function getDaysInMonth(date) {
        var month = date.getMonth();
        return month === 1 && isLeapYear(date) ? 29 : monthLengths[month];
    }

    function strToDate(str) {
        if (typeof str !== 'string') {
            return str;
        }
        if (dates.timestamp.is(str)) {
            // 2000-02-29T00:00:00
            return dates.timestamp.from(str);
        }
        // 11/20/2000
        var parts = dateRegExp.exec(str);
        if (parts && parts[2] === parts[4]) {
            return new Date(+parts[5], +parts[1] - 1, +parts[3]);
        }
        // TODO: what to return for an invalid date? null?
        return new Date(-1); // invalid date
    }

    function formatDatePattern(date, pattern) {
        // 'M d, yyyy' Dec 5, 2015
        // 'MM dd yy' December 05 15
        // 'm-d-yy' 1-1-15
        // 'mm-dd-yyyy' 01-01-2015
        // 'm/d/yy' 12/25/15

        return pattern.replace(datePattern, function(name) {
            return datePatternLibrary[name](date);
        });
    }

    function formatDate(date, delimiterOrPattern) {
        if (delimiterOrPattern && delimiterOrPattern.length > 1) {
            return formatDatePattern(date, delimiterOrPattern);
        }
        var
            del = delimiterOrPattern || '/',
            y = date.getFullYear(),
            m = date.getMonth() + 1,
            d = date.getDate();

        return [pad(m), pad(d), y].join(del);
    }

    function dateToStr(date, delimiter) {
        return formatDate(date, delimiter);
    }

    function formatTime(date, usePeriod) {
        if (typeof date === 'string') {
            date = strToDate(date);
        }

        var
            period = 'AM',
            hours = date.getHours(),
            minutes = date.getMinutes(),
            retval,
            seconds = date.getSeconds();

        if (hours > 11) {
            hours -= 12;
            period = 'PM';
        }
        if (hours === 0) {
            hours = 12;
        }

        retval = hours + ':' + pad(minutes) + ':' + pad(seconds);

        if (usePeriod == true) {
            retval = retval + ' ' + period;
        }

        return retval;
    }

    function period(date) {
        if (typeof date === 'string') {
            date = strToDate(date);
        }

        var hours = date.getHours();

        return hours > 11 ? 'PM' : 'AM';
    }

    function toISO(date, includeTZ) {
        var
            str,
            now = new Date(),
            then = new Date(date.getTime());
        then.setHours(now.getHours());
        str = then.toISOString();
        if (!includeTZ) {
            str = str.split('.')[0];
            str += '.00Z';
        }
        return str;
    }

    function natural(date) {
        if (typeof date === 'string') {
            date = this.from(date);
        }

        var
            year = date.getFullYear().toString().substr(2),
            month = date.getMonth() + 1,
            day = date.getDate(),
            hours = date.getHours(),
            minutes = date.getMinutes(),
            period = 'AM';

        if (hours > 11) {
            hours -= 12;
            period = 'PM';
        }
        if (hours === 0) {
            hours = 12;
        }

        return hours + ':' + pad(minutes) + ' ' + period + ' on ' + pad(month) + '/' + pad(day) + '/' + year;
    }

    function addDays (date, days) {
        console.warn('addDays is deprecated. Instead, use `add`');
        return add(date, days);
    }

    function add (date, amount, dateType) {
        return subtract(date, -amount, dateType);
    }

    function subtract(date, amount, dateType) {
        // subtract N days from date
        var
            time = date.getTime(),
            tmp = new Date(time);

        if(dateType === 'month'){
            tmp.setMonth(tmp.getMonth() - amount);
            return tmp;
        }
        if(dateType === 'year'){
            tmp.setFullYear(tmp.getFullYear() - amount);
            return tmp;
        }

        return new Date(time - length.day * amount);
    }

    function subtractDate(date1, date2, dateType) {
        // dateType: week, day, hr, min, sec
        // past dates have a positive value
        // future dates have a negative value

        var divideBy = {
                week: length.week,
                day: length.day,
                hr: length.hr,
                min: length.min,
                sec: length.sec
            },
            utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate()),
            utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());

        dateType = dateType.toLowerCase();

        return Math.floor((utc2 - utc1) / divideBy[dateType]);
    }

    function isLess (d1, d2) {
        if(isValidObject(d1) && isValidObject(d2)){
            return d1.getTime() < d2.getTime();
        }
        return false;
    }

    function isGreater (d1, d2) {
        if(isValidObject(d1) && isValidObject(d2)){
            return d1.getTime() > d2.getTime();
        }
        return false;
    }

    function diff(date1, date2) {
        // return the difference between 2 dates in days
        var utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate()),
            utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());

        return Math.abs(Math.floor((utc2 - utc1) / length.day));
    }

    function copy (date) {
        if(isValidObject(date)){
            return new Date(date.getTime());
        }
        return date;
    }

    function getNaturalDay(date, compareDate, noDaysOfWeek) {

        var
            today = compareDate || new Date(),
            daysAgo = subtractDate(date, today, 'day');

        if (!daysAgo) {
            return 'Today';
        }
        if (daysAgo === 1) {
            return 'Yesterday';
        }

        if (daysAgo === -1) {
            return 'Tomorrow';
        }

        if (daysAgo < -1) {
            return formatDate(date);
        }

        return !noDaysOfWeek && daysAgo < daysOfWeek.length ? daysOfWeek[date.getDay()] : formatDate(date);
    }

    dates = {
        months: {
            full: months,
            abbr: monthAbbr,
            dict: monthDict
        },
        days: {
            full: daysOfWeek,
            abbr: days,
            abbr3: days3,
            dict: dayDict
        },
        length: length,
        subtract: subtract,
        add: add,
        addDays: addDays,
        diff: diff,
        copy: copy,
        clone: copy,
        isLess: isLess,
        isGreater: isGreater,
        toISO: toISO,
        isValidObject: isValidObject,
        isValid: isDateType,
        isDateType: isDateType,
        isLeapYear: isLeapYear,
        getMonthIndex: getMonthIndex,
        getMonthName: getMonthName,
        getFirstSunday: getFirstSunday,
        getDaysInMonth: getDaysInMonth,
        getDaysInPrevMonth: getDaysInPrevMonth,
        formatDate: formatDate,
        formatTime: formatTime,
        strToDate: strToDate,
        subtractDate: subtractDate,
        dateToStr: dateToStr,
        period: period,
        natural: natural,
        getNaturalDay: getNaturalDay,
        pad: pad,
        timestamp: {
            to: function(date) {
                return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' +
                    pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
            },
            from: function(str) {
                // 2015-05-26T00:00:00

                // strip timezone // 2015-05-26T00:00:00Z
                str = str.split('Z')[0];

                // ["2000-02-30T00:00:00", "2000", "02", "30", "00", "00", "00", index: 0, input: "2000-02-30T00:00:00"]
                var parts = tsRegExp.exec(str);
                // TODO: do we need a validation?
                if (parts) {
                    // new Date(1995, 11, 17, 3, 24, 0);
                    return new Date(+parts[1], +parts[2] - 1, +parts[3], +parts[4], +parts[5], parseInt(parts[6], 10));
                }
                // TODO: what do we return for an invalid date? null?
                return new Date(-1);
            },
            is: function(str) {
                return tsRegExp.test(str);
            }
        }
    };

    return dates;

}));
},{}],5:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

require('BaseComponent/src/properties');
require('BaseComponent/src/template');
require('BaseComponent/src/refs');
var BaseComponent = require('BaseComponent');
var dates = require('dates');

var props = ['label', 'name'];
var bools = ['no-event', 'disabled', 'readonly', 'checked', 'range-picker', 'range-left', 'range-right'];

var DatePicker = function (_BaseComponent) {
	_inherits(DatePicker, _BaseComponent);

	_createClass(DatePicker, [{
		key: 'props',
		get: function get() {
			return props;
		}
	}, {
		key: 'bools',
		get: function get() {
			return bools;
		}
	}, {
		key: 'templateString',
		get: function get() {
			return '\n<div class="calendar" ref="calNode">\n<div class="cal-header" ref="headerNode">\n\t<span class="cal-lft" ref="lftNode"></span>\n\t<span class="cal-month" ref="monthNode"></span>\n\t<span class="cal-rgt" ref="rgtNode"></span>\n</div>\n<div class="cal-container" ref="container"></div>\n<div class="cal-footer">\n\t<a href="javascript:void(0);" ref="footerLink"></a>\n</div>\n</div>';
		}
	}, {
		key: 'value',
		set: function set(value) {
			var _this2 = this;

			// might need attributeChanged
			this.valueDate = dates.isDateType(value) ? dates.strToDate(value) : today;
			this.current = this.valueDate;
			onDomReady(this, function () {
				_this2.render();
			});
		},
		get: function get() {
			if (!this.valueDate) {
				var value = this.getAttribute('value') || today;
				this.valueDate = dates.strToDate(value);
			}
			return this.valueDate;
		}
	}], [{
		key: 'observedAttributes',
		get: function get() {
			return [].concat(props, bools);
		}
	}]);

	function DatePicker() {
		_classCallCheck(this, DatePicker);

		var _this = _possibleConstructorReturn(this, (DatePicker.__proto__ || Object.getPrototypeOf(DatePicker)).call(this));

		_this.previous = {};
		_this.modes = ['month', 'year', 'decade'];
		_this.mode = 0;
		return _this;
	}

	_createClass(DatePicker, [{
		key: 'setDisplay',
		value: function setDisplay() /*year, month*/{
			for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
				args[_key] = arguments[_key];
			}

			if (args.length === 2) {
				this.current.setFullYear(args[0]);
				this.current.setMonth(args[1]);
			} else if (_typeof(args[0]) === 'object') {
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
	}, {
		key: 'getFormattedValue',
		value: function getFormattedValue() {
			return this.valueDate === today ? '' : !!this.valueDate ? dates.dateToStr(this.valueDate) : '';
		}
	}, {
		key: 'emitValue',
		value: function emitValue() {
			// TODO options for timestamp or other formats
			var event = {
				value: this.getFormattedValue(),
				date: this.valueDate
			};
			if (this['range-picker']) {
				event.first = this.firstRange;
				event.second = this.secondRange;
			}
			this.emit('change', event);
		}
	}, {
		key: 'emitDisplayEvents',
		value: function emitDisplayEvents() {
			var month = this.current.getMonth(),
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
	}, {
		key: 'onClickDay',
		value: function onClickDay(node) {
			var day = +node.innerHTML,
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
	}, {
		key: 'onClickMonth',
		value: function onClickMonth(direction) {
			switch (this.mode) {
				case 1:
					// year mode
					this.current.setFullYear(this.current.getFullYear() + direction * 1);
					this.setMode(this.mode);
					break;
				case 2:
					// century mode
					this.current.setFullYear(this.current.getFullYear() + direction * 12);
					this.setMode(this.mode);
					break;
				default:
					this.current.setMonth(this.current.getMonth() + direction * 1);
					this.render();
					break;
			}
		}
	}, {
		key: 'onClickYear',
		value: function onClickYear(node) {
			var index = dates.getMonthIndex(node.innerHTML);
			this.current.setMonth(index);
			this.render();
		}
	}, {
		key: 'onClickDecade',
		value: function onClickDecade(node) {
			var year = +node.innerHTML;
			this.current.setFullYear(year);
			this.setMode(this.mode - 1);
		}
	}, {
		key: 'setMode',
		value: function setMode(mode) {
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
	}, {
		key: 'setYearMode',
		value: function setYearMode() {
			destroy(this.bodyNode);

			var i,
			    node = dom('div', { class: 'cal-body year' });

			for (i = 0; i < 12; i++) {
				dom('div', { html: dates.months.abbr[i], class: 'year' }, node);
			}

			this.monthNode.innerHTML = this.current.getFullYear();
			this.container.appendChild(node);
			this.modeNode = node;
		}
	}, {
		key: 'setDecadeMode',
		value: function setDecadeMode() {
			var i,
			    node = dom('div', { class: 'cal-body decade' }),
			    year = this.current.getFullYear() - 6;

			for (i = 0; i < 12; i++) {
				dom('div', { html: year, class: 'decade' }, node);
				year += 1;
			}
			this.monthNode.innerHTML = year - 12 + '-' + (year - 1);
			this.container.appendChild(node);
			this.modeNode = node;
		}
	}, {
		key: 'selectDay',
		value: function selectDay() {
			if (this['range-picker']) {
				return;
			}
			var now = this.querySelector('.ay-selected'),
			    node = this.dayMap[this.current.getDate()];
			if (now) {
				now.classList.remove('ay-selected');
			}
			node.classList.add('ay-selected');
		}
	}, {
		key: 'clearRange',
		value: function clearRange() {
			this.hoverDate = 0;
			this.setRange(null, null);
		}
	}, {
		key: 'setRange',
		value: function setRange(firstRange, secondRange) {
			this.firstRange = firstRange;
			this.secondRange = secondRange;
			this.displayRange();
			this.setRangeEndPoints();
		}
	}, {
		key: 'clickSelectRange',
		value: function clickSelectRange() {
			var prevFirst = !!this.firstRange,
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
	}, {
		key: 'hoverSelectRange',
		value: function hoverSelectRange(e) {
			if (this.firstRange && !this.secondRange && e.target.classList.contains('on')) {
				this.hoverDate = e.target._date;
				this.displayRange();
			}
		}
	}, {
		key: 'displayRangeToEnd',
		value: function displayRangeToEnd() {
			if (this.firstRange) {
				this.hoverDate = copy(this.current);
				this.hoverDate.setMonth(this.hoverDate.getMonth() + 1);
				this.displayRange();
			}
		}
	}, {
		key: 'displayRange',
		value: function displayRange() {
			var beg = this.firstRange,
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
	}, {
		key: 'hasRange',
		value: function hasRange() {
			return !!this.firstRange && !!this.secondRange;
		}
	}, {
		key: 'isValidRange',
		value: function isValidRange(date) {
			if (!this.firstRange) {
				return true;
			}
			return date.getTime() > this.firstRange.getTime();
		}
	}, {
		key: 'setRangeEndPoints',
		value: function setRangeEndPoints() {
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
	}, {
		key: 'clearEndPoints',
		value: function clearEndPoints() {
			var first = this.querySelector('.ay-range-first'),
			    second = this.querySelector('.ay-range-second');
			if (first) {
				first.classList.remove('ay-range-first');
			}
			if (second) {
				second.classList.remove('ay-range-second');
			}
		}
	}, {
		key: 'domReady',
		value: function domReady() {
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
	}, {
		key: 'render',
		value: function render() {
			// dateNum increments, starting with the first Sunday
			// showing on the monthly calendar. This is usually the
			// previous month, so dateNum will start as a negative number
			this.setMode(0);
			if (this.bodyNode) {
				dom.destroy(this.bodyNode);
			}

			this.dayMap = {};

			var node = dom('div', { class: 'cal-body' }),
			    i,
			    tx,
			    nextMonth = 0,
			    isThisMonth,
			    day,
			    css,
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
	}, {
		key: 'setFooter',
		value: function setFooter() {
			var d = new Date(),
			    str = dates.days.full[d.getDay()] + ' ' + dates.months.full[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
			this.footerLink.innerHTML = str;
		}
	}, {
		key: 'connect',
		value: function connect() {
			var _this3 = this;

			this.on(this.lftNode, 'click', function () {
				_this3.onClickMonth(-1);
			});

			this.on(this.rgtNode, 'click', function () {
				_this3.onClickMonth(1);
			});

			this.on(this.footerLink, 'click', function () {
				_this3.current = new Date();
				_this3.render();
			});

			this.on(this.container, 'click', function (e) {
				_this3.fire('pre-click', e, true, true);
				var node = e.target;
				if (node.classList.contains('day')) {
					_this3.onClickDay(node);
				} else if (node.classList.contains('year')) {
					_this3.onClickYear(node);
				} else if (node.classList.contains('decade')) {
					_this3.onClickDecade(node);
				}
			});

			this.on(this.monthNode, 'click', function () {
				if (_this3.mode + 1 === _this3.modes.length) {
					_this3.mode = 0;
					_this3.render();
				} else {
					_this3.setMode(_this3.mode + 1);
				}
			});

			if (this['range-picker']) {
				this.on(this.container, 'mouseover', this.hoverSelectRange.bind(this));
			}
		}
	}]);

	return DatePicker;
}(BaseComponent);

var today = new Date();

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

function isThisMonth(date, currentDate) {
	return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
}

function inRange(dateTime, begTime, endTime) {
	return dateTime >= begTime && dateTime <= endTime;
}

function copy(date) {
	return new Date(date.getTime());
}

customElements.define('date-picker', DatePicker);

module.exports = DatePicker;

},{"BaseComponent":"BaseComponent","BaseComponent/src/properties":1,"BaseComponent/src/refs":2,"BaseComponent/src/template":3,"dates":4}],6:[function(require,module,exports){
'use strict';

require('./globals');
require('../../src/date-picker');

},{"../../src/date-picker":5,"./globals":7}],7:[function(require,module,exports){
'use strict';

window['no-native-shim'] = false;
require('custom-elements-polyfill');
window.on = require('on');
window.dom = require('dom');

},{"custom-elements-polyfill":"custom-elements-polyfill","dom":"dom","on":"on"}]},{},[6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQmFzZUNvbXBvbmVudC9zcmMvcHJvcGVydGllcy5qcyIsIm5vZGVfbW9kdWxlcy9CYXNlQ29tcG9uZW50L3NyYy9yZWZzLmpzIiwibm9kZV9tb2R1bGVzL0Jhc2VDb21wb25lbnQvc3JjL3RlbXBsYXRlLmpzIiwibm9kZV9tb2R1bGVzL2RhdGVzL3NyYy9kYXRlcy5qcyIsInNyYy9kYXRlLXBpY2tlci5qcyIsInRlc3RzL3NyYy9kYXRlLXBpY2tlci10ZXN0cy5qcyIsInRlc3RzL3NyYy9nbG9iYWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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OlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJjb25zdCBCYXNlQ29tcG9uZW50ID0gcmVxdWlyZSgnQmFzZUNvbXBvbmVudCcpO1xuY29uc3QgZG9tID0gcmVxdWlyZSgnZG9tJyk7XG5cbmZ1bmN0aW9uIHNldEJvb2xlYW4gKG5vZGUsIHByb3ApIHtcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG5vZGUsIHByb3AsIHtcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcblx0XHRnZXQgKCkge1xuXHRcdFx0cmV0dXJuIG5vZGUuaGFzQXR0cmlidXRlKHByb3ApO1xuXHRcdH0sXG5cdFx0c2V0ICh2YWx1ZSkge1xuXHRcdFx0dGhpcy5pc1NldHRpbmdBdHRyaWJ1dGUgPSB0cnVlO1xuXHRcdFx0aWYgKHZhbHVlKSB7XG5cdFx0XHRcdHRoaXMuc2V0QXR0cmlidXRlKHByb3AsICcnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMucmVtb3ZlQXR0cmlidXRlKHByb3ApO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgZm4gPSB0aGlzW29uaWZ5KHByb3ApXTtcblx0XHRcdGlmKGZuKXtcblx0XHRcdFx0Zm4uY2FsbCh0aGlzLCB2YWx1ZSk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuaXNTZXR0aW5nQXR0cmlidXRlID0gZmFsc2U7XG5cdFx0fVxuXHR9KTtcbn1cblxuZnVuY3Rpb24gc2V0UHJvcGVydHkgKG5vZGUsIHByb3ApIHtcblx0bGV0IHByb3BWYWx1ZTtcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG5vZGUsIHByb3AsIHtcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcblx0XHRnZXQgKCkge1xuXHRcdFx0cmV0dXJuIHByb3BWYWx1ZSAhPT0gdW5kZWZpbmVkID8gcHJvcFZhbHVlIDogZG9tLm5vcm1hbGl6ZSh0aGlzLmdldEF0dHJpYnV0ZShwcm9wKSk7XG5cdFx0fSxcblx0XHRzZXQgKHZhbHVlKSB7XG5cdFx0XHR0aGlzLmlzU2V0dGluZ0F0dHJpYnV0ZSA9IHRydWU7XG5cdFx0XHR0aGlzLnNldEF0dHJpYnV0ZShwcm9wLCB2YWx1ZSk7XG5cdFx0XHRjb25zdCBmbiA9IHRoaXNbb25pZnkocHJvcCldO1xuXHRcdFx0aWYoZm4pe1xuXHRcdFx0XHRvbkRvbVJlYWR5KHRoaXMsICgpID0+IHtcblx0XHRcdFx0XHR2YWx1ZSA9IGZuLmNhbGwodGhpcywgdmFsdWUpIHx8IHZhbHVlO1xuXHRcdFx0XHRcdGlmKHZhbHVlICE9PSB1bmRlZmluZWQpe1xuXHRcdFx0XHRcdFx0cHJvcFZhbHVlID0gdmFsdWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdHRoaXMuaXNTZXR0aW5nQXR0cmlidXRlID0gZmFsc2U7XG5cdFx0fVxuXHR9KTtcbn1cblxuZnVuY3Rpb24gc2V0T2JqZWN0IChub2RlLCBwcm9wKSB7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShub2RlLCBwcm9wLCB7XG5cdFx0ZW51bWVyYWJsZTogdHJ1ZSxcblx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdFx0Z2V0ICgpIHtcblx0XHRcdHJldHVybiB0aGlzWydfXycgKyBwcm9wXTtcblx0XHR9LFxuXHRcdHNldCAodmFsdWUpIHtcblx0XHRcdHRoaXNbJ19fJyArIHByb3BdID0gdmFsdWU7XG5cdFx0fVxuXHR9KTtcbn1cblxuZnVuY3Rpb24gc2V0UHJvcGVydGllcyAobm9kZSkge1xuXHRsZXQgcHJvcHMgPSBub2RlLnByb3BzIHx8IG5vZGUucHJvcGVydGllcztcblx0aWYgKHByb3BzKSB7XG5cdFx0cHJvcHMuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuXHRcdFx0aWYgKHByb3AgPT09ICdkaXNhYmxlZCcpIHtcblx0XHRcdFx0c2V0Qm9vbGVhbihub2RlLCBwcm9wKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRzZXRQcm9wZXJ0eShub2RlLCBwcm9wKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxufVxuXG5mdW5jdGlvbiBzZXRCb29sZWFucyAobm9kZSkge1xuXHRsZXQgcHJvcHMgPSBub2RlLmJvb2xzIHx8IG5vZGUuYm9vbGVhbnM7XG5cdGlmIChwcm9wcykge1xuXHRcdHByb3BzLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcblx0XHRcdHNldEJvb2xlYW4obm9kZSwgcHJvcCk7XG5cdFx0fSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gc2V0T2JqZWN0cyAobm9kZSkge1xuXHRsZXQgcHJvcHMgPSBub2RlLm9iamVjdHM7XG5cdGlmIChwcm9wcykge1xuXHRcdHByb3BzLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcblx0XHRcdHNldE9iamVjdChub2RlLCBwcm9wKTtcblx0XHR9KTtcblx0fVxufVxuXG5mdW5jdGlvbiBjYXAgKG5hbWUpIHtcblx0cmV0dXJuIG5hbWUuc3Vic3RyaW5nKDAsMSkudG9VcHBlckNhc2UoKSArIG5hbWUuc3Vic3RyaW5nKDEpO1xufVxuXG5mdW5jdGlvbiBvbmlmeSAobmFtZSkge1xuXHRyZXR1cm4gJ29uJyArIG5hbWUuc3BsaXQoJy0nKS5tYXAod29yZCA9PiBjYXAod29yZCkpLmpvaW4oJycpO1xufVxuXG5mdW5jdGlvbiBpc0Jvb2wgKG5vZGUsIG5hbWUpIHtcblx0cmV0dXJuIChub2RlLmJvb2xzIHx8IG5vZGUuYm9vbGVhbnMgfHwgW10pLmluZGV4T2YobmFtZSkgPiAtMTtcbn1cblxuZnVuY3Rpb24gYm9vbE5vcm0gKHZhbHVlKSB7XG5cdGlmKHZhbHVlID09PSAnJyl7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblx0cmV0dXJuIGRvbS5ub3JtYWxpemUodmFsdWUpO1xufVxuXG5mdW5jdGlvbiBwcm9wTm9ybSAodmFsdWUpIHtcblx0cmV0dXJuIGRvbS5ub3JtYWxpemUodmFsdWUpO1xufVxuXG5CYXNlQ29tcG9uZW50LmFkZFBsdWdpbih7XG5cdG5hbWU6ICdwcm9wZXJ0aWVzJyxcblx0b3JkZXI6IDEwLFxuXHRpbml0OiBmdW5jdGlvbiAobm9kZSkge1xuXHRcdHNldFByb3BlcnRpZXMobm9kZSk7XG5cdFx0c2V0Qm9vbGVhbnMobm9kZSk7XG5cdH0sXG5cdHByZUF0dHJpYnV0ZUNoYW5nZWQ6IGZ1bmN0aW9uIChub2RlLCBuYW1lLCB2YWx1ZSkge1xuXHRcdGlmIChub2RlLmlzU2V0dGluZ0F0dHJpYnV0ZSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRpZihpc0Jvb2wobm9kZSwgbmFtZSkpe1xuXHRcdFx0dmFsdWUgPSBib29sTm9ybSh2YWx1ZSk7XG5cdFx0XHRub2RlW25hbWVdID0gISF2YWx1ZTtcblx0XHRcdGlmKCF2YWx1ZSl7XG5cdFx0XHRcdG5vZGVbbmFtZV0gPSBmYWxzZTtcblx0XHRcdFx0bm9kZS5pc1NldHRpbmdBdHRyaWJ1dGUgPSB0cnVlO1xuXHRcdFx0XHRub2RlLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcblx0XHRcdFx0bm9kZS5pc1NldHRpbmdBdHRyaWJ1dGUgPSBmYWxzZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG5vZGVbbmFtZV0gPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdG5vZGVbbmFtZV0gPSBwcm9wTm9ybSh2YWx1ZSk7XG5cdH1cbn0pOyIsImNvbnN0IGRvbSA9IHJlcXVpcmUoJ2RvbScpO1xuY29uc3QgQmFzZUNvbXBvbmVudCA9IHJlcXVpcmUoJ0Jhc2VDb21wb25lbnQnKTtcblxuZnVuY3Rpb24gYXNzaWduUmVmcyAobm9kZSkge1xuICAgIGRvbS5xdWVyeUFsbChub2RlLCAnW3JlZl0nKS5mb3JFYWNoKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgICBsZXQgbmFtZSA9IGNoaWxkLmdldEF0dHJpYnV0ZSgncmVmJyk7XG4gICAgICAgIG5vZGVbbmFtZV0gPSBjaGlsZDtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gYXNzaWduRXZlbnRzIChub2RlKSB7XG4gICAgLy8gPGRpdiBvbj1cImNsaWNrOm9uQ2xpY2tcIj5cbiAgICBkb20ucXVlcnlBbGwobm9kZSwgJ1tvbl0nKS5mb3JFYWNoKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgICBsZXRcbiAgICAgICAgICAgIGtleVZhbHVlID0gY2hpbGQuZ2V0QXR0cmlidXRlKCdvbicpLFxuICAgICAgICAgICAgZXZlbnQgPSBrZXlWYWx1ZS5zcGxpdCgnOicpWzBdLnRyaW0oKSxcbiAgICAgICAgICAgIG1ldGhvZCA9IGtleVZhbHVlLnNwbGl0KCc6JylbMV0udHJpbSgpO1xuICAgICAgICBub2RlLm9uKGNoaWxkLCBldmVudCwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIG5vZGVbbWV0aG9kXShlKVxuICAgICAgICB9KVxuICAgIH0pO1xufVxuXG5CYXNlQ29tcG9uZW50LmFkZFBsdWdpbih7XG4gICAgbmFtZTogJ3JlZnMnLFxuICAgIG9yZGVyOiAzMCxcbiAgICBwcmVDb25uZWN0ZWQ6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIGFzc2lnblJlZnMobm9kZSk7XG4gICAgICAgIGFzc2lnbkV2ZW50cyhub2RlKTtcbiAgICB9XG59KTsiLCJjb25zdCBCYXNlQ29tcG9uZW50ICA9IHJlcXVpcmUoJ0Jhc2VDb21wb25lbnQnKTtcbmNvbnN0IGRvbSA9IHJlcXVpcmUoJ2RvbScpO1xuXG52YXJcbiAgICBsaWdodE5vZGVzID0ge30sXG4gICAgaW5zZXJ0ZWQgPSB7fTtcblxuZnVuY3Rpb24gaW5zZXJ0IChub2RlKSB7XG4gICAgaWYoaW5zZXJ0ZWRbbm9kZS5fdWlkXSB8fCAhaGFzVGVtcGxhdGUobm9kZSkpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbGxlY3RMaWdodE5vZGVzKG5vZGUpO1xuICAgIGluc2VydFRlbXBsYXRlKG5vZGUpO1xuICAgIGluc2VydGVkW25vZGUuX3VpZF0gPSB0cnVlO1xufVxuXG5mdW5jdGlvbiBjb2xsZWN0TGlnaHROb2Rlcyhub2RlKXtcbiAgICBsaWdodE5vZGVzW25vZGUuX3VpZF0gPSBsaWdodE5vZGVzW25vZGUuX3VpZF0gfHwgW107XG4gICAgd2hpbGUobm9kZS5jaGlsZE5vZGVzLmxlbmd0aCl7XG4gICAgICAgIGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXS5wdXNoKG5vZGUucmVtb3ZlQ2hpbGQobm9kZS5jaGlsZE5vZGVzWzBdKSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBoYXNUZW1wbGF0ZSAobm9kZSkge1xuICAgIHJldHVybiAhIW5vZGUuZ2V0VGVtcGxhdGVOb2RlKCk7XG59XG5cbmZ1bmN0aW9uIGluc2VydFRlbXBsYXRlQ2hhaW4gKG5vZGUpIHtcbiAgICB2YXIgdGVtcGxhdGVzID0gbm9kZS5nZXRUZW1wbGF0ZUNoYWluKCk7XG4gICAgdGVtcGxhdGVzLnJldmVyc2UoKS5mb3JFYWNoKGZ1bmN0aW9uICh0ZW1wbGF0ZSkge1xuICAgICAgICBnZXRDb250YWluZXIobm9kZSkuYXBwZW5kQ2hpbGQoQmFzZUNvbXBvbmVudC5jbG9uZSh0ZW1wbGF0ZSkpO1xuICAgIH0pO1xuICAgIGluc2VydENoaWxkcmVuKG5vZGUpO1xufVxuXG5mdW5jdGlvbiBpbnNlcnRUZW1wbGF0ZSAobm9kZSkge1xuICAgIGlmKG5vZGUubmVzdGVkVGVtcGxhdGUpe1xuICAgICAgICBpbnNlcnRUZW1wbGF0ZUNoYWluKG5vZGUpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhclxuICAgICAgICB0ZW1wbGF0ZU5vZGUgPSBub2RlLmdldFRlbXBsYXRlTm9kZSgpO1xuXG4gICAgaWYodGVtcGxhdGVOb2RlKSB7XG4gICAgICAgIG5vZGUuYXBwZW5kQ2hpbGQoQmFzZUNvbXBvbmVudC5jbG9uZSh0ZW1wbGF0ZU5vZGUpKTtcbiAgICB9XG4gICAgaW5zZXJ0Q2hpbGRyZW4obm9kZSk7XG59XG5cbmZ1bmN0aW9uIGdldENvbnRhaW5lciAobm9kZSkge1xuICAgIHZhciBjb250YWluZXJzID0gbm9kZS5xdWVyeVNlbGVjdG9yQWxsKCdbcmVmPVwiY29udGFpbmVyXCJdJyk7XG4gICAgaWYoIWNvbnRhaW5lcnMgfHwgIWNvbnRhaW5lcnMubGVuZ3RoKXtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxuICAgIHJldHVybiBjb250YWluZXJzW2NvbnRhaW5lcnMubGVuZ3RoIC0gMV07XG59XG5cbmZ1bmN0aW9uIGluc2VydENoaWxkcmVuIChub2RlKSB7XG4gICAgdmFyIGksXG4gICAgICAgIGNvbnRhaW5lciA9IGdldENvbnRhaW5lcihub2RlKSxcbiAgICAgICAgY2hpbGRyZW4gPSBsaWdodE5vZGVzW25vZGUuX3VpZF07XG5cbiAgICBpZihjb250YWluZXIgJiYgY2hpbGRyZW4gJiYgY2hpbGRyZW4ubGVuZ3RoKXtcbiAgICAgICAgZm9yKGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspe1xuICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGNoaWxkcmVuW2ldKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuQmFzZUNvbXBvbmVudC5wcm90b3R5cGUuZ2V0TGlnaHROb2RlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbGlnaHROb2Rlc1t0aGlzLl91aWRdO1xufTtcblxuQmFzZUNvbXBvbmVudC5wcm90b3R5cGUuZ2V0VGVtcGxhdGVOb2RlID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIGNhY2hpbmcgY2F1c2VzIGRpZmZlcmVudCBjbGFzc2VzIHRvIHB1bGwgdGhlIHNhbWUgdGVtcGxhdGUgLSB3YXQ/XG4gICAgLy9pZighdGhpcy50ZW1wbGF0ZU5vZGUpIHtcbiAgICAgICAgaWYgKHRoaXMudGVtcGxhdGVJZCkge1xuICAgICAgICAgICAgdGhpcy50ZW1wbGF0ZU5vZGUgPSBkb20uYnlJZCh0aGlzLnRlbXBsYXRlSWQucmVwbGFjZSgnIycsJycpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0aGlzLnRlbXBsYXRlU3RyaW5nKSB7XG4gICAgICAgICAgICB0aGlzLnRlbXBsYXRlTm9kZSA9IGRvbS50b0RvbSgnPHRlbXBsYXRlPicgKyB0aGlzLnRlbXBsYXRlU3RyaW5nICsgJzwvdGVtcGxhdGU+Jyk7XG4gICAgICAgIH1cbiAgICAvL31cbiAgICByZXR1cm4gdGhpcy50ZW1wbGF0ZU5vZGU7XG59O1xuXG5CYXNlQ29tcG9uZW50LnByb3RvdHlwZS5nZXRUZW1wbGF0ZUNoYWluID0gZnVuY3Rpb24gKCkge1xuXG4gICAgbGV0XG4gICAgICAgIGNvbnRleHQgPSB0aGlzLFxuICAgICAgICB0ZW1wbGF0ZXMgPSBbXSxcbiAgICAgICAgdGVtcGxhdGU7XG5cbiAgICAvLyB3YWxrIHRoZSBwcm90b3R5cGUgY2hhaW47IEJhYmVsIGRvZXNuJ3QgYWxsb3cgdXNpbmdcbiAgICAvLyBgc3VwZXJgIHNpbmNlIHdlIGFyZSBvdXRzaWRlIG9mIHRoZSBDbGFzc1xuICAgIHdoaWxlKGNvbnRleHQpe1xuICAgICAgICBjb250ZXh0ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKGNvbnRleHQpO1xuICAgICAgICBpZighY29udGV4dCl7IGJyZWFrOyB9XG4gICAgICAgIC8vIHNraXAgcHJvdG90eXBlcyB3aXRob3V0IGEgdGVtcGxhdGVcbiAgICAgICAgLy8gKGVsc2UgaXQgd2lsbCBwdWxsIGFuIGluaGVyaXRlZCB0ZW1wbGF0ZSBhbmQgY2F1c2UgZHVwbGljYXRlcylcbiAgICAgICAgaWYoY29udGV4dC5oYXNPd25Qcm9wZXJ0eSgndGVtcGxhdGVTdHJpbmcnKSB8fCBjb250ZXh0Lmhhc093blByb3BlcnR5KCd0ZW1wbGF0ZUlkJykpIHtcbiAgICAgICAgICAgIHRlbXBsYXRlID0gY29udGV4dC5nZXRUZW1wbGF0ZU5vZGUoKTtcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSkge1xuICAgICAgICAgICAgICAgIHRlbXBsYXRlcy5wdXNoKHRlbXBsYXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGVtcGxhdGVzO1xufTtcblxuQmFzZUNvbXBvbmVudC5hZGRQbHVnaW4oe1xuICAgIG5hbWU6ICd0ZW1wbGF0ZScsXG4gICAgb3JkZXI6IDIwLFxuICAgIHByZUNvbm5lY3RlZDogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgaW5zZXJ0KG5vZGUpO1xuICAgIH1cbn0pOyIsIi8qIFVNRC5kZWZpbmUgKi8gKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gICAgaWYgKHR5cGVvZiBjdXN0b21Mb2FkZXIgPT09ICdmdW5jdGlvbicpeyBjdXN0b21Mb2FkZXIoZmFjdG9yeSwgJ2RhdGVzJyk7IH1cbiAgICBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpeyBkZWZpbmUoW10sIGZhY3RvcnkpOyB9XG4gICAgZWxzZSBpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpeyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTsgfVxuICAgIGVsc2V7IHJvb3QucmV0dXJuRXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgICAgICAgd2luZG93LmRhdGVzID0gZmFjdG9yeSgpOyB9XG59KHRoaXMsIGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcbiAgICAvLyBkYXRlcy5qc1xuICAgIC8vICBkYXRlIGhlbHBlciBsaWJcbiAgICAvL1xuICAgIHZhclxuICAgICAgICAvLyB0ZXN0cyB0aGF0IGl0IGlzIGEgZGF0ZSBzdHJpbmcsIG5vdCBhIHZhbGlkIGRhdGUuIDg4Lzg4Lzg4ODggd291bGQgYmUgdHJ1ZVxuICAgICAgICBkYXRlUmVnRXhwID0gL14oXFxkezEsMn0pKFtcXC8tXSkoXFxkezEsMn0pKFtcXC8tXSkoXFxkezR9KVxcYi8sXG4gICAgICAgIC8vIDIwMTUtMDUtMjZUMDA6MDA6MDBcbiAgICAgICAgdHNSZWdFeHAgPSAvXihcXGR7NH0pLShcXGR7Mn0pLShcXGR7Mn0pVChcXGR7Mn0pOihcXGR7Mn0pOihcXGR7Mn0pXFxiLyxcblxuICAgICAgICBkYXlzT2ZXZWVrID0gWydTdW5kYXknLCAnTW9uZGF5JywgJ1R1ZXNkYXknLCAnV2VkbmVzZGF5JywgJ1RodXJzZGF5JywgJ0ZyaWRheScsICdTYXR1cmRheSddLFxuICAgICAgICBkYXlzID0gW10sXG4gICAgICAgIGRheXMzID0gW10sXG4gICAgICAgIGRheURpY3QgPSB7fSxcblxuICAgICAgICBtb250aHMgPSBbJ0phbnVhcnknLCAnRmVicnVhcnknLCAnTWFyY2gnLCAnQXByaWwnLCAnTWF5JywgJ0p1bmUnLCAnSnVseScsICdBdWd1c3QnLCAnU2VwdGVtYmVyJywgJ09jdG9iZXInLCAnTm92ZW1iZXInLCAnRGVjZW1iZXInXSxcbiAgICAgICAgbW9udGhMZW5ndGhzID0gWzMxLCAyOCwgMzEsIDMwLCAzMSwgMzAsIDMxLCAzMSwgMzAsIDMxLCAzMCwgMzFdLFxuICAgICAgICBtb250aEFiYnIgPSBbXSxcbiAgICAgICAgbW9udGhEaWN0ID0ge30sXG5cbiAgICAgICAgZGF0ZVBhdHRlcm4gPSAveXl5eXx5eXxtbXxtfE1NfE18ZGR8ZC9nLFxuICAgICAgICBkYXRlUGF0dGVybkxpYnJhcnkgPSB7XG4gICAgICAgICAgICB5eXl5OiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGUuZ2V0RnVsbFllYXIoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB5eTogZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoZGF0ZS5nZXRGdWxsWWVhcigpICsgJycpLnN1YnN0cmluZygyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtbTogZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYWQoZGF0ZS5nZXRNb250aCgpICsgMSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbTogZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXRlLmdldE1vbnRoKCkgKyAxO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIE1NOiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1vbnRoc1tkYXRlLmdldE1vbnRoKCldO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIE06IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbW9udGhBYmJyW2RhdGUuZ2V0TW9udGgoKV07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGQ6IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFkKGRhdGUuZ2V0RGF0ZSgpKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkOiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGUuZ2V0RGF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGRhdGVzLFxuXG4gICAgICAgIGxlbmd0aCA9IChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhclxuICAgICAgICAgICAgICAgIHNlYyA9IDEwMDAsXG4gICAgICAgICAgICAgICAgbWluID0gc2VjICogNjAsXG4gICAgICAgICAgICAgICAgaHIgPSBtaW4gKiA2MCxcbiAgICAgICAgICAgICAgICBkYXkgPSBociAqIDI0LFxuICAgICAgICAgICAgICAgIHdlZWsgPSBkYXkgKiA3O1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzZWM6IHNlYyxcbiAgICAgICAgICAgICAgICBtaW46IG1pbixcbiAgICAgICAgICAgICAgICBocjogaHIsXG4gICAgICAgICAgICAgICAgZGF5OiBkYXksXG4gICAgICAgICAgICAgICAgd2Vlazogd2Vla1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSgpKTtcblxuICAgIC8vIHBvcHVsYXRlIGRheS1yZWxhdGVkIHN0cnVjdHVyZXNcbiAgICBkYXlzT2ZXZWVrLmZvckVhY2goZnVuY3Rpb24oZGF5LCBpbmRleCkge1xuICAgICAgICBkYXlEaWN0W2RheV0gPSBpbmRleDtcbiAgICAgICAgdmFyIGFiYnIgPSBkYXkuc3Vic3RyKDAsIDIpO1xuICAgICAgICBkYXlzLnB1c2goYWJicik7XG4gICAgICAgIGRheURpY3RbYWJicl0gPSBpbmRleDtcbiAgICAgICAgYWJiciA9IGRheS5zdWJzdHIoMCwgMyk7XG4gICAgICAgIGRheXMzLnB1c2goYWJicik7XG4gICAgICAgIGRheURpY3RbYWJicl0gPSBpbmRleDtcbiAgICB9KTtcblxuICAgIC8vIHBvcHVsYXRlIG1vbnRoLXJlbGF0ZWQgc3RydWN0dXJlc1xuICAgIG1vbnRocy5mb3JFYWNoKGZ1bmN0aW9uKG1vbnRoLCBpbmRleCkge1xuICAgICAgICBtb250aERpY3RbbW9udGhdID0gaW5kZXg7XG4gICAgICAgIHZhciBhYmJyID0gbW9udGguc3Vic3RyKDAsIDMpO1xuICAgICAgICBtb250aEFiYnIucHVzaChhYmJyKTtcbiAgICAgICAgbW9udGhEaWN0W2FiYnJdID0gaW5kZXg7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBpc0xlYXBZZWFyKGRhdGVPclllYXIpIHtcbiAgICAgICAgdmFyIHllYXIgPSBkYXRlT3JZZWFyIGluc3RhbmNlb2YgRGF0ZSA/IGRhdGVPclllYXIuZ2V0RnVsbFllYXIoKSA6IGRhdGVPclllYXI7XG4gICAgICAgIHJldHVybiAhKHllYXIgJSA0MDApIHx8ICghKHllYXIgJSA0KSAmJiAhISh5ZWFyICUgMTAwKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNWYWxpZE9iamVjdCAoZGF0ZSkge1xuICAgICAgICB2YXIgbXM7XG4gICAgICAgIGlmICh0eXBlb2YgZGF0ZSA9PT0gJ29iamVjdCcgJiYgZGF0ZSBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgICAgICAgIG1zID0gZGF0ZS5nZXRUaW1lKCk7XG4gICAgICAgICAgICByZXR1cm4gIWlzTmFOKG1zKSAmJiBtcyA+IDA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRGF0ZVR5cGUodmFsdWUpIHtcbiAgICAgICAgdmFyIHBhcnRzLCBkYXksIG1vbnRoLCB5ZWFyLCBob3VycywgbWludXRlcywgc2Vjb25kcywgbXM7XG4gICAgICAgIHN3aXRjaCAodHlwZW9mIHZhbHVlKSB7XG4gICAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgICAgIHJldHVybiBpc1ZhbGlkT2JqZWN0KHZhbHVlKTtcbiAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgLy8gaXMgaXQgYSBkYXRlIGluIFVTIGZvcm1hdD9cbiAgICAgICAgICAgICAgICBwYXJ0cyA9IGRhdGVSZWdFeHAuZXhlYyh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnRzICYmIHBhcnRzWzJdID09PSBwYXJ0c1s0XSkge1xuICAgICAgICAgICAgICAgICAgICBtb250aCA9ICtwYXJ0c1sxXTtcbiAgICAgICAgICAgICAgICAgICAgZGF5ID0gK3BhcnRzWzNdO1xuICAgICAgICAgICAgICAgICAgICB5ZWFyID0gK3BhcnRzWzVdO1xuICAgICAgICAgICAgICAgICAgICAvLyByb3VnaCBjaGVjayBvZiBhIHllYXJcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgPCB5ZWFyICYmIHllYXIgPCAyMTAwICYmIDEgPD0gbW9udGggJiYgbW9udGggPD0gMTIgJiYgMSA8PSBkYXkgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIGRheSA8PSAobW9udGggPT09IDIgJiYgaXNMZWFwWWVhcih5ZWFyKSA/IDI5IDogbW9udGhMZW5ndGhzW21vbnRoIC0gMV0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBpcyBpdCBhIHRpbWVzdGFtcCBpbiBhIHN0YW5kYXJkIGZvcm1hdD9cbiAgICAgICAgICAgICAgICBwYXJ0cyA9IHRzUmVnRXhwLmV4ZWModmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmIChwYXJ0cykge1xuICAgICAgICAgICAgICAgICAgICB5ZWFyID0gK3BhcnRzWzFdO1xuICAgICAgICAgICAgICAgICAgICBtb250aCA9ICtwYXJ0c1syXTtcbiAgICAgICAgICAgICAgICAgICAgZGF5ID0gK3BhcnRzWzNdO1xuICAgICAgICAgICAgICAgICAgICBob3VycyA9ICtwYXJ0c1s0XTtcbiAgICAgICAgICAgICAgICAgICAgbWludXRlcyA9ICtwYXJ0c1s1XTtcbiAgICAgICAgICAgICAgICAgICAgc2Vjb25kcyA9ICtwYXJ0c1s2XTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgPCB5ZWFyICYmIHllYXIgPCAyMTAwICYmIDEgPD0gbW9udGggJiYgbW9udGggPD0gMTIgJiYgMSA8PSBkYXkgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIGRheSA8PSAobW9udGggPT09IDIgJiYgaXNMZWFwWWVhcih5ZWFyKSA/IDI5IDogbW9udGhMZW5ndGhzW21vbnRoIC0gMV0pICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBob3VycyA8IDI0ICYmIG1pbnV0ZXMgPCA2MCAmJiBzZWNvbmRzIDwgNjApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gaW50ZW50aW9uYWwgZmFsbC1kb3duXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhZChudW0pIHtcbiAgICAgICAgcmV0dXJuIChudW0gPCAxMCA/ICcwJyA6ICcnKSArIG51bTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNb250aChkYXRlT3JJbmRleCkge1xuICAgICAgICByZXR1cm4gdHlwZW9mIGRhdGVPckluZGV4ID09PSAnbnVtYmVyJyA/IGRhdGVPckluZGV4IDogZGF0ZU9ySW5kZXguZ2V0TW9udGgoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNb250aEluZGV4KG5hbWUpIHtcbiAgICAgICAgLy8gVE9ETzogZG8gd2UgcmVhbGx5IHdhbnQgYSAwLWJhc2VkIGluZGV4PyBvciBzaG91bGQgaXQgYmUgYSAxLWJhc2VkIG9uZT9cbiAgICAgICAgdmFyIGluZGV4ID0gbW9udGhEaWN0W25hbWVdO1xuICAgICAgICByZXR1cm4gdHlwZW9mIGluZGV4ID09PSAnbnVtYmVyJyA/IGluZGV4IDogdm9pZCAwO1xuICAgICAgICAvLyBUT0RPOiB3ZSByZXR1cm4gdW5kZWZpbmVkIGZvciB3cm9uZyBtb250aCBuYW1lcyAtLS0gaXMgaXQgcmlnaHQ/XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TW9udGhOYW1lKGRhdGUpIHtcbiAgICAgICAgcmV0dXJuIG1vbnRoc1tnZXRNb250aChkYXRlKV07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Rmlyc3RTdW5kYXkoZGF0ZSkge1xuICAgICAgICAvLyBUT0RPOiB3aGF0IGRvZXMgaXQgcmV0dXJuPyBhIG5lZ2F0aXZlIGluZGV4IHJlbGF0ZWQgdG8gdGhlIDFzdCBvZiB0aGUgbW9udGg/XG4gICAgICAgIHZhciBkID0gbmV3IERhdGUoZGF0ZS5nZXRUaW1lKCkpO1xuICAgICAgICBkLnNldERhdGUoMSk7XG4gICAgICAgIHJldHVybiAtZC5nZXREYXkoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXREYXlzSW5QcmV2TW9udGgoZGF0ZSkge1xuICAgICAgICB2YXIgZCA9IG5ldyBEYXRlKGRhdGUpO1xuICAgICAgICBkLnNldE1vbnRoKGQuZ2V0TW9udGgoKSAtIDEpO1xuICAgICAgICByZXR1cm4gZ2V0RGF5c0luTW9udGgoZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0RGF5c0luTW9udGgoZGF0ZSkge1xuICAgICAgICB2YXIgbW9udGggPSBkYXRlLmdldE1vbnRoKCk7XG4gICAgICAgIHJldHVybiBtb250aCA9PT0gMSAmJiBpc0xlYXBZZWFyKGRhdGUpID8gMjkgOiBtb250aExlbmd0aHNbbW9udGhdO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN0clRvRGF0ZShzdHIpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RyO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRlcy50aW1lc3RhbXAuaXMoc3RyKSkge1xuICAgICAgICAgICAgLy8gMjAwMC0wMi0yOVQwMDowMDowMFxuICAgICAgICAgICAgcmV0dXJuIGRhdGVzLnRpbWVzdGFtcC5mcm9tKHN0cik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gMTEvMjAvMjAwMFxuICAgICAgICB2YXIgcGFydHMgPSBkYXRlUmVnRXhwLmV4ZWMoc3RyKTtcbiAgICAgICAgaWYgKHBhcnRzICYmIHBhcnRzWzJdID09PSBwYXJ0c1s0XSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlKCtwYXJ0c1s1XSwgK3BhcnRzWzFdIC0gMSwgK3BhcnRzWzNdKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPOiB3aGF0IHRvIHJldHVybiBmb3IgYW4gaW52YWxpZCBkYXRlPyBudWxsP1xuICAgICAgICByZXR1cm4gbmV3IERhdGUoLTEpOyAvLyBpbnZhbGlkIGRhdGVcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmb3JtYXREYXRlUGF0dGVybihkYXRlLCBwYXR0ZXJuKSB7XG4gICAgICAgIC8vICdNIGQsIHl5eXknIERlYyA1LCAyMDE1XG4gICAgICAgIC8vICdNTSBkZCB5eScgRGVjZW1iZXIgMDUgMTVcbiAgICAgICAgLy8gJ20tZC15eScgMS0xLTE1XG4gICAgICAgIC8vICdtbS1kZC15eXl5JyAwMS0wMS0yMDE1XG4gICAgICAgIC8vICdtL2QveXknIDEyLzI1LzE1XG5cbiAgICAgICAgcmV0dXJuIHBhdHRlcm4ucmVwbGFjZShkYXRlUGF0dGVybiwgZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGVQYXR0ZXJuTGlicmFyeVtuYW1lXShkYXRlKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZm9ybWF0RGF0ZShkYXRlLCBkZWxpbWl0ZXJPclBhdHRlcm4pIHtcbiAgICAgICAgaWYgKGRlbGltaXRlck9yUGF0dGVybiAmJiBkZWxpbWl0ZXJPclBhdHRlcm4ubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgcmV0dXJuIGZvcm1hdERhdGVQYXR0ZXJuKGRhdGUsIGRlbGltaXRlck9yUGF0dGVybik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyXG4gICAgICAgICAgICBkZWwgPSBkZWxpbWl0ZXJPclBhdHRlcm4gfHwgJy8nLFxuICAgICAgICAgICAgeSA9IGRhdGUuZ2V0RnVsbFllYXIoKSxcbiAgICAgICAgICAgIG0gPSBkYXRlLmdldE1vbnRoKCkgKyAxLFxuICAgICAgICAgICAgZCA9IGRhdGUuZ2V0RGF0ZSgpO1xuXG4gICAgICAgIHJldHVybiBbcGFkKG0pLCBwYWQoZCksIHldLmpvaW4oZGVsKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkYXRlVG9TdHIoZGF0ZSwgZGVsaW1pdGVyKSB7XG4gICAgICAgIHJldHVybiBmb3JtYXREYXRlKGRhdGUsIGRlbGltaXRlcik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZm9ybWF0VGltZShkYXRlLCB1c2VQZXJpb2QpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZGF0ZSA9IHN0clRvRGF0ZShkYXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhclxuICAgICAgICAgICAgcGVyaW9kID0gJ0FNJyxcbiAgICAgICAgICAgIGhvdXJzID0gZGF0ZS5nZXRIb3VycygpLFxuICAgICAgICAgICAgbWludXRlcyA9IGRhdGUuZ2V0TWludXRlcygpLFxuICAgICAgICAgICAgcmV0dmFsLFxuICAgICAgICAgICAgc2Vjb25kcyA9IGRhdGUuZ2V0U2Vjb25kcygpO1xuXG4gICAgICAgIGlmIChob3VycyA+IDExKSB7XG4gICAgICAgICAgICBob3VycyAtPSAxMjtcbiAgICAgICAgICAgIHBlcmlvZCA9ICdQTSc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhvdXJzID09PSAwKSB7XG4gICAgICAgICAgICBob3VycyA9IDEyO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dmFsID0gaG91cnMgKyAnOicgKyBwYWQobWludXRlcykgKyAnOicgKyBwYWQoc2Vjb25kcyk7XG5cbiAgICAgICAgaWYgKHVzZVBlcmlvZCA9PSB0cnVlKSB7XG4gICAgICAgICAgICByZXR2YWwgPSByZXR2YWwgKyAnICcgKyBwZXJpb2Q7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlcmlvZChkYXRlKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZGF0ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGRhdGUgPSBzdHJUb0RhdGUoZGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaG91cnMgPSBkYXRlLmdldEhvdXJzKCk7XG5cbiAgICAgICAgcmV0dXJuIGhvdXJzID4gMTEgPyAnUE0nIDogJ0FNJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0b0lTTyhkYXRlLCBpbmNsdWRlVFopIHtcbiAgICAgICAgdmFyXG4gICAgICAgICAgICBzdHIsXG4gICAgICAgICAgICBub3cgPSBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgdGhlbiA9IG5ldyBEYXRlKGRhdGUuZ2V0VGltZSgpKTtcbiAgICAgICAgdGhlbi5zZXRIb3Vycyhub3cuZ2V0SG91cnMoKSk7XG4gICAgICAgIHN0ciA9IHRoZW4udG9JU09TdHJpbmcoKTtcbiAgICAgICAgaWYgKCFpbmNsdWRlVFopIHtcbiAgICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnLicpWzBdO1xuICAgICAgICAgICAgc3RyICs9ICcuMDBaJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RyO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5hdHVyYWwoZGF0ZSkge1xuICAgICAgICBpZiAodHlwZW9mIGRhdGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBkYXRlID0gdGhpcy5mcm9tKGRhdGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyXG4gICAgICAgICAgICB5ZWFyID0gZGF0ZS5nZXRGdWxsWWVhcigpLnRvU3RyaW5nKCkuc3Vic3RyKDIpLFxuICAgICAgICAgICAgbW9udGggPSBkYXRlLmdldE1vbnRoKCkgKyAxLFxuICAgICAgICAgICAgZGF5ID0gZGF0ZS5nZXREYXRlKCksXG4gICAgICAgICAgICBob3VycyA9IGRhdGUuZ2V0SG91cnMoKSxcbiAgICAgICAgICAgIG1pbnV0ZXMgPSBkYXRlLmdldE1pbnV0ZXMoKSxcbiAgICAgICAgICAgIHBlcmlvZCA9ICdBTSc7XG5cbiAgICAgICAgaWYgKGhvdXJzID4gMTEpIHtcbiAgICAgICAgICAgIGhvdXJzIC09IDEyO1xuICAgICAgICAgICAgcGVyaW9kID0gJ1BNJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaG91cnMgPT09IDApIHtcbiAgICAgICAgICAgIGhvdXJzID0gMTI7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaG91cnMgKyAnOicgKyBwYWQobWludXRlcykgKyAnICcgKyBwZXJpb2QgKyAnIG9uICcgKyBwYWQobW9udGgpICsgJy8nICsgcGFkKGRheSkgKyAnLycgKyB5ZWFyO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZERheXMgKGRhdGUsIGRheXMpIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdhZGREYXlzIGlzIGRlcHJlY2F0ZWQuIEluc3RlYWQsIHVzZSBgYWRkYCcpO1xuICAgICAgICByZXR1cm4gYWRkKGRhdGUsIGRheXMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZCAoZGF0ZSwgYW1vdW50LCBkYXRlVHlwZSkge1xuICAgICAgICByZXR1cm4gc3VidHJhY3QoZGF0ZSwgLWFtb3VudCwgZGF0ZVR5cGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN1YnRyYWN0KGRhdGUsIGFtb3VudCwgZGF0ZVR5cGUpIHtcbiAgICAgICAgLy8gc3VidHJhY3QgTiBkYXlzIGZyb20gZGF0ZVxuICAgICAgICB2YXJcbiAgICAgICAgICAgIHRpbWUgPSBkYXRlLmdldFRpbWUoKSxcbiAgICAgICAgICAgIHRtcCA9IG5ldyBEYXRlKHRpbWUpO1xuXG4gICAgICAgIGlmKGRhdGVUeXBlID09PSAnbW9udGgnKXtcbiAgICAgICAgICAgIHRtcC5zZXRNb250aCh0bXAuZ2V0TW9udGgoKSAtIGFtb3VudCk7XG4gICAgICAgICAgICByZXR1cm4gdG1wO1xuICAgICAgICB9XG4gICAgICAgIGlmKGRhdGVUeXBlID09PSAneWVhcicpe1xuICAgICAgICAgICAgdG1wLnNldEZ1bGxZZWFyKHRtcC5nZXRGdWxsWWVhcigpIC0gYW1vdW50KTtcbiAgICAgICAgICAgIHJldHVybiB0bXA7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3IERhdGUodGltZSAtIGxlbmd0aC5kYXkgKiBhbW91bnQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN1YnRyYWN0RGF0ZShkYXRlMSwgZGF0ZTIsIGRhdGVUeXBlKSB7XG4gICAgICAgIC8vIGRhdGVUeXBlOiB3ZWVrLCBkYXksIGhyLCBtaW4sIHNlY1xuICAgICAgICAvLyBwYXN0IGRhdGVzIGhhdmUgYSBwb3NpdGl2ZSB2YWx1ZVxuICAgICAgICAvLyBmdXR1cmUgZGF0ZXMgaGF2ZSBhIG5lZ2F0aXZlIHZhbHVlXG5cbiAgICAgICAgdmFyIGRpdmlkZUJ5ID0ge1xuICAgICAgICAgICAgICAgIHdlZWs6IGxlbmd0aC53ZWVrLFxuICAgICAgICAgICAgICAgIGRheTogbGVuZ3RoLmRheSxcbiAgICAgICAgICAgICAgICBocjogbGVuZ3RoLmhyLFxuICAgICAgICAgICAgICAgIG1pbjogbGVuZ3RoLm1pbixcbiAgICAgICAgICAgICAgICBzZWM6IGxlbmd0aC5zZWNcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1dGMxID0gRGF0ZS5VVEMoZGF0ZTEuZ2V0RnVsbFllYXIoKSwgZGF0ZTEuZ2V0TW9udGgoKSwgZGF0ZTEuZ2V0RGF0ZSgpKSxcbiAgICAgICAgICAgIHV0YzIgPSBEYXRlLlVUQyhkYXRlMi5nZXRGdWxsWWVhcigpLCBkYXRlMi5nZXRNb250aCgpLCBkYXRlMi5nZXREYXRlKCkpO1xuXG4gICAgICAgIGRhdGVUeXBlID0gZGF0ZVR5cGUudG9Mb3dlckNhc2UoKTtcblxuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcigodXRjMiAtIHV0YzEpIC8gZGl2aWRlQnlbZGF0ZVR5cGVdKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0xlc3MgKGQxLCBkMikge1xuICAgICAgICBpZihpc1ZhbGlkT2JqZWN0KGQxKSAmJiBpc1ZhbGlkT2JqZWN0KGQyKSl7XG4gICAgICAgICAgICByZXR1cm4gZDEuZ2V0VGltZSgpIDwgZDIuZ2V0VGltZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0dyZWF0ZXIgKGQxLCBkMikge1xuICAgICAgICBpZihpc1ZhbGlkT2JqZWN0KGQxKSAmJiBpc1ZhbGlkT2JqZWN0KGQyKSl7XG4gICAgICAgICAgICByZXR1cm4gZDEuZ2V0VGltZSgpID4gZDIuZ2V0VGltZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaWZmKGRhdGUxLCBkYXRlMikge1xuICAgICAgICAvLyByZXR1cm4gdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiAyIGRhdGVzIGluIGRheXNcbiAgICAgICAgdmFyIHV0YzEgPSBEYXRlLlVUQyhkYXRlMS5nZXRGdWxsWWVhcigpLCBkYXRlMS5nZXRNb250aCgpLCBkYXRlMS5nZXREYXRlKCkpLFxuICAgICAgICAgICAgdXRjMiA9IERhdGUuVVRDKGRhdGUyLmdldEZ1bGxZZWFyKCksIGRhdGUyLmdldE1vbnRoKCksIGRhdGUyLmdldERhdGUoKSk7XG5cbiAgICAgICAgcmV0dXJuIE1hdGguYWJzKE1hdGguZmxvb3IoKHV0YzIgLSB1dGMxKSAvIGxlbmd0aC5kYXkpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb3B5IChkYXRlKSB7XG4gICAgICAgIGlmKGlzVmFsaWRPYmplY3QoZGF0ZSkpe1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlKGRhdGUuZ2V0VGltZSgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXROYXR1cmFsRGF5KGRhdGUsIGNvbXBhcmVEYXRlLCBub0RheXNPZldlZWspIHtcblxuICAgICAgICB2YXJcbiAgICAgICAgICAgIHRvZGF5ID0gY29tcGFyZURhdGUgfHwgbmV3IERhdGUoKSxcbiAgICAgICAgICAgIGRheXNBZ28gPSBzdWJ0cmFjdERhdGUoZGF0ZSwgdG9kYXksICdkYXknKTtcblxuICAgICAgICBpZiAoIWRheXNBZ28pIHtcbiAgICAgICAgICAgIHJldHVybiAnVG9kYXknO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXlzQWdvID09PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gJ1llc3RlcmRheSc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGF5c0FnbyA9PT0gLTEpIHtcbiAgICAgICAgICAgIHJldHVybiAnVG9tb3Jyb3cnO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRheXNBZ28gPCAtMSkge1xuICAgICAgICAgICAgcmV0dXJuIGZvcm1hdERhdGUoZGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gIW5vRGF5c09mV2VlayAmJiBkYXlzQWdvIDwgZGF5c09mV2Vlay5sZW5ndGggPyBkYXlzT2ZXZWVrW2RhdGUuZ2V0RGF5KCldIDogZm9ybWF0RGF0ZShkYXRlKTtcbiAgICB9XG5cbiAgICBkYXRlcyA9IHtcbiAgICAgICAgbW9udGhzOiB7XG4gICAgICAgICAgICBmdWxsOiBtb250aHMsXG4gICAgICAgICAgICBhYmJyOiBtb250aEFiYnIsXG4gICAgICAgICAgICBkaWN0OiBtb250aERpY3RcbiAgICAgICAgfSxcbiAgICAgICAgZGF5czoge1xuICAgICAgICAgICAgZnVsbDogZGF5c09mV2VlayxcbiAgICAgICAgICAgIGFiYnI6IGRheXMsXG4gICAgICAgICAgICBhYmJyMzogZGF5czMsXG4gICAgICAgICAgICBkaWN0OiBkYXlEaWN0XG4gICAgICAgIH0sXG4gICAgICAgIGxlbmd0aDogbGVuZ3RoLFxuICAgICAgICBzdWJ0cmFjdDogc3VidHJhY3QsXG4gICAgICAgIGFkZDogYWRkLFxuICAgICAgICBhZGREYXlzOiBhZGREYXlzLFxuICAgICAgICBkaWZmOiBkaWZmLFxuICAgICAgICBjb3B5OiBjb3B5LFxuICAgICAgICBjbG9uZTogY29weSxcbiAgICAgICAgaXNMZXNzOiBpc0xlc3MsXG4gICAgICAgIGlzR3JlYXRlcjogaXNHcmVhdGVyLFxuICAgICAgICB0b0lTTzogdG9JU08sXG4gICAgICAgIGlzVmFsaWRPYmplY3Q6IGlzVmFsaWRPYmplY3QsXG4gICAgICAgIGlzVmFsaWQ6IGlzRGF0ZVR5cGUsXG4gICAgICAgIGlzRGF0ZVR5cGU6IGlzRGF0ZVR5cGUsXG4gICAgICAgIGlzTGVhcFllYXI6IGlzTGVhcFllYXIsXG4gICAgICAgIGdldE1vbnRoSW5kZXg6IGdldE1vbnRoSW5kZXgsXG4gICAgICAgIGdldE1vbnRoTmFtZTogZ2V0TW9udGhOYW1lLFxuICAgICAgICBnZXRGaXJzdFN1bmRheTogZ2V0Rmlyc3RTdW5kYXksXG4gICAgICAgIGdldERheXNJbk1vbnRoOiBnZXREYXlzSW5Nb250aCxcbiAgICAgICAgZ2V0RGF5c0luUHJldk1vbnRoOiBnZXREYXlzSW5QcmV2TW9udGgsXG4gICAgICAgIGZvcm1hdERhdGU6IGZvcm1hdERhdGUsXG4gICAgICAgIGZvcm1hdFRpbWU6IGZvcm1hdFRpbWUsXG4gICAgICAgIHN0clRvRGF0ZTogc3RyVG9EYXRlLFxuICAgICAgICBzdWJ0cmFjdERhdGU6IHN1YnRyYWN0RGF0ZSxcbiAgICAgICAgZGF0ZVRvU3RyOiBkYXRlVG9TdHIsXG4gICAgICAgIHBlcmlvZDogcGVyaW9kLFxuICAgICAgICBuYXR1cmFsOiBuYXR1cmFsLFxuICAgICAgICBnZXROYXR1cmFsRGF5OiBnZXROYXR1cmFsRGF5LFxuICAgICAgICBwYWQ6IHBhZCxcbiAgICAgICAgdGltZXN0YW1wOiB7XG4gICAgICAgICAgICB0bzogZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXRlLmdldEZ1bGxZZWFyKCkgKyAnLScgKyBwYWQoZGF0ZS5nZXRNb250aCgpICsgMSkgKyAnLScgKyBwYWQoZGF0ZS5nZXREYXRlKCkpICsgJ1QnICtcbiAgICAgICAgICAgICAgICAgICAgcGFkKGRhdGUuZ2V0SG91cnMoKSkgKyAnOicgKyBwYWQoZGF0ZS5nZXRNaW51dGVzKCkpICsgJzonICsgcGFkKGRhdGUuZ2V0U2Vjb25kcygpKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmcm9tOiBmdW5jdGlvbihzdHIpIHtcbiAgICAgICAgICAgICAgICAvLyAyMDE1LTA1LTI2VDAwOjAwOjAwXG5cbiAgICAgICAgICAgICAgICAvLyBzdHJpcCB0aW1lem9uZSAvLyAyMDE1LTA1LTI2VDAwOjAwOjAwWlxuICAgICAgICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnWicpWzBdO1xuXG4gICAgICAgICAgICAgICAgLy8gW1wiMjAwMC0wMi0zMFQwMDowMDowMFwiLCBcIjIwMDBcIiwgXCIwMlwiLCBcIjMwXCIsIFwiMDBcIiwgXCIwMFwiLCBcIjAwXCIsIGluZGV4OiAwLCBpbnB1dDogXCIyMDAwLTAyLTMwVDAwOjAwOjAwXCJdXG4gICAgICAgICAgICAgICAgdmFyIHBhcnRzID0gdHNSZWdFeHAuZXhlYyhzdHIpO1xuICAgICAgICAgICAgICAgIC8vIFRPRE86IGRvIHdlIG5lZWQgYSB2YWxpZGF0aW9uP1xuICAgICAgICAgICAgICAgIGlmIChwYXJ0cykge1xuICAgICAgICAgICAgICAgICAgICAvLyBuZXcgRGF0ZSgxOTk1LCAxMSwgMTcsIDMsIDI0LCAwKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlKCtwYXJ0c1sxXSwgK3BhcnRzWzJdIC0gMSwgK3BhcnRzWzNdLCArcGFydHNbNF0sICtwYXJ0c1s1XSwgcGFyc2VJbnQocGFydHNbNl0sIDEwKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFRPRE86IHdoYXQgZG8gd2UgcmV0dXJuIGZvciBhbiBpbnZhbGlkIGRhdGU/IG51bGw/XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlKC0xKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpczogZnVuY3Rpb24oc3RyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRzUmVnRXhwLnRlc3Qoc3RyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gZGF0ZXM7XG5cbn0pKTsiLCJyZXF1aXJlKCdCYXNlQ29tcG9uZW50L3NyYy9wcm9wZXJ0aWVzJyk7XG5yZXF1aXJlKCdCYXNlQ29tcG9uZW50L3NyYy90ZW1wbGF0ZScpO1xucmVxdWlyZSgnQmFzZUNvbXBvbmVudC9zcmMvcmVmcycpO1xuY29uc3QgQmFzZUNvbXBvbmVudCA9IHJlcXVpcmUoJ0Jhc2VDb21wb25lbnQnKTtcbmNvbnN0IGRhdGVzID0gcmVxdWlyZSgnZGF0ZXMnKTtcblxuY29uc3QgcHJvcHMgPSBbJ2xhYmVsJywgJ25hbWUnXTtcbmNvbnN0IGJvb2xzID0gWyduby1ldmVudCcsICdkaXNhYmxlZCcsICdyZWFkb25seScsICdjaGVja2VkJywgJ3JhbmdlLXBpY2tlcicsICdyYW5nZS1sZWZ0JywgJ3JhbmdlLXJpZ2h0J107XG5cbmNsYXNzIERhdGVQaWNrZXIgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblxuXHRzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcyAoKSB7XG5cdFx0cmV0dXJuIFsuLi5wcm9wcywgLi4uYm9vbHNdO1xuXHR9XG5cblx0Z2V0IHByb3BzICgpIHtcblx0XHRyZXR1cm4gcHJvcHM7XG5cdH1cblxuXHRnZXQgYm9vbHMgKCkge1xuXHRcdHJldHVybiBib29scztcblx0fVxuXG5cdGdldCB0ZW1wbGF0ZVN0cmluZyAoKSB7XG5cdFx0cmV0dXJuIGBcbjxkaXYgY2xhc3M9XCJjYWxlbmRhclwiIHJlZj1cImNhbE5vZGVcIj5cbjxkaXYgY2xhc3M9XCJjYWwtaGVhZGVyXCIgcmVmPVwiaGVhZGVyTm9kZVwiPlxuXHQ8c3BhbiBjbGFzcz1cImNhbC1sZnRcIiByZWY9XCJsZnROb2RlXCI+PC9zcGFuPlxuXHQ8c3BhbiBjbGFzcz1cImNhbC1tb250aFwiIHJlZj1cIm1vbnRoTm9kZVwiPjwvc3Bhbj5cblx0PHNwYW4gY2xhc3M9XCJjYWwtcmd0XCIgcmVmPVwicmd0Tm9kZVwiPjwvc3Bhbj5cbjwvZGl2PlxuPGRpdiBjbGFzcz1cImNhbC1jb250YWluZXJcIiByZWY9XCJjb250YWluZXJcIj48L2Rpdj5cbjxkaXYgY2xhc3M9XCJjYWwtZm9vdGVyXCI+XG5cdDxhIGhyZWY9XCJqYXZhc2NyaXB0OnZvaWQoMCk7XCIgcmVmPVwiZm9vdGVyTGlua1wiPjwvYT5cbjwvZGl2PlxuPC9kaXY+YDtcblx0fVxuXG5cdHNldCB2YWx1ZSAodmFsdWUpIHtcblx0XHQvLyBtaWdodCBuZWVkIGF0dHJpYnV0ZUNoYW5nZWRcblx0XHR0aGlzLnZhbHVlRGF0ZSA9IGRhdGVzLmlzRGF0ZVR5cGUodmFsdWUpID8gZGF0ZXMuc3RyVG9EYXRlKHZhbHVlKSA6IHRvZGF5O1xuXHRcdHRoaXMuY3VycmVudCA9IHRoaXMudmFsdWVEYXRlO1xuXHRcdG9uRG9tUmVhZHkodGhpcywgKCkgPT4ge1xuXHRcdFx0dGhpcy5yZW5kZXIoKTtcblx0XHR9KTtcblx0fVxuXG5cdGdldCB2YWx1ZSAoKSB7XG5cdFx0aWYgKCF0aGlzLnZhbHVlRGF0ZSkge1xuXHRcdFx0Y29uc3QgdmFsdWUgPSB0aGlzLmdldEF0dHJpYnV0ZSgndmFsdWUnKSB8fCB0b2RheTtcblx0XHRcdHRoaXMudmFsdWVEYXRlID0gZGF0ZXMuc3RyVG9EYXRlKHZhbHVlKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMudmFsdWVEYXRlO1xuXHR9XG5cblx0Y29uc3RydWN0b3IgKCkge1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5wcmV2aW91cyA9IHt9O1xuXHRcdHRoaXMubW9kZXMgPSBbJ21vbnRoJywgJ3llYXInLCAnZGVjYWRlJ107XG5cdFx0dGhpcy5tb2RlID0gMDtcblx0fVxuXG5cdHNldERpc3BsYXkgKC4uLmFyZ3MvKnllYXIsIG1vbnRoKi8pIHtcblx0XHRpZiAoYXJncy5sZW5ndGggPT09IDIpIHtcblx0XHRcdHRoaXMuY3VycmVudC5zZXRGdWxsWWVhcihhcmdzWzBdKTtcblx0XHRcdHRoaXMuY3VycmVudC5zZXRNb250aChhcmdzWzFdKTtcblx0XHR9IGVsc2UgaWYgKHR5cGVvZiBhcmdzWzBdID09PSAnb2JqZWN0Jykge1xuXHRcdFx0dGhpcy5jdXJyZW50LnNldEZ1bGxZZWFyKGFyZ3NbMF0uZ2V0RnVsbFllYXIoKSk7XG5cdFx0XHR0aGlzLmN1cnJlbnQuc2V0TW9udGgoYXJnc1swXS5nZXRNb250aCgpKTtcblx0XHR9IGVsc2UgaWYgKGFyZ3NbMF0gPiAxMikge1xuXHRcdFx0dGhpcy5jdXJyZW50LnNldEZ1bGxZZWFyKGFyZ3NbMF0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLmN1cnJlbnQuc2V0TW9udGgoYXJnc1swXSk7XG5cdFx0fVxuXHRcdHRoaXMubm9FdmVudHMgPSB0cnVlO1xuXHRcdHRoaXMucmVuZGVyKCk7XG5cdH1cblxuXHRnZXRGb3JtYXR0ZWRWYWx1ZSAoKSB7XG5cdFx0cmV0dXJuIHRoaXMudmFsdWVEYXRlID09PSB0b2RheSA/ICcnIDogISF0aGlzLnZhbHVlRGF0ZSA/IGRhdGVzLmRhdGVUb1N0cih0aGlzLnZhbHVlRGF0ZSkgOiAnJztcblx0fVxuXG5cdGVtaXRWYWx1ZSAoKSB7XG5cdFx0Ly8gVE9ETyBvcHRpb25zIGZvciB0aW1lc3RhbXAgb3Igb3RoZXIgZm9ybWF0c1xuXHRcdGNvbnN0IGV2ZW50ID0ge1xuXHRcdFx0dmFsdWU6IHRoaXMuZ2V0Rm9ybWF0dGVkVmFsdWUoKSxcblx0XHRcdGRhdGU6IHRoaXMudmFsdWVEYXRlXG5cdFx0fTtcblx0XHRpZiAodGhpc1sncmFuZ2UtcGlja2VyJ10pIHtcblx0XHRcdGV2ZW50LmZpcnN0ID0gdGhpcy5maXJzdFJhbmdlO1xuXHRcdFx0ZXZlbnQuc2Vjb25kID0gdGhpcy5zZWNvbmRSYW5nZTtcblx0XHR9XG5cdFx0dGhpcy5lbWl0KCdjaGFuZ2UnLCBldmVudCk7XG5cdH1cblxuXHRlbWl0RGlzcGxheUV2ZW50cyAoKSB7XG5cdFx0Y29uc3QgbW9udGggPSB0aGlzLmN1cnJlbnQuZ2V0TW9udGgoKSxcblx0XHRcdHllYXIgPSB0aGlzLmN1cnJlbnQuZ2V0RnVsbFllYXIoKTtcblxuXHRcdGlmICghdGhpcy5ub0V2ZW50cyAmJiAobW9udGggIT09IHRoaXMucHJldmlvdXMubW9udGggfHwgeWVhciAhPT0gdGhpcy5wcmV2aW91cy55ZWFyKSkge1xuXHRcdFx0dGhpcy5maXJlKCdkaXNwbGF5LWNoYW5nZScsIHsgbW9udGg6IG1vbnRoLCB5ZWFyOiB5ZWFyIH0pO1xuXHRcdH1cblxuXHRcdHRoaXMubm9FdmVudHMgPSBmYWxzZTtcblx0XHR0aGlzLnByZXZpb3VzID0ge1xuXHRcdFx0bW9udGg6IG1vbnRoLFxuXHRcdFx0eWVhcjogeWVhclxuXHRcdH07XG5cdH1cblxuXHRvbkNsaWNrRGF5IChub2RlKSB7XG5cdFx0dmFyXG5cdFx0XHRkYXkgPSArbm9kZS5pbm5lckhUTUwsXG5cdFx0XHRpc0Z1dHVyZSA9IG5vZGUuY2xhc3NMaXN0LmNvbnRhaW5zKCdmdXR1cmUnKSxcblx0XHRcdGlzUGFzdCA9IG5vZGUuY2xhc3NMaXN0LmNvbnRhaW5zKCdwYXN0Jyk7XG5cblx0XHR0aGlzLmN1cnJlbnQuc2V0RGF0ZShkYXkpO1xuXHRcdGlmIChpc0Z1dHVyZSkge1xuXHRcdFx0dGhpcy5jdXJyZW50LnNldE1vbnRoKHRoaXMuY3VycmVudC5nZXRNb250aCgpICsgMSk7XG5cdFx0fVxuXHRcdGlmIChpc1Bhc3QpIHtcblx0XHRcdHRoaXMuY3VycmVudC5zZXRNb250aCh0aGlzLmN1cnJlbnQuZ2V0TW9udGgoKSAtIDEpO1xuXHRcdH1cblxuXHRcdHRoaXMudmFsdWVEYXRlID0gY29weSh0aGlzLmN1cnJlbnQpO1xuXG5cdFx0dGhpcy5lbWl0VmFsdWUoKTtcblxuXHRcdGlmICh0aGlzWydyYW5nZS1waWNrZXInXSkge1xuXHRcdFx0dGhpcy5jbGlja1NlbGVjdFJhbmdlKCk7XG5cdFx0fVxuXG5cdFx0aWYgKGlzRnV0dXJlIHx8IGlzUGFzdCkge1xuXHRcdFx0dGhpcy5yZW5kZXIoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5zZWxlY3REYXkoKTtcblx0XHR9XG5cdH1cblxuXHRvbkNsaWNrTW9udGggKGRpcmVjdGlvbikge1xuXHRcdHN3aXRjaCAodGhpcy5tb2RlKSB7XG5cdFx0XHRjYXNlIDE6IC8vIHllYXIgbW9kZVxuXHRcdFx0XHR0aGlzLmN1cnJlbnQuc2V0RnVsbFllYXIodGhpcy5jdXJyZW50LmdldEZ1bGxZZWFyKCkgKyAoZGlyZWN0aW9uICogMSkpO1xuXHRcdFx0XHR0aGlzLnNldE1vZGUodGhpcy5tb2RlKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDI6IC8vIGNlbnR1cnkgbW9kZVxuXHRcdFx0XHR0aGlzLmN1cnJlbnQuc2V0RnVsbFllYXIodGhpcy5jdXJyZW50LmdldEZ1bGxZZWFyKCkgKyAoZGlyZWN0aW9uICogMTIpKTtcblx0XHRcdFx0dGhpcy5zZXRNb2RlKHRoaXMubW9kZSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0dGhpcy5jdXJyZW50LnNldE1vbnRoKHRoaXMuY3VycmVudC5nZXRNb250aCgpICsgKGRpcmVjdGlvbiAqIDEpKTtcblx0XHRcdFx0dGhpcy5yZW5kZXIoKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9XG5cblx0b25DbGlja1llYXIgKG5vZGUpIHtcblx0XHR2YXIgaW5kZXggPSBkYXRlcy5nZXRNb250aEluZGV4KG5vZGUuaW5uZXJIVE1MKTtcblx0XHR0aGlzLmN1cnJlbnQuc2V0TW9udGgoaW5kZXgpO1xuXHRcdHRoaXMucmVuZGVyKCk7XG5cdH1cblxuXHRvbkNsaWNrRGVjYWRlIChub2RlKSB7XG5cdFx0dmFyIHllYXIgPSArbm9kZS5pbm5lckhUTUw7XG5cdFx0dGhpcy5jdXJyZW50LnNldEZ1bGxZZWFyKHllYXIpO1xuXHRcdHRoaXMuc2V0TW9kZSh0aGlzLm1vZGUgLSAxKTtcblx0fVxuXG5cdHNldE1vZGUgKG1vZGUpIHtcblx0XHRkZXN0cm95KHRoaXMubW9kZU5vZGUpO1xuXHRcdHRoaXMubW9kZSA9IG1vZGUgfHwgMDtcblx0XHRzd2l0Y2ggKHRoaXMubW9kZXNbdGhpcy5tb2RlXSkge1xuXHRcdFx0Y2FzZSAnbW9udGgnOlxuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ3llYXInOlxuXHRcdFx0XHR0aGlzLnNldFllYXJNb2RlKCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnZGVjYWRlJzpcblx0XHRcdFx0dGhpcy5zZXREZWNhZGVNb2RlKCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxuXG5cdHNldFllYXJNb2RlICgpIHtcblx0XHRkZXN0cm95KHRoaXMuYm9keU5vZGUpO1xuXG5cdFx0dmFyXG5cdFx0XHRpLFxuXHRcdFx0bm9kZSA9IGRvbSgnZGl2JywgeyBjbGFzczogJ2NhbC1ib2R5IHllYXInIH0pO1xuXG5cdFx0Zm9yIChpID0gMDsgaSA8IDEyOyBpKyspIHtcblx0XHRcdGRvbSgnZGl2JywgeyBodG1sOiBkYXRlcy5tb250aHMuYWJicltpXSwgY2xhc3M6ICd5ZWFyJyB9LCBub2RlKTtcblx0XHR9XG5cblx0XHR0aGlzLm1vbnRoTm9kZS5pbm5lckhUTUwgPSB0aGlzLmN1cnJlbnQuZ2V0RnVsbFllYXIoKTtcblx0XHR0aGlzLmNvbnRhaW5lci5hcHBlbmRDaGlsZChub2RlKTtcblx0XHR0aGlzLm1vZGVOb2RlID0gbm9kZTtcblx0fVxuXG5cdHNldERlY2FkZU1vZGUgKCkge1xuXHRcdHZhclxuXHRcdFx0aSxcblx0XHRcdG5vZGUgPSBkb20oJ2RpdicsIHsgY2xhc3M6ICdjYWwtYm9keSBkZWNhZGUnIH0pLFxuXHRcdFx0eWVhciA9IHRoaXMuY3VycmVudC5nZXRGdWxsWWVhcigpIC0gNjtcblxuXHRcdGZvciAoaSA9IDA7IGkgPCAxMjsgaSsrKSB7XG5cdFx0XHRkb20oJ2RpdicsIHsgaHRtbDogeWVhciwgY2xhc3M6ICdkZWNhZGUnIH0sIG5vZGUpO1xuXHRcdFx0eWVhciArPSAxO1xuXHRcdH1cblx0XHR0aGlzLm1vbnRoTm9kZS5pbm5lckhUTUwgPSAoeWVhciAtIDEyKSArICctJyArICh5ZWFyIC0gMSk7XG5cdFx0dGhpcy5jb250YWluZXIuYXBwZW5kQ2hpbGQobm9kZSk7XG5cdFx0dGhpcy5tb2RlTm9kZSA9IG5vZGU7XG5cdH1cblxuXHRzZWxlY3REYXkgKCkge1xuXHRcdGlmICh0aGlzWydyYW5nZS1waWNrZXInXSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR2YXJcblx0XHRcdG5vdyA9IHRoaXMucXVlcnlTZWxlY3RvcignLmF5LXNlbGVjdGVkJyksXG5cdFx0XHRub2RlID0gdGhpcy5kYXlNYXBbdGhpcy5jdXJyZW50LmdldERhdGUoKV07XG5cdFx0aWYgKG5vdykge1xuXHRcdFx0bm93LmNsYXNzTGlzdC5yZW1vdmUoJ2F5LXNlbGVjdGVkJyk7XG5cdFx0fVxuXHRcdG5vZGUuY2xhc3NMaXN0LmFkZCgnYXktc2VsZWN0ZWQnKTtcblxuXHR9XG5cblx0Y2xlYXJSYW5nZSAoKSB7XG5cdFx0dGhpcy5ob3ZlckRhdGUgPSAwO1xuXHRcdHRoaXMuc2V0UmFuZ2UobnVsbCwgbnVsbCk7XG5cdH1cblxuXHRzZXRSYW5nZSAoZmlyc3RSYW5nZSwgc2Vjb25kUmFuZ2UpIHtcblx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBmaXJzdFJhbmdlO1xuXHRcdHRoaXMuc2Vjb25kUmFuZ2UgPSBzZWNvbmRSYW5nZTtcblx0XHR0aGlzLmRpc3BsYXlSYW5nZSgpO1xuXHRcdHRoaXMuc2V0UmFuZ2VFbmRQb2ludHMoKTtcblx0fVxuXG5cdGNsaWNrU2VsZWN0UmFuZ2UgKCkge1xuXHRcdHZhclxuXHRcdFx0cHJldkZpcnN0ID0gISF0aGlzLmZpcnN0UmFuZ2UsXG5cdFx0XHRwcmV2U2Vjb25kID0gISF0aGlzLnNlY29uZFJhbmdlLFxuXHRcdFx0cmFuZ2VEYXRlID0gY29weSh0aGlzLmN1cnJlbnQpO1xuXG5cdFx0aWYgKHRoaXMuaXNPd25lZCkge1xuXHRcdFx0dGhpcy5maXJlKCdzZWxlY3QtcmFuZ2UnLCB7XG5cdFx0XHRcdGZpcnN0OiB0aGlzLmZpcnN0UmFuZ2UsXG5cdFx0XHRcdHNlY29uZDogdGhpcy5zZWNvbmRSYW5nZSxcblx0XHRcdFx0Y3VycmVudDogcmFuZ2VEYXRlXG5cdFx0XHR9KTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0aWYgKHRoaXMuc2Vjb25kUmFuZ2UpIHtcblx0XHRcdHRoaXMuZmlyZSgncmVzZXQtcmFuZ2UnKTtcblx0XHRcdHRoaXMuZmlyc3RSYW5nZSA9IG51bGw7XG5cdFx0XHR0aGlzLnNlY29uZFJhbmdlID0gbnVsbDtcblx0XHR9XG5cdFx0aWYgKHRoaXMuZmlyc3RSYW5nZSAmJiB0aGlzLmlzVmFsaWRSYW5nZShyYW5nZURhdGUpKSB7XG5cdFx0XHR0aGlzLnNlY29uZFJhbmdlID0gcmFuZ2VEYXRlO1xuXHRcdFx0dGhpcy5ob3ZlckRhdGUgPSAwO1xuXHRcdFx0dGhpcy5zZXRSYW5nZSh0aGlzLmZpcnN0UmFuZ2UsIHRoaXMuc2Vjb25kUmFuZ2UpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBudWxsO1xuXHRcdH1cblx0XHRpZiAoIXRoaXMuZmlyc3RSYW5nZSkge1xuXHRcdFx0dGhpcy5ob3ZlckRhdGUgPSAwO1xuXHRcdFx0dGhpcy5zZXRSYW5nZShyYW5nZURhdGUsIG51bGwpO1xuXHRcdH1cblx0XHR0aGlzLmZpcmUoJ3NlbGVjdC1yYW5nZScsIHtcblx0XHRcdGZpcnN0OiB0aGlzLmZpcnN0UmFuZ2UsXG5cdFx0XHRzZWNvbmQ6IHRoaXMuc2Vjb25kUmFuZ2UsXG5cdFx0XHRwcmV2Rmlyc3Q6IHByZXZGaXJzdCxcblx0XHRcdHByZXZTZWNvbmQ6IHByZXZTZWNvbmRcblx0XHR9KTtcblx0fVxuXG5cdGhvdmVyU2VsZWN0UmFuZ2UgKGUpIHtcblx0XHRpZiAodGhpcy5maXJzdFJhbmdlICYmICF0aGlzLnNlY29uZFJhbmdlICYmIGUudGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucygnb24nKSkge1xuXHRcdFx0dGhpcy5ob3ZlckRhdGUgPSBlLnRhcmdldC5fZGF0ZTtcblx0XHRcdHRoaXMuZGlzcGxheVJhbmdlKCk7XG5cdFx0fVxuXHR9XG5cblx0ZGlzcGxheVJhbmdlVG9FbmQgKCkge1xuXHRcdGlmICh0aGlzLmZpcnN0UmFuZ2UpIHtcblx0XHRcdHRoaXMuaG92ZXJEYXRlID0gY29weSh0aGlzLmN1cnJlbnQpO1xuXHRcdFx0dGhpcy5ob3ZlckRhdGUuc2V0TW9udGgodGhpcy5ob3ZlckRhdGUuZ2V0TW9udGgoKSArIDEpO1xuXHRcdFx0dGhpcy5kaXNwbGF5UmFuZ2UoKTtcblx0XHR9XG5cdH1cblxuXHRkaXNwbGF5UmFuZ2UgKCkge1xuXHRcdHZhclxuXHRcdFx0YmVnID0gdGhpcy5maXJzdFJhbmdlLFxuXHRcdFx0ZW5kID0gdGhpcy5zZWNvbmRSYW5nZSA/IHRoaXMuc2Vjb25kUmFuZ2UuZ2V0VGltZSgpIDogdGhpcy5ob3ZlckRhdGUsXG5cdFx0XHRtYXAgPSB0aGlzLmRheU1hcDtcblx0XHRpZiAoIWJlZyB8fCAhZW5kKSB7XG5cdFx0XHRPYmplY3Qua2V5cyhtYXApLmZvckVhY2goZnVuY3Rpb24gKGtleSwgaSkge1xuXHRcdFx0XHRtYXBba2V5XS5jbGFzc0xpc3QucmVtb3ZlKCdheS1yYW5nZScpO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGJlZyA9IGJlZy5nZXRUaW1lKCk7XG5cdFx0XHRPYmplY3Qua2V5cyhtYXApLmZvckVhY2goZnVuY3Rpb24gKGtleSwgaSkge1xuXHRcdFx0XHRpZiAoaW5SYW5nZShtYXBba2V5XS5fZGF0ZSwgYmVnLCBlbmQpKSB7XG5cdFx0XHRcdFx0bWFwW2tleV0uY2xhc3NMaXN0LmFkZCgnYXktcmFuZ2UnKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRtYXBba2V5XS5jbGFzc0xpc3QucmVtb3ZlKCdheS1yYW5nZScpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cblxuXHRoYXNSYW5nZSAoKSB7XG5cdFx0cmV0dXJuICEhdGhpcy5maXJzdFJhbmdlICYmICEhdGhpcy5zZWNvbmRSYW5nZTtcblx0fVxuXG5cdGlzVmFsaWRSYW5nZSAoZGF0ZSkge1xuXHRcdGlmICghdGhpcy5maXJzdFJhbmdlKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIGRhdGUuZ2V0VGltZSgpID4gdGhpcy5maXJzdFJhbmdlLmdldFRpbWUoKTtcblx0fVxuXG5cdHNldFJhbmdlRW5kUG9pbnRzICgpIHtcblx0XHR0aGlzLmNsZWFyRW5kUG9pbnRzKCk7XG5cdFx0aWYgKHRoaXMuZmlyc3RSYW5nZSkge1xuXHRcdFx0aWYgKHRoaXMuZmlyc3RSYW5nZS5nZXRNb250aCgpID09PSB0aGlzLmN1cnJlbnQuZ2V0TW9udGgoKSkge1xuXHRcdFx0XHR0aGlzLmRheU1hcFt0aGlzLmZpcnN0UmFuZ2UuZ2V0RGF0ZSgpXS5jbGFzc0xpc3QuYWRkKCdheS1yYW5nZS1maXJzdCcpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMuc2Vjb25kUmFuZ2UgJiYgdGhpcy5zZWNvbmRSYW5nZS5nZXRNb250aCgpID09PSB0aGlzLmN1cnJlbnQuZ2V0TW9udGgoKSkge1xuXHRcdFx0XHR0aGlzLmRheU1hcFt0aGlzLnNlY29uZFJhbmdlLmdldERhdGUoKV0uY2xhc3NMaXN0LmFkZCgnYXktcmFuZ2Utc2Vjb25kJyk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Y2xlYXJFbmRQb2ludHMgKCkge1xuXHRcdHZhciBmaXJzdCA9IHRoaXMucXVlcnlTZWxlY3RvcignLmF5LXJhbmdlLWZpcnN0JyksXG5cdFx0XHRzZWNvbmQgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5heS1yYW5nZS1zZWNvbmQnKTtcblx0XHRpZiAoZmlyc3QpIHtcblx0XHRcdGZpcnN0LmNsYXNzTGlzdC5yZW1vdmUoJ2F5LXJhbmdlLWZpcnN0Jyk7XG5cdFx0fVxuXHRcdGlmIChzZWNvbmQpIHtcblx0XHRcdHNlY29uZC5jbGFzc0xpc3QucmVtb3ZlKCdheS1yYW5nZS1zZWNvbmQnKTtcblx0XHR9XG5cdH1cblxuXHRkb21SZWFkeSAoKSB7XG5cdFx0aWYgKHRoaXMuaGFzQXR0cmlidXRlKCdyYW5nZS1sZWZ0JykpIHtcblx0XHRcdHRoaXMucmd0Tm9kZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuXHRcdFx0dGhpc1sncmFuZ2UtcGlja2VyJ10gPSB0cnVlO1xuXHRcdFx0dGhpcy5pc093bmVkID0gdHJ1ZTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuaGFzQXR0cmlidXRlKCdyYW5nZS1yaWdodCcpKSB7XG5cdFx0XHR0aGlzLmxmdE5vZGUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcblx0XHRcdHRoaXNbJ3JhbmdlLXBpY2tlciddID0gdHJ1ZTtcblx0XHRcdHRoaXMuaXNPd25lZCA9IHRydWU7XG5cdFx0fVxuXHRcdGlmICh0aGlzLmlzT3duZWQpIHtcblx0XHRcdHRoaXMuY2xhc3NMaXN0LmFkZCgnbWluaW1hbCcpO1xuXHRcdH1cblxuXHRcdHRoaXMuY3VycmVudCA9IGNvcHkodGhpcy52YWx1ZSk7XG5cblx0XHR0aGlzLmNvbm5lY3QoKTtcblx0XHR0aGlzLnJlbmRlcigpO1xuXHR9XG5cblx0cmVuZGVyICgpIHtcblx0XHQvLyBkYXRlTnVtIGluY3JlbWVudHMsIHN0YXJ0aW5nIHdpdGggdGhlIGZpcnN0IFN1bmRheVxuXHRcdC8vIHNob3dpbmcgb24gdGhlIG1vbnRobHkgY2FsZW5kYXIuIFRoaXMgaXMgdXN1YWxseSB0aGVcblx0XHQvLyBwcmV2aW91cyBtb250aCwgc28gZGF0ZU51bSB3aWxsIHN0YXJ0IGFzIGEgbmVnYXRpdmUgbnVtYmVyXG5cdFx0dGhpcy5zZXRNb2RlKDApO1xuXHRcdGlmICh0aGlzLmJvZHlOb2RlKSB7XG5cdFx0XHRkb20uZGVzdHJveSh0aGlzLmJvZHlOb2RlKTtcblx0XHR9XG5cblx0XHR0aGlzLmRheU1hcCA9IHt9O1xuXG5cdFx0dmFyXG5cdFx0XHRub2RlID0gZG9tKCdkaXYnLCB7IGNsYXNzOiAnY2FsLWJvZHknIH0pLFxuXHRcdFx0aSwgdHgsIG5leHRNb250aCA9IDAsIGlzVGhpc01vbnRoLCBkYXksIGNzcyxcblx0XHRcdHRvZGF5ID0gbmV3IERhdGUoKSxcblx0XHRcdGlzUmFuZ2UgPSB0aGlzWydyYW5nZS1waWNrZXInXSxcblx0XHRcdGQgPSB0aGlzLmN1cnJlbnQsXG5cdFx0XHRpbmNEYXRlID0gY29weShkKSxcblx0XHRcdGRheXNJblByZXZNb250aCA9IGRhdGVzLmdldERheXNJblByZXZNb250aChkKSxcblx0XHRcdGRheXNJbk1vbnRoID0gZGF0ZXMuZ2V0RGF5c0luTW9udGgoZCksXG5cdFx0XHRkYXRlTnVtID0gZGF0ZXMuZ2V0Rmlyc3RTdW5kYXkoZCksXG5cdFx0XHRkYXRlVG9kYXkgPSBnZXRTZWxlY3RlZERhdGUodG9kYXksIGQpLFxuXHRcdFx0ZGF0ZVNlbGVjdGVkID0gZ2V0U2VsZWN0ZWREYXRlKHRoaXMudmFsdWVEYXRlLCBkKTtcblxuXHRcdHRoaXMubW9udGhOb2RlLmlubmVySFRNTCA9IGRhdGVzLmdldE1vbnRoTmFtZShkKSArICcgJyArIGQuZ2V0RnVsbFllYXIoKTtcblxuXHRcdGZvciAoaSA9IDA7IGkgPCA3OyBpKyspIHtcblx0XHRcdGRvbShcImRpdlwiLCB7IGh0bWw6IGRhdGVzLmRheXMuYWJicltpXSwgY2xhc3M6ICdkYXktb2Ytd2VlaycgfSwgbm9kZSk7XG5cdFx0fVxuXG5cdFx0Zm9yIChpID0gMDsgaSA8IDQyOyBpKyspIHtcblx0XHRcdHR4ID0gZGF0ZU51bSArIDEgPiAwICYmIGRhdGVOdW0gKyAxIDw9IGRheXNJbk1vbnRoID8gZGF0ZU51bSArIDEgOiBcIiZuYnNwO1wiO1xuXG5cdFx0XHRpc1RoaXNNb250aCA9IGZhbHNlO1xuXHRcdFx0aWYgKGRhdGVOdW0gKyAxID4gMCAmJiBkYXRlTnVtICsgMSA8PSBkYXlzSW5Nb250aCkge1xuXHRcdFx0XHQvLyBjdXJyZW50IG1vbnRoXG5cdFx0XHRcdHR4ID0gZGF0ZU51bSArIDE7XG5cdFx0XHRcdGlzVGhpc01vbnRoID0gdHJ1ZTtcblx0XHRcdFx0Y3NzID0gJ2RheSBvbic7XG5cdFx0XHRcdGlmIChkYXRlVG9kYXkgPT09IHR4KSB7XG5cdFx0XHRcdFx0Y3NzICs9ICcgdG9kYXknO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChkYXRlU2VsZWN0ZWQgPT09IHR4ICYmICFpc1JhbmdlKSB7XG5cdFx0XHRcdFx0Y3NzICs9ICcgYXktc2VsZWN0ZWQnO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgaWYgKGRhdGVOdW0gPCAwKSB7XG5cdFx0XHRcdC8vIHByZXZpb3VzIG1vbnRoXG5cdFx0XHRcdHR4ID0gZGF5c0luUHJldk1vbnRoICsgZGF0ZU51bSArIDE7XG5cdFx0XHRcdGNzcyA9ICdkYXkgb2ZmIHBhc3QnO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gbmV4dCBtb250aFxuXHRcdFx0XHR0eCA9ICsrbmV4dE1vbnRoO1xuXHRcdFx0XHRjc3MgPSAnZGF5IG9mZiBmdXR1cmUnO1xuXHRcdFx0fVxuXG5cdFx0XHRkYXkgPSBkb20oXCJkaXZcIiwgeyBpbm5lckhUTUw6IHR4LCBjbGFzczogY3NzIH0sIG5vZGUpO1xuXG5cdFx0XHRkYXRlTnVtKys7XG5cdFx0XHRpZiAoaXNUaGlzTW9udGgpIHtcblx0XHRcdFx0Ly8gS2VlcCBhIG1hcCBvZiBhbGwgdGhlIGRheXNcblx0XHRcdFx0Ly8gdXNlIGl0IGZvciBhZGRpbmcgYW5kIHJlbW92aW5nIHNlbGVjdGlvbi9ob3ZlciBjbGFzc2VzXG5cdFx0XHRcdGluY0RhdGUuc2V0RGF0ZSh0eCk7XG5cdFx0XHRcdGRheS5fZGF0ZSA9IGluY0RhdGUuZ2V0VGltZSgpO1xuXHRcdFx0XHR0aGlzLmRheU1hcFt0eF0gPSBkYXk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5jb250YWluZXIuYXBwZW5kQ2hpbGQobm9kZSk7XG5cdFx0dGhpcy5ib2R5Tm9kZSA9IG5vZGU7XG5cdFx0dGhpcy5zZXRGb290ZXIoKTtcblx0XHR0aGlzLmRpc3BsYXlSYW5nZSgpO1xuXHRcdHRoaXMuc2V0UmFuZ2VFbmRQb2ludHMoKTtcblxuXHRcdHRoaXMuZW1pdERpc3BsYXlFdmVudHMoKTtcblx0fVxuXG5cdHNldEZvb3RlciAoKSB7XG5cdFx0dmFyXG5cdFx0XHRkID0gbmV3IERhdGUoKSxcblx0XHRcdHN0ciA9IGRhdGVzLmRheXMuZnVsbFtkLmdldERheSgpXSArICcgJyArIGRhdGVzLm1vbnRocy5mdWxsW2QuZ2V0TW9udGgoKV0gKyAnICcgKyBkLmdldERhdGUoKSArICcsICcgKyBkLmdldEZ1bGxZZWFyKCk7XG5cdFx0dGhpcy5mb290ZXJMaW5rLmlubmVySFRNTCA9IHN0cjtcblx0fVxuXG5cdGNvbm5lY3QgKCkge1xuXHRcdHRoaXMub24odGhpcy5sZnROb2RlLCAnY2xpY2snLCAoKSA9PiB7XG5cdFx0XHR0aGlzLm9uQ2xpY2tNb250aCgtMSk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLm9uKHRoaXMucmd0Tm9kZSwgJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0dGhpcy5vbkNsaWNrTW9udGgoMSk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLm9uKHRoaXMuZm9vdGVyTGluaywgJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0dGhpcy5jdXJyZW50ID0gbmV3IERhdGUoKTtcblx0XHRcdHRoaXMucmVuZGVyKCk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLm9uKHRoaXMuY29udGFpbmVyLCAnY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0dGhpcy5maXJlKCdwcmUtY2xpY2snLCBlLCB0cnVlLCB0cnVlKTtcblx0XHRcdHZhciBub2RlID0gZS50YXJnZXQ7XG5cdFx0XHRpZiAobm9kZS5jbGFzc0xpc3QuY29udGFpbnMoJ2RheScpKSB7XG5cdFx0XHRcdHRoaXMub25DbGlja0RheShub2RlKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKG5vZGUuY2xhc3NMaXN0LmNvbnRhaW5zKCd5ZWFyJykpIHtcblx0XHRcdFx0dGhpcy5vbkNsaWNrWWVhcihub2RlKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKG5vZGUuY2xhc3NMaXN0LmNvbnRhaW5zKCdkZWNhZGUnKSkge1xuXHRcdFx0XHR0aGlzLm9uQ2xpY2tEZWNhZGUobm9kZSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLm9uKHRoaXMubW9udGhOb2RlLCAnY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRpZiAodGhpcy5tb2RlICsgMSA9PT0gdGhpcy5tb2Rlcy5sZW5ndGgpIHtcblx0XHRcdFx0dGhpcy5tb2RlID0gMDtcblx0XHRcdFx0dGhpcy5yZW5kZXIoKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR0aGlzLnNldE1vZGUodGhpcy5tb2RlICsgMSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRpZiAodGhpc1sncmFuZ2UtcGlja2VyJ10pIHtcblx0XHRcdHRoaXMub24odGhpcy5jb250YWluZXIsICdtb3VzZW92ZXInLCB0aGlzLmhvdmVyU2VsZWN0UmFuZ2UuYmluZCh0aGlzKSk7XG5cdFx0fVxuXHR9XG59XG5cbmNvbnN0IHRvZGF5ID0gbmV3IERhdGUoKTtcblxuZnVuY3Rpb24gZ2V0U2VsZWN0ZWREYXRlIChkYXRlLCBjdXJyZW50KSB7XG5cdGlmIChkYXRlLmdldE1vbnRoKCkgPT09IGN1cnJlbnQuZ2V0TW9udGgoKSAmJiBkYXRlLmdldEZ1bGxZZWFyKCkgPT09IGN1cnJlbnQuZ2V0RnVsbFllYXIoKSkge1xuXHRcdHJldHVybiBkYXRlLmdldERhdGUoKTtcblx0fVxuXHRyZXR1cm4gLTk5OTsgLy8gaW5kZXggbXVzdCBiZSBvdXQgb2YgcmFuZ2UsIGFuZCAtMSBpcyB0aGUgbGFzdCBkYXkgb2YgdGhlIHByZXZpb3VzIG1vbnRoXG59XG5cbmZ1bmN0aW9uIGRlc3Ryb3kgKG5vZGUpIHtcblx0aWYgKG5vZGUpIHtcblx0XHRkb20uZGVzdHJveShub2RlKTtcblx0fVxufVxuXG5mdW5jdGlvbiBpc1RoaXNNb250aCAoZGF0ZSwgY3VycmVudERhdGUpIHtcblx0cmV0dXJuIGRhdGUuZ2V0TW9udGgoKSA9PT0gY3VycmVudERhdGUuZ2V0TW9udGgoKSAmJiBkYXRlLmdldEZ1bGxZZWFyKCkgPT09IGN1cnJlbnREYXRlLmdldEZ1bGxZZWFyKCk7XG59XG5cbmZ1bmN0aW9uIGluUmFuZ2UgKGRhdGVUaW1lLCBiZWdUaW1lLCBlbmRUaW1lKSB7XG5cdHJldHVybiBkYXRlVGltZSA+PSBiZWdUaW1lICYmIGRhdGVUaW1lIDw9IGVuZFRpbWU7XG59XG5cbmZ1bmN0aW9uIGNvcHkgKGRhdGUpIHtcblx0cmV0dXJuIG5ldyBEYXRlKGRhdGUuZ2V0VGltZSgpKTtcbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdkYXRlLXBpY2tlcicsIERhdGVQaWNrZXIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERhdGVQaWNrZXI7IiwicmVxdWlyZSgnLi9nbG9iYWxzJyk7XG5yZXF1aXJlKCcuLi8uLi9zcmMvZGF0ZS1waWNrZXInKTsiLCJ3aW5kb3dbJ25vLW5hdGl2ZS1zaGltJ10gPSBmYWxzZTtcbnJlcXVpcmUoJ2N1c3RvbS1lbGVtZW50cy1wb2x5ZmlsbCcpO1xud2luZG93Lm9uID0gcmVxdWlyZSgnb24nKTtcbndpbmRvdy5kb20gPSByZXF1aXJlKCdkb20nKTsiXX0=
