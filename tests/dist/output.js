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

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

require('./date-picker');
var BaseComponent = require('BaseComponent');
var dates = require('dates');

var defaultPlaceholder = 'MM/DD/YYYY';
var defaultMask = 'XX/XX/XXXX';
var props = ['label', 'name', 'placeholder', 'value', 'mask'];
var bools = [];

var DateInput = function (_BaseComponent) {
	_inherits(DateInput, _BaseComponent);

	_createClass(DateInput, [{
		key: 'onValue',


		// FIXME
		// need to manage value manually

		value: function onValue(value) {
			this.strDate = dates.isDateType(value) ? value : '';
			this.setValue(this.strDate);
		}
	}, {
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
		key: 'value',
		get: function get() {
			console.log('get value');
			return this.strDate;
		}
	}, {
		key: 'templateString',
		get: function get() {
			return '\n<label>\n\t<span ref="labelNode"></span>\n\t<input ref="input" />\n\t\n</label>\n<date-picker ref="picker" tabindex="0"></date-picker>';
		}
	}], [{
		key: 'observedAttributes',
		get: function get() {
			return [].concat(props, bools);
		}
	}]);

	function DateInput() {
		_classCallCheck(this, DateInput);

		var _this = _possibleConstructorReturn(this, (DateInput.__proto__ || Object.getPrototypeOf(DateInput)).call(this));

		_this.showing = false;
		return _this;
	}

	_createClass(DateInput, [{
		key: 'setValue',
		value: function setValue(value) {
			this.typedValue = value;
			this.input.value = value;
			var len = this.input.value.length === this.mask.length;
			var valid = void 0;
			if (len) {
				valid = dates.isValid(value);
			} else {
				valid = true;
			}
			dom.classList.toggle(this, 'invalid', !valid);
			if (valid && len) {
				//this.value = value;
				this.picker.value = value;
				this.emit('change', { value: value });
			}
		}
	}, {
		key: 'format',
		value: function format(s) {
			function sub(pos) {
				var subStr = '';
				for (var i = pos; i < mask.length; i++) {
					if (mask[i] === 'X') {
						break;
					}
					subStr += mask[i];
				}
				return subStr;
			}
			s = s.replace(/\D/g, '');
			var mask = this.mask;
			var f = '';
			var len = Math.min(s.length, this.maskLength);
			for (var i = 0; i < len; i++) {
				if (mask[f.length] !== 'X') {
					f += sub(f.length);
				}
				f += s[i];
			}
			return f;
		}
	}, {
		key: 'onKey',
		value: function onKey(e) {
			var str = this.typedValue || '';
			var beg = e.target.selectionStart;
			var end = e.target.selectionEnd;
			var k = e.key;

			function setSelection(amt) {
				// TODO
				// This might not be exactly right...
				// have to allow for the slashes
				if (end - beg) {
					e.target.selectionEnd = end - (end - beg - 1);
				} else {
					e.target.selectionEnd = end + amt;
				}
			}

			if (!isNum(k)) {
				// handle paste, backspace
				if (this.input.value !== this.typedValue) {
					this.setValue(this.input.value);
				}
				setSelection(0);
				stopEvent(e);
				return;
			}
			if (str.length !== end || beg !== end) {
				// handle selection or middle-string edit
				var temp = this.typedValue.substring(0, beg) + k + this.typedValue.substring(end);
				this.setValue(this.format(temp));

				setSelection(1);
				stopEvent(e);
				return;
			}

			this.setValue(this.format(str + k));
		}
	}, {
		key: 'show',
		value: function show() {
			var _this2 = this;

			if (this.showing) {
				return;
			}
			this.showing = true;
			this.picker.classList.add('show');

			window.requestAnimationFrame(function () {
				var win = dom.box(window);
				var box = dom.box(_this2.picker);
				if (box.x + box.w > win.h) {
					_this2.picker.classList.add('right-align');
				}
				if (box.y + box.h > win.h) {
					_this2.picker.classList.add('bottom-align');
				}
			});
		}
	}, {
		key: 'hide',
		value: function hide() {
			if (!this.showing || window.keepPopupsOpen) {
				return;
			}
			this.showing = false;
			dom.classList.remove(this.picker, 'right-align bottom-align show');
		}
	}, {
		key: 'domReady',
		value: function domReady() {
			var _this3 = this;

			this.mask = this.mask || defaultMask;
			this.maskLength = this.mask.match(/X/g).join('').length;

			this.labelNode.innerHTML = this.label || '';
			this.input.setAttribute('type', 'text');
			this.input.setAttribute('placeholder', this.placeholder || defaultPlaceholder);
			this.picker.on('change', function (e) {
				_this3.setValue(e.value);
			});
			this.connectKeys();
			this.registerHandle(handleOpen(this.input, this.picker, this.show.bind(this), this.hide.bind(this)));
		}
	}, {
		key: 'connectKeys',
		value: function connectKeys() {
			var _this4 = this;

			this.on(this.input, 'keydown', stopEvent);
			this.on(this.input, 'keypress', stopEvent);
			this.on(this.input, 'keyup', function (e) {
				_this4.onKey(e);
			});
		}
	}]);

	return DateInput;
}(BaseComponent);

function handleOpen(input, picker, show, hide) {
	var inputFocus = false;
	var pickerFocus = false;
	var docHandle = on(document, 'keyup', function (e) {
		if (e.key === 'Escape') {
			hide();
		}
	});
	docHandle.pause();
	return on.makeMultiHandle([on(input, 'focus', function () {
		inputFocus = true;
		show();
		docHandle.resume();
	}), on(input, 'blur', function () {
		inputFocus = false;
		setTimeout(function () {
			if (!pickerFocus) {
				hide();
				docHandle.pause();
			}
		}, 100);
	}), on(picker, 'focus', function () {
		pickerFocus = true;
		show();
		docHandle.resume();
	}), on(picker, 'blur', function () {
		pickerFocus = false;
		setTimeout(function () {
			if (!inputFocus) {
				hide();
				docHandle.pause();
			}
		}, 100);
	})]);
}

var numReg = /[0123456789]/;
function isNum(k) {
	return numReg.test(k);
}

var control = {
	'Enter': 1,
	'Backspace': 1,
	'Delete': 1,
	'ArrowLeft': 1,
	'ArrowRight': 1,
	'Escape': 1,
	'Command': 1,
	'Tab': 1
};
function stopEvent(e) {
	if (e.metaKey || control[e.key]) {
		return;
	}
	e.preventDefault();
	e.stopImmediatePropagation();
}

customElements.define('date-input', DateInput);

module.exports = DateInput;

},{"./date-picker":6,"BaseComponent":"BaseComponent","dates":4}],6:[function(require,module,exports){
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

var props = [];

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

		_this.current = new Date();
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
			this.valueDate = copy(this.current);
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

			var i = void 0;
			var node = dom('div', { class: 'cal-body year' });

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
			var i = void 0;
			var node = dom('div', { class: 'cal-body decade' });
			var year = this.current.getFullYear() - 6;

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
			var now = this.querySelector('.ay-selected');
			var node = this.dayMap[this.current.getDate()];
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
			var beg = this.firstRange;
			var end = this.secondRange ? this.secondRange.getTime() : this.hoverDate;
			var map = this.dayMap;
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
			    i = void 0,
			    tx = void 0,
			    nextMonth = 0,
			    isThisMonth = void 0,
			    day = void 0,
			    css = void 0,
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
			var d = new Date();
			this.footerLink.innerHTML = dates.days.full[d.getDay()] + ' ' + dates.months.full[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
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

},{"BaseComponent":"BaseComponent","BaseComponent/src/properties":1,"BaseComponent/src/refs":2,"BaseComponent/src/template":3,"dates":4}],7:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

require('./date-range-picker');
var DateInput = require('./date-input');
var dates = require('dates');
var dom = require('dom');

var props = ['label', 'name', 'placeholder', 'value'];
var bools = ['range-expands'];

var DateRangeInput = function (_DateInput) {
	_inherits(DateRangeInput, _DateInput);

	_createClass(DateRangeInput, [{
		key: 'props',
		get: function get() {
			return props;
		}
	}, {
		key: 'bools',
		get: function get() {
			return bools;
		}

		// onValue (value) {
		//
		// }

	}, {
		key: 'templateString',
		get: function get() {
			return '\n<label>\n\t<span ref="labelNode"></span>\n\t<input ref="input" />\n\t\n</label>\n<date-range-picker ref="picker" tabindex="0"></date-range-picker>';
		}
	}], [{
		key: 'observedAttributes',
		get: function get() {
			return [].concat(props, bools);
		}
	}]);

	function DateRangeInput() {
		_classCallCheck(this, DateRangeInput);

		var _this = _possibleConstructorReturn(this, (DateRangeInput.__proto__ || Object.getPrototypeOf(DateRangeInput)).call(this));

		_this.mask = 'XX/XX/XXXX - XX/XX/XXXX';
		return _this;
	}

	// onKey () {
	//
	// }
	//
	// connectKeys () {
	// 	this.on(this.input, 'keyup', this.onKey.bind(this));
	// }

	// domReady () {
	// 	dom();
	// }


	return DateRangeInput;
}(DateInput);

customElements.define('date-range-input', DateRangeInput);

module.exports = DateRangeInput;

},{"./date-input":5,"./date-range-picker":8,"dates":4,"dom":"dom"}],8:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

require('./date-picker');
var BaseComponent = require('BaseComponent');
var dates = require('dates');
var dom = require('dom');

var props = ['value'];
var bools = ['range-expands'];

