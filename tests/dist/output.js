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
			var len = this.input.value.length === 10;
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
			s = s.replace(/\D/g, '');
			var mask = this.mask;
			var f = '';
			var len = Math.min(s.length, this.maskLength);
			for (var i = 0; i < len; i++) {
				if (mask[f.length] !== 'X') {
					f += mask[f.length];
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
			//console.log(k, ':', beg, end, '/', str.length);
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
				//console.log('sel', end);
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

			console.log('this.mask', this.mask);
			this.mask = this.mask || defaultMask;
			this.maskLength = this.mask.match(/X/g).join('').length;
			console.log('this.mask', this.mask);
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

		return _possibleConstructorReturn(this, (DateRangeInput.__proto__ || Object.getPrototypeOf(DateRangeInput)).call(this));
	}

	_createClass(DateRangeInput, [{
		key: 'onKey',
		value: function onKey() {}
	}, {
		key: 'connectKeys',
		value: function connectKeys() {
			this.on(this.input, 'keyup', this.onKey.bind(this));
		}

		// domReady () {
		// 	dom();
		// }

	}]);

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
				_this2.setValue(_this2.strDate);
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
		value: function setValue(value) {
			if (!value) {
				this.valueDate = '';
				this.clearRange();
			} else if (typeof value === 'string') {
				var dateStrings = split(value);
				this.valueDate = dates.strToDate(value);
				this.firstRange = dates.strToDate(dateStrings[0]);
				this.secondRange = dates.strToDate(dateStrings[1]);
				this.setDisplay();
				this.setRange();
			}
		}
	}, {
		key: 'domReady',
		value: function domReady() {
			this.leftCal = dom('date-picker', { 'range-left': true }, this);
			this.rightCal = dom('date-picker', { 'range-right': true }, this);
			this.rangeExpands = this['range-expands'];

			this.connectEvents();
			if (this.initalValue) {
				this.setValue(this.initalValue);
			} else {
				this.setDisplay();
			}
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
		value: function setRange() {
			this.leftCal.setRange(this.firstRange, this.secondRange);
			this.rightCal.setRange(this.firstRange, this.secondRange);
			if (this.firstRange && this.secondRange) {

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQmFzZUNvbXBvbmVudC9zcmMvcHJvcGVydGllcy5qcyIsIm5vZGVfbW9kdWxlcy9CYXNlQ29tcG9uZW50L3NyYy9yZWZzLmpzIiwibm9kZV9tb2R1bGVzL0Jhc2VDb21wb25lbnQvc3JjL3RlbXBsYXRlLmpzIiwibm9kZV9tb2R1bGVzL2RhdGVzL3NyYy9kYXRlcy5qcyIsInNyYy9kYXRlLWlucHV0LmpzIiwic3JjL2RhdGUtcGlja2VyLmpzIiwic3JjL2RhdGUtcmFuZ2UtaW5wdXQuanMiLCJzcmMvZGF0ZS1yYW5nZS1waWNrZXIuanMiLCJ0ZXN0cy9zcmMvZGF0ZS1waWNrZXItdGVzdHMuanMiLCJ0ZXN0cy9zcmMvZ2xvYmFscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7O0FDMWRBLFFBQVEsZUFBUjtBQUNBLElBQU0sZ0JBQWdCLFFBQVEsZUFBUixDQUF0QjtBQUNBLElBQU0sUUFBUSxRQUFRLE9BQVIsQ0FBZDs7QUFFQSxJQUFNLHFCQUFxQixZQUEzQjtBQUNBLElBQU0sY0FBYyxZQUFwQjtBQUNBLElBQU0sUUFBUSxDQUFDLE9BQUQsRUFBVSxNQUFWLEVBQWtCLE1BQWxCLEVBQTBCLGFBQTFCLEVBQXlDLE9BQXpDLEVBQWtELE1BQWxELENBQWQ7QUFDQSxJ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QUFDdEIsS0FBSSxNQUFNLE9BQU4sQ0FBYyxHQUFkLElBQXFCLENBQUMsQ0FBMUIsRUFBNkI7QUFDNUIsU0FBTyxNQUFNLEtBQU4sQ0FBWSxTQUFaLENBQVA7QUFDQTtBQUNELFFBQU8sTUFBTSxLQUFOLENBQVksU0FBWixDQUFQO0FBQ0E7O0FBRUQsU0FBUyxrQkFBVCxDQUE2QixJQUE3QixFQUFtQyxJQUFuQyxFQUF5QyxLQUF6QyxFQUFnRDtBQUMvQyxLQUFNLFFBQVEsTUFBTSxJQUFOLENBQVcsSUFBWCxFQUFpQixJQUFqQixDQUFkO0FBQUEsS0FDQyxRQUFRLE1BQU0sSUFBTixDQUFXLElBQVgsRUFBaUIsS0FBakIsQ0FEVDtBQUVBLFFBQU8sU0FBUyxLQUFoQjtBQUNBOztBQUVELGVBQWUsTUFBZixDQUFzQixtQkFBdEIsRUFBMkMsZUFBM0M7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLGVBQWpCOzs7OztBQzFQQSxRQUFRLFdBQVI7QUFDQSxRQUFRLHVCQUFSO0FBQ0EsUUFBUSxzQkFBUjtBQUNBLFFBQVEsNkJBQVI7QUFDQSxRQUFRLDRCQUFSOzs7OztBQ0pBLE9BQU8sZ0JBQVAsSUFBMkIsS0FBM0I7QUFDQSxRQUFRLDBCQUFSO0FBQ0EsT0FBTyxFQUFQLEdBQVksUUFBUSxJQUFSLENBQVo7QUFDQSxPQUFPLEdBQVAsR0FBYSxRQUFRLEtBQVIsQ0FBYiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJjb25zdCBCYXNlQ29tcG9uZW50ID0gcmVxdWlyZSgnQmFzZUNvbXBvbmVudCcpO1xuY29uc3QgZG9tID0gcmVxdWlyZSgnZG9tJyk7XG5cbmZ1bmN0aW9uIHNldEJvb2xlYW4gKG5vZGUsIHByb3ApIHtcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG5vZGUsIHByb3AsIHtcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcblx0XHRnZXQgKCkge1xuXHRcdFx0cmV0dXJuIG5vZGUuaGFzQXR0cmlidXRlKHByb3ApO1xuXHRcdH0sXG5cdFx0c2V0ICh2YWx1ZSkge1xuXHRcdFx0dGhpcy5pc1NldHRpbmdBdHRyaWJ1dGUgPSB0cnVlO1xuXHRcdFx0aWYgKHZhbHVlKSB7XG5cdFx0XHRcdHRoaXMuc2V0QXR0cmlidXRlKHByb3AsICcnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMucmVtb3ZlQXR0cmlidXRlKHByb3ApO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgZm4gPSB0aGlzW29uaWZ5KHByb3ApXTtcblx0XHRcdGlmKGZuKXtcblx0XHRcdFx0Zm4uY2FsbCh0aGlzLCB2YWx1ZSk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuaXNTZXR0aW5nQXR0cmlidXRlID0gZmFsc2U7XG5cdFx0fVxuXHR9KTtcbn1cblxuZnVuY3Rpb24gc2V0UHJvcGVydHkgKG5vZGUsIHByb3ApIHtcblx0bGV0IHByb3BWYWx1ZTtcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG5vZGUsIHByb3AsIHtcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcblx0XHRnZXQgKCkge1xuXHRcdFx0cmV0dXJuIHByb3BWYWx1ZSAhPT0gdW5kZWZpbmVkID8gcHJvcFZhbHVlIDogZG9tLm5vcm1hbGl6ZSh0aGlzLmdldEF0dHJpYnV0ZShwcm9wKSk7XG5cdFx0fSxcblx0XHRzZXQgKHZhbHVlKSB7XG5cdFx0XHR0aGlzLmlzU2V0dGluZ0F0dHJpYnV0ZSA9IHRydWU7XG5cdFx0XHR0aGlzLnNldEF0dHJpYnV0ZShwcm9wLCB2YWx1ZSk7XG5cdFx0XHRjb25zdCBmbiA9IHRoaXNbb25pZnkocHJvcCldO1xuXHRcdFx0aWYoZm4pe1xuXHRcdFx0XHRvbkRvbVJlYWR5KHRoaXMsICgpID0+IHtcblx0XHRcdFx0XHR2YWx1ZSA9IGZuLmNhbGwodGhpcywgdmFsdWUpIHx8IHZhbHVlO1xuXHRcdFx0XHRcdGlmKHZhbHVlICE9PSB1bmRlZmluZWQpe1xuXHRcdFx0XHRcdFx0cHJvcFZhbHVlID0gdmFsdWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdHRoaXMuaXNTZXR0aW5nQXR0cmlidXRlID0gZmFsc2U7XG5cdFx0fVxuXHR9KTtcbn1cblxuZnVuY3Rpb24gc2V0T2JqZWN0IChub2RlLCBwcm9wKSB7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShub2RlLCBwcm9wLCB7XG5cdFx0ZW51bWVyYWJsZTogdHJ1ZSxcblx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdFx0Z2V0ICgpIHtcblx0XHRcdHJldHVybiB0aGlzWydfXycgKyBwcm9wXTtcblx0XHR9LFxuXHRcdHNldCAodmFsdWUpIHtcblx0XHRcdHRoaXNbJ19fJyArIHByb3BdID0gdmFsdWU7XG5cdFx0fVxuXHR9KTtcbn1cblxuZnVuY3Rpb24gc2V0UHJvcGVydGllcyAobm9kZSkge1xuXHRsZXQgcHJvcHMgPSBub2RlLnByb3BzIHx8IG5vZGUucHJvcGVydGllcztcblx0aWYgKHByb3BzKSB7XG5cdFx0cHJvcHMuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuXHRcdFx0aWYgKHByb3AgPT09ICdkaXNhYmxlZCcpIHtcblx0XHRcdFx0c2V0Qm9vbGVhbihub2RlLCBwcm9wKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRzZXRQcm9wZXJ0eShub2RlLCBwcm9wKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxufVxuXG5mdW5jdGlvbiBzZXRCb29sZWFucyAobm9kZSkge1xuXHRsZXQgcHJvcHMgPSBub2RlLmJvb2xzIHx8IG5vZGUuYm9vbGVhbnM7XG5cdGlmIChwcm9wcykge1xuXHRcdHByb3BzLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcblx0XHRcdHNldEJvb2xlYW4obm9kZSwgcHJvcCk7XG5cdFx0fSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gc2V0T2JqZWN0cyAobm9kZSkge1xuXHRsZXQgcHJvcHMgPSBub2RlLm9iamVjdHM7XG5cdGlmIChwcm9wcykge1xuXHRcdHByb3BzLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcblx0XHRcdHNldE9iamVjdChub2RlLCBwcm9wKTtcblx0XHR9KTtcblx0fVxufVxuXG5mdW5jdGlvbiBjYXAgKG5hbWUpIHtcblx0cmV0dXJuIG5hbWUuc3Vic3RyaW5nKDAsMSkudG9VcHBlckNhc2UoKSArIG5hbWUuc3Vic3RyaW5nKDEpO1xufVxuXG5mdW5jdGlvbiBvbmlmeSAobmFtZSkge1xuXHRyZXR1cm4gJ29uJyArIG5hbWUuc3BsaXQoJy0nKS5tYXAod29yZCA9PiBjYXAod29yZCkpLmpvaW4oJycpO1xufVxuXG5mdW5jdGlvbiBpc0Jvb2wgKG5vZGUsIG5hbWUpIHtcblx0cmV0dXJuIChub2RlLmJvb2xzIHx8IG5vZGUuYm9vbGVhbnMgfHwgW10pLmluZGV4T2YobmFtZSkgPiAtMTtcbn1cblxuZnVuY3Rpb24gYm9vbE5vcm0gKHZhbHVlKSB7XG5cdGlmKHZhbHVlID09PSAnJyl7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblx0cmV0dXJuIGRvbS5ub3JtYWxpemUodmFsdWUpO1xufVxuXG5mdW5jdGlvbiBwcm9wTm9ybSAodmFsdWUpIHtcblx0cmV0dXJuIGRvbS5ub3JtYWxpemUodmFsdWUpO1xufVxuXG5CYXNlQ29tcG9uZW50LmFkZFBsdWdpbih7XG5cdG5hbWU6ICdwcm9wZXJ0aWVzJyxcblx0b3JkZXI6IDEwLFxuXHRpbml0OiBmdW5jdGlvbiAobm9kZSkge1xuXHRcdHNldFByb3BlcnRpZXMobm9kZSk7XG5cdFx0c2V0Qm9vbGVhbnMobm9kZSk7XG5cdH0sXG5cdHByZUF0dHJpYnV0ZUNoYW5nZWQ6IGZ1bmN0aW9uIChub2RlLCBuYW1lLCB2YWx1ZSkge1xuXHRcdGlmIChub2RlLmlzU2V0dGluZ0F0dHJpYnV0ZSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRpZihpc0Jvb2wobm9kZSwgbmFtZSkpe1xuXHRcdFx0dmFsdWUgPSBib29sTm9ybSh2YWx1ZSk7XG5cdFx0XHRub2RlW25hbWVdID0gISF2YWx1ZTtcblx0XHRcdGlmKCF2YWx1ZSl7XG5cdFx0XHRcdG5vZGVbbmFtZV0gPSBmYWxzZTtcblx0XHRcdFx0bm9kZS5pc1NldHRpbmdBdHRyaWJ1dGUgPSB0cnVlO1xuXHRcdFx0XHRub2RlLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcblx0XHRcdFx0bm9kZS5pc1NldHRpbmdBdHRyaWJ1dGUgPSBmYWxzZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG5vZGVbbmFtZV0gPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdG5vZGVbbmFtZV0gPSBwcm9wTm9ybSh2YWx1ZSk7XG5cdH1cbn0pOyIsImNvbnN0IGRvbSA9IHJlcXVpcmUoJ2RvbScpO1xuY29uc3QgQmFzZUNvbXBvbmVudCA9IHJlcXVpcmUoJ0Jhc2VDb21wb25lbnQnKTtcblxuZnVuY3Rpb24gYXNzaWduUmVmcyAobm9kZSkge1xuICAgIGRvbS5xdWVyeUFsbChub2RlLCAnW3JlZl0nKS5mb3JFYWNoKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgICBsZXQgbmFtZSA9IGNoaWxkLmdldEF0dHJpYnV0ZSgncmVmJyk7XG4gICAgICAgIG5vZGVbbmFtZV0gPSBjaGlsZDtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gYXNzaWduRXZlbnRzIChub2RlKSB7XG4gICAgLy8gPGRpdiBvbj1cImNsaWNrOm9uQ2xpY2tcIj5cbiAgICBkb20ucXVlcnlBbGwobm9kZSwgJ1tvbl0nKS5mb3JFYWNoKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgICBsZXRcbiAgICAgICAgICAgIGtleVZhbHVlID0gY2hpbGQuZ2V0QXR0cmlidXRlKCdvbicpLFxuICAgICAgICAgICAgZXZlbnQgPSBrZXlWYWx1ZS5zcGxpdCgnOicpWzBdLnRyaW0oKSxcbiAgICAgICAgICAgIG1ldGhvZCA9IGtleVZhbHVlLnNwbGl0KCc6JylbMV0udHJpbSgpO1xuICAgICAgICBub2RlLm9uKGNoaWxkLCBldmVudCwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIG5vZGVbbWV0aG9kXShlKVxuICAgICAgICB9KVxuICAgIH0pO1xufVxuXG5CYXNlQ29tcG9uZW50LmFkZFBsdWdpbih7XG4gICAgbmFtZTogJ3JlZnMnLFxuICAgIG9yZGVyOiAzMCxcbiAgICBwcmVDb25uZWN0ZWQ6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIGFzc2lnblJlZnMobm9kZSk7XG4gICAgICAgIGFzc2lnbkV2ZW50cyhub2RlKTtcbiAgICB9XG59KTsiLCJjb25zdCBCYXNlQ29tcG9uZW50ICA9IHJlcXVpcmUoJ0Jhc2VDb21wb25lbnQnKTtcbmNvbnN0IGRvbSA9IHJlcXVpcmUoJ2RvbScpO1xuXG52YXJcbiAgICBsaWdodE5vZGVzID0ge30sXG4gICAgaW5zZXJ0ZWQgPSB7fTtcblxuZnVuY3Rpb24gaW5zZXJ0IChub2RlKSB7XG4gICAgaWYoaW5zZXJ0ZWRbbm9kZS5fdWlkXSB8fCAhaGFzVGVtcGxhdGUobm9kZSkpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbGxlY3RMaWdodE5vZGVzKG5vZGUpO1xuICAgIGluc2VydFRlbXBsYXRlKG5vZGUpO1xuICAgIGluc2VydGVkW25vZGUuX3VpZF0gPSB0cnVlO1xufVxuXG5mdW5jdGlvbiBjb2xsZWN0TGlnaHROb2Rlcyhub2RlKXtcbiAgICBsaWdodE5vZGVzW25vZGUuX3VpZF0gPSBsaWdodE5vZGVzW25vZGUuX3VpZF0gfHwgW107XG4gICAgd2hpbGUobm9kZS5jaGlsZE5vZGVzLmxlbmd0aCl7XG4gICAgICAgIGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXS5wdXNoKG5vZGUucmVtb3ZlQ2hpbGQobm9kZS5jaGlsZE5vZGVzWzBdKSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBoYXNUZW1wbGF0ZSAobm9kZSkge1xuICAgIHJldHVybiAhIW5vZGUuZ2V0VGVtcGxhdGVOb2RlKCk7XG59XG5cbmZ1bmN0aW9uIGluc2VydFRlbXBsYXRlQ2hhaW4gKG5vZGUpIHtcbiAgICB2YXIgdGVtcGxhdGVzID0gbm9kZS5nZXRUZW1wbGF0ZUNoYWluKCk7XG4gICAgdGVtcGxhdGVzLnJldmVyc2UoKS5mb3JFYWNoKGZ1bmN0aW9uICh0ZW1wbGF0ZSkge1xuICAgICAgICBnZXRDb250YWluZXIobm9kZSkuYXBwZW5kQ2hpbGQoQmFzZUNvbXBvbmVudC5jbG9uZSh0ZW1wbGF0ZSkpO1xuICAgIH0pO1xuICAgIGluc2VydENoaWxkcmVuKG5vZGUpO1xufVxuXG5mdW5jdGlvbiBpbnNlcnRUZW1wbGF0ZSAobm9kZSkge1xuICAgIGlmKG5vZGUubmVzdGVkVGVtcGxhdGUpe1xuICAgICAgICBpbnNlcnRUZW1wbGF0ZUNoYWluKG5vZGUpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhclxuICAgICAgICB0ZW1wbGF0ZU5vZGUgPSBub2RlLmdldFRlbXBsYXRlTm9kZSgpO1xuXG4gICAgaWYodGVtcGxhdGVOb2RlKSB7XG4gICAgICAgIG5vZGUuYXBwZW5kQ2hpbGQoQmFzZUNvbXBvbmVudC5jbG9uZSh0ZW1wbGF0ZU5vZGUpKTtcbiAgICB9XG4gICAgaW5zZXJ0Q2hpbGRyZW4obm9kZSk7XG59XG5cbmZ1bmN0aW9uIGdldENvbnRhaW5lciAobm9kZSkge1xuICAgIHZhciBjb250YWluZXJzID0gbm9kZS5xdWVyeVNlbGVjdG9yQWxsKCdbcmVmPVwiY29udGFpbmVyXCJdJyk7XG4gICAgaWYoIWNvbnRhaW5lcnMgfHwgIWNvbnRhaW5lcnMubGVuZ3RoKXtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxuICAgIHJldHVybiBjb250YWluZXJzW2NvbnRhaW5lcnMubGVuZ3RoIC0gMV07XG59XG5cbmZ1bmN0aW9uIGluc2VydENoaWxkcmVuIChub2RlKSB7XG4gICAgdmFyIGksXG4gICAgICAgIGNvbnRhaW5lciA9IGdldENvbnRhaW5lcihub2RlKSxcbiAgICAgICAgY2hpbGRyZW4gPSBsaWdodE5vZGVzW25vZGUuX3VpZF07XG5cbiAgICBpZihjb250YWluZXIgJiYgY2hpbGRyZW4gJiYgY2hpbGRyZW4ubGVuZ3RoKXtcbiAgICAgICAgZm9yKGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspe1xuICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGNoaWxkcmVuW2ldKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuQmFzZUNvbXBvbmVudC5wcm90b3R5cGUuZ2V0TGlnaHROb2RlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbGlnaHROb2Rlc1t0aGlzLl91aWRdO1xufTtcblxuQmFzZUNvbXBvbmVudC5wcm90b3R5cGUuZ2V0VGVtcGxhdGVOb2RlID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIGNhY2hpbmcgY2F1c2VzIGRpZmZlcmVudCBjbGFzc2VzIHRvIHB1bGwgdGhlIHNhbWUgdGVtcGxhdGUgLSB3YXQ/XG4gICAgLy9pZighdGhpcy50ZW1wbGF0ZU5vZGUpIHtcbiAgICAgICAgaWYgKHRoaXMudGVtcGxhdGVJZCkge1xuICAgICAgICAgICAgdGhpcy50ZW1wbGF0ZU5vZGUgPSBkb20uYnlJZCh0aGlzLnRlbXBsYXRlSWQucmVwbGFjZSgnIycsJycpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0aGlzLnRlbXBsYXRlU3RyaW5nKSB7XG4gICAgICAgICAgICB0aGlzLnRlbXBsYXRlTm9kZSA9IGRvbS50b0RvbSgnPHRlbXBsYXRlPicgKyB0aGlzLnRlbXBsYXRlU3RyaW5nICsgJzwvdGVtcGxhdGU+Jyk7XG4gICAgICAgIH1cbiAgICAvL31cbiAgICByZXR1cm4gdGhpcy50ZW1wbGF0ZU5vZGU7XG59O1xuXG5CYXNlQ29tcG9uZW50LnByb3RvdHlwZS5nZXRUZW1wbGF0ZUNoYWluID0gZnVuY3Rpb24gKCkge1xuXG4gICAgbGV0XG4gICAgICAgIGNvbnRleHQgPSB0aGlzLFxuICAgICAgICB0ZW1wbGF0ZXMgPSBbXSxcbiAgICAgICAgdGVtcGxhdGU7XG5cbiAgICAvLyB3YWxrIHRoZSBwcm90b3R5cGUgY2hhaW47IEJhYmVsIGRvZXNuJ3QgYWxsb3cgdXNpbmdcbiAgICAvLyBgc3VwZXJgIHNpbmNlIHdlIGFyZSBvdXRzaWRlIG9mIHRoZSBDbGFzc1xuICAgIHdoaWxlKGNvbnRleHQpe1xuICAgICAgICBjb250ZXh0ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKGNvbnRleHQpO1xuICAgICAgICBpZighY29udGV4dCl7IGJyZWFrOyB9XG4gICAgICAgIC8vIHNraXAgcHJvdG90eXBlcyB3aXRob3V0IGEgdGVtcGxhdGVcbiAgICAgICAgLy8gKGVsc2UgaXQgd2lsbCBwdWxsIGFuIGluaGVyaXRlZCB0ZW1wbGF0ZSBhbmQgY2F1c2UgZHVwbGljYXRlcylcbiAgICAgICAgaWYoY29udGV4dC5oYXNPd25Qcm9wZXJ0eSgndGVtcGxhdGVTdHJpbmcnKSB8fCBjb250ZXh0Lmhhc093blByb3BlcnR5KCd0ZW1wbGF0ZUlkJykpIHtcbiAgICAgICAgICAgIHRlbXBsYXRlID0gY29udGV4dC5nZXRUZW1wbGF0ZU5vZGUoKTtcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSkge1xuICAgICAgICAgICAgICAgIHRlbXBsYXRlcy5wdXNoKHRlbXBsYXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGVtcGxhdGVzO1xufTtcblxuQmFzZUNvbXBvbmVudC5hZGRQbHVnaW4oe1xuICAgIG5hbWU6ICd0ZW1wbGF0ZScsXG4gICAgb3JkZXI6IDIwLFxuICAgIHByZUNvbm5lY3RlZDogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgaW5zZXJ0KG5vZGUpO1xuICAgIH1cbn0pOyIsIi8qIFVNRC5kZWZpbmUgKi8gKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gICAgaWYgKHR5cGVvZiBjdXN0b21Mb2FkZXIgPT09ICdmdW5jdGlvbicpeyBjdXN0b21Mb2FkZXIoZmFjdG9yeSwgJ2RhdGVzJyk7IH1cbiAgICBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpeyBkZWZpbmUoW10sIGZhY3RvcnkpOyB9XG4gICAgZWxzZSBpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpeyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTsgfVxuICAgIGVsc2V7IHJvb3QucmV0dXJuRXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgICAgICAgd2luZG93LmRhdGVzID0gZmFjdG9yeSgpOyB9XG59KHRoaXMsIGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcbiAgICAvLyBkYXRlcy5qc1xuICAgIC8vICBkYXRlIGhlbHBlciBsaWJcbiAgICAvL1xuICAgIHZhclxuICAgICAgICAvLyB0ZXN0cyB0aGF0IGl0IGlzIGEgZGF0ZSBzdHJpbmcsIG5vdCBhIHZhbGlkIGRhdGUuIDg4Lzg4Lzg4ODggd291bGQgYmUgdHJ1ZVxuICAgICAgICBkYXRlUmVnRXhwID0gL14oXFxkezEsMn0pKFtcXC8tXSkoXFxkezEsMn0pKFtcXC8tXSkoXFxkezR9KVxcYi8sXG4gICAgICAgIC8vIDIwMTUtMDUtMjZUMDA6MDA6MDBcbiAgICAgICAgdHNSZWdFeHAgPSAvXihcXGR7NH0pLShcXGR7Mn0pLShcXGR7Mn0pVChcXGR7Mn0pOihcXGR7Mn0pOihcXGR7Mn0pXFxiLyxcblxuICAgICAgICBkYXlzT2ZXZWVrID0gWydTdW5kYXknLCAnTW9uZGF5JywgJ1R1ZXNkYXknLCAnV2VkbmVzZGF5JywgJ1RodXJzZGF5JywgJ0ZyaWRheScsICdTYXR1cmRheSddLFxuICAgICAgICBkYXlzID0gW10sXG4gICAgICAgIGRheXMzID0gW10sXG4gICAgICAgIGRheURpY3QgPSB7fSxcblxuICAgICAgICBtb250aHMgPSBbJ0phbnVhcnknLCAnRmVicnVhcnknLCAnTWFyY2gnLCAnQXByaWwnLCAnTWF5JywgJ0p1bmUnLCAnSnVseScsICdBdWd1c3QnLCAnU2VwdGVtYmVyJywgJ09jdG9iZXInLCAnTm92ZW1iZXInLCAnRGVjZW1iZXInXSxcbiAgICAgICAgbW9udGhMZW5ndGhzID0gWzMxLCAyOCwgMzEsIDMwLCAzMSwgMzAsIDMxLCAzMSwgMzAsIDMxLCAzMCwgMzFdLFxuICAgICAgICBtb250aEFiYnIgPSBbXSxcbiAgICAgICAgbW9udGhEaWN0ID0ge30sXG5cbiAgICAgICAgZGF0ZVBhdHRlcm4gPSAveXl5eXx5eXxtbXxtfE1NfE18ZGR8ZC9nLFxuICAgICAgICBkYXRlUGF0dGVybkxpYnJhcnkgPSB7XG4gICAgICAgICAgICB5eXl5OiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGUuZ2V0RnVsbFllYXIoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB5eTogZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoZGF0ZS5nZXRGdWxsWWVhcigpICsgJycpLnN1YnN0cmluZygyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtbTogZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYWQoZGF0ZS5nZXRNb250aCgpICsgMSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbTogZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXRlLmdldE1vbnRoKCkgKyAxO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIE1NOiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1vbnRoc1tkYXRlLmdldE1vbnRoKCldO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIE06IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbW9udGhBYmJyW2RhdGUuZ2V0TW9udGgoKV07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGQ6IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFkKGRhdGUuZ2V0RGF0ZSgpKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkOiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGUuZ2V0RGF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGRhdGVzLFxuXG4gICAgICAgIGxlbmd0aCA9IChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhclxuICAgICAgICAgICAgICAgIHNlYyA9IDEwMDAsXG4gICAgICAgICAgICAgICAgbWluID0gc2VjICogNjAsXG4gICAgICAgICAgICAgICAgaHIgPSBtaW4gKiA2MCxcbiAgICAgICAgICAgICAgICBkYXkgPSBociAqIDI0LFxuICAgICAgICAgICAgICAgIHdlZWsgPSBkYXkgKiA3O1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzZWM6IHNlYyxcbiAgICAgICAgICAgICAgICBtaW46IG1pbixcbiAgICAgICAgICAgICAgICBocjogaHIsXG4gICAgICAgICAgICAgICAgZGF5OiBkYXksXG4gICAgICAgICAgICAgICAgd2Vlazogd2Vla1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSgpKTtcblxuICAgIC8vIHBvcHVsYXRlIGRheS1yZWxhdGVkIHN0cnVjdHVyZXNcbiAgICBkYXlzT2ZXZWVrLmZvckVhY2goZnVuY3Rpb24oZGF5LCBpbmRleCkge1xuICAgICAgICBkYXlEaWN0W2RheV0gPSBpbmRleDtcbiAgICAgICAgdmFyIGFiYnIgPSBkYXkuc3Vic3RyKDAsIDIpO1xuICAgICAgICBkYXlzLnB1c2goYWJicik7XG4gICAgICAgIGRheURpY3RbYWJicl0gPSBpbmRleDtcbiAgICAgICAgYWJiciA9IGRheS5zdWJzdHIoMCwgMyk7XG4gICAgICAgIGRheXMzLnB1c2goYWJicik7XG4gICAgICAgIGRheURpY3RbYWJicl0gPSBpbmRleDtcbiAgICB9KTtcblxuICAgIC8vIHBvcHVsYXRlIG1vbnRoLXJlbGF0ZWQgc3RydWN0dXJlc1xuICAgIG1vbnRocy5mb3JFYWNoKGZ1bmN0aW9uKG1vbnRoLCBpbmRleCkge1xuICAgICAgICBtb250aERpY3RbbW9udGhdID0gaW5kZXg7XG4gICAgICAgIHZhciBhYmJyID0gbW9udGguc3Vic3RyKDAsIDMpO1xuICAgICAgICBtb250aEFiYnIucHVzaChhYmJyKTtcbiAgICAgICAgbW9udGhEaWN0W2FiYnJdID0gaW5kZXg7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBpc0xlYXBZZWFyKGRhdGVPclllYXIpIHtcbiAgICAgICAgdmFyIHllYXIgPSBkYXRlT3JZZWFyIGluc3RhbmNlb2YgRGF0ZSA/IGRhdGVPclllYXIuZ2V0RnVsbFllYXIoKSA6IGRhdGVPclllYXI7XG4gICAgICAgIHJldHVybiAhKHllYXIgJSA0MDApIHx8ICghKHllYXIgJSA0KSAmJiAhISh5ZWFyICUgMTAwKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNWYWxpZE9iamVjdCAoZGF0ZSkge1xuICAgICAgICB2YXIgbXM7XG4gICAgICAgIGlmICh0eXBlb2YgZGF0ZSA9PT0gJ29iamVjdCcgJiYgZGF0ZSBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgICAgICAgIG1zID0gZGF0ZS5nZXRUaW1lKCk7XG4gICAgICAgICAgICByZXR1cm4gIWlzTmFOKG1zKSAmJiBtcyA+IDA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRGF0ZVR5cGUodmFsdWUpIHtcbiAgICAgICAgdmFyIHBhcnRzLCBkYXksIG1vbnRoLCB5ZWFyLCBob3VycywgbWludXRlcywgc2Vjb25kcywgbXM7XG4gICAgICAgIHN3aXRjaCAodHlwZW9mIHZhbHVlKSB7XG4gICAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgICAgIHJldHVybiBpc1ZhbGlkT2JqZWN0KHZhbHVlKTtcbiAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgLy8gaXMgaXQgYSBkYXRlIGluIFVTIGZvcm1hdD9cbiAgICAgICAgICAgICAgICBwYXJ0cyA9IGRhdGVSZWdFeHAuZXhlYyh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnRzICYmIHBhcnRzWzJdID09PSBwYXJ0c1s0XSkge1xuICAgICAgICAgICAgICAgICAgICBtb250aCA9ICtwYXJ0c1sxXTtcbiAgICAgICAgICAgICAgICAgICAgZGF5ID0gK3BhcnRzWzNdO1xuICAgICAgICAgICAgICAgICAgICB5ZWFyID0gK3BhcnRzWzVdO1xuICAgICAgICAgICAgICAgICAgICAvLyByb3VnaCBjaGVjayBvZiBhIHllYXJcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgPCB5ZWFyICYmIHllYXIgPCAyMTAwICYmIDEgPD0gbW9udGggJiYgbW9udGggPD0gMTIgJiYgMSA8PSBkYXkgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIGRheSA8PSAobW9udGggPT09IDIgJiYgaXNMZWFwWWVhcih5ZWFyKSA/IDI5IDogbW9udGhMZW5ndGhzW21vbnRoIC0gMV0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBpcyBpdCBhIHRpbWVzdGFtcCBpbiBhIHN0YW5kYXJkIGZvcm1hdD9cbiAgICAgICAgICAgICAgICBwYXJ0cyA9IHRzUmVnRXhwLmV4ZWModmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmIChwYXJ0cykge1xuICAgICAgICAgICAgICAgICAgICB5ZWFyID0gK3BhcnRzWzFdO1xuICAgICAgICAgICAgICAgICAgICBtb250aCA9ICtwYXJ0c1syXTtcbiAgICAgICAgICAgICAgICAgICAgZGF5ID0gK3BhcnRzWzNdO1xuICAgICAgICAgICAgICAgICAgICBob3VycyA9ICtwYXJ0c1s0XTtcbiAgICAgICAgICAgICAgICAgICAgbWludXRlcyA9ICtwYXJ0c1s1XTtcbiAgICAgICAgICAgICAgICAgICAgc2Vjb25kcyA9ICtwYXJ0c1s2XTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgPCB5ZWFyICYmIHllYXIgPCAyMTAwICYmIDEgPD0gbW9udGggJiYgbW9udGggPD0gMTIgJiYgMSA8PSBkYXkgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIGRheSA8PSAobW9udGggPT09IDIgJiYgaXNMZWFwWWVhcih5ZWFyKSA/IDI5IDogbW9udGhMZW5ndGhzW21vbnRoIC0gMV0pICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBob3VycyA8IDI0ICYmIG1pbnV0ZXMgPCA2MCAmJiBzZWNvbmRzIDwgNjApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gaW50ZW50aW9uYWwgZmFsbC1kb3duXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhZChudW0pIHtcbiAgICAgICAgcmV0dXJuIChudW0gPCAxMCA/ICcwJyA6ICcnKSArIG51bTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNb250aChkYXRlT3JJbmRleCkge1xuICAgICAgICByZXR1cm4gdHlwZW9mIGRhdGVPckluZGV4ID09PSAnbnVtYmVyJyA/IGRhdGVPckluZGV4IDogZGF0ZU9ySW5kZXguZ2V0TW9udGgoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNb250aEluZGV4KG5hbWUpIHtcbiAgICAgICAgLy8gVE9ETzogZG8gd2UgcmVhbGx5IHdhbnQgYSAwLWJhc2VkIGluZGV4PyBvciBzaG91bGQgaXQgYmUgYSAxLWJhc2VkIG9uZT9cbiAgICAgICAgdmFyIGluZGV4ID0gbW9udGhEaWN0W25hbWVdO1xuICAgICAgICByZXR1cm4gdHlwZW9mIGluZGV4ID09PSAnbnVtYmVyJyA/IGluZGV4IDogdm9pZCAwO1xuICAgICAgICAvLyBUT0RPOiB3ZSByZXR1cm4gdW5kZWZpbmVkIGZvciB3cm9uZyBtb250aCBuYW1lcyAtLS0gaXMgaXQgcmlnaHQ/XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TW9udGhOYW1lKGRhdGUpIHtcbiAgICAgICAgcmV0dXJuIG1vbnRoc1tnZXRNb250aChkYXRlKV07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Rmlyc3RTdW5kYXkoZGF0ZSkge1xuICAgICAgICAvLyBUT0RPOiB3aGF0IGRvZXMgaXQgcmV0dXJuPyBhIG5lZ2F0aXZlIGluZGV4IHJlbGF0ZWQgdG8gdGhlIDFzdCBvZiB0aGUgbW9udGg/XG4gICAgICAgIHZhciBkID0gbmV3IERhdGUoZGF0ZS5nZXRUaW1lKCkpO1xuICAgICAgICBkLnNldERhdGUoMSk7XG4gICAgICAgIHJldHVybiAtZC5nZXREYXkoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXREYXlzSW5QcmV2TW9udGgoZGF0ZSkge1xuICAgICAgICB2YXIgZCA9IG5ldyBEYXRlKGRhdGUpO1xuICAgICAgICBkLnNldE1vbnRoKGQuZ2V0TW9udGgoKSAtIDEpO1xuICAgICAgICByZXR1cm4gZ2V0RGF5c0luTW9udGgoZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0RGF5c0luTW9udGgoZGF0ZSkge1xuICAgICAgICB2YXIgbW9udGggPSBkYXRlLmdldE1vbnRoKCk7XG4gICAgICAgIHJldHVybiBtb250aCA9PT0gMSAmJiBpc0xlYXBZZWFyKGRhdGUpID8gMjkgOiBtb250aExlbmd0aHNbbW9udGhdO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN0clRvRGF0ZShzdHIpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RyO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRlcy50aW1lc3RhbXAuaXMoc3RyKSkge1xuICAgICAgICAgICAgLy8gMjAwMC0wMi0yOVQwMDowMDowMFxuICAgICAgICAgICAgcmV0dXJuIGRhdGVzLnRpbWVzdGFtcC5mcm9tKHN0cik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gMTEvMjAvMjAwMFxuICAgICAgICB2YXIgcGFydHMgPSBkYXRlUmVnRXhwLmV4ZWMoc3RyKTtcbiAgICAgICAgaWYgKHBhcnRzICYmIHBhcnRzWzJdID09PSBwYXJ0c1s0XSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlKCtwYXJ0c1s1XSwgK3BhcnRzWzFdIC0gMSwgK3BhcnRzWzNdKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPOiB3aGF0IHRvIHJldHVybiBmb3IgYW4gaW52YWxpZCBkYXRlPyBudWxsP1xuICAgICAgICByZXR1cm4gbmV3IERhdGUoLTEpOyAvLyBpbnZhbGlkIGRhdGVcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmb3JtYXREYXRlUGF0dGVybihkYXRlLCBwYXR0ZXJuKSB7XG4gICAgICAgIC8vICdNIGQsIHl5eXknIERlYyA1LCAyMDE1XG4gICAgICAgIC8vICdNTSBkZCB5eScgRGVjZW1iZXIgMDUgMTVcbiAgICAgICAgLy8gJ20tZC15eScgMS0xLTE1XG4gICAgICAgIC8vICdtbS1kZC15eXl5JyAwMS0wMS0yMDE1XG4gICAgICAgIC8vICdtL2QveXknIDEyLzI1LzE1XG5cbiAgICAgICAgcmV0dXJuIHBhdHRlcm4ucmVwbGFjZShkYXRlUGF0dGVybiwgZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGVQYXR0ZXJuTGlicmFyeVtuYW1lXShkYXRlKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZm9ybWF0RGF0ZShkYXRlLCBkZWxpbWl0ZXJPclBhdHRlcm4pIHtcbiAgICAgICAgaWYgKGRlbGltaXRlck9yUGF0dGVybiAmJiBkZWxpbWl0ZXJPclBhdHRlcm4ubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgcmV0dXJuIGZvcm1hdERhdGVQYXR0ZXJuKGRhdGUsIGRlbGltaXRlck9yUGF0dGVybik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyXG4gICAgICAgICAgICBkZWwgPSBkZWxpbWl0ZXJPclBhdHRlcm4gfHwgJy8nLFxuICAgICAgICAgICAgeSA9IGRhdGUuZ2V0RnVsbFllYXIoKSxcbiAgICAgICAgICAgIG0gPSBkYXRlLmdldE1vbnRoKCkgKyAxLFxuICAgICAgICAgICAgZCA9IGRhdGUuZ2V0RGF0ZSgpO1xuXG4gICAgICAgIHJldHVybiBbcGFkKG0pLCBwYWQoZCksIHldLmpvaW4oZGVsKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkYXRlVG9TdHIoZGF0ZSwgZGVsaW1pdGVyKSB7XG4gICAgICAgIHJldHVybiBmb3JtYXREYXRlKGRhdGUsIGRlbGltaXRlcik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZm9ybWF0VGltZShkYXRlLCB1c2VQZXJpb2QpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZGF0ZSA9IHN0clRvRGF0ZShkYXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhclxuICAgICAgICAgICAgcGVyaW9kID0gJ0FNJyxcbiAgICAgICAgICAgIGhvdXJzID0gZGF0ZS5nZXRIb3VycygpLFxuICAgICAgICAgICAgbWludXRlcyA9IGRhdGUuZ2V0TWludXRlcygpLFxuICAgICAgICAgICAgcmV0dmFsLFxuICAgICAgICAgICAgc2Vjb25kcyA9IGRhdGUuZ2V0U2Vjb25kcygpO1xuXG4gICAgICAgIGlmIChob3VycyA+IDExKSB7XG4gICAgICAgICAgICBob3VycyAtPSAxMjtcbiAgICAgICAgICAgIHBlcmlvZCA9ICdQTSc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhvdXJzID09PSAwKSB7XG4gICAgICAgICAgICBob3VycyA9IDEyO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dmFsID0gaG91cnMgKyAnOicgKyBwYWQobWludXRlcykgKyAnOicgKyBwYWQoc2Vjb25kcyk7XG5cbiAgICAgICAgaWYgKHVzZVBlcmlvZCA9PSB0cnVlKSB7XG4gICAgICAgICAgICByZXR2YWwgPSByZXR2YWwgKyAnICcgKyBwZXJpb2Q7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlcmlvZChkYXRlKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZGF0ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGRhdGUgPSBzdHJUb0RhdGUoZGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaG91cnMgPSBkYXRlLmdldEhvdXJzKCk7XG5cbiAgICAgICAgcmV0dXJuIGhvdXJzID4gMTEgPyAnUE0nIDogJ0FNJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0b0lTTyhkYXRlLCBpbmNsdWRlVFopIHtcbiAgICAgICAgdmFyXG4gICAgICAgICAgICBzdHIsXG4gICAgICAgICAgICBub3cgPSBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgdGhlbiA9IG5ldyBEYXRlKGRhdGUuZ2V0VGltZSgpKTtcbiAgICAgICAgdGhlbi5zZXRIb3Vycyhub3cuZ2V0SG91cnMoKSk7XG4gICAgICAgIHN0ciA9IHRoZW4udG9JU09TdHJpbmcoKTtcbiAgICAgICAgaWYgKCFpbmNsdWRlVFopIHtcbiAgICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnLicpWzBdO1xuICAgICAgICAgICAgc3RyICs9ICcuMDBaJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RyO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5hdHVyYWwoZGF0ZSkge1xuICAgICAgICBpZiAodHlwZW9mIGRhdGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBkYXRlID0gdGhpcy5mcm9tKGRhdGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyXG4gICAgICAgICAgICB5ZWFyID0gZGF0ZS5nZXRGdWxsWWVhcigpLnRvU3RyaW5nKCkuc3Vic3RyKDIpLFxuICAgICAgICAgICAgbW9udGggPSBkYXRlLmdldE1vbnRoKCkgKyAxLFxuICAgICAgICAgICAgZGF5ID0gZGF0ZS5nZXREYXRlKCksXG4gICAgICAgICAgICBob3VycyA9IGRhdGUuZ2V0SG91cnMoKSxcbiAgICAgICAgICAgIG1pbnV0ZXMgPSBkYXRlLmdldE1pbnV0ZXMoKSxcbiAgICAgICAgICAgIHBlcmlvZCA9ICdBTSc7XG5cbiAgICAgICAgaWYgKGhvdXJzID4gMTEpIHtcbiAgICAgICAgICAgIGhvdXJzIC09IDEyO1xuICAgICAgICAgICAgcGVyaW9kID0gJ1BNJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaG91cnMgPT09IDApIHtcbiAgICAgICAgICAgIGhvdXJzID0gMTI7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaG91cnMgKyAnOicgKyBwYWQobWludXRlcykgKyAnICcgKyBwZXJpb2QgKyAnIG9uICcgKyBwYWQobW9udGgpICsgJy8nICsgcGFkKGRheSkgKyAnLycgKyB5ZWFyO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZERheXMgKGRhdGUsIGRheXMpIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdhZGREYXlzIGlzIGRlcHJlY2F0ZWQuIEluc3RlYWQsIHVzZSBgYWRkYCcpO1xuICAgICAgICByZXR1cm4gYWRkKGRhdGUsIGRheXMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZCAoZGF0ZSwgYW1vdW50LCBkYXRlVHlwZSkge1xuICAgICAgICByZXR1cm4gc3VidHJhY3QoZGF0ZSwgLWFtb3VudCwgZGF0ZVR5cGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN1YnRyYWN0KGRhdGUsIGFtb3VudCwgZGF0ZVR5cGUpIHtcbiAgICAgICAgLy8gc3VidHJhY3QgTiBkYXlzIGZyb20gZGF0ZVxuICAgICAgICB2YXJcbiAgICAgICAgICAgIHRpbWUgPSBkYXRlLmdldFRpbWUoKSxcbiAgICAgICAgICAgIHRtcCA9IG5ldyBEYXRlKHRpbWUpO1xuXG4gICAgICAgIGlmKGRhdGVUeXBlID09PSAnbW9udGgnKXtcbiAgICAgICAgICAgIHRtcC5zZXRNb250aCh0bXAuZ2V0TW9udGgoKSAtIGFtb3VudCk7XG4gICAgICAgICAgICByZXR1cm4gdG1wO1xuICAgICAgICB9XG4gICAgICAgIGlmKGRhdGVUeXBlID09PSAneWVhcicpe1xuICAgICAgICAgICAgdG1wLnNldEZ1bGxZZWFyKHRtcC5nZXRGdWxsWWVhcigpIC0gYW1vdW50KTtcbiAgICAgICAgICAgIHJldHVybiB0bXA7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3IERhdGUodGltZSAtIGxlbmd0aC5kYXkgKiBhbW91bnQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN1YnRyYWN0RGF0ZShkYXRlMSwgZGF0ZTIsIGRhdGVUeXBlKSB7XG4gICAgICAgIC8vIGRhdGVUeXBlOiB3ZWVrLCBkYXksIGhyLCBtaW4sIHNlY1xuICAgICAgICAvLyBwYXN0IGRhdGVzIGhhdmUgYSBwb3NpdGl2ZSB2YWx1ZVxuICAgICAgICAvLyBmdXR1cmUgZGF0ZXMgaGF2ZSBhIG5lZ2F0aXZlIHZhbHVlXG5cbiAgICAgICAgdmFyIGRpdmlkZUJ5ID0ge1xuICAgICAgICAgICAgICAgIHdlZWs6IGxlbmd0aC53ZWVrLFxuICAgICAgICAgICAgICAgIGRheTogbGVuZ3RoLmRheSxcbiAgICAgICAgICAgICAgICBocjogbGVuZ3RoLmhyLFxuICAgICAgICAgICAgICAgIG1pbjogbGVuZ3RoLm1pbixcbiAgICAgICAgICAgICAgICBzZWM6IGxlbmd0aC5zZWNcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1dGMxID0gRGF0ZS5VVEMoZGF0ZTEuZ2V0RnVsbFllYXIoKSwgZGF0ZTEuZ2V0TW9udGgoKSwgZGF0ZTEuZ2V0RGF0ZSgpKSxcbiAgICAgICAgICAgIHV0YzIgPSBEYXRlLlVUQyhkYXRlMi5nZXRGdWxsWWVhcigpLCBkYXRlMi5nZXRNb250aCgpLCBkYXRlMi5nZXREYXRlKCkpO1xuXG4gICAgICAgIGRhdGVUeXBlID0gZGF0ZVR5cGUudG9Mb3dlckNhc2UoKTtcblxuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcigodXRjMiAtIHV0YzEpIC8gZGl2aWRlQnlbZGF0ZVR5cGVdKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0xlc3MgKGQxLCBkMikge1xuICAgICAgICBpZihpc1ZhbGlkT2JqZWN0KGQxKSAmJiBpc1ZhbGlkT2JqZWN0KGQyKSl7XG4gICAgICAgICAgICByZXR1cm4gZDEuZ2V0VGltZSgpIDwgZDIuZ2V0VGltZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0dyZWF0ZXIgKGQxLCBkMikge1xuICAgICAgICBpZihpc1ZhbGlkT2JqZWN0KGQxKSAmJiBpc1ZhbGlkT2JqZWN0KGQyKSl7XG4gICAgICAgICAgICByZXR1cm4gZDEuZ2V0VGltZSgpID4gZDIuZ2V0VGltZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaWZmKGRhdGUxLCBkYXRlMikge1xuICAgICAgICAvLyByZXR1cm4gdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiAyIGRhdGVzIGluIGRheXNcbiAgICAgICAgdmFyIHV0YzEgPSBEYXRlLlVUQyhkYXRlMS5nZXRGdWxsWWVhcigpLCBkYXRlMS5nZXRNb250aCgpLCBkYXRlMS5nZXREYXRlKCkpLFxuICAgICAgICAgICAgdXRjMiA9IERhdGUuVVRDKGRhdGUyLmdldEZ1bGxZZWFyKCksIGRhdGUyLmdldE1vbnRoKCksIGRhdGUyLmdldERhdGUoKSk7XG5cbiAgICAgICAgcmV0dXJuIE1hdGguYWJzKE1hdGguZmxvb3IoKHV0YzIgLSB1dGMxKSAvIGxlbmd0aC5kYXkpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb3B5IChkYXRlKSB7XG4gICAgICAgIGlmKGlzVmFsaWRPYmplY3QoZGF0ZSkpe1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlKGRhdGUuZ2V0VGltZSgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXROYXR1cmFsRGF5KGRhdGUsIGNvbXBhcmVEYXRlLCBub0RheXNPZldlZWspIHtcblxuICAgICAgICB2YXJcbiAgICAgICAgICAgIHRvZGF5ID0gY29tcGFyZURhdGUgfHwgbmV3IERhdGUoKSxcbiAgICAgICAgICAgIGRheXNBZ28gPSBzdWJ0cmFjdERhdGUoZGF0ZSwgdG9kYXksICdkYXknKTtcblxuICAgICAgICBpZiAoIWRheXNBZ28pIHtcbiAgICAgICAgICAgIHJldHVybiAnVG9kYXknO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXlzQWdvID09PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gJ1llc3RlcmRheSc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGF5c0FnbyA9PT0gLTEpIHtcbiAgICAgICAgICAgIHJldHVybiAnVG9tb3Jyb3cnO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRheXNBZ28gPCAtMSkge1xuICAgICAgICAgICAgcmV0dXJuIGZvcm1hdERhdGUoZGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gIW5vRGF5c09mV2VlayAmJiBkYXlzQWdvIDwgZGF5c09mV2Vlay5sZW5ndGggPyBkYXlzT2ZXZWVrW2RhdGUuZ2V0RGF5KCldIDogZm9ybWF0RGF0ZShkYXRlKTtcbiAgICB9XG5cbiAgICBkYXRlcyA9IHtcbiAgICAgICAgbW9udGhzOiB7XG4gICAgICAgICAgICBmdWxsOiBtb250aHMsXG4gICAgICAgICAgICBhYmJyOiBtb250aEFiYnIsXG4gICAgICAgICAgICBkaWN0OiBtb250aERpY3RcbiAgICAgICAgfSxcbiAgICAgICAgZGF5czoge1xuICAgICAgICAgICAgZnVsbDogZGF5c09mV2VlayxcbiAgICAgICAgICAgIGFiYnI6IGRheXMsXG4gICAgICAgICAgICBhYmJyMzogZGF5czMsXG4gICAgICAgICAgICBkaWN0OiBkYXlEaWN0XG4gICAgICAgIH0sXG4gICAgICAgIGxlbmd0aDogbGVuZ3RoLFxuICAgICAgICBzdWJ0cmFjdDogc3VidHJhY3QsXG4gICAgICAgIGFkZDogYWRkLFxuICAgICAgICBhZGREYXlzOiBhZGREYXlzLFxuICAgICAgICBkaWZmOiBkaWZmLFxuICAgICAgICBjb3B5OiBjb3B5LFxuICAgICAgICBjbG9uZTogY29weSxcbiAgICAgICAgaXNMZXNzOiBpc0xlc3MsXG4gICAgICAgIGlzR3JlYXRlcjogaXNHcmVhdGVyLFxuICAgICAgICB0b0lTTzogdG9JU08sXG4gICAgICAgIGlzVmFsaWRPYmplY3Q6IGlzVmFsaWRPYmplY3QsXG4gICAgICAgIGlzVmFsaWQ6IGlzRGF0ZVR5cGUsXG4gICAgICAgIGlzRGF0ZVR5cGU6IGlzRGF0ZVR5cGUsXG4gICAgICAgIGlzTGVhcFllYXI6IGlzTGVhcFllYXIsXG4gICAgICAgIGdldE1vbnRoSW5kZXg6IGdldE1vbnRoSW5kZXgsXG4gICAgICAgIGdldE1vbnRoTmFtZTogZ2V0TW9udGhOYW1lLFxuICAgICAgICBnZXRGaXJzdFN1bmRheTogZ2V0Rmlyc3RTdW5kYXksXG4gICAgICAgIGdldERheXNJbk1vbnRoOiBnZXREYXlzSW5Nb250aCxcbiAgICAgICAgZ2V0RGF5c0luUHJldk1vbnRoOiBnZXREYXlzSW5QcmV2TW9udGgsXG4gICAgICAgIGZvcm1hdERhdGU6IGZvcm1hdERhdGUsXG4gICAgICAgIGZvcm1hdFRpbWU6IGZvcm1hdFRpbWUsXG4gICAgICAgIHN0clRvRGF0ZTogc3RyVG9EYXRlLFxuICAgICAgICBzdWJ0cmFjdERhdGU6IHN1YnRyYWN0RGF0ZSxcbiAgICAgICAgZGF0ZVRvU3RyOiBkYXRlVG9TdHIsXG4gICAgICAgIHBlcmlvZDogcGVyaW9kLFxuICAgICAgICBuYXR1cmFsOiBuYXR1cmFsLFxuICAgICAgICBnZXROYXR1cmFsRGF5OiBnZXROYXR1cmFsRGF5LFxuICAgICAgICBwYWQ6IHBhZCxcbiAgICAgICAgdGltZXN0YW1wOiB7XG4gICAgICAgICAgICB0bzogZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXRlLmdldEZ1bGxZZWFyKCkgKyAnLScgKyBwYWQoZGF0ZS5nZXRNb250aCgpICsgMSkgKyAnLScgKyBwYWQoZGF0ZS5nZXREYXRlKCkpICsgJ1QnICtcbiAgICAgICAgICAgICAgICAgICAgcGFkKGRhdGUuZ2V0SG91cnMoKSkgKyAnOicgKyBwYWQoZGF0ZS5nZXRNaW51dGVzKCkpICsgJzonICsgcGFkKGRhdGUuZ2V0U2Vjb25kcygpKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmcm9tOiBmdW5jdGlvbihzdHIpIHtcbiAgICAgICAgICAgICAgICAvLyAyMDE1LTA1LTI2VDAwOjAwOjAwXG5cbiAgICAgICAgICAgICAgICAvLyBzdHJpcCB0aW1lem9uZSAvLyAyMDE1LTA1LTI2VDAwOjAwOjAwWlxuICAgICAgICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnWicpWzBdO1xuXG4gICAgICAgICAgICAgICAgLy8gW1wiMjAwMC0wMi0zMFQwMDowMDowMFwiLCBcIjIwMDBcIiwgXCIwMlwiLCBcIjMwXCIsIFwiMDBcIiwgXCIwMFwiLCBcIjAwXCIsIGluZGV4OiAwLCBpbnB1dDogXCIyMDAwLTAyLTMwVDAwOjAwOjAwXCJdXG4gICAgICAgICAgICAgICAgdmFyIHBhcnRzID0gdHNSZWdFeHAuZXhlYyhzdHIpO1xuICAgICAgICAgICAgICAgIC8vIFRPRE86IGRvIHdlIG5lZWQgYSB2YWxpZGF0aW9uP1xuICAgICAgICAgICAgICAgIGlmIChwYXJ0cykge1xuICAgICAgICAgICAgICAgICAgICAvLyBuZXcgRGF0ZSgxOTk1LCAxMSwgMTcsIDMsIDI0LCAwKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlKCtwYXJ0c1sxXSwgK3BhcnRzWzJdIC0gMSwgK3BhcnRzWzNdLCArcGFydHNbNF0sICtwYXJ0c1s1XSwgcGFyc2VJbnQocGFydHNbNl0sIDEwKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFRPRE86IHdoYXQgZG8gd2UgcmV0dXJuIGZvciBhbiBpbnZhbGlkIGRhdGU/IG51bGw/XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlKC0xKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpczogZnVuY3Rpb24oc3RyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRzUmVnRXhwLnRlc3Qoc3RyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gZGF0ZXM7XG5cbn0pKTsiLCJyZXF1aXJlKCcuL2RhdGUtcGlja2VyJyk7XG5jb25zdCBCYXNlQ29tcG9uZW50ID0gcmVxdWlyZSgnQmFzZUNvbXBvbmVudCcpO1xuY29uc3QgZGF0ZXMgPSByZXF1aXJlKCdkYXRlcycpO1xuXG5jb25zdCBkZWZhdWx0UGxhY2Vob2xkZXIgPSAnTU0vREQvWVlZWSc7XG5jb25zdCBkZWZhdWx0TWFzayA9ICdYWC9YWC9YWFhYJztcbmNvbnN0IHByb3BzID0gWydsYWJlbCcsICduYW1lJywgJ3R5cGUnLCAncGxhY2Vob2xkZXInLCAndmFsdWUnLCAnbWFzayddO1xuY29uc3QgYm9vbHMgPSBbXTtcblxuY2xhc3MgRGF0ZUlucHV0IGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG5cblx0c3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMgKCkge1xuXHRcdHJldHVybiBbLi4ucHJvcHMsIC4uLmJvb2xzXTtcblx0fVxuXG5cdGdldCBwcm9wcyAoKSB7XG5cdFx0cmV0dXJuIHByb3BzO1xuXHR9XG5cblx0Z2V0IGJvb2xzICgpIHtcblx0XHRyZXR1cm4gYm9vbHM7XG5cdH1cblxuXHRzZXQgdmFsdWUgKHZhbHVlKSB7XG5cdFx0Ly8gbWlnaHQgbmVlZCBhdHRyaWJ1dGVDaGFuZ2VkXG5cdFx0dGhpcy5zdHJEYXRlID0gZGF0ZXMuaXNEYXRlVHlwZSh2YWx1ZSkgPyB2YWx1ZSA6ICcnO1xuXHRcdG9uRG9tUmVhZHkodGhpcywgKCkgPT4ge1xuXHRcdFx0dGhpcy5zZXRWYWx1ZSh0aGlzLnN0ckRhdGUpO1xuXHRcdH0pO1xuXHR9XG5cblx0b25WYWx1ZSAodmFsdWUpIHtcblx0XHR0aGlzLnN0ckRhdGUgPSBkYXRlcy5pc0RhdGVUeXBlKHZhbHVlKSA/IHZhbHVlIDogJyc7XG5cdFx0dGhpcy5zZXRWYWx1ZSh0aGlzLnN0ckRhdGUpO1xuXHR9XG5cblx0Z2V0IHZhbHVlICgpIHtcblx0XHRyZXR1cm4gdGhpcy5zdHJEYXRlO1xuXHR9XG5cdFxuXHRnZXQgdGVtcGxhdGVTdHJpbmcgKCkge1xuXHRcdHJldHVybiBgXG48bGFiZWw+XG5cdDxzcGFuIHJlZj1cImxhYmVsTm9kZVwiPjwvc3Bhbj5cblx0PGlucHV0IHJlZj1cImlucHV0XCIgLz5cblx0XG48L2xhYmVsPlxuPGRhdGUtcGlja2VyIHJlZj1cInBpY2tlclwiIHRhYmluZGV4PVwiMFwiPjwvZGF0ZS1waWNrZXI+YDtcblx0fVxuXG5cdGNvbnN0cnVjdG9yICgpIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuc2hvd2luZyA9IGZhbHNlO1xuXHR9XG5cblx0c2V0VmFsdWUgKHZhbHVlKSB7XG5cdFx0dGhpcy50eXBlZFZhbHVlID0gdmFsdWU7XG5cdFx0dGhpcy5pbnB1dC52YWx1ZSA9IHZhbHVlO1xuXHRcdGNvbnN0IGxlbiA9IHRoaXMuaW5wdXQudmFsdWUubGVuZ3RoID09PSAxMDtcblx0XHRsZXQgdmFsaWQ7XG5cdFx0aWYgKGxlbikge1xuXHRcdFx0dmFsaWQgPSBkYXRlcy5pc1ZhbGlkKHZhbHVlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFsaWQgPSB0cnVlO1xuXHRcdH1cblx0XHRkb20uY2xhc3NMaXN0LnRvZ2dsZSh0aGlzLCAnaW52YWxpZCcsICF2YWxpZCk7XG5cdFx0aWYodmFsaWQgJiYgbGVuKXtcblx0XHRcdHRoaXMucGlja2VyLnZhbHVlID0gdmFsdWU7XG5cdFx0XHR0aGlzLmVtaXQoJ2NoYW5nZScsIHt2YWx1ZTogdmFsdWV9KTtcblx0XHR9XG5cdH1cblxuXHRmb3JtYXQgKHMpIHtcblx0XHRzID0gcy5yZXBsYWNlKC9cXEQvZywgJycpO1xuXHRcdGNvbnN0IG1hc2sgPSB0aGlzLm1hc2s7XG5cdFx0bGV0IGYgPSAnJztcblx0XHRjb25zdCBsZW4gPSBNYXRoLm1pbihzLmxlbmd0aCwgdGhpcy5tYXNrTGVuZ3RoKTtcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKXtcblx0XHRcdGlmKG1hc2tbZi5sZW5ndGhdICE9PSAnWCcpe1xuXHRcdFx0XHRmICs9IG1hc2tbZi5sZW5ndGhdO1xuXHRcdFx0fVxuXHRcdFx0ZiArPSBzW2ldO1xuXHRcdH1cblx0XHRyZXR1cm4gZjtcblx0fVxuXG5cdG9uS2V5IChlKSB7XG5cdFx0bGV0IHN0ciA9IHRoaXMudHlwZWRWYWx1ZSB8fCAnJztcblx0XHRjb25zdCBiZWcgPSBlLnRhcmdldC5zZWxlY3Rpb25TdGFydDtcblx0XHRjb25zdCBlbmQgPSBlLnRhcmdldC5zZWxlY3Rpb25FbmQ7XG5cdFx0Y29uc3QgayA9IGUua2V5O1xuXHRcdC8vY29uc29sZS5sb2coaywgJzonLCBiZWcsIGVuZCwgJy8nLCBzdHIubGVuZ3RoKTtcblx0XHRpZighaXNOdW0oaykpe1xuXHRcdFx0Ly8gaGFuZGxlIHBhc3RlLCBiYWNrc3BhY2Vcblx0XHRcdGlmKHRoaXMuaW5wdXQudmFsdWUgIT09IHRoaXMudHlwZWRWYWx1ZSkge1xuXHRcdFx0XHR0aGlzLnNldFZhbHVlKHRoaXMuaW5wdXQudmFsdWUpO1xuXHRcdFx0fVxuXHRcdFx0c3RvcEV2ZW50KGUpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRpZihzdHIubGVuZ3RoICE9PSBlbmQgfHwgYmVnICE9PSBlbmQpe1xuXHRcdFx0Ly8gaGFuZGxlIHNlbGVjdGlvbiBvciBtaWRkbGUtc3RyaW5nIGVkaXRcblx0XHRcdGNvbnN0IHRlbXAgPSB0aGlzLnR5cGVkVmFsdWUuc3Vic3RyaW5nKDAsIGJlZykgKyBrICsgdGhpcy50eXBlZFZhbHVlLnN1YnN0cmluZyhlbmQpO1xuXHRcdFx0dGhpcy5zZXRWYWx1ZSh0aGlzLmZvcm1hdCh0ZW1wKSk7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdzZWwnLCBlbmQpO1xuXHRcdFx0aWYoZW5kIC0gYmVnKSB7XG5cdFx0XHRcdGUudGFyZ2V0LnNlbGVjdGlvbkVuZCA9IGVuZCAtIChlbmQgLSBiZWcgLSAxKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGUudGFyZ2V0LnNlbGVjdGlvbkVuZCA9IGVuZCArIDE7XG5cdFx0XHR9XG5cdFx0XHRzdG9wRXZlbnQoZSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dGhpcy5zZXRWYWx1ZSh0aGlzLmZvcm1hdChzdHIgKyBrKSk7XG5cdH1cblxuXHRzaG93ICgpIHtcblx0XHRpZih0aGlzLnNob3dpbmcpe1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR0aGlzLnNob3dpbmcgPSB0cnVlO1xuXHRcdHRoaXMucGlja2VyLmNsYXNzTGlzdC5hZGQoJ3Nob3cnKTtcblxuXHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuXHRcdFx0Y29uc3Qgd2luID0gZG9tLmJveCh3aW5kb3cpO1xuXHRcdFx0Y29uc3QgYm94ID0gZG9tLmJveCh0aGlzLnBpY2tlcik7XG5cdFx0XHRpZihib3gueCArIGJveC53ID4gd2luLmgpe1xuXHRcdFx0XHR0aGlzLnBpY2tlci5jbGFzc0xpc3QuYWRkKCdyaWdodC1hbGlnbicpO1xuXHRcdFx0fVxuXHRcdFx0aWYoYm94LnkgKyBib3guaCA+IHdpbi5oKXtcblx0XHRcdFx0dGhpcy5waWNrZXIuY2xhc3NMaXN0LmFkZCgnYm90dG9tLWFsaWduJyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRoaWRlICgpIHtcblx0XHRpZighdGhpcy5zaG93aW5nIHx8IHdpbmRvdy5rZWVwUG9wdXBzT3Blbil7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHRoaXMuc2hvd2luZyA9IGZhbHNlO1xuXHRcdGRvbS5jbGFzc0xpc3QucmVtb3ZlKHRoaXMucGlja2VyLCAncmlnaHQtYWxpZ24gYm90dG9tLWFsaWduIHNob3cnKTtcblx0fVxuXG5cdGRvbVJlYWR5ICgpIHtcblx0XHRjb25zb2xlLmxvZygndGhpcy5tYXNrJywgdGhpcy5tYXNrKTtcblx0XHR0aGlzLm1hc2sgPSB0aGlzLm1hc2sgfHwgZGVmYXVsdE1hc2s7XG5cdFx0dGhpcy5tYXNrTGVuZ3RoID0gdGhpcy5tYXNrLm1hdGNoKC9YL2cpLmpvaW4oJycpLmxlbmd0aDtcblx0XHRjb25zb2xlLmxvZygndGhpcy5tYXNrJywgdGhpcy5tYXNrKTtcblx0XHR0aGlzLmxhYmVsTm9kZS5pbm5lckhUTUwgPSB0aGlzLmxhYmVsIHx8ICcnO1xuXHRcdHRoaXMuaW5wdXQuc2V0QXR0cmlidXRlKCd0eXBlJywgJ3RleHQnKTtcblx0XHR0aGlzLmlucHV0LnNldEF0dHJpYnV0ZSgncGxhY2Vob2xkZXInLCB0aGlzLnBsYWNlaG9sZGVyIHx8IGRlZmF1bHRQbGFjZWhvbGRlcik7XG5cdFx0dGhpcy5waWNrZXIub24oJ2NoYW5nZScsIChlKSA9PiB7XG5cdFx0XHR0aGlzLnNldFZhbHVlKGUudmFsdWUpO1xuXHRcdH0pO1xuXHRcdHRoaXMuY29ubmVjdEtleXMoKTtcblx0XHR0aGlzLnJlZ2lzdGVySGFuZGxlKGhhbmRsZU9wZW4odGhpcy5pbnB1dCwgdGhpcy5waWNrZXIsIHRoaXMuc2hvdy5iaW5kKHRoaXMpLCB0aGlzLmhpZGUuYmluZCh0aGlzKSkpO1xuXHR9XG5cblx0Y29ubmVjdEtleXMgKCkge1xuXHRcdHRoaXMub24odGhpcy5pbnB1dCwgJ2tleWRvd24nLCBzdG9wRXZlbnQpO1xuXHRcdHRoaXMub24odGhpcy5pbnB1dCwgJ2tleXByZXNzJywgc3RvcEV2ZW50KTtcblx0XHR0aGlzLm9uKHRoaXMuaW5wdXQsICdrZXl1cCcsIChlKSA9PiB7XG5cdFx0XHR0aGlzLm9uS2V5KGUpO1xuXHRcdH0pO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZU9wZW4gKGlucHV0LCBwaWNrZXIsIHNob3csIGhpZGUpIHtcblx0bGV0IGlucHV0Rm9jdXMgPSBmYWxzZTtcblx0bGV0IHBpY2tlckZvY3VzID0gZmFsc2U7XG5cdGNvbnN0IGRvY0hhbmRsZSA9IG9uKGRvY3VtZW50LCAna2V5dXAnLCAoZSkgPT4ge1xuXHRcdGlmKGUua2V5ID09PSAnRXNjYXBlJyl7XG5cdFx0XHRoaWRlKCk7XG5cdFx0fVxuXHR9KTtcblx0ZG9jSGFuZGxlLnBhdXNlKCk7XG5cdHJldHVybiBvbi5tYWtlTXVsdGlIYW5kbGUoW1xuXHRcdG9uKGlucHV0LCAnZm9jdXMnLCAoKSA9PiB7XG5cdFx0XHRpbnB1dEZvY3VzID0gdHJ1ZTtcblx0XHRcdHNob3coKTtcblx0XHRcdGRvY0hhbmRsZS5yZXN1bWUoKTtcblx0XHR9KSxcblx0XHRvbihpbnB1dCwgJ2JsdXInLCAoKSA9PiB7XG5cdFx0XHRpbnB1dEZvY3VzID0gZmFsc2U7XG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0aWYoIXBpY2tlckZvY3VzKXtcblx0XHRcdFx0XHRoaWRlKCk7XG5cdFx0XHRcdFx0ZG9jSGFuZGxlLnBhdXNlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sIDEwMCk7XG5cdFx0fSksXG5cdFx0b24ocGlja2VyLCAnZm9jdXMnLCAoKSA9PiB7XG5cdFx0XHRwaWNrZXJGb2N1cyA9IHRydWU7XG5cdFx0XHRzaG93KCk7XG5cdFx0XHRkb2NIYW5kbGUucmVzdW1lKCk7XG5cdFx0fSksXG5cdFx0b24ocGlja2VyLCAnYmx1cicsICgpID0+IHtcblx0XHRcdHBpY2tlckZvY3VzID0gZmFsc2U7XG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0aWYoIWlucHV0Rm9jdXMpe1xuXHRcdFx0XHRcdGhpZGUoKTtcblx0XHRcdFx0XHRkb2NIYW5kbGUucGF1c2UoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSwgMTAwKTtcblxuXHRcdH0pXG5cdF0pO1xufVxuXG5jb25zdCBudW1SZWcgPSAvWzAxMjM0NTY3ODldLztcbmZ1bmN0aW9uIGlzTnVtIChrKSB7XG5cdHJldHVybiBudW1SZWcudGVzdChrKTtcbn1cblxuY29uc3QgY29udHJvbCA9IHtcblx0J0VudGVyJzogMSxcblx0J0JhY2tzcGFjZSc6IDEsXG5cdCdEZWxldGUnOiAxLFxuXHQnQXJyb3dMZWZ0JzogMSxcblx0J0Fycm93UmlnaHQnOiAxLFxuXHQnRXNjYXBlJzogMSxcblx0J0NvbW1hbmQnOiAxLFxuXHQnVGFiJzogMVxufTtcbmZ1bmN0aW9uIHN0b3BFdmVudCAoZSkge1xuXHRpZihlLm1ldGFLZXkgfHwgY29udHJvbFtlLmtleV0pe1xuXHRcdHJldHVybjtcblx0fVxuXHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnZGF0ZS1pbnB1dCcsIERhdGVJbnB1dCk7XG5cbm1vZHVsZS5leHBvcnRzID0gRGF0ZUlucHV0OyIsInJlcXVpcmUoJ0Jhc2VDb21wb25lbnQvc3JjL3Byb3BlcnRpZXMnKTtcbnJlcXVpcmUoJ0Jhc2VDb21wb25lbnQvc3JjL3RlbXBsYXRlJyk7XG5yZXF1aXJlKCdCYXNlQ29tcG9uZW50L3NyYy9yZWZzJyk7XG5jb25zdCBCYXNlQ29tcG9uZW50ID0gcmVxdWlyZSgnQmFzZUNvbXBvbmVudCcpO1xuY29uc3QgZGF0ZXMgPSByZXF1aXJlKCdkYXRlcycpO1xuXG5jb25zdCBwcm9wcyA9IFtdO1xuXG4vLyByYW5nZS1sZWZ0L3JhbmdlLXJpZ2h0IG1lYW4gdGhhdCB0aGlzIGlzIG9uZSBzaWRlIG9mIGEgZGF0ZS1yYW5nZS1waWNrZXJcbmNvbnN0IGJvb2xzID0gWydyYW5nZS1waWNrZXInLCAncmFuZ2UtbGVmdCcsICdyYW5nZS1yaWdodCddO1xuXG5jbGFzcyBEYXRlUGlja2VyIGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG5cblx0c3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMgKCkge1xuXHRcdHJldHVybiBbLi4ucHJvcHMsIC4uLmJvb2xzXTtcblx0fVxuXG5cdGdldCBwcm9wcyAoKSB7XG5cdFx0cmV0dXJuIHByb3BzO1xuXHR9XG5cblx0Z2V0IGJvb2xzICgpIHtcblx0XHRyZXR1cm4gYm9vbHM7XG5cdH1cblxuXHRnZXQgdGVtcGxhdGVTdHJpbmcgKCkge1xuXHRcdHJldHVybiBgXG48ZGl2IGNsYXNzPVwiY2FsZW5kYXJcIiByZWY9XCJjYWxOb2RlXCI+XG48ZGl2IGNsYXNzPVwiY2FsLWhlYWRlclwiIHJlZj1cImhlYWRlck5vZGVcIj5cblx0PHNwYW4gY2xhc3M9XCJjYWwtbGZ0XCIgcmVmPVwibGZ0Tm9kZVwiPjwvc3Bhbj5cblx0PHNwYW4gY2xhc3M9XCJjYWwtbW9udGhcIiByZWY9XCJtb250aE5vZGVcIj48L3NwYW4+XG5cdDxzcGFuIGNsYXNzPVwiY2FsLXJndFwiIHJlZj1cInJndE5vZGVcIj48L3NwYW4+XG48L2Rpdj5cbjxkaXYgY2xhc3M9XCJjYWwtY29udGFpbmVyXCIgcmVmPVwiY29udGFpbmVyXCI+PC9kaXY+XG48ZGl2IGNsYXNzPVwiY2FsLWZvb3RlclwiPlxuXHQ8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApO1wiIHJlZj1cImZvb3RlckxpbmtcIj48L2E+XG48L2Rpdj5cbjwvZGl2PmA7XG5cdH1cblxuXHRzZXQgdmFsdWUgKHZhbHVlKSB7XG5cdFx0Ly8gbWlnaHQgbmVlZCBhdHRyaWJ1dGVDaGFuZ2VkXG5cdFx0dGhpcy52YWx1ZURhdGUgPSBkYXRlcy5pc0RhdGVUeXBlKHZhbHVlKSA/IGRhdGVzLnN0clRvRGF0ZSh2YWx1ZSkgOiB0b2RheTtcblx0XHR0aGlzLmN1cnJlbnQgPSB0aGlzLnZhbHVlRGF0ZTtcblx0XHRvbkRvbVJlYWR5KHRoaXMsICgpID0+IHtcblx0XHRcdHRoaXMucmVuZGVyKCk7XG5cdFx0fSk7XG5cdH1cblxuXHRnZXQgdmFsdWUgKCkge1xuXHRcdGlmICghdGhpcy52YWx1ZURhdGUpIHtcblx0XHRcdGNvbnN0IHZhbHVlID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJykgfHwgdG9kYXk7XG5cdFx0XHR0aGlzLnZhbHVlRGF0ZSA9IGRhdGVzLnN0clRvRGF0ZSh2YWx1ZSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLnZhbHVlRGF0ZTtcblx0fVxuXG5cdGNvbnN0cnVjdG9yICgpIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuY3VycmVudCA9IG5ldyBEYXRlKCk7XG5cdFx0dGhpcy5wcmV2aW91cyA9IHt9O1xuXHRcdHRoaXMubW9kZXMgPSBbJ21vbnRoJywgJ3llYXInLCAnZGVjYWRlJ107XG5cdFx0dGhpcy5tb2RlID0gMDtcblx0fVxuXG5cdHNldERpc3BsYXkgKC4uLmFyZ3MvKnllYXIsIG1vbnRoKi8pIHtcblx0XHRpZiAoYXJncy5sZW5ndGggPT09IDIpIHtcblx0XHRcdHRoaXMuY3VycmVudC5zZXRGdWxsWWVhcihhcmdzWzBdKTtcblx0XHRcdHRoaXMuY3VycmVudC5zZXRNb250aChhcmdzWzFdKTtcblx0XHR9IGVsc2UgaWYgKHR5cGVvZiBhcmdzWzBdID09PSAnb2JqZWN0Jykge1xuXHRcdFx0dGhpcy5jdXJyZW50LnNldEZ1bGxZZWFyKGFyZ3NbMF0uZ2V0RnVsbFllYXIoKSk7XG5cdFx0XHR0aGlzLmN1cnJlbnQuc2V0TW9udGgoYXJnc1swXS5nZXRNb250aCgpKTtcblx0XHR9IGVsc2UgaWYgKGFyZ3NbMF0gPiAxMikge1xuXHRcdFx0dGhpcy5jdXJyZW50LnNldEZ1bGxZZWFyKGFyZ3NbMF0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLmN1cnJlbnQuc2V0TW9udGgoYXJnc1swXSk7XG5cdFx0fVxuXHRcdHRoaXMudmFsdWVEYXRlID0gY29weSh0aGlzLmN1cnJlbnQpO1xuXHRcdHRoaXMubm9FdmVudHMgPSB0cnVlO1xuXHRcdHRoaXMucmVuZGVyKCk7XG5cdH1cblxuXHRnZXRGb3JtYXR0ZWRWYWx1ZSAoKSB7XG5cdFx0cmV0dXJuIHRoaXMudmFsdWVEYXRlID09PSB0b2RheSA/ICcnIDogISF0aGlzLnZhbHVlRGF0ZSA/IGRhdGVzLmRhdGVUb1N0cih0aGlzLnZhbHVlRGF0ZSkgOiAnJztcblx0fVxuXG5cdGVtaXRWYWx1ZSAoKSB7XG5cdFx0Y29uc3QgZXZlbnQgPSB7XG5cdFx0XHR2YWx1ZTogdGhpcy5nZXRGb3JtYXR0ZWRWYWx1ZSgpLFxuXHRcdFx0ZGF0ZTogdGhpcy52YWx1ZURhdGVcblx0XHR9O1xuXHRcdGlmICh0aGlzWydyYW5nZS1waWNrZXInXSkge1xuXHRcdFx0ZXZlbnQuZmlyc3QgPSB0aGlzLmZpcnN0UmFuZ2U7XG5cdFx0XHRldmVudC5zZWNvbmQgPSB0aGlzLnNlY29uZFJhbmdlO1xuXHRcdH1cblx0XHR0aGlzLmVtaXQoJ2NoYW5nZScsIGV2ZW50KTtcblx0fVxuXG5cdGVtaXREaXNwbGF5RXZlbnRzICgpIHtcblx0XHRjb25zdCBtb250aCA9IHRoaXMuY3VycmVudC5nZXRNb250aCgpLFxuXHRcdFx0eWVhciA9IHRoaXMuY3VycmVudC5nZXRGdWxsWWVhcigpO1xuXG5cdFx0aWYgKCF0aGlzLm5vRXZlbnRzICYmIChtb250aCAhPT0gdGhpcy5wcmV2aW91cy5tb250aCB8fCB5ZWFyICE9PSB0aGlzLnByZXZpb3VzLnllYXIpKSB7XG5cdFx0XHR0aGlzLmZpcmUoJ2Rpc3BsYXktY2hhbmdlJywgeyBtb250aDogbW9udGgsIHllYXI6IHllYXIgfSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5ub0V2ZW50cyA9IGZhbHNlO1xuXHRcdHRoaXMucHJldmlvdXMgPSB7XG5cdFx0XHRtb250aDogbW9udGgsXG5cdFx0XHR5ZWFyOiB5ZWFyXG5cdFx0fTtcblx0fVxuXG5cdG9uQ2xpY2tEYXkgKG5vZGUpIHtcblx0XHRjb25zdFxuXHRcdFx0ZGF5ID0gK25vZGUuaW5uZXJIVE1MLFxuXHRcdFx0aXNGdXR1cmUgPSBub2RlLmNsYXNzTGlzdC5jb250YWlucygnZnV0dXJlJyksXG5cdFx0XHRpc1Bhc3QgPSBub2RlLmNsYXNzTGlzdC5jb250YWlucygncGFzdCcpO1xuXG5cdFx0dGhpcy5jdXJyZW50LnNldERhdGUoZGF5KTtcblx0XHRpZiAoaXNGdXR1cmUpIHtcblx0XHRcdHRoaXMuY3VycmVudC5zZXRNb250aCh0aGlzLmN1cnJlbnQuZ2V0TW9udGgoKSArIDEpO1xuXHRcdH1cblx0XHRpZiAoaXNQYXN0KSB7XG5cdFx0XHR0aGlzLmN1cnJlbnQuc2V0TW9udGgodGhpcy5jdXJyZW50LmdldE1vbnRoKCkgLSAxKTtcblx0XHR9XG5cblx0XHR0aGlzLnZhbHVlRGF0ZSA9IGNvcHkodGhpcy5jdXJyZW50KTtcblxuXHRcdHRoaXMuZW1pdFZhbHVlKCk7XG5cblx0XHRpZiAodGhpc1sncmFuZ2UtcGlja2VyJ10pIHtcblx0XHRcdHRoaXMuY2xpY2tTZWxlY3RSYW5nZSgpO1xuXHRcdH1cblxuXHRcdGlmIChpc0Z1dHVyZSB8fCBpc1Bhc3QpIHtcblx0XHRcdHRoaXMucmVuZGVyKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuc2VsZWN0RGF5KCk7XG5cdFx0fVxuXHR9XG5cblx0b25DbGlja01vbnRoIChkaXJlY3Rpb24pIHtcblx0XHRzd2l0Y2ggKHRoaXMubW9kZSkge1xuXHRcdFx0Y2FzZSAxOiAvLyB5ZWFyIG1vZGVcblx0XHRcdFx0dGhpcy5jdXJyZW50LnNldEZ1bGxZZWFyKHRoaXMuY3VycmVudC5nZXRGdWxsWWVhcigpICsgKGRpcmVjdGlvbiAqIDEpKTtcblx0XHRcdFx0dGhpcy5zZXRNb2RlKHRoaXMubW9kZSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAyOiAvLyBjZW50dXJ5IG1vZGVcblx0XHRcdFx0dGhpcy5jdXJyZW50LnNldEZ1bGxZZWFyKHRoaXMuY3VycmVudC5nZXRGdWxsWWVhcigpICsgKGRpcmVjdGlvbiAqIDEyKSk7XG5cdFx0XHRcdHRoaXMuc2V0TW9kZSh0aGlzLm1vZGUpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHRoaXMuY3VycmVudC5zZXRNb250aCh0aGlzLmN1cnJlbnQuZ2V0TW9udGgoKSArIChkaXJlY3Rpb24gKiAxKSk7XG5cdFx0XHRcdHRoaXMucmVuZGVyKCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxuXG5cdG9uQ2xpY2tZZWFyIChub2RlKSB7XG5cdFx0Y29uc3QgaW5kZXggPSBkYXRlcy5nZXRNb250aEluZGV4KG5vZGUuaW5uZXJIVE1MKTtcblx0XHR0aGlzLmN1cnJlbnQuc2V0TW9udGgoaW5kZXgpO1xuXHRcdHRoaXMucmVuZGVyKCk7XG5cdH1cblxuXHRvbkNsaWNrRGVjYWRlIChub2RlKSB7XG5cdFx0Y29uc3QgeWVhciA9ICtub2RlLmlubmVySFRNTDtcblx0XHR0aGlzLmN1cnJlbnQuc2V0RnVsbFllYXIoeWVhcik7XG5cdFx0dGhpcy5zZXRNb2RlKHRoaXMubW9kZSAtIDEpO1xuXHR9XG5cblx0c2V0TW9kZSAobW9kZSkge1xuXHRcdGRlc3Ryb3kodGhpcy5tb2RlTm9kZSk7XG5cdFx0dGhpcy5tb2RlID0gbW9kZSB8fCAwO1xuXHRcdHN3aXRjaCAodGhpcy5tb2Rlc1t0aGlzLm1vZGVdKSB7XG5cdFx0XHRjYXNlICdtb250aCc6XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAneWVhcic6XG5cdFx0XHRcdHRoaXMuc2V0WWVhck1vZGUoKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdkZWNhZGUnOlxuXHRcdFx0XHR0aGlzLnNldERlY2FkZU1vZGUoKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9XG5cblx0c2V0WWVhck1vZGUgKCkge1xuXHRcdGRlc3Ryb3kodGhpcy5ib2R5Tm9kZSk7XG5cblx0XHRsZXQgaTtcblx0XHRjb25zdCBub2RlID0gZG9tKCdkaXYnLCB7IGNsYXNzOiAnY2FsLWJvZHkgeWVhcicgfSk7XG5cblx0XHRmb3IgKGkgPSAwOyBpIDwgMTI7IGkrKykge1xuXHRcdFx0ZG9tKCdkaXYnLCB7IGh0bWw6IGRhdGVzLm1vbnRocy5hYmJyW2ldLCBjbGFzczogJ3llYXInIH0sIG5vZGUpO1xuXHRcdH1cblxuXHRcdHRoaXMubW9udGhOb2RlLmlubmVySFRNTCA9IHRoaXMuY3VycmVudC5nZXRGdWxsWWVhcigpO1xuXHRcdHRoaXMuY29udGFpbmVyLmFwcGVuZENoaWxkKG5vZGUpO1xuXHRcdHRoaXMubW9kZU5vZGUgPSBub2RlO1xuXHR9XG5cblx0c2V0RGVjYWRlTW9kZSAoKSB7XG5cdFx0bGV0IGk7XG5cdFx0Y29uc3Qgbm9kZSA9IGRvbSgnZGl2JywgeyBjbGFzczogJ2NhbC1ib2R5IGRlY2FkZScgfSk7XG5cdFx0bGV0IHllYXIgPSB0aGlzLmN1cnJlbnQuZ2V0RnVsbFllYXIoKSAtIDY7XG5cblx0XHRmb3IgKGkgPSAwOyBpIDwgMTI7IGkrKykge1xuXHRcdFx0ZG9tKCdkaXYnLCB7IGh0bWw6IHllYXIsIGNsYXNzOiAnZGVjYWRlJyB9LCBub2RlKTtcblx0XHRcdHllYXIgKz0gMTtcblx0XHR9XG5cdFx0dGhpcy5tb250aE5vZGUuaW5uZXJIVE1MID0gKHllYXIgLSAxMikgKyAnLScgKyAoeWVhciAtIDEpO1xuXHRcdHRoaXMuY29udGFpbmVyLmFwcGVuZENoaWxkKG5vZGUpO1xuXHRcdHRoaXMubW9kZU5vZGUgPSBub2RlO1xuXHR9XG5cblx0c2VsZWN0RGF5ICgpIHtcblx0XHRpZiAodGhpc1sncmFuZ2UtcGlja2VyJ10pIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y29uc3Qgbm93ID0gdGhpcy5xdWVyeVNlbGVjdG9yKCcuYXktc2VsZWN0ZWQnKTtcblx0XHRjb25zdCBub2RlID0gdGhpcy5kYXlNYXBbdGhpcy5jdXJyZW50LmdldERhdGUoKV07XG5cdFx0aWYgKG5vdykge1xuXHRcdFx0bm93LmNsYXNzTGlzdC5yZW1vdmUoJ2F5LXNlbGVjdGVkJyk7XG5cdFx0fVxuXHRcdG5vZGUuY2xhc3NMaXN0LmFkZCgnYXktc2VsZWN0ZWQnKTtcblxuXHR9XG5cblx0Y2xlYXJSYW5nZSAoKSB7XG5cdFx0dGhpcy5ob3ZlckRhdGUgPSAwO1xuXHRcdHRoaXMuc2V0UmFuZ2UobnVsbCwgbnVsbCk7XG5cdH1cblxuXHRzZXRSYW5nZSAoZmlyc3RSYW5nZSwgc2Vjb25kUmFuZ2UpIHtcblx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBmaXJzdFJhbmdlO1xuXHRcdHRoaXMuc2Vjb25kUmFuZ2UgPSBzZWNvbmRSYW5nZTtcblx0XHR0aGlzLmRpc3BsYXlSYW5nZSgpO1xuXHRcdHRoaXMuc2V0UmFuZ2VFbmRQb2ludHMoKTtcblx0fVxuXG5cdGNsaWNrU2VsZWN0UmFuZ2UgKCkge1xuXHRcdGNvbnN0XG5cdFx0XHRwcmV2Rmlyc3QgPSAhIXRoaXMuZmlyc3RSYW5nZSxcblx0XHRcdHByZXZTZWNvbmQgPSAhIXRoaXMuc2Vjb25kUmFuZ2UsXG5cdFx0XHRyYW5nZURhdGUgPSBjb3B5KHRoaXMuY3VycmVudCk7XG5cblx0XHRpZiAodGhpcy5pc093bmVkKSB7XG5cdFx0XHR0aGlzLmZpcmUoJ3NlbGVjdC1yYW5nZScsIHtcblx0XHRcdFx0Zmlyc3Q6IHRoaXMuZmlyc3RSYW5nZSxcblx0XHRcdFx0c2Vjb25kOiB0aGlzLnNlY29uZFJhbmdlLFxuXHRcdFx0XHRjdXJyZW50OiByYW5nZURhdGVcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRpZiAodGhpcy5zZWNvbmRSYW5nZSkge1xuXHRcdFx0dGhpcy5maXJlKCdyZXNldC1yYW5nZScpO1xuXHRcdFx0dGhpcy5maXJzdFJhbmdlID0gbnVsbDtcblx0XHRcdHRoaXMuc2Vjb25kUmFuZ2UgPSBudWxsO1xuXHRcdH1cblx0XHRpZiAodGhpcy5maXJzdFJhbmdlICYmIHRoaXMuaXNWYWxpZFJhbmdlKHJhbmdlRGF0ZSkpIHtcblx0XHRcdHRoaXMuc2Vjb25kUmFuZ2UgPSByYW5nZURhdGU7XG5cdFx0XHR0aGlzLmhvdmVyRGF0ZSA9IDA7XG5cdFx0XHR0aGlzLnNldFJhbmdlKHRoaXMuZmlyc3RSYW5nZSwgdGhpcy5zZWNvbmRSYW5nZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuZmlyc3RSYW5nZSA9IG51bGw7XG5cdFx0fVxuXHRcdGlmICghdGhpcy5maXJzdFJhbmdlKSB7XG5cdFx0XHR0aGlzLmhvdmVyRGF0ZSA9IDA7XG5cdFx0XHR0aGlzLnNldFJhbmdlKHJhbmdlRGF0ZSwgbnVsbCk7XG5cdFx0fVxuXHRcdHRoaXMuZmlyZSgnc2VsZWN0LXJhbmdlJywge1xuXHRcdFx0Zmlyc3Q6IHRoaXMuZmlyc3RSYW5nZSxcblx0XHRcdHNlY29uZDogdGhpcy5zZWNvbmRSYW5nZSxcblx0XHRcdHByZXZGaXJzdDogcHJldkZpcnN0LFxuXHRcdFx0cHJldlNlY29uZDogcHJldlNlY29uZFxuXHRcdH0pO1xuXHR9XG5cblx0aG92ZXJTZWxlY3RSYW5nZSAoZSkge1xuXHRcdGlmICh0aGlzLmZpcnN0UmFuZ2UgJiYgIXRoaXMuc2Vjb25kUmFuZ2UgJiYgZS50YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKCdvbicpKSB7XG5cdFx0XHR0aGlzLmhvdmVyRGF0ZSA9IGUudGFyZ2V0Ll9kYXRlO1xuXHRcdFx0dGhpcy5kaXNwbGF5UmFuZ2UoKTtcblx0XHR9XG5cdH1cblxuXHRkaXNwbGF5UmFuZ2VUb0VuZCAoKSB7XG5cdFx0aWYgKHRoaXMuZmlyc3RSYW5nZSkge1xuXHRcdFx0dGhpcy5ob3ZlckRhdGUgPSBjb3B5KHRoaXMuY3VycmVudCk7XG5cdFx0XHR0aGlzLmhvdmVyRGF0ZS5zZXRNb250aCh0aGlzLmhvdmVyRGF0ZS5nZXRNb250aCgpICsgMSk7XG5cdFx0XHR0aGlzLmRpc3BsYXlSYW5nZSgpO1xuXHRcdH1cblx0fVxuXG5cdGRpc3BsYXlSYW5nZSAoKSB7XG5cdFx0bGV0IGJlZyA9IHRoaXMuZmlyc3RSYW5nZTtcblx0XHRsZXQgZW5kID0gdGhpcy5zZWNvbmRSYW5nZSA/IHRoaXMuc2Vjb25kUmFuZ2UuZ2V0VGltZSgpIDogdGhpcy5ob3ZlckRhdGU7XG5cdFx0Y29uc3QgbWFwID0gdGhpcy5kYXlNYXA7XG5cdFx0aWYgKCFiZWcgfHwgIWVuZCkge1xuXHRcdFx0T2JqZWN0LmtleXMobWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXksIGkpIHtcblx0XHRcdFx0bWFwW2tleV0uY2xhc3NMaXN0LnJlbW92ZSgnYXktcmFuZ2UnKTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRiZWcgPSBiZWcuZ2V0VGltZSgpO1xuXHRcdFx0T2JqZWN0LmtleXMobWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXksIGkpIHtcblx0XHRcdFx0aWYgKGluUmFuZ2UobWFwW2tleV0uX2RhdGUsIGJlZywgZW5kKSkge1xuXHRcdFx0XHRcdG1hcFtrZXldLmNsYXNzTGlzdC5hZGQoJ2F5LXJhbmdlJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0bWFwW2tleV0uY2xhc3NMaXN0LnJlbW92ZSgnYXktcmFuZ2UnKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cblx0aGFzUmFuZ2UgKCkge1xuXHRcdHJldHVybiAhIXRoaXMuZmlyc3RSYW5nZSAmJiAhIXRoaXMuc2Vjb25kUmFuZ2U7XG5cdH1cblxuXHRpc1ZhbGlkUmFuZ2UgKGRhdGUpIHtcblx0XHRpZiAoIXRoaXMuZmlyc3RSYW5nZSkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdHJldHVybiBkYXRlLmdldFRpbWUoKSA+IHRoaXMuZmlyc3RSYW5nZS5nZXRUaW1lKCk7XG5cdH1cblxuXHRzZXRSYW5nZUVuZFBvaW50cyAoKSB7XG5cdFx0dGhpcy5jbGVhckVuZFBvaW50cygpO1xuXHRcdGlmICh0aGlzLmZpcnN0UmFuZ2UpIHtcblx0XHRcdGlmICh0aGlzLmZpcnN0UmFuZ2UuZ2V0TW9udGgoKSA9PT0gdGhpcy5jdXJyZW50LmdldE1vbnRoKCkpIHtcblx0XHRcdFx0dGhpcy5kYXlNYXBbdGhpcy5maXJzdFJhbmdlLmdldERhdGUoKV0uY2xhc3NMaXN0LmFkZCgnYXktcmFuZ2UtZmlyc3QnKTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLnNlY29uZFJhbmdlICYmIHRoaXMuc2Vjb25kUmFuZ2UuZ2V0TW9udGgoKSA9PT0gdGhpcy5jdXJyZW50LmdldE1vbnRoKCkpIHtcblx0XHRcdFx0dGhpcy5kYXlNYXBbdGhpcy5zZWNvbmRSYW5nZS5nZXREYXRlKCldLmNsYXNzTGlzdC5hZGQoJ2F5LXJhbmdlLXNlY29uZCcpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGNsZWFyRW5kUG9pbnRzICgpIHtcblx0XHRjb25zdCBmaXJzdCA9IHRoaXMucXVlcnlTZWxlY3RvcignLmF5LXJhbmdlLWZpcnN0JyksXG5cdFx0XHRzZWNvbmQgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5heS1yYW5nZS1zZWNvbmQnKTtcblx0XHRpZiAoZmlyc3QpIHtcblx0XHRcdGZpcnN0LmNsYXNzTGlzdC5yZW1vdmUoJ2F5LXJhbmdlLWZpcnN0Jyk7XG5cdFx0fVxuXHRcdGlmIChzZWNvbmQpIHtcblx0XHRcdHNlY29uZC5jbGFzc0xpc3QucmVtb3ZlKCdheS1yYW5nZS1zZWNvbmQnKTtcblx0XHR9XG5cdH1cblxuXHRkb21SZWFkeSAoKSB7XG5cdFx0aWYgKHRoaXNbJ3JhbmdlLWxlZnQnXSkge1xuXHRcdFx0dGhpcy5yZ3ROb2RlLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG5cdFx0XHR0aGlzWydyYW5nZS1waWNrZXInXSA9IHRydWU7XG5cdFx0XHR0aGlzLmlzT3duZWQgPSB0cnVlO1xuXHRcdH1cblx0XHRpZiAodGhpc1sncmFuZ2UtcmlnaHQnXSkge1xuXHRcdFx0dGhpcy5sZnROb2RlLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG5cdFx0XHR0aGlzWydyYW5nZS1waWNrZXInXSA9IHRydWU7XG5cdFx0XHR0aGlzLmlzT3duZWQgPSB0cnVlO1xuXHRcdH1cblx0XHRpZiAodGhpcy5pc093bmVkKSB7XG5cdFx0XHR0aGlzLmNsYXNzTGlzdC5hZGQoJ21pbmltYWwnKTtcblx0XHR9XG5cblx0XHR0aGlzLmN1cnJlbnQgPSBjb3B5KHRoaXMudmFsdWUpO1xuXG5cdFx0dGhpcy5jb25uZWN0KCk7XG5cdFx0dGhpcy5yZW5kZXIoKTtcblx0fVxuXG5cdHJlbmRlciAoKSB7XG5cdFx0Ly8gZGF0ZU51bSBpbmNyZW1lbnRzLCBzdGFydGluZyB3aXRoIHRoZSBmaXJzdCBTdW5kYXlcblx0XHQvLyBzaG93aW5nIG9uIHRoZSBtb250aGx5IGNhbGVuZGFyLiBUaGlzIGlzIHVzdWFsbHkgdGhlXG5cdFx0Ly8gcHJldmlvdXMgbW9udGgsIHNvIGRhdGVOdW0gd2lsbCBzdGFydCBhcyBhIG5lZ2F0aXZlIG51bWJlclxuXHRcdHRoaXMuc2V0TW9kZSgwKTtcblx0XHRpZiAodGhpcy5ib2R5Tm9kZSkge1xuXHRcdFx0ZG9tLmRlc3Ryb3kodGhpcy5ib2R5Tm9kZSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5kYXlNYXAgPSB7fTtcblxuXHRcdGxldFxuXHRcdFx0bm9kZSA9IGRvbSgnZGl2JywgeyBjbGFzczogJ2NhbC1ib2R5JyB9KSxcblx0XHRcdGksIHR4LCBuZXh0TW9udGggPSAwLCBpc1RoaXNNb250aCwgZGF5LCBjc3MsXG5cdFx0XHR0b2RheSA9IG5ldyBEYXRlKCksXG5cdFx0XHRpc1JhbmdlID0gdGhpc1sncmFuZ2UtcGlja2VyJ10sXG5cdFx0XHRkID0gdGhpcy5jdXJyZW50LFxuXHRcdFx0aW5jRGF0ZSA9IGNvcHkoZCksXG5cdFx0XHRkYXlzSW5QcmV2TW9udGggPSBkYXRlcy5nZXREYXlzSW5QcmV2TW9udGgoZCksXG5cdFx0XHRkYXlzSW5Nb250aCA9IGRhdGVzLmdldERheXNJbk1vbnRoKGQpLFxuXHRcdFx0ZGF0ZU51bSA9IGRhdGVzLmdldEZpcnN0U3VuZGF5KGQpLFxuXHRcdFx0ZGF0ZVRvZGF5ID0gZ2V0U2VsZWN0ZWREYXRlKHRvZGF5LCBkKSxcblx0XHRcdGRhdGVTZWxlY3RlZCA9IGdldFNlbGVjdGVkRGF0ZSh0aGlzLnZhbHVlRGF0ZSwgZCk7XG5cblx0XHR0aGlzLm1vbnRoTm9kZS5pbm5lckhUTUwgPSBkYXRlcy5nZXRNb250aE5hbWUoZCkgKyAnICcgKyBkLmdldEZ1bGxZZWFyKCk7XG5cblx0XHRmb3IgKGkgPSAwOyBpIDwgNzsgaSsrKSB7XG5cdFx0XHRkb20oXCJkaXZcIiwgeyBodG1sOiBkYXRlcy5kYXlzLmFiYnJbaV0sIGNsYXNzOiAnZGF5LW9mLXdlZWsnIH0sIG5vZGUpO1xuXHRcdH1cblxuXHRcdGZvciAoaSA9IDA7IGkgPCA0MjsgaSsrKSB7XG5cdFx0XHR0eCA9IGRhdGVOdW0gKyAxID4gMCAmJiBkYXRlTnVtICsgMSA8PSBkYXlzSW5Nb250aCA/IGRhdGVOdW0gKyAxIDogXCImbmJzcDtcIjtcblxuXHRcdFx0aXNUaGlzTW9udGggPSBmYWxzZTtcblx0XHRcdGlmIChkYXRlTnVtICsgMSA+IDAgJiYgZGF0ZU51bSArIDEgPD0gZGF5c0luTW9udGgpIHtcblx0XHRcdFx0Ly8gY3VycmVudCBtb250aFxuXHRcdFx0XHR0eCA9IGRhdGVOdW0gKyAxO1xuXHRcdFx0XHRpc1RoaXNNb250aCA9IHRydWU7XG5cdFx0XHRcdGNzcyA9ICdkYXkgb24nO1xuXHRcdFx0XHRpZiAoZGF0ZVRvZGF5ID09PSB0eCkge1xuXHRcdFx0XHRcdGNzcyArPSAnIHRvZGF5Jztcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoZGF0ZVNlbGVjdGVkID09PSB0eCAmJiAhaXNSYW5nZSkge1xuXHRcdFx0XHRcdGNzcyArPSAnIGF5LXNlbGVjdGVkJztcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmIChkYXRlTnVtIDwgMCkge1xuXHRcdFx0XHQvLyBwcmV2aW91cyBtb250aFxuXHRcdFx0XHR0eCA9IGRheXNJblByZXZNb250aCArIGRhdGVOdW0gKyAxO1xuXHRcdFx0XHRjc3MgPSAnZGF5IG9mZiBwYXN0Jztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIG5leHQgbW9udGhcblx0XHRcdFx0dHggPSArK25leHRNb250aDtcblx0XHRcdFx0Y3NzID0gJ2RheSBvZmYgZnV0dXJlJztcblx0XHRcdH1cblxuXHRcdFx0ZGF5ID0gZG9tKFwiZGl2XCIsIHsgaW5uZXJIVE1MOiB0eCwgY2xhc3M6IGNzcyB9LCBub2RlKTtcblxuXHRcdFx0ZGF0ZU51bSsrO1xuXHRcdFx0aWYgKGlzVGhpc01vbnRoKSB7XG5cdFx0XHRcdC8vIEtlZXAgYSBtYXAgb2YgYWxsIHRoZSBkYXlzXG5cdFx0XHRcdC8vIHVzZSBpdCBmb3IgYWRkaW5nIGFuZCByZW1vdmluZyBzZWxlY3Rpb24vaG92ZXIgY2xhc3Nlc1xuXHRcdFx0XHRpbmNEYXRlLnNldERhdGUodHgpO1xuXHRcdFx0XHRkYXkuX2RhdGUgPSBpbmNEYXRlLmdldFRpbWUoKTtcblx0XHRcdFx0dGhpcy5kYXlNYXBbdHhdID0gZGF5O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuY29udGFpbmVyLmFwcGVuZENoaWxkKG5vZGUpO1xuXHRcdHRoaXMuYm9keU5vZGUgPSBub2RlO1xuXHRcdHRoaXMuc2V0Rm9vdGVyKCk7XG5cdFx0dGhpcy5kaXNwbGF5UmFuZ2UoKTtcblx0XHR0aGlzLnNldFJhbmdlRW5kUG9pbnRzKCk7XG5cblx0XHR0aGlzLmVtaXREaXNwbGF5RXZlbnRzKCk7XG5cdH1cblxuXHRzZXRGb290ZXIgKCkge1xuXHRcdGNvbnN0IGQgPSBuZXcgRGF0ZSgpO1xuXHRcdHRoaXMuZm9vdGVyTGluay5pbm5lckhUTUwgPSBkYXRlcy5kYXlzLmZ1bGxbZC5nZXREYXkoKV0gKyAnICcgKyBkYXRlcy5tb250aHMuZnVsbFtkLmdldE1vbnRoKCldICsgJyAnICsgZC5nZXREYXRlKCkgKyAnLCAnICsgZC5nZXRGdWxsWWVhcigpO1xuXHR9XG5cblx0Y29ubmVjdCAoKSB7XG5cdFx0dGhpcy5vbih0aGlzLmxmdE5vZGUsICdjbGljaycsICgpID0+IHtcblx0XHRcdHRoaXMub25DbGlja01vbnRoKC0xKTtcblx0XHR9KTtcblxuXHRcdHRoaXMub24odGhpcy5yZ3ROb2RlLCAnY2xpY2snLCAoKSA9PiB7XG5cdFx0XHR0aGlzLm9uQ2xpY2tNb250aCgxKTtcblx0XHR9KTtcblxuXHRcdHRoaXMub24odGhpcy5mb290ZXJMaW5rLCAnY2xpY2snLCAoKSA9PiB7XG5cdFx0XHR0aGlzLmN1cnJlbnQgPSBuZXcgRGF0ZSgpO1xuXHRcdFx0dGhpcy5yZW5kZXIoKTtcblx0XHR9KTtcblxuXHRcdHRoaXMub24odGhpcy5jb250YWluZXIsICdjbGljaycsIChlKSA9PiB7XG5cdFx0XHR0aGlzLmZpcmUoJ3ByZS1jbGljaycsIGUsIHRydWUsIHRydWUpO1xuXHRcdFx0Y29uc3Qgbm9kZSA9IGUudGFyZ2V0O1xuXHRcdFx0aWYgKG5vZGUuY2xhc3NMaXN0LmNvbnRhaW5zKCdkYXknKSkge1xuXHRcdFx0XHR0aGlzLm9uQ2xpY2tEYXkobm9kZSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChub2RlLmNsYXNzTGlzdC5jb250YWlucygneWVhcicpKSB7XG5cdFx0XHRcdHRoaXMub25DbGlja1llYXIobm9kZSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChub2RlLmNsYXNzTGlzdC5jb250YWlucygnZGVjYWRlJykpIHtcblx0XHRcdFx0dGhpcy5vbkNsaWNrRGVjYWRlKG5vZGUpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5vbih0aGlzLm1vbnRoTm9kZSwgJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0aWYgKHRoaXMubW9kZSArIDEgPT09IHRoaXMubW9kZXMubGVuZ3RoKSB7XG5cdFx0XHRcdHRoaXMubW9kZSA9IDA7XG5cdFx0XHRcdHRoaXMucmVuZGVyKCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0dGhpcy5zZXRNb2RlKHRoaXMubW9kZSArIDEpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0aWYgKHRoaXNbJ3JhbmdlLXBpY2tlciddKSB7XG5cdFx0XHR0aGlzLm9uKHRoaXMuY29udGFpbmVyLCAnbW91c2VvdmVyJywgdGhpcy5ob3ZlclNlbGVjdFJhbmdlLmJpbmQodGhpcykpO1xuXHRcdH1cblx0fVxufVxuXG5jb25zdCB0b2RheSA9IG5ldyBEYXRlKCk7XG5cbmZ1bmN0aW9uIGdldFNlbGVjdGVkRGF0ZSAoZGF0ZSwgY3VycmVudCkge1xuXHRpZiAoZGF0ZS5nZXRNb250aCgpID09PSBjdXJyZW50LmdldE1vbnRoKCkgJiYgZGF0ZS5nZXRGdWxsWWVhcigpID09PSBjdXJyZW50LmdldEZ1bGxZZWFyKCkpIHtcblx0XHRyZXR1cm4gZGF0ZS5nZXREYXRlKCk7XG5cdH1cblx0cmV0dXJuIC05OTk7IC8vIGluZGV4IG11c3QgYmUgb3V0IG9mIHJhbmdlLCBhbmQgLTEgaXMgdGhlIGxhc3QgZGF5IG9mIHRoZSBwcmV2aW91cyBtb250aFxufVxuXG5mdW5jdGlvbiBkZXN0cm95IChub2RlKSB7XG5cdGlmIChub2RlKSB7XG5cdFx0ZG9tLmRlc3Ryb3kobm9kZSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gaXNUaGlzTW9udGggKGRhdGUsIGN1cnJlbnREYXRlKSB7XG5cdHJldHVybiBkYXRlLmdldE1vbnRoKCkgPT09IGN1cnJlbnREYXRlLmdldE1vbnRoKCkgJiYgZGF0ZS5nZXRGdWxsWWVhcigpID09PSBjdXJyZW50RGF0ZS5nZXRGdWxsWWVhcigpO1xufVxuXG5mdW5jdGlvbiBpblJhbmdlIChkYXRlVGltZSwgYmVnVGltZSwgZW5kVGltZSkge1xuXHRyZXR1cm4gZGF0ZVRpbWUgPj0gYmVnVGltZSAmJiBkYXRlVGltZSA8PSBlbmRUaW1lO1xufVxuXG5mdW5jdGlvbiBjb3B5IChkYXRlKSB7XG5cdHJldHVybiBuZXcgRGF0ZShkYXRlLmdldFRpbWUoKSk7XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnZGF0ZS1waWNrZXInLCBEYXRlUGlja2VyKTtcblxubW9kdWxlLmV4cG9ydHMgPSBEYXRlUGlja2VyOyIsInJlcXVpcmUoJy4vZGF0ZS1yYW5nZS1waWNrZXInKTtcbmNvbnN0IERhdGVJbnB1dCA9IHJlcXVpcmUoJy4vZGF0ZS1pbnB1dCcpO1xuY29uc3QgZGF0ZXMgPSByZXF1aXJlKCdkYXRlcycpO1xuY29uc3QgZG9tID0gcmVxdWlyZSgnZG9tJyk7XG5cbmNvbnN0IHByb3BzID0gWyd2YWx1ZSddO1xuY29uc3QgYm9vbHMgPSBbJ3JhbmdlLWV4cGFuZHMnXTtcblxuY2xhc3MgRGF0ZVJhbmdlSW5wdXQgZXh0ZW5kcyBEYXRlSW5wdXQge1xuXG5cdHN0YXRpYyBnZXQgb2JzZXJ2ZWRBdHRyaWJ1dGVzICgpIHtcblx0XHRyZXR1cm4gWy4uLnByb3BzLCAuLi5ib29sc107XG5cdH1cblxuXHRnZXQgcHJvcHMgKCkge1xuXHRcdHJldHVybiBwcm9wcztcblx0fVxuXG5cdGdldCBib29scyAoKSB7XG5cdFx0cmV0dXJuIGJvb2xzO1xuXHR9XG5cblx0b25WYWx1ZSAodmFsdWUpIHtcblxuXHR9XG5cblx0Z2V0IHRlbXBsYXRlU3RyaW5nICgpIHtcblx0XHRyZXR1cm4gYFxuPGxhYmVsPlxuXHQ8c3BhbiByZWY9XCJsYWJlbE5vZGVcIj48L3NwYW4+XG5cdDxpbnB1dCByZWY9XCJpbnB1dFwiIC8+XG5cdFxuPC9sYWJlbD5cbjxkYXRlLXJhbmdlLXBpY2tlciByZWY9XCJwaWNrZXJcIiB0YWJpbmRleD1cIjBcIj48L2RhdGUtcmFuZ2UtcGlja2VyPmA7XG5cdH1cblxuXHRjb25zdHJ1Y3RvciAoKSB7XG5cdFx0c3VwZXIoKTtcblx0fVxuXG5cdG9uS2V5ICgpIHtcblxuXHR9XG5cblx0Y29ubmVjdEtleXMgKCkge1xuXHRcdHRoaXMub24odGhpcy5pbnB1dCwgJ2tleXVwJywgdGhpcy5vbktleS5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdC8vIGRvbVJlYWR5ICgpIHtcblx0Ly8gXHRkb20oKTtcblx0Ly8gfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ2RhdGUtcmFuZ2UtaW5wdXQnLCBEYXRlUmFuZ2VJbnB1dCk7XG5cbm1vZHVsZS5leHBvcnRzID0gRGF0ZVJhbmdlSW5wdXQ7IiwicmVxdWlyZSgnLi9kYXRlLXBpY2tlcicpO1xuY29uc3QgQmFzZUNvbXBvbmVudCA9IHJlcXVpcmUoJ0Jhc2VDb21wb25lbnQnKTtcbmNvbnN0IGRhdGVzID0gcmVxdWlyZSgnZGF0ZXMnKTtcbmNvbnN0IGRvbSA9IHJlcXVpcmUoJ2RvbScpO1xuXG5jb25zdCBwcm9wcyA9IFsndmFsdWUnXTtcbmNvbnN0IGJvb2xzID0gWydyYW5nZS1leHBhbmRzJ107XG5cbmNsYXNzIERhdGVSYW5nZVBpY2tlciBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXG5cdHN0YXRpYyBnZXQgb2JzZXJ2ZWRBdHRyaWJ1dGVzICgpIHtcblx0XHRyZXR1cm4gWy4uLnByb3BzLCAuLi5ib29sc107XG5cdH1cblxuXHRnZXQgcHJvcHMgKCkge1xuXHRcdHJldHVybiBwcm9wcztcblx0fVxuXG5cdGdldCBib29scyAoKSB7XG5cdFx0cmV0dXJuIGJvb2xzO1xuXHR9XG5cblx0b25WYWx1ZSAodmFsdWUpIHtcblx0XHQvLyBtaWdodCBuZWVkIGF0dHJpYnV0ZUNoYW5nZWRcblx0XHR0aGlzLnN0ckRhdGUgPSBkYXRlcy5pc0RhdGVUeXBlKHZhbHVlKSA/IHZhbHVlIDogJyc7XG5cdFx0b25Eb21SZWFkeSh0aGlzLCAoKSA9PiB7XG5cdFx0XHR0aGlzLnNldFZhbHVlKHRoaXMuc3RyRGF0ZSk7XG5cdFx0fSk7XG5cdH1cblxuXHRjb25zdHJ1Y3RvciAoKSB7XG5cdFx0c3VwZXIoKTtcblx0fVxuXG5cdHNldFZhbHVlICh2YWx1ZSkge1xuXHRcdGlmICghdmFsdWUpIHtcblx0XHRcdHRoaXMudmFsdWVEYXRlID0gJyc7XG5cdFx0XHR0aGlzLmNsZWFyUmFuZ2UoKTtcblxuXHRcdH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuXHRcdFx0dmFyIGRhdGVTdHJpbmdzID0gc3BsaXQodmFsdWUpO1xuXHRcdFx0dGhpcy52YWx1ZURhdGUgPSBkYXRlcy5zdHJUb0RhdGUodmFsdWUpO1xuXHRcdFx0dGhpcy5maXJzdFJhbmdlID0gZGF0ZXMuc3RyVG9EYXRlKGRhdGVTdHJpbmdzWzBdKTtcblx0XHRcdHRoaXMuc2Vjb25kUmFuZ2UgPSBkYXRlcy5zdHJUb0RhdGUoZGF0ZVN0cmluZ3NbMV0pO1xuXHRcdFx0dGhpcy5zZXREaXNwbGF5KCk7XG5cdFx0XHR0aGlzLnNldFJhbmdlKCk7XG5cdFx0fVxuXHR9XG5cblx0ZG9tUmVhZHkgKCkge1xuXHRcdHRoaXMubGVmdENhbCA9IGRvbSgnZGF0ZS1waWNrZXInLCB7J3JhbmdlLWxlZnQnOiB0cnVlfSwgdGhpcyk7XG5cdFx0dGhpcy5yaWdodENhbCA9IGRvbSgnZGF0ZS1waWNrZXInLCB7J3JhbmdlLXJpZ2h0JzogdHJ1ZX0sIHRoaXMpO1xuXHRcdHRoaXMucmFuZ2VFeHBhbmRzID0gdGhpc1sncmFuZ2UtZXhwYW5kcyddO1xuXG5cdFx0dGhpcy5jb25uZWN0RXZlbnRzKCk7XG5cdFx0aWYgKHRoaXMuaW5pdGFsVmFsdWUpIHtcblx0XHRcdHRoaXMuc2V0VmFsdWUodGhpcy5pbml0YWxWYWx1ZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuc2V0RGlzcGxheSgpO1xuXHRcdH1cblx0fVxuXG5cdHNldERpc3BsYXkgKCkge1xuXHRcdGNvbnN0XG5cdFx0XHRmaXJzdCA9IHRoaXMuZmlyc3RSYW5nZSA/IG5ldyBEYXRlKHRoaXMuZmlyc3RSYW5nZS5nZXRUaW1lKCkpIDogbmV3IERhdGUoKSxcblx0XHRcdHNlY29uZCA9IG5ldyBEYXRlKGZpcnN0LmdldFRpbWUoKSk7XG5cblx0XHRzZWNvbmQuc2V0TW9udGgoc2Vjb25kLmdldE1vbnRoKCkgKyAxKTtcblx0XHR0aGlzLmxlZnRDYWwuc2V0RGlzcGxheShmaXJzdCk7XG5cdFx0dGhpcy5yaWdodENhbC5zZXREaXNwbGF5KHNlY29uZCk7XG5cdH1cblxuXHRzZXRSYW5nZSAoKSB7XG5cdFx0dGhpcy5sZWZ0Q2FsLnNldFJhbmdlKHRoaXMuZmlyc3RSYW5nZSwgdGhpcy5zZWNvbmRSYW5nZSk7XG5cdFx0dGhpcy5yaWdodENhbC5zZXRSYW5nZSh0aGlzLmZpcnN0UmFuZ2UsIHRoaXMuc2Vjb25kUmFuZ2UpO1xuXHRcdGlmICh0aGlzLmZpcnN0UmFuZ2UgJiYgdGhpcy5zZWNvbmRSYW5nZSkge1xuXG5cdFx0XHRjb25zdFxuXHRcdFx0XHRiZWcgPSBkYXRlcy5kYXRlVG9TdHIodGhpcy5maXJzdFJhbmdlKSxcblx0XHRcdFx0ZW5kID0gZGF0ZXMuZGF0ZVRvU3RyKHRoaXMuc2Vjb25kUmFuZ2UpO1xuXG5cdFx0XHR0aGlzLmVtaXQoJ2NoYW5nZScsIHtcblx0XHRcdFx0Zmlyc3RSYW5nZTogdGhpcy5maXJzdFJhbmdlLFxuXHRcdFx0XHRzZWNvbmRSYW5nZTogdGhpcy5zZWNvbmRSYW5nZSxcblx0XHRcdFx0YmVnaW46IGJlZyxcblx0XHRcdFx0ZW5kOiBlbmQsXG5cdFx0XHRcdHZhbHVlOiBiZWcgKyBERUxJTUlURVIgKyBlbmRcblxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cblx0Y2xlYXJSYW5nZSAoKSB7XG5cdFx0dGhpcy5sZWZ0Q2FsLmNsZWFyUmFuZ2UoKTtcblx0XHR0aGlzLnJpZ2h0Q2FsLmNsZWFyUmFuZ2UoKTtcblx0fVxuXG5cdGNhbGN1bGF0ZVJhbmdlIChlLCB3aGljaCkge1xuXHRcdGUgPSBlLmRldGFpbCB8fCBlO1xuXG5cdFx0aWYgKGUuZmlyc3QgPT09IHRoaXMubGVmdENhbC5maXJzdFJhbmdlKSB7XG5cdFx0XHRpZiAoIWUuc2Vjb25kKSB7XG5cdFx0XHRcdHRoaXMucmlnaHRDYWwuY2xlYXJSYW5nZSgpO1xuXHRcdFx0XHR0aGlzLnJpZ2h0Q2FsLnNldFJhbmdlKHRoaXMubGVmdENhbC5maXJzdFJhbmdlLCBudWxsKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMucmlnaHRDYWwuc2V0UmFuZ2UodGhpcy5sZWZ0Q2FsLmZpcnN0UmFuZ2UsIHRoaXMubGVmdENhbC5zZWNvbmRSYW5nZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Y29ubmVjdEV2ZW50cyAoKSB7XG5cdFx0dGhpcy5sZWZ0Q2FsLm9uKCdkaXNwbGF5LWNoYW5nZScsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRsZXRcblx0XHRcdFx0bSA9IGUuZGV0YWlsLm1vbnRoLFxuXHRcdFx0XHR5ID0gZS5kZXRhaWwueWVhcjtcblx0XHRcdGlmIChtICsgMSA+IDExKSB7XG5cdFx0XHRcdG0gPSAwO1xuXHRcdFx0XHR5Kys7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRtKys7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnJpZ2h0Q2FsLnNldERpc3BsYXkoeSwgbSk7XG5cdFx0fS5iaW5kKHRoaXMpKTtcblxuXHRcdHRoaXMucmlnaHRDYWwub24oJ2Rpc3BsYXktY2hhbmdlJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGxldFxuXHRcdFx0XHRtID0gZS5kZXRhaWwubW9udGgsXG5cdFx0XHRcdHkgPSBlLmRldGFpbC55ZWFyO1xuXHRcdFx0aWYgKG0gLSAxIDwgMCkge1xuXHRcdFx0XHRtID0gMTE7XG5cdFx0XHRcdHktLTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG0tLTtcblx0XHRcdH1cblx0XHRcdHRoaXMubGVmdENhbC5zZXREaXNwbGF5KHksIG0pO1xuXHRcdH0uYmluZCh0aGlzKSk7XG5cblx0XHR0aGlzLmxlZnRDYWwub24oJ2NoYW5nZScsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0uYmluZCh0aGlzKSk7XG5cblx0XHR0aGlzLnJpZ2h0Q2FsLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0ZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9LmJpbmQodGhpcykpO1xuXG5cblx0XHRpZiAoIXRoaXMucmFuZ2VFeHBhbmRzKSB7XG5cdFx0XHR0aGlzLnJpZ2h0Q2FsLm9uKCdyZXNldC1yYW5nZScsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdHRoaXMubGVmdENhbC5jbGVhclJhbmdlKCk7XG5cdFx0XHR9LmJpbmQodGhpcykpO1xuXG5cdFx0XHR0aGlzLmxlZnRDYWwub24oJ3Jlc2V0LXJhbmdlJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0dGhpcy5yaWdodENhbC5jbGVhclJhbmdlKCk7XG5cdFx0XHR9LmJpbmQodGhpcykpO1xuXHRcdH1cblxuXG5cdFx0dGhpcy5sZWZ0Q2FsLm9uKCdzZWxlY3QtcmFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0dGhpcy5jYWxjdWxhdGVSYW5nZShlLCAnbGVmdCcpO1xuXHRcdFx0ZSA9IGUuZGV0YWlsO1xuXHRcdFx0aWYgKHRoaXMucmFuZ2VFeHBhbmRzICYmIGUuZmlyc3QgJiYgZS5zZWNvbmQpIHtcblx0XHRcdFx0aWYgKGlzRGF0ZUNsb3NlclRvTGVmdChlLmN1cnJlbnQsIGUuZmlyc3QsIGUuc2Vjb25kKSkge1xuXHRcdFx0XHRcdHRoaXMuZmlyc3RSYW5nZSA9IGUuY3VycmVudDtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLnNlY29uZFJhbmdlID0gZS5jdXJyZW50O1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuc2V0UmFuZ2UoKTtcblx0XHRcdH0gZWxzZSBpZiAoZS5maXJzdCAmJiBlLnNlY29uZCkge1xuXHRcdFx0XHQvLyBuZXcgcmFuZ2Vcblx0XHRcdFx0dGhpcy5jbGVhclJhbmdlKCk7XG5cdFx0XHRcdHRoaXMuZmlyc3RSYW5nZSA9IGUuY3VycmVudDtcblx0XHRcdFx0dGhpcy5zZWNvbmRSYW5nZSA9IG51bGw7XG5cdFx0XHRcdHRoaXMuc2V0UmFuZ2UoKTtcblx0XHRcdH0gZWxzZSBpZiAoZS5maXJzdCAmJiAhZS5zZWNvbmQpIHtcblx0XHRcdFx0dGhpcy5zZWNvbmRSYW5nZSA9IGUuY3VycmVudDtcblx0XHRcdFx0dGhpcy5zZXRSYW5nZSgpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHRoaXMuZmlyc3RSYW5nZSA9IGUuY3VycmVudDtcblx0XHRcdFx0dGhpcy5zZXRSYW5nZSgpO1xuXHRcdFx0fVxuXHRcdH0uYmluZCh0aGlzKSk7XG5cblx0XHR0aGlzLnJpZ2h0Q2FsLm9uKCdzZWxlY3QtcmFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0dGhpcy5jYWxjdWxhdGVSYW5nZShlLCAncmlnaHQnKTtcblxuXHRcdFx0ZSA9IGUuZGV0YWlsO1xuXHRcdFx0aWYgKHRoaXMucmFuZ2VFeHBhbmRzICYmIGUuZmlyc3QgJiYgZS5zZWNvbmQpIHtcblx0XHRcdFx0aWYgKGlzRGF0ZUNsb3NlclRvTGVmdChlLmN1cnJlbnQsIGUuZmlyc3QsIGUuc2Vjb25kKSkge1xuXHRcdFx0XHRcdHRoaXMuZmlyc3RSYW5nZSA9IGUuY3VycmVudDtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLnNlY29uZFJhbmdlID0gZS5jdXJyZW50O1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuc2V0UmFuZ2UoKTtcblx0XHRcdH0gZWxzZSBpZiAoZS5maXJzdCAmJiBlLnNlY29uZCkge1xuXHRcdFx0XHQvLyBuZXcgcmFuZ2Vcblx0XHRcdFx0dGhpcy5jbGVhclJhbmdlKCk7XG5cdFx0XHRcdHRoaXMuZmlyc3RSYW5nZSA9IGUuY3VycmVudDtcblx0XHRcdFx0dGhpcy5zZWNvbmRSYW5nZSA9IG51bGw7XG5cdFx0XHRcdHRoaXMuc2V0UmFuZ2UoKTtcblx0XHRcdH0gZWxzZSBpZiAoZS5maXJzdCAmJiAhZS5zZWNvbmQpIHtcblx0XHRcdFx0dGhpcy5zZWNvbmRSYW5nZSA9IGUuY3VycmVudDtcblx0XHRcdFx0dGhpcy5zZXRSYW5nZSgpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHRoaXMuZmlyc3RSYW5nZSA9IGUuY3VycmVudDtcblx0XHRcdFx0dGhpcy5zZXRSYW5nZSgpO1xuXHRcdFx0fVxuXHRcdH0uYmluZCh0aGlzKSk7XG5cblx0XHR0aGlzLm9uKHRoaXMucmlnaHRDYWwsICdtb3VzZW92ZXInLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHR0aGlzLmxlZnRDYWwuZGlzcGxheVJhbmdlVG9FbmQoKTtcblx0XHR9LmJpbmQodGhpcykpO1xuXHR9XG5cblx0ZGVzdHJveSAoKSB7XG5cdFx0dGhpcy5yaWdodENhbC5kZXN0cm95KCk7XG5cdFx0dGhpcy5sZWZ0Q2FsLmRlc3Ryb3koKTtcblx0fVxufVxuXG5jb25zdCBERUxJTUlURVIgPSAnIC0gJztcbmNvbnN0IHRvZGF5ID0gbmV3IERhdGUoKTtcblxuZnVuY3Rpb24gc3RyIChkKSB7XG5cdGlmICghZCkge1xuXHRcdHJldHVybiBudWxsO1xuXHR9XG5cdHJldHVybiBkYXRlcy5kYXRlVG9TdHIoZCk7XG59XG5cbmZ1bmN0aW9uIHNwbGl0ICh2YWx1ZSkge1xuXHRpZiAodmFsdWUuaW5kZXhPZignLCcpID4gLTEpIHtcblx0XHRyZXR1cm4gdmFsdWUuc3BsaXQoL1xccyosXFxzKi8pO1xuXHR9XG5cdHJldHVybiB2YWx1ZS5zcGxpdCgvXFxzKi1cXHMqLyk7XG59XG5cbmZ1bmN0aW9uIGlzRGF0ZUNsb3NlclRvTGVmdCAoZGF0ZSwgbGVmdCwgcmlnaHQpIHtcblx0Y29uc3QgZGlmZjEgPSBkYXRlcy5kaWZmKGRhdGUsIGxlZnQpLFxuXHRcdGRpZmYyID0gZGF0ZXMuZGlmZihkYXRlLCByaWdodCk7XG5cdHJldHVybiBkaWZmMSA8PSBkaWZmMjtcbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdkYXRlLXJhbmdlLXBpY2tlcicsIERhdGVSYW5nZVBpY2tlcik7XG5cbm1vZHVsZS5leHBvcnRzID0gRGF0ZVJhbmdlUGlja2VyOyIsInJlcXVpcmUoJy4vZ2xvYmFscycpO1xucmVxdWlyZSgnLi4vLi4vc3JjL2RhdGUtcGlja2VyJyk7XG5yZXF1aXJlKCcuLi8uLi9zcmMvZGF0ZS1pbnB1dCcpO1xucmVxdWlyZSgnLi4vLi4vc3JjL2RhdGUtcmFuZ2UtcGlja2VyJyk7XG5yZXF1aXJlKCcuLi8uLi9zcmMvZGF0ZS1yYW5nZS1pbnB1dCcpOyIsIndpbmRvd1snbm8tbmF0aXZlLXNoaW0nXSA9IGZhbHNlO1xucmVxdWlyZSgnY3VzdG9tLWVsZW1lbnRzLXBvbHlmaWxsJyk7XG53aW5kb3cub24gPSByZXF1aXJlKCdvbicpO1xud2luZG93LmRvbSA9IHJlcXVpcmUoJ2RvbScpOyJdfQ==
