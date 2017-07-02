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

// range-left/range-right mean that this is one side of a date-range-picker
var bools = ['range-picker', 'range-left', 'range-right'];

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
			if (this['range-left']) {
				this.rgtNode.style.display = 'none';
				this['range-picker'] = true;
				this.isOwned = true;
			}
			if (this['range-right']) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQmFzZUNvbXBvbmVudC9zcmMvcHJvcGVydGllcy5qcyIsIm5vZGVfbW9kdWxlcy9CYXNlQ29tcG9uZW50L3NyYy9yZWZzLmpzIiwibm9kZV9tb2R1bGVzL0Jhc2VDb21wb25lbnQvc3JjL3RlbXBsYXRlLmpzIiwibm9kZV9tb2R1bGVzL2RhdGVzL3NyYy9kYXRlcy5qcyIsInNyYy9kYXRlLXBpY2tlci5qcyIsInRlc3RzL3NyYy9kYXRlLXBpY2tlci10ZXN0cy5qcyIsInRlc3RzL3NyYy9nbG9iYWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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eEMsS0FBSSxLQUFLLFFBQUwsT0FBb0IsUUFBUSxRQUFSLEVBQXBCLElBQTBDLEtBQUssV0FBTCxPQUF1QixRQUFRLFdBQVIsRUFBckUsRUFBNEY7QUFDM0YsU0FBTyxLQUFLLE9BQUwsRUFBUDtBQUNBO0FBQ0QsUUFBTyxDQUFDLEdBQVIsQ0FKd0MsQ0FJM0I7QUFDYjs7QUFFRCxTQUFTLE9BQVQsQ0FBa0IsSUFBbEIsRUFBd0I7QUFDdkIsS0FBSSxJQUFKLEVBQVU7QUFDVCxNQUFJLE9BQUosQ0FBWSxJQUFaO0FBQ0E7QUFDRDs7QUFFRCxTQUFTLFdBQVQsQ0FBc0IsSUFBdEIsRUFBNEIsV0FBNUIsRUFBeUM7QUFDeEMsUUFBTyxLQUFLLFFBQUwsT0FBb0IsWUFBWSxRQUFaLEVBQXBCLElBQThDLEtBQUssV0FBTCxPQUF1QixZQUFZLFdBQVosRUFBNUU7QUFDQTs7QUFFRCxTQUFTLE9BQVQsQ0FBa0IsUUFBbEIsRUFBNEIsT0FBNUIsRUFBcUMsT0FBckMsRUFBOEM7QUFDN0MsUUFBTyxZQUFZLE9BQVosSUFBdUIsWUFBWSxPQUExQztBQUNBOztBQUVELFNBQVMsSUFBVCxDQUFlLElBQWYsRUFBcUI7QUFDcEIsUUFBTyxJQUFJLElBQUosQ0FBUyxLQUFLLE9BQUwsRUFBVCxDQUFQO0FBQ0E7O0FBRUQsZUFBZSxNQUFmLENBQXNCLGFBQXRCLEVBQXFDLFVBQXJDOztBQUVBLE9BQU8sT0FBUCxHQUFpQixVQUFqQjs7Ozs7QUMvZ0JBLFFBQVEsV0FBUjtBQUNBLFFBQVEsdUJBQVI7Ozs7O0FDREEsT0FBTyxnQkFBUCxJQUEyQixLQUEzQjtBQUNBLFFBQVEsMEJBQVI7QUFDQSxPQUFPLEVBQVAsR0FBWSxRQUFRLElBQVIsQ0FBWjtBQUNBLE9BQU8sR0FBUCxHQUFhLFFBQVEsS0FBUixDQUFiIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImNvbnN0IEJhc2VDb21wb25lbnQgPSByZXF1aXJlKCdCYXNlQ29tcG9uZW50Jyk7XG5jb25zdCBkb20gPSByZXF1aXJlKCdkb20nKTtcblxuZnVuY3Rpb24gc2V0Qm9vbGVhbiAobm9kZSwgcHJvcCkge1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkobm9kZSwgcHJvcCwge1xuXHRcdGVudW1lcmFibGU6IHRydWUsXG5cdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHRcdGdldCAoKSB7XG5cdFx0XHRyZXR1cm4gbm9kZS5oYXNBdHRyaWJ1dGUocHJvcCk7XG5cdFx0fSxcblx0XHRzZXQgKHZhbHVlKSB7XG5cdFx0XHR0aGlzLmlzU2V0dGluZ0F0dHJpYnV0ZSA9IHRydWU7XG5cdFx0XHRpZiAodmFsdWUpIHtcblx0XHRcdFx0dGhpcy5zZXRBdHRyaWJ1dGUocHJvcCwgJycpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5yZW1vdmVBdHRyaWJ1dGUocHJvcCk7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBmbiA9IHRoaXNbb25pZnkocHJvcCldO1xuXHRcdFx0aWYoZm4pe1xuXHRcdFx0XHRmbi5jYWxsKHRoaXMsIHZhbHVlKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5pc1NldHRpbmdBdHRyaWJ1dGUgPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBzZXRQcm9wZXJ0eSAobm9kZSwgcHJvcCkge1xuXHRsZXQgcHJvcFZhbHVlO1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkobm9kZSwgcHJvcCwge1xuXHRcdGVudW1lcmFibGU6IHRydWUsXG5cdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHRcdGdldCAoKSB7XG5cdFx0XHRyZXR1cm4gcHJvcFZhbHVlICE9PSB1bmRlZmluZWQgPyBwcm9wVmFsdWUgOiBkb20ubm9ybWFsaXplKHRoaXMuZ2V0QXR0cmlidXRlKHByb3ApKTtcblx0XHR9LFxuXHRcdHNldCAodmFsdWUpIHtcblx0XHRcdHRoaXMuaXNTZXR0aW5nQXR0cmlidXRlID0gdHJ1ZTtcblx0XHRcdHRoaXMuc2V0QXR0cmlidXRlKHByb3AsIHZhbHVlKTtcblx0XHRcdGNvbnN0IGZuID0gdGhpc1tvbmlmeShwcm9wKV07XG5cdFx0XHRpZihmbil7XG5cdFx0XHRcdG9uRG9tUmVhZHkodGhpcywgKCkgPT4ge1xuXHRcdFx0XHRcdHZhbHVlID0gZm4uY2FsbCh0aGlzLCB2YWx1ZSkgfHwgdmFsdWU7XG5cdFx0XHRcdFx0aWYodmFsdWUgIT09IHVuZGVmaW5lZCl7XG5cdFx0XHRcdFx0XHRwcm9wVmFsdWUgPSB2YWx1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5pc1NldHRpbmdBdHRyaWJ1dGUgPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBzZXRPYmplY3QgKG5vZGUsIHByb3ApIHtcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG5vZGUsIHByb3AsIHtcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcblx0XHRnZXQgKCkge1xuXHRcdFx0cmV0dXJuIHRoaXNbJ19fJyArIHByb3BdO1xuXHRcdH0sXG5cdFx0c2V0ICh2YWx1ZSkge1xuXHRcdFx0dGhpc1snX18nICsgcHJvcF0gPSB2YWx1ZTtcblx0XHR9XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBzZXRQcm9wZXJ0aWVzIChub2RlKSB7XG5cdGxldCBwcm9wcyA9IG5vZGUucHJvcHMgfHwgbm9kZS5wcm9wZXJ0aWVzO1xuXHRpZiAocHJvcHMpIHtcblx0XHRwcm9wcy5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG5cdFx0XHRpZiAocHJvcCA9PT0gJ2Rpc2FibGVkJykge1xuXHRcdFx0XHRzZXRCb29sZWFuKG5vZGUsIHByb3ApO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHNldFByb3BlcnR5KG5vZGUsIHByb3ApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHNldEJvb2xlYW5zIChub2RlKSB7XG5cdGxldCBwcm9wcyA9IG5vZGUuYm9vbHMgfHwgbm9kZS5ib29sZWFucztcblx0aWYgKHByb3BzKSB7XG5cdFx0cHJvcHMuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuXHRcdFx0c2V0Qm9vbGVhbihub2RlLCBwcm9wKTtcblx0XHR9KTtcblx0fVxufVxuXG5mdW5jdGlvbiBzZXRPYmplY3RzIChub2RlKSB7XG5cdGxldCBwcm9wcyA9IG5vZGUub2JqZWN0cztcblx0aWYgKHByb3BzKSB7XG5cdFx0cHJvcHMuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuXHRcdFx0c2V0T2JqZWN0KG5vZGUsIHByb3ApO1xuXHRcdH0pO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGNhcCAobmFtZSkge1xuXHRyZXR1cm4gbmFtZS5zdWJzdHJpbmcoMCwxKS50b1VwcGVyQ2FzZSgpICsgbmFtZS5zdWJzdHJpbmcoMSk7XG59XG5cbmZ1bmN0aW9uIG9uaWZ5IChuYW1lKSB7XG5cdHJldHVybiAnb24nICsgbmFtZS5zcGxpdCgnLScpLm1hcCh3b3JkID0+IGNhcCh3b3JkKSkuam9pbignJyk7XG59XG5cbmZ1bmN0aW9uIGlzQm9vbCAobm9kZSwgbmFtZSkge1xuXHRyZXR1cm4gKG5vZGUuYm9vbHMgfHwgbm9kZS5ib29sZWFucyB8fCBbXSkuaW5kZXhPZihuYW1lKSA+IC0xO1xufVxuXG5mdW5jdGlvbiBib29sTm9ybSAodmFsdWUpIHtcblx0aWYodmFsdWUgPT09ICcnKXtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXHRyZXR1cm4gZG9tLm5vcm1hbGl6ZSh2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIHByb3BOb3JtICh2YWx1ZSkge1xuXHRyZXR1cm4gZG9tLm5vcm1hbGl6ZSh2YWx1ZSk7XG59XG5cbkJhc2VDb21wb25lbnQuYWRkUGx1Z2luKHtcblx0bmFtZTogJ3Byb3BlcnRpZXMnLFxuXHRvcmRlcjogMTAsXG5cdGluaXQ6IGZ1bmN0aW9uIChub2RlKSB7XG5cdFx0c2V0UHJvcGVydGllcyhub2RlKTtcblx0XHRzZXRCb29sZWFucyhub2RlKTtcblx0fSxcblx0cHJlQXR0cmlidXRlQ2hhbmdlZDogZnVuY3Rpb24gKG5vZGUsIG5hbWUsIHZhbHVlKSB7XG5cdFx0aWYgKG5vZGUuaXNTZXR0aW5nQXR0cmlidXRlKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdGlmKGlzQm9vbChub2RlLCBuYW1lKSl7XG5cdFx0XHR2YWx1ZSA9IGJvb2xOb3JtKHZhbHVlKTtcblx0XHRcdG5vZGVbbmFtZV0gPSAhIXZhbHVlO1xuXHRcdFx0aWYoIXZhbHVlKXtcblx0XHRcdFx0bm9kZVtuYW1lXSA9IGZhbHNlO1xuXHRcdFx0XHRub2RlLmlzU2V0dGluZ0F0dHJpYnV0ZSA9IHRydWU7XG5cdFx0XHRcdG5vZGUucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuXHRcdFx0XHRub2RlLmlzU2V0dGluZ0F0dHJpYnV0ZSA9IGZhbHNlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bm9kZVtuYW1lXSA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0bm9kZVtuYW1lXSA9IHByb3BOb3JtKHZhbHVlKTtcblx0fVxufSk7IiwiY29uc3QgZG9tID0gcmVxdWlyZSgnZG9tJyk7XG5jb25zdCBCYXNlQ29tcG9uZW50ID0gcmVxdWlyZSgnQmFzZUNvbXBvbmVudCcpO1xuXG5mdW5jdGlvbiBhc3NpZ25SZWZzIChub2RlKSB7XG4gICAgZG9tLnF1ZXJ5QWxsKG5vZGUsICdbcmVmXScpLmZvckVhY2goZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICAgIGxldCBuYW1lID0gY2hpbGQuZ2V0QXR0cmlidXRlKCdyZWYnKTtcbiAgICAgICAgbm9kZVtuYW1lXSA9IGNoaWxkO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBhc3NpZ25FdmVudHMgKG5vZGUpIHtcbiAgICAvLyA8ZGl2IG9uPVwiY2xpY2s6b25DbGlja1wiPlxuICAgIGRvbS5xdWVyeUFsbChub2RlLCAnW29uXScpLmZvckVhY2goZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICAgIGxldFxuICAgICAgICAgICAga2V5VmFsdWUgPSBjaGlsZC5nZXRBdHRyaWJ1dGUoJ29uJyksXG4gICAgICAgICAgICBldmVudCA9IGtleVZhbHVlLnNwbGl0KCc6JylbMF0udHJpbSgpLFxuICAgICAgICAgICAgbWV0aG9kID0ga2V5VmFsdWUuc3BsaXQoJzonKVsxXS50cmltKCk7XG4gICAgICAgIG5vZGUub24oY2hpbGQsIGV2ZW50LCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgbm9kZVttZXRob2RdKGUpXG4gICAgICAgIH0pXG4gICAgfSk7XG59XG5cbkJhc2VDb21wb25lbnQuYWRkUGx1Z2luKHtcbiAgICBuYW1lOiAncmVmcycsXG4gICAgb3JkZXI6IDMwLFxuICAgIHByZUNvbm5lY3RlZDogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgYXNzaWduUmVmcyhub2RlKTtcbiAgICAgICAgYXNzaWduRXZlbnRzKG5vZGUpO1xuICAgIH1cbn0pOyIsImNvbnN0IEJhc2VDb21wb25lbnQgID0gcmVxdWlyZSgnQmFzZUNvbXBvbmVudCcpO1xuY29uc3QgZG9tID0gcmVxdWlyZSgnZG9tJyk7XG5cbnZhclxuICAgIGxpZ2h0Tm9kZXMgPSB7fSxcbiAgICBpbnNlcnRlZCA9IHt9O1xuXG5mdW5jdGlvbiBpbnNlcnQgKG5vZGUpIHtcbiAgICBpZihpbnNlcnRlZFtub2RlLl91aWRdIHx8ICFoYXNUZW1wbGF0ZShub2RlKSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29sbGVjdExpZ2h0Tm9kZXMobm9kZSk7XG4gICAgaW5zZXJ0VGVtcGxhdGUobm9kZSk7XG4gICAgaW5zZXJ0ZWRbbm9kZS5fdWlkXSA9IHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbGxlY3RMaWdodE5vZGVzKG5vZGUpe1xuICAgIGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXSA9IGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXSB8fCBbXTtcbiAgICB3aGlsZShub2RlLmNoaWxkTm9kZXMubGVuZ3RoKXtcbiAgICAgICAgbGlnaHROb2Rlc1tub2RlLl91aWRdLnB1c2gobm9kZS5yZW1vdmVDaGlsZChub2RlLmNoaWxkTm9kZXNbMF0pKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGhhc1RlbXBsYXRlIChub2RlKSB7XG4gICAgcmV0dXJuICEhbm9kZS5nZXRUZW1wbGF0ZU5vZGUoKTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0VGVtcGxhdGVDaGFpbiAobm9kZSkge1xuICAgIHZhciB0ZW1wbGF0ZXMgPSBub2RlLmdldFRlbXBsYXRlQ2hhaW4oKTtcbiAgICB0ZW1wbGF0ZXMucmV2ZXJzZSgpLmZvckVhY2goZnVuY3Rpb24gKHRlbXBsYXRlKSB7XG4gICAgICAgIGdldENvbnRhaW5lcihub2RlKS5hcHBlbmRDaGlsZChCYXNlQ29tcG9uZW50LmNsb25lKHRlbXBsYXRlKSk7XG4gICAgfSk7XG4gICAgaW5zZXJ0Q2hpbGRyZW4obm9kZSk7XG59XG5cbmZ1bmN0aW9uIGluc2VydFRlbXBsYXRlIChub2RlKSB7XG4gICAgaWYobm9kZS5uZXN0ZWRUZW1wbGF0ZSl7XG4gICAgICAgIGluc2VydFRlbXBsYXRlQ2hhaW4obm9kZSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyXG4gICAgICAgIHRlbXBsYXRlTm9kZSA9IG5vZGUuZ2V0VGVtcGxhdGVOb2RlKCk7XG5cbiAgICBpZih0ZW1wbGF0ZU5vZGUpIHtcbiAgICAgICAgbm9kZS5hcHBlbmRDaGlsZChCYXNlQ29tcG9uZW50LmNsb25lKHRlbXBsYXRlTm9kZSkpO1xuICAgIH1cbiAgICBpbnNlcnRDaGlsZHJlbihub2RlKTtcbn1cblxuZnVuY3Rpb24gZ2V0Q29udGFpbmVyIChub2RlKSB7XG4gICAgdmFyIGNvbnRhaW5lcnMgPSBub2RlLnF1ZXJ5U2VsZWN0b3JBbGwoJ1tyZWY9XCJjb250YWluZXJcIl0nKTtcbiAgICBpZighY29udGFpbmVycyB8fCAhY29udGFpbmVycy5sZW5ndGgpe1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRhaW5lcnNbY29udGFpbmVycy5sZW5ndGggLSAxXTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0Q2hpbGRyZW4gKG5vZGUpIHtcbiAgICB2YXIgaSxcbiAgICAgICAgY29udGFpbmVyID0gZ2V0Q29udGFpbmVyKG5vZGUpLFxuICAgICAgICBjaGlsZHJlbiA9IGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXTtcblxuICAgIGlmKGNvbnRhaW5lciAmJiBjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGgpe1xuICAgICAgICBmb3IoaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoY2hpbGRyZW5baV0pO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5CYXNlQ29tcG9uZW50LnByb3RvdHlwZS5nZXRMaWdodE5vZGVzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBsaWdodE5vZGVzW3RoaXMuX3VpZF07XG59O1xuXG5CYXNlQ29tcG9uZW50LnByb3RvdHlwZS5nZXRUZW1wbGF0ZU5vZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gY2FjaGluZyBjYXVzZXMgZGlmZmVyZW50IGNsYXNzZXMgdG8gcHVsbCB0aGUgc2FtZSB0ZW1wbGF0ZSAtIHdhdD9cbiAgICAvL2lmKCF0aGlzLnRlbXBsYXRlTm9kZSkge1xuICAgICAgICBpZiAodGhpcy50ZW1wbGF0ZUlkKSB7XG4gICAgICAgICAgICB0aGlzLnRlbXBsYXRlTm9kZSA9IGRvbS5ieUlkKHRoaXMudGVtcGxhdGVJZC5yZXBsYWNlKCcjJywnJykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMudGVtcGxhdGVTdHJpbmcpIHtcbiAgICAgICAgICAgIHRoaXMudGVtcGxhdGVOb2RlID0gZG9tLnRvRG9tKCc8dGVtcGxhdGU+JyArIHRoaXMudGVtcGxhdGVTdHJpbmcgKyAnPC90ZW1wbGF0ZT4nKTtcbiAgICAgICAgfVxuICAgIC8vfVxuICAgIHJldHVybiB0aGlzLnRlbXBsYXRlTm9kZTtcbn07XG5cbkJhc2VDb21wb25lbnQucHJvdG90eXBlLmdldFRlbXBsYXRlQ2hhaW4gPSBmdW5jdGlvbiAoKSB7XG5cbiAgICBsZXRcbiAgICAgICAgY29udGV4dCA9IHRoaXMsXG4gICAgICAgIHRlbXBsYXRlcyA9IFtdLFxuICAgICAgICB0ZW1wbGF0ZTtcblxuICAgIC8vIHdhbGsgdGhlIHByb3RvdHlwZSBjaGFpbjsgQmFiZWwgZG9lc24ndCBhbGxvdyB1c2luZ1xuICAgIC8vIGBzdXBlcmAgc2luY2Ugd2UgYXJlIG91dHNpZGUgb2YgdGhlIENsYXNzXG4gICAgd2hpbGUoY29udGV4dCl7XG4gICAgICAgIGNvbnRleHQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoY29udGV4dCk7XG4gICAgICAgIGlmKCFjb250ZXh0KXsgYnJlYWs7IH1cbiAgICAgICAgLy8gc2tpcCBwcm90b3R5cGVzIHdpdGhvdXQgYSB0ZW1wbGF0ZVxuICAgICAgICAvLyAoZWxzZSBpdCB3aWxsIHB1bGwgYW4gaW5oZXJpdGVkIHRlbXBsYXRlIGFuZCBjYXVzZSBkdXBsaWNhdGVzKVxuICAgICAgICBpZihjb250ZXh0Lmhhc093blByb3BlcnR5KCd0ZW1wbGF0ZVN0cmluZycpIHx8IGNvbnRleHQuaGFzT3duUHJvcGVydHkoJ3RlbXBsYXRlSWQnKSkge1xuICAgICAgICAgICAgdGVtcGxhdGUgPSBjb250ZXh0LmdldFRlbXBsYXRlTm9kZSgpO1xuICAgICAgICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGVzLnB1c2godGVtcGxhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0ZW1wbGF0ZXM7XG59O1xuXG5CYXNlQ29tcG9uZW50LmFkZFBsdWdpbih7XG4gICAgbmFtZTogJ3RlbXBsYXRlJyxcbiAgICBvcmRlcjogMjAsXG4gICAgcHJlQ29ubmVjdGVkOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICBpbnNlcnQobm9kZSk7XG4gICAgfVxufSk7IiwiLyogVU1ELmRlZmluZSAqLyAoZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgICBpZiAodHlwZW9mIGN1c3RvbUxvYWRlciA9PT0gJ2Z1bmN0aW9uJyl7IGN1c3RvbUxvYWRlcihmYWN0b3J5LCAnZGF0ZXMnKTsgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCl7IGRlZmluZShbXSwgZmFjdG9yeSk7IH1cbiAgICBlbHNlIGlmKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jyl7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpOyB9XG4gICAgZWxzZXsgcm9vdC5yZXR1cm5FeHBvcnRzID0gZmFjdG9yeSgpO1xuICAgICAgICB3aW5kb3cuZGF0ZXMgPSBmYWN0b3J5KCk7IH1cbn0odGhpcywgZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIC8vIGRhdGVzLmpzXG4gICAgLy8gIGRhdGUgaGVscGVyIGxpYlxuICAgIC8vXG4gICAgdmFyXG4gICAgICAgIC8vIHRlc3RzIHRoYXQgaXQgaXMgYSBkYXRlIHN0cmluZywgbm90IGEgdmFsaWQgZGF0ZS4gODgvODgvODg4OCB3b3VsZCBiZSB0cnVlXG4gICAgICAgIGRhdGVSZWdFeHAgPSAvXihcXGR7MSwyfSkoW1xcLy1dKShcXGR7MSwyfSkoW1xcLy1dKShcXGR7NH0pXFxiLyxcbiAgICAgICAgLy8gMjAxNS0wNS0yNlQwMDowMDowMFxuICAgICAgICB0c1JlZ0V4cCA9IC9eKFxcZHs0fSktKFxcZHsyfSktKFxcZHsyfSlUKFxcZHsyfSk6KFxcZHsyfSk6KFxcZHsyfSlcXGIvLFxuXG4gICAgICAgIGRheXNPZldlZWsgPSBbJ1N1bmRheScsICdNb25kYXknLCAnVHVlc2RheScsICdXZWRuZXNkYXknLCAnVGh1cnNkYXknLCAnRnJpZGF5JywgJ1NhdHVyZGF5J10sXG4gICAgICAgIGRheXMgPSBbXSxcbiAgICAgICAgZGF5czMgPSBbXSxcbiAgICAgICAgZGF5RGljdCA9IHt9LFxuXG4gICAgICAgIG1vbnRocyA9IFsnSmFudWFyeScsICdGZWJydWFyeScsICdNYXJjaCcsICdBcHJpbCcsICdNYXknLCAnSnVuZScsICdKdWx5JywgJ0F1Z3VzdCcsICdTZXB0ZW1iZXInLCAnT2N0b2JlcicsICdOb3ZlbWJlcicsICdEZWNlbWJlciddLFxuICAgICAgICBtb250aExlbmd0aHMgPSBbMzEsIDI4LCAzMSwgMzAsIDMxLCAzMCwgMzEsIDMxLCAzMCwgMzEsIDMwLCAzMV0sXG4gICAgICAgIG1vbnRoQWJiciA9IFtdLFxuICAgICAgICBtb250aERpY3QgPSB7fSxcblxuICAgICAgICBkYXRlUGF0dGVybiA9IC95eXl5fHl5fG1tfG18TU18TXxkZHxkL2csXG4gICAgICAgIGRhdGVQYXR0ZXJuTGlicmFyeSA9IHtcbiAgICAgICAgICAgIHl5eXk6IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZS5nZXRGdWxsWWVhcigpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHl5OiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChkYXRlLmdldEZ1bGxZZWFyKCkgKyAnJykuc3Vic3RyaW5nKDIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1tOiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhZChkYXRlLmdldE1vbnRoKCkgKyAxKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtOiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGUuZ2V0TW9udGgoKSArIDE7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgTU06IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbW9udGhzW2RhdGUuZ2V0TW9udGgoKV07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgTTogZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBtb250aEFiYnJbZGF0ZS5nZXRNb250aCgpXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZDogZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYWQoZGF0ZS5nZXREYXRlKCkpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGQ6IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZS5nZXREYXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGF0ZXMsXG5cbiAgICAgICAgbGVuZ3RoID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyXG4gICAgICAgICAgICAgICAgc2VjID0gMTAwMCxcbiAgICAgICAgICAgICAgICBtaW4gPSBzZWMgKiA2MCxcbiAgICAgICAgICAgICAgICBociA9IG1pbiAqIDYwLFxuICAgICAgICAgICAgICAgIGRheSA9IGhyICogMjQsXG4gICAgICAgICAgICAgICAgd2VlayA9IGRheSAqIDc7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHNlYzogc2VjLFxuICAgICAgICAgICAgICAgIG1pbjogbWluLFxuICAgICAgICAgICAgICAgIGhyOiBocixcbiAgICAgICAgICAgICAgICBkYXk6IGRheSxcbiAgICAgICAgICAgICAgICB3ZWVrOiB3ZWVrXG4gICAgICAgICAgICB9O1xuICAgICAgICB9KCkpO1xuXG4gICAgLy8gcG9wdWxhdGUgZGF5LXJlbGF0ZWQgc3RydWN0dXJlc1xuICAgIGRheXNPZldlZWsuZm9yRWFjaChmdW5jdGlvbihkYXksIGluZGV4KSB7XG4gICAgICAgIGRheURpY3RbZGF5XSA9IGluZGV4O1xuICAgICAgICB2YXIgYWJiciA9IGRheS5zdWJzdHIoMCwgMik7XG4gICAgICAgIGRheXMucHVzaChhYmJyKTtcbiAgICAgICAgZGF5RGljdFthYmJyXSA9IGluZGV4O1xuICAgICAgICBhYmJyID0gZGF5LnN1YnN0cigwLCAzKTtcbiAgICAgICAgZGF5czMucHVzaChhYmJyKTtcbiAgICAgICAgZGF5RGljdFthYmJyXSA9IGluZGV4O1xuICAgIH0pO1xuXG4gICAgLy8gcG9wdWxhdGUgbW9udGgtcmVsYXRlZCBzdHJ1Y3R1cmVzXG4gICAgbW9udGhzLmZvckVhY2goZnVuY3Rpb24obW9udGgsIGluZGV4KSB7XG4gICAgICAgIG1vbnRoRGljdFttb250aF0gPSBpbmRleDtcbiAgICAgICAgdmFyIGFiYnIgPSBtb250aC5zdWJzdHIoMCwgMyk7XG4gICAgICAgIG1vbnRoQWJici5wdXNoKGFiYnIpO1xuICAgICAgICBtb250aERpY3RbYWJicl0gPSBpbmRleDtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGlzTGVhcFllYXIoZGF0ZU9yWWVhcikge1xuICAgICAgICB2YXIgeWVhciA9IGRhdGVPclllYXIgaW5zdGFuY2VvZiBEYXRlID8gZGF0ZU9yWWVhci5nZXRGdWxsWWVhcigpIDogZGF0ZU9yWWVhcjtcbiAgICAgICAgcmV0dXJuICEoeWVhciAlIDQwMCkgfHwgKCEoeWVhciAlIDQpICYmICEhKHllYXIgJSAxMDApKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1ZhbGlkT2JqZWN0IChkYXRlKSB7XG4gICAgICAgIHZhciBtcztcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlID09PSAnb2JqZWN0JyAmJiBkYXRlIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICAgICAgbXMgPSBkYXRlLmdldFRpbWUoKTtcbiAgICAgICAgICAgIHJldHVybiAhaXNOYU4obXMpICYmIG1zID4gMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNEYXRlVHlwZSh2YWx1ZSkge1xuICAgICAgICB2YXIgcGFydHMsIGRheSwgbW9udGgsIHllYXIsIGhvdXJzLCBtaW51dGVzLCBzZWNvbmRzLCBtcztcbiAgICAgICAgc3dpdGNoICh0eXBlb2YgdmFsdWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGlzVmFsaWRPYmplY3QodmFsdWUpO1xuICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICAvLyBpcyBpdCBhIGRhdGUgaW4gVVMgZm9ybWF0P1xuICAgICAgICAgICAgICAgIHBhcnRzID0gZGF0ZVJlZ0V4cC5leGVjKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAocGFydHMgJiYgcGFydHNbMl0gPT09IHBhcnRzWzRdKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vbnRoID0gK3BhcnRzWzFdO1xuICAgICAgICAgICAgICAgICAgICBkYXkgPSArcGFydHNbM107XG4gICAgICAgICAgICAgICAgICAgIHllYXIgPSArcGFydHNbNV07XG4gICAgICAgICAgICAgICAgICAgIC8vIHJvdWdoIGNoZWNrIG9mIGEgeWVhclxuICAgICAgICAgICAgICAgICAgICBpZiAoMCA8IHllYXIgJiYgeWVhciA8IDIxMDAgJiYgMSA8PSBtb250aCAmJiBtb250aCA8PSAxMiAmJiAxIDw9IGRheSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgZGF5IDw9IChtb250aCA9PT0gMiAmJiBpc0xlYXBZZWFyKHllYXIpID8gMjkgOiBtb250aExlbmd0aHNbbW9udGggLSAxXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGlzIGl0IGEgdGltZXN0YW1wIGluIGEgc3RhbmRhcmQgZm9ybWF0P1xuICAgICAgICAgICAgICAgIHBhcnRzID0gdHNSZWdFeHAuZXhlYyh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHllYXIgPSArcGFydHNbMV07XG4gICAgICAgICAgICAgICAgICAgIG1vbnRoID0gK3BhcnRzWzJdO1xuICAgICAgICAgICAgICAgICAgICBkYXkgPSArcGFydHNbM107XG4gICAgICAgICAgICAgICAgICAgIGhvdXJzID0gK3BhcnRzWzRdO1xuICAgICAgICAgICAgICAgICAgICBtaW51dGVzID0gK3BhcnRzWzVdO1xuICAgICAgICAgICAgICAgICAgICBzZWNvbmRzID0gK3BhcnRzWzZdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoMCA8IHllYXIgJiYgeWVhciA8IDIxMDAgJiYgMSA8PSBtb250aCAmJiBtb250aCA8PSAxMiAmJiAxIDw9IGRheSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgZGF5IDw9IChtb250aCA9PT0gMiAmJiBpc0xlYXBZZWFyKHllYXIpID8gMjkgOiBtb250aExlbmd0aHNbbW9udGggLSAxXSkgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvdXJzIDwgMjQgJiYgbWludXRlcyA8IDYwICYmIHNlY29uZHMgPCA2MCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBpbnRlbnRpb25hbCBmYWxsLWRvd25cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFkKG51bSkge1xuICAgICAgICByZXR1cm4gKG51bSA8IDEwID8gJzAnIDogJycpICsgbnVtO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1vbnRoKGRhdGVPckluZGV4KSB7XG4gICAgICAgIHJldHVybiB0eXBlb2YgZGF0ZU9ySW5kZXggPT09ICdudW1iZXInID8gZGF0ZU9ySW5kZXggOiBkYXRlT3JJbmRleC5nZXRNb250aCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1vbnRoSW5kZXgobmFtZSkge1xuICAgICAgICAvLyBUT0RPOiBkbyB3ZSByZWFsbHkgd2FudCBhIDAtYmFzZWQgaW5kZXg/IG9yIHNob3VsZCBpdCBiZSBhIDEtYmFzZWQgb25lP1xuICAgICAgICB2YXIgaW5kZXggPSBtb250aERpY3RbbmFtZV07XG4gICAgICAgIHJldHVybiB0eXBlb2YgaW5kZXggPT09ICdudW1iZXInID8gaW5kZXggOiB2b2lkIDA7XG4gICAgICAgIC8vIFRPRE86IHdlIHJldHVybiB1bmRlZmluZWQgZm9yIHdyb25nIG1vbnRoIG5hbWVzIC0tLSBpcyBpdCByaWdodD9cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNb250aE5hbWUoZGF0ZSkge1xuICAgICAgICByZXR1cm4gbW9udGhzW2dldE1vbnRoKGRhdGUpXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRGaXJzdFN1bmRheShkYXRlKSB7XG4gICAgICAgIC8vIFRPRE86IHdoYXQgZG9lcyBpdCByZXR1cm4/IGEgbmVnYXRpdmUgaW5kZXggcmVsYXRlZCB0byB0aGUgMXN0IG9mIHRoZSBtb250aD9cbiAgICAgICAgdmFyIGQgPSBuZXcgRGF0ZShkYXRlLmdldFRpbWUoKSk7XG4gICAgICAgIGQuc2V0RGF0ZSgxKTtcbiAgICAgICAgcmV0dXJuIC1kLmdldERheSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldERheXNJblByZXZNb250aChkYXRlKSB7XG4gICAgICAgIHZhciBkID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgIGQuc2V0TW9udGgoZC5nZXRNb250aCgpIC0gMSk7XG4gICAgICAgIHJldHVybiBnZXREYXlzSW5Nb250aChkKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXREYXlzSW5Nb250aChkYXRlKSB7XG4gICAgICAgIHZhciBtb250aCA9IGRhdGUuZ2V0TW9udGgoKTtcbiAgICAgICAgcmV0dXJuIG1vbnRoID09PSAxICYmIGlzTGVhcFllYXIoZGF0ZSkgPyAyOSA6IG1vbnRoTGVuZ3Roc1ttb250aF07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3RyVG9EYXRlKHN0cikge1xuICAgICAgICBpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGVzLnRpbWVzdGFtcC5pcyhzdHIpKSB7XG4gICAgICAgICAgICAvLyAyMDAwLTAyLTI5VDAwOjAwOjAwXG4gICAgICAgICAgICByZXR1cm4gZGF0ZXMudGltZXN0YW1wLmZyb20oc3RyKTtcbiAgICAgICAgfVxuICAgICAgICAvLyAxMS8yMC8yMDAwXG4gICAgICAgIHZhciBwYXJ0cyA9IGRhdGVSZWdFeHAuZXhlYyhzdHIpO1xuICAgICAgICBpZiAocGFydHMgJiYgcGFydHNbMl0gPT09IHBhcnRzWzRdKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoK3BhcnRzWzVdLCArcGFydHNbMV0gLSAxLCArcGFydHNbM10pO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE86IHdoYXQgdG8gcmV0dXJuIGZvciBhbiBpbnZhbGlkIGRhdGU/IG51bGw/XG4gICAgICAgIHJldHVybiBuZXcgRGF0ZSgtMSk7IC8vIGludmFsaWQgZGF0ZVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZvcm1hdERhdGVQYXR0ZXJuKGRhdGUsIHBhdHRlcm4pIHtcbiAgICAgICAgLy8gJ00gZCwgeXl5eScgRGVjIDUsIDIwMTVcbiAgICAgICAgLy8gJ01NIGRkIHl5JyBEZWNlbWJlciAwNSAxNVxuICAgICAgICAvLyAnbS1kLXl5JyAxLTEtMTVcbiAgICAgICAgLy8gJ21tLWRkLXl5eXknIDAxLTAxLTIwMTVcbiAgICAgICAgLy8gJ20vZC95eScgMTIvMjUvMTVcblxuICAgICAgICByZXR1cm4gcGF0dGVybi5yZXBsYWNlKGRhdGVQYXR0ZXJuLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0ZVBhdHRlcm5MaWJyYXJ5W25hbWVdKGRhdGUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmb3JtYXREYXRlKGRhdGUsIGRlbGltaXRlck9yUGF0dGVybikge1xuICAgICAgICBpZiAoZGVsaW1pdGVyT3JQYXR0ZXJuICYmIGRlbGltaXRlck9yUGF0dGVybi5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0RGF0ZVBhdHRlcm4oZGF0ZSwgZGVsaW1pdGVyT3JQYXR0ZXJuKTtcbiAgICAgICAgfVxuICAgICAgICB2YXJcbiAgICAgICAgICAgIGRlbCA9IGRlbGltaXRlck9yUGF0dGVybiB8fCAnLycsXG4gICAgICAgICAgICB5ID0gZGF0ZS5nZXRGdWxsWWVhcigpLFxuICAgICAgICAgICAgbSA9IGRhdGUuZ2V0TW9udGgoKSArIDEsXG4gICAgICAgICAgICBkID0gZGF0ZS5nZXREYXRlKCk7XG5cbiAgICAgICAgcmV0dXJuIFtwYWQobSksIHBhZChkKSwgeV0uam9pbihkZWwpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRhdGVUb1N0cihkYXRlLCBkZWxpbWl0ZXIpIHtcbiAgICAgICAgcmV0dXJuIGZvcm1hdERhdGUoZGF0ZSwgZGVsaW1pdGVyKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmb3JtYXRUaW1lKGRhdGUsIHVzZVBlcmlvZCkge1xuICAgICAgICBpZiAodHlwZW9mIGRhdGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBkYXRlID0gc3RyVG9EYXRlKGRhdGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyXG4gICAgICAgICAgICBwZXJpb2QgPSAnQU0nLFxuICAgICAgICAgICAgaG91cnMgPSBkYXRlLmdldEhvdXJzKCksXG4gICAgICAgICAgICBtaW51dGVzID0gZGF0ZS5nZXRNaW51dGVzKCksXG4gICAgICAgICAgICByZXR2YWwsXG4gICAgICAgICAgICBzZWNvbmRzID0gZGF0ZS5nZXRTZWNvbmRzKCk7XG5cbiAgICAgICAgaWYgKGhvdXJzID4gMTEpIHtcbiAgICAgICAgICAgIGhvdXJzIC09IDEyO1xuICAgICAgICAgICAgcGVyaW9kID0gJ1BNJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaG91cnMgPT09IDApIHtcbiAgICAgICAgICAgIGhvdXJzID0gMTI7XG4gICAgICAgIH1cblxuICAgICAgICByZXR2YWwgPSBob3VycyArICc6JyArIHBhZChtaW51dGVzKSArICc6JyArIHBhZChzZWNvbmRzKTtcblxuICAgICAgICBpZiAodXNlUGVyaW9kID09IHRydWUpIHtcbiAgICAgICAgICAgIHJldHZhbCA9IHJldHZhbCArICcgJyArIHBlcmlvZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVyaW9kKGRhdGUpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZGF0ZSA9IHN0clRvRGF0ZShkYXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBob3VycyA9IGRhdGUuZ2V0SG91cnMoKTtcblxuICAgICAgICByZXR1cm4gaG91cnMgPiAxMSA/ICdQTScgOiAnQU0nO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRvSVNPKGRhdGUsIGluY2x1ZGVUWikge1xuICAgICAgICB2YXJcbiAgICAgICAgICAgIHN0cixcbiAgICAgICAgICAgIG5vdyA9IG5ldyBEYXRlKCksXG4gICAgICAgICAgICB0aGVuID0gbmV3IERhdGUoZGF0ZS5nZXRUaW1lKCkpO1xuICAgICAgICB0aGVuLnNldEhvdXJzKG5vdy5nZXRIb3VycygpKTtcbiAgICAgICAgc3RyID0gdGhlbi50b0lTT1N0cmluZygpO1xuICAgICAgICBpZiAoIWluY2x1ZGVUWikge1xuICAgICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCcuJylbMF07XG4gICAgICAgICAgICBzdHIgKz0gJy4wMFonO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbmF0dXJhbChkYXRlKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZGF0ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGRhdGUgPSB0aGlzLmZyb20oZGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXJcbiAgICAgICAgICAgIHllYXIgPSBkYXRlLmdldEZ1bGxZZWFyKCkudG9TdHJpbmcoKS5zdWJzdHIoMiksXG4gICAgICAgICAgICBtb250aCA9IGRhdGUuZ2V0TW9udGgoKSArIDEsXG4gICAgICAgICAgICBkYXkgPSBkYXRlLmdldERhdGUoKSxcbiAgICAgICAgICAgIGhvdXJzID0gZGF0ZS5nZXRIb3VycygpLFxuICAgICAgICAgICAgbWludXRlcyA9IGRhdGUuZ2V0TWludXRlcygpLFxuICAgICAgICAgICAgcGVyaW9kID0gJ0FNJztcblxuICAgICAgICBpZiAoaG91cnMgPiAxMSkge1xuICAgICAgICAgICAgaG91cnMgLT0gMTI7XG4gICAgICAgICAgICBwZXJpb2QgPSAnUE0nO1xuICAgICAgICB9XG4gICAgICAgIGlmIChob3VycyA9PT0gMCkge1xuICAgICAgICAgICAgaG91cnMgPSAxMjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBob3VycyArICc6JyArIHBhZChtaW51dGVzKSArICcgJyArIHBlcmlvZCArICcgb24gJyArIHBhZChtb250aCkgKyAnLycgKyBwYWQoZGF5KSArICcvJyArIHllYXI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkRGF5cyAoZGF0ZSwgZGF5cykge1xuICAgICAgICBjb25zb2xlLndhcm4oJ2FkZERheXMgaXMgZGVwcmVjYXRlZC4gSW5zdGVhZCwgdXNlIGBhZGRgJyk7XG4gICAgICAgIHJldHVybiBhZGQoZGF0ZSwgZGF5cyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkIChkYXRlLCBhbW91bnQsIGRhdGVUeXBlKSB7XG4gICAgICAgIHJldHVybiBzdWJ0cmFjdChkYXRlLCAtYW1vdW50LCBkYXRlVHlwZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3VidHJhY3QoZGF0ZSwgYW1vdW50LCBkYXRlVHlwZSkge1xuICAgICAgICAvLyBzdWJ0cmFjdCBOIGRheXMgZnJvbSBkYXRlXG4gICAgICAgIHZhclxuICAgICAgICAgICAgdGltZSA9IGRhdGUuZ2V0VGltZSgpLFxuICAgICAgICAgICAgdG1wID0gbmV3IERhdGUodGltZSk7XG5cbiAgICAgICAgaWYoZGF0ZVR5cGUgPT09ICdtb250aCcpe1xuICAgICAgICAgICAgdG1wLnNldE1vbnRoKHRtcC5nZXRNb250aCgpIC0gYW1vdW50KTtcbiAgICAgICAgICAgIHJldHVybiB0bXA7XG4gICAgICAgIH1cbiAgICAgICAgaWYoZGF0ZVR5cGUgPT09ICd5ZWFyJyl7XG4gICAgICAgICAgICB0bXAuc2V0RnVsbFllYXIodG1wLmdldEZ1bGxZZWFyKCkgLSBhbW91bnQpO1xuICAgICAgICAgICAgcmV0dXJuIHRtcDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXcgRGF0ZSh0aW1lIC0gbGVuZ3RoLmRheSAqIGFtb3VudCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3VidHJhY3REYXRlKGRhdGUxLCBkYXRlMiwgZGF0ZVR5cGUpIHtcbiAgICAgICAgLy8gZGF0ZVR5cGU6IHdlZWssIGRheSwgaHIsIG1pbiwgc2VjXG4gICAgICAgIC8vIHBhc3QgZGF0ZXMgaGF2ZSBhIHBvc2l0aXZlIHZhbHVlXG4gICAgICAgIC8vIGZ1dHVyZSBkYXRlcyBoYXZlIGEgbmVnYXRpdmUgdmFsdWVcblxuICAgICAgICB2YXIgZGl2aWRlQnkgPSB7XG4gICAgICAgICAgICAgICAgd2VlazogbGVuZ3RoLndlZWssXG4gICAgICAgICAgICAgICAgZGF5OiBsZW5ndGguZGF5LFxuICAgICAgICAgICAgICAgIGhyOiBsZW5ndGguaHIsXG4gICAgICAgICAgICAgICAgbWluOiBsZW5ndGgubWluLFxuICAgICAgICAgICAgICAgIHNlYzogbGVuZ3RoLnNlY1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHV0YzEgPSBEYXRlLlVUQyhkYXRlMS5nZXRGdWxsWWVhcigpLCBkYXRlMS5nZXRNb250aCgpLCBkYXRlMS5nZXREYXRlKCkpLFxuICAgICAgICAgICAgdXRjMiA9IERhdGUuVVRDKGRhdGUyLmdldEZ1bGxZZWFyKCksIGRhdGUyLmdldE1vbnRoKCksIGRhdGUyLmdldERhdGUoKSk7XG5cbiAgICAgICAgZGF0ZVR5cGUgPSBkYXRlVHlwZS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKCh1dGMyIC0gdXRjMSkgLyBkaXZpZGVCeVtkYXRlVHlwZV0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzTGVzcyAoZDEsIGQyKSB7XG4gICAgICAgIGlmKGlzVmFsaWRPYmplY3QoZDEpICYmIGlzVmFsaWRPYmplY3QoZDIpKXtcbiAgICAgICAgICAgIHJldHVybiBkMS5nZXRUaW1lKCkgPCBkMi5nZXRUaW1lKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzR3JlYXRlciAoZDEsIGQyKSB7XG4gICAgICAgIGlmKGlzVmFsaWRPYmplY3QoZDEpICYmIGlzVmFsaWRPYmplY3QoZDIpKXtcbiAgICAgICAgICAgIHJldHVybiBkMS5nZXRUaW1lKCkgPiBkMi5nZXRUaW1lKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpZmYoZGF0ZTEsIGRhdGUyKSB7XG4gICAgICAgIC8vIHJldHVybiB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIDIgZGF0ZXMgaW4gZGF5c1xuICAgICAgICB2YXIgdXRjMSA9IERhdGUuVVRDKGRhdGUxLmdldEZ1bGxZZWFyKCksIGRhdGUxLmdldE1vbnRoKCksIGRhdGUxLmdldERhdGUoKSksXG4gICAgICAgICAgICB1dGMyID0gRGF0ZS5VVEMoZGF0ZTIuZ2V0RnVsbFllYXIoKSwgZGF0ZTIuZ2V0TW9udGgoKSwgZGF0ZTIuZ2V0RGF0ZSgpKTtcblxuICAgICAgICByZXR1cm4gTWF0aC5hYnMoTWF0aC5mbG9vcigodXRjMiAtIHV0YzEpIC8gbGVuZ3RoLmRheSkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvcHkgKGRhdGUpIHtcbiAgICAgICAgaWYoaXNWYWxpZE9iamVjdChkYXRlKSl7XG4gICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoZGF0ZS5nZXRUaW1lKCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE5hdHVyYWxEYXkoZGF0ZSwgY29tcGFyZURhdGUsIG5vRGF5c09mV2Vlaykge1xuXG4gICAgICAgIHZhclxuICAgICAgICAgICAgdG9kYXkgPSBjb21wYXJlRGF0ZSB8fCBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgZGF5c0FnbyA9IHN1YnRyYWN0RGF0ZShkYXRlLCB0b2RheSwgJ2RheScpO1xuXG4gICAgICAgIGlmICghZGF5c0Fnbykge1xuICAgICAgICAgICAgcmV0dXJuICdUb2RheSc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRheXNBZ28gPT09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiAnWWVzdGVyZGF5JztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkYXlzQWdvID09PSAtMSkge1xuICAgICAgICAgICAgcmV0dXJuICdUb21vcnJvdyc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGF5c0FnbyA8IC0xKSB7XG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0RGF0ZShkYXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAhbm9EYXlzT2ZXZWVrICYmIGRheXNBZ28gPCBkYXlzT2ZXZWVrLmxlbmd0aCA/IGRheXNPZldlZWtbZGF0ZS5nZXREYXkoKV0gOiBmb3JtYXREYXRlKGRhdGUpO1xuICAgIH1cblxuICAgIGRhdGVzID0ge1xuICAgICAgICBtb250aHM6IHtcbiAgICAgICAgICAgIGZ1bGw6IG1vbnRocyxcbiAgICAgICAgICAgIGFiYnI6IG1vbnRoQWJicixcbiAgICAgICAgICAgIGRpY3Q6IG1vbnRoRGljdFxuICAgICAgICB9LFxuICAgICAgICBkYXlzOiB7XG4gICAgICAgICAgICBmdWxsOiBkYXlzT2ZXZWVrLFxuICAgICAgICAgICAgYWJicjogZGF5cyxcbiAgICAgICAgICAgIGFiYnIzOiBkYXlzMyxcbiAgICAgICAgICAgIGRpY3Q6IGRheURpY3RcbiAgICAgICAgfSxcbiAgICAgICAgbGVuZ3RoOiBsZW5ndGgsXG4gICAgICAgIHN1YnRyYWN0OiBzdWJ0cmFjdCxcbiAgICAgICAgYWRkOiBhZGQsXG4gICAgICAgIGFkZERheXM6IGFkZERheXMsXG4gICAgICAgIGRpZmY6IGRpZmYsXG4gICAgICAgIGNvcHk6IGNvcHksXG4gICAgICAgIGNsb25lOiBjb3B5LFxuICAgICAgICBpc0xlc3M6IGlzTGVzcyxcbiAgICAgICAgaXNHcmVhdGVyOiBpc0dyZWF0ZXIsXG4gICAgICAgIHRvSVNPOiB0b0lTTyxcbiAgICAgICAgaXNWYWxpZE9iamVjdDogaXNWYWxpZE9iamVjdCxcbiAgICAgICAgaXNWYWxpZDogaXNEYXRlVHlwZSxcbiAgICAgICAgaXNEYXRlVHlwZTogaXNEYXRlVHlwZSxcbiAgICAgICAgaXNMZWFwWWVhcjogaXNMZWFwWWVhcixcbiAgICAgICAgZ2V0TW9udGhJbmRleDogZ2V0TW9udGhJbmRleCxcbiAgICAgICAgZ2V0TW9udGhOYW1lOiBnZXRNb250aE5hbWUsXG4gICAgICAgIGdldEZpcnN0U3VuZGF5OiBnZXRGaXJzdFN1bmRheSxcbiAgICAgICAgZ2V0RGF5c0luTW9udGg6IGdldERheXNJbk1vbnRoLFxuICAgICAgICBnZXREYXlzSW5QcmV2TW9udGg6IGdldERheXNJblByZXZNb250aCxcbiAgICAgICAgZm9ybWF0RGF0ZTogZm9ybWF0RGF0ZSxcbiAgICAgICAgZm9ybWF0VGltZTogZm9ybWF0VGltZSxcbiAgICAgICAgc3RyVG9EYXRlOiBzdHJUb0RhdGUsXG4gICAgICAgIHN1YnRyYWN0RGF0ZTogc3VidHJhY3REYXRlLFxuICAgICAgICBkYXRlVG9TdHI6IGRhdGVUb1N0cixcbiAgICAgICAgcGVyaW9kOiBwZXJpb2QsXG4gICAgICAgIG5hdHVyYWw6IG5hdHVyYWwsXG4gICAgICAgIGdldE5hdHVyYWxEYXk6IGdldE5hdHVyYWxEYXksXG4gICAgICAgIHBhZDogcGFkLFxuICAgICAgICB0aW1lc3RhbXA6IHtcbiAgICAgICAgICAgIHRvOiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGUuZ2V0RnVsbFllYXIoKSArICctJyArIHBhZChkYXRlLmdldE1vbnRoKCkgKyAxKSArICctJyArIHBhZChkYXRlLmdldERhdGUoKSkgKyAnVCcgK1xuICAgICAgICAgICAgICAgICAgICBwYWQoZGF0ZS5nZXRIb3VycygpKSArICc6JyArIHBhZChkYXRlLmdldE1pbnV0ZXMoKSkgKyAnOicgKyBwYWQoZGF0ZS5nZXRTZWNvbmRzKCkpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZyb206IGZ1bmN0aW9uKHN0cikge1xuICAgICAgICAgICAgICAgIC8vIDIwMTUtMDUtMjZUMDA6MDA6MDBcblxuICAgICAgICAgICAgICAgIC8vIHN0cmlwIHRpbWV6b25lIC8vIDIwMTUtMDUtMjZUMDA6MDA6MDBaXG4gICAgICAgICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdaJylbMF07XG5cbiAgICAgICAgICAgICAgICAvLyBbXCIyMDAwLTAyLTMwVDAwOjAwOjAwXCIsIFwiMjAwMFwiLCBcIjAyXCIsIFwiMzBcIiwgXCIwMFwiLCBcIjAwXCIsIFwiMDBcIiwgaW5kZXg6IDAsIGlucHV0OiBcIjIwMDAtMDItMzBUMDA6MDA6MDBcIl1cbiAgICAgICAgICAgICAgICB2YXIgcGFydHMgPSB0c1JlZ0V4cC5leGVjKHN0cik7XG4gICAgICAgICAgICAgICAgLy8gVE9ETzogZG8gd2UgbmVlZCBhIHZhbGlkYXRpb24/XG4gICAgICAgICAgICAgICAgaWYgKHBhcnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG5ldyBEYXRlKDE5OTUsIDExLCAxNywgMywgMjQsIDApO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoK3BhcnRzWzFdLCArcGFydHNbMl0gLSAxLCArcGFydHNbM10sICtwYXJ0c1s0XSwgK3BhcnRzWzVdLCBwYXJzZUludChwYXJ0c1s2XSwgMTApKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gVE9ETzogd2hhdCBkbyB3ZSByZXR1cm4gZm9yIGFuIGludmFsaWQgZGF0ZT8gbnVsbD9cbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoLTEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlzOiBmdW5jdGlvbihzdHIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHNSZWdFeHAudGVzdChzdHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBkYXRlcztcblxufSkpOyIsInJlcXVpcmUoJ0Jhc2VDb21wb25lbnQvc3JjL3Byb3BlcnRpZXMnKTtcbnJlcXVpcmUoJ0Jhc2VDb21wb25lbnQvc3JjL3RlbXBsYXRlJyk7XG5yZXF1aXJlKCdCYXNlQ29tcG9uZW50L3NyYy9yZWZzJyk7XG5jb25zdCBCYXNlQ29tcG9uZW50ID0gcmVxdWlyZSgnQmFzZUNvbXBvbmVudCcpO1xuY29uc3QgZGF0ZXMgPSByZXF1aXJlKCdkYXRlcycpO1xuXG5jb25zdCBwcm9wcyA9IFsnbGFiZWwnLCAnbmFtZSddO1xuXG4vLyByYW5nZS1sZWZ0L3JhbmdlLXJpZ2h0IG1lYW4gdGhhdCB0aGlzIGlzIG9uZSBzaWRlIG9mIGEgZGF0ZS1yYW5nZS1waWNrZXJcbmNvbnN0IGJvb2xzID0gWydyYW5nZS1waWNrZXInLCAncmFuZ2UtbGVmdCcsICdyYW5nZS1yaWdodCddO1xuXG5jbGFzcyBEYXRlUGlja2VyIGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG5cblx0c3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMgKCkge1xuXHRcdHJldHVybiBbLi4ucHJvcHMsIC4uLmJvb2xzXTtcblx0fVxuXG5cdGdldCBwcm9wcyAoKSB7XG5cdFx0cmV0dXJuIHByb3BzO1xuXHR9XG5cblx0Z2V0IGJvb2xzICgpIHtcblx0XHRyZXR1cm4gYm9vbHM7XG5cdH1cblxuXHRnZXQgdGVtcGxhdGVTdHJpbmcgKCkge1xuXHRcdHJldHVybiBgXG48ZGl2IGNsYXNzPVwiY2FsZW5kYXJcIiByZWY9XCJjYWxOb2RlXCI+XG48ZGl2IGNsYXNzPVwiY2FsLWhlYWRlclwiIHJlZj1cImhlYWRlck5vZGVcIj5cblx0PHNwYW4gY2xhc3M9XCJjYWwtbGZ0XCIgcmVmPVwibGZ0Tm9kZVwiPjwvc3Bhbj5cblx0PHNwYW4gY2xhc3M9XCJjYWwtbW9udGhcIiByZWY9XCJtb250aE5vZGVcIj48L3NwYW4+XG5cdDxzcGFuIGNsYXNzPVwiY2FsLXJndFwiIHJlZj1cInJndE5vZGVcIj48L3NwYW4+XG48L2Rpdj5cbjxkaXYgY2xhc3M9XCJjYWwtY29udGFpbmVyXCIgcmVmPVwiY29udGFpbmVyXCI+PC9kaXY+XG48ZGl2IGNsYXNzPVwiY2FsLWZvb3RlclwiPlxuXHQ8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApO1wiIHJlZj1cImZvb3RlckxpbmtcIj48L2E+XG48L2Rpdj5cbjwvZGl2PmA7XG5cdH1cblxuXHRzZXQgdmFsdWUgKHZhbHVlKSB7XG5cdFx0Ly8gbWlnaHQgbmVlZCBhdHRyaWJ1dGVDaGFuZ2VkXG5cdFx0dGhpcy52YWx1ZURhdGUgPSBkYXRlcy5pc0RhdGVUeXBlKHZhbHVlKSA/IGRhdGVzLnN0clRvRGF0ZSh2YWx1ZSkgOiB0b2RheTtcblx0XHR0aGlzLmN1cnJlbnQgPSB0aGlzLnZhbHVlRGF0ZTtcblx0XHRvbkRvbVJlYWR5KHRoaXMsICgpID0+IHtcblx0XHRcdHRoaXMucmVuZGVyKCk7XG5cdFx0fSk7XG5cdH1cblxuXHRnZXQgdmFsdWUgKCkge1xuXHRcdGlmICghdGhpcy52YWx1ZURhdGUpIHtcblx0XHRcdGNvbnN0IHZhbHVlID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJykgfHwgdG9kYXk7XG5cdFx0XHR0aGlzLnZhbHVlRGF0ZSA9IGRhdGVzLnN0clRvRGF0ZSh2YWx1ZSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLnZhbHVlRGF0ZTtcblx0fVxuXG5cdGNvbnN0cnVjdG9yICgpIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMucHJldmlvdXMgPSB7fTtcblx0XHR0aGlzLm1vZGVzID0gWydtb250aCcsICd5ZWFyJywgJ2RlY2FkZSddO1xuXHRcdHRoaXMubW9kZSA9IDA7XG5cdH1cblxuXHRzZXREaXNwbGF5ICguLi5hcmdzLyp5ZWFyLCBtb250aCovKSB7XG5cdFx0aWYgKGFyZ3MubGVuZ3RoID09PSAyKSB7XG5cdFx0XHR0aGlzLmN1cnJlbnQuc2V0RnVsbFllYXIoYXJnc1swXSk7XG5cdFx0XHR0aGlzLmN1cnJlbnQuc2V0TW9udGgoYXJnc1sxXSk7XG5cdFx0fSBlbHNlIGlmICh0eXBlb2YgYXJnc1swXSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdHRoaXMuY3VycmVudC5zZXRGdWxsWWVhcihhcmdzWzBdLmdldEZ1bGxZZWFyKCkpO1xuXHRcdFx0dGhpcy5jdXJyZW50LnNldE1vbnRoKGFyZ3NbMF0uZ2V0TW9udGgoKSk7XG5cdFx0fSBlbHNlIGlmIChhcmdzWzBdID4gMTIpIHtcblx0XHRcdHRoaXMuY3VycmVudC5zZXRGdWxsWWVhcihhcmdzWzBdKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5jdXJyZW50LnNldE1vbnRoKGFyZ3NbMF0pO1xuXHRcdH1cblx0XHR0aGlzLm5vRXZlbnRzID0gdHJ1ZTtcblx0XHR0aGlzLnJlbmRlcigpO1xuXHR9XG5cblx0Z2V0Rm9ybWF0dGVkVmFsdWUgKCkge1xuXHRcdHJldHVybiB0aGlzLnZhbHVlRGF0ZSA9PT0gdG9kYXkgPyAnJyA6ICEhdGhpcy52YWx1ZURhdGUgPyBkYXRlcy5kYXRlVG9TdHIodGhpcy52YWx1ZURhdGUpIDogJyc7XG5cdH1cblxuXHRlbWl0VmFsdWUgKCkge1xuXHRcdC8vIFRPRE8gb3B0aW9ucyBmb3IgdGltZXN0YW1wIG9yIG90aGVyIGZvcm1hdHNcblx0XHRjb25zdCBldmVudCA9IHtcblx0XHRcdHZhbHVlOiB0aGlzLmdldEZvcm1hdHRlZFZhbHVlKCksXG5cdFx0XHRkYXRlOiB0aGlzLnZhbHVlRGF0ZVxuXHRcdH07XG5cdFx0aWYgKHRoaXNbJ3JhbmdlLXBpY2tlciddKSB7XG5cdFx0XHRldmVudC5maXJzdCA9IHRoaXMuZmlyc3RSYW5nZTtcblx0XHRcdGV2ZW50LnNlY29uZCA9IHRoaXMuc2Vjb25kUmFuZ2U7XG5cdFx0fVxuXHRcdHRoaXMuZW1pdCgnY2hhbmdlJywgZXZlbnQpO1xuXHR9XG5cblx0ZW1pdERpc3BsYXlFdmVudHMgKCkge1xuXHRcdGNvbnN0IG1vbnRoID0gdGhpcy5jdXJyZW50LmdldE1vbnRoKCksXG5cdFx0XHR5ZWFyID0gdGhpcy5jdXJyZW50LmdldEZ1bGxZZWFyKCk7XG5cblx0XHRpZiAoIXRoaXMubm9FdmVudHMgJiYgKG1vbnRoICE9PSB0aGlzLnByZXZpb3VzLm1vbnRoIHx8IHllYXIgIT09IHRoaXMucHJldmlvdXMueWVhcikpIHtcblx0XHRcdHRoaXMuZmlyZSgnZGlzcGxheS1jaGFuZ2UnLCB7IG1vbnRoOiBtb250aCwgeWVhcjogeWVhciB9KTtcblx0XHR9XG5cblx0XHR0aGlzLm5vRXZlbnRzID0gZmFsc2U7XG5cdFx0dGhpcy5wcmV2aW91cyA9IHtcblx0XHRcdG1vbnRoOiBtb250aCxcblx0XHRcdHllYXI6IHllYXJcblx0XHR9O1xuXHR9XG5cblx0b25DbGlja0RheSAobm9kZSkge1xuXHRcdHZhclxuXHRcdFx0ZGF5ID0gK25vZGUuaW5uZXJIVE1MLFxuXHRcdFx0aXNGdXR1cmUgPSBub2RlLmNsYXNzTGlzdC5jb250YWlucygnZnV0dXJlJyksXG5cdFx0XHRpc1Bhc3QgPSBub2RlLmNsYXNzTGlzdC5jb250YWlucygncGFzdCcpO1xuXG5cdFx0dGhpcy5jdXJyZW50LnNldERhdGUoZGF5KTtcblx0XHRpZiAoaXNGdXR1cmUpIHtcblx0XHRcdHRoaXMuY3VycmVudC5zZXRNb250aCh0aGlzLmN1cnJlbnQuZ2V0TW9udGgoKSArIDEpO1xuXHRcdH1cblx0XHRpZiAoaXNQYXN0KSB7XG5cdFx0XHR0aGlzLmN1cnJlbnQuc2V0TW9udGgodGhpcy5jdXJyZW50LmdldE1vbnRoKCkgLSAxKTtcblx0XHR9XG5cblx0XHR0aGlzLnZhbHVlRGF0ZSA9IGNvcHkodGhpcy5jdXJyZW50KTtcblxuXHRcdHRoaXMuZW1pdFZhbHVlKCk7XG5cblx0XHRpZiAodGhpc1sncmFuZ2UtcGlja2VyJ10pIHtcblx0XHRcdHRoaXMuY2xpY2tTZWxlY3RSYW5nZSgpO1xuXHRcdH1cblxuXHRcdGlmIChpc0Z1dHVyZSB8fCBpc1Bhc3QpIHtcblx0XHRcdHRoaXMucmVuZGVyKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuc2VsZWN0RGF5KCk7XG5cdFx0fVxuXHR9XG5cblx0b25DbGlja01vbnRoIChkaXJlY3Rpb24pIHtcblx0XHRzd2l0Y2ggKHRoaXMubW9kZSkge1xuXHRcdFx0Y2FzZSAxOiAvLyB5ZWFyIG1vZGVcblx0XHRcdFx0dGhpcy5jdXJyZW50LnNldEZ1bGxZZWFyKHRoaXMuY3VycmVudC5nZXRGdWxsWWVhcigpICsgKGRpcmVjdGlvbiAqIDEpKTtcblx0XHRcdFx0dGhpcy5zZXRNb2RlKHRoaXMubW9kZSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAyOiAvLyBjZW50dXJ5IG1vZGVcblx0XHRcdFx0dGhpcy5jdXJyZW50LnNldEZ1bGxZZWFyKHRoaXMuY3VycmVudC5nZXRGdWxsWWVhcigpICsgKGRpcmVjdGlvbiAqIDEyKSk7XG5cdFx0XHRcdHRoaXMuc2V0TW9kZSh0aGlzLm1vZGUpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHRoaXMuY3VycmVudC5zZXRNb250aCh0aGlzLmN1cnJlbnQuZ2V0TW9udGgoKSArIChkaXJlY3Rpb24gKiAxKSk7XG5cdFx0XHRcdHRoaXMucmVuZGVyKCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxuXG5cdG9uQ2xpY2tZZWFyIChub2RlKSB7XG5cdFx0dmFyIGluZGV4ID0gZGF0ZXMuZ2V0TW9udGhJbmRleChub2RlLmlubmVySFRNTCk7XG5cdFx0dGhpcy5jdXJyZW50LnNldE1vbnRoKGluZGV4KTtcblx0XHR0aGlzLnJlbmRlcigpO1xuXHR9XG5cblx0b25DbGlja0RlY2FkZSAobm9kZSkge1xuXHRcdHZhciB5ZWFyID0gK25vZGUuaW5uZXJIVE1MO1xuXHRcdHRoaXMuY3VycmVudC5zZXRGdWxsWWVhcih5ZWFyKTtcblx0XHR0aGlzLnNldE1vZGUodGhpcy5tb2RlIC0gMSk7XG5cdH1cblxuXHRzZXRNb2RlIChtb2RlKSB7XG5cdFx0ZGVzdHJveSh0aGlzLm1vZGVOb2RlKTtcblx0XHR0aGlzLm1vZGUgPSBtb2RlIHx8IDA7XG5cdFx0c3dpdGNoICh0aGlzLm1vZGVzW3RoaXMubW9kZV0pIHtcblx0XHRcdGNhc2UgJ21vbnRoJzpcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICd5ZWFyJzpcblx0XHRcdFx0dGhpcy5zZXRZZWFyTW9kZSgpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2RlY2FkZSc6XG5cdFx0XHRcdHRoaXMuc2V0RGVjYWRlTW9kZSgpO1xuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cdH1cblxuXHRzZXRZZWFyTW9kZSAoKSB7XG5cdFx0ZGVzdHJveSh0aGlzLmJvZHlOb2RlKTtcblxuXHRcdHZhclxuXHRcdFx0aSxcblx0XHRcdG5vZGUgPSBkb20oJ2RpdicsIHsgY2xhc3M6ICdjYWwtYm9keSB5ZWFyJyB9KTtcblxuXHRcdGZvciAoaSA9IDA7IGkgPCAxMjsgaSsrKSB7XG5cdFx0XHRkb20oJ2RpdicsIHsgaHRtbDogZGF0ZXMubW9udGhzLmFiYnJbaV0sIGNsYXNzOiAneWVhcicgfSwgbm9kZSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5tb250aE5vZGUuaW5uZXJIVE1MID0gdGhpcy5jdXJyZW50LmdldEZ1bGxZZWFyKCk7XG5cdFx0dGhpcy5jb250YWluZXIuYXBwZW5kQ2hpbGQobm9kZSk7XG5cdFx0dGhpcy5tb2RlTm9kZSA9IG5vZGU7XG5cdH1cblxuXHRzZXREZWNhZGVNb2RlICgpIHtcblx0XHR2YXJcblx0XHRcdGksXG5cdFx0XHRub2RlID0gZG9tKCdkaXYnLCB7IGNsYXNzOiAnY2FsLWJvZHkgZGVjYWRlJyB9KSxcblx0XHRcdHllYXIgPSB0aGlzLmN1cnJlbnQuZ2V0RnVsbFllYXIoKSAtIDY7XG5cblx0XHRmb3IgKGkgPSAwOyBpIDwgMTI7IGkrKykge1xuXHRcdFx0ZG9tKCdkaXYnLCB7IGh0bWw6IHllYXIsIGNsYXNzOiAnZGVjYWRlJyB9LCBub2RlKTtcblx0XHRcdHllYXIgKz0gMTtcblx0XHR9XG5cdFx0dGhpcy5tb250aE5vZGUuaW5uZXJIVE1MID0gKHllYXIgLSAxMikgKyAnLScgKyAoeWVhciAtIDEpO1xuXHRcdHRoaXMuY29udGFpbmVyLmFwcGVuZENoaWxkKG5vZGUpO1xuXHRcdHRoaXMubW9kZU5vZGUgPSBub2RlO1xuXHR9XG5cblx0c2VsZWN0RGF5ICgpIHtcblx0XHRpZiAodGhpc1sncmFuZ2UtcGlja2VyJ10pIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dmFyXG5cdFx0XHRub3cgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5heS1zZWxlY3RlZCcpLFxuXHRcdFx0bm9kZSA9IHRoaXMuZGF5TWFwW3RoaXMuY3VycmVudC5nZXREYXRlKCldO1xuXHRcdGlmIChub3cpIHtcblx0XHRcdG5vdy5jbGFzc0xpc3QucmVtb3ZlKCdheS1zZWxlY3RlZCcpO1xuXHRcdH1cblx0XHRub2RlLmNsYXNzTGlzdC5hZGQoJ2F5LXNlbGVjdGVkJyk7XG5cblx0fVxuXG5cdGNsZWFyUmFuZ2UgKCkge1xuXHRcdHRoaXMuaG92ZXJEYXRlID0gMDtcblx0XHR0aGlzLnNldFJhbmdlKG51bGwsIG51bGwpO1xuXHR9XG5cblx0c2V0UmFuZ2UgKGZpcnN0UmFuZ2UsIHNlY29uZFJhbmdlKSB7XG5cdFx0dGhpcy5maXJzdFJhbmdlID0gZmlyc3RSYW5nZTtcblx0XHR0aGlzLnNlY29uZFJhbmdlID0gc2Vjb25kUmFuZ2U7XG5cdFx0dGhpcy5kaXNwbGF5UmFuZ2UoKTtcblx0XHR0aGlzLnNldFJhbmdlRW5kUG9pbnRzKCk7XG5cdH1cblxuXHRjbGlja1NlbGVjdFJhbmdlICgpIHtcblx0XHR2YXJcblx0XHRcdHByZXZGaXJzdCA9ICEhdGhpcy5maXJzdFJhbmdlLFxuXHRcdFx0cHJldlNlY29uZCA9ICEhdGhpcy5zZWNvbmRSYW5nZSxcblx0XHRcdHJhbmdlRGF0ZSA9IGNvcHkodGhpcy5jdXJyZW50KTtcblxuXHRcdGlmICh0aGlzLmlzT3duZWQpIHtcblx0XHRcdHRoaXMuZmlyZSgnc2VsZWN0LXJhbmdlJywge1xuXHRcdFx0XHRmaXJzdDogdGhpcy5maXJzdFJhbmdlLFxuXHRcdFx0XHRzZWNvbmQ6IHRoaXMuc2Vjb25kUmFuZ2UsXG5cdFx0XHRcdGN1cnJlbnQ6IHJhbmdlRGF0ZVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGlmICh0aGlzLnNlY29uZFJhbmdlKSB7XG5cdFx0XHR0aGlzLmZpcmUoJ3Jlc2V0LXJhbmdlJyk7XG5cdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBudWxsO1xuXHRcdFx0dGhpcy5zZWNvbmRSYW5nZSA9IG51bGw7XG5cdFx0fVxuXHRcdGlmICh0aGlzLmZpcnN0UmFuZ2UgJiYgdGhpcy5pc1ZhbGlkUmFuZ2UocmFuZ2VEYXRlKSkge1xuXHRcdFx0dGhpcy5zZWNvbmRSYW5nZSA9IHJhbmdlRGF0ZTtcblx0XHRcdHRoaXMuaG92ZXJEYXRlID0gMDtcblx0XHRcdHRoaXMuc2V0UmFuZ2UodGhpcy5maXJzdFJhbmdlLCB0aGlzLnNlY29uZFJhbmdlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5maXJzdFJhbmdlID0gbnVsbDtcblx0XHR9XG5cdFx0aWYgKCF0aGlzLmZpcnN0UmFuZ2UpIHtcblx0XHRcdHRoaXMuaG92ZXJEYXRlID0gMDtcblx0XHRcdHRoaXMuc2V0UmFuZ2UocmFuZ2VEYXRlLCBudWxsKTtcblx0XHR9XG5cdFx0dGhpcy5maXJlKCdzZWxlY3QtcmFuZ2UnLCB7XG5cdFx0XHRmaXJzdDogdGhpcy5maXJzdFJhbmdlLFxuXHRcdFx0c2Vjb25kOiB0aGlzLnNlY29uZFJhbmdlLFxuXHRcdFx0cHJldkZpcnN0OiBwcmV2Rmlyc3QsXG5cdFx0XHRwcmV2U2Vjb25kOiBwcmV2U2Vjb25kXG5cdFx0fSk7XG5cdH1cblxuXHRob3ZlclNlbGVjdFJhbmdlIChlKSB7XG5cdFx0aWYgKHRoaXMuZmlyc3RSYW5nZSAmJiAhdGhpcy5zZWNvbmRSYW5nZSAmJiBlLnRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoJ29uJykpIHtcblx0XHRcdHRoaXMuaG92ZXJEYXRlID0gZS50YXJnZXQuX2RhdGU7XG5cdFx0XHR0aGlzLmRpc3BsYXlSYW5nZSgpO1xuXHRcdH1cblx0fVxuXG5cdGRpc3BsYXlSYW5nZVRvRW5kICgpIHtcblx0XHRpZiAodGhpcy5maXJzdFJhbmdlKSB7XG5cdFx0XHR0aGlzLmhvdmVyRGF0ZSA9IGNvcHkodGhpcy5jdXJyZW50KTtcblx0XHRcdHRoaXMuaG92ZXJEYXRlLnNldE1vbnRoKHRoaXMuaG92ZXJEYXRlLmdldE1vbnRoKCkgKyAxKTtcblx0XHRcdHRoaXMuZGlzcGxheVJhbmdlKCk7XG5cdFx0fVxuXHR9XG5cblx0ZGlzcGxheVJhbmdlICgpIHtcblx0XHR2YXJcblx0XHRcdGJlZyA9IHRoaXMuZmlyc3RSYW5nZSxcblx0XHRcdGVuZCA9IHRoaXMuc2Vjb25kUmFuZ2UgPyB0aGlzLnNlY29uZFJhbmdlLmdldFRpbWUoKSA6IHRoaXMuaG92ZXJEYXRlLFxuXHRcdFx0bWFwID0gdGhpcy5kYXlNYXA7XG5cdFx0aWYgKCFiZWcgfHwgIWVuZCkge1xuXHRcdFx0T2JqZWN0LmtleXMobWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXksIGkpIHtcblx0XHRcdFx0bWFwW2tleV0uY2xhc3NMaXN0LnJlbW92ZSgnYXktcmFuZ2UnKTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRiZWcgPSBiZWcuZ2V0VGltZSgpO1xuXHRcdFx0T2JqZWN0LmtleXMobWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXksIGkpIHtcblx0XHRcdFx0aWYgKGluUmFuZ2UobWFwW2tleV0uX2RhdGUsIGJlZywgZW5kKSkge1xuXHRcdFx0XHRcdG1hcFtrZXldLmNsYXNzTGlzdC5hZGQoJ2F5LXJhbmdlJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0bWFwW2tleV0uY2xhc3NMaXN0LnJlbW92ZSgnYXktcmFuZ2UnKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cblx0aGFzUmFuZ2UgKCkge1xuXHRcdHJldHVybiAhIXRoaXMuZmlyc3RSYW5nZSAmJiAhIXRoaXMuc2Vjb25kUmFuZ2U7XG5cdH1cblxuXHRpc1ZhbGlkUmFuZ2UgKGRhdGUpIHtcblx0XHRpZiAoIXRoaXMuZmlyc3RSYW5nZSkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdHJldHVybiBkYXRlLmdldFRpbWUoKSA+IHRoaXMuZmlyc3RSYW5nZS5nZXRUaW1lKCk7XG5cdH1cblxuXHRzZXRSYW5nZUVuZFBvaW50cyAoKSB7XG5cdFx0dGhpcy5jbGVhckVuZFBvaW50cygpO1xuXHRcdGlmICh0aGlzLmZpcnN0UmFuZ2UpIHtcblx0XHRcdGlmICh0aGlzLmZpcnN0UmFuZ2UuZ2V0TW9udGgoKSA9PT0gdGhpcy5jdXJyZW50LmdldE1vbnRoKCkpIHtcblx0XHRcdFx0dGhpcy5kYXlNYXBbdGhpcy5maXJzdFJhbmdlLmdldERhdGUoKV0uY2xhc3NMaXN0LmFkZCgnYXktcmFuZ2UtZmlyc3QnKTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLnNlY29uZFJhbmdlICYmIHRoaXMuc2Vjb25kUmFuZ2UuZ2V0TW9udGgoKSA9PT0gdGhpcy5jdXJyZW50LmdldE1vbnRoKCkpIHtcblx0XHRcdFx0dGhpcy5kYXlNYXBbdGhpcy5zZWNvbmRSYW5nZS5nZXREYXRlKCldLmNsYXNzTGlzdC5hZGQoJ2F5LXJhbmdlLXNlY29uZCcpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGNsZWFyRW5kUG9pbnRzICgpIHtcblx0XHR2YXIgZmlyc3QgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5heS1yYW5nZS1maXJzdCcpLFxuXHRcdFx0c2Vjb25kID0gdGhpcy5xdWVyeVNlbGVjdG9yKCcuYXktcmFuZ2Utc2Vjb25kJyk7XG5cdFx0aWYgKGZpcnN0KSB7XG5cdFx0XHRmaXJzdC5jbGFzc0xpc3QucmVtb3ZlKCdheS1yYW5nZS1maXJzdCcpO1xuXHRcdH1cblx0XHRpZiAoc2Vjb25kKSB7XG5cdFx0XHRzZWNvbmQuY2xhc3NMaXN0LnJlbW92ZSgnYXktcmFuZ2Utc2Vjb25kJyk7XG5cdFx0fVxuXHR9XG5cblx0ZG9tUmVhZHkgKCkge1xuXHRcdGlmICh0aGlzWydyYW5nZS1sZWZ0J10pIHtcblx0XHRcdHRoaXMucmd0Tm9kZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuXHRcdFx0dGhpc1sncmFuZ2UtcGlja2VyJ10gPSB0cnVlO1xuXHRcdFx0dGhpcy5pc093bmVkID0gdHJ1ZTtcblx0XHR9XG5cdFx0aWYgKHRoaXNbJ3JhbmdlLXJpZ2h0J10pIHtcblx0XHRcdHRoaXMubGZ0Tm9kZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuXHRcdFx0dGhpc1sncmFuZ2UtcGlja2VyJ10gPSB0cnVlO1xuXHRcdFx0dGhpcy5pc093bmVkID0gdHJ1ZTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuaXNPd25lZCkge1xuXHRcdFx0dGhpcy5jbGFzc0xpc3QuYWRkKCdtaW5pbWFsJyk7XG5cdFx0fVxuXG5cdFx0dGhpcy5jdXJyZW50ID0gY29weSh0aGlzLnZhbHVlKTtcblxuXHRcdHRoaXMuY29ubmVjdCgpO1xuXHRcdHRoaXMucmVuZGVyKCk7XG5cdH1cblxuXHRyZW5kZXIgKCkge1xuXHRcdC8vIGRhdGVOdW0gaW5jcmVtZW50cywgc3RhcnRpbmcgd2l0aCB0aGUgZmlyc3QgU3VuZGF5XG5cdFx0Ly8gc2hvd2luZyBvbiB0aGUgbW9udGhseSBjYWxlbmRhci4gVGhpcyBpcyB1c3VhbGx5IHRoZVxuXHRcdC8vIHByZXZpb3VzIG1vbnRoLCBzbyBkYXRlTnVtIHdpbGwgc3RhcnQgYXMgYSBuZWdhdGl2ZSBudW1iZXJcblx0XHR0aGlzLnNldE1vZGUoMCk7XG5cdFx0aWYgKHRoaXMuYm9keU5vZGUpIHtcblx0XHRcdGRvbS5kZXN0cm95KHRoaXMuYm9keU5vZGUpO1xuXHRcdH1cblxuXHRcdHRoaXMuZGF5TWFwID0ge307XG5cblx0XHR2YXJcblx0XHRcdG5vZGUgPSBkb20oJ2RpdicsIHsgY2xhc3M6ICdjYWwtYm9keScgfSksXG5cdFx0XHRpLCB0eCwgbmV4dE1vbnRoID0gMCwgaXNUaGlzTW9udGgsIGRheSwgY3NzLFxuXHRcdFx0dG9kYXkgPSBuZXcgRGF0ZSgpLFxuXHRcdFx0aXNSYW5nZSA9IHRoaXNbJ3JhbmdlLXBpY2tlciddLFxuXHRcdFx0ZCA9IHRoaXMuY3VycmVudCxcblx0XHRcdGluY0RhdGUgPSBjb3B5KGQpLFxuXHRcdFx0ZGF5c0luUHJldk1vbnRoID0gZGF0ZXMuZ2V0RGF5c0luUHJldk1vbnRoKGQpLFxuXHRcdFx0ZGF5c0luTW9udGggPSBkYXRlcy5nZXREYXlzSW5Nb250aChkKSxcblx0XHRcdGRhdGVOdW0gPSBkYXRlcy5nZXRGaXJzdFN1bmRheShkKSxcblx0XHRcdGRhdGVUb2RheSA9IGdldFNlbGVjdGVkRGF0ZSh0b2RheSwgZCksXG5cdFx0XHRkYXRlU2VsZWN0ZWQgPSBnZXRTZWxlY3RlZERhdGUodGhpcy52YWx1ZURhdGUsIGQpO1xuXG5cdFx0dGhpcy5tb250aE5vZGUuaW5uZXJIVE1MID0gZGF0ZXMuZ2V0TW9udGhOYW1lKGQpICsgJyAnICsgZC5nZXRGdWxsWWVhcigpO1xuXG5cdFx0Zm9yIChpID0gMDsgaSA8IDc7IGkrKykge1xuXHRcdFx0ZG9tKFwiZGl2XCIsIHsgaHRtbDogZGF0ZXMuZGF5cy5hYmJyW2ldLCBjbGFzczogJ2RheS1vZi13ZWVrJyB9LCBub2RlKTtcblx0XHR9XG5cblx0XHRmb3IgKGkgPSAwOyBpIDwgNDI7IGkrKykge1xuXHRcdFx0dHggPSBkYXRlTnVtICsgMSA+IDAgJiYgZGF0ZU51bSArIDEgPD0gZGF5c0luTW9udGggPyBkYXRlTnVtICsgMSA6IFwiJm5ic3A7XCI7XG5cblx0XHRcdGlzVGhpc01vbnRoID0gZmFsc2U7XG5cdFx0XHRpZiAoZGF0ZU51bSArIDEgPiAwICYmIGRhdGVOdW0gKyAxIDw9IGRheXNJbk1vbnRoKSB7XG5cdFx0XHRcdC8vIGN1cnJlbnQgbW9udGhcblx0XHRcdFx0dHggPSBkYXRlTnVtICsgMTtcblx0XHRcdFx0aXNUaGlzTW9udGggPSB0cnVlO1xuXHRcdFx0XHRjc3MgPSAnZGF5IG9uJztcblx0XHRcdFx0aWYgKGRhdGVUb2RheSA9PT0gdHgpIHtcblx0XHRcdFx0XHRjc3MgKz0gJyB0b2RheSc7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGRhdGVTZWxlY3RlZCA9PT0gdHggJiYgIWlzUmFuZ2UpIHtcblx0XHRcdFx0XHRjc3MgKz0gJyBheS1zZWxlY3RlZCc7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAoZGF0ZU51bSA8IDApIHtcblx0XHRcdFx0Ly8gcHJldmlvdXMgbW9udGhcblx0XHRcdFx0dHggPSBkYXlzSW5QcmV2TW9udGggKyBkYXRlTnVtICsgMTtcblx0XHRcdFx0Y3NzID0gJ2RheSBvZmYgcGFzdCc7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBuZXh0IG1vbnRoXG5cdFx0XHRcdHR4ID0gKytuZXh0TW9udGg7XG5cdFx0XHRcdGNzcyA9ICdkYXkgb2ZmIGZ1dHVyZSc7XG5cdFx0XHR9XG5cblx0XHRcdGRheSA9IGRvbShcImRpdlwiLCB7IGlubmVySFRNTDogdHgsIGNsYXNzOiBjc3MgfSwgbm9kZSk7XG5cblx0XHRcdGRhdGVOdW0rKztcblx0XHRcdGlmIChpc1RoaXNNb250aCkge1xuXHRcdFx0XHQvLyBLZWVwIGEgbWFwIG9mIGFsbCB0aGUgZGF5c1xuXHRcdFx0XHQvLyB1c2UgaXQgZm9yIGFkZGluZyBhbmQgcmVtb3Zpbmcgc2VsZWN0aW9uL2hvdmVyIGNsYXNzZXNcblx0XHRcdFx0aW5jRGF0ZS5zZXREYXRlKHR4KTtcblx0XHRcdFx0ZGF5Ll9kYXRlID0gaW5jRGF0ZS5nZXRUaW1lKCk7XG5cdFx0XHRcdHRoaXMuZGF5TWFwW3R4XSA9IGRheTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLmNvbnRhaW5lci5hcHBlbmRDaGlsZChub2RlKTtcblx0XHR0aGlzLmJvZHlOb2RlID0gbm9kZTtcblx0XHR0aGlzLnNldEZvb3RlcigpO1xuXHRcdHRoaXMuZGlzcGxheVJhbmdlKCk7XG5cdFx0dGhpcy5zZXRSYW5nZUVuZFBvaW50cygpO1xuXG5cdFx0dGhpcy5lbWl0RGlzcGxheUV2ZW50cygpO1xuXHR9XG5cblx0c2V0Rm9vdGVyICgpIHtcblx0XHR2YXJcblx0XHRcdGQgPSBuZXcgRGF0ZSgpLFxuXHRcdFx0c3RyID0gZGF0ZXMuZGF5cy5mdWxsW2QuZ2V0RGF5KCldICsgJyAnICsgZGF0ZXMubW9udGhzLmZ1bGxbZC5nZXRNb250aCgpXSArICcgJyArIGQuZ2V0RGF0ZSgpICsgJywgJyArIGQuZ2V0RnVsbFllYXIoKTtcblx0XHR0aGlzLmZvb3RlckxpbmsuaW5uZXJIVE1MID0gc3RyO1xuXHR9XG5cblx0Y29ubmVjdCAoKSB7XG5cdFx0dGhpcy5vbih0aGlzLmxmdE5vZGUsICdjbGljaycsICgpID0+IHtcblx0XHRcdHRoaXMub25DbGlja01vbnRoKC0xKTtcblx0XHR9KTtcblxuXHRcdHRoaXMub24odGhpcy5yZ3ROb2RlLCAnY2xpY2snLCAoKSA9PiB7XG5cdFx0XHR0aGlzLm9uQ2xpY2tNb250aCgxKTtcblx0XHR9KTtcblxuXHRcdHRoaXMub24odGhpcy5mb290ZXJMaW5rLCAnY2xpY2snLCAoKSA9PiB7XG5cdFx0XHR0aGlzLmN1cnJlbnQgPSBuZXcgRGF0ZSgpO1xuXHRcdFx0dGhpcy5yZW5kZXIoKTtcblx0XHR9KTtcblxuXHRcdHRoaXMub24odGhpcy5jb250YWluZXIsICdjbGljaycsIChlKSA9PiB7XG5cdFx0XHR0aGlzLmZpcmUoJ3ByZS1jbGljaycsIGUsIHRydWUsIHRydWUpO1xuXHRcdFx0dmFyIG5vZGUgPSBlLnRhcmdldDtcblx0XHRcdGlmIChub2RlLmNsYXNzTGlzdC5jb250YWlucygnZGF5JykpIHtcblx0XHRcdFx0dGhpcy5vbkNsaWNrRGF5KG5vZGUpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAobm9kZS5jbGFzc0xpc3QuY29udGFpbnMoJ3llYXInKSkge1xuXHRcdFx0XHR0aGlzLm9uQ2xpY2tZZWFyKG5vZGUpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAobm9kZS5jbGFzc0xpc3QuY29udGFpbnMoJ2RlY2FkZScpKSB7XG5cdFx0XHRcdHRoaXMub25DbGlja0RlY2FkZShub2RlKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMub24odGhpcy5tb250aE5vZGUsICdjbGljaycsICgpID0+IHtcblx0XHRcdGlmICh0aGlzLm1vZGUgKyAxID09PSB0aGlzLm1vZGVzLmxlbmd0aCkge1xuXHRcdFx0XHR0aGlzLm1vZGUgPSAwO1xuXHRcdFx0XHR0aGlzLnJlbmRlcigpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHRoaXMuc2V0TW9kZSh0aGlzLm1vZGUgKyAxKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdGlmICh0aGlzWydyYW5nZS1waWNrZXInXSkge1xuXHRcdFx0dGhpcy5vbih0aGlzLmNvbnRhaW5lciwgJ21vdXNlb3ZlcicsIHRoaXMuaG92ZXJTZWxlY3RSYW5nZS5iaW5kKHRoaXMpKTtcblx0XHR9XG5cdH1cbn1cblxuY29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpO1xuXG5mdW5jdGlvbiBnZXRTZWxlY3RlZERhdGUgKGRhdGUsIGN1cnJlbnQpIHtcblx0aWYgKGRhdGUuZ2V0TW9udGgoKSA9PT0gY3VycmVudC5nZXRNb250aCgpICYmIGRhdGUuZ2V0RnVsbFllYXIoKSA9PT0gY3VycmVudC5nZXRGdWxsWWVhcigpKSB7XG5cdFx0cmV0dXJuIGRhdGUuZ2V0RGF0ZSgpO1xuXHR9XG5cdHJldHVybiAtOTk5OyAvLyBpbmRleCBtdXN0IGJlIG91dCBvZiByYW5nZSwgYW5kIC0xIGlzIHRoZSBsYXN0IGRheSBvZiB0aGUgcHJldmlvdXMgbW9udGhcbn1cblxuZnVuY3Rpb24gZGVzdHJveSAobm9kZSkge1xuXHRpZiAobm9kZSkge1xuXHRcdGRvbS5kZXN0cm95KG5vZGUpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGlzVGhpc01vbnRoIChkYXRlLCBjdXJyZW50RGF0ZSkge1xuXHRyZXR1cm4gZGF0ZS5nZXRNb250aCgpID09PSBjdXJyZW50RGF0ZS5nZXRNb250aCgpICYmIGRhdGUuZ2V0RnVsbFllYXIoKSA9PT0gY3VycmVudERhdGUuZ2V0RnVsbFllYXIoKTtcbn1cblxuZnVuY3Rpb24gaW5SYW5nZSAoZGF0ZVRpbWUsIGJlZ1RpbWUsIGVuZFRpbWUpIHtcblx0cmV0dXJuIGRhdGVUaW1lID49IGJlZ1RpbWUgJiYgZGF0ZVRpbWUgPD0gZW5kVGltZTtcbn1cblxuZnVuY3Rpb24gY29weSAoZGF0ZSkge1xuXHRyZXR1cm4gbmV3IERhdGUoZGF0ZS5nZXRUaW1lKCkpO1xufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ2RhdGUtcGlja2VyJywgRGF0ZVBpY2tlcik7XG5cbm1vZHVsZS5leHBvcnRzID0gRGF0ZVBpY2tlcjsiLCJyZXF1aXJlKCcuL2dsb2JhbHMnKTtcbnJlcXVpcmUoJy4uLy4uL3NyYy9kYXRlLXBpY2tlcicpOyIsIndpbmRvd1snbm8tbmF0aXZlLXNoaW0nXSA9IGZhbHNlO1xucmVxdWlyZSgnY3VzdG9tLWVsZW1lbnRzLXBvbHlmaWxsJyk7XG53aW5kb3cub24gPSByZXF1aXJlKCdvbicpO1xud2luZG93LmRvbSA9IHJlcXVpcmUoJ2RvbScpOyJdfQ==