var DateRangePicker = function (_BaseComponent) {
	_inherits(DateRangePicker, _BaseComponent);

	_createClass(DateRangePicker, [{
		key: 'onValue',
		value: function onValue(value) {
			var _this2 = this;

			// might need attributeChanged
			this.strDate = dates.isDateType(value) ? value : '';
			onDomReady(this, function () {
				_this2.setValue(_this2.strDate, true);
			});
		}
	}, {
		key: 'props',
		get: function get() {
			return props;
		}
	}, {
		key: 'bools',
		get: function get() {
			return bools;
		}
	}], [{
		key: 'observedAttributes',
		get: function get() {
			return [].concat(props, bools);
		}
	}]);

	function DateRangePicker() {
		_classCallCheck(this, DateRangePicker);

		return _possibleConstructorReturn(this, (DateRangePicker.__proto__ || Object.getPrototypeOf(DateRangePicker)).call(this));
	}

	_createClass(DateRangePicker, [{
		key: 'setValue',
		value: function setValue(value, noEmit) {
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
	}, {
		key: 'domReady',
		value: function domReady() {
			this.leftCal = dom('date-picker', { 'range-left': true }, this);
			this.rightCal = dom('date-picker', { 'range-right': true }, this);
			this.rangeExpands = this['range-expands'];

			this.connectEvents();
			// if (this.initalValue) {
			// 	this.setValue(this.initalValue);
			// } else {
			// 	this.setDisplay();
			// }
		}
	}, {
		key: 'setDisplay',
		value: function setDisplay() {
			var first = this.firstRange ? new Date(this.firstRange.getTime()) : new Date(),
			    second = new Date(first.getTime());

			second.setMonth(second.getMonth() + 1);
			this.leftCal.setDisplay(first);
			this.rightCal.setDisplay(second);
		}
	}, {
		key: 'setRange',
		value: function setRange(noEmit) {
			this.leftCal.setRange(this.firstRange, this.secondRange);
			this.rightCal.setRange(this.firstRange, this.secondRange);
			if (!noEmit && this.firstRange && this.secondRange) {

				var beg = dates.dateToStr(this.firstRange),
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
	}, {
		key: 'clearRange',
		value: function clearRange() {
			this.leftCal.clearRange();
			this.rightCal.clearRange();
		}
	}, {
		key: 'calculateRange',
		value: function calculateRange(e, which) {
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
	}, {
		key: 'connectEvents',
		value: function connectEvents() {
			this.leftCal.on('display-change', function (e) {
				var m = e.detail.month,
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
				var m = e.detail.month,
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
				} else {
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
				} else {
					this.firstRange = e.current;
					this.setRange();
				}
			}.bind(this));

			this.on(this.rightCal, 'mouseover', function () {
				this.leftCal.displayRangeToEnd();
			}.bind(this));
		}
	}, {
		key: 'destroy',
		value: function destroy() {
			this.rightCal.destroy();
			this.leftCal.destroy();
		}
	}]);

	return DateRangePicker;
}(BaseComponent);

var DELIMITER = ' - ';
var today = new Date();

function str(d) {
	if (!d) {
		return null;
	}
	return dates.dateToStr(d);
}

function split(value) {
	if (value.indexOf(',') > -1) {
		return value.split(/\s*,\s*/);
	}
	return value.split(/\s*-\s*/);
}

function isDateCloserToLeft(date, left, right) {
	var diff1 = dates.diff(date, left),
	    diff2 = dates.diff(date, right);
	return diff1 <= diff2;
}

customElements.define('date-range-picker', DateRangePicker);

module.exports = DateRangePicker;

},{"./date-picker":6,"BaseComponent":"BaseComponent","dates":4,"dom":"dom"}],9:[function(require,module,exports){
'use strict';

require('./globals');
require('../../src/date-picker');
require('../../src/date-input');
require('../../src/date-range-picker');
require('../../src/date-range-input');

},{"../../src/date-input":5,"../../src/date-picker":6,"../../src/date-range-input":7,"../../src/date-range-picker":8,"./globals":10}],10:[function(require,module,exports){
'use strict';

window['no-native-shim'] = false;
require('custom-elements-polyfill');
window.on = require('on');
window.dom = require('dom');

},{"custom-elements-polyfill":"custom-elements-polyfill","dom":"dom","on":"on"}]},{},[9])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQmFzZUNvbXBvbmVudC9zcmMvcHJvcGVydGllcy5qcyIsIm5vZGVfbW9kdWxlcy9CYXNlQ29tcG9uZW50L3NyYy9yZWZzLmpzIiwibm9kZV9tb2R1bGVzL0Jhc2VDb21wb25lbnQvc3JjL3RlbXBsYXRlLmpzIiwibm9kZV9tb2R1bGVzL2RhdGVzL3NyYy9kYXRlcy5qcyIsInNyYy9kYXRlLWlucHV0LmpzIiwic3JjL2RhdGUtcGlja2VyLmpzIiwic3JjL2RhdGUtcmFuZ2UtaW5wdXQuanMiLCJzcmMvZGF0ZS1yYW5nZS1waWNrZXIuanMiLCJ0ZXN0cy9zcmMvZGF0ZS1waWNrZXItdGVzdHMuanMiLCJ0ZXN0cy9zcmMvZ2xvYmFscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7O0FDMWRBLFFBQVEsZUFBUjtBQUNBLElBQU0sZ0JBQWdCLFFBQVEsZUFBUixDQUF0QjtBQUNBLElBQU0sUUFBUSxRQUFRLE9BQVIsQ0FBZDs7QUFFQSxJQUFNLHFCQUFxQixZQUEzQjtBQUNBLElBQU0sY0FBYyxZQUFwQjtBQUNBLElBQU0sUUFBUSxDQUFDLE9BQUQsRUFBVSxNQUFWLEVBQWtCLGFBQWxCLEVBQWlDLE9BQWpDLEVBQTBDLE1BQTFDLENBQWQ7QUFDQSxJQUFNLFFBQVEsRUFB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QU4sQ0FBZ0IsQ0FBaEIsQ0FBUDtBQUNBOztBQUVELFNBQVMsS0FBVCxDQUFnQixLQUFoQixFQUF1QjtBQUN0QixLQUFJLE1BQU0sT0FBTixDQUFjLEdBQWQsSUFBcUIsQ0FBQyxDQUExQixFQUE2QjtBQUM1QixTQUFPLE1BQU0sS0FBTixDQUFZLFNBQVosQ0FBUDtBQUNBO0FBQ0QsUUFBTyxNQUFNLEtBQU4sQ0FBWSxTQUFaLENBQVA7QUFDQTs7QUFFRCxTQUFTLGtCQUFULENBQTZCLElBQTdCLEVBQW1DLElBQW5DLEVBQXlDLEtBQXpDLEVBQWdEO0FBQy9DLEtBQU0sUUFBUSxNQUFNLElBQU4sQ0FBVyxJQUFYLEVBQWlCLElBQWpCLENBQWQ7QUFBQSxLQUNDLFFBQVEsTUFBTSxJQUFOLENBQVcsSUFBWCxFQUFpQixLQUFqQixDQURUO0FBRUEsUUFBTyxTQUFTLEtBQWhCO0FBQ0E7O0FBRUQsZUFBZSxNQUFmLENBQXNCLG1CQUF0QixFQUEyQyxlQUEzQzs7QUFFQSxPQUFPLE9BQVAsR0FBaUIsZUFBakI7Ozs7O0FDMVBBLFFBQVEsV0FBUjtBQUNBLFFBQVEsdUJBQVI7QUFDQSxRQUFRLHNCQUFSO0FBQ0EsUUFBUSw2QkFBUjtBQUNBLFFBQVEsNEJBQVI7Ozs7O0FDSkEsT0FBTyxnQkFBUCxJQUEyQixLQUEzQjtBQUNBLFFBQVEsMEJBQVI7QUFDQSxPQUFPLEVBQVAsR0FBWSxRQUFRLElBQVIsQ0FBWjtBQUNBLE9BQU8sR0FBUCxHQUFhLFFBQVEsS0FBUixDQUFiIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImNvbnN0IEJhc2VDb21wb25lbnQgPSByZXF1aXJlKCdCYXNlQ29tcG9uZW50Jyk7XG5jb25zdCBkb20gPSByZXF1aXJlKCdkb20nKTtcblxuZnVuY3Rpb24gc2V0Qm9vbGVhbiAobm9kZSwgcHJvcCkge1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkobm9kZSwgcHJvcCwge1xuXHRcdGVudW1lcmFibGU6IHRydWUsXG5cdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHRcdGdldCAoKSB7XG5cdFx0XHRyZXR1cm4gbm9kZS5oYXNBdHRyaWJ1dGUocHJvcCk7XG5cdFx0fSxcblx0XHRzZXQgKHZhbHVlKSB7XG5cdFx0XHR0aGlzLmlzU2V0dGluZ0F0dHJpYnV0ZSA9IHRydWU7XG5cdFx0XHRpZiAodmFsdWUpIHtcblx0XHRcdFx0dGhpcy5zZXRBdHRyaWJ1dGUocHJvcCwgJycpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5yZW1vdmVBdHRyaWJ1dGUocHJvcCk7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBmbiA9IHRoaXNbb25pZnkocHJvcCldO1xuXHRcdFx0aWYoZm4pe1xuXHRcdFx0XHRmbi5jYWxsKHRoaXMsIHZhbHVlKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5pc1NldHRpbmdBdHRyaWJ1dGUgPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBzZXRQcm9wZXJ0eSAobm9kZSwgcHJvcCkge1xuXHRsZXQgcHJvcFZhbHVlO1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkobm9kZSwgcHJvcCwge1xuXHRcdGVudW1lcmFibGU6IHRydWUsXG5cdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHRcdGdldCAoKSB7XG5cdFx0XHRyZXR1cm4gcHJvcFZhbHVlICE9PSB1bmRlZmluZWQgPyBwcm9wVmFsdWUgOiBkb20ubm9ybWFsaXplKHRoaXMuZ2V0QXR0cmlidXRlKHByb3ApKTtcblx0XHR9LFxuXHRcdHNldCAodmFsdWUpIHtcblx0XHRcdHRoaXMuaXNTZXR0aW5nQXR0cmlidXRlID0gdHJ1ZTtcblx0XHRcdHRoaXMuc2V0QXR0cmlidXRlKHByb3AsIHZhbHVlKTtcblx0XHRcdGNvbnN0IGZuID0gdGhpc1tvbmlmeShwcm9wKV07XG5cdFx0XHRpZihmbil7XG5cdFx0XHRcdG9uRG9tUmVhZHkodGhpcywgKCkgPT4ge1xuXHRcdFx0XHRcdHZhbHVlID0gZm4uY2FsbCh0aGlzLCB2YWx1ZSkgfHwgdmFsdWU7XG5cdFx0XHRcdFx0aWYodmFsdWUgIT09IHVuZGVmaW5lZCl7XG5cdFx0XHRcdFx0XHRwcm9wVmFsdWUgPSB2YWx1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5pc1NldHRpbmdBdHRyaWJ1dGUgPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBzZXRPYmplY3QgKG5vZGUsIHByb3ApIHtcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG5vZGUsIHByb3AsIHtcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcblx0XHRnZXQgKCkge1xuXHRcdFx0cmV0dXJuIHRoaXNbJ19fJyArIHByb3BdO1xuXHRcdH0sXG5cdFx0c2V0ICh2YWx1ZSkge1xuXHRcdFx0dGhpc1snX18nICsgcHJvcF0gPSB2YWx1ZTtcblx0XHR9XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBzZXRQcm9wZXJ0aWVzIChub2RlKSB7XG5cdGxldCBwcm9wcyA9IG5vZGUucHJvcHMgfHwgbm9kZS5wcm9wZXJ0aWVzO1xuXHRpZiAocHJvcHMpIHtcblx0XHRwcm9wcy5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG5cdFx0XHRpZiAocHJvcCA9PT0gJ2Rpc2FibGVkJykge1xuXHRcdFx0XHRzZXRCb29sZWFuKG5vZGUsIHByb3ApO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHNldFByb3BlcnR5KG5vZGUsIHByb3ApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHNldEJvb2xlYW5zIChub2RlKSB7XG5cdGxldCBwcm9wcyA9IG5vZGUuYm9vbHMgfHwgbm9kZS5ib29sZWFucztcblx0aWYgKHByb3BzKSB7XG5cdFx0cHJvcHMuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuXHRcdFx0c2V0Qm9vbGVhbihub2RlLCBwcm9wKTtcblx0XHR9KTtcblx0fVxufVxuXG5mdW5jdGlvbiBzZXRPYmplY3RzIChub2RlKSB7XG5cdGxldCBwcm9wcyA9IG5vZGUub2JqZWN0cztcblx0aWYgKHByb3BzKSB7XG5cdFx0cHJvcHMuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuXHRcdFx0c2V0T2JqZWN0KG5vZGUsIHByb3ApO1xuXHRcdH0pO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGNhcCAobmFtZSkge1xuXHRyZXR1cm4gbmFtZS5zdWJzdHJpbmcoMCwxKS50b1VwcGVyQ2FzZSgpICsgbmFtZS5zdWJzdHJpbmcoMSk7XG59XG5cbmZ1bmN0aW9uIG9uaWZ5IChuYW1lKSB7XG5cdHJldHVybiAnb24nICsgbmFtZS5zcGxpdCgnLScpLm1hcCh3b3JkID0+IGNhcCh3b3JkKSkuam9pbignJyk7XG59XG5cbmZ1bmN0aW9uIGlzQm9vbCAobm9kZSwgbmFtZSkge1xuXHRyZXR1cm4gKG5vZGUuYm9vbHMgfHwgbm9kZS5ib29sZWFucyB8fCBbXSkuaW5kZXhPZihuYW1lKSA+IC0xO1xufVxuXG5mdW5jdGlvbiBib29sTm9ybSAodmFsdWUpIHtcblx0aWYodmFsdWUgPT09ICcnKXtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXHRyZXR1cm4gZG9tLm5vcm1hbGl6ZSh2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIHByb3BOb3JtICh2YWx1ZSkge1xuXHRyZXR1cm4gZG9tLm5vcm1hbGl6ZSh2YWx1ZSk7XG59XG5cbkJhc2VDb21wb25lbnQuYWRkUGx1Z2luKHtcblx0bmFtZTogJ3Byb3BlcnRpZXMnLFxuXHRvcmRlcjogMTAsXG5cdGluaXQ6IGZ1bmN0aW9uIChub2RlKSB7XG5cdFx0c2V0UHJvcGVydGllcyhub2RlKTtcblx0XHRzZXRCb29sZWFucyhub2RlKTtcblx0fSxcblx0cHJlQXR0cmlidXRlQ2hhbmdlZDogZnVuY3Rpb24gKG5vZGUsIG5hbWUsIHZhbHVlKSB7XG5cdFx0aWYgKG5vZGUuaXNTZXR0aW5nQXR0cmlidXRlKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdGlmKGlzQm9vbChub2RlLCBuYW1lKSl7XG5cdFx0XHR2YWx1ZSA9IGJvb2xOb3JtKHZhbHVlKTtcblx0XHRcdG5vZGVbbmFtZV0gPSAhIXZhbHVlO1xuXHRcdFx0aWYoIXZhbHVlKXtcblx0XHRcdFx0bm9kZVtuYW1lXSA9IGZhbHNlO1xuXHRcdFx0XHRub2RlLmlzU2V0dGluZ0F0dHJpYnV0ZSA9IHRydWU7XG5cdFx0XHRcdG5vZGUucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuXHRcdFx0XHRub2RlLmlzU2V0dGluZ0F0dHJpYnV0ZSA9IGZhbHNlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bm9kZVtuYW1lXSA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0bm9kZVtuYW1lXSA9IHByb3BOb3JtKHZhbHVlKTtcblx0fVxufSk7IiwiY29uc3QgZG9tID0gcmVxdWlyZSgnZG9tJyk7XG5jb25zdCBCYXNlQ29tcG9uZW50ID0gcmVxdWlyZSgnQmFzZUNvbXBvbmVudCcpO1xuXG5mdW5jdGlvbiBhc3NpZ25SZWZzIChub2RlKSB7XG4gICAgZG9tLnF1ZXJ5QWxsKG5vZGUsICdbcmVmXScpLmZvckVhY2goZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICAgIGxldCBuYW1lID0gY2hpbGQuZ2V0QXR0cmlidXRlKCdyZWYnKTtcbiAgICAgICAgbm9kZVtuYW1lXSA9IGNoaWxkO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBhc3NpZ25FdmVudHMgKG5vZGUpIHtcbiAgICAvLyA8ZGl2IG9uPVwiY2xpY2s6b25DbGlja1wiPlxuICAgIGRvbS5xdWVyeUFsbChub2RlLCAnW29uXScpLmZvckVhY2goZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICAgIGxldFxuICAgICAgICAgICAga2V5VmFsdWUgPSBjaGlsZC5nZXRBdHRyaWJ1dGUoJ29uJyksXG4gICAgICAgICAgICBldmVudCA9IGtleVZhbHVlLnNwbGl0KCc6JylbMF0udHJpbSgpLFxuICAgICAgICAgICAgbWV0aG9kID0ga2V5VmFsdWUuc3BsaXQoJzonKVsxXS50cmltKCk7XG4gICAgICAgIG5vZGUub24oY2hpbGQsIGV2ZW50LCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgbm9kZVttZXRob2RdKGUpXG4gICAgICAgIH0pXG4gICAgfSk7XG59XG5cbkJhc2VDb21wb25lbnQuYWRkUGx1Z2luKHtcbiAgICBuYW1lOiAncmVmcycsXG4gICAgb3JkZXI6IDMwLFxuICAgIHByZUNvbm5lY3RlZDogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgYXNzaWduUmVmcyhub2RlKTtcbiAgICAgICAgYXNzaWduRXZlbnRzKG5vZGUpO1xuICAgIH1cbn0pOyIsImNvbnN0IEJhc2VDb21wb25lbnQgID0gcmVxdWlyZSgnQmFzZUNvbXBvbmVudCcpO1xuY29uc3QgZG9tID0gcmVxdWlyZSgnZG9tJyk7XG5cbnZhclxuICAgIGxpZ2h0Tm9kZXMgPSB7fSxcbiAgICBpbnNlcnRlZCA9IHt9O1xuXG5mdW5jdGlvbiBpbnNlcnQgKG5vZGUpIHtcbiAgICBpZihpbnNlcnRlZFtub2RlLl91aWRdIHx8ICFoYXNUZW1wbGF0ZShub2RlKSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29sbGVjdExpZ2h0Tm9kZXMobm9kZSk7XG4gICAgaW5zZXJ0VGVtcGxhdGUobm9kZSk7XG4gICAgaW5zZXJ0ZWRbbm9kZS5fdWlkXSA9IHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbGxlY3RMaWdodE5vZGVzKG5vZGUpe1xuICAgIGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXSA9IGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXSB8fCBbXTtcbiAgICB3aGlsZShub2RlLmNoaWxkTm9kZXMubGVuZ3RoKXtcbiAgICAgICAgbGlnaHROb2Rlc1tub2RlLl91aWRdLnB1c2gobm9kZS5yZW1vdmVDaGlsZChub2RlLmNoaWxkTm9kZXNbMF0pKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGhhc1RlbXBsYXRlIChub2RlKSB7XG4gICAgcmV0dXJuICEhbm9kZS5nZXRUZW1wbGF0ZU5vZGUoKTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0VGVtcGxhdGVDaGFpbiAobm9kZSkge1xuICAgIHZhciB0ZW1wbGF0ZXMgPSBub2RlLmdldFRlbXBsYXRlQ2hhaW4oKTtcbiAgICB0ZW1wbGF0ZXMucmV2ZXJzZSgpLmZvckVhY2goZnVuY3Rpb24gKHRlbXBsYXRlKSB7XG4gICAgICAgIGdldENvbnRhaW5lcihub2RlKS5hcHBlbmRDaGlsZChCYXNlQ29tcG9uZW50LmNsb25lKHRlbXBsYXRlKSk7XG4gICAgfSk7XG4gICAgaW5zZXJ0Q2hpbGRyZW4obm9kZSk7XG59XG5cbmZ1bmN0aW9uIGluc2VydFRlbXBsYXRlIChub2RlKSB7XG4gICAgaWYobm9kZS5uZXN0ZWRUZW1wbGF0ZSl7XG4gICAgICAgIGluc2VydFRlbXBsYXRlQ2hhaW4obm9kZSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyXG4gICAgICAgIHRlbXBsYXRlTm9kZSA9IG5vZGUuZ2V0VGVtcGxhdGVOb2RlKCk7XG5cbiAgICBpZih0ZW1wbGF0ZU5vZGUpIHtcbiAgICAgICAgbm9kZS5hcHBlbmRDaGlsZChCYXNlQ29tcG9uZW50LmNsb25lKHRlbXBsYXRlTm9kZSkpO1xuICAgIH1cbiAgICBpbnNlcnRDaGlsZHJlbihub2RlKTtcbn1cblxuZnVuY3Rpb24gZ2V0Q29udGFpbmVyIChub2RlKSB7XG4gICAgdmFyIGNvbnRhaW5lcnMgPSBub2RlLnF1ZXJ5U2VsZWN0b3JBbGwoJ1tyZWY9XCJjb250YWluZXJcIl0nKTtcbiAgICBpZighY29udGFpbmVycyB8fCAhY29udGFpbmVycy5sZW5ndGgpe1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRhaW5lcnNbY29udGFpbmVycy5sZW5ndGggLSAxXTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0Q2hpbGRyZW4gKG5vZGUpIHtcbiAgICB2YXIgaSxcbiAgICAgICAgY29udGFpbmVyID0gZ2V0Q29udGFpbmVyKG5vZGUpLFxuICAgICAgICBjaGlsZHJlbiA9IGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXTtcblxuICAgIGlmKGNvbnRhaW5lciAmJiBjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGgpe1xuICAgICAgICBmb3IoaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoY2hpbGRyZW5baV0pO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5CYXNlQ29tcG9uZW50LnByb3RvdHlwZS5nZXRMaWdodE5vZGVzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBsaWdodE5vZGVzW3RoaXMuX3VpZF07XG59O1xuXG5CYXNlQ29tcG9uZW50LnByb3RvdHlwZS5nZXRUZW1wbGF0ZU5vZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gY2FjaGluZyBjYXVzZXMgZGlmZmVyZW50IGNsYXNzZXMgdG8gcHVsbCB0aGUgc2FtZSB0ZW1wbGF0ZSAtIHdhdD9cbiAgICAvL2lmKCF0aGlzLnRlbXBsYXRlTm9kZSkge1xuICAgICAgICBpZiAodGhpcy50ZW1wbGF0ZUlkKSB7XG4gICAgICAgICAgICB0aGlzLnRlbXBsYXRlTm9kZSA9IGRvbS5ieUlkKHRoaXMudGVtcGxhdGVJZC5yZXBsYWNlKCcjJywnJykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMudGVtcGxhdGVTdHJpbmcpIHtcbiAgICAgICAgICAgIHRoaXMudGVtcGxhdGVOb2RlID0gZG9tLnRvRG9tKCc8dGVtcGxhdGU+JyArIHRoaXMudGVtcGxhdGVTdHJpbmcgKyAnPC90ZW1wbGF0ZT4nKTtcbiAgICAgICAgfVxuICAgIC8vfVxuICAgIHJldHVybiB0aGlzLnRlbXBsYXRlTm9kZTtcbn07XG5cbkJhc2VDb21wb25lbnQucHJvdG90eXBlLmdldFRlbXBsYXRlQ2hhaW4gPSBmdW5jdGlvbiAoKSB7XG5cbiAgICBsZXRcbiAgICAgICAgY29udGV4dCA9IHRoaXMsXG4gICAgICAgIHRlbXBsYXRlcyA9IFtdLFxuICAgICAgICB0ZW1wbGF0ZTtcblxuICAgIC8vIHdhbGsgdGhlIHByb3RvdHlwZSBjaGFpbjsgQmFiZWwgZG9lc24ndCBhbGxvdyB1c2luZ1xuICAgIC8vIGBzdXBlcmAgc2luY2Ugd2UgYXJlIG91dHNpZGUgb2YgdGhlIENsYXNzXG4gICAgd2hpbGUoY29udGV4dCl7XG4gICAgICAgIGNvbnRleHQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoY29udGV4dCk7XG4gICAgICAgIGlmKCFjb250ZXh0KXsgYnJlYWs7IH1cbiAgICAgICAgLy8gc2tpcCBwcm90b3R5cGVzIHdpdGhvdXQgYSB0ZW1wbGF0ZVxuICAgICAgICAvLyAoZWxzZSBpdCB3aWxsIHB1bGwgYW4gaW5oZXJpdGVkIHRlbXBsYXRlIGFuZCBjYXVzZSBkdXBsaWNhdGVzKVxuICAgICAgICBpZihjb250ZXh0Lmhhc093blByb3BlcnR5KCd0ZW1wbGF0ZVN0cmluZycpIHx8IGNvbnRleHQuaGFzT3duUHJvcGVydHkoJ3RlbXBsYXRlSWQnKSkge1xuICAgICAgICAgICAgdGVtcGxhdGUgPSBjb250ZXh0LmdldFRlbXBsYXRlTm9kZSgpO1xuICAgICAgICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGVzLnB1c2godGVtcGxhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0ZW1wbGF0ZXM7XG59O1xuXG5CYXNlQ29tcG9uZW50LmFkZFBsdWdpbih7XG4gICAgbmFtZTogJ3RlbXBsYXRlJyxcbiAgICBvcmRlcjogMjAsXG4gICAgcHJlQ29ubmVjdGVkOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICBpbnNlcnQobm9kZSk7XG4gICAgfVxufSk7IiwiLyogVU1ELmRlZmluZSAqLyAoZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgICBpZiAodHlwZW9mIGN1c3RvbUxvYWRlciA9PT0gJ2Z1bmN0aW9uJyl7IGN1c3RvbUxvYWRlcihmYWN0b3J5LCAnZGF0ZXMnKTsgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCl7IGRlZmluZShbXSwgZmFjdG9yeSk7IH1cbiAgICBlbHNlIGlmKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jyl7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpOyB9XG4gICAgZWxzZXsgcm9vdC5yZXR1cm5FeHBvcnRzID0gZmFjdG9yeSgpO1xuICAgICAgICB3aW5kb3cuZGF0ZXMgPSBmYWN0b3J5KCk7IH1cbn0odGhpcywgZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIC8vIGRhdGVzLmpzXG4gICAgLy8gIGRhdGUgaGVscGVyIGxpYlxuICAgIC8vXG4gICAgdmFyXG4gICAgICAgIC8vIHRlc3RzIHRoYXQgaXQgaXMgYSBkYXRlIHN0cmluZywgbm90IGEgdmFsaWQgZGF0ZS4gODgvODgvODg4OCB3b3VsZCBiZSB0cnVlXG4gICAgICAgIGRhdGVSZWdFeHAgPSAvXihcXGR7MSwyfSkoW1xcLy1dKShcXGR7MSwyfSkoW1xcLy1dKShcXGR7NH0pXFxiLyxcbiAgICAgICAgLy8gMjAxNS0wNS0yNlQwMDowMDowMFxuICAgICAgICB0c1JlZ0V4cCA9IC9eKFxcZHs0fSktKFxcZHsyfSktKFxcZHsyfSlUKFxcZHsyfSk6KFxcZHsyfSk6KFxcZHsyfSlcXGIvLFxuXG4gICAgICAgIGRheXNPZldlZWsgPSBbJ1N1bmRheScsICdNb25kYXknLCAnVHVlc2RheScsICdXZWRuZXNkYXknLCAnVGh1cnNkYXknLCAnRnJpZGF5JywgJ1NhdHVyZGF5J10sXG4gICAgICAgIGRheXMgPSBbXSxcbiAgICAgICAgZGF5czMgPSBbXSxcbiAgICAgICAgZGF5RGljdCA9IHt9LFxuXG4gICAgICAgIG1vbnRocyA9IFsnSmFudWFyeScsICdGZWJydWFyeScsICdNYXJjaCcsICdBcHJpbCcsICdNYXknLCAnSnVuZScsICdKdWx5JywgJ0F1Z3VzdCcsICdTZXB0ZW1iZXInLCAnT2N0b2JlcicsICdOb3ZlbWJlcicsICdEZWNlbWJlciddLFxuICAgICAgICBtb250aExlbmd0aHMgPSBbMzEsIDI4LCAzMSwgMzAsIDMxLCAzMCwgMzEsIDMxLCAzMCwgMzEsIDMwLCAzMV0sXG4gICAgICAgIG1vbnRoQWJiciA9IFtdLFxuICAgICAgICBtb250aERpY3QgPSB7fSxcblxuICAgICAgICBkYXRlUGF0dGVybiA9IC95eXl5fHl5fG1tfG18TU18TXxkZHxkL2csXG4gICAgICAgIGRhdGVQYXR0ZXJuTGlicmFyeSA9IHtcbiAgICAgICAgICAgIHl5eXk6IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZS5nZXRGdWxsWWVhcigpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHl5OiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChkYXRlLmdldEZ1bGxZZWFyKCkgKyAnJykuc3Vic3RyaW5nKDIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1tOiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhZChkYXRlLmdldE1vbnRoKCkgKyAxKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtOiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGUuZ2V0TW9udGgoKSArIDE7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgTU06IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbW9udGhzW2RhdGUuZ2V0TW9udGgoKV07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgTTogZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBtb250aEFiYnJbZGF0ZS5nZXRNb250aCgpXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZDogZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYWQoZGF0ZS5nZXREYXRlKCkpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGQ6IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZS5nZXREYXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGF0ZXMsXG5cbiAgICAgICAgbGVuZ3RoID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyXG4gICAgICAgICAgICAgICAgc2VjID0gMTAwMCxcbiAgICAgICAgICAgICAgICBtaW4gPSBzZWMgKiA2MCxcbiAgICAgICAgICAgICAgICBociA9IG1pbiAqIDYwLFxuICAgICAgICAgICAgICAgIGRheSA9IGhyICogMjQsXG4gICAgICAgICAgICAgICAgd2VlayA9IGRheSAqIDc7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHNlYzogc2VjLFxuICAgICAgICAgICAgICAgIG1pbjogbWluLFxuICAgICAgICAgICAgICAgIGhyOiBocixcbiAgICAgICAgICAgICAgICBkYXk6IGRheSxcbiAgICAgICAgICAgICAgICB3ZWVrOiB3ZWVrXG4gICAgICAgICAgICB9O1xuICAgICAgICB9KCkpO1xuXG4gICAgLy8gcG9wdWxhdGUgZGF5LXJlbGF0ZWQgc3RydWN0dXJlc1xuICAgIGRheXNPZldlZWsuZm9yRWFjaChmdW5jdGlvbihkYXksIGluZGV4KSB7XG4gICAgICAgIGRheURpY3RbZGF5XSA9IGluZGV4O1xuICAgICAgICB2YXIgYWJiciA9IGRheS5zdWJzdHIoMCwgMik7XG4gICAgICAgIGRheXMucHVzaChhYmJyKTtcbiAgICAgICAgZGF5RGljdFthYmJyXSA9IGluZGV4O1xuICAgICAgICBhYmJyID0gZGF5LnN1YnN0cigwLCAzKTtcbiAgICAgICAgZGF5czMucHVzaChhYmJyKTtcbiAgICAgICAgZGF5RGljdFthYmJyXSA9IGluZGV4O1xuICAgIH0pO1xuXG4gICAgLy8gcG9wdWxhdGUgbW9udGgtcmVsYXRlZCBzdHJ1Y3R1cmVzXG4gICAgbW9udGhzLmZvckVhY2goZnVuY3Rpb24obW9udGgsIGluZGV4KSB7XG4gICAgICAgIG1vbnRoRGljdFttb250aF0gPSBpbmRleDtcbiAgICAgICAgdmFyIGFiYnIgPSBtb250aC5zdWJzdHIoMCwgMyk7XG4gICAgICAgIG1vbnRoQWJici5wdXNoKGFiYnIpO1xuICAgICAgICBtb250aERpY3RbYWJicl0gPSBpbmRleDtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGlzTGVhcFllYXIoZGF0ZU9yWWVhcikge1xuICAgICAgICB2YXIgeWVhciA9IGRhdGVPclllYXIgaW5zdGFuY2VvZiBEYXRlID8gZGF0ZU9yWWVhci5nZXRGdWxsWWVhcigpIDogZGF0ZU9yWWVhcjtcbiAgICAgICAgcmV0dXJuICEoeWVhciAlIDQwMCkgfHwgKCEoeWVhciAlIDQpICYmICEhKHllYXIgJSAxMDApKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1ZhbGlkT2JqZWN0IChkYXRlKSB7XG4gICAgICAgIHZhciBtcztcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlID09PSAnb2JqZWN0JyAmJiBkYXRlIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICAgICAgbXMgPSBkYXRlLmdldFRpbWUoKTtcbiAgICAgICAgICAgIHJldHVybiAhaXNOYU4obXMpICYmIG1zID4gMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNEYXRlVHlwZSh2YWx1ZSkge1xuICAgICAgICB2YXIgcGFydHMsIGRheSwgbW9udGgsIHllYXIsIGhvdXJzLCBtaW51dGVzLCBzZWNvbmRzLCBtcztcbiAgICAgICAgc3dpdGNoICh0eXBlb2YgdmFsdWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGlzVmFsaWRPYmplY3QodmFsdWUpO1xuICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICAvLyBpcyBpdCBhIGRhdGUgaW4gVVMgZm9ybWF0P1xuICAgICAgICAgICAgICAgIHBhcnRzID0gZGF0ZVJlZ0V4cC5leGVjKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAocGFydHMgJiYgcGFydHNbMl0gPT09IHBhcnRzWzRdKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vbnRoID0gK3BhcnRzWzFdO1xuICAgICAgICAgICAgICAgICAgICBkYXkgPSArcGFydHNbM107XG4gICAgICAgICAgICAgICAgICAgIHllYXIgPSArcGFydHNbNV07XG4gICAgICAgICAgICAgICAgICAgIC8vIHJvdWdoIGNoZWNrIG9mIGEgeWVhclxuICAgICAgICAgICAgICAgICAgICBpZiAoMCA8IHllYXIgJiYgeWVhciA8IDIxMDAgJiYgMSA8PSBtb250aCAmJiBtb250aCA8PSAxMiAmJiAxIDw9IGRheSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgZGF5IDw9IChtb250aCA9PT0gMiAmJiBpc0xlYXBZZWFyKHllYXIpID8gMjkgOiBtb250aExlbmd0aHNbbW9udGggLSAxXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGlzIGl0IGEgdGltZXN0YW1wIGluIGEgc3RhbmRhcmQgZm9ybWF0P1xuICAgICAgICAgICAgICAgIHBhcnRzID0gdHNSZWdFeHAuZXhlYyh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHllYXIgPSArcGFydHNbMV07XG4gICAgICAgICAgICAgICAgICAgIG1vbnRoID0gK3BhcnRzWzJdO1xuICAgICAgICAgICAgICAgICAgICBkYXkgPSArcGFydHNbM107XG4gICAgICAgICAgICAgICAgICAgIGhvdXJzID0gK3BhcnRzWzRdO1xuICAgICAgICAgICAgICAgICAgICBtaW51dGVzID0gK3BhcnRzWzVdO1xuICAgICAgICAgICAgICAgICAgICBzZWNvbmRzID0gK3BhcnRzWzZdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoMCA8IHllYXIgJiYgeWVhciA8IDIxMDAgJiYgMSA8PSBtb250aCAmJiBtb250aCA8PSAxMiAmJiAxIDw9IGRheSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgZGF5IDw9IChtb250aCA9PT0gMiAmJiBpc0xlYXBZZWFyKHllYXIpID8gMjkgOiBtb250aExlbmd0aHNbbW9udGggLSAxXSkgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvdXJzIDwgMjQgJiYgbWludXRlcyA8IDYwICYmIHNlY29uZHMgPCA2MCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBpbnRlbnRpb25hbCBmYWxsLWRvd25cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFkKG51bSkge1xuICAgICAgICByZXR1cm4gKG51bSA8IDEwID8gJzAnIDogJycpICsgbnVtO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1vbnRoKGRhdGVPckluZGV4KSB7XG4gICAgICAgIHJldHVybiB0eXBlb2YgZGF0ZU9ySW5kZXggPT09ICdudW1iZXInID8gZGF0ZU9ySW5kZXggOiBkYXRlT3JJbmRleC5nZXRNb250aCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1vbnRoSW5kZXgobmFtZSkge1xuICAgICAgICAvLyBUT0RPOiBkbyB3ZSByZWFsbHkgd2FudCBhIDAtYmFzZWQgaW5kZXg/IG9yIHNob3VsZCBpdCBiZSBhIDEtYmFzZWQgb25lP1xuICAgICAgICB2YXIgaW5kZXggPSBtb250aERpY3RbbmFtZV07XG4gICAgICAgIHJldHVybiB0eXBlb2YgaW5kZXggPT09ICdudW1iZXInID8gaW5kZXggOiB2b2lkIDA7XG4gICAgICAgIC8vIFRPRE86IHdlIHJldHVybiB1bmRlZmluZWQgZm9yIHdyb25nIG1vbnRoIG5hbWVzIC0tLSBpcyBpdCByaWdodD9cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNb250aE5hbWUoZGF0ZSkge1xuICAgICAgICByZXR1cm4gbW9udGhzW2dldE1vbnRoKGRhdGUpXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRGaXJzdFN1bmRheShkYXRlKSB7XG4gICAgICAgIC8vIFRPRE86IHdoYXQgZG9lcyBpdCByZXR1cm4/IGEgbmVnYXRpdmUgaW5kZXggcmVsYXRlZCB0byB0aGUgMXN0IG9mIHRoZSBtb250aD9cbiAgICAgICAgdmFyIGQgPSBuZXcgRGF0ZShkYXRlLmdldFRpbWUoKSk7XG4gICAgICAgIGQuc2V0RGF0ZSgxKTtcbiAgICAgICAgcmV0dXJuIC1kLmdldERheSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldERheXNJblByZXZNb250aChkYXRlKSB7XG4gICAgICAgIHZhciBkID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgIGQuc2V0TW9udGgoZC5nZXRNb250aCgpIC0gMSk7XG4gICAgICAgIHJldHVybiBnZXREYXlzSW5Nb250aChkKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXREYXlzSW5Nb250aChkYXRlKSB7XG4gICAgICAgIHZhciBtb250aCA9IGRhdGUuZ2V0TW9udGgoKTtcbiAgICAgICAgcmV0dXJuIG1vbnRoID09PSAxICYmIGlzTGVhcFllYXIoZGF0ZSkgPyAyOSA6IG1vbnRoTGVuZ3Roc1ttb250aF07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3RyVG9EYXRlKHN0cikge1xuICAgICAgICBpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGVzLnRpbWVzdGFtcC5pcyhzdHIpKSB7XG4gICAgICAgICAgICAvLyAyMDAwLTAyLTI5VDAwOjAwOjAwXG4gICAgICAgICAgICByZXR1cm4gZGF0ZXMudGltZXN0YW1wLmZyb20oc3RyKTtcbiAgICAgICAgfVxuICAgICAgICAvLyAxMS8yMC8yMDAwXG4gICAgICAgIHZhciBwYXJ0cyA9IGRhdGVSZWdFeHAuZXhlYyhzdHIpO1xuICAgICAgICBpZiAocGFydHMgJiYgcGFydHNbMl0gPT09IHBhcnRzWzRdKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoK3BhcnRzWzVdLCArcGFydHNbMV0gLSAxLCArcGFydHNbM10pO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE86IHdoYXQgdG8gcmV0dXJuIGZvciBhbiBpbnZhbGlkIGRhdGU/IG51bGw/XG4gICAgICAgIHJldHVybiBuZXcgRGF0ZSgtMSk7IC8vIGludmFsaWQgZGF0ZVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZvcm1hdERhdGVQYXR0ZXJuKGRhdGUsIHBhdHRlcm4pIHtcbiAgICAgICAgLy8gJ00gZCwgeXl5eScgRGVjIDUsIDIwMTVcbiAgICAgICAgLy8gJ01NIGRkIHl5JyBEZWNlbWJlciAwNSAxNVxuICAgICAgICAvLyAnbS1kLXl5JyAxLTEtMTVcbiAgICAgICAgLy8gJ21tLWRkLXl5eXknIDAxLTAxLTIwMTVcbiAgICAgICAgLy8gJ20vZC95eScgMTIvMjUvMTVcblxuICAgICAgICByZXR1cm4gcGF0dGVybi5yZXBsYWNlKGRhdGVQYXR0ZXJuLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0ZVBhdHRlcm5MaWJyYXJ5W25hbWVdKGRhdGUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmb3JtYXREYXRlKGRhdGUsIGRlbGltaXRlck9yUGF0dGVybikge1xuICAgICAgICBpZiAoZGVsaW1pdGVyT3JQYXR0ZXJuICYmIGRlbGltaXRlck9yUGF0dGVybi5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0RGF0ZVBhdHRlcm4oZGF0ZSwgZGVsaW1pdGVyT3JQYXR0ZXJuKTtcbiAgICAgICAgfVxuICAgICAgICB2YXJcbiAgICAgICAgICAgIGRlbCA9IGRlbGltaXRlck9yUGF0dGVybiB8fCAnLycsXG4gICAgICAgICAgICB5ID0gZGF0ZS5nZXRGdWxsWWVhcigpLFxuICAgICAgICAgICAgbSA9IGRhdGUuZ2V0TW9udGgoKSArIDEsXG4gICAgICAgICAgICBkID0gZGF0ZS5nZXREYXRlKCk7XG5cbiAgICAgICAgcmV0dXJuIFtwYWQobSksIHBhZChkKSwgeV0uam9pbihkZWwpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRhdGVUb1N0cihkYXRlLCBkZWxpbWl0ZXIpIHtcbiAgICAgICAgcmV0dXJuIGZvcm1hdERhdGUoZGF0ZSwgZGVsaW1pdGVyKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmb3JtYXRUaW1lKGRhdGUsIHVzZVBlcmlvZCkge1xuICAgICAgICBpZiAodHlwZW9mIGRhdGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBkYXRlID0gc3RyVG9EYXRlKGRhdGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyXG4gICAgICAgICAgICBwZXJpb2QgPSAnQU0nLFxuICAgICAgICAgICAgaG91cnMgPSBkYXRlLmdldEhvdXJzKCksXG4gICAgICAgICAgICBtaW51dGVzID0gZGF0ZS5nZXRNaW51dGVzKCksXG4gICAgICAgICAgICByZXR2YWwsXG4gICAgICAgICAgICBzZWNvbmRzID0gZGF0ZS5nZXRTZWNvbmRzKCk7XG5cbiAgICAgICAgaWYgKGhvdXJzID4gMTEpIHtcbiAgICAgICAgICAgIGhvdXJzIC09IDEyO1xuICAgICAgICAgICAgcGVyaW9kID0gJ1BNJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaG91cnMgPT09IDApIHtcbiAgICAgICAgICAgIGhvdXJzID0gMTI7XG4gICAgICAgIH1cblxuICAgICAgICByZXR2YWwgPSBob3VycyArICc6JyArIHBhZChtaW51dGVzKSArICc6JyArIHBhZChzZWNvbmRzKTtcblxuICAgICAgICBpZiAodXNlUGVyaW9kID09IHRydWUpIHtcbiAgICAgICAgICAgIHJldHZhbCA9IHJldHZhbCArICcgJyArIHBlcmlvZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVyaW9kKGRhdGUpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZGF0ZSA9IHN0clRvRGF0ZShkYXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBob3VycyA9IGRhdGUuZ2V0SG91cnMoKTtcblxuICAgICAgICByZXR1cm4gaG91cnMgPiAxMSA/ICdQTScgOiAnQU0nO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRvSVNPKGRhdGUsIGluY2x1ZGVUWikge1xuICAgICAgICB2YXJcbiAgICAgICAgICAgIHN0cixcbiAgICAgICAgICAgIG5vdyA9IG5ldyBEYXRlKCksXG4gICAgICAgICAgICB0aGVuID0gbmV3IERhdGUoZGF0ZS5nZXRUaW1lKCkpO1xuICAgICAgICB0aGVuLnNldEhvdXJzKG5vdy5nZXRIb3VycygpKTtcbiAgICAgICAgc3RyID0gdGhlbi50b0lTT1N0cmluZygpO1xuICAgICAgICBpZiAoIWluY2x1ZGVUWikge1xuICAgICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCcuJylbMF07XG4gICAgICAgICAgICBzdHIgKz0gJy4wMFonO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbmF0dXJhbChkYXRlKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZGF0ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGRhdGUgPSB0aGlzLmZyb20oZGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXJcbiAgICAgICAgICAgIHllYXIgPSBkYXRlLmdldEZ1bGxZZWFyKCkudG9TdHJpbmcoKS5zdWJzdHIoMiksXG4gICAgICAgICAgICBtb250aCA9IGRhdGUuZ2V0TW9udGgoKSArIDEsXG4gICAgICAgICAgICBkYXkgPSBkYXRlLmdldERhdGUoKSxcbiAgICAgICAgICAgIGhvdXJzID0gZGF0ZS5nZXRIb3VycygpLFxuICAgICAgICAgICAgbWludXRlcyA9IGRhdGUuZ2V0TWludXRlcygpLFxuICAgICAgICAgICAgcGVyaW9kID0gJ0FNJztcblxuICAgICAgICBpZiAoaG91cnMgPiAxMSkge1xuICAgICAgICAgICAgaG91cnMgLT0gMTI7XG4gICAgICAgICAgICBwZXJpb2QgPSAnUE0nO1xuICAgICAgICB9XG4gICAgICAgIGlmIChob3VycyA9PT0gMCkge1xuICAgICAgICAgICAgaG91cnMgPSAxMjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBob3VycyArICc6JyArIHBhZChtaW51dGVzKSArICcgJyArIHBlcmlvZCArICcgb24gJyArIHBhZChtb250aCkgKyAnLycgKyBwYWQoZGF5KSArICcvJyArIHllYXI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkRGF5cyAoZGF0ZSwgZGF5cykge1xuICAgICAgICBjb25zb2xlLndhcm4oJ2FkZERheXMgaXMgZGVwcmVjYXRlZC4gSW5zdGVhZCwgdXNlIGBhZGRgJyk7XG4gICAgICAgIHJldHVybiBhZGQoZGF0ZSwgZGF5cyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkIChkYXRlLCBhbW91bnQsIGRhdGVUeXBlKSB7XG4gICAgICAgIHJldHVybiBzdWJ0cmFjdChkYXRlLCAtYW1vdW50LCBkYXRlVHlwZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3VidHJhY3QoZGF0ZSwgYW1vdW50LCBkYXRlVHlwZSkge1xuICAgICAgICAvLyBzdWJ0cmFjdCBOIGRheXMgZnJvbSBkYXRlXG4gICAgICAgIHZhclxuICAgICAgICAgICAgdGltZSA9IGRhdGUuZ2V0VGltZSgpLFxuICAgICAgICAgICAgdG1wID0gbmV3IERhdGUodGltZSk7XG5cbiAgICAgICAgaWYoZGF0ZVR5cGUgPT09ICdtb250aCcpe1xuICAgICAgICAgICAgdG1wLnNldE1vbnRoKHRtcC5nZXRNb250aCgpIC0gYW1vdW50KTtcbiAgICAgICAgICAgIHJldHVybiB0bXA7XG4gICAgICAgIH1cbiAgICAgICAgaWYoZGF0ZVR5cGUgPT09ICd5ZWFyJyl7XG4gICAgICAgICAgICB0bXAuc2V0RnVsbFllYXIodG1wLmdldEZ1bGxZZWFyKCkgLSBhbW91bnQpO1xuICAgICAgICAgICAgcmV0dXJuIHRtcDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXcgRGF0ZSh0aW1lIC0gbGVuZ3RoLmRheSAqIGFtb3VudCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3VidHJhY3REYXRlKGRhdGUxLCBkYXRlMiwgZGF0ZVR5cGUpIHtcbiAgICAgICAgLy8gZGF0ZVR5cGU6IHdlZWssIGRheSwgaHIsIG1pbiwgc2VjXG4gICAgICAgIC8vIHBhc3QgZGF0ZXMgaGF2ZSBhIHBvc2l0aXZlIHZhbHVlXG4gICAgICAgIC8vIGZ1dHVyZSBkYXRlcyBoYXZlIGEgbmVnYXRpdmUgdmFsdWVcblxuICAgICAgICB2YXIgZGl2aWRlQnkgPSB7XG4gICAgICAgICAgICAgICAgd2VlazogbGVuZ3RoLndlZWssXG4gICAgICAgICAgICAgICAgZGF5OiBsZW5ndGguZGF5LFxuICAgICAgICAgICAgICAgIGhyOiBsZW5ndGguaHIsXG4gICAgICAgICAgICAgICAgbWluOiBsZW5ndGgubWluLFxuICAgICAgICAgICAgICAgIHNlYzogbGVuZ3RoLnNlY1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHV0YzEgPSBEYXRlLlVUQyhkYXRlMS5nZXRGdWxsWWVhcigpLCBkYXRlMS5nZXRNb250aCgpLCBkYXRlMS5nZXREYXRlKCkpLFxuICAgICAgICAgICAgdXRjMiA9IERhdGUuVVRDKGRhdGUyLmdldEZ1bGxZZWFyKCksIGRhdGUyLmdldE1vbnRoKCksIGRhdGUyLmdldERhdGUoKSk7XG5cbiAgICAgICAgZGF0ZVR5cGUgPSBkYXRlVHlwZS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKCh1dGMyIC0gdXRjMSkgLyBkaXZpZGVCeVtkYXRlVHlwZV0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzTGVzcyAoZDEsIGQyKSB7XG4gICAgICAgIGlmKGlzVmFsaWRPYmplY3QoZDEpICYmIGlzVmFsaWRPYmplY3QoZDIpKXtcbiAgICAgICAgICAgIHJldHVybiBkMS5nZXRUaW1lKCkgPCBkMi5nZXRUaW1lKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzR3JlYXRlciAoZDEsIGQyKSB7XG4gICAgICAgIGlmKGlzVmFsaWRPYmplY3QoZDEpICYmIGlzVmFsaWRPYmplY3QoZDIpKXtcbiAgICAgICAgICAgIHJldHVybiBkMS5nZXRUaW1lKCkgPiBkMi5nZXRUaW1lKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpZmYoZGF0ZTEsIGRhdGUyKSB7XG4gICAgICAgIC8vIHJldHVybiB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIDIgZGF0ZXMgaW4gZGF5c1xuICAgICAgICB2YXIgdXRjMSA9IERhdGUuVVRDKGRhdGUxLmdldEZ1bGxZZWFyKCksIGRhdGUxLmdldE1vbnRoKCksIGRhdGUxLmdldERhdGUoKSksXG4gICAgICAgICAgICB1dGMyID0gRGF0ZS5VVEMoZGF0ZTIuZ2V0RnVsbFllYXIoKSwgZGF0ZTIuZ2V0TW9udGgoKSwgZGF0ZTIuZ2V0RGF0ZSgpKTtcblxuICAgICAgICByZXR1cm4gTWF0aC5hYnMoTWF0aC5mbG9vcigodXRjMiAtIHV0YzEpIC8gbGVuZ3RoLmRheSkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvcHkgKGRhdGUpIHtcbiAgICAgICAgaWYoaXNWYWxpZE9iamVjdChkYXRlKSl7XG4gICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoZGF0ZS5nZXRUaW1lKCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE5hdHVyYWxEYXkoZGF0ZSwgY29tcGFyZURhdGUsIG5vRGF5c09mV2Vlaykge1xuXG4gICAgICAgIHZhclxuICAgICAgICAgICAgdG9kYXkgPSBjb21wYXJlRGF0ZSB8fCBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgZGF5c0FnbyA9IHN1YnRyYWN0RGF0ZShkYXRlLCB0b2RheSwgJ2RheScpO1xuXG4gICAgICAgIGlmICghZGF5c0Fnbykge1xuICAgICAgICAgICAgcmV0dXJuICdUb2RheSc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRheXNBZ28gPT09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiAnWWVzdGVyZGF5JztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkYXlzQWdvID09PSAtMSkge1xuICAgICAgICAgICAgcmV0dXJuICdUb21vcnJvdyc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGF5c0FnbyA8IC0xKSB7XG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0RGF0ZShkYXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAhbm9EYXlzT2ZXZWVrICYmIGRheXNBZ28gPCBkYXlzT2ZXZWVrLmxlbmd0aCA/IGRheXNPZldlZWtbZGF0ZS5nZXREYXkoKV0gOiBmb3JtYXREYXRlKGRhdGUpO1xuICAgIH1cblxuICAgIGRhdGVzID0ge1xuICAgICAgICBtb250aHM6IHtcbiAgICAgICAgICAgIGZ1bGw6IG1vbnRocyxcbiAgICAgICAgICAgIGFiYnI6IG1vbnRoQWJicixcbiAgICAgICAgICAgIGRpY3Q6IG1vbnRoRGljdFxuICAgICAgICB9LFxuICAgICAgICBkYXlzOiB7XG4gICAgICAgICAgICBmdWxsOiBkYXlzT2ZXZWVrLFxuICAgICAgICAgICAgYWJicjogZGF5cyxcbiAgICAgICAgICAgIGFiYnIzOiBkYXlzMyxcbiAgICAgICAgICAgIGRpY3Q6IGRheURpY3RcbiAgICAgICAgfSxcbiAgICAgICAgbGVuZ3RoOiBsZW5ndGgsXG4gICAgICAgIHN1YnRyYWN0OiBzdWJ0cmFjdCxcbiAgICAgICAgYWRkOiBhZGQsXG4gICAgICAgIGFkZERheXM6IGFkZERheXMsXG4gICAgICAgIGRpZmY6IGRpZmYsXG4gICAgICAgIGNvcHk6IGNvcHksXG4gICAgICAgIGNsb25lOiBjb3B5LFxuICAgICAgICBpc0xlc3M6IGlzTGVzcyxcbiAgICAgICAgaXNHcmVhdGVyOiBpc0dyZWF0ZXIsXG4gICAgICAgIHRvSVNPOiB0b0lTTyxcbiAgICAgICAgaXNWYWxpZE9iamVjdDogaXNWYWxpZE9iamVjdCxcbiAgICAgICAgaXNWYWxpZDogaXNEYXRlVHlwZSxcbiAgICAgICAgaXNEYXRlVHlwZTogaXNEYXRlVHlwZSxcbiAgICAgICAgaXNMZWFwWWVhcjogaXNMZWFwWWVhcixcbiAgICAgICAgZ2V0TW9udGhJbmRleDogZ2V0TW9udGhJbmRleCxcbiAgICAgICAgZ2V0TW9udGhOYW1lOiBnZXRNb250aE5hbWUsXG4gICAgICAgIGdldEZpcnN0U3VuZGF5OiBnZXRGaXJzdFN1bmRheSxcbiAgICAgICAgZ2V0RGF5c0luTW9udGg6IGdldERheXNJbk1vbnRoLFxuICAgICAgICBnZXREYXlzSW5QcmV2TW9udGg6IGdldERheXNJblByZXZNb250aCxcbiAgICAgICAgZm9ybWF0RGF0ZTogZm9ybWF0RGF0ZSxcbiAgICAgICAgZm9ybWF0VGltZTogZm9ybWF0VGltZSxcbiAgICAgICAgc3RyVG9EYXRlOiBzdHJUb0RhdGUsXG4gICAgICAgIHN1YnRyYWN0RGF0ZTogc3VidHJhY3REYXRlLFxuICAgICAgICBkYXRlVG9TdHI6IGRhdGVUb1N0cixcbiAgICAgICAgcGVyaW9kOiBwZXJpb2QsXG4gICAgICAgIG5hdHVyYWw6IG5hdHVyYWwsXG4gICAgICAgIGdldE5hdHVyYWxEYXk6IGdldE5hdHVyYWxEYXksXG4gICAgICAgIHBhZDogcGFkLFxuICAgICAgICB0aW1lc3RhbXA6IHtcbiAgICAgICAgICAgIHRvOiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGUuZ2V0RnVsbFllYXIoKSArICctJyArIHBhZChkYXRlLmdldE1vbnRoKCkgKyAxKSArICctJyArIHBhZChkYXRlLmdldERhdGUoKSkgKyAnVCcgK1xuICAgICAgICAgICAgICAgICAgICBwYWQoZGF0ZS5nZXRIb3VycygpKSArICc6JyArIHBhZChkYXRlLmdldE1pbnV0ZXMoKSkgKyAnOicgKyBwYWQoZGF0ZS5nZXRTZWNvbmRzKCkpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZyb206IGZ1bmN0aW9uKHN0cikge1xuICAgICAgICAgICAgICAgIC8vIDIwMTUtMDUtMjZUMDA6MDA6MDBcblxuICAgICAgICAgICAgICAgIC8vIHN0cmlwIHRpbWV6b25lIC8vIDIwMTUtMDUtMjZUMDA6MDA6MDBaXG4gICAgICAgICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdaJylbMF07XG5cbiAgICAgICAgICAgICAgICAvLyBbXCIyMDAwLTAyLTMwVDAwOjAwOjAwXCIsIFwiMjAwMFwiLCBcIjAyXCIsIFwiMzBcIiwgXCIwMFwiLCBcIjAwXCIsIFwiMDBcIiwgaW5kZXg6IDAsIGlucHV0OiBcIjIwMDAtMDItMzBUMDA6MDA6MDBcIl1cbiAgICAgICAgICAgICAgICB2YXIgcGFydHMgPSB0c1JlZ0V4cC5leGVjKHN0cik7XG4gICAgICAgICAgICAgICAgLy8gVE9ETzogZG8gd2UgbmVlZCBhIHZhbGlkYXRpb24/XG4gICAgICAgICAgICAgICAgaWYgKHBhcnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG5ldyBEYXRlKDE5OTUsIDExLCAxNywgMywgMjQsIDApO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoK3BhcnRzWzFdLCArcGFydHNbMl0gLSAxLCArcGFydHNbM10sICtwYXJ0c1s0XSwgK3BhcnRzWzVdLCBwYXJzZUludChwYXJ0c1s2XSwgMTApKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gVE9ETzogd2hhdCBkbyB3ZSByZXR1cm4gZm9yIGFuIGludmFsaWQgZGF0ZT8gbnVsbD9cbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoLTEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlzOiBmdW5jdGlvbihzdHIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHNSZWdFeHAudGVzdChzdHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBkYXRlcztcblxufSkpOyIsInJlcXVpcmUoJy4vZGF0ZS1waWNrZXInKTtcbmNvbnN0IEJhc2VDb21wb25lbnQgPSByZXF1aXJlKCdCYXNlQ29tcG9uZW50Jyk7XG5jb25zdCBkYXRlcyA9IHJlcXVpcmUoJ2RhdGVzJyk7XG5cbmNvbnN0IGRlZmF1bHRQbGFjZWhvbGRlciA9ICdNTS9ERC9ZWVlZJztcbmNvbnN0IGRlZmF1bHRNYXNrID0gJ1hYL1hYL1hYWFgnO1xuY29uc3QgcHJvcHMgPSBbJ2xhYmVsJywgJ25hbWUnLCAncGxhY2Vob2xkZXInLCAndmFsdWUnLCAnbWFzayddO1xuY29uc3QgYm9vbHMgPSBbXTtcblxuY2xhc3MgRGF0ZUlucHV0IGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG5cblx0c3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMgKCkge1xuXHRcdHJldHVybiBbLi4ucHJvcHMsIC4uLmJvb2xzXTtcblx0fVxuXG5cdGdldCBwcm9wcyAoKSB7XG5cdFx0cmV0dXJuIHByb3BzO1xuXHR9XG5cblx0Z2V0IGJvb2xzICgpIHtcblx0XHRyZXR1cm4gYm9vbHM7XG5cdH1cblxuXHQvLyBGSVhNRVxuXHQvLyBuZWVkIHRvIG1hbmFnZSB2YWx1ZSBtYW51YWxseVxuXG5cdG9uVmFsdWUgKHZhbHVlKSB7XG5cdFx0dGhpcy5zdHJEYXRlID0gZGF0ZXMuaXNEYXRlVHlwZSh2YWx1ZSkgPyB2YWx1ZSA6ICcnO1xuXHRcdHRoaXMuc2V0VmFsdWUodGhpcy5zdHJEYXRlKTtcblx0fVxuXG5cdGdldCB2YWx1ZSAoKSB7XG5cdFx0Y29uc29sZS5sb2coJ2dldCB2YWx1ZScpO1xuXHRcdHJldHVybiB0aGlzLnN0ckRhdGU7XG5cdH1cblx0XG5cdGdldCB0ZW1wbGF0ZVN0cmluZyAoKSB7XG5cdFx0cmV0dXJuIGBcbjxsYWJlbD5cblx0PHNwYW4gcmVmPVwibGFiZWxOb2RlXCI+PC9zcGFuPlxuXHQ8aW5wdXQgcmVmPVwiaW5wdXRcIiAvPlxuXHRcbjwvbGFiZWw+XG48ZGF0ZS1waWNrZXIgcmVmPVwicGlja2VyXCIgdGFiaW5kZXg9XCIwXCI+PC9kYXRlLXBpY2tlcj5gO1xuXHR9XG5cblx0Y29uc3RydWN0b3IgKCkge1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5zaG93aW5nID0gZmFsc2U7XG5cdH1cblxuXHRzZXRWYWx1ZSAodmFsdWUpIHtcblx0XHR0aGlzLnR5cGVkVmFsdWUgPSB2YWx1ZTtcblx0XHR0aGlzLmlucHV0LnZhbHVlID0gdmFsdWU7XG5cdFx0Y29uc3QgbGVuID0gdGhpcy5pbnB1dC52YWx1ZS5sZW5ndGggPT09IHRoaXMubWFzay5sZW5ndGg7XG5cdFx0bGV0IHZhbGlkO1xuXHRcdGlmIChsZW4pIHtcblx0XHRcdHZhbGlkID0gZGF0ZXMuaXNWYWxpZCh2YWx1ZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHZhbGlkID0gdHJ1ZTtcblx0XHR9XG5cdFx0ZG9tLmNsYXNzTGlzdC50b2dnbGUodGhpcywgJ2ludmFsaWQnLCAhdmFsaWQpO1xuXHRcdGlmKHZhbGlkICYmIGxlbil7XG5cdFx0XHQvL3RoaXMudmFsdWUgPSB2YWx1ZTtcblx0XHRcdHRoaXMucGlja2VyLnZhbHVlID0gdmFsdWU7XG5cdFx0XHR0aGlzLmVtaXQoJ2NoYW5nZScsIHt2YWx1ZTogdmFsdWV9KTtcblx0XHR9XG5cdH1cblxuXHRmb3JtYXQgKHMpIHtcblx0XHRmdW5jdGlvbiBzdWIgKHBvcykge1xuXHRcdFx0bGV0IHN1YlN0ciA9ICcnO1xuXHRcdFx0Zm9yKGxldCBpID0gcG9zOyBpIDwgbWFzay5sZW5ndGg7IGkrKyl7XG5cdFx0XHRcdGlmKG1hc2tbaV0gPT09ICdYJyl7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdFx0c3ViU3RyICs9IG1hc2tbaV07XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gc3ViU3RyO1xuXHRcdH1cblx0XHRzID0gcy5yZXBsYWNlKC9cXEQvZywgJycpO1xuXHRcdGNvbnN0IG1hc2sgPSB0aGlzLm1hc2s7XG5cdFx0bGV0IGYgPSAnJztcblx0XHRjb25zdCBsZW4gPSBNYXRoLm1pbihzLmxlbmd0aCwgdGhpcy5tYXNrTGVuZ3RoKTtcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKXtcblx0XHRcdGlmKG1hc2tbZi5sZW5ndGhdICE9PSAnWCcpe1xuXHRcdFx0XHRmICs9IHN1YihmLmxlbmd0aCk7XG5cdFx0XHR9XG5cdFx0XHRmICs9IHNbaV07XG5cdFx0fVxuXHRcdHJldHVybiBmO1xuXHR9XG5cblx0b25LZXkgKGUpIHtcblx0XHRsZXQgc3RyID0gdGhpcy50eXBlZFZhbHVlIHx8ICcnO1xuXHRcdGNvbnN0IGJlZyA9IGUudGFyZ2V0LnNlbGVjdGlvblN0YXJ0O1xuXHRcdGNvbnN0IGVuZCA9IGUudGFyZ2V0LnNlbGVjdGlvbkVuZDtcblx0XHRjb25zdCBrID0gZS5rZXk7XG5cblx0XHRmdW5jdGlvbiBzZXRTZWxlY3Rpb24gKGFtdCkge1xuXHRcdFx0Ly8gVE9ET1xuXHRcdFx0Ly8gVGhpcyBtaWdodCBub3QgYmUgZXhhY3RseSByaWdodC4uLlxuXHRcdFx0Ly8gaGF2ZSB0byBhbGxvdyBmb3IgdGhlIHNsYXNoZXNcblx0XHRcdGlmKGVuZCAtIGJlZykge1xuXHRcdFx0XHRlLnRhcmdldC5zZWxlY3Rpb25FbmQgPSBlbmQgLSAoZW5kIC0gYmVnIC0gMSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRlLnRhcmdldC5zZWxlY3Rpb25FbmQgPSBlbmQgKyBhbXQ7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYoIWlzTnVtKGspKXtcblx0XHRcdC8vIGhhbmRsZSBwYXN0ZSwgYmFja3NwYWNlXG5cdFx0XHRpZih0aGlzLmlucHV0LnZhbHVlICE9PSB0aGlzLnR5cGVkVmFsdWUpIHtcblx0XHRcdFx0dGhpcy5zZXRWYWx1ZSh0aGlzLmlucHV0LnZhbHVlKTtcblx0XHRcdH1cblx0XHRcdHNldFNlbGVjdGlvbigwKTtcblx0XHRcdHN0b3BFdmVudChlKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0aWYoc3RyLmxlbmd0aCAhPT0gZW5kIHx8IGJlZyAhPT0gZW5kKXtcblx0XHRcdC8vIGhhbmRsZSBzZWxlY3Rpb24gb3IgbWlkZGxlLXN0cmluZyBlZGl0XG5cdFx0XHRjb25zdCB0ZW1wID0gdGhpcy50eXBlZFZhbHVlLnN1YnN0cmluZygwLCBiZWcpICsgayArIHRoaXMudHlwZWRWYWx1ZS5zdWJzdHJpbmcoZW5kKTtcblx0XHRcdHRoaXMuc2V0VmFsdWUodGhpcy5mb3JtYXQodGVtcCkpO1xuXG5cdFx0XHRzZXRTZWxlY3Rpb24oMSk7XG5cdFx0XHRzdG9wRXZlbnQoZSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dGhpcy5zZXRWYWx1ZSh0aGlzLmZvcm1hdChzdHIgKyBrKSk7XG5cdH1cblxuXHRzaG93ICgpIHtcblx0XHRpZih0aGlzLnNob3dpbmcpe1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR0aGlzLnNob3dpbmcgPSB0cnVlO1xuXHRcdHRoaXMucGlja2VyLmNsYXNzTGlzdC5hZGQoJ3Nob3cnKTtcblxuXHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuXHRcdFx0Y29uc3Qgd2luID0gZG9tLmJveCh3aW5kb3cpO1xuXHRcdFx0Y29uc3QgYm94ID0gZG9tLmJveCh0aGlzLnBpY2tlcik7XG5cdFx0XHRpZihib3gueCArIGJveC53ID4gd2luLmgpe1xuXHRcdFx0XHR0aGlzLnBpY2tlci5jbGFzc0xpc3QuYWRkKCdyaWdodC1hbGlnbicpO1xuXHRcdFx0fVxuXHRcdFx0aWYoYm94LnkgKyBib3guaCA+IHdpbi5oKXtcblx0XHRcdFx0dGhpcy5waWNrZXIuY2xhc3NMaXN0LmFkZCgnYm90dG9tLWFsaWduJyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRoaWRlICgpIHtcblx0XHRpZighdGhpcy5zaG93aW5nIHx8IHdpbmRvdy5rZWVwUG9wdXBzT3Blbil7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHRoaXMuc2hvd2luZyA9IGZhbHNlO1xuXHRcdGRvbS5jbGFzc0xpc3QucmVtb3ZlKHRoaXMucGlja2VyLCAncmlnaHQtYWxpZ24gYm90dG9tLWFsaWduIHNob3cnKTtcblx0fVxuXG5cdGRvbVJlYWR5ICgpIHtcblx0XHR0aGlzLm1hc2sgPSB0aGlzLm1hc2sgfHwgZGVmYXVsdE1hc2s7XG5cdFx0dGhpcy5tYXNrTGVuZ3RoID0gdGhpcy5tYXNrLm1hdGNoKC9YL2cpLmpvaW4oJycpLmxlbmd0aDtcblxuXHRcdHRoaXMubGFiZWxOb2RlLmlubmVySFRNTCA9IHRoaXMubGFiZWwgfHwgJyc7XG5cdFx0dGhpcy5pbnB1dC5zZXRBdHRyaWJ1dGUoJ3R5cGUnLCAndGV4dCcpO1xuXHRcdHRoaXMuaW5wdXQuc2V0QXR0cmlidXRlKCdwbGFjZWhvbGRlcicsIHRoaXMucGxhY2Vob2xkZXIgfHwgZGVmYXVsdFBsYWNlaG9sZGVyKTtcblx0XHR0aGlzLnBpY2tlci5vbignY2hhbmdlJywgKGUpID0+IHtcblx0XHRcdHRoaXMuc2V0VmFsdWUoZS52YWx1ZSk7XG5cdFx0fSk7XG5cdFx0dGhpcy5jb25uZWN0S2V5cygpO1xuXHRcdHRoaXMucmVnaXN0ZXJIYW5kbGUoaGFuZGxlT3Blbih0aGlzLmlucHV0LCB0aGlzLnBpY2tlciwgdGhpcy5zaG93LmJpbmQodGhpcyksIHRoaXMuaGlkZS5iaW5kKHRoaXMpKSk7XG5cdH1cblxuXHRjb25uZWN0S2V5cyAoKSB7XG5cdFx0dGhpcy5vbih0aGlzLmlucHV0LCAna2V5ZG93bicsIHN0b3BFdmVudCk7XG5cdFx0dGhpcy5vbih0aGlzLmlucHV0LCAna2V5cHJlc3MnLCBzdG9wRXZlbnQpO1xuXHRcdHRoaXMub24odGhpcy5pbnB1dCwgJ2tleXVwJywgKGUpID0+IHtcblx0XHRcdHRoaXMub25LZXkoZSk7XG5cdFx0fSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlT3BlbiAoaW5wdXQsIHBpY2tlciwgc2hvdywgaGlkZSkge1xuXHRsZXQgaW5wdXRGb2N1cyA9IGZhbHNlO1xuXHRsZXQgcGlja2VyRm9jdXMgPSBmYWxzZTtcblx0Y29uc3QgZG9jSGFuZGxlID0gb24oZG9jdW1lbnQsICdrZXl1cCcsIChlKSA9PiB7XG5cdFx0aWYoZS5rZXkgPT09ICdFc2NhcGUnKXtcblx0XHRcdGhpZGUoKTtcblx0XHR9XG5cdH0pO1xuXHRkb2NIYW5kbGUucGF1c2UoKTtcblx0cmV0dXJuIG9uLm1ha2VNdWx0aUhhbmRsZShbXG5cdFx0b24oaW5wdXQsICdmb2N1cycsICgpID0+IHtcblx0XHRcdGlucHV0Rm9jdXMgPSB0cnVlO1xuXHRcdFx0c2hvdygpO1xuXHRcdFx0ZG9jSGFuZGxlLnJlc3VtZSgpO1xuXHRcdH0pLFxuXHRcdG9uKGlucHV0LCAnYmx1cicsICgpID0+IHtcblx0XHRcdGlucHV0Rm9jdXMgPSBmYWxzZTtcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHRpZighcGlja2VyRm9jdXMpe1xuXHRcdFx0XHRcdGhpZGUoKTtcblx0XHRcdFx0XHRkb2NIYW5kbGUucGF1c2UoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSwgMTAwKTtcblx0XHR9KSxcblx0XHRvbihwaWNrZXIsICdmb2N1cycsICgpID0+IHtcblx0XHRcdHBpY2tlckZvY3VzID0gdHJ1ZTtcblx0XHRcdHNob3coKTtcblx0XHRcdGRvY0hhbmRsZS5yZXN1bWUoKTtcblx0XHR9KSxcblx0XHRvbihwaWNrZXIsICdibHVyJywgKCkgPT4ge1xuXHRcdFx0cGlja2VyRm9jdXMgPSBmYWxzZTtcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHRpZighaW5wdXRGb2N1cyl7XG5cdFx0XHRcdFx0aGlkZSgpO1xuXHRcdFx0XHRcdGRvY0hhbmRsZS5wYXVzZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LCAxMDApO1xuXG5cdFx0fSlcblx0XSk7XG59XG5cbmNvbnN0IG51bVJlZyA9IC9bMDEyMzQ1Njc4OV0vO1xuZnVuY3Rpb24gaXNOdW0gKGspIHtcblx0cmV0dXJuIG51bVJlZy50ZXN0KGspO1xufVxuXG5jb25zdCBjb250cm9sID0ge1xuXHQnRW50ZXInOiAxLFxuXHQnQmFja3NwYWNlJzogMSxcblx0J0RlbGV0ZSc6IDEsXG5cdCdBcnJvd0xlZnQnOiAxLFxuXHQnQXJyb3dSaWdodCc6IDEsXG5cdCdFc2NhcGUnOiAxLFxuXHQnQ29tbWFuZCc6IDEsXG5cdCdUYWInOiAxXG59O1xuZnVuY3Rpb24gc3RvcEV2ZW50IChlKSB7XG5cdGlmKGUubWV0YUtleSB8fCBjb250cm9sW2Uua2V5XSl7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGUucHJldmVudERlZmF1bHQoKTtcblx0ZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdkYXRlLWlucHV0JywgRGF0ZUlucHV0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBEYXRlSW5wdXQ7IiwicmVxdWlyZSgnQmFzZUNvbXBvbmVudC9zcmMvcHJvcGVydGllcycpO1xucmVxdWlyZSgnQmFzZUNvbXBvbmVudC9zcmMvdGVtcGxhdGUnKTtcbnJlcXVpcmUoJ0Jhc2VDb21wb25lbnQvc3JjL3JlZnMnKTtcbmNvbnN0IEJhc2VDb21wb25lbnQgPSByZXF1aXJlKCdCYXNlQ29tcG9uZW50Jyk7XG5jb25zdCBkYXRlcyA9IHJlcXVpcmUoJ2RhdGVzJyk7XG5cbmNvbnN0IHByb3BzID0gW107XG5cbi8vIHJhbmdlLWxlZnQvcmFuZ2UtcmlnaHQgbWVhbiB0aGF0IHRoaXMgaXMgb25lIHNpZGUgb2YgYSBkYXRlLXJhbmdlLXBpY2tlclxuY29uc3QgYm9vbHMgPSBbJ3JhbmdlLXBpY2tlcicsICdyYW5nZS1sZWZ0JywgJ3JhbmdlLXJpZ2h0J107XG5cbmNsYXNzIERhdGVQaWNrZXIgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblxuXHRzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcyAoKSB7XG5cdFx0cmV0dXJuIFsuLi5wcm9wcywgLi4uYm9vbHNdO1xuXHR9XG5cblx0Z2V0IHByb3BzICgpIHtcblx0XHRyZXR1cm4gcHJvcHM7XG5cdH1cblxuXHRnZXQgYm9vbHMgKCkge1xuXHRcdHJldHVybiBib29scztcblx0fVxuXG5cdGdldCB0ZW1wbGF0ZVN0cmluZyAoKSB7XG5cdFx0cmV0dXJuIGBcbjxkaXYgY2xhc3M9XCJjYWxlbmRhclwiIHJlZj1cImNhbE5vZGVcIj5cbjxkaXYgY2xhc3M9XCJjYWwtaGVhZGVyXCIgcmVmPVwiaGVhZGVyTm9kZVwiPlxuXHQ8c3BhbiBjbGFzcz1cImNhbC1sZnRcIiByZWY9XCJsZnROb2RlXCI+PC9zcGFuPlxuXHQ8c3BhbiBjbGFzcz1cImNhbC1tb250aFwiIHJlZj1cIm1vbnRoTm9kZVwiPjwvc3Bhbj5cblx0PHNwYW4gY2xhc3M9XCJjYWwtcmd0XCIgcmVmPVwicmd0Tm9kZVwiPjwvc3Bhbj5cbjwvZGl2PlxuPGRpdiBjbGFzcz1cImNhbC1jb250YWluZXJcIiByZWY9XCJjb250YWluZXJcIj48L2Rpdj5cbjxkaXYgY2xhc3M9XCJjYWwtZm9vdGVyXCI+XG5cdDxhIGhyZWY9XCJqYXZhc2NyaXB0OnZvaWQoMCk7XCIgcmVmPVwiZm9vdGVyTGlua1wiPjwvYT5cbjwvZGl2PlxuPC9kaXY+YDtcblx0fVxuXG5cdHNldCB2YWx1ZSAodmFsdWUpIHtcblx0XHQvLyBtaWdodCBuZWVkIGF0dHJpYnV0ZUNoYW5nZWRcblx0XHR0aGlzLnZhbHVlRGF0ZSA9IGRhdGVzLmlzRGF0ZVR5cGUodmFsdWUpID8gZGF0ZXMuc3RyVG9EYXRlKHZhbHVlKSA6IHRvZGF5O1xuXHRcdHRoaXMuY3VycmVudCA9IHRoaXMudmFsdWVEYXRlO1xuXHRcdG9uRG9tUmVhZHkodGhpcywgKCkgPT4ge1xuXHRcdFx0dGhpcy5yZW5kZXIoKTtcblx0XHR9KTtcblx0fVxuXG5cdGdldCB2YWx1ZSAoKSB7XG5cdFx0aWYgKCF0aGlzLnZhbHVlRGF0ZSkge1xuXHRcdFx0Y29uc3QgdmFsdWUgPSB0aGlzLmdldEF0dHJpYnV0ZSgndmFsdWUnKSB8fCB0b2RheTtcblx0XHRcdHRoaXMudmFsdWVEYXRlID0gZGF0ZXMuc3RyVG9EYXRlKHZhbHVlKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMudmFsdWVEYXRlO1xuXHR9XG5cblx0Y29uc3RydWN0b3IgKCkge1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5jdXJyZW50ID0gbmV3IERhdGUoKTtcblx0XHR0aGlzLnByZXZpb3VzID0ge307XG5cdFx0dGhpcy5tb2RlcyA9IFsnbW9udGgnLCAneWVhcicsICdkZWNhZGUnXTtcblx0XHR0aGlzLm1vZGUgPSAwO1xuXHR9XG5cblx0c2V0RGlzcGxheSAoLi4uYXJncy8qeWVhciwgbW9udGgqLykge1xuXHRcdGlmIChhcmdzLmxlbmd0aCA9PT0gMikge1xuXHRcdFx0dGhpcy5jdXJyZW50LnNldEZ1bGxZZWFyKGFyZ3NbMF0pO1xuXHRcdFx0dGhpcy5jdXJyZW50LnNldE1vbnRoKGFyZ3NbMV0pO1xuXHRcdH0gZWxzZSBpZiAodHlwZW9mIGFyZ3NbMF0gPT09ICdvYmplY3QnKSB7XG5cdFx0XHR0aGlzLmN1cnJlbnQuc2V0RnVsbFllYXIoYXJnc1swXS5nZXRGdWxsWWVhcigpKTtcblx0XHRcdHRoaXMuY3VycmVudC5zZXRNb250aChhcmdzWzBdLmdldE1vbnRoKCkpO1xuXHRcdH0gZWxzZSBpZiAoYXJnc1swXSA+IDEyKSB7XG5cdFx0XHR0aGlzLmN1cnJlbnQuc2V0RnVsbFllYXIoYXJnc1swXSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuY3VycmVudC5zZXRNb250aChhcmdzWzBdKTtcblx0XHR9XG5cdFx0dGhpcy52YWx1ZURhdGUgPSBjb3B5KHRoaXMuY3VycmVudCk7XG5cdFx0dGhpcy5ub0V2ZW50cyA9IHRydWU7XG5cdFx0dGhpcy5yZW5kZXIoKTtcblx0fVxuXG5cdGdldEZvcm1hdHRlZFZhbHVlICgpIHtcblx0XHRyZXR1cm4gdGhpcy52YWx1ZURhdGUgPT09IHRvZGF5ID8gJycgOiAhIXRoaXMudmFsdWVEYXRlID8gZGF0ZXMuZGF0ZVRvU3RyKHRoaXMudmFsdWVEYXRlKSA6ICcnO1xuXHR9XG5cblx0ZW1pdFZhbHVlICgpIHtcblx0XHRjb25zdCBldmVudCA9IHtcblx0XHRcdHZhbHVlOiB0aGlzLmdldEZvcm1hdHRlZFZhbHVlKCksXG5cdFx0XHRkYXRlOiB0aGlzLnZhbHVlRGF0ZVxuXHRcdH07XG5cdFx0aWYgKHRoaXNbJ3JhbmdlLXBpY2tlciddKSB7XG5cdFx0XHRldmVudC5maXJzdCA9IHRoaXMuZmlyc3RSYW5nZTtcblx0XHRcdGV2ZW50LnNlY29uZCA9IHRoaXMuc2Vjb25kUmFuZ2U7XG5cdFx0fVxuXHRcdHRoaXMuZW1pdCgnY2hhbmdlJywgZXZlbnQpO1xuXHR9XG5cblx0ZW1pdERpc3BsYXlFdmVudHMgKCkge1xuXHRcdGNvbnN0IG1vbnRoID0gdGhpcy5jdXJyZW50LmdldE1vbnRoKCksXG5cdFx0XHR5ZWFyID0gdGhpcy5jdXJyZW50LmdldEZ1bGxZZWFyKCk7XG5cblx0XHRpZiAoIXRoaXMubm9FdmVudHMgJiYgKG1vbnRoICE9PSB0aGlzLnByZXZpb3VzLm1vbnRoIHx8IHllYXIgIT09IHRoaXMucHJldmlvdXMueWVhcikpIHtcblx0XHRcdHRoaXMuZmlyZSgnZGlzcGxheS1jaGFuZ2UnLCB7IG1vbnRoOiBtb250aCwgeWVhcjogeWVhciB9KTtcblx0XHR9XG5cblx0XHR0aGlzLm5vRXZlbnRzID0gZmFsc2U7XG5cdFx0dGhpcy5wcmV2aW91cyA9IHtcblx0XHRcdG1vbnRoOiBtb250aCxcblx0XHRcdHllYXI6IHllYXJcblx0XHR9O1xuXHR9XG5cblx0b25DbGlja0RheSAobm9kZSkge1xuXHRcdGNvbnN0XG5cdFx0XHRkYXkgPSArbm9kZS5pbm5lckhUTUwsXG5cdFx0XHRpc0Z1dHVyZSA9IG5vZGUuY2xhc3NMaXN0LmNvbnRhaW5zKCdmdXR1cmUnKSxcblx0XHRcdGlzUGFzdCA9IG5vZGUuY2xhc3NMaXN0LmNvbnRhaW5zKCdwYXN0Jyk7XG5cblx0XHR0aGlzLmN1cnJlbnQuc2V0RGF0ZShkYXkpO1xuXHRcdGlmIChpc0Z1dHVyZSkge1xuXHRcdFx0dGhpcy5jdXJyZW50LnNldE1vbnRoKHRoaXMuY3VycmVudC5nZXRNb250aCgpICsgMSk7XG5cdFx0fVxuXHRcdGlmIChpc1Bhc3QpIHtcblx0XHRcdHRoaXMuY3VycmVudC5zZXRNb250aCh0aGlzLmN1cnJlbnQuZ2V0TW9udGgoKSAtIDEpO1xuXHRcdH1cblxuXHRcdHRoaXMudmFsdWVEYXRlID0gY29weSh0aGlzLmN1cnJlbnQpO1xuXG5cdFx0dGhpcy5lbWl0VmFsdWUoKTtcblxuXHRcdGlmICh0aGlzWydyYW5nZS1waWNrZXInXSkge1xuXHRcdFx0dGhpcy5jbGlja1NlbGVjdFJhbmdlKCk7XG5cdFx0fVxuXG5cdFx0aWYgKGlzRnV0dXJlIHx8IGlzUGFzdCkge1xuXHRcdFx0dGhpcy5yZW5kZXIoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5zZWxlY3REYXkoKTtcblx0XHR9XG5cdH1cblxuXHRvbkNsaWNrTW9udGggKGRpcmVjdGlvbikge1xuXHRcdHN3aXRjaCAodGhpcy5tb2RlKSB7XG5cdFx0XHRjYXNlIDE6IC8vIHllYXIgbW9kZVxuXHRcdFx0XHR0aGlzLmN1cnJlbnQuc2V0RnVsbFllYXIodGhpcy5jdXJyZW50LmdldEZ1bGxZZWFyKCkgKyAoZGlyZWN0aW9uICogMSkpO1xuXHRcdFx0XHR0aGlzLnNldE1vZGUodGhpcy5tb2RlKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDI6IC8vIGNlbnR1cnkgbW9kZVxuXHRcdFx0XHR0aGlzLmN1cnJlbnQuc2V0RnVsbFllYXIodGhpcy5jdXJyZW50LmdldEZ1bGxZZWFyKCkgKyAoZGlyZWN0aW9uICogMTIpKTtcblx0XHRcdFx0dGhpcy5zZXRNb2RlKHRoaXMubW9kZSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0dGhpcy5jdXJyZW50LnNldE1vbnRoKHRoaXMuY3VycmVudC5nZXRNb250aCgpICsgKGRpcmVjdGlvbiAqIDEpKTtcblx0XHRcdFx0dGhpcy5yZW5kZXIoKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9XG5cblx0b25DbGlja1llYXIgKG5vZGUpIHtcblx0XHRjb25zdCBpbmRleCA9IGRhdGVzLmdldE1vbnRoSW5kZXgobm9kZS5pbm5lckhUTUwpO1xuXHRcdHRoaXMuY3VycmVudC5zZXRNb250aChpbmRleCk7XG5cdFx0dGhpcy5yZW5kZXIoKTtcblx0fVxuXG5cdG9uQ2xpY2tEZWNhZGUgKG5vZGUpIHtcblx0XHRjb25zdCB5ZWFyID0gK25vZGUuaW5uZXJIVE1MO1xuXHRcdHRoaXMuY3VycmVudC5zZXRGdWxsWWVhcih5ZWFyKTtcblx0XHR0aGlzLnNldE1vZGUodGhpcy5tb2RlIC0gMSk7XG5cdH1cblxuXHRzZXRNb2RlIChtb2RlKSB7XG5cdFx0ZGVzdHJveSh0aGlzLm1vZGVOb2RlKTtcblx0XHR0aGlzLm1vZGUgPSBtb2RlIHx8IDA7XG5cdFx0c3dpdGNoICh0aGlzLm1vZGVzW3RoaXMubW9kZV0pIHtcblx0XHRcdGNhc2UgJ21vbnRoJzpcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICd5ZWFyJzpcblx0XHRcdFx0dGhpcy5zZXRZZWFyTW9kZSgpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2RlY2FkZSc6XG5cdFx0XHRcdHRoaXMuc2V0RGVjYWRlTW9kZSgpO1xuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cdH1cblxuXHRzZXRZZWFyTW9kZSAoKSB7XG5cdFx0ZGVzdHJveSh0aGlzLmJvZHlOb2RlKTtcblxuXHRcdGxldCBpO1xuXHRcdGNvbnN0IG5vZGUgPSBkb20oJ2RpdicsIHsgY2xhc3M6ICdjYWwtYm9keSB5ZWFyJyB9KTtcblxuXHRcdGZvciAoaSA9IDA7IGkgPCAxMjsgaSsrKSB7XG5cdFx0XHRkb20oJ2RpdicsIHsgaHRtbDogZGF0ZXMubW9udGhzLmFiYnJbaV0sIGNsYXNzOiAneWVhcicgfSwgbm9kZSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5tb250aE5vZGUuaW5uZXJIVE1MID0gdGhpcy5jdXJyZW50LmdldEZ1bGxZZWFyKCk7XG5cdFx0dGhpcy5jb250YWluZXIuYXBwZW5kQ2hpbGQobm9kZSk7XG5cdFx0dGhpcy5tb2RlTm9kZSA9IG5vZGU7XG5cdH1cblxuXHRzZXREZWNhZGVNb2RlICgpIHtcblx0XHRsZXQgaTtcblx0XHRjb25zdCBub2RlID0gZG9tKCdkaXYnLCB7IGNsYXNzOiAnY2FsLWJvZHkgZGVjYWRlJyB9KTtcblx0XHRsZXQgeWVhciA9IHRoaXMuY3VycmVudC5nZXRGdWxsWWVhcigpIC0gNjtcblxuXHRcdGZvciAoaSA9IDA7IGkgPCAxMjsgaSsrKSB7XG5cdFx0XHRkb20oJ2RpdicsIHsgaHRtbDogeWVhciwgY2xhc3M6ICdkZWNhZGUnIH0sIG5vZGUpO1xuXHRcdFx0eWVhciArPSAxO1xuXHRcdH1cblx0XHR0aGlzLm1vbnRoTm9kZS5pbm5lckhUTUwgPSAoeWVhciAtIDEyKSArICctJyArICh5ZWFyIC0gMSk7XG5cdFx0dGhpcy5jb250YWluZXIuYXBwZW5kQ2hpbGQobm9kZSk7XG5cdFx0dGhpcy5tb2RlTm9kZSA9IG5vZGU7XG5cdH1cblxuXHRzZWxlY3REYXkgKCkge1xuXHRcdGlmICh0aGlzWydyYW5nZS1waWNrZXInXSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRjb25zdCBub3cgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5heS1zZWxlY3RlZCcpO1xuXHRcdGNvbnN0IG5vZGUgPSB0aGlzLmRheU1hcFt0aGlzLmN1cnJlbnQuZ2V0RGF0ZSgpXTtcblx0XHRpZiAobm93KSB7XG5cdFx0XHRub3cuY2xhc3NMaXN0LnJlbW92ZSgnYXktc2VsZWN0ZWQnKTtcblx0XHR9XG5cdFx0bm9kZS5jbGFzc0xpc3QuYWRkKCdheS1zZWxlY3RlZCcpO1xuXG5cdH1cblxuXHRjbGVhclJhbmdlICgpIHtcblx0XHR0aGlzLmhvdmVyRGF0ZSA9IDA7XG5cdFx0dGhpcy5zZXRSYW5nZShudWxsLCBudWxsKTtcblx0fVxuXG5cdHNldFJhbmdlIChmaXJzdFJhbmdlLCBzZWNvbmRSYW5nZSkge1xuXHRcdHRoaXMuZmlyc3RSYW5nZSA9IGZpcnN0UmFuZ2U7XG5cdFx0dGhpcy5zZWNvbmRSYW5nZSA9IHNlY29uZFJhbmdlO1xuXHRcdHRoaXMuZGlzcGxheVJhbmdlKCk7XG5cdFx0dGhpcy5zZXRSYW5nZUVuZFBvaW50cygpO1xuXHR9XG5cblx0Y2xpY2tTZWxlY3RSYW5nZSAoKSB7XG5cdFx0Y29uc3Rcblx0XHRcdHByZXZGaXJzdCA9ICEhdGhpcy5maXJzdFJhbmdlLFxuXHRcdFx0cHJldlNlY29uZCA9ICEhdGhpcy5zZWNvbmRSYW5nZSxcblx0XHRcdHJhbmdlRGF0ZSA9IGNvcHkodGhpcy5jdXJyZW50KTtcblxuXHRcdGlmICh0aGlzLmlzT3duZWQpIHtcblx0XHRcdHRoaXMuZmlyZSgnc2VsZWN0LXJhbmdlJywge1xuXHRcdFx0XHRmaXJzdDogdGhpcy5maXJzdFJhbmdlLFxuXHRcdFx0XHRzZWNvbmQ6IHRoaXMuc2Vjb25kUmFuZ2UsXG5cdFx0XHRcdGN1cnJlbnQ6IHJhbmdlRGF0ZVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGlmICh0aGlzLnNlY29uZFJhbmdlKSB7XG5cdFx0XHR0aGlzLmZpcmUoJ3Jlc2V0LXJhbmdlJyk7XG5cdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBudWxsO1xuXHRcdFx0dGhpcy5zZWNvbmRSYW5nZSA9IG51bGw7XG5cdFx0fVxuXHRcdGlmICh0aGlzLmZpcnN0UmFuZ2UgJiYgdGhpcy5pc1ZhbGlkUmFuZ2UocmFuZ2VEYXRlKSkge1xuXHRcdFx0dGhpcy5zZWNvbmRSYW5nZSA9IHJhbmdlRGF0ZTtcblx0XHRcdHRoaXMuaG92ZXJEYXRlID0gMDtcblx0XHRcdHRoaXMuc2V0UmFuZ2UodGhpcy5maXJzdFJhbmdlLCB0aGlzLnNlY29uZFJhbmdlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5maXJzdFJhbmdlID0gbnVsbDtcblx0XHR9XG5cdFx0aWYgKCF0aGlzLmZpcnN0UmFuZ2UpIHtcblx0XHRcdHRoaXMuaG92ZXJEYXRlID0gMDtcblx0XHRcdHRoaXMuc2V0UmFuZ2UocmFuZ2VEYXRlLCBudWxsKTtcblx0XHR9XG5cdFx0dGhpcy5maXJlKCdzZWxlY3QtcmFuZ2UnLCB7XG5cdFx0XHRmaXJzdDogdGhpcy5maXJzdFJhbmdlLFxuXHRcdFx0c2Vjb25kOiB0aGlzLnNlY29uZFJhbmdlLFxuXHRcdFx0cHJldkZpcnN0OiBwcmV2Rmlyc3QsXG5cdFx0XHRwcmV2U2Vjb25kOiBwcmV2U2Vjb25kXG5cdFx0fSk7XG5cdH1cblxuXHRob3ZlclNlbGVjdFJhbmdlIChlKSB7XG5cdFx0aWYgKHRoaXMuZmlyc3RSYW5nZSAmJiAhdGhpcy5zZWNvbmRSYW5nZSAmJiBlLnRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoJ29uJykpIHtcblx0XHRcdHRoaXMuaG92ZXJEYXRlID0gZS50YXJnZXQuX2RhdGU7XG5cdFx0XHR0aGlzLmRpc3BsYXlSYW5nZSgpO1xuXHRcdH1cblx0fVxuXG5cdGRpc3BsYXlSYW5nZVRvRW5kICgpIHtcblx0XHRpZiAodGhpcy5maXJzdFJhbmdlKSB7XG5cdFx0XHR0aGlzLmhvdmVyRGF0ZSA9IGNvcHkodGhpcy5jdXJyZW50KTtcblx0XHRcdHRoaXMuaG92ZXJEYXRlLnNldE1vbnRoKHRoaXMuaG92ZXJEYXRlLmdldE1vbnRoKCkgKyAxKTtcblx0XHRcdHRoaXMuZGlzcGxheVJhbmdlKCk7XG5cdFx0fVxuXHR9XG5cblx0ZGlzcGxheVJhbmdlICgpIHtcblx0XHRsZXQgYmVnID0gdGhpcy5maXJzdFJhbmdlO1xuXHRcdGxldCBlbmQgPSB0aGlzLnNlY29uZFJhbmdlID8gdGhpcy5zZWNvbmRSYW5nZS5nZXRUaW1lKCkgOiB0aGlzLmhvdmVyRGF0ZTtcblx0XHRjb25zdCBtYXAgPSB0aGlzLmRheU1hcDtcblx0XHRpZiAoIWJlZyB8fCAhZW5kKSB7XG5cdFx0XHRPYmplY3Qua2V5cyhtYXApLmZvckVhY2goZnVuY3Rpb24gKGtleSwgaSkge1xuXHRcdFx0XHRtYXBba2V5XS5jbGFzc0xpc3QucmVtb3ZlKCdheS1yYW5nZScpO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGJlZyA9IGJlZy5nZXRUaW1lKCk7XG5cdFx0XHRPYmplY3Qua2V5cyhtYXApLmZvckVhY2goZnVuY3Rpb24gKGtleSwgaSkge1xuXHRcdFx0XHRpZiAoaW5SYW5nZShtYXBba2V5XS5fZGF0ZSwgYmVnLCBlbmQpKSB7XG5cdFx0XHRcdFx0bWFwW2tleV0uY2xhc3NMaXN0LmFkZCgnYXktcmFuZ2UnKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRtYXBba2V5XS5jbGFzc0xpc3QucmVtb3ZlKCdheS1yYW5nZScpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cblxuXHRoYXNSYW5nZSAoKSB7XG5cdFx0cmV0dXJuICEhdGhpcy5maXJzdFJhbmdlICYmICEhdGhpcy5zZWNvbmRSYW5nZTtcblx0fVxuXG5cdGlzVmFsaWRSYW5nZSAoZGF0ZSkge1xuXHRcdGlmICghdGhpcy5maXJzdFJhbmdlKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIGRhdGUuZ2V0VGltZSgpID4gdGhpcy5maXJzdFJhbmdlLmdldFRpbWUoKTtcblx0fVxuXG5cdHNldFJhbmdlRW5kUG9pbnRzICgpIHtcblx0XHR0aGlzLmNsZWFyRW5kUG9pbnRzKCk7XG5cdFx0aWYgKHRoaXMuZmlyc3RSYW5nZSkge1xuXHRcdFx0aWYgKHRoaXMuZmlyc3RSYW5nZS5nZXRNb250aCgpID09PSB0aGlzLmN1cnJlbnQuZ2V0TW9udGgoKSkge1xuXHRcdFx0XHR0aGlzLmRheU1hcFt0aGlzLmZpcnN0UmFuZ2UuZ2V0RGF0ZSgpXS5jbGFzc0xpc3QuYWRkKCdheS1yYW5nZS1maXJzdCcpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMuc2Vjb25kUmFuZ2UgJiYgdGhpcy5zZWNvbmRSYW5nZS5nZXRNb250aCgpID09PSB0aGlzLmN1cnJlbnQuZ2V0TW9udGgoKSkge1xuXHRcdFx0XHR0aGlzLmRheU1hcFt0aGlzLnNlY29uZFJhbmdlLmdldERhdGUoKV0uY2xhc3NMaXN0LmFkZCgnYXktcmFuZ2Utc2Vjb25kJyk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Y2xlYXJFbmRQb2ludHMgKCkge1xuXHRcdGNvbnN0IGZpcnN0ID0gdGhpcy5xdWVyeVNlbGVjdG9yKCcuYXktcmFuZ2UtZmlyc3QnKSxcblx0XHRcdHNlY29uZCA9IHRoaXMucXVlcnlTZWxlY3RvcignLmF5LXJhbmdlLXNlY29uZCcpO1xuXHRcdGlmIChmaXJzdCkge1xuXHRcdFx0Zmlyc3QuY2xhc3NMaXN0LnJlbW92ZSgnYXktcmFuZ2UtZmlyc3QnKTtcblx0XHR9XG5cdFx0aWYgKHNlY29uZCkge1xuXHRcdFx0c2Vjb25kLmNsYXNzTGlzdC5yZW1vdmUoJ2F5LXJhbmdlLXNlY29uZCcpO1xuXHRcdH1cblx0fVxuXG5cdGRvbVJlYWR5ICgpIHtcblx0XHRpZiAodGhpc1sncmFuZ2UtbGVmdCddKSB7XG5cdFx0XHR0aGlzLnJndE5vZGUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcblx0XHRcdHRoaXNbJ3JhbmdlLXBpY2tlciddID0gdHJ1ZTtcblx0XHRcdHRoaXMuaXNPd25lZCA9IHRydWU7XG5cdFx0fVxuXHRcdGlmICh0aGlzWydyYW5nZS1yaWdodCddKSB7XG5cdFx0XHR0aGlzLmxmdE5vZGUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcblx0XHRcdHRoaXNbJ3JhbmdlLXBpY2tlciddID0gdHJ1ZTtcblx0XHRcdHRoaXMuaXNPd25lZCA9IHRydWU7XG5cdFx0fVxuXHRcdGlmICh0aGlzLmlzT3duZWQpIHtcblx0XHRcdHRoaXMuY2xhc3NMaXN0LmFkZCgnbWluaW1hbCcpO1xuXHRcdH1cblxuXHRcdHRoaXMuY3VycmVudCA9IGNvcHkodGhpcy52YWx1ZSk7XG5cblx0XHR0aGlzLmNvbm5lY3QoKTtcblx0XHR0aGlzLnJlbmRlcigpO1xuXHR9XG5cblx0cmVuZGVyICgpIHtcblx0XHQvLyBkYXRlTnVtIGluY3JlbWVudHMsIHN0YXJ0aW5nIHdpdGggdGhlIGZpcnN0IFN1bmRheVxuXHRcdC8vIHNob3dpbmcgb24gdGhlIG1vbnRobHkgY2FsZW5kYXIuIFRoaXMgaXMgdXN1YWxseSB0aGVcblx0XHQvLyBwcmV2aW91cyBtb250aCwgc28gZGF0ZU51bSB3aWxsIHN0YXJ0IGFzIGEgbmVnYXRpdmUgbnVtYmVyXG5cdFx0dGhpcy5zZXRNb2RlKDApO1xuXHRcdGlmICh0aGlzLmJvZHlOb2RlKSB7XG5cdFx0XHRkb20uZGVzdHJveSh0aGlzLmJvZHlOb2RlKTtcblx0XHR9XG5cblx0XHR0aGlzLmRheU1hcCA9IHt9O1xuXG5cdFx0bGV0XG5cdFx0XHRub2RlID0gZG9tKCdkaXYnLCB7IGNsYXNzOiAnY2FsLWJvZHknIH0pLFxuXHRcdFx0aSwgdHgsIG5leHRNb250aCA9IDAsIGlzVGhpc01vbnRoLCBkYXksIGNzcyxcblx0XHRcdHRvZGF5ID0gbmV3IERhdGUoKSxcblx0XHRcdGlzUmFuZ2UgPSB0aGlzWydyYW5nZS1waWNrZXInXSxcblx0XHRcdGQgPSB0aGlzLmN1cnJlbnQsXG5cdFx0XHRpbmNEYXRlID0gY29weShkKSxcblx0XHRcdGRheXNJblByZXZNb250aCA9IGRhdGVzLmdldERheXNJblByZXZNb250aChkKSxcblx0XHRcdGRheXNJbk1vbnRoID0gZGF0ZXMuZ2V0RGF5c0luTW9udGgoZCksXG5cdFx0XHRkYXRlTnVtID0gZGF0ZXMuZ2V0Rmlyc3RTdW5kYXkoZCksXG5cdFx0XHRkYXRlVG9kYXkgPSBnZXRTZWxlY3RlZERhdGUodG9kYXksIGQpLFxuXHRcdFx0ZGF0ZVNlbGVjdGVkID0gZ2V0U2VsZWN0ZWREYXRlKHRoaXMudmFsdWVEYXRlLCBkKTtcblxuXHRcdHRoaXMubW9udGhOb2RlLmlubmVySFRNTCA9IGRhdGVzLmdldE1vbnRoTmFtZShkKSArICcgJyArIGQuZ2V0RnVsbFllYXIoKTtcblxuXHRcdGZvciAoaSA9IDA7IGkgPCA3OyBpKyspIHtcblx0XHRcdGRvbShcImRpdlwiLCB7IGh0bWw6IGRhdGVzLmRheXMuYWJicltpXSwgY2xhc3M6ICdkYXktb2Ytd2VlaycgfSwgbm9kZSk7XG5cdFx0fVxuXG5cdFx0Zm9yIChpID0gMDsgaSA8IDQyOyBpKyspIHtcblx0XHRcdHR4ID0gZGF0ZU51bSArIDEgPiAwICYmIGRhdGVOdW0gKyAxIDw9IGRheXNJbk1vbnRoID8gZGF0ZU51bSArIDEgOiBcIiZuYnNwO1wiO1xuXG5cdFx0XHRpc1RoaXNNb250aCA9IGZhbHNlO1xuXHRcdFx0aWYgKGRhdGVOdW0gKyAxID4gMCAmJiBkYXRlTnVtICsgMSA8PSBkYXlzSW5Nb250aCkge1xuXHRcdFx0XHQvLyBjdXJyZW50IG1vbnRoXG5cdFx0XHRcdHR4ID0gZGF0ZU51bSArIDE7XG5cdFx0XHRcdGlzVGhpc01vbnRoID0gdHJ1ZTtcblx0XHRcdFx0Y3NzID0gJ2RheSBvbic7XG5cdFx0XHRcdGlmIChkYXRlVG9kYXkgPT09IHR4KSB7XG5cdFx0XHRcdFx0Y3NzICs9ICcgdG9kYXknO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChkYXRlU2VsZWN0ZWQgPT09IHR4ICYmICFpc1JhbmdlKSB7XG5cdFx0XHRcdFx0Y3NzICs9ICcgYXktc2VsZWN0ZWQnO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgaWYgKGRhdGVOdW0gPCAwKSB7XG5cdFx0XHRcdC8vIHByZXZpb3VzIG1vbnRoXG5cdFx0XHRcdHR4ID0gZGF5c0luUHJldk1vbnRoICsgZGF0ZU51bSArIDE7XG5cdFx0XHRcdGNzcyA9ICdkYXkgb2ZmIHBhc3QnO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gbmV4dCBtb250aFxuXHRcdFx0XHR0eCA9ICsrbmV4dE1vbnRoO1xuXHRcdFx0XHRjc3MgPSAnZGF5IG9mZiBmdXR1cmUnO1xuXHRcdFx0fVxuXG5cdFx0XHRkYXkgPSBkb20oXCJkaXZcIiwgeyBpbm5lckhUTUw6IHR4LCBjbGFzczogY3NzIH0sIG5vZGUpO1xuXG5cdFx0XHRkYXRlTnVtKys7XG5cdFx0XHRpZiAoaXNUaGlzTW9udGgpIHtcblx0XHRcdFx0Ly8gS2VlcCBhIG1hcCBvZiBhbGwgdGhlIGRheXNcblx0XHRcdFx0Ly8gdXNlIGl0IGZvciBhZGRpbmcgYW5kIHJlbW92aW5nIHNlbGVjdGlvbi9ob3ZlciBjbGFzc2VzXG5cdFx0XHRcdGluY0RhdGUuc2V0RGF0ZSh0eCk7XG5cdFx0XHRcdGRheS5fZGF0ZSA9IGluY0RhdGUuZ2V0VGltZSgpO1xuXHRcdFx0XHR0aGlzLmRheU1hcFt0eF0gPSBkYXk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5jb250YWluZXIuYXBwZW5kQ2hpbGQobm9kZSk7XG5cdFx0dGhpcy5ib2R5Tm9kZSA9IG5vZGU7XG5cdFx0dGhpcy5zZXRGb290ZXIoKTtcblx0XHR0aGlzLmRpc3BsYXlSYW5nZSgpO1xuXHRcdHRoaXMuc2V0UmFuZ2VFbmRQb2ludHMoKTtcblxuXHRcdHRoaXMuZW1pdERpc3BsYXlFdmVudHMoKTtcblx0fVxuXG5cdHNldEZvb3RlciAoKSB7XG5cdFx0Y29uc3QgZCA9IG5ldyBEYXRlKCk7XG5cdFx0dGhpcy5mb290ZXJMaW5rLmlubmVySFRNTCA9IGRhdGVzLmRheXMuZnVsbFtkLmdldERheSgpXSArICcgJyArIGRhdGVzLm1vbnRocy5mdWxsW2QuZ2V0TW9udGgoKV0gKyAnICcgKyBkLmdldERhdGUoKSArICcsICcgKyBkLmdldEZ1bGxZZWFyKCk7XG5cdH1cblxuXHRjb25uZWN0ICgpIHtcblx0XHR0aGlzLm9uKHRoaXMubGZ0Tm9kZSwgJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0dGhpcy5vbkNsaWNrTW9udGgoLTEpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5vbih0aGlzLnJndE5vZGUsICdjbGljaycsICgpID0+IHtcblx0XHRcdHRoaXMub25DbGlja01vbnRoKDEpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5vbih0aGlzLmZvb3RlckxpbmssICdjbGljaycsICgpID0+IHtcblx0XHRcdHRoaXMuY3VycmVudCA9IG5ldyBEYXRlKCk7XG5cdFx0XHR0aGlzLnJlbmRlcigpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5vbih0aGlzLmNvbnRhaW5lciwgJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdHRoaXMuZmlyZSgncHJlLWNsaWNrJywgZSwgdHJ1ZSwgdHJ1ZSk7XG5cdFx0XHRjb25zdCBub2RlID0gZS50YXJnZXQ7XG5cdFx0XHRpZiAobm9kZS5jbGFzc0xpc3QuY29udGFpbnMoJ2RheScpKSB7XG5cdFx0XHRcdHRoaXMub25DbGlja0RheShub2RlKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKG5vZGUuY2xhc3NMaXN0LmNvbnRhaW5zKCd5ZWFyJykpIHtcblx0XHRcdFx0dGhpcy5vbkNsaWNrWWVhcihub2RlKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKG5vZGUuY2xhc3NMaXN0LmNvbnRhaW5zKCdkZWNhZGUnKSkge1xuXHRcdFx0XHR0aGlzLm9uQ2xpY2tEZWNhZGUobm9kZSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLm9uKHRoaXMubW9udGhOb2RlLCAnY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRpZiAodGhpcy5tb2RlICsgMSA9PT0gdGhpcy5tb2Rlcy5sZW5ndGgpIHtcblx0XHRcdFx0dGhpcy5tb2RlID0gMDtcblx0XHRcdFx0dGhpcy5yZW5kZXIoKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR0aGlzLnNldE1vZGUodGhpcy5tb2RlICsgMSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRpZiAodGhpc1sncmFuZ2UtcGlja2VyJ10pIHtcblx0XHRcdHRoaXMub24odGhpcy5jb250YWluZXIsICdtb3VzZW92ZXInLCB0aGlzLmhvdmVyU2VsZWN0UmFuZ2UuYmluZCh0aGlzKSk7XG5cdFx0fVxuXHR9XG59XG5cbmNvbnN0IHRvZGF5ID0gbmV3IERhdGUoKTtcblxuZnVuY3Rpb24gZ2V0U2VsZWN0ZWREYXRlIChkYXRlLCBjdXJyZW50KSB7XG5cdGlmIChkYXRlLmdldE1vbnRoKCkgPT09IGN1cnJlbnQuZ2V0TW9udGgoKSAmJiBkYXRlLmdldEZ1bGxZZWFyKCkgPT09IGN1cnJlbnQuZ2V0RnVsbFllYXIoKSkge1xuXHRcdHJldHVybiBkYXRlLmdldERhdGUoKTtcblx0fVxuXHRyZXR1cm4gLTk5OTsgLy8gaW5kZXggbXVzdCBiZSBvdXQgb2YgcmFuZ2UsIGFuZCAtMSBpcyB0aGUgbGFzdCBkYXkgb2YgdGhlIHByZXZpb3VzIG1vbnRoXG59XG5cbmZ1bmN0aW9uIGRlc3Ryb3kgKG5vZGUpIHtcblx0aWYgKG5vZGUpIHtcblx0XHRkb20uZGVzdHJveShub2RlKTtcblx0fVxufVxuXG5mdW5jdGlvbiBpc1RoaXNNb250aCAoZGF0ZSwgY3VycmVudERhdGUpIHtcblx0cmV0dXJuIGRhdGUuZ2V0TW9udGgoKSA9PT0gY3VycmVudERhdGUuZ2V0TW9udGgoKSAmJiBkYXRlLmdldEZ1bGxZZWFyKCkgPT09IGN1cnJlbnREYXRlLmdldEZ1bGxZZWFyKCk7XG59XG5cbmZ1bmN0aW9uIGluUmFuZ2UgKGRhdGVUaW1lLCBiZWdUaW1lLCBlbmRUaW1lKSB7XG5cdHJldHVybiBkYXRlVGltZSA+PSBiZWdUaW1lICYmIGRhdGVUaW1lIDw9IGVuZFRpbWU7XG59XG5cbmZ1bmN0aW9uIGNvcHkgKGRhdGUpIHtcblx0cmV0dXJuIG5ldyBEYXRlKGRhdGUuZ2V0VGltZSgpKTtcbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdkYXRlLXBpY2tlcicsIERhdGVQaWNrZXIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERhdGVQaWNrZXI7IiwicmVxdWlyZSgnLi9kYXRlLXJhbmdlLXBpY2tlcicpO1xuY29uc3QgRGF0ZUlucHV0ID0gcmVxdWlyZSgnLi9kYXRlLWlucHV0Jyk7XG5jb25zdCBkYXRlcyA9IHJlcXVpcmUoJ2RhdGVzJyk7XG5jb25zdCBkb20gPSByZXF1aXJlKCdkb20nKTtcblxuY29uc3QgcHJvcHMgPSBbJ2xhYmVsJywgJ25hbWUnLCAncGxhY2Vob2xkZXInLCAndmFsdWUnXTtcbmNvbnN0IGJvb2xzID0gWydyYW5nZS1leHBhbmRzJ107XG5cbmNsYXNzIERhdGVSYW5nZUlucHV0IGV4dGVuZHMgRGF0ZUlucHV0IHtcblxuXHRzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcyAoKSB7XG5cdFx0cmV0dXJuIFsuLi5wcm9wcywgLi4uYm9vbHNdO1xuXHR9XG5cblx0Z2V0IHByb3BzICgpIHtcblx0XHRyZXR1cm4gcHJvcHM7XG5cdH1cblxuXHRnZXQgYm9vbHMgKCkge1xuXHRcdHJldHVybiBib29scztcblx0fVxuXG5cdC8vIG9uVmFsdWUgKHZhbHVlKSB7XG5cdC8vXG5cdC8vIH1cblxuXHRnZXQgdGVtcGxhdGVTdHJpbmcgKCkge1xuXHRcdHJldHVybiBgXG48bGFiZWw+XG5cdDxzcGFuIHJlZj1cImxhYmVsTm9kZVwiPjwvc3Bhbj5cblx0PGlucHV0IHJlZj1cImlucHV0XCIgLz5cblx0XG48L2xhYmVsPlxuPGRhdGUtcmFuZ2UtcGlja2VyIHJlZj1cInBpY2tlclwiIHRhYmluZGV4PVwiMFwiPjwvZGF0ZS1yYW5nZS1waWNrZXI+YDtcblx0fVxuXG5cdGNvbnN0cnVjdG9yICgpIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMubWFzayA9ICdYWC9YWC9YWFhYIC0gWFgvWFgvWFhYWCdcblx0fVxuXG5cdC8vIG9uS2V5ICgpIHtcblx0Ly9cblx0Ly8gfVxuXHQvL1xuXHQvLyBjb25uZWN0S2V5cyAoKSB7XG5cdC8vIFx0dGhpcy5vbih0aGlzLmlucHV0LCAna2V5dXAnLCB0aGlzLm9uS2V5LmJpbmQodGhpcykpO1xuXHQvLyB9XG5cblx0Ly8gZG9tUmVhZHkgKCkge1xuXHQvLyBcdGRvbSgpO1xuXHQvLyB9XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnZGF0ZS1yYW5nZS1pbnB1dCcsIERhdGVSYW5nZUlucHV0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBEYXRlUmFuZ2VJbnB1dDsiLCJyZXF1aXJlKCcuL2RhdGUtcGlja2VyJyk7XG5jb25zdCBCYXNlQ29tcG9uZW50ID0gcmVxdWlyZSgnQmFzZUNvbXBvbmVudCcpO1xuY29uc3QgZGF0ZXMgPSByZXF1aXJlKCdkYXRlcycpO1xuY29uc3QgZG9tID0gcmVxdWlyZSgnZG9tJyk7XG5cbmNvbnN0IHByb3BzID0gWyd2YWx1ZSddO1xuY29uc3QgYm9vbHMgPSBbJ3JhbmdlLWV4cGFuZHMnXTtcblxuY2xhc3MgRGF0ZVJhbmdlUGlja2VyIGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG5cblx0c3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMgKCkge1xuXHRcdHJldHVybiBbLi4ucHJvcHMsIC4uLmJvb2xzXTtcblx0fVxuXG5cdGdldCBwcm9wcyAoKSB7XG5cdFx0cmV0dXJuIHByb3BzO1xuXHR9XG5cblx0Z2V0IGJvb2xzICgpIHtcblx0XHRyZXR1cm4gYm9vbHM7XG5cdH1cblxuXHRvblZhbHVlICh2YWx1ZSkge1xuXHRcdC8vIG1pZ2h0IG5lZWQgYXR0cmlidXRlQ2hhbmdlZFxuXHRcdHRoaXMuc3RyRGF0ZSA9IGRhdGVzLmlzRGF0ZVR5cGUodmFsdWUpID8gdmFsdWUgOiAnJztcblx0XHRvbkRvbVJlYWR5KHRoaXMsICgpID0+IHtcblx0XHRcdHRoaXMuc2V0VmFsdWUodGhpcy5zdHJEYXRlLCB0cnVlKTtcblx0XHR9KTtcblx0fVxuXG5cdGNvbnN0cnVjdG9yICgpIHtcblx0XHRzdXBlcigpO1xuXHR9XG5cblx0c2V0VmFsdWUgKHZhbHVlLCBub0VtaXQpIHtcblx0XHRpZiAoIXZhbHVlKSB7XG5cdFx0XHR0aGlzLnZhbHVlRGF0ZSA9ICcnO1xuXHRcdFx0dGhpcy5jbGVhclJhbmdlKCk7XG5cblx0XHR9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdHZhciBkYXRlU3RyaW5ncyA9IHNwbGl0KHZhbHVlKTtcblx0XHRcdHRoaXMudmFsdWVEYXRlID0gZGF0ZXMuc3RyVG9EYXRlKHZhbHVlKTtcblx0XHRcdHRoaXMuZmlyc3RSYW5nZSA9IGRhdGVzLnN0clRvRGF0ZShkYXRlU3RyaW5nc1swXSk7XG5cdFx0XHR0aGlzLnNlY29uZFJhbmdlID0gZGF0ZXMuc3RyVG9EYXRlKGRhdGVTdHJpbmdzWzFdKTtcblx0XHRcdHRoaXMuc2V0RGlzcGxheSgpO1xuXHRcdFx0dGhpcy5zZXRSYW5nZShub0VtaXQpO1xuXHRcdH1cblx0fVxuXG5cdGRvbVJlYWR5ICgpIHtcblx0XHR0aGlzLmxlZnRDYWwgPSBkb20oJ2RhdGUtcGlja2VyJywgeydyYW5nZS1sZWZ0JzogdHJ1ZX0sIHRoaXMpO1xuXHRcdHRoaXMucmlnaHRDYWwgPSBkb20oJ2RhdGUtcGlja2VyJywgeydyYW5nZS1yaWdodCc6IHRydWV9LCB0aGlzKTtcblx0XHR0aGlzLnJhbmdlRXhwYW5kcyA9IHRoaXNbJ3JhbmdlLWV4cGFuZHMnXTtcblxuXHRcdHRoaXMuY29ubmVjdEV2ZW50cygpO1xuXHRcdC8vIGlmICh0aGlzLmluaXRhbFZhbHVlKSB7XG5cdFx0Ly8gXHR0aGlzLnNldFZhbHVlKHRoaXMuaW5pdGFsVmFsdWUpO1xuXHRcdC8vIH0gZWxzZSB7XG5cdFx0Ly8gXHR0aGlzLnNldERpc3BsYXkoKTtcblx0XHQvLyB9XG5cdH1cblxuXHRzZXREaXNwbGF5ICgpIHtcblx0XHRjb25zdFxuXHRcdFx0Zmlyc3QgPSB0aGlzLmZpcnN0UmFuZ2UgPyBuZXcgRGF0ZSh0aGlzLmZpcnN0UmFuZ2UuZ2V0VGltZSgpKSA6IG5ldyBEYXRlKCksXG5cdFx0XHRzZWNvbmQgPSBuZXcgRGF0ZShmaXJzdC5nZXRUaW1lKCkpO1xuXG5cdFx0c2Vjb25kLnNldE1vbnRoKHNlY29uZC5nZXRNb250aCgpICsgMSk7XG5cdFx0dGhpcy5sZWZ0Q2FsLnNldERpc3BsYXkoZmlyc3QpO1xuXHRcdHRoaXMucmlnaHRDYWwuc2V0RGlzcGxheShzZWNvbmQpO1xuXHR9XG5cblx0c2V0UmFuZ2UgKG5vRW1pdCkge1xuXHRcdHRoaXMubGVmdENhbC5zZXRSYW5nZSh0aGlzLmZpcnN0UmFuZ2UsIHRoaXMuc2Vjb25kUmFuZ2UpO1xuXHRcdHRoaXMucmlnaHRDYWwuc2V0UmFuZ2UodGhpcy5maXJzdFJhbmdlLCB0aGlzLnNlY29uZFJhbmdlKTtcblx0XHRpZiAoIW5vRW1pdCAmJiB0aGlzLmZpcnN0UmFuZ2UgJiYgdGhpcy5zZWNvbmRSYW5nZSkge1xuXG5cdFx0XHRjb25zdFxuXHRcdFx0XHRiZWcgPSBkYXRlcy5kYXRlVG9TdHIodGhpcy5maXJzdFJhbmdlKSxcblx0XHRcdFx0ZW5kID0gZGF0ZXMuZGF0ZVRvU3RyKHRoaXMuc2Vjb25kUmFuZ2UpO1xuXG5cdFx0XHR0aGlzLmVtaXQoJ2NoYW5nZScsIHtcblx0XHRcdFx0Zmlyc3RSYW5nZTogdGhpcy5maXJzdFJhbmdlLFxuXHRcdFx0XHRzZWNvbmRSYW5nZTogdGhpcy5zZWNvbmRSYW5nZSxcblx0XHRcdFx0YmVnaW46IGJlZyxcblx0XHRcdFx0ZW5kOiBlbmQsXG5cdFx0XHRcdHZhbHVlOiBiZWcgKyBERUxJTUlURVIgKyBlbmRcblxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cblx0Y2xlYXJSYW5nZSAoKSB7XG5cdFx0dGhpcy5sZWZ0Q2FsLmNsZWFyUmFuZ2UoKTtcblx0XHR0aGlzLnJpZ2h0Q2FsLmNsZWFyUmFuZ2UoKTtcblx0fVxuXG5cdGNhbGN1bGF0ZVJhbmdlIChlLCB3aGljaCkge1xuXHRcdGUgPSBlLmRldGFpbCB8fCBlO1xuXG5cdFx0aWYgKGUuZmlyc3QgPT09IHRoaXMubGVmdENhbC5maXJzdFJhbmdlKSB7XG5cdFx0XHRpZiAoIWUuc2Vjb25kKSB7XG5cdFx0XHRcdHRoaXMucmlnaHRDYWwuY2xlYXJSYW5nZSgpO1xuXHRcdFx0XHR0aGlzLnJpZ2h0Q2FsLnNldFJhbmdlKHRoaXMubGVmdENhbC5maXJzdFJhbmdlLCBudWxsKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMucmlnaHRDYWwuc2V0UmFuZ2UodGhpcy5sZWZ0Q2FsLmZpcnN0UmFuZ2UsIHRoaXMubGVmdENhbC5zZWNvbmRSYW5nZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Y29ubmVjdEV2ZW50cyAoKSB7XG5cdFx0dGhpcy5sZWZ0Q2FsLm9uKCdkaXNwbGF5LWNoYW5nZScsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRsZXRcblx0XHRcdFx0bSA9IGUuZGV0YWlsLm1vbnRoLFxuXHRcdFx0XHR5ID0gZS5kZXRhaWwueWVhcjtcblx0XHRcdGlmIChtICsgMSA+IDExKSB7XG5cdFx0XHRcdG0gPSAwO1xuXHRcdFx0XHR5Kys7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRtKys7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnJpZ2h0Q2FsLnNldERpc3BsYXkoeSwgbSk7XG5cdFx0fS5iaW5kKHRoaXMpKTtcblxuXHRcdHRoaXMucmlnaHRDYWwub24oJ2Rpc3BsYXktY2hhbmdlJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGxldFxuXHRcdFx0XHRtID0gZS5kZXRhaWwubW9udGgsXG5cdFx0XHRcdHkgPSBlLmRldGFpbC55ZWFyO1xuXHRcdFx0aWYgKG0gLSAxIDwgMCkge1xuXHRcdFx0XHRtID0gMTE7XG5cdFx0XHRcdHktLTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG0tLTtcblx0XHRcdH1cblx0XHRcdHRoaXMubGVmdENhbC5zZXREaXNwbGF5KHksIG0pO1xuXHRcdH0uYmluZCh0aGlzKSk7XG5cblx0XHR0aGlzLmxlZnRDYWwub24oJ2NoYW5nZScsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0uYmluZCh0aGlzKSk7XG5cblx0XHR0aGlzLnJpZ2h0Q2FsLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0ZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9LmJpbmQodGhpcykpO1xuXG5cblx0XHRpZiAoIXRoaXMucmFuZ2VFeHBhbmRzKSB7XG5cdFx0XHR0aGlzLnJpZ2h0Q2FsLm9uKCdyZXNldC1yYW5nZScsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdHRoaXMubGVmdENhbC5jbGVhclJhbmdlKCk7XG5cdFx0XHR9LmJpbmQodGhpcykpO1xuXG5cdFx0XHR0aGlzLmxlZnRDYWwub24oJ3Jlc2V0LXJhbmdlJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0dGhpcy5yaWdodENhbC5jbGVhclJhbmdlKCk7XG5cdFx0XHR9LmJpbmQodGhpcykpO1xuXHRcdH1cblxuXG5cdFx0dGhpcy5sZWZ0Q2FsLm9uKCdzZWxlY3QtcmFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0dGhpcy5jYWxjdWxhdGVSYW5nZShlLCAnbGVmdCcpO1xuXHRcdFx0ZSA9IGUuZGV0YWlsO1xuXHRcdFx0aWYgKHRoaXMucmFuZ2VFeHBhbmRzICYmIGUuZmlyc3QgJiYgZS5zZWNvbmQpIHtcblx0XHRcdFx0aWYgKGlzRGF0ZUNsb3NlclRvTGVmdChlLmN1cnJlbnQsIGUuZmlyc3QsIGUuc2Vjb25kKSkge1xuXHRcdFx0XHRcdHRoaXMuZmlyc3RSYW5nZSA9IGUuY3VycmVudDtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLnNlY29uZFJhbmdlID0gZS5jdXJyZW50O1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuc2V0UmFuZ2UoKTtcblx0XHRcdH0gZWxzZSBpZiAoZS5maXJzdCAmJiBlLnNlY29uZCkge1xuXHRcdFx0XHQvLyBuZXcgcmFuZ2Vcblx0XHRcdFx0dGhpcy5jbGVhclJhbmdlKCk7XG5cdFx0XHRcdHRoaXMuZmlyc3RSYW5nZSA9IGUuY3VycmVudDtcblx0XHRcdFx0dGhpcy5zZWNvbmRSYW5nZSA9IG51bGw7XG5cdFx0XHRcdHRoaXMuc2V0UmFuZ2UoKTtcblx0XHRcdH0gZWxzZSBpZiAoZS5maXJzdCAmJiAhZS5zZWNvbmQpIHtcblx0XHRcdFx0dGhpcy5zZWNvbmRSYW5nZSA9IGUuY3VycmVudDtcblx0XHRcdFx0dGhpcy5zZXRSYW5nZSgpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHRoaXMuZmlyc3RSYW5nZSA9IGUuY3VycmVudDtcblx0XHRcdFx0dGhpcy5zZXRSYW5nZSgpO1xuXHRcdFx0fVxuXHRcdH0uYmluZCh0aGlzKSk7XG5cblx0XHR0aGlzLnJpZ2h0Q2FsLm9uKCdzZWxlY3QtcmFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0dGhpcy5jYWxjdWxhdGVSYW5nZShlLCAncmlnaHQnKTtcblxuXHRcdFx0ZSA9IGUuZGV0YWlsO1xuXHRcdFx0aWYgKHRoaXMucmFuZ2VFeHBhbmRzICYmIGUuZmlyc3QgJiYgZS5zZWNvbmQpIHtcblx0XHRcdFx0aWYgKGlzRGF0ZUNsb3NlclRvTGVmdChlLmN1cnJlbnQsIGUuZmlyc3QsIGUuc2Vjb25kKSkge1xuXHRcdFx0XHRcdHRoaXMuZmlyc3RSYW5nZSA9IGUuY3VycmVudDtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLnNlY29uZFJhbmdlID0gZS5jdXJyZW50O1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuc2V0UmFuZ2UoKTtcblx0XHRcdH0gZWxzZSBpZiAoZS5maXJzdCAmJiBlLnNlY29uZCkge1xuXHRcdFx0XHQvLyBuZXcgcmFuZ2Vcblx0XHRcdFx0dGhpcy5jbGVhclJhbmdlKCk7XG5cdFx0XHRcdHRoaXMuZmlyc3RSYW5nZSA9IGUuY3VycmVudDtcblx0XHRcdFx0dGhpcy5zZWNvbmRSYW5nZSA9IG51bGw7XG5cdFx0XHRcdHRoaXMuc2V0UmFuZ2UoKTtcblx0XHRcdH0gZWxzZSBpZiAoZS5maXJzdCAmJiAhZS5zZWNvbmQpIHtcblx0XHRcdFx0dGhpcy5zZWNvbmRSYW5nZSA9IGUuY3VycmVudDtcblx0XHRcdFx0dGhpcy5zZXRSYW5nZSgpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHRoaXMuZmlyc3RSYW5nZSA9IGUuY3VycmVudDtcblx0XHRcdFx0dGhpcy5zZXRSYW5nZSgpO1xuXHRcdFx0fVxuXHRcdH0uYmluZCh0aGlzKSk7XG5cblx0XHR0aGlzLm9uKHRoaXMucmlnaHRDYWwsICdtb3VzZW92ZXInLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHR0aGlzLmxlZnRDYWwuZGlzcGxheVJhbmdlVG9FbmQoKTtcblx0XHR9LmJpbmQodGhpcykpO1xuXHR9XG5cblx0ZGVzdHJveSAoKSB7XG5cdFx0dGhpcy5yaWdodENhbC5kZXN0cm95KCk7XG5cdFx0dGhpcy5sZWZ0Q2FsLmRlc3Ryb3koKTtcblx0fVxufVxuXG5jb25zdCBERUxJTUlURVIgPSAnIC0gJztcbmNvbnN0IHRvZGF5ID0gbmV3IERhdGUoKTtcblxuZnVuY3Rpb24gc3RyIChkKSB7XG5cdGlmICghZCkge1xuXHRcdHJldHVybiBudWxsO1xuXHR9XG5cdHJldHVybiBkYXRlcy5kYXRlVG9TdHIoZCk7XG59XG5cbmZ1bmN0aW9uIHNwbGl0ICh2YWx1ZSkge1xuXHRpZiAodmFsdWUuaW5kZXhPZignLCcpID4gLTEpIHtcblx0XHRyZXR1cm4gdmFsdWUuc3BsaXQoL1xccyosXFxzKi8pO1xuXHR9XG5cdHJldHVybiB2YWx1ZS5zcGxpdCgvXFxzKi1cXHMqLyk7XG59XG5cbmZ1bmN0aW9uIGlzRGF0ZUNsb3NlclRvTGVmdCAoZGF0ZSwgbGVmdCwgcmlnaHQpIHtcblx0Y29uc3QgZGlmZjEgPSBkYXRlcy5kaWZmKGRhdGUsIGxlZnQpLFxuXHRcdGRpZmYyID0gZGF0ZXMuZGlmZihkYXRlLCByaWdodCk7XG5cdHJldHVybiBkaWZmMSA8PSBkaWZmMjtcbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdkYXRlLXJhbmdlLXBpY2tlcicsIERhdGVSYW5nZVBpY2tlcik7XG5cbm1vZHVsZS5leHBvcnRzID0gRGF0ZVJhbmdlUGlja2VyOyIsInJlcXVpcmUoJy4vZ2xvYmFscycpO1xucmVxdWlyZSgnLi4vLi4vc3JjL2RhdGUtcGlja2VyJyk7XG5yZXF1aXJlKCcuLi8uLi9zcmMvZGF0ZS1pbnB1dCcpO1xucmVxdWlyZSgnLi4vLi4vc3JjL2RhdGUtcmFuZ2UtcGlja2VyJyk7XG5yZXF1aXJlKCcuLi8uLi9zcmMvZGF0ZS1yYW5nZS1pbnB1dCcpOyIsIndpbmRvd1snbm8tbmF0aXZlLXNoaW0nXSA9IGZhbHNlO1xucmVxdWlyZSgnY3VzdG9tLWVsZW1lbnRzLXBvbHlmaWxsJyk7XG53aW5kb3cub24gPSByZXF1aXJlKCdvbicpO1xud2luZG93LmRvbSA9IHJlcXVpcmUoJ2RvbScpOyJdfQ==
