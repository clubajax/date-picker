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
var props = ['label', 'name', 'type', 'placeholder', 'value', 'mask'];
var bools = [];

var DateInput = function (_BaseComponent) {
	_inherits(DateInput, _BaseComponent);

	_createClass(DateInput, [{
		key: 'onValue',
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
		set: function set(value) {
			var _this2 = this;

			// might need attributeChanged
			this.strDate = dates.isDateType(value) ? value : '';
			onDomReady(this, function () {
				_this2.setValue(_this2.strDate);
			});
		},
		get: function get() {
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

			if (!isNum(k)) {
				// handle paste, backspace
				if (this.input.value !== this.typedValue) {
					this.setValue(this.input.value);
				}
				stopEvent(e);
				return;
			}
			if (str.length !== end || beg !== end) {
				// handle selection or middle-string edit
				var temp = this.typedValue.substring(0, beg) + k + this.typedValue.substring(end);
				this.setValue(this.format(temp));
				// TODO
				// This might not be exactly right...
				// have to allow for the slashes
				if (end - beg) {
					e.target.selectionEnd = end - (end - beg - 1);
				} else {
					e.target.selectionEnd = end + 1;
				}
				stopEvent(e);
				return;
			}

			this.setValue(this.format(str + k));
		}
	}, {
		key: 'show',
		value: function show() {
			var _this3 = this;

			if (this.showing) {
				return;
			}
			this.showing = true;
			this.picker.classList.add('show');

			window.requestAnimationFrame(function () {
				var win = dom.box(window);
				var box = dom.box(_this3.picker);
				if (box.x + box.w > win.h) {
					_this3.picker.classList.add('right-align');
				}
				if (box.y + box.h > win.h) {
					_this3.picker.classList.add('bottom-align');
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
			var _this4 = this;

			this.mask = this.mask || defaultMask;
			this.maskLength = this.mask.match(/X/g).join('').length;

			this.labelNode.innerHTML = this.label || '';
			this.input.setAttribute('type', 'text');
			this.input.setAttribute('placeholder', this.placeholder || defaultPlaceholder);
			this.picker.on('change', function (e) {
				_this4.setValue(e.value);
			});
			this.connectKeys();
			this.registerHandle(handleOpen(this.input, this.picker, this.show.bind(this), this.hide.bind(this)));
		}
	}, {
		key: 'connectKeys',
		value: function connectKeys() {
			var _this5 = this;

			this.on(this.input, 'keydown', stopEvent);
			this.on(this.input, 'keypress', stopEvent);
			this.on(this.input, 'keyup', function (e) {
				_this5.onKey(e);
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

var props = ['value'];
var bools = ['range-expands'];

var DateRangeInput = function (_DateInput) {
	_inherits(DateRangeInput, _DateInput);

	_createClass(DateRangeInput, [{
		key: 'onValue',
		value: function onValue(value) {}
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQmFzZUNvbXBvbmVudC9zcmMvcHJvcGVydGllcy5qcyIsIm5vZGVfbW9kdWxlcy9CYXNlQ29tcG9uZW50L3NyYy9yZWZzLmpzIiwibm9kZV9tb2R1bGVzL0Jhc2VDb21wb25lbnQvc3JjL3RlbXBsYXRlLmpzIiwibm9kZV9tb2R1bGVzL2RhdGVzL3NyYy9kYXRlcy5qcyIsInNyYy9kYXRlLWlucHV0LmpzIiwic3JjL2RhdGUtcGlja2VyLmpzIiwic3JjL2RhdGUtcmFuZ2UtaW5wdXQuanMiLCJzcmMvZGF0ZS1yYW5nZS1waWNrZXIuanMiLCJ0ZXN0cy9zcmMvZGF0ZS1waWNrZXItdGVzdHMuanMiLCJ0ZXN0cy9zcmMvZ2xvYmFscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7O0FDMWRBLFFBQVEsZUFBUjtBQUNBLElBQU0sZ0JBQWdCLFFBQVEsZUFBUixDQUF0QjtBQUNBLElBQU0sUUFBUSxRQUFRLE9BQVIsQ0FBZDs7QUFFQSxJQUFNLHFCQUFxQixZQUEzQjtBQUNBLElBQU0sY0FBYyxZQUFwQjtBQUNBLElBQU0sUUFBUSxDQUFDLE9BQUQsRUFBVSxNQUFWLEVBQWtCLE1BQWxCLEVBQTBCLGFBQTFCLEVBQXlDLE9BQXpDLEVBQWtELE1BQWxELENBQWQ7QUFDQSxJ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LFNBQU8sSUFBUDtBQUNBO0FBQ0QsUUFBTyxNQUFNLFNBQU4sQ0FBZ0IsQ0FBaEIsQ0FBUDtBQUNBOztBQUVELFNBQVMsS0FBVCxDQUFnQixLQUFoQixFQUF1QjtBQUN0QixLQUFJLE1BQU0sT0FBTixDQUFjLEdBQWQsSUFBcUIsQ0FBQyxDQUExQixFQUE2QjtBQUM1QixTQUFPLE1BQU0sS0FBTixDQUFZLFNBQVosQ0FBUDtBQUNBO0FBQ0QsUUFBTyxNQUFNLEtBQU4sQ0FBWSxTQUFaLENBQVA7QUFDQTs7QUFFRCxTQUFTLGtCQUFULENBQTZCLElBQTdCLEVBQW1DLElBQW5DLEVBQXlDLEtBQXpDLEVBQWdEO0FBQy9DLEtBQU0sUUFBUSxNQUFNLElBQU4sQ0FBVyxJQUFYLEVBQWlCLElBQWpCLENBQWQ7QUFBQSxLQUNDLFFBQVEsTUFBTSxJQUFOLENBQVcsSUFBWCxFQUFpQixLQUFqQixDQURUO0FBRUEsUUFBTyxTQUFTLEtBQWhCO0FBQ0E7O0FBRUQsZUFBZSxNQUFmLENBQXNCLG1CQUF0QixFQUEyQyxlQUEzQzs7QUFFQSxPQUFPLE9BQVAsR0FBaUIsZUFBakI7Ozs7O0FDMVBBLFFBQVEsV0FBUjtBQUNBLFFBQVEsdUJBQVI7QUFDQSxRQUFRLHNCQUFSO0FBQ0EsUUFBUSw2QkFBUjtBQUNBLFFBQVEsNEJBQVI7Ozs7O0FDSkEsT0FBTyxnQkFBUCxJQUEyQixLQUEzQjtBQUNBLFFBQVEsMEJBQVI7QUFDQSxPQUFPLEVBQVAsR0FBWSxRQUFRLElBQVIsQ0FBWjtBQUNBLE9BQU8sR0FBUCxHQUFhLFFBQVEsS0FBUixDQUFiIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImNvbnN0IEJhc2VDb21wb25lbnQgPSByZXF1aXJlKCdCYXNlQ29tcG9uZW50Jyk7XG5jb25zdCBkb20gPSByZXF1aXJlKCdkb20nKTtcblxuZnVuY3Rpb24gc2V0Qm9vbGVhbiAobm9kZSwgcHJvcCkge1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkobm9kZSwgcHJvcCwge1xuXHRcdGVudW1lcmFibGU6IHRydWUsXG5cdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHRcdGdldCAoKSB7XG5cdFx0XHRyZXR1cm4gbm9kZS5oYXNBdHRyaWJ1dGUocHJvcCk7XG5cdFx0fSxcblx0XHRzZXQgKHZhbHVlKSB7XG5cdFx0XHR0aGlzLmlzU2V0dGluZ0F0dHJpYnV0ZSA9IHRydWU7XG5cdFx0XHRpZiAodmFsdWUpIHtcblx0XHRcdFx0dGhpcy5zZXRBdHRyaWJ1dGUocHJvcCwgJycpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5yZW1vdmVBdHRyaWJ1dGUocHJvcCk7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBmbiA9IHRoaXNbb25pZnkocHJvcCldO1xuXHRcdFx0aWYoZm4pe1xuXHRcdFx0XHRmbi5jYWxsKHRoaXMsIHZhbHVlKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5pc1NldHRpbmdBdHRyaWJ1dGUgPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBzZXRQcm9wZXJ0eSAobm9kZSwgcHJvcCkge1xuXHRsZXQgcHJvcFZhbHVlO1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkobm9kZSwgcHJvcCwge1xuXHRcdGVudW1lcmFibGU6IHRydWUsXG5cdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHRcdGdldCAoKSB7XG5cdFx0XHRyZXR1cm4gcHJvcFZhbHVlICE9PSB1bmRlZmluZWQgPyBwcm9wVmFsdWUgOiBkb20ubm9ybWFsaXplKHRoaXMuZ2V0QXR0cmlidXRlKHByb3ApKTtcblx0XHR9LFxuXHRcdHNldCAodmFsdWUpIHtcblx0XHRcdHRoaXMuaXNTZXR0aW5nQXR0cmlidXRlID0gdHJ1ZTtcblx0XHRcdHRoaXMuc2V0QXR0cmlidXRlKHByb3AsIHZhbHVlKTtcblx0XHRcdGNvbnN0IGZuID0gdGhpc1tvbmlmeShwcm9wKV07XG5cdFx0XHRpZihmbil7XG5cdFx0XHRcdG9uRG9tUmVhZHkodGhpcywgKCkgPT4ge1xuXHRcdFx0XHRcdHZhbHVlID0gZm4uY2FsbCh0aGlzLCB2YWx1ZSkgfHwgdmFsdWU7XG5cdFx0XHRcdFx0aWYodmFsdWUgIT09IHVuZGVmaW5lZCl7XG5cdFx0XHRcdFx0XHRwcm9wVmFsdWUgPSB2YWx1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5pc1NldHRpbmdBdHRyaWJ1dGUgPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBzZXRPYmplY3QgKG5vZGUsIHByb3ApIHtcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG5vZGUsIHByb3AsIHtcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcblx0XHRnZXQgKCkge1xuXHRcdFx0cmV0dXJuIHRoaXNbJ19fJyArIHByb3BdO1xuXHRcdH0sXG5cdFx0c2V0ICh2YWx1ZSkge1xuXHRcdFx0dGhpc1snX18nICsgcHJvcF0gPSB2YWx1ZTtcblx0XHR9XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBzZXRQcm9wZXJ0aWVzIChub2RlKSB7XG5cdGxldCBwcm9wcyA9IG5vZGUucHJvcHMgfHwgbm9kZS5wcm9wZXJ0aWVzO1xuXHRpZiAocHJvcHMpIHtcblx0XHRwcm9wcy5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG5cdFx0XHRpZiAocHJvcCA9PT0gJ2Rpc2FibGVkJykge1xuXHRcdFx0XHRzZXRCb29sZWFuKG5vZGUsIHByb3ApO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHNldFByb3BlcnR5KG5vZGUsIHByb3ApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHNldEJvb2xlYW5zIChub2RlKSB7XG5cdGxldCBwcm9wcyA9IG5vZGUuYm9vbHMgfHwgbm9kZS5ib29sZWFucztcblx0aWYgKHByb3BzKSB7XG5cdFx0cHJvcHMuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuXHRcdFx0c2V0Qm9vbGVhbihub2RlLCBwcm9wKTtcblx0XHR9KTtcblx0fVxufVxuXG5mdW5jdGlvbiBzZXRPYmplY3RzIChub2RlKSB7XG5cdGxldCBwcm9wcyA9IG5vZGUub2JqZWN0cztcblx0aWYgKHByb3BzKSB7XG5cdFx0cHJvcHMuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuXHRcdFx0c2V0T2JqZWN0KG5vZGUsIHByb3ApO1xuXHRcdH0pO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGNhcCAobmFtZSkge1xuXHRyZXR1cm4gbmFtZS5zdWJzdHJpbmcoMCwxKS50b1VwcGVyQ2FzZSgpICsgbmFtZS5zdWJzdHJpbmcoMSk7XG59XG5cbmZ1bmN0aW9uIG9uaWZ5IChuYW1lKSB7XG5cdHJldHVybiAnb24nICsgbmFtZS5zcGxpdCgnLScpLm1hcCh3b3JkID0+IGNhcCh3b3JkKSkuam9pbignJyk7XG59XG5cbmZ1bmN0aW9uIGlzQm9vbCAobm9kZSwgbmFtZSkge1xuXHRyZXR1cm4gKG5vZGUuYm9vbHMgfHwgbm9kZS5ib29sZWFucyB8fCBbXSkuaW5kZXhPZihuYW1lKSA+IC0xO1xufVxuXG5mdW5jdGlvbiBib29sTm9ybSAodmFsdWUpIHtcblx0aWYodmFsdWUgPT09ICcnKXtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXHRyZXR1cm4gZG9tLm5vcm1hbGl6ZSh2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIHByb3BOb3JtICh2YWx1ZSkge1xuXHRyZXR1cm4gZG9tLm5vcm1hbGl6ZSh2YWx1ZSk7XG59XG5cbkJhc2VDb21wb25lbnQuYWRkUGx1Z2luKHtcblx0bmFtZTogJ3Byb3BlcnRpZXMnLFxuXHRvcmRlcjogMTAsXG5cdGluaXQ6IGZ1bmN0aW9uIChub2RlKSB7XG5cdFx0c2V0UHJvcGVydGllcyhub2RlKTtcblx0XHRzZXRCb29sZWFucyhub2RlKTtcblx0fSxcblx0cHJlQXR0cmlidXRlQ2hhbmdlZDogZnVuY3Rpb24gKG5vZGUsIG5hbWUsIHZhbHVlKSB7XG5cdFx0aWYgKG5vZGUuaXNTZXR0aW5nQXR0cmlidXRlKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdGlmKGlzQm9vbChub2RlLCBuYW1lKSl7XG5cdFx0XHR2YWx1ZSA9IGJvb2xOb3JtKHZhbHVlKTtcblx0XHRcdG5vZGVbbmFtZV0gPSAhIXZhbHVlO1xuXHRcdFx0aWYoIXZhbHVlKXtcblx0XHRcdFx0bm9kZVtuYW1lXSA9IGZhbHNlO1xuXHRcdFx0XHRub2RlLmlzU2V0dGluZ0F0dHJpYnV0ZSA9IHRydWU7XG5cdFx0XHRcdG5vZGUucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuXHRcdFx0XHRub2RlLmlzU2V0dGluZ0F0dHJpYnV0ZSA9IGZhbHNlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bm9kZVtuYW1lXSA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0bm9kZVtuYW1lXSA9IHByb3BOb3JtKHZhbHVlKTtcblx0fVxufSk7IiwiY29uc3QgZG9tID0gcmVxdWlyZSgnZG9tJyk7XG5jb25zdCBCYXNlQ29tcG9uZW50ID0gcmVxdWlyZSgnQmFzZUNvbXBvbmVudCcpO1xuXG5mdW5jdGlvbiBhc3NpZ25SZWZzIChub2RlKSB7XG4gICAgZG9tLnF1ZXJ5QWxsKG5vZGUsICdbcmVmXScpLmZvckVhY2goZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICAgIGxldCBuYW1lID0gY2hpbGQuZ2V0QXR0cmlidXRlKCdyZWYnKTtcbiAgICAgICAgbm9kZVtuYW1lXSA9IGNoaWxkO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBhc3NpZ25FdmVudHMgKG5vZGUpIHtcbiAgICAvLyA8ZGl2IG9uPVwiY2xpY2s6b25DbGlja1wiPlxuICAgIGRvbS5xdWVyeUFsbChub2RlLCAnW29uXScpLmZvckVhY2goZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICAgIGxldFxuICAgICAgICAgICAga2V5VmFsdWUgPSBjaGlsZC5nZXRBdHRyaWJ1dGUoJ29uJyksXG4gICAgICAgICAgICBldmVudCA9IGtleVZhbHVlLnNwbGl0KCc6JylbMF0udHJpbSgpLFxuICAgICAgICAgICAgbWV0aG9kID0ga2V5VmFsdWUuc3BsaXQoJzonKVsxXS50cmltKCk7XG4gICAgICAgIG5vZGUub24oY2hpbGQsIGV2ZW50LCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgbm9kZVttZXRob2RdKGUpXG4gICAgICAgIH0pXG4gICAgfSk7XG59XG5cbkJhc2VDb21wb25lbnQuYWRkUGx1Z2luKHtcbiAgICBuYW1lOiAncmVmcycsXG4gICAgb3JkZXI6IDMwLFxuICAgIHByZUNvbm5lY3RlZDogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgYXNzaWduUmVmcyhub2RlKTtcbiAgICAgICAgYXNzaWduRXZlbnRzKG5vZGUpO1xuICAgIH1cbn0pOyIsImNvbnN0IEJhc2VDb21wb25lbnQgID0gcmVxdWlyZSgnQmFzZUNvbXBvbmVudCcpO1xuY29uc3QgZG9tID0gcmVxdWlyZSgnZG9tJyk7XG5cbnZhclxuICAgIGxpZ2h0Tm9kZXMgPSB7fSxcbiAgICBpbnNlcnRlZCA9IHt9O1xuXG5mdW5jdGlvbiBpbnNlcnQgKG5vZGUpIHtcbiAgICBpZihpbnNlcnRlZFtub2RlLl91aWRdIHx8ICFoYXNUZW1wbGF0ZShub2RlKSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29sbGVjdExpZ2h0Tm9kZXMobm9kZSk7XG4gICAgaW5zZXJ0VGVtcGxhdGUobm9kZSk7XG4gICAgaW5zZXJ0ZWRbbm9kZS5fdWlkXSA9IHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbGxlY3RMaWdodE5vZGVzKG5vZGUpe1xuICAgIGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXSA9IGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXSB8fCBbXTtcbiAgICB3aGlsZShub2RlLmNoaWxkTm9kZXMubGVuZ3RoKXtcbiAgICAgICAgbGlnaHROb2Rlc1tub2RlLl91aWRdLnB1c2gobm9kZS5yZW1vdmVDaGlsZChub2RlLmNoaWxkTm9kZXNbMF0pKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGhhc1RlbXBsYXRlIChub2RlKSB7XG4gICAgcmV0dXJuICEhbm9kZS5nZXRUZW1wbGF0ZU5vZGUoKTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0VGVtcGxhdGVDaGFpbiAobm9kZSkge1xuICAgIHZhciB0ZW1wbGF0ZXMgPSBub2RlLmdldFRlbXBsYXRlQ2hhaW4oKTtcbiAgICB0ZW1wbGF0ZXMucmV2ZXJzZSgpLmZvckVhY2goZnVuY3Rpb24gKHRlbXBsYXRlKSB7XG4gICAgICAgIGdldENvbnRhaW5lcihub2RlKS5hcHBlbmRDaGlsZChCYXNlQ29tcG9uZW50LmNsb25lKHRlbXBsYXRlKSk7XG4gICAgfSk7XG4gICAgaW5zZXJ0Q2hpbGRyZW4obm9kZSk7XG59XG5cbmZ1bmN0aW9uIGluc2VydFRlbXBsYXRlIChub2RlKSB7XG4gICAgaWYobm9kZS5uZXN0ZWRUZW1wbGF0ZSl7XG4gICAgICAgIGluc2VydFRlbXBsYXRlQ2hhaW4obm9kZSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyXG4gICAgICAgIHRlbXBsYXRlTm9kZSA9IG5vZGUuZ2V0VGVtcGxhdGVOb2RlKCk7XG5cbiAgICBpZih0ZW1wbGF0ZU5vZGUpIHtcbiAgICAgICAgbm9kZS5hcHBlbmRDaGlsZChCYXNlQ29tcG9uZW50LmNsb25lKHRlbXBsYXRlTm9kZSkpO1xuICAgIH1cbiAgICBpbnNlcnRDaGlsZHJlbihub2RlKTtcbn1cblxuZnVuY3Rpb24gZ2V0Q29udGFpbmVyIChub2RlKSB7XG4gICAgdmFyIGNvbnRhaW5lcnMgPSBub2RlLnF1ZXJ5U2VsZWN0b3JBbGwoJ1tyZWY9XCJjb250YWluZXJcIl0nKTtcbiAgICBpZighY29udGFpbmVycyB8fCAhY29udGFpbmVycy5sZW5ndGgpe1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRhaW5lcnNbY29udGFpbmVycy5sZW5ndGggLSAxXTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0Q2hpbGRyZW4gKG5vZGUpIHtcbiAgICB2YXIgaSxcbiAgICAgICAgY29udGFpbmVyID0gZ2V0Q29udGFpbmVyKG5vZGUpLFxuICAgICAgICBjaGlsZHJlbiA9IGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXTtcblxuICAgIGlmKGNvbnRhaW5lciAmJiBjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGgpe1xuICAgICAgICBmb3IoaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoY2hpbGRyZW5baV0pO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5CYXNlQ29tcG9uZW50LnByb3RvdHlwZS5nZXRMaWdodE5vZGVzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBsaWdodE5vZGVzW3RoaXMuX3VpZF07XG59O1xuXG5CYXNlQ29tcG9uZW50LnByb3RvdHlwZS5nZXRUZW1wbGF0ZU5vZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gY2FjaGluZyBjYXVzZXMgZGlmZmVyZW50IGNsYXNzZXMgdG8gcHVsbCB0aGUgc2FtZSB0ZW1wbGF0ZSAtIHdhdD9cbiAgICAvL2lmKCF0aGlzLnRlbXBsYXRlTm9kZSkge1xuICAgICAgICBpZiAodGhpcy50ZW1wbGF0ZUlkKSB7XG4gICAgICAgICAgICB0aGlzLnRlbXBsYXRlTm9kZSA9IGRvbS5ieUlkKHRoaXMudGVtcGxhdGVJZC5yZXBsYWNlKCcjJywnJykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMudGVtcGxhdGVTdHJpbmcpIHtcbiAgICAgICAgICAgIHRoaXMudGVtcGxhdGVOb2RlID0gZG9tLnRvRG9tKCc8dGVtcGxhdGU+JyArIHRoaXMudGVtcGxhdGVTdHJpbmcgKyAnPC90ZW1wbGF0ZT4nKTtcbiAgICAgICAgfVxuICAgIC8vfVxuICAgIHJldHVybiB0aGlzLnRlbXBsYXRlTm9kZTtcbn07XG5cbkJhc2VDb21wb25lbnQucHJvdG90eXBlLmdldFRlbXBsYXRlQ2hhaW4gPSBmdW5jdGlvbiAoKSB7XG5cbiAgICBsZXRcbiAgICAgICAgY29udGV4dCA9IHRoaXMsXG4gICAgICAgIHRlbXBsYXRlcyA9IFtdLFxuICAgICAgICB0ZW1wbGF0ZTtcblxuICAgIC8vIHdhbGsgdGhlIHByb3RvdHlwZSBjaGFpbjsgQmFiZWwgZG9lc24ndCBhbGxvdyB1c2luZ1xuICAgIC8vIGBzdXBlcmAgc2luY2Ugd2UgYXJlIG91dHNpZGUgb2YgdGhlIENsYXNzXG4gICAgd2hpbGUoY29udGV4dCl7XG4gICAgICAgIGNvbnRleHQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoY29udGV4dCk7XG4gICAgICAgIGlmKCFjb250ZXh0KXsgYnJlYWs7IH1cbiAgICAgICAgLy8gc2tpcCBwcm90b3R5cGVzIHdpdGhvdXQgYSB0ZW1wbGF0ZVxuICAgICAgICAvLyAoZWxzZSBpdCB3aWxsIHB1bGwgYW4gaW5oZXJpdGVkIHRlbXBsYXRlIGFuZCBjYXVzZSBkdXBsaWNhdGVzKVxuICAgICAgICBpZihjb250ZXh0Lmhhc093blByb3BlcnR5KCd0ZW1wbGF0ZVN0cmluZycpIHx8IGNvbnRleHQuaGFzT3duUHJvcGVydHkoJ3RlbXBsYXRlSWQnKSkge1xuICAgICAgICAgICAgdGVtcGxhdGUgPSBjb250ZXh0LmdldFRlbXBsYXRlTm9kZSgpO1xuICAgICAgICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGVzLnB1c2godGVtcGxhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0ZW1wbGF0ZXM7XG59O1xuXG5CYXNlQ29tcG9uZW50LmFkZFBsdWdpbih7XG4gICAgbmFtZTogJ3RlbXBsYXRlJyxcbiAgICBvcmRlcjogMjAsXG4gICAgcHJlQ29ubmVjdGVkOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICBpbnNlcnQobm9kZSk7XG4gICAgfVxufSk7IiwiLyogVU1ELmRlZmluZSAqLyAoZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgICBpZiAodHlwZW9mIGN1c3RvbUxvYWRlciA9PT0gJ2Z1bmN0aW9uJyl7IGN1c3RvbUxvYWRlcihmYWN0b3J5LCAnZGF0ZXMnKTsgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCl7IGRlZmluZShbXSwgZmFjdG9yeSk7IH1cbiAgICBlbHNlIGlmKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jyl7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpOyB9XG4gICAgZWxzZXsgcm9vdC5yZXR1cm5FeHBvcnRzID0gZmFjdG9yeSgpO1xuICAgICAgICB3aW5kb3cuZGF0ZXMgPSBmYWN0b3J5KCk7IH1cbn0odGhpcywgZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIC8vIGRhdGVzLmpzXG4gICAgLy8gIGRhdGUgaGVscGVyIGxpYlxuICAgIC8vXG4gICAgdmFyXG4gICAgICAgIC8vIHRlc3RzIHRoYXQgaXQgaXMgYSBkYXRlIHN0cmluZywgbm90IGEgdmFsaWQgZGF0ZS4gODgvODgvODg4OCB3b3VsZCBiZSB0cnVlXG4gICAgICAgIGRhdGVSZWdFeHAgPSAvXihcXGR7MSwyfSkoW1xcLy1dKShcXGR7MSwyfSkoW1xcLy1dKShcXGR7NH0pXFxiLyxcbiAgICAgICAgLy8gMjAxNS0wNS0yNlQwMDowMDowMFxuICAgICAgICB0c1JlZ0V4cCA9IC9eKFxcZHs0fSktKFxcZHsyfSktKFxcZHsyfSlUKFxcZHsyfSk6KFxcZHsyfSk6KFxcZHsyfSlcXGIvLFxuXG4gICAgICAgIGRheXNPZldlZWsgPSBbJ1N1bmRheScsICdNb25kYXknLCAnVHVlc2RheScsICdXZWRuZXNkYXknLCAnVGh1cnNkYXknLCAnRnJpZGF5JywgJ1NhdHVyZGF5J10sXG4gICAgICAgIGRheXMgPSBbXSxcbiAgICAgICAgZGF5czMgPSBbXSxcbiAgICAgICAgZGF5RGljdCA9IHt9LFxuXG4gICAgICAgIG1vbnRocyA9IFsnSmFudWFyeScsICdGZWJydWFyeScsICdNYXJjaCcsICdBcHJpbCcsICdNYXknLCAnSnVuZScsICdKdWx5JywgJ0F1Z3VzdCcsICdTZXB0ZW1iZXInLCAnT2N0b2JlcicsICdOb3ZlbWJlcicsICdEZWNlbWJlciddLFxuICAgICAgICBtb250aExlbmd0aHMgPSBbMzEsIDI4LCAzMSwgMzAsIDMxLCAzMCwgMzEsIDMxLCAzMCwgMzEsIDMwLCAzMV0sXG4gICAgICAgIG1vbnRoQWJiciA9IFtdLFxuICAgICAgICBtb250aERpY3QgPSB7fSxcblxuICAgICAgICBkYXRlUGF0dGVybiA9IC95eXl5fHl5fG1tfG18TU18TXxkZHxkL2csXG4gICAgICAgIGRhdGVQYXR0ZXJuTGlicmFyeSA9IHtcbiAgICAgICAgICAgIHl5eXk6IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZS5nZXRGdWxsWWVhcigpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHl5OiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChkYXRlLmdldEZ1bGxZZWFyKCkgKyAnJykuc3Vic3RyaW5nKDIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1tOiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhZChkYXRlLmdldE1vbnRoKCkgKyAxKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtOiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGUuZ2V0TW9udGgoKSArIDE7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgTU06IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbW9udGhzW2RhdGUuZ2V0TW9udGgoKV07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgTTogZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBtb250aEFiYnJbZGF0ZS5nZXRNb250aCgpXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZDogZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYWQoZGF0ZS5nZXREYXRlKCkpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGQ6IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZS5nZXREYXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGF0ZXMsXG5cbiAgICAgICAgbGVuZ3RoID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyXG4gICAgICAgICAgICAgICAgc2VjID0gMTAwMCxcbiAgICAgICAgICAgICAgICBtaW4gPSBzZWMgKiA2MCxcbiAgICAgICAgICAgICAgICBociA9IG1pbiAqIDYwLFxuICAgICAgICAgICAgICAgIGRheSA9IGhyICogMjQsXG4gICAgICAgICAgICAgICAgd2VlayA9IGRheSAqIDc7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHNlYzogc2VjLFxuICAgICAgICAgICAgICAgIG1pbjogbWluLFxuICAgICAgICAgICAgICAgIGhyOiBocixcbiAgICAgICAgICAgICAgICBkYXk6IGRheSxcbiAgICAgICAgICAgICAgICB3ZWVrOiB3ZWVrXG4gICAgICAgICAgICB9O1xuICAgICAgICB9KCkpO1xuXG4gICAgLy8gcG9wdWxhdGUgZGF5LXJlbGF0ZWQgc3RydWN0dXJlc1xuICAgIGRheXNPZldlZWsuZm9yRWFjaChmdW5jdGlvbihkYXksIGluZGV4KSB7XG4gICAgICAgIGRheURpY3RbZGF5XSA9IGluZGV4O1xuICAgICAgICB2YXIgYWJiciA9IGRheS5zdWJzdHIoMCwgMik7XG4gICAgICAgIGRheXMucHVzaChhYmJyKTtcbiAgICAgICAgZGF5RGljdFthYmJyXSA9IGluZGV4O1xuICAgICAgICBhYmJyID0gZGF5LnN1YnN0cigwLCAzKTtcbiAgICAgICAgZGF5czMucHVzaChhYmJyKTtcbiAgICAgICAgZGF5RGljdFthYmJyXSA9IGluZGV4O1xuICAgIH0pO1xuXG4gICAgLy8gcG9wdWxhdGUgbW9udGgtcmVsYXRlZCBzdHJ1Y3R1cmVzXG4gICAgbW9udGhzLmZvckVhY2goZnVuY3Rpb24obW9udGgsIGluZGV4KSB7XG4gICAgICAgIG1vbnRoRGljdFttb250aF0gPSBpbmRleDtcbiAgICAgICAgdmFyIGFiYnIgPSBtb250aC5zdWJzdHIoMCwgMyk7XG4gICAgICAgIG1vbnRoQWJici5wdXNoKGFiYnIpO1xuICAgICAgICBtb250aERpY3RbYWJicl0gPSBpbmRleDtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGlzTGVhcFllYXIoZGF0ZU9yWWVhcikge1xuICAgICAgICB2YXIgeWVhciA9IGRhdGVPclllYXIgaW5zdGFuY2VvZiBEYXRlID8gZGF0ZU9yWWVhci5nZXRGdWxsWWVhcigpIDogZGF0ZU9yWWVhcjtcbiAgICAgICAgcmV0dXJuICEoeWVhciAlIDQwMCkgfHwgKCEoeWVhciAlIDQpICYmICEhKHllYXIgJSAxMDApKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1ZhbGlkT2JqZWN0IChkYXRlKSB7XG4gICAgICAgIHZhciBtcztcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlID09PSAnb2JqZWN0JyAmJiBkYXRlIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICAgICAgbXMgPSBkYXRlLmdldFRpbWUoKTtcbiAgICAgICAgICAgIHJldHVybiAhaXNOYU4obXMpICYmIG1zID4gMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNEYXRlVHlwZSh2YWx1ZSkge1xuICAgICAgICB2YXIgcGFydHMsIGRheSwgbW9udGgsIHllYXIsIGhvdXJzLCBtaW51dGVzLCBzZWNvbmRzLCBtcztcbiAgICAgICAgc3dpdGNoICh0eXBlb2YgdmFsdWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGlzVmFsaWRPYmplY3QodmFsdWUpO1xuICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICAvLyBpcyBpdCBhIGRhdGUgaW4gVVMgZm9ybWF0P1xuICAgICAgICAgICAgICAgIHBhcnRzID0gZGF0ZVJlZ0V4cC5leGVjKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAocGFydHMgJiYgcGFydHNbMl0gPT09IHBhcnRzWzRdKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vbnRoID0gK3BhcnRzWzFdO1xuICAgICAgICAgICAgICAgICAgICBkYXkgPSArcGFydHNbM107XG4gICAgICAgICAgICAgICAgICAgIHllYXIgPSArcGFydHNbNV07XG4gICAgICAgICAgICAgICAgICAgIC8vIHJvdWdoIGNoZWNrIG9mIGEgeWVhclxuICAgICAgICAgICAgICAgICAgICBpZiAoMCA8IHllYXIgJiYgeWVhciA8IDIxMDAgJiYgMSA8PSBtb250aCAmJiBtb250aCA8PSAxMiAmJiAxIDw9IGRheSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgZGF5IDw9IChtb250aCA9PT0gMiAmJiBpc0xlYXBZZWFyKHllYXIpID8gMjkgOiBtb250aExlbmd0aHNbbW9udGggLSAxXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGlzIGl0IGEgdGltZXN0YW1wIGluIGEgc3RhbmRhcmQgZm9ybWF0P1xuICAgICAgICAgICAgICAgIHBhcnRzID0gdHNSZWdFeHAuZXhlYyh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHllYXIgPSArcGFydHNbMV07XG4gICAgICAgICAgICAgICAgICAgIG1vbnRoID0gK3BhcnRzWzJdO1xuICAgICAgICAgICAgICAgICAgICBkYXkgPSArcGFydHNbM107XG4gICAgICAgICAgICAgICAgICAgIGhvdXJzID0gK3BhcnRzWzRdO1xuICAgICAgICAgICAgICAgICAgICBtaW51dGVzID0gK3BhcnRzWzVdO1xuICAgICAgICAgICAgICAgICAgICBzZWNvbmRzID0gK3BhcnRzWzZdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoMCA8IHllYXIgJiYgeWVhciA8IDIxMDAgJiYgMSA8PSBtb250aCAmJiBtb250aCA8PSAxMiAmJiAxIDw9IGRheSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgZGF5IDw9IChtb250aCA9PT0gMiAmJiBpc0xlYXBZZWFyKHllYXIpID8gMjkgOiBtb250aExlbmd0aHNbbW9udGggLSAxXSkgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvdXJzIDwgMjQgJiYgbWludXRlcyA8IDYwICYmIHNlY29uZHMgPCA2MCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBpbnRlbnRpb25hbCBmYWxsLWRvd25cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFkKG51bSkge1xuICAgICAgICByZXR1cm4gKG51bSA8IDEwID8gJzAnIDogJycpICsgbnVtO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1vbnRoKGRhdGVPckluZGV4KSB7XG4gICAgICAgIHJldHVybiB0eXBlb2YgZGF0ZU9ySW5kZXggPT09ICdudW1iZXInID8gZGF0ZU9ySW5kZXggOiBkYXRlT3JJbmRleC5nZXRNb250aCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1vbnRoSW5kZXgobmFtZSkge1xuICAgICAgICAvLyBUT0RPOiBkbyB3ZSByZWFsbHkgd2FudCBhIDAtYmFzZWQgaW5kZXg/IG9yIHNob3VsZCBpdCBiZSBhIDEtYmFzZWQgb25lP1xuICAgICAgICB2YXIgaW5kZXggPSBtb250aERpY3RbbmFtZV07XG4gICAgICAgIHJldHVybiB0eXBlb2YgaW5kZXggPT09ICdudW1iZXInID8gaW5kZXggOiB2b2lkIDA7XG4gICAgICAgIC8vIFRPRE86IHdlIHJldHVybiB1bmRlZmluZWQgZm9yIHdyb25nIG1vbnRoIG5hbWVzIC0tLSBpcyBpdCByaWdodD9cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNb250aE5hbWUoZGF0ZSkge1xuICAgICAgICByZXR1cm4gbW9udGhzW2dldE1vbnRoKGRhdGUpXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRGaXJzdFN1bmRheShkYXRlKSB7XG4gICAgICAgIC8vIFRPRE86IHdoYXQgZG9lcyBpdCByZXR1cm4/IGEgbmVnYXRpdmUgaW5kZXggcmVsYXRlZCB0byB0aGUgMXN0IG9mIHRoZSBtb250aD9cbiAgICAgICAgdmFyIGQgPSBuZXcgRGF0ZShkYXRlLmdldFRpbWUoKSk7XG4gICAgICAgIGQuc2V0RGF0ZSgxKTtcbiAgICAgICAgcmV0dXJuIC1kLmdldERheSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldERheXNJblByZXZNb250aChkYXRlKSB7XG4gICAgICAgIHZhciBkID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgIGQuc2V0TW9udGgoZC5nZXRNb250aCgpIC0gMSk7XG4gICAgICAgIHJldHVybiBnZXREYXlzSW5Nb250aChkKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXREYXlzSW5Nb250aChkYXRlKSB7XG4gICAgICAgIHZhciBtb250aCA9IGRhdGUuZ2V0TW9udGgoKTtcbiAgICAgICAgcmV0dXJuIG1vbnRoID09PSAxICYmIGlzTGVhcFllYXIoZGF0ZSkgPyAyOSA6IG1vbnRoTGVuZ3Roc1ttb250aF07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3RyVG9EYXRlKHN0cikge1xuICAgICAgICBpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGVzLnRpbWVzdGFtcC5pcyhzdHIpKSB7XG4gICAgICAgICAgICAvLyAyMDAwLTAyLTI5VDAwOjAwOjAwXG4gICAgICAgICAgICByZXR1cm4gZGF0ZXMudGltZXN0YW1wLmZyb20oc3RyKTtcbiAgICAgICAgfVxuICAgICAgICAvLyAxMS8yMC8yMDAwXG4gICAgICAgIHZhciBwYXJ0cyA9IGRhdGVSZWdFeHAuZXhlYyhzdHIpO1xuICAgICAgICBpZiAocGFydHMgJiYgcGFydHNbMl0gPT09IHBhcnRzWzRdKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoK3BhcnRzWzVdLCArcGFydHNbMV0gLSAxLCArcGFydHNbM10pO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE86IHdoYXQgdG8gcmV0dXJuIGZvciBhbiBpbnZhbGlkIGRhdGU/IG51bGw/XG4gICAgICAgIHJldHVybiBuZXcgRGF0ZSgtMSk7IC8vIGludmFsaWQgZGF0ZVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZvcm1hdERhdGVQYXR0ZXJuKGRhdGUsIHBhdHRlcm4pIHtcbiAgICAgICAgLy8gJ00gZCwgeXl5eScgRGVjIDUsIDIwMTVcbiAgICAgICAgLy8gJ01NIGRkIHl5JyBEZWNlbWJlciAwNSAxNVxuICAgICAgICAvLyAnbS1kLXl5JyAxLTEtMTVcbiAgICAgICAgLy8gJ21tLWRkLXl5eXknIDAxLTAxLTIwMTVcbiAgICAgICAgLy8gJ20vZC95eScgMTIvMjUvMTVcblxuICAgICAgICByZXR1cm4gcGF0dGVybi5yZXBsYWNlKGRhdGVQYXR0ZXJuLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0ZVBhdHRlcm5MaWJyYXJ5W25hbWVdKGRhdGUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmb3JtYXREYXRlKGRhdGUsIGRlbGltaXRlck9yUGF0dGVybikge1xuICAgICAgICBpZiAoZGVsaW1pdGVyT3JQYXR0ZXJuICYmIGRlbGltaXRlck9yUGF0dGVybi5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0RGF0ZVBhdHRlcm4oZGF0ZSwgZGVsaW1pdGVyT3JQYXR0ZXJuKTtcbiAgICAgICAgfVxuICAgICAgICB2YXJcbiAgICAgICAgICAgIGRlbCA9IGRlbGltaXRlck9yUGF0dGVybiB8fCAnLycsXG4gICAgICAgICAgICB5ID0gZGF0ZS5nZXRGdWxsWWVhcigpLFxuICAgICAgICAgICAgbSA9IGRhdGUuZ2V0TW9udGgoKSArIDEsXG4gICAgICAgICAgICBkID0gZGF0ZS5nZXREYXRlKCk7XG5cbiAgICAgICAgcmV0dXJuIFtwYWQobSksIHBhZChkKSwgeV0uam9pbihkZWwpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRhdGVUb1N0cihkYXRlLCBkZWxpbWl0ZXIpIHtcbiAgICAgICAgcmV0dXJuIGZvcm1hdERhdGUoZGF0ZSwgZGVsaW1pdGVyKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmb3JtYXRUaW1lKGRhdGUsIHVzZVBlcmlvZCkge1xuICAgICAgICBpZiAodHlwZW9mIGRhdGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBkYXRlID0gc3RyVG9EYXRlKGRhdGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyXG4gICAgICAgICAgICBwZXJpb2QgPSAnQU0nLFxuICAgICAgICAgICAgaG91cnMgPSBkYXRlLmdldEhvdXJzKCksXG4gICAgICAgICAgICBtaW51dGVzID0gZGF0ZS5nZXRNaW51dGVzKCksXG4gICAgICAgICAgICByZXR2YWwsXG4gICAgICAgICAgICBzZWNvbmRzID0gZGF0ZS5nZXRTZWNvbmRzKCk7XG5cbiAgICAgICAgaWYgKGhvdXJzID4gMTEpIHtcbiAgICAgICAgICAgIGhvdXJzIC09IDEyO1xuICAgICAgICAgICAgcGVyaW9kID0gJ1BNJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaG91cnMgPT09IDApIHtcbiAgICAgICAgICAgIGhvdXJzID0gMTI7XG4gICAgICAgIH1cblxuICAgICAgICByZXR2YWwgPSBob3VycyArICc6JyArIHBhZChtaW51dGVzKSArICc6JyArIHBhZChzZWNvbmRzKTtcblxuICAgICAgICBpZiAodXNlUGVyaW9kID09IHRydWUpIHtcbiAgICAgICAgICAgIHJldHZhbCA9IHJldHZhbCArICcgJyArIHBlcmlvZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVyaW9kKGRhdGUpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZGF0ZSA9IHN0clRvRGF0ZShkYXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBob3VycyA9IGRhdGUuZ2V0SG91cnMoKTtcblxuICAgICAgICByZXR1cm4gaG91cnMgPiAxMSA/ICdQTScgOiAnQU0nO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRvSVNPKGRhdGUsIGluY2x1ZGVUWikge1xuICAgICAgICB2YXJcbiAgICAgICAgICAgIHN0cixcbiAgICAgICAgICAgIG5vdyA9IG5ldyBEYXRlKCksXG4gICAgICAgICAgICB0aGVuID0gbmV3IERhdGUoZGF0ZS5nZXRUaW1lKCkpO1xuICAgICAgICB0aGVuLnNldEhvdXJzKG5vdy5nZXRIb3VycygpKTtcbiAgICAgICAgc3RyID0gdGhlbi50b0lTT1N0cmluZygpO1xuICAgICAgICBpZiAoIWluY2x1ZGVUWikge1xuICAgICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCcuJylbMF07XG4gICAgICAgICAgICBzdHIgKz0gJy4wMFonO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbmF0dXJhbChkYXRlKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZGF0ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGRhdGUgPSB0aGlzLmZyb20oZGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXJcbiAgICAgICAgICAgIHllYXIgPSBkYXRlLmdldEZ1bGxZZWFyKCkudG9TdHJpbmcoKS5zdWJzdHIoMiksXG4gICAgICAgICAgICBtb250aCA9IGRhdGUuZ2V0TW9udGgoKSArIDEsXG4gICAgICAgICAgICBkYXkgPSBkYXRlLmdldERhdGUoKSxcbiAgICAgICAgICAgIGhvdXJzID0gZGF0ZS5nZXRIb3VycygpLFxuICAgICAgICAgICAgbWludXRlcyA9IGRhdGUuZ2V0TWludXRlcygpLFxuICAgICAgICAgICAgcGVyaW9kID0gJ0FNJztcblxuICAgICAgICBpZiAoaG91cnMgPiAxMSkge1xuICAgICAgICAgICAgaG91cnMgLT0gMTI7XG4gICAgICAgICAgICBwZXJpb2QgPSAnUE0nO1xuICAgICAgICB9XG4gICAgICAgIGlmIChob3VycyA9PT0gMCkge1xuICAgICAgICAgICAgaG91cnMgPSAxMjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBob3VycyArICc6JyArIHBhZChtaW51dGVzKSArICcgJyArIHBlcmlvZCArICcgb24gJyArIHBhZChtb250aCkgKyAnLycgKyBwYWQoZGF5KSArICcvJyArIHllYXI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkRGF5cyAoZGF0ZSwgZGF5cykge1xuICAgICAgICBjb25zb2xlLndhcm4oJ2FkZERheXMgaXMgZGVwcmVjYXRlZC4gSW5zdGVhZCwgdXNlIGBhZGRgJyk7XG4gICAgICAgIHJldHVybiBhZGQoZGF0ZSwgZGF5cyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkIChkYXRlLCBhbW91bnQsIGRhdGVUeXBlKSB7XG4gICAgICAgIHJldHVybiBzdWJ0cmFjdChkYXRlLCAtYW1vdW50LCBkYXRlVHlwZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3VidHJhY3QoZGF0ZSwgYW1vdW50LCBkYXRlVHlwZSkge1xuICAgICAgICAvLyBzdWJ0cmFjdCBOIGRheXMgZnJvbSBkYXRlXG4gICAgICAgIHZhclxuICAgICAgICAgICAgdGltZSA9IGRhdGUuZ2V0VGltZSgpLFxuICAgICAgICAgICAgdG1wID0gbmV3IERhdGUodGltZSk7XG5cbiAgICAgICAgaWYoZGF0ZVR5cGUgPT09ICdtb250aCcpe1xuICAgICAgICAgICAgdG1wLnNldE1vbnRoKHRtcC5nZXRNb250aCgpIC0gYW1vdW50KTtcbiAgICAgICAgICAgIHJldHVybiB0bXA7XG4gICAgICAgIH1cbiAgICAgICAgaWYoZGF0ZVR5cGUgPT09ICd5ZWFyJyl7XG4gICAgICAgICAgICB0bXAuc2V0RnVsbFllYXIodG1wLmdldEZ1bGxZZWFyKCkgLSBhbW91bnQpO1xuICAgICAgICAgICAgcmV0dXJuIHRtcDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXcgRGF0ZSh0aW1lIC0gbGVuZ3RoLmRheSAqIGFtb3VudCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3VidHJhY3REYXRlKGRhdGUxLCBkYXRlMiwgZGF0ZVR5cGUpIHtcbiAgICAgICAgLy8gZGF0ZVR5cGU6IHdlZWssIGRheSwgaHIsIG1pbiwgc2VjXG4gICAgICAgIC8vIHBhc3QgZGF0ZXMgaGF2ZSBhIHBvc2l0aXZlIHZhbHVlXG4gICAgICAgIC8vIGZ1dHVyZSBkYXRlcyBoYXZlIGEgbmVnYXRpdmUgdmFsdWVcblxuICAgICAgICB2YXIgZGl2aWRlQnkgPSB7XG4gICAgICAgICAgICAgICAgd2VlazogbGVuZ3RoLndlZWssXG4gICAgICAgICAgICAgICAgZGF5OiBsZW5ndGguZGF5LFxuICAgICAgICAgICAgICAgIGhyOiBsZW5ndGguaHIsXG4gICAgICAgICAgICAgICAgbWluOiBsZW5ndGgubWluLFxuICAgICAgICAgICAgICAgIHNlYzogbGVuZ3RoLnNlY1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHV0YzEgPSBEYXRlLlVUQyhkYXRlMS5nZXRGdWxsWWVhcigpLCBkYXRlMS5nZXRNb250aCgpLCBkYXRlMS5nZXREYXRlKCkpLFxuICAgICAgICAgICAgdXRjMiA9IERhdGUuVVRDKGRhdGUyLmdldEZ1bGxZZWFyKCksIGRhdGUyLmdldE1vbnRoKCksIGRhdGUyLmdldERhdGUoKSk7XG5cbiAgICAgICAgZGF0ZVR5cGUgPSBkYXRlVHlwZS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKCh1dGMyIC0gdXRjMSkgLyBkaXZpZGVCeVtkYXRlVHlwZV0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzTGVzcyAoZDEsIGQyKSB7XG4gICAgICAgIGlmKGlzVmFsaWRPYmplY3QoZDEpICYmIGlzVmFsaWRPYmplY3QoZDIpKXtcbiAgICAgICAgICAgIHJldHVybiBkMS5nZXRUaW1lKCkgPCBkMi5nZXRUaW1lKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzR3JlYXRlciAoZDEsIGQyKSB7XG4gICAgICAgIGlmKGlzVmFsaWRPYmplY3QoZDEpICYmIGlzVmFsaWRPYmplY3QoZDIpKXtcbiAgICAgICAgICAgIHJldHVybiBkMS5nZXRUaW1lKCkgPiBkMi5nZXRUaW1lKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpZmYoZGF0ZTEsIGRhdGUyKSB7XG4gICAgICAgIC8vIHJldHVybiB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIDIgZGF0ZXMgaW4gZGF5c1xuICAgICAgICB2YXIgdXRjMSA9IERhdGUuVVRDKGRhdGUxLmdldEZ1bGxZZWFyKCksIGRhdGUxLmdldE1vbnRoKCksIGRhdGUxLmdldERhdGUoKSksXG4gICAgICAgICAgICB1dGMyID0gRGF0ZS5VVEMoZGF0ZTIuZ2V0RnVsbFllYXIoKSwgZGF0ZTIuZ2V0TW9udGgoKSwgZGF0ZTIuZ2V0RGF0ZSgpKTtcblxuICAgICAgICByZXR1cm4gTWF0aC5hYnMoTWF0aC5mbG9vcigodXRjMiAtIHV0YzEpIC8gbGVuZ3RoLmRheSkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvcHkgKGRhdGUpIHtcbiAgICAgICAgaWYoaXNWYWxpZE9iamVjdChkYXRlKSl7XG4gICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoZGF0ZS5nZXRUaW1lKCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE5hdHVyYWxEYXkoZGF0ZSwgY29tcGFyZURhdGUsIG5vRGF5c09mV2Vlaykge1xuXG4gICAgICAgIHZhclxuICAgICAgICAgICAgdG9kYXkgPSBjb21wYXJlRGF0ZSB8fCBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgZGF5c0FnbyA9IHN1YnRyYWN0RGF0ZShkYXRlLCB0b2RheSwgJ2RheScpO1xuXG4gICAgICAgIGlmICghZGF5c0Fnbykge1xuICAgICAgICAgICAgcmV0dXJuICdUb2RheSc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRheXNBZ28gPT09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiAnWWVzdGVyZGF5JztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkYXlzQWdvID09PSAtMSkge1xuICAgICAgICAgICAgcmV0dXJuICdUb21vcnJvdyc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGF5c0FnbyA8IC0xKSB7XG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0RGF0ZShkYXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAhbm9EYXlzT2ZXZWVrICYmIGRheXNBZ28gPCBkYXlzT2ZXZWVrLmxlbmd0aCA/IGRheXNPZldlZWtbZGF0ZS5nZXREYXkoKV0gOiBmb3JtYXREYXRlKGRhdGUpO1xuICAgIH1cblxuICAgIGRhdGVzID0ge1xuICAgICAgICBtb250aHM6IHtcbiAgICAgICAgICAgIGZ1bGw6IG1vbnRocyxcbiAgICAgICAgICAgIGFiYnI6IG1vbnRoQWJicixcbiAgICAgICAgICAgIGRpY3Q6IG1vbnRoRGljdFxuICAgICAgICB9LFxuICAgICAgICBkYXlzOiB7XG4gICAgICAgICAgICBmdWxsOiBkYXlzT2ZXZWVrLFxuICAgICAgICAgICAgYWJicjogZGF5cyxcbiAgICAgICAgICAgIGFiYnIzOiBkYXlzMyxcbiAgICAgICAgICAgIGRpY3Q6IGRheURpY3RcbiAgICAgICAgfSxcbiAgICAgICAgbGVuZ3RoOiBsZW5ndGgsXG4gICAgICAgIHN1YnRyYWN0OiBzdWJ0cmFjdCxcbiAgICAgICAgYWRkOiBhZGQsXG4gICAgICAgIGFkZERheXM6IGFkZERheXMsXG4gICAgICAgIGRpZmY6IGRpZmYsXG4gICAgICAgIGNvcHk6IGNvcHksXG4gICAgICAgIGNsb25lOiBjb3B5LFxuICAgICAgICBpc0xlc3M6IGlzTGVzcyxcbiAgICAgICAgaXNHcmVhdGVyOiBpc0dyZWF0ZXIsXG4gICAgICAgIHRvSVNPOiB0b0lTTyxcbiAgICAgICAgaXNWYWxpZE9iamVjdDogaXNWYWxpZE9iamVjdCxcbiAgICAgICAgaXNWYWxpZDogaXNEYXRlVHlwZSxcbiAgICAgICAgaXNEYXRlVHlwZTogaXNEYXRlVHlwZSxcbiAgICAgICAgaXNMZWFwWWVhcjogaXNMZWFwWWVhcixcbiAgICAgICAgZ2V0TW9udGhJbmRleDogZ2V0TW9udGhJbmRleCxcbiAgICAgICAgZ2V0TW9udGhOYW1lOiBnZXRNb250aE5hbWUsXG4gICAgICAgIGdldEZpcnN0U3VuZGF5OiBnZXRGaXJzdFN1bmRheSxcbiAgICAgICAgZ2V0RGF5c0luTW9udGg6IGdldERheXNJbk1vbnRoLFxuICAgICAgICBnZXREYXlzSW5QcmV2TW9udGg6IGdldERheXNJblByZXZNb250aCxcbiAgICAgICAgZm9ybWF0RGF0ZTogZm9ybWF0RGF0ZSxcbiAgICAgICAgZm9ybWF0VGltZTogZm9ybWF0VGltZSxcbiAgICAgICAgc3RyVG9EYXRlOiBzdHJUb0RhdGUsXG4gICAgICAgIHN1YnRyYWN0RGF0ZTogc3VidHJhY3REYXRlLFxuICAgICAgICBkYXRlVG9TdHI6IGRhdGVUb1N0cixcbiAgICAgICAgcGVyaW9kOiBwZXJpb2QsXG4gICAgICAgIG5hdHVyYWw6IG5hdHVyYWwsXG4gICAgICAgIGdldE5hdHVyYWxEYXk6IGdldE5hdHVyYWxEYXksXG4gICAgICAgIHBhZDogcGFkLFxuICAgICAgICB0aW1lc3RhbXA6IHtcbiAgICAgICAgICAgIHRvOiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGUuZ2V0RnVsbFllYXIoKSArICctJyArIHBhZChkYXRlLmdldE1vbnRoKCkgKyAxKSArICctJyArIHBhZChkYXRlLmdldERhdGUoKSkgKyAnVCcgK1xuICAgICAgICAgICAgICAgICAgICBwYWQoZGF0ZS5nZXRIb3VycygpKSArICc6JyArIHBhZChkYXRlLmdldE1pbnV0ZXMoKSkgKyAnOicgKyBwYWQoZGF0ZS5nZXRTZWNvbmRzKCkpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZyb206IGZ1bmN0aW9uKHN0cikge1xuICAgICAgICAgICAgICAgIC8vIDIwMTUtMDUtMjZUMDA6MDA6MDBcblxuICAgICAgICAgICAgICAgIC8vIHN0cmlwIHRpbWV6b25lIC8vIDIwMTUtMDUtMjZUMDA6MDA6MDBaXG4gICAgICAgICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdaJylbMF07XG5cbiAgICAgICAgICAgICAgICAvLyBbXCIyMDAwLTAyLTMwVDAwOjAwOjAwXCIsIFwiMjAwMFwiLCBcIjAyXCIsIFwiMzBcIiwgXCIwMFwiLCBcIjAwXCIsIFwiMDBcIiwgaW5kZXg6IDAsIGlucHV0OiBcIjIwMDAtMDItMzBUMDA6MDA6MDBcIl1cbiAgICAgICAgICAgICAgICB2YXIgcGFydHMgPSB0c1JlZ0V4cC5leGVjKHN0cik7XG4gICAgICAgICAgICAgICAgLy8gVE9ETzogZG8gd2UgbmVlZCBhIHZhbGlkYXRpb24/XG4gICAgICAgICAgICAgICAgaWYgKHBhcnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG5ldyBEYXRlKDE5OTUsIDExLCAxNywgMywgMjQsIDApO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoK3BhcnRzWzFdLCArcGFydHNbMl0gLSAxLCArcGFydHNbM10sICtwYXJ0c1s0XSwgK3BhcnRzWzVdLCBwYXJzZUludChwYXJ0c1s2XSwgMTApKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gVE9ETzogd2hhdCBkbyB3ZSByZXR1cm4gZm9yIGFuIGludmFsaWQgZGF0ZT8gbnVsbD9cbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoLTEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlzOiBmdW5jdGlvbihzdHIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHNSZWdFeHAudGVzdChzdHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBkYXRlcztcblxufSkpOyIsInJlcXVpcmUoJy4vZGF0ZS1waWNrZXInKTtcbmNvbnN0IEJhc2VDb21wb25lbnQgPSByZXF1aXJlKCdCYXNlQ29tcG9uZW50Jyk7XG5jb25zdCBkYXRlcyA9IHJlcXVpcmUoJ2RhdGVzJyk7XG5cbmNvbnN0IGRlZmF1bHRQbGFjZWhvbGRlciA9ICdNTS9ERC9ZWVlZJztcbmNvbnN0IGRlZmF1bHRNYXNrID0gJ1hYL1hYL1hYWFgnO1xuY29uc3QgcHJvcHMgPSBbJ2xhYmVsJywgJ25hbWUnLCAndHlwZScsICdwbGFjZWhvbGRlcicsICd2YWx1ZScsICdtYXNrJ107XG5jb25zdCBib29scyA9IFtdO1xuXG5jbGFzcyBEYXRlSW5wdXQgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblxuXHRzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcyAoKSB7XG5cdFx0cmV0dXJuIFsuLi5wcm9wcywgLi4uYm9vbHNdO1xuXHR9XG5cblx0Z2V0IHByb3BzICgpIHtcblx0XHRyZXR1cm4gcHJvcHM7XG5cdH1cblxuXHRnZXQgYm9vbHMgKCkge1xuXHRcdHJldHVybiBib29scztcblx0fVxuXG5cdHNldCB2YWx1ZSAodmFsdWUpIHtcblx0XHQvLyBtaWdodCBuZWVkIGF0dHJpYnV0ZUNoYW5nZWRcblx0XHR0aGlzLnN0ckRhdGUgPSBkYXRlcy5pc0RhdGVUeXBlKHZhbHVlKSA/IHZhbHVlIDogJyc7XG5cdFx0b25Eb21SZWFkeSh0aGlzLCAoKSA9PiB7XG5cdFx0XHR0aGlzLnNldFZhbHVlKHRoaXMuc3RyRGF0ZSk7XG5cdFx0fSk7XG5cdH1cblxuXHRvblZhbHVlICh2YWx1ZSkge1xuXHRcdHRoaXMuc3RyRGF0ZSA9IGRhdGVzLmlzRGF0ZVR5cGUodmFsdWUpID8gdmFsdWUgOiAnJztcblx0XHR0aGlzLnNldFZhbHVlKHRoaXMuc3RyRGF0ZSk7XG5cdH1cblxuXHRnZXQgdmFsdWUgKCkge1xuXHRcdHJldHVybiB0aGlzLnN0ckRhdGU7XG5cdH1cblx0XG5cdGdldCB0ZW1wbGF0ZVN0cmluZyAoKSB7XG5cdFx0cmV0dXJuIGBcbjxsYWJlbD5cblx0PHNwYW4gcmVmPVwibGFiZWxOb2RlXCI+PC9zcGFuPlxuXHQ8aW5wdXQgcmVmPVwiaW5wdXRcIiAvPlxuXHRcbjwvbGFiZWw+XG48ZGF0ZS1waWNrZXIgcmVmPVwicGlja2VyXCIgdGFiaW5kZXg9XCIwXCI+PC9kYXRlLXBpY2tlcj5gO1xuXHR9XG5cblx0Y29uc3RydWN0b3IgKCkge1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5zaG93aW5nID0gZmFsc2U7XG5cdH1cblxuXHRzZXRWYWx1ZSAodmFsdWUpIHtcblx0XHR0aGlzLnR5cGVkVmFsdWUgPSB2YWx1ZTtcblx0XHR0aGlzLmlucHV0LnZhbHVlID0gdmFsdWU7XG5cdFx0Y29uc3QgbGVuID0gdGhpcy5pbnB1dC52YWx1ZS5sZW5ndGggPT09IHRoaXMubWFzay5sZW5ndGg7XG5cdFx0bGV0IHZhbGlkO1xuXHRcdGlmIChsZW4pIHtcblx0XHRcdHZhbGlkID0gZGF0ZXMuaXNWYWxpZCh2YWx1ZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHZhbGlkID0gdHJ1ZTtcblx0XHR9XG5cdFx0ZG9tLmNsYXNzTGlzdC50b2dnbGUodGhpcywgJ2ludmFsaWQnLCAhdmFsaWQpO1xuXHRcdGlmKHZhbGlkICYmIGxlbil7XG5cdFx0XHR0aGlzLnBpY2tlci52YWx1ZSA9IHZhbHVlO1xuXHRcdFx0dGhpcy5lbWl0KCdjaGFuZ2UnLCB7dmFsdWU6IHZhbHVlfSk7XG5cdFx0fVxuXHR9XG5cblx0Zm9ybWF0IChzKSB7XG5cdFx0ZnVuY3Rpb24gc3ViIChwb3MpIHtcblx0XHRcdGxldCBzdWJTdHIgPSAnJztcblx0XHRcdGZvcihsZXQgaSA9IHBvczsgaSA8IG1hc2subGVuZ3RoOyBpKyspe1xuXHRcdFx0XHRpZihtYXNrW2ldID09PSAnWCcpe1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHN1YlN0ciArPSBtYXNrW2ldO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHN1YlN0cjtcblx0XHR9XG5cdFx0cyA9IHMucmVwbGFjZSgvXFxEL2csICcnKTtcblx0XHRjb25zdCBtYXNrID0gdGhpcy5tYXNrO1xuXHRcdGxldCBmID0gJyc7XG5cdFx0Y29uc3QgbGVuID0gTWF0aC5taW4ocy5sZW5ndGgsIHRoaXMubWFza0xlbmd0aCk7XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKyl7XG5cdFx0XHRpZihtYXNrW2YubGVuZ3RoXSAhPT0gJ1gnKXtcblx0XHRcdFx0ZiArPSBzdWIoZi5sZW5ndGgpO1xuXHRcdFx0fVxuXHRcdFx0ZiArPSBzW2ldO1xuXHRcdH1cblx0XHRyZXR1cm4gZjtcblx0fVxuXG5cdG9uS2V5IChlKSB7XG5cdFx0bGV0IHN0ciA9IHRoaXMudHlwZWRWYWx1ZSB8fCAnJztcblx0XHRjb25zdCBiZWcgPSBlLnRhcmdldC5zZWxlY3Rpb25TdGFydDtcblx0XHRjb25zdCBlbmQgPSBlLnRhcmdldC5zZWxlY3Rpb25FbmQ7XG5cdFx0Y29uc3QgayA9IGUua2V5O1xuXG5cdFx0aWYoIWlzTnVtKGspKXtcblx0XHRcdC8vIGhhbmRsZSBwYXN0ZSwgYmFja3NwYWNlXG5cdFx0XHRpZih0aGlzLmlucHV0LnZhbHVlICE9PSB0aGlzLnR5cGVkVmFsdWUpIHtcblx0XHRcdFx0dGhpcy5zZXRWYWx1ZSh0aGlzLmlucHV0LnZhbHVlKTtcblx0XHRcdH1cblx0XHRcdHN0b3BFdmVudChlKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0aWYoc3RyLmxlbmd0aCAhPT0gZW5kIHx8IGJlZyAhPT0gZW5kKXtcblx0XHRcdC8vIGhhbmRsZSBzZWxlY3Rpb24gb3IgbWlkZGxlLXN0cmluZyBlZGl0XG5cdFx0XHRjb25zdCB0ZW1wID0gdGhpcy50eXBlZFZhbHVlLnN1YnN0cmluZygwLCBiZWcpICsgayArIHRoaXMudHlwZWRWYWx1ZS5zdWJzdHJpbmcoZW5kKTtcblx0XHRcdHRoaXMuc2V0VmFsdWUodGhpcy5mb3JtYXQodGVtcCkpO1xuXHRcdFx0Ly8gVE9ET1xuXHRcdFx0Ly8gVGhpcyBtaWdodCBub3QgYmUgZXhhY3RseSByaWdodC4uLlxuXHRcdFx0Ly8gaGF2ZSB0byBhbGxvdyBmb3IgdGhlIHNsYXNoZXNcblx0XHRcdGlmKGVuZCAtIGJlZykge1xuXHRcdFx0XHRlLnRhcmdldC5zZWxlY3Rpb25FbmQgPSBlbmQgLSAoZW5kIC0gYmVnIC0gMSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRlLnRhcmdldC5zZWxlY3Rpb25FbmQgPSBlbmQgKyAxO1xuXHRcdFx0fVxuXHRcdFx0c3RvcEV2ZW50KGUpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHRoaXMuc2V0VmFsdWUodGhpcy5mb3JtYXQoc3RyICsgaykpO1xuXHR9XG5cblx0c2hvdyAoKSB7XG5cdFx0aWYodGhpcy5zaG93aW5nKXtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dGhpcy5zaG93aW5nID0gdHJ1ZTtcblx0XHR0aGlzLnBpY2tlci5jbGFzc0xpc3QuYWRkKCdzaG93Jyk7XG5cblx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcblx0XHRcdGNvbnN0IHdpbiA9IGRvbS5ib3god2luZG93KTtcblx0XHRcdGNvbnN0IGJveCA9IGRvbS5ib3godGhpcy5waWNrZXIpO1xuXHRcdFx0aWYoYm94LnggKyBib3gudyA+IHdpbi5oKXtcblx0XHRcdFx0dGhpcy5waWNrZXIuY2xhc3NMaXN0LmFkZCgncmlnaHQtYWxpZ24nKTtcblx0XHRcdH1cblx0XHRcdGlmKGJveC55ICsgYm94LmggPiB3aW4uaCl7XG5cdFx0XHRcdHRoaXMucGlja2VyLmNsYXNzTGlzdC5hZGQoJ2JvdHRvbS1hbGlnbicpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0aGlkZSAoKSB7XG5cdFx0aWYoIXRoaXMuc2hvd2luZyB8fCB3aW5kb3cua2VlcFBvcHVwc09wZW4pe1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR0aGlzLnNob3dpbmcgPSBmYWxzZTtcblx0XHRkb20uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLnBpY2tlciwgJ3JpZ2h0LWFsaWduIGJvdHRvbS1hbGlnbiBzaG93Jyk7XG5cdH1cblxuXHRkb21SZWFkeSAoKSB7XG5cdFx0dGhpcy5tYXNrID0gdGhpcy5tYXNrIHx8IGRlZmF1bHRNYXNrO1xuXHRcdHRoaXMubWFza0xlbmd0aCA9IHRoaXMubWFzay5tYXRjaCgvWC9nKS5qb2luKCcnKS5sZW5ndGg7XG5cblx0XHR0aGlzLmxhYmVsTm9kZS5pbm5lckhUTUwgPSB0aGlzLmxhYmVsIHx8ICcnO1xuXHRcdHRoaXMuaW5wdXQuc2V0QXR0cmlidXRlKCd0eXBlJywgJ3RleHQnKTtcblx0XHR0aGlzLmlucHV0LnNldEF0dHJpYnV0ZSgncGxhY2Vob2xkZXInLCB0aGlzLnBsYWNlaG9sZGVyIHx8IGRlZmF1bHRQbGFjZWhvbGRlcik7XG5cdFx0dGhpcy5waWNrZXIub24oJ2NoYW5nZScsIChlKSA9PiB7XG5cdFx0XHR0aGlzLnNldFZhbHVlKGUudmFsdWUpO1xuXHRcdH0pO1xuXHRcdHRoaXMuY29ubmVjdEtleXMoKTtcblx0XHR0aGlzLnJlZ2lzdGVySGFuZGxlKGhhbmRsZU9wZW4odGhpcy5pbnB1dCwgdGhpcy5waWNrZXIsIHRoaXMuc2hvdy5iaW5kKHRoaXMpLCB0aGlzLmhpZGUuYmluZCh0aGlzKSkpO1xuXHR9XG5cblx0Y29ubmVjdEtleXMgKCkge1xuXHRcdHRoaXMub24odGhpcy5pbnB1dCwgJ2tleWRvd24nLCBzdG9wRXZlbnQpO1xuXHRcdHRoaXMub24odGhpcy5pbnB1dCwgJ2tleXByZXNzJywgc3RvcEV2ZW50KTtcblx0XHR0aGlzLm9uKHRoaXMuaW5wdXQsICdrZXl1cCcsIChlKSA9PiB7XG5cdFx0XHR0aGlzLm9uS2V5KGUpO1xuXHRcdH0pO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZU9wZW4gKGlucHV0LCBwaWNrZXIsIHNob3csIGhpZGUpIHtcblx0bGV0IGlucHV0Rm9jdXMgPSBmYWxzZTtcblx0bGV0IHBpY2tlckZvY3VzID0gZmFsc2U7XG5cdGNvbnN0IGRvY0hhbmRsZSA9IG9uKGRvY3VtZW50LCAna2V5dXAnLCAoZSkgPT4ge1xuXHRcdGlmKGUua2V5ID09PSAnRXNjYXBlJyl7XG5cdFx0XHRoaWRlKCk7XG5cdFx0fVxuXHR9KTtcblx0ZG9jSGFuZGxlLnBhdXNlKCk7XG5cdHJldHVybiBvbi5tYWtlTXVsdGlIYW5kbGUoW1xuXHRcdG9uKGlucHV0LCAnZm9jdXMnLCAoKSA9PiB7XG5cdFx0XHRpbnB1dEZvY3VzID0gdHJ1ZTtcblx0XHRcdHNob3coKTtcblx0XHRcdGRvY0hhbmRsZS5yZXN1bWUoKTtcblx0XHR9KSxcblx0XHRvbihpbnB1dCwgJ2JsdXInLCAoKSA9PiB7XG5cdFx0XHRpbnB1dEZvY3VzID0gZmFsc2U7XG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0aWYoIXBpY2tlckZvY3VzKXtcblx0XHRcdFx0XHRoaWRlKCk7XG5cdFx0XHRcdFx0ZG9jSGFuZGxlLnBhdXNlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sIDEwMCk7XG5cdFx0fSksXG5cdFx0b24ocGlja2VyLCAnZm9jdXMnLCAoKSA9PiB7XG5cdFx0XHRwaWNrZXJGb2N1cyA9IHRydWU7XG5cdFx0XHRzaG93KCk7XG5cdFx0XHRkb2NIYW5kbGUucmVzdW1lKCk7XG5cdFx0fSksXG5cdFx0b24ocGlja2VyLCAnYmx1cicsICgpID0+IHtcblx0XHRcdHBpY2tlckZvY3VzID0gZmFsc2U7XG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0aWYoIWlucHV0Rm9jdXMpe1xuXHRcdFx0XHRcdGhpZGUoKTtcblx0XHRcdFx0XHRkb2NIYW5kbGUucGF1c2UoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSwgMTAwKTtcblxuXHRcdH0pXG5cdF0pO1xufVxuXG5jb25zdCBudW1SZWcgPSAvWzAxMjM0NTY3ODldLztcbmZ1bmN0aW9uIGlzTnVtIChrKSB7XG5cdHJldHVybiBudW1SZWcudGVzdChrKTtcbn1cblxuY29uc3QgY29udHJvbCA9IHtcblx0J0VudGVyJzogMSxcblx0J0JhY2tzcGFjZSc6IDEsXG5cdCdEZWxldGUnOiAxLFxuXHQnQXJyb3dMZWZ0JzogMSxcblx0J0Fycm93UmlnaHQnOiAxLFxuXHQnRXNjYXBlJzogMSxcblx0J0NvbW1hbmQnOiAxLFxuXHQnVGFiJzogMVxufTtcbmZ1bmN0aW9uIHN0b3BFdmVudCAoZSkge1xuXHRpZihlLm1ldGFLZXkgfHwgY29udHJvbFtlLmtleV0pe1xuXHRcdHJldHVybjtcblx0fVxuXHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnZGF0ZS1pbnB1dCcsIERhdGVJbnB1dCk7XG5cbm1vZHVsZS5leHBvcnRzID0gRGF0ZUlucHV0OyIsInJlcXVpcmUoJ0Jhc2VDb21wb25lbnQvc3JjL3Byb3BlcnRpZXMnKTtcbnJlcXVpcmUoJ0Jhc2VDb21wb25lbnQvc3JjL3RlbXBsYXRlJyk7XG5yZXF1aXJlKCdCYXNlQ29tcG9uZW50L3NyYy9yZWZzJyk7XG5jb25zdCBCYXNlQ29tcG9uZW50ID0gcmVxdWlyZSgnQmFzZUNvbXBvbmVudCcpO1xuY29uc3QgZGF0ZXMgPSByZXF1aXJlKCdkYXRlcycpO1xuXG5jb25zdCBwcm9wcyA9IFtdO1xuXG4vLyByYW5nZS1sZWZ0L3JhbmdlLXJpZ2h0IG1lYW4gdGhhdCB0aGlzIGlzIG9uZSBzaWRlIG9mIGEgZGF0ZS1yYW5nZS1waWNrZXJcbmNvbnN0IGJvb2xzID0gWydyYW5nZS1waWNrZXInLCAncmFuZ2UtbGVmdCcsICdyYW5nZS1yaWdodCddO1xuXG5jbGFzcyBEYXRlUGlja2VyIGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG5cblx0c3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMgKCkge1xuXHRcdHJldHVybiBbLi4ucHJvcHMsIC4uLmJvb2xzXTtcblx0fVxuXG5cdGdldCBwcm9wcyAoKSB7XG5cdFx0cmV0dXJuIHByb3BzO1xuXHR9XG5cblx0Z2V0IGJvb2xzICgpIHtcblx0XHRyZXR1cm4gYm9vbHM7XG5cdH1cblxuXHRnZXQgdGVtcGxhdGVTdHJpbmcgKCkge1xuXHRcdHJldHVybiBgXG48ZGl2IGNsYXNzPVwiY2FsZW5kYXJcIiByZWY9XCJjYWxOb2RlXCI+XG48ZGl2IGNsYXNzPVwiY2FsLWhlYWRlclwiIHJlZj1cImhlYWRlck5vZGVcIj5cblx0PHNwYW4gY2xhc3M9XCJjYWwtbGZ0XCIgcmVmPVwibGZ0Tm9kZVwiPjwvc3Bhbj5cblx0PHNwYW4gY2xhc3M9XCJjYWwtbW9udGhcIiByZWY9XCJtb250aE5vZGVcIj48L3NwYW4+XG5cdDxzcGFuIGNsYXNzPVwiY2FsLXJndFwiIHJlZj1cInJndE5vZGVcIj48L3NwYW4+XG48L2Rpdj5cbjxkaXYgY2xhc3M9XCJjYWwtY29udGFpbmVyXCIgcmVmPVwiY29udGFpbmVyXCI+PC9kaXY+XG48ZGl2IGNsYXNzPVwiY2FsLWZvb3RlclwiPlxuXHQ8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApO1wiIHJlZj1cImZvb3RlckxpbmtcIj48L2E+XG48L2Rpdj5cbjwvZGl2PmA7XG5cdH1cblxuXHRzZXQgdmFsdWUgKHZhbHVlKSB7XG5cdFx0Ly8gbWlnaHQgbmVlZCBhdHRyaWJ1dGVDaGFuZ2VkXG5cdFx0dGhpcy52YWx1ZURhdGUgPSBkYXRlcy5pc0RhdGVUeXBlKHZhbHVlKSA/IGRhdGVzLnN0clRvRGF0ZSh2YWx1ZSkgOiB0b2RheTtcblx0XHR0aGlzLmN1cnJlbnQgPSB0aGlzLnZhbHVlRGF0ZTtcblx0XHRvbkRvbVJlYWR5KHRoaXMsICgpID0+IHtcblx0XHRcdHRoaXMucmVuZGVyKCk7XG5cdFx0fSk7XG5cdH1cblxuXHRnZXQgdmFsdWUgKCkge1xuXHRcdGlmICghdGhpcy52YWx1ZURhdGUpIHtcblx0XHRcdGNvbnN0IHZhbHVlID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJykgfHwgdG9kYXk7XG5cdFx0XHR0aGlzLnZhbHVlRGF0ZSA9IGRhdGVzLnN0clRvRGF0ZSh2YWx1ZSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLnZhbHVlRGF0ZTtcblx0fVxuXG5cdGNvbnN0cnVjdG9yICgpIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuY3VycmVudCA9IG5ldyBEYXRlKCk7XG5cdFx0dGhpcy5wcmV2aW91cyA9IHt9O1xuXHRcdHRoaXMubW9kZXMgPSBbJ21vbnRoJywgJ3llYXInLCAnZGVjYWRlJ107XG5cdFx0dGhpcy5tb2RlID0gMDtcblx0fVxuXG5cdHNldERpc3BsYXkgKC4uLmFyZ3MvKnllYXIsIG1vbnRoKi8pIHtcblx0XHRpZiAoYXJncy5sZW5ndGggPT09IDIpIHtcblx0XHRcdHRoaXMuY3VycmVudC5zZXRGdWxsWWVhcihhcmdzWzBdKTtcblx0XHRcdHRoaXMuY3VycmVudC5zZXRNb250aChhcmdzWzFdKTtcblx0XHR9IGVsc2UgaWYgKHR5cGVvZiBhcmdzWzBdID09PSAnb2JqZWN0Jykge1xuXHRcdFx0dGhpcy5jdXJyZW50LnNldEZ1bGxZZWFyKGFyZ3NbMF0uZ2V0RnVsbFllYXIoKSk7XG5cdFx0XHR0aGlzLmN1cnJlbnQuc2V0TW9udGgoYXJnc1swXS5nZXRNb250aCgpKTtcblx0XHR9IGVsc2UgaWYgKGFyZ3NbMF0gPiAxMikge1xuXHRcdFx0dGhpcy5jdXJyZW50LnNldEZ1bGxZZWFyKGFyZ3NbMF0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLmN1cnJlbnQuc2V0TW9udGgoYXJnc1swXSk7XG5cdFx0fVxuXHRcdHRoaXMudmFsdWVEYXRlID0gY29weSh0aGlzLmN1cnJlbnQpO1xuXHRcdHRoaXMubm9FdmVudHMgPSB0cnVlO1xuXHRcdHRoaXMucmVuZGVyKCk7XG5cdH1cblxuXHRnZXRGb3JtYXR0ZWRWYWx1ZSAoKSB7XG5cdFx0cmV0dXJuIHRoaXMudmFsdWVEYXRlID09PSB0b2RheSA/ICcnIDogISF0aGlzLnZhbHVlRGF0ZSA/IGRhdGVzLmRhdGVUb1N0cih0aGlzLnZhbHVlRGF0ZSkgOiAnJztcblx0fVxuXG5cdGVtaXRWYWx1ZSAoKSB7XG5cdFx0Y29uc3QgZXZlbnQgPSB7XG5cdFx0XHR2YWx1ZTogdGhpcy5nZXRGb3JtYXR0ZWRWYWx1ZSgpLFxuXHRcdFx0ZGF0ZTogdGhpcy52YWx1ZURhdGVcblx0XHR9O1xuXHRcdGlmICh0aGlzWydyYW5nZS1waWNrZXInXSkge1xuXHRcdFx0ZXZlbnQuZmlyc3QgPSB0aGlzLmZpcnN0UmFuZ2U7XG5cdFx0XHRldmVudC5zZWNvbmQgPSB0aGlzLnNlY29uZFJhbmdlO1xuXHRcdH1cblx0XHR0aGlzLmVtaXQoJ2NoYW5nZScsIGV2ZW50KTtcblx0fVxuXG5cdGVtaXREaXNwbGF5RXZlbnRzICgpIHtcblx0XHRjb25zdCBtb250aCA9IHRoaXMuY3VycmVudC5nZXRNb250aCgpLFxuXHRcdFx0eWVhciA9IHRoaXMuY3VycmVudC5nZXRGdWxsWWVhcigpO1xuXG5cdFx0aWYgKCF0aGlzLm5vRXZlbnRzICYmIChtb250aCAhPT0gdGhpcy5wcmV2aW91cy5tb250aCB8fCB5ZWFyICE9PSB0aGlzLnByZXZpb3VzLnllYXIpKSB7XG5cdFx0XHR0aGlzLmZpcmUoJ2Rpc3BsYXktY2hhbmdlJywgeyBtb250aDogbW9udGgsIHllYXI6IHllYXIgfSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5ub0V2ZW50cyA9IGZhbHNlO1xuXHRcdHRoaXMucHJldmlvdXMgPSB7XG5cdFx0XHRtb250aDogbW9udGgsXG5cdFx0XHR5ZWFyOiB5ZWFyXG5cdFx0fTtcblx0fVxuXG5cdG9uQ2xpY2tEYXkgKG5vZGUpIHtcblx0XHRjb25zdFxuXHRcdFx0ZGF5ID0gK25vZGUuaW5uZXJIVE1MLFxuXHRcdFx0aXNGdXR1cmUgPSBub2RlLmNsYXNzTGlzdC5jb250YWlucygnZnV0dXJlJyksXG5cdFx0XHRpc1Bhc3QgPSBub2RlLmNsYXNzTGlzdC5jb250YWlucygncGFzdCcpO1xuXG5cdFx0dGhpcy5jdXJyZW50LnNldERhdGUoZGF5KTtcblx0XHRpZiAoaXNGdXR1cmUpIHtcblx0XHRcdHRoaXMuY3VycmVudC5zZXRNb250aCh0aGlzLmN1cnJlbnQuZ2V0TW9udGgoKSArIDEpO1xuXHRcdH1cblx0XHRpZiAoaXNQYXN0KSB7XG5cdFx0XHR0aGlzLmN1cnJlbnQuc2V0TW9udGgodGhpcy5jdXJyZW50LmdldE1vbnRoKCkgLSAxKTtcblx0XHR9XG5cblx0XHR0aGlzLnZhbHVlRGF0ZSA9IGNvcHkodGhpcy5jdXJyZW50KTtcblxuXHRcdHRoaXMuZW1pdFZhbHVlKCk7XG5cblx0XHRpZiAodGhpc1sncmFuZ2UtcGlja2VyJ10pIHtcblx0XHRcdHRoaXMuY2xpY2tTZWxlY3RSYW5nZSgpO1xuXHRcdH1cblxuXHRcdGlmIChpc0Z1dHVyZSB8fCBpc1Bhc3QpIHtcblx0XHRcdHRoaXMucmVuZGVyKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuc2VsZWN0RGF5KCk7XG5cdFx0fVxuXHR9XG5cblx0b25DbGlja01vbnRoIChkaXJlY3Rpb24pIHtcblx0XHRzd2l0Y2ggKHRoaXMubW9kZSkge1xuXHRcdFx0Y2FzZSAxOiAvLyB5ZWFyIG1vZGVcblx0XHRcdFx0dGhpcy5jdXJyZW50LnNldEZ1bGxZZWFyKHRoaXMuY3VycmVudC5nZXRGdWxsWWVhcigpICsgKGRpcmVjdGlvbiAqIDEpKTtcblx0XHRcdFx0dGhpcy5zZXRNb2RlKHRoaXMubW9kZSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAyOiAvLyBjZW50dXJ5IG1vZGVcblx0XHRcdFx0dGhpcy5jdXJyZW50LnNldEZ1bGxZZWFyKHRoaXMuY3VycmVudC5nZXRGdWxsWWVhcigpICsgKGRpcmVjdGlvbiAqIDEyKSk7XG5cdFx0XHRcdHRoaXMuc2V0TW9kZSh0aGlzLm1vZGUpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHRoaXMuY3VycmVudC5zZXRNb250aCh0aGlzLmN1cnJlbnQuZ2V0TW9udGgoKSArIChkaXJlY3Rpb24gKiAxKSk7XG5cdFx0XHRcdHRoaXMucmVuZGVyKCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxuXG5cdG9uQ2xpY2tZZWFyIChub2RlKSB7XG5cdFx0Y29uc3QgaW5kZXggPSBkYXRlcy5nZXRNb250aEluZGV4KG5vZGUuaW5uZXJIVE1MKTtcblx0XHR0aGlzLmN1cnJlbnQuc2V0TW9udGgoaW5kZXgpO1xuXHRcdHRoaXMucmVuZGVyKCk7XG5cdH1cblxuXHRvbkNsaWNrRGVjYWRlIChub2RlKSB7XG5cdFx0Y29uc3QgeWVhciA9ICtub2RlLmlubmVySFRNTDtcblx0XHR0aGlzLmN1cnJlbnQuc2V0RnVsbFllYXIoeWVhcik7XG5cdFx0dGhpcy5zZXRNb2RlKHRoaXMubW9kZSAtIDEpO1xuXHR9XG5cblx0c2V0TW9kZSAobW9kZSkge1xuXHRcdGRlc3Ryb3kodGhpcy5tb2RlTm9kZSk7XG5cdFx0dGhpcy5tb2RlID0gbW9kZSB8fCAwO1xuXHRcdHN3aXRjaCAodGhpcy5tb2Rlc1t0aGlzLm1vZGVdKSB7XG5cdFx0XHRjYXNlICdtb250aCc6XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAneWVhcic6XG5cdFx0XHRcdHRoaXMuc2V0WWVhck1vZGUoKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdkZWNhZGUnOlxuXHRcdFx0XHR0aGlzLnNldERlY2FkZU1vZGUoKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9XG5cblx0c2V0WWVhck1vZGUgKCkge1xuXHRcdGRlc3Ryb3kodGhpcy5ib2R5Tm9kZSk7XG5cblx0XHRsZXQgaTtcblx0XHRjb25zdCBub2RlID0gZG9tKCdkaXYnLCB7IGNsYXNzOiAnY2FsLWJvZHkgeWVhcicgfSk7XG5cblx0XHRmb3IgKGkgPSAwOyBpIDwgMTI7IGkrKykge1xuXHRcdFx0ZG9tKCdkaXYnLCB7IGh0bWw6IGRhdGVzLm1vbnRocy5hYmJyW2ldLCBjbGFzczogJ3llYXInIH0sIG5vZGUpO1xuXHRcdH1cblxuXHRcdHRoaXMubW9udGhOb2RlLmlubmVySFRNTCA9IHRoaXMuY3VycmVudC5nZXRGdWxsWWVhcigpO1xuXHRcdHRoaXMuY29udGFpbmVyLmFwcGVuZENoaWxkKG5vZGUpO1xuXHRcdHRoaXMubW9kZU5vZGUgPSBub2RlO1xuXHR9XG5cblx0c2V0RGVjYWRlTW9kZSAoKSB7XG5cdFx0bGV0IGk7XG5cdFx0Y29uc3Qgbm9kZSA9IGRvbSgnZGl2JywgeyBjbGFzczogJ2NhbC1ib2R5IGRlY2FkZScgfSk7XG5cdFx0bGV0IHllYXIgPSB0aGlzLmN1cnJlbnQuZ2V0RnVsbFllYXIoKSAtIDY7XG5cblx0XHRmb3IgKGkgPSAwOyBpIDwgMTI7IGkrKykge1xuXHRcdFx0ZG9tKCdkaXYnLCB7IGh0bWw6IHllYXIsIGNsYXNzOiAnZGVjYWRlJyB9LCBub2RlKTtcblx0XHRcdHllYXIgKz0gMTtcblx0XHR9XG5cdFx0dGhpcy5tb250aE5vZGUuaW5uZXJIVE1MID0gKHllYXIgLSAxMikgKyAnLScgKyAoeWVhciAtIDEpO1xuXHRcdHRoaXMuY29udGFpbmVyLmFwcGVuZENoaWxkKG5vZGUpO1xuXHRcdHRoaXMubW9kZU5vZGUgPSBub2RlO1xuXHR9XG5cblx0c2VsZWN0RGF5ICgpIHtcblx0XHRpZiAodGhpc1sncmFuZ2UtcGlja2VyJ10pIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y29uc3Qgbm93ID0gdGhpcy5xdWVyeVNlbGVjdG9yKCcuYXktc2VsZWN0ZWQnKTtcblx0XHRjb25zdCBub2RlID0gdGhpcy5kYXlNYXBbdGhpcy5jdXJyZW50LmdldERhdGUoKV07XG5cdFx0aWYgKG5vdykge1xuXHRcdFx0bm93LmNsYXNzTGlzdC5yZW1vdmUoJ2F5LXNlbGVjdGVkJyk7XG5cdFx0fVxuXHRcdG5vZGUuY2xhc3NMaXN0LmFkZCgnYXktc2VsZWN0ZWQnKTtcblxuXHR9XG5cblx0Y2xlYXJSYW5nZSAoKSB7XG5cdFx0dGhpcy5ob3ZlckRhdGUgPSAwO1xuXHRcdHRoaXMuc2V0UmFuZ2UobnVsbCwgbnVsbCk7XG5cdH1cblxuXHRzZXRSYW5nZSAoZmlyc3RSYW5nZSwgc2Vjb25kUmFuZ2UpIHtcblx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBmaXJzdFJhbmdlO1xuXHRcdHRoaXMuc2Vjb25kUmFuZ2UgPSBzZWNvbmRSYW5nZTtcblx0XHR0aGlzLmRpc3BsYXlSYW5nZSgpO1xuXHRcdHRoaXMuc2V0UmFuZ2VFbmRQb2ludHMoKTtcblx0fVxuXG5cdGNsaWNrU2VsZWN0UmFuZ2UgKCkge1xuXHRcdGNvbnN0XG5cdFx0XHRwcmV2Rmlyc3QgPSAhIXRoaXMuZmlyc3RSYW5nZSxcblx0XHRcdHByZXZTZWNvbmQgPSAhIXRoaXMuc2Vjb25kUmFuZ2UsXG5cdFx0XHRyYW5nZURhdGUgPSBjb3B5KHRoaXMuY3VycmVudCk7XG5cblx0XHRpZiAodGhpcy5pc093bmVkKSB7XG5cdFx0XHR0aGlzLmZpcmUoJ3NlbGVjdC1yYW5nZScsIHtcblx0XHRcdFx0Zmlyc3Q6IHRoaXMuZmlyc3RSYW5nZSxcblx0XHRcdFx0c2Vjb25kOiB0aGlzLnNlY29uZFJhbmdlLFxuXHRcdFx0XHRjdXJyZW50OiByYW5nZURhdGVcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRpZiAodGhpcy5zZWNvbmRSYW5nZSkge1xuXHRcdFx0dGhpcy5maXJlKCdyZXNldC1yYW5nZScpO1xuXHRcdFx0dGhpcy5maXJzdFJhbmdlID0gbnVsbDtcblx0XHRcdHRoaXMuc2Vjb25kUmFuZ2UgPSBudWxsO1xuXHRcdH1cblx0XHRpZiAodGhpcy5maXJzdFJhbmdlICYmIHRoaXMuaXNWYWxpZFJhbmdlKHJhbmdlRGF0ZSkpIHtcblx0XHRcdHRoaXMuc2Vjb25kUmFuZ2UgPSByYW5nZURhdGU7XG5cdFx0XHR0aGlzLmhvdmVyRGF0ZSA9IDA7XG5cdFx0XHR0aGlzLnNldFJhbmdlKHRoaXMuZmlyc3RSYW5nZSwgdGhpcy5zZWNvbmRSYW5nZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuZmlyc3RSYW5nZSA9IG51bGw7XG5cdFx0fVxuXHRcdGlmICghdGhpcy5maXJzdFJhbmdlKSB7XG5cdFx0XHR0aGlzLmhvdmVyRGF0ZSA9IDA7XG5cdFx0XHR0aGlzLnNldFJhbmdlKHJhbmdlRGF0ZSwgbnVsbCk7XG5cdFx0fVxuXHRcdHRoaXMuZmlyZSgnc2VsZWN0LXJhbmdlJywge1xuXHRcdFx0Zmlyc3Q6IHRoaXMuZmlyc3RSYW5nZSxcblx0XHRcdHNlY29uZDogdGhpcy5zZWNvbmRSYW5nZSxcblx0XHRcdHByZXZGaXJzdDogcHJldkZpcnN0LFxuXHRcdFx0cHJldlNlY29uZDogcHJldlNlY29uZFxuXHRcdH0pO1xuXHR9XG5cblx0aG92ZXJTZWxlY3RSYW5nZSAoZSkge1xuXHRcdGlmICh0aGlzLmZpcnN0UmFuZ2UgJiYgIXRoaXMuc2Vjb25kUmFuZ2UgJiYgZS50YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKCdvbicpKSB7XG5cdFx0XHR0aGlzLmhvdmVyRGF0ZSA9IGUudGFyZ2V0Ll9kYXRlO1xuXHRcdFx0dGhpcy5kaXNwbGF5UmFuZ2UoKTtcblx0XHR9XG5cdH1cblxuXHRkaXNwbGF5UmFuZ2VUb0VuZCAoKSB7XG5cdFx0aWYgKHRoaXMuZmlyc3RSYW5nZSkge1xuXHRcdFx0dGhpcy5ob3ZlckRhdGUgPSBjb3B5KHRoaXMuY3VycmVudCk7XG5cdFx0XHR0aGlzLmhvdmVyRGF0ZS5zZXRNb250aCh0aGlzLmhvdmVyRGF0ZS5nZXRNb250aCgpICsgMSk7XG5cdFx0XHR0aGlzLmRpc3BsYXlSYW5nZSgpO1xuXHRcdH1cblx0fVxuXG5cdGRpc3BsYXlSYW5nZSAoKSB7XG5cdFx0bGV0IGJlZyA9IHRoaXMuZmlyc3RSYW5nZTtcblx0XHRsZXQgZW5kID0gdGhpcy5zZWNvbmRSYW5nZSA/IHRoaXMuc2Vjb25kUmFuZ2UuZ2V0VGltZSgpIDogdGhpcy5ob3ZlckRhdGU7XG5cdFx0Y29uc3QgbWFwID0gdGhpcy5kYXlNYXA7XG5cdFx0aWYgKCFiZWcgfHwgIWVuZCkge1xuXHRcdFx0T2JqZWN0LmtleXMobWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXksIGkpIHtcblx0XHRcdFx0bWFwW2tleV0uY2xhc3NMaXN0LnJlbW92ZSgnYXktcmFuZ2UnKTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRiZWcgPSBiZWcuZ2V0VGltZSgpO1xuXHRcdFx0T2JqZWN0LmtleXMobWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXksIGkpIHtcblx0XHRcdFx0aWYgKGluUmFuZ2UobWFwW2tleV0uX2RhdGUsIGJlZywgZW5kKSkge1xuXHRcdFx0XHRcdG1hcFtrZXldLmNsYXNzTGlzdC5hZGQoJ2F5LXJhbmdlJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0bWFwW2tleV0uY2xhc3NMaXN0LnJlbW92ZSgnYXktcmFuZ2UnKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cblx0aGFzUmFuZ2UgKCkge1xuXHRcdHJldHVybiAhIXRoaXMuZmlyc3RSYW5nZSAmJiAhIXRoaXMuc2Vjb25kUmFuZ2U7XG5cdH1cblxuXHRpc1ZhbGlkUmFuZ2UgKGRhdGUpIHtcblx0XHRpZiAoIXRoaXMuZmlyc3RSYW5nZSkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdHJldHVybiBkYXRlLmdldFRpbWUoKSA+IHRoaXMuZmlyc3RSYW5nZS5nZXRUaW1lKCk7XG5cdH1cblxuXHRzZXRSYW5nZUVuZFBvaW50cyAoKSB7XG5cdFx0dGhpcy5jbGVhckVuZFBvaW50cygpO1xuXHRcdGlmICh0aGlzLmZpcnN0UmFuZ2UpIHtcblx0XHRcdGlmICh0aGlzLmZpcnN0UmFuZ2UuZ2V0TW9udGgoKSA9PT0gdGhpcy5jdXJyZW50LmdldE1vbnRoKCkpIHtcblx0XHRcdFx0dGhpcy5kYXlNYXBbdGhpcy5maXJzdFJhbmdlLmdldERhdGUoKV0uY2xhc3NMaXN0LmFkZCgnYXktcmFuZ2UtZmlyc3QnKTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLnNlY29uZFJhbmdlICYmIHRoaXMuc2Vjb25kUmFuZ2UuZ2V0TW9udGgoKSA9PT0gdGhpcy5jdXJyZW50LmdldE1vbnRoKCkpIHtcblx0XHRcdFx0dGhpcy5kYXlNYXBbdGhpcy5zZWNvbmRSYW5nZS5nZXREYXRlKCldLmNsYXNzTGlzdC5hZGQoJ2F5LXJhbmdlLXNlY29uZCcpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGNsZWFyRW5kUG9pbnRzICgpIHtcblx0XHRjb25zdCBmaXJzdCA9IHRoaXMucXVlcnlTZWxlY3RvcignLmF5LXJhbmdlLWZpcnN0JyksXG5cdFx0XHRzZWNvbmQgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5heS1yYW5nZS1zZWNvbmQnKTtcblx0XHRpZiAoZmlyc3QpIHtcblx0XHRcdGZpcnN0LmNsYXNzTGlzdC5yZW1vdmUoJ2F5LXJhbmdlLWZpcnN0Jyk7XG5cdFx0fVxuXHRcdGlmIChzZWNvbmQpIHtcblx0XHRcdHNlY29uZC5jbGFzc0xpc3QucmVtb3ZlKCdheS1yYW5nZS1zZWNvbmQnKTtcblx0XHR9XG5cdH1cblxuXHRkb21SZWFkeSAoKSB7XG5cdFx0aWYgKHRoaXNbJ3JhbmdlLWxlZnQnXSkge1xuXHRcdFx0dGhpcy5yZ3ROb2RlLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG5cdFx0XHR0aGlzWydyYW5nZS1waWNrZXInXSA9IHRydWU7XG5cdFx0XHR0aGlzLmlzT3duZWQgPSB0cnVlO1xuXHRcdH1cblx0XHRpZiAodGhpc1sncmFuZ2UtcmlnaHQnXSkge1xuXHRcdFx0dGhpcy5sZnROb2RlLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG5cdFx0XHR0aGlzWydyYW5nZS1waWNrZXInXSA9IHRydWU7XG5cdFx0XHR0aGlzLmlzT3duZWQgPSB0cnVlO1xuXHRcdH1cblx0XHRpZiAodGhpcy5pc093bmVkKSB7XG5cdFx0XHR0aGlzLmNsYXNzTGlzdC5hZGQoJ21pbmltYWwnKTtcblx0XHR9XG5cblx0XHR0aGlzLmN1cnJlbnQgPSBjb3B5KHRoaXMudmFsdWUpO1xuXG5cdFx0dGhpcy5jb25uZWN0KCk7XG5cdFx0dGhpcy5yZW5kZXIoKTtcblx0fVxuXG5cdHJlbmRlciAoKSB7XG5cdFx0Ly8gZGF0ZU51bSBpbmNyZW1lbnRzLCBzdGFydGluZyB3aXRoIHRoZSBmaXJzdCBTdW5kYXlcblx0XHQvLyBzaG93aW5nIG9uIHRoZSBtb250aGx5IGNhbGVuZGFyLiBUaGlzIGlzIHVzdWFsbHkgdGhlXG5cdFx0Ly8gcHJldmlvdXMgbW9udGgsIHNvIGRhdGVOdW0gd2lsbCBzdGFydCBhcyBhIG5lZ2F0aXZlIG51bWJlclxuXHRcdHRoaXMuc2V0TW9kZSgwKTtcblx0XHRpZiAodGhpcy5ib2R5Tm9kZSkge1xuXHRcdFx0ZG9tLmRlc3Ryb3kodGhpcy5ib2R5Tm9kZSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5kYXlNYXAgPSB7fTtcblxuXHRcdGxldFxuXHRcdFx0bm9kZSA9IGRvbSgnZGl2JywgeyBjbGFzczogJ2NhbC1ib2R5JyB9KSxcblx0XHRcdGksIHR4LCBuZXh0TW9udGggPSAwLCBpc1RoaXNNb250aCwgZGF5LCBjc3MsXG5cdFx0XHR0b2RheSA9IG5ldyBEYXRlKCksXG5cdFx0XHRpc1JhbmdlID0gdGhpc1sncmFuZ2UtcGlja2VyJ10sXG5cdFx0XHRkID0gdGhpcy5jdXJyZW50LFxuXHRcdFx0aW5jRGF0ZSA9IGNvcHkoZCksXG5cdFx0XHRkYXlzSW5QcmV2TW9udGggPSBkYXRlcy5nZXREYXlzSW5QcmV2TW9udGgoZCksXG5cdFx0XHRkYXlzSW5Nb250aCA9IGRhdGVzLmdldERheXNJbk1vbnRoKGQpLFxuXHRcdFx0ZGF0ZU51bSA9IGRhdGVzLmdldEZpcnN0U3VuZGF5KGQpLFxuXHRcdFx0ZGF0ZVRvZGF5ID0gZ2V0U2VsZWN0ZWREYXRlKHRvZGF5LCBkKSxcblx0XHRcdGRhdGVTZWxlY3RlZCA9IGdldFNlbGVjdGVkRGF0ZSh0aGlzLnZhbHVlRGF0ZSwgZCk7XG5cblx0XHR0aGlzLm1vbnRoTm9kZS5pbm5lckhUTUwgPSBkYXRlcy5nZXRNb250aE5hbWUoZCkgKyAnICcgKyBkLmdldEZ1bGxZZWFyKCk7XG5cblx0XHRmb3IgKGkgPSAwOyBpIDwgNzsgaSsrKSB7XG5cdFx0XHRkb20oXCJkaXZcIiwgeyBodG1sOiBkYXRlcy5kYXlzLmFiYnJbaV0sIGNsYXNzOiAnZGF5LW9mLXdlZWsnIH0sIG5vZGUpO1xuXHRcdH1cblxuXHRcdGZvciAoaSA9IDA7IGkgPCA0MjsgaSsrKSB7XG5cdFx0XHR0eCA9IGRhdGVOdW0gKyAxID4gMCAmJiBkYXRlTnVtICsgMSA8PSBkYXlzSW5Nb250aCA/IGRhdGVOdW0gKyAxIDogXCImbmJzcDtcIjtcblxuXHRcdFx0aXNUaGlzTW9udGggPSBmYWxzZTtcblx0XHRcdGlmIChkYXRlTnVtICsgMSA+IDAgJiYgZGF0ZU51bSArIDEgPD0gZGF5c0luTW9udGgpIHtcblx0XHRcdFx0Ly8gY3VycmVudCBtb250aFxuXHRcdFx0XHR0eCA9IGRhdGVOdW0gKyAxO1xuXHRcdFx0XHRpc1RoaXNNb250aCA9IHRydWU7XG5cdFx0XHRcdGNzcyA9ICdkYXkgb24nO1xuXHRcdFx0XHRpZiAoZGF0ZVRvZGF5ID09PSB0eCkge1xuXHRcdFx0XHRcdGNzcyArPSAnIHRvZGF5Jztcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoZGF0ZVNlbGVjdGVkID09PSB0eCAmJiAhaXNSYW5nZSkge1xuXHRcdFx0XHRcdGNzcyArPSAnIGF5LXNlbGVjdGVkJztcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmIChkYXRlTnVtIDwgMCkge1xuXHRcdFx0XHQvLyBwcmV2aW91cyBtb250aFxuXHRcdFx0XHR0eCA9IGRheXNJblByZXZNb250aCArIGRhdGVOdW0gKyAxO1xuXHRcdFx0XHRjc3MgPSAnZGF5IG9mZiBwYXN0Jztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIG5leHQgbW9udGhcblx0XHRcdFx0dHggPSArK25leHRNb250aDtcblx0XHRcdFx0Y3NzID0gJ2RheSBvZmYgZnV0dXJlJztcblx0XHRcdH1cblxuXHRcdFx0ZGF5ID0gZG9tKFwiZGl2XCIsIHsgaW5uZXJIVE1MOiB0eCwgY2xhc3M6IGNzcyB9LCBub2RlKTtcblxuXHRcdFx0ZGF0ZU51bSsrO1xuXHRcdFx0aWYgKGlzVGhpc01vbnRoKSB7XG5cdFx0XHRcdC8vIEtlZXAgYSBtYXAgb2YgYWxsIHRoZSBkYXlzXG5cdFx0XHRcdC8vIHVzZSBpdCBmb3IgYWRkaW5nIGFuZCByZW1vdmluZyBzZWxlY3Rpb24vaG92ZXIgY2xhc3Nlc1xuXHRcdFx0XHRpbmNEYXRlLnNldERhdGUodHgpO1xuXHRcdFx0XHRkYXkuX2RhdGUgPSBpbmNEYXRlLmdldFRpbWUoKTtcblx0XHRcdFx0dGhpcy5kYXlNYXBbdHhdID0gZGF5O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuY29udGFpbmVyLmFwcGVuZENoaWxkKG5vZGUpO1xuXHRcdHRoaXMuYm9keU5vZGUgPSBub2RlO1xuXHRcdHRoaXMuc2V0Rm9vdGVyKCk7XG5cdFx0dGhpcy5kaXNwbGF5UmFuZ2UoKTtcblx0XHR0aGlzLnNldFJhbmdlRW5kUG9pbnRzKCk7XG5cblx0XHR0aGlzLmVtaXREaXNwbGF5RXZlbnRzKCk7XG5cdH1cblxuXHRzZXRGb290ZXIgKCkge1xuXHRcdGNvbnN0IGQgPSBuZXcgRGF0ZSgpO1xuXHRcdHRoaXMuZm9vdGVyTGluay5pbm5lckhUTUwgPSBkYXRlcy5kYXlzLmZ1bGxbZC5nZXREYXkoKV0gKyAnICcgKyBkYXRlcy5tb250aHMuZnVsbFtkLmdldE1vbnRoKCldICsgJyAnICsgZC5nZXREYXRlKCkgKyAnLCAnICsgZC5nZXRGdWxsWWVhcigpO1xuXHR9XG5cblx0Y29ubmVjdCAoKSB7XG5cdFx0dGhpcy5vbih0aGlzLmxmdE5vZGUsICdjbGljaycsICgpID0+IHtcblx0XHRcdHRoaXMub25DbGlja01vbnRoKC0xKTtcblx0XHR9KTtcblxuXHRcdHRoaXMub24odGhpcy5yZ3ROb2RlLCAnY2xpY2snLCAoKSA9PiB7XG5cdFx0XHR0aGlzLm9uQ2xpY2tNb250aCgxKTtcblx0XHR9KTtcblxuXHRcdHRoaXMub24odGhpcy5mb290ZXJMaW5rLCAnY2xpY2snLCAoKSA9PiB7XG5cdFx0XHR0aGlzLmN1cnJlbnQgPSBuZXcgRGF0ZSgpO1xuXHRcdFx0dGhpcy5yZW5kZXIoKTtcblx0XHR9KTtcblxuXHRcdHRoaXMub24odGhpcy5jb250YWluZXIsICdjbGljaycsIChlKSA9PiB7XG5cdFx0XHR0aGlzLmZpcmUoJ3ByZS1jbGljaycsIGUsIHRydWUsIHRydWUpO1xuXHRcdFx0Y29uc3Qgbm9kZSA9IGUudGFyZ2V0O1xuXHRcdFx0aWYgKG5vZGUuY2xhc3NMaXN0LmNvbnRhaW5zKCdkYXknKSkge1xuXHRcdFx0XHR0aGlzLm9uQ2xpY2tEYXkobm9kZSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChub2RlLmNsYXNzTGlzdC5jb250YWlucygneWVhcicpKSB7XG5cdFx0XHRcdHRoaXMub25DbGlja1llYXIobm9kZSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChub2RlLmNsYXNzTGlzdC5jb250YWlucygnZGVjYWRlJykpIHtcblx0XHRcdFx0dGhpcy5vbkNsaWNrRGVjYWRlKG5vZGUpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5vbih0aGlzLm1vbnRoTm9kZSwgJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0aWYgKHRoaXMubW9kZSArIDEgPT09IHRoaXMubW9kZXMubGVuZ3RoKSB7XG5cdFx0XHRcdHRoaXMubW9kZSA9IDA7XG5cdFx0XHRcdHRoaXMucmVuZGVyKCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0dGhpcy5zZXRNb2RlKHRoaXMubW9kZSArIDEpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0aWYgKHRoaXNbJ3JhbmdlLXBpY2tlciddKSB7XG5cdFx0XHR0aGlzLm9uKHRoaXMuY29udGFpbmVyLCAnbW91c2VvdmVyJywgdGhpcy5ob3ZlclNlbGVjdFJhbmdlLmJpbmQodGhpcykpO1xuXHRcdH1cblx0fVxufVxuXG5jb25zdCB0b2RheSA9IG5ldyBEYXRlKCk7XG5cbmZ1bmN0aW9uIGdldFNlbGVjdGVkRGF0ZSAoZGF0ZSwgY3VycmVudCkge1xuXHRpZiAoZGF0ZS5nZXRNb250aCgpID09PSBjdXJyZW50LmdldE1vbnRoKCkgJiYgZGF0ZS5nZXRGdWxsWWVhcigpID09PSBjdXJyZW50LmdldEZ1bGxZZWFyKCkpIHtcblx0XHRyZXR1cm4gZGF0ZS5nZXREYXRlKCk7XG5cdH1cblx0cmV0dXJuIC05OTk7IC8vIGluZGV4IG11c3QgYmUgb3V0IG9mIHJhbmdlLCBhbmQgLTEgaXMgdGhlIGxhc3QgZGF5IG9mIHRoZSBwcmV2aW91cyBtb250aFxufVxuXG5mdW5jdGlvbiBkZXN0cm95IChub2RlKSB7XG5cdGlmIChub2RlKSB7XG5cdFx0ZG9tLmRlc3Ryb3kobm9kZSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gaXNUaGlzTW9udGggKGRhdGUsIGN1cnJlbnREYXRlKSB7XG5cdHJldHVybiBkYXRlLmdldE1vbnRoKCkgPT09IGN1cnJlbnREYXRlLmdldE1vbnRoKCkgJiYgZGF0ZS5nZXRGdWxsWWVhcigpID09PSBjdXJyZW50RGF0ZS5nZXRGdWxsWWVhcigpO1xufVxuXG5mdW5jdGlvbiBpblJhbmdlIChkYXRlVGltZSwgYmVnVGltZSwgZW5kVGltZSkge1xuXHRyZXR1cm4gZGF0ZVRpbWUgPj0gYmVnVGltZSAmJiBkYXRlVGltZSA8PSBlbmRUaW1lO1xufVxuXG5mdW5jdGlvbiBjb3B5IChkYXRlKSB7XG5cdHJldHVybiBuZXcgRGF0ZShkYXRlLmdldFRpbWUoKSk7XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnZGF0ZS1waWNrZXInLCBEYXRlUGlja2VyKTtcblxubW9kdWxlLmV4cG9ydHMgPSBEYXRlUGlja2VyOyIsInJlcXVpcmUoJy4vZGF0ZS1yYW5nZS1waWNrZXInKTtcbmNvbnN0IERhdGVJbnB1dCA9IHJlcXVpcmUoJy4vZGF0ZS1pbnB1dCcpO1xuY29uc3QgZGF0ZXMgPSByZXF1aXJlKCdkYXRlcycpO1xuY29uc3QgZG9tID0gcmVxdWlyZSgnZG9tJyk7XG5cbmNvbnN0IHByb3BzID0gWyd2YWx1ZSddO1xuY29uc3QgYm9vbHMgPSBbJ3JhbmdlLWV4cGFuZHMnXTtcblxuY2xhc3MgRGF0ZVJhbmdlSW5wdXQgZXh0ZW5kcyBEYXRlSW5wdXQge1xuXG5cdHN0YXRpYyBnZXQgb2JzZXJ2ZWRBdHRyaWJ1dGVzICgpIHtcblx0XHRyZXR1cm4gWy4uLnByb3BzLCAuLi5ib29sc107XG5cdH1cblxuXHRnZXQgcHJvcHMgKCkge1xuXHRcdHJldHVybiBwcm9wcztcblx0fVxuXG5cdGdldCBib29scyAoKSB7XG5cdFx0cmV0dXJuIGJvb2xzO1xuXHR9XG5cblx0b25WYWx1ZSAodmFsdWUpIHtcblxuXHR9XG5cblx0Z2V0IHRlbXBsYXRlU3RyaW5nICgpIHtcblx0XHRyZXR1cm4gYFxuPGxhYmVsPlxuXHQ8c3BhbiByZWY9XCJsYWJlbE5vZGVcIj48L3NwYW4+XG5cdDxpbnB1dCByZWY9XCJpbnB1dFwiIC8+XG5cdFxuPC9sYWJlbD5cbjxkYXRlLXJhbmdlLXBpY2tlciByZWY9XCJwaWNrZXJcIiB0YWJpbmRleD1cIjBcIj48L2RhdGUtcmFuZ2UtcGlja2VyPmA7XG5cdH1cblxuXHRjb25zdHJ1Y3RvciAoKSB7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLm1hc2sgPSAnWFgvWFgvWFhYWCAtIFhYL1hYL1hYWFgnXG5cdH1cblxuXHQvLyBvbktleSAoKSB7XG5cdC8vXG5cdC8vIH1cblx0Ly9cblx0Ly8gY29ubmVjdEtleXMgKCkge1xuXHQvLyBcdHRoaXMub24odGhpcy5pbnB1dCwgJ2tleXVwJywgdGhpcy5vbktleS5iaW5kKHRoaXMpKTtcblx0Ly8gfVxuXG5cdC8vIGRvbVJlYWR5ICgpIHtcblx0Ly8gXHRkb20oKTtcblx0Ly8gfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ2RhdGUtcmFuZ2UtaW5wdXQnLCBEYXRlUmFuZ2VJbnB1dCk7XG5cbm1vZHVsZS5leHBvcnRzID0gRGF0ZVJhbmdlSW5wdXQ7IiwicmVxdWlyZSgnLi9kYXRlLXBpY2tlcicpO1xuY29uc3QgQmFzZUNvbXBvbmVudCA9IHJlcXVpcmUoJ0Jhc2VDb21wb25lbnQnKTtcbmNvbnN0IGRhdGVzID0gcmVxdWlyZSgnZGF0ZXMnKTtcbmNvbnN0IGRvbSA9IHJlcXVpcmUoJ2RvbScpO1xuXG5jb25zdCBwcm9wcyA9IFsndmFsdWUnXTtcbmNvbnN0IGJvb2xzID0gWydyYW5nZS1leHBhbmRzJ107XG5cbmNsYXNzIERhdGVSYW5nZVBpY2tlciBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXG5cdHN0YXRpYyBnZXQgb2JzZXJ2ZWRBdHRyaWJ1dGVzICgpIHtcblx0XHRyZXR1cm4gWy4uLnByb3BzLCAuLi5ib29sc107XG5cdH1cblxuXHRnZXQgcHJvcHMgKCkge1xuXHRcdHJldHVybiBwcm9wcztcblx0fVxuXG5cdGdldCBib29scyAoKSB7XG5cdFx0cmV0dXJuIGJvb2xzO1xuXHR9XG5cblx0b25WYWx1ZSAodmFsdWUpIHtcblx0XHQvLyBtaWdodCBuZWVkIGF0dHJpYnV0ZUNoYW5nZWRcblx0XHR0aGlzLnN0ckRhdGUgPSBkYXRlcy5pc0RhdGVUeXBlKHZhbHVlKSA/IHZhbHVlIDogJyc7XG5cdFx0b25Eb21SZWFkeSh0aGlzLCAoKSA9PiB7XG5cdFx0XHR0aGlzLnNldFZhbHVlKHRoaXMuc3RyRGF0ZSwgdHJ1ZSk7XG5cdFx0fSk7XG5cdH1cblxuXHRjb25zdHJ1Y3RvciAoKSB7XG5cdFx0c3VwZXIoKTtcblx0fVxuXG5cdHNldFZhbHVlICh2YWx1ZSwgbm9FbWl0KSB7XG5cdFx0aWYgKCF2YWx1ZSkge1xuXHRcdFx0dGhpcy52YWx1ZURhdGUgPSAnJztcblx0XHRcdHRoaXMuY2xlYXJSYW5nZSgpO1xuXG5cdFx0fSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHR2YXIgZGF0ZVN0cmluZ3MgPSBzcGxpdCh2YWx1ZSk7XG5cdFx0XHR0aGlzLnZhbHVlRGF0ZSA9IGRhdGVzLnN0clRvRGF0ZSh2YWx1ZSk7XG5cdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBkYXRlcy5zdHJUb0RhdGUoZGF0ZVN0cmluZ3NbMF0pO1xuXHRcdFx0dGhpcy5zZWNvbmRSYW5nZSA9IGRhdGVzLnN0clRvRGF0ZShkYXRlU3RyaW5nc1sxXSk7XG5cdFx0XHR0aGlzLnNldERpc3BsYXkoKTtcblx0XHRcdHRoaXMuc2V0UmFuZ2Uobm9FbWl0KTtcblx0XHR9XG5cdH1cblxuXHRkb21SZWFkeSAoKSB7XG5cdFx0dGhpcy5sZWZ0Q2FsID0gZG9tKCdkYXRlLXBpY2tlcicsIHsncmFuZ2UtbGVmdCc6IHRydWV9LCB0aGlzKTtcblx0XHR0aGlzLnJpZ2h0Q2FsID0gZG9tKCdkYXRlLXBpY2tlcicsIHsncmFuZ2UtcmlnaHQnOiB0cnVlfSwgdGhpcyk7XG5cdFx0dGhpcy5yYW5nZUV4cGFuZHMgPSB0aGlzWydyYW5nZS1leHBhbmRzJ107XG5cblx0XHR0aGlzLmNvbm5lY3RFdmVudHMoKTtcblx0XHQvLyBpZiAodGhpcy5pbml0YWxWYWx1ZSkge1xuXHRcdC8vIFx0dGhpcy5zZXRWYWx1ZSh0aGlzLmluaXRhbFZhbHVlKTtcblx0XHQvLyB9IGVsc2Uge1xuXHRcdC8vIFx0dGhpcy5zZXREaXNwbGF5KCk7XG5cdFx0Ly8gfVxuXHR9XG5cblx0c2V0RGlzcGxheSAoKSB7XG5cdFx0Y29uc3Rcblx0XHRcdGZpcnN0ID0gdGhpcy5maXJzdFJhbmdlID8gbmV3IERhdGUodGhpcy5maXJzdFJhbmdlLmdldFRpbWUoKSkgOiBuZXcgRGF0ZSgpLFxuXHRcdFx0c2Vjb25kID0gbmV3IERhdGUoZmlyc3QuZ2V0VGltZSgpKTtcblxuXHRcdHNlY29uZC5zZXRNb250aChzZWNvbmQuZ2V0TW9udGgoKSArIDEpO1xuXHRcdHRoaXMubGVmdENhbC5zZXREaXNwbGF5KGZpcnN0KTtcblx0XHR0aGlzLnJpZ2h0Q2FsLnNldERpc3BsYXkoc2Vjb25kKTtcblx0fVxuXG5cdHNldFJhbmdlIChub0VtaXQpIHtcblx0XHR0aGlzLmxlZnRDYWwuc2V0UmFuZ2UodGhpcy5maXJzdFJhbmdlLCB0aGlzLnNlY29uZFJhbmdlKTtcblx0XHR0aGlzLnJpZ2h0Q2FsLnNldFJhbmdlKHRoaXMuZmlyc3RSYW5nZSwgdGhpcy5zZWNvbmRSYW5nZSk7XG5cdFx0aWYgKCFub0VtaXQgJiYgdGhpcy5maXJzdFJhbmdlICYmIHRoaXMuc2Vjb25kUmFuZ2UpIHtcblxuXHRcdFx0Y29uc3Rcblx0XHRcdFx0YmVnID0gZGF0ZXMuZGF0ZVRvU3RyKHRoaXMuZmlyc3RSYW5nZSksXG5cdFx0XHRcdGVuZCA9IGRhdGVzLmRhdGVUb1N0cih0aGlzLnNlY29uZFJhbmdlKTtcblxuXHRcdFx0dGhpcy5lbWl0KCdjaGFuZ2UnLCB7XG5cdFx0XHRcdGZpcnN0UmFuZ2U6IHRoaXMuZmlyc3RSYW5nZSxcblx0XHRcdFx0c2Vjb25kUmFuZ2U6IHRoaXMuc2Vjb25kUmFuZ2UsXG5cdFx0XHRcdGJlZ2luOiBiZWcsXG5cdFx0XHRcdGVuZDogZW5kLFxuXHRcdFx0XHR2YWx1ZTogYmVnICsgREVMSU1JVEVSICsgZW5kXG5cblx0XHRcdH0pO1xuXHRcdH1cblx0fVxuXG5cdGNsZWFyUmFuZ2UgKCkge1xuXHRcdHRoaXMubGVmdENhbC5jbGVhclJhbmdlKCk7XG5cdFx0dGhpcy5yaWdodENhbC5jbGVhclJhbmdlKCk7XG5cdH1cblxuXHRjYWxjdWxhdGVSYW5nZSAoZSwgd2hpY2gpIHtcblx0XHRlID0gZS5kZXRhaWwgfHwgZTtcblxuXHRcdGlmIChlLmZpcnN0ID09PSB0aGlzLmxlZnRDYWwuZmlyc3RSYW5nZSkge1xuXHRcdFx0aWYgKCFlLnNlY29uZCkge1xuXHRcdFx0XHR0aGlzLnJpZ2h0Q2FsLmNsZWFyUmFuZ2UoKTtcblx0XHRcdFx0dGhpcy5yaWdodENhbC5zZXRSYW5nZSh0aGlzLmxlZnRDYWwuZmlyc3RSYW5nZSwgbnVsbCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLnJpZ2h0Q2FsLnNldFJhbmdlKHRoaXMubGVmdENhbC5maXJzdFJhbmdlLCB0aGlzLmxlZnRDYWwuc2Vjb25kUmFuZ2UpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGNvbm5lY3RFdmVudHMgKCkge1xuXHRcdHRoaXMubGVmdENhbC5vbignZGlzcGxheS1jaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0bGV0XG5cdFx0XHRcdG0gPSBlLmRldGFpbC5tb250aCxcblx0XHRcdFx0eSA9IGUuZGV0YWlsLnllYXI7XG5cdFx0XHRpZiAobSArIDEgPiAxMSkge1xuXHRcdFx0XHRtID0gMDtcblx0XHRcdFx0eSsrO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bSsrO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5yaWdodENhbC5zZXREaXNwbGF5KHksIG0pO1xuXHRcdH0uYmluZCh0aGlzKSk7XG5cblx0XHR0aGlzLnJpZ2h0Q2FsLm9uKCdkaXNwbGF5LWNoYW5nZScsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRsZXRcblx0XHRcdFx0bSA9IGUuZGV0YWlsLm1vbnRoLFxuXHRcdFx0XHR5ID0gZS5kZXRhaWwueWVhcjtcblx0XHRcdGlmIChtIC0gMSA8IDApIHtcblx0XHRcdFx0bSA9IDExO1xuXHRcdFx0XHR5LS07XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRtLS07XG5cdFx0XHR9XG5cdFx0XHR0aGlzLmxlZnRDYWwuc2V0RGlzcGxheSh5LCBtKTtcblx0XHR9LmJpbmQodGhpcykpO1xuXG5cdFx0dGhpcy5sZWZ0Q2FsLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0ZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9LmJpbmQodGhpcykpO1xuXG5cdFx0dGhpcy5yaWdodENhbC5vbignY2hhbmdlJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fS5iaW5kKHRoaXMpKTtcblxuXG5cdFx0aWYgKCF0aGlzLnJhbmdlRXhwYW5kcykge1xuXHRcdFx0dGhpcy5yaWdodENhbC5vbigncmVzZXQtcmFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHR0aGlzLmxlZnRDYWwuY2xlYXJSYW5nZSgpO1xuXHRcdFx0fS5iaW5kKHRoaXMpKTtcblxuXHRcdFx0dGhpcy5sZWZ0Q2FsLm9uKCdyZXNldC1yYW5nZScsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdHRoaXMucmlnaHRDYWwuY2xlYXJSYW5nZSgpO1xuXHRcdFx0fS5iaW5kKHRoaXMpKTtcblx0XHR9XG5cblxuXHRcdHRoaXMubGVmdENhbC5vbignc2VsZWN0LXJhbmdlJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdHRoaXMuY2FsY3VsYXRlUmFuZ2UoZSwgJ2xlZnQnKTtcblx0XHRcdGUgPSBlLmRldGFpbDtcblx0XHRcdGlmICh0aGlzLnJhbmdlRXhwYW5kcyAmJiBlLmZpcnN0ICYmIGUuc2Vjb25kKSB7XG5cdFx0XHRcdGlmIChpc0RhdGVDbG9zZXJUb0xlZnQoZS5jdXJyZW50LCBlLmZpcnN0LCBlLnNlY29uZCkpIHtcblx0XHRcdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5zZWNvbmRSYW5nZSA9IGUuY3VycmVudDtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLnNldFJhbmdlKCk7XG5cdFx0XHR9IGVsc2UgaWYgKGUuZmlyc3QgJiYgZS5zZWNvbmQpIHtcblx0XHRcdFx0Ly8gbmV3IHJhbmdlXG5cdFx0XHRcdHRoaXMuY2xlYXJSYW5nZSgpO1xuXHRcdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdHRoaXMuc2Vjb25kUmFuZ2UgPSBudWxsO1xuXHRcdFx0XHR0aGlzLnNldFJhbmdlKCk7XG5cdFx0XHR9IGVsc2UgaWYgKGUuZmlyc3QgJiYgIWUuc2Vjb25kKSB7XG5cdFx0XHRcdHRoaXMuc2Vjb25kUmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdHRoaXMuc2V0UmFuZ2UoKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdHRoaXMuc2V0UmFuZ2UoKTtcblx0XHRcdH1cblx0XHR9LmJpbmQodGhpcykpO1xuXG5cdFx0dGhpcy5yaWdodENhbC5vbignc2VsZWN0LXJhbmdlJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdHRoaXMuY2FsY3VsYXRlUmFuZ2UoZSwgJ3JpZ2h0Jyk7XG5cblx0XHRcdGUgPSBlLmRldGFpbDtcblx0XHRcdGlmICh0aGlzLnJhbmdlRXhwYW5kcyAmJiBlLmZpcnN0ICYmIGUuc2Vjb25kKSB7XG5cdFx0XHRcdGlmIChpc0RhdGVDbG9zZXJUb0xlZnQoZS5jdXJyZW50LCBlLmZpcnN0LCBlLnNlY29uZCkpIHtcblx0XHRcdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5zZWNvbmRSYW5nZSA9IGUuY3VycmVudDtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLnNldFJhbmdlKCk7XG5cdFx0XHR9IGVsc2UgaWYgKGUuZmlyc3QgJiYgZS5zZWNvbmQpIHtcblx0XHRcdFx0Ly8gbmV3IHJhbmdlXG5cdFx0XHRcdHRoaXMuY2xlYXJSYW5nZSgpO1xuXHRcdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdHRoaXMuc2Vjb25kUmFuZ2UgPSBudWxsO1xuXHRcdFx0XHR0aGlzLnNldFJhbmdlKCk7XG5cdFx0XHR9IGVsc2UgaWYgKGUuZmlyc3QgJiYgIWUuc2Vjb25kKSB7XG5cdFx0XHRcdHRoaXMuc2Vjb25kUmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdHRoaXMuc2V0UmFuZ2UoKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdHRoaXMuc2V0UmFuZ2UoKTtcblx0XHRcdH1cblx0XHR9LmJpbmQodGhpcykpO1xuXG5cdFx0dGhpcy5vbih0aGlzLnJpZ2h0Q2FsLCAnbW91c2VvdmVyJywgZnVuY3Rpb24gKCkge1xuXHRcdFx0dGhpcy5sZWZ0Q2FsLmRpc3BsYXlSYW5nZVRvRW5kKCk7XG5cdFx0fS5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdGRlc3Ryb3kgKCkge1xuXHRcdHRoaXMucmlnaHRDYWwuZGVzdHJveSgpO1xuXHRcdHRoaXMubGVmdENhbC5kZXN0cm95KCk7XG5cdH1cbn1cblxuY29uc3QgREVMSU1JVEVSID0gJyAtICc7XG5jb25zdCB0b2RheSA9IG5ldyBEYXRlKCk7XG5cbmZ1bmN0aW9uIHN0ciAoZCkge1xuXHRpZiAoIWQpIHtcblx0XHRyZXR1cm4gbnVsbDtcblx0fVxuXHRyZXR1cm4gZGF0ZXMuZGF0ZVRvU3RyKGQpO1xufVxuXG5mdW5jdGlvbiBzcGxpdCAodmFsdWUpIHtcblx0aWYgKHZhbHVlLmluZGV4T2YoJywnKSA+IC0xKSB7XG5cdFx0cmV0dXJuIHZhbHVlLnNwbGl0KC9cXHMqLFxccyovKTtcblx0fVxuXHRyZXR1cm4gdmFsdWUuc3BsaXQoL1xccyotXFxzKi8pO1xufVxuXG5mdW5jdGlvbiBpc0RhdGVDbG9zZXJUb0xlZnQgKGRhdGUsIGxlZnQsIHJpZ2h0KSB7XG5cdGNvbnN0IGRpZmYxID0gZGF0ZXMuZGlmZihkYXRlLCBsZWZ0KSxcblx0XHRkaWZmMiA9IGRhdGVzLmRpZmYoZGF0ZSwgcmlnaHQpO1xuXHRyZXR1cm4gZGlmZjEgPD0gZGlmZjI7XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnZGF0ZS1yYW5nZS1waWNrZXInLCBEYXRlUmFuZ2VQaWNrZXIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERhdGVSYW5nZVBpY2tlcjsiLCJyZXF1aXJlKCcuL2dsb2JhbHMnKTtcbnJlcXVpcmUoJy4uLy4uL3NyYy9kYXRlLXBpY2tlcicpO1xucmVxdWlyZSgnLi4vLi4vc3JjL2RhdGUtaW5wdXQnKTtcbnJlcXVpcmUoJy4uLy4uL3NyYy9kYXRlLXJhbmdlLXBpY2tlcicpO1xucmVxdWlyZSgnLi4vLi4vc3JjL2RhdGUtcmFuZ2UtaW5wdXQnKTsiLCJ3aW5kb3dbJ25vLW5hdGl2ZS1zaGltJ10gPSBmYWxzZTtcbnJlcXVpcmUoJ2N1c3RvbS1lbGVtZW50cy1wb2x5ZmlsbCcpO1xud2luZG93Lm9uID0gcmVxdWlyZSgnb24nKTtcbndpbmRvdy5kb20gPSByZXF1aXJlKCdkb20nKTsiXX0=
