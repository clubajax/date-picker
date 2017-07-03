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
var props = ['label', 'name', 'type', 'placeholder', 'value'];
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
		key: 'onKey',
		value: function onKey(e) {
			var str = this.typedValue;
			var k = e.key;
			if (control[k]) {
				if (k === 'Backspace') {
					// TODO: check Delete key
					this.setValue(this.input.value);
				}
				return;
			}
			if (!isNum(k)) {
				stopEvent(e);
				return;
			}
			switch (str.length) {
				case 0:
				case 1:
				case 3:
				case 4:
				case 6:
				case 7:
				case 8:
				case 9:
					str += k;
					break;
				case 2:
				case 5:
					str += '/' + k;
			}
			this.setValue(str);
		}
	}, {
		key: 'show',
		value: function show() {
			if (this.showing) {
				return;
			}
			this.showing = true;
			this.picker.style.display = 'block';
		}
	}, {
		key: 'hide',
		value: function hide() {
			if (!this.showing) {
				return;
			}
			this.showing = false;
			this.picker.style.display = '';
		}
	}, {
		key: 'domReady',
		value: function domReady() {
			var _this3 = this;

			this.labelNode.innerHTML = this.label || '';
			this.input.setAttribute('type', 'text');
			this.input.setAttribute('placeholder', this.placeholder || defaultPlaceholder);
			this.on(this.input, 'keydown', stopEvent);
			this.on(this.input, 'keypress', stopEvent);
			this.on(this.input, 'keyup', this.onKey.bind(this));

			this.picker.on('change', function (e) {
				_this3.setValue(e.value);
			});

			this.registerHandle(handleOpen(this.input, this.picker, this.show.bind(this), this.hide.bind(this)));
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
	if (control[e.key]) {
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

},{"BaseComponent":"BaseComponent","BaseComponent/src/properties":1,"BaseComponent/src/refs":2,"BaseComponent/src/template":3,"dates":4}],7:[function(require,module,exports){
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

},{"./date-picker":6,"BaseComponent":"BaseComponent","dates":4,"dom":"dom"}],8:[function(require,module,exports){
'use strict';

require('./globals');
require('../../src/date-picker');
require('../../src/date-input');
require('../../src/date-range-picker');

},{"../../src/date-input":5,"../../src/date-picker":6,"../../src/date-range-picker":7,"./globals":9}],9:[function(require,module,exports){
'use strict';

window['no-native-shim'] = false;
require('custom-elements-polyfill');
window.on = require('on');
window.dom = require('dom');

},{"custom-elements-polyfill":"custom-elements-polyfill","dom":"dom","on":"on"}]},{},[8])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQmFzZUNvbXBvbmVudC9zcmMvcHJvcGVydGllcy5qcyIsIm5vZGVfbW9kdWxlcy9CYXNlQ29tcG9uZW50L3NyYy9yZWZzLmpzIiwibm9kZV9tb2R1bGVzL0Jhc2VDb21wb25lbnQvc3JjL3RlbXBsYXRlLmpzIiwibm9kZV9tb2R1bGVzL2RhdGVzL3NyYy9kYXRlcy5qcyIsInNyYy9kYXRlLWlucHV0LmpzIiwic3JjL2RhdGUtcGlja2VyLmpzIiwic3JjL2RhdGUtcmFuZ2UtcGlja2VyLmpzIiwidGVzdHMvc3JjL2RhdGUtcGlja2VyLXRlc3RzLmpzIiwidGVzdHMvc3JjL2dsb2JhbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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LENBQVksU0FBWixDQUFQO0FBQ0E7O0FBRUQsU0FBUyxrQkFBVCxDQUE2QixJQUE3QixFQUFtQyxJQUFuQyxFQUF5QyxLQUF6QyxFQUFnRDtBQUMvQyxLQUFJLFFBQVEsTUFBTSxJQUFOLENBQVcsSUFBWCxFQUFpQixJQUFqQixDQUFaO0FBQUEsS0FDQyxRQUFRLE1BQU0sSUFBTixDQUFXLElBQVgsRUFBaUIsS0FBakIsQ0FEVDtBQUVBLFFBQU8sU0FBUyxLQUFoQjtBQUNBOztBQUVELGVBQWUsTUFBZixDQUFzQixtQkFBdEIsRUFBMkMsZUFBM0M7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLGVBQWpCOzs7OztBQzFQQSxRQUFRLFdBQVI7QUFDQSxRQUFRLHVCQUFSO0FBQ0EsUUFBUSxzQkFBUjtBQUNBLFFBQVEsNkJBQVI7Ozs7O0FDSEEsT0FBTyxnQkFBUCxJQUEyQixLQUEzQjtBQUNBLFFBQVEsMEJBQVI7QUFDQSxPQUFPLEVBQVAsR0FBWSxRQUFRLElBQVIsQ0FBWjtBQUNBLE9BQU8sR0FBUCxHQUFhLFFBQVEsS0FBUixDQUFiIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImNvbnN0IEJhc2VDb21wb25lbnQgPSByZXF1aXJlKCdCYXNlQ29tcG9uZW50Jyk7XG5jb25zdCBkb20gPSByZXF1aXJlKCdkb20nKTtcblxuZnVuY3Rpb24gc2V0Qm9vbGVhbiAobm9kZSwgcHJvcCkge1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkobm9kZSwgcHJvcCwge1xuXHRcdGVudW1lcmFibGU6IHRydWUsXG5cdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHRcdGdldCAoKSB7XG5cdFx0XHRyZXR1cm4gbm9kZS5oYXNBdHRyaWJ1dGUocHJvcCk7XG5cdFx0fSxcblx0XHRzZXQgKHZhbHVlKSB7XG5cdFx0XHR0aGlzLmlzU2V0dGluZ0F0dHJpYnV0ZSA9IHRydWU7XG5cdFx0XHRpZiAodmFsdWUpIHtcblx0XHRcdFx0dGhpcy5zZXRBdHRyaWJ1dGUocHJvcCwgJycpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5yZW1vdmVBdHRyaWJ1dGUocHJvcCk7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBmbiA9IHRoaXNbb25pZnkocHJvcCldO1xuXHRcdFx0aWYoZm4pe1xuXHRcdFx0XHRmbi5jYWxsKHRoaXMsIHZhbHVlKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5pc1NldHRpbmdBdHRyaWJ1dGUgPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBzZXRQcm9wZXJ0eSAobm9kZSwgcHJvcCkge1xuXHRsZXQgcHJvcFZhbHVlO1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkobm9kZSwgcHJvcCwge1xuXHRcdGVudW1lcmFibGU6IHRydWUsXG5cdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHRcdGdldCAoKSB7XG5cdFx0XHRyZXR1cm4gcHJvcFZhbHVlICE9PSB1bmRlZmluZWQgPyBwcm9wVmFsdWUgOiBkb20ubm9ybWFsaXplKHRoaXMuZ2V0QXR0cmlidXRlKHByb3ApKTtcblx0XHR9LFxuXHRcdHNldCAodmFsdWUpIHtcblx0XHRcdHRoaXMuaXNTZXR0aW5nQXR0cmlidXRlID0gdHJ1ZTtcblx0XHRcdHRoaXMuc2V0QXR0cmlidXRlKHByb3AsIHZhbHVlKTtcblx0XHRcdGNvbnN0IGZuID0gdGhpc1tvbmlmeShwcm9wKV07XG5cdFx0XHRpZihmbil7XG5cdFx0XHRcdG9uRG9tUmVhZHkodGhpcywgKCkgPT4ge1xuXHRcdFx0XHRcdHZhbHVlID0gZm4uY2FsbCh0aGlzLCB2YWx1ZSkgfHwgdmFsdWU7XG5cdFx0XHRcdFx0aWYodmFsdWUgIT09IHVuZGVmaW5lZCl7XG5cdFx0XHRcdFx0XHRwcm9wVmFsdWUgPSB2YWx1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5pc1NldHRpbmdBdHRyaWJ1dGUgPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBzZXRPYmplY3QgKG5vZGUsIHByb3ApIHtcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG5vZGUsIHByb3AsIHtcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcblx0XHRnZXQgKCkge1xuXHRcdFx0cmV0dXJuIHRoaXNbJ19fJyArIHByb3BdO1xuXHRcdH0sXG5cdFx0c2V0ICh2YWx1ZSkge1xuXHRcdFx0dGhpc1snX18nICsgcHJvcF0gPSB2YWx1ZTtcblx0XHR9XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBzZXRQcm9wZXJ0aWVzIChub2RlKSB7XG5cdGxldCBwcm9wcyA9IG5vZGUucHJvcHMgfHwgbm9kZS5wcm9wZXJ0aWVzO1xuXHRpZiAocHJvcHMpIHtcblx0XHRwcm9wcy5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG5cdFx0XHRpZiAocHJvcCA9PT0gJ2Rpc2FibGVkJykge1xuXHRcdFx0XHRzZXRCb29sZWFuKG5vZGUsIHByb3ApO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHNldFByb3BlcnR5KG5vZGUsIHByb3ApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHNldEJvb2xlYW5zIChub2RlKSB7XG5cdGxldCBwcm9wcyA9IG5vZGUuYm9vbHMgfHwgbm9kZS5ib29sZWFucztcblx0aWYgKHByb3BzKSB7XG5cdFx0cHJvcHMuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuXHRcdFx0c2V0Qm9vbGVhbihub2RlLCBwcm9wKTtcblx0XHR9KTtcblx0fVxufVxuXG5mdW5jdGlvbiBzZXRPYmplY3RzIChub2RlKSB7XG5cdGxldCBwcm9wcyA9IG5vZGUub2JqZWN0cztcblx0aWYgKHByb3BzKSB7XG5cdFx0cHJvcHMuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuXHRcdFx0c2V0T2JqZWN0KG5vZGUsIHByb3ApO1xuXHRcdH0pO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGNhcCAobmFtZSkge1xuXHRyZXR1cm4gbmFtZS5zdWJzdHJpbmcoMCwxKS50b1VwcGVyQ2FzZSgpICsgbmFtZS5zdWJzdHJpbmcoMSk7XG59XG5cbmZ1bmN0aW9uIG9uaWZ5IChuYW1lKSB7XG5cdHJldHVybiAnb24nICsgbmFtZS5zcGxpdCgnLScpLm1hcCh3b3JkID0+IGNhcCh3b3JkKSkuam9pbignJyk7XG59XG5cbmZ1bmN0aW9uIGlzQm9vbCAobm9kZSwgbmFtZSkge1xuXHRyZXR1cm4gKG5vZGUuYm9vbHMgfHwgbm9kZS5ib29sZWFucyB8fCBbXSkuaW5kZXhPZihuYW1lKSA+IC0xO1xufVxuXG5mdW5jdGlvbiBib29sTm9ybSAodmFsdWUpIHtcblx0aWYodmFsdWUgPT09ICcnKXtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXHRyZXR1cm4gZG9tLm5vcm1hbGl6ZSh2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIHByb3BOb3JtICh2YWx1ZSkge1xuXHRyZXR1cm4gZG9tLm5vcm1hbGl6ZSh2YWx1ZSk7XG59XG5cbkJhc2VDb21wb25lbnQuYWRkUGx1Z2luKHtcblx0bmFtZTogJ3Byb3BlcnRpZXMnLFxuXHRvcmRlcjogMTAsXG5cdGluaXQ6IGZ1bmN0aW9uIChub2RlKSB7XG5cdFx0c2V0UHJvcGVydGllcyhub2RlKTtcblx0XHRzZXRCb29sZWFucyhub2RlKTtcblx0fSxcblx0cHJlQXR0cmlidXRlQ2hhbmdlZDogZnVuY3Rpb24gKG5vZGUsIG5hbWUsIHZhbHVlKSB7XG5cdFx0aWYgKG5vZGUuaXNTZXR0aW5nQXR0cmlidXRlKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdGlmKGlzQm9vbChub2RlLCBuYW1lKSl7XG5cdFx0XHR2YWx1ZSA9IGJvb2xOb3JtKHZhbHVlKTtcblx0XHRcdG5vZGVbbmFtZV0gPSAhIXZhbHVlO1xuXHRcdFx0aWYoIXZhbHVlKXtcblx0XHRcdFx0bm9kZVtuYW1lXSA9IGZhbHNlO1xuXHRcdFx0XHRub2RlLmlzU2V0dGluZ0F0dHJpYnV0ZSA9IHRydWU7XG5cdFx0XHRcdG5vZGUucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuXHRcdFx0XHRub2RlLmlzU2V0dGluZ0F0dHJpYnV0ZSA9IGZhbHNlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bm9kZVtuYW1lXSA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0bm9kZVtuYW1lXSA9IHByb3BOb3JtKHZhbHVlKTtcblx0fVxufSk7IiwiY29uc3QgZG9tID0gcmVxdWlyZSgnZG9tJyk7XG5jb25zdCBCYXNlQ29tcG9uZW50ID0gcmVxdWlyZSgnQmFzZUNvbXBvbmVudCcpO1xuXG5mdW5jdGlvbiBhc3NpZ25SZWZzIChub2RlKSB7XG4gICAgZG9tLnF1ZXJ5QWxsKG5vZGUsICdbcmVmXScpLmZvckVhY2goZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICAgIGxldCBuYW1lID0gY2hpbGQuZ2V0QXR0cmlidXRlKCdyZWYnKTtcbiAgICAgICAgbm9kZVtuYW1lXSA9IGNoaWxkO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBhc3NpZ25FdmVudHMgKG5vZGUpIHtcbiAgICAvLyA8ZGl2IG9uPVwiY2xpY2s6b25DbGlja1wiPlxuICAgIGRvbS5xdWVyeUFsbChub2RlLCAnW29uXScpLmZvckVhY2goZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICAgIGxldFxuICAgICAgICAgICAga2V5VmFsdWUgPSBjaGlsZC5nZXRBdHRyaWJ1dGUoJ29uJyksXG4gICAgICAgICAgICBldmVudCA9IGtleVZhbHVlLnNwbGl0KCc6JylbMF0udHJpbSgpLFxuICAgICAgICAgICAgbWV0aG9kID0ga2V5VmFsdWUuc3BsaXQoJzonKVsxXS50cmltKCk7XG4gICAgICAgIG5vZGUub24oY2hpbGQsIGV2ZW50LCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgbm9kZVttZXRob2RdKGUpXG4gICAgICAgIH0pXG4gICAgfSk7XG59XG5cbkJhc2VDb21wb25lbnQuYWRkUGx1Z2luKHtcbiAgICBuYW1lOiAncmVmcycsXG4gICAgb3JkZXI6IDMwLFxuICAgIHByZUNvbm5lY3RlZDogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgYXNzaWduUmVmcyhub2RlKTtcbiAgICAgICAgYXNzaWduRXZlbnRzKG5vZGUpO1xuICAgIH1cbn0pOyIsImNvbnN0IEJhc2VDb21wb25lbnQgID0gcmVxdWlyZSgnQmFzZUNvbXBvbmVudCcpO1xuY29uc3QgZG9tID0gcmVxdWlyZSgnZG9tJyk7XG5cbnZhclxuICAgIGxpZ2h0Tm9kZXMgPSB7fSxcbiAgICBpbnNlcnRlZCA9IHt9O1xuXG5mdW5jdGlvbiBpbnNlcnQgKG5vZGUpIHtcbiAgICBpZihpbnNlcnRlZFtub2RlLl91aWRdIHx8ICFoYXNUZW1wbGF0ZShub2RlKSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29sbGVjdExpZ2h0Tm9kZXMobm9kZSk7XG4gICAgaW5zZXJ0VGVtcGxhdGUobm9kZSk7XG4gICAgaW5zZXJ0ZWRbbm9kZS5fdWlkXSA9IHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbGxlY3RMaWdodE5vZGVzKG5vZGUpe1xuICAgIGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXSA9IGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXSB8fCBbXTtcbiAgICB3aGlsZShub2RlLmNoaWxkTm9kZXMubGVuZ3RoKXtcbiAgICAgICAgbGlnaHROb2Rlc1tub2RlLl91aWRdLnB1c2gobm9kZS5yZW1vdmVDaGlsZChub2RlLmNoaWxkTm9kZXNbMF0pKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGhhc1RlbXBsYXRlIChub2RlKSB7XG4gICAgcmV0dXJuICEhbm9kZS5nZXRUZW1wbGF0ZU5vZGUoKTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0VGVtcGxhdGVDaGFpbiAobm9kZSkge1xuICAgIHZhciB0ZW1wbGF0ZXMgPSBub2RlLmdldFRlbXBsYXRlQ2hhaW4oKTtcbiAgICB0ZW1wbGF0ZXMucmV2ZXJzZSgpLmZvckVhY2goZnVuY3Rpb24gKHRlbXBsYXRlKSB7XG4gICAgICAgIGdldENvbnRhaW5lcihub2RlKS5hcHBlbmRDaGlsZChCYXNlQ29tcG9uZW50LmNsb25lKHRlbXBsYXRlKSk7XG4gICAgfSk7XG4gICAgaW5zZXJ0Q2hpbGRyZW4obm9kZSk7XG59XG5cbmZ1bmN0aW9uIGluc2VydFRlbXBsYXRlIChub2RlKSB7XG4gICAgaWYobm9kZS5uZXN0ZWRUZW1wbGF0ZSl7XG4gICAgICAgIGluc2VydFRlbXBsYXRlQ2hhaW4obm9kZSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyXG4gICAgICAgIHRlbXBsYXRlTm9kZSA9IG5vZGUuZ2V0VGVtcGxhdGVOb2RlKCk7XG5cbiAgICBpZih0ZW1wbGF0ZU5vZGUpIHtcbiAgICAgICAgbm9kZS5hcHBlbmRDaGlsZChCYXNlQ29tcG9uZW50LmNsb25lKHRlbXBsYXRlTm9kZSkpO1xuICAgIH1cbiAgICBpbnNlcnRDaGlsZHJlbihub2RlKTtcbn1cblxuZnVuY3Rpb24gZ2V0Q29udGFpbmVyIChub2RlKSB7XG4gICAgdmFyIGNvbnRhaW5lcnMgPSBub2RlLnF1ZXJ5U2VsZWN0b3JBbGwoJ1tyZWY9XCJjb250YWluZXJcIl0nKTtcbiAgICBpZighY29udGFpbmVycyB8fCAhY29udGFpbmVycy5sZW5ndGgpe1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRhaW5lcnNbY29udGFpbmVycy5sZW5ndGggLSAxXTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0Q2hpbGRyZW4gKG5vZGUpIHtcbiAgICB2YXIgaSxcbiAgICAgICAgY29udGFpbmVyID0gZ2V0Q29udGFpbmVyKG5vZGUpLFxuICAgICAgICBjaGlsZHJlbiA9IGxpZ2h0Tm9kZXNbbm9kZS5fdWlkXTtcblxuICAgIGlmKGNvbnRhaW5lciAmJiBjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGgpe1xuICAgICAgICBmb3IoaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoY2hpbGRyZW5baV0pO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5CYXNlQ29tcG9uZW50LnByb3RvdHlwZS5nZXRMaWdodE5vZGVzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBsaWdodE5vZGVzW3RoaXMuX3VpZF07XG59O1xuXG5CYXNlQ29tcG9uZW50LnByb3RvdHlwZS5nZXRUZW1wbGF0ZU5vZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gY2FjaGluZyBjYXVzZXMgZGlmZmVyZW50IGNsYXNzZXMgdG8gcHVsbCB0aGUgc2FtZSB0ZW1wbGF0ZSAtIHdhdD9cbiAgICAvL2lmKCF0aGlzLnRlbXBsYXRlTm9kZSkge1xuICAgICAgICBpZiAodGhpcy50ZW1wbGF0ZUlkKSB7XG4gICAgICAgICAgICB0aGlzLnRlbXBsYXRlTm9kZSA9IGRvbS5ieUlkKHRoaXMudGVtcGxhdGVJZC5yZXBsYWNlKCcjJywnJykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMudGVtcGxhdGVTdHJpbmcpIHtcbiAgICAgICAgICAgIHRoaXMudGVtcGxhdGVOb2RlID0gZG9tLnRvRG9tKCc8dGVtcGxhdGU+JyArIHRoaXMudGVtcGxhdGVTdHJpbmcgKyAnPC90ZW1wbGF0ZT4nKTtcbiAgICAgICAgfVxuICAgIC8vfVxuICAgIHJldHVybiB0aGlzLnRlbXBsYXRlTm9kZTtcbn07XG5cbkJhc2VDb21wb25lbnQucHJvdG90eXBlLmdldFRlbXBsYXRlQ2hhaW4gPSBmdW5jdGlvbiAoKSB7XG5cbiAgICBsZXRcbiAgICAgICAgY29udGV4dCA9IHRoaXMsXG4gICAgICAgIHRlbXBsYXRlcyA9IFtdLFxuICAgICAgICB0ZW1wbGF0ZTtcblxuICAgIC8vIHdhbGsgdGhlIHByb3RvdHlwZSBjaGFpbjsgQmFiZWwgZG9lc24ndCBhbGxvdyB1c2luZ1xuICAgIC8vIGBzdXBlcmAgc2luY2Ugd2UgYXJlIG91dHNpZGUgb2YgdGhlIENsYXNzXG4gICAgd2hpbGUoY29udGV4dCl7XG4gICAgICAgIGNvbnRleHQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoY29udGV4dCk7XG4gICAgICAgIGlmKCFjb250ZXh0KXsgYnJlYWs7IH1cbiAgICAgICAgLy8gc2tpcCBwcm90b3R5cGVzIHdpdGhvdXQgYSB0ZW1wbGF0ZVxuICAgICAgICAvLyAoZWxzZSBpdCB3aWxsIHB1bGwgYW4gaW5oZXJpdGVkIHRlbXBsYXRlIGFuZCBjYXVzZSBkdXBsaWNhdGVzKVxuICAgICAgICBpZihjb250ZXh0Lmhhc093blByb3BlcnR5KCd0ZW1wbGF0ZVN0cmluZycpIHx8IGNvbnRleHQuaGFzT3duUHJvcGVydHkoJ3RlbXBsYXRlSWQnKSkge1xuICAgICAgICAgICAgdGVtcGxhdGUgPSBjb250ZXh0LmdldFRlbXBsYXRlTm9kZSgpO1xuICAgICAgICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGVzLnB1c2godGVtcGxhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0ZW1wbGF0ZXM7XG59O1xuXG5CYXNlQ29tcG9uZW50LmFkZFBsdWdpbih7XG4gICAgbmFtZTogJ3RlbXBsYXRlJyxcbiAgICBvcmRlcjogMjAsXG4gICAgcHJlQ29ubmVjdGVkOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICBpbnNlcnQobm9kZSk7XG4gICAgfVxufSk7IiwiLyogVU1ELmRlZmluZSAqLyAoZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgICBpZiAodHlwZW9mIGN1c3RvbUxvYWRlciA9PT0gJ2Z1bmN0aW9uJyl7IGN1c3RvbUxvYWRlcihmYWN0b3J5LCAnZGF0ZXMnKTsgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCl7IGRlZmluZShbXSwgZmFjdG9yeSk7IH1cbiAgICBlbHNlIGlmKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jyl7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpOyB9XG4gICAgZWxzZXsgcm9vdC5yZXR1cm5FeHBvcnRzID0gZmFjdG9yeSgpO1xuICAgICAgICB3aW5kb3cuZGF0ZXMgPSBmYWN0b3J5KCk7IH1cbn0odGhpcywgZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIC8vIGRhdGVzLmpzXG4gICAgLy8gIGRhdGUgaGVscGVyIGxpYlxuICAgIC8vXG4gICAgdmFyXG4gICAgICAgIC8vIHRlc3RzIHRoYXQgaXQgaXMgYSBkYXRlIHN0cmluZywgbm90IGEgdmFsaWQgZGF0ZS4gODgvODgvODg4OCB3b3VsZCBiZSB0cnVlXG4gICAgICAgIGRhdGVSZWdFeHAgPSAvXihcXGR7MSwyfSkoW1xcLy1dKShcXGR7MSwyfSkoW1xcLy1dKShcXGR7NH0pXFxiLyxcbiAgICAgICAgLy8gMjAxNS0wNS0yNlQwMDowMDowMFxuICAgICAgICB0c1JlZ0V4cCA9IC9eKFxcZHs0fSktKFxcZHsyfSktKFxcZHsyfSlUKFxcZHsyfSk6KFxcZHsyfSk6KFxcZHsyfSlcXGIvLFxuXG4gICAgICAgIGRheXNPZldlZWsgPSBbJ1N1bmRheScsICdNb25kYXknLCAnVHVlc2RheScsICdXZWRuZXNkYXknLCAnVGh1cnNkYXknLCAnRnJpZGF5JywgJ1NhdHVyZGF5J10sXG4gICAgICAgIGRheXMgPSBbXSxcbiAgICAgICAgZGF5czMgPSBbXSxcbiAgICAgICAgZGF5RGljdCA9IHt9LFxuXG4gICAgICAgIG1vbnRocyA9IFsnSmFudWFyeScsICdGZWJydWFyeScsICdNYXJjaCcsICdBcHJpbCcsICdNYXknLCAnSnVuZScsICdKdWx5JywgJ0F1Z3VzdCcsICdTZXB0ZW1iZXInLCAnT2N0b2JlcicsICdOb3ZlbWJlcicsICdEZWNlbWJlciddLFxuICAgICAgICBtb250aExlbmd0aHMgPSBbMzEsIDI4LCAzMSwgMzAsIDMxLCAzMCwgMzEsIDMxLCAzMCwgMzEsIDMwLCAzMV0sXG4gICAgICAgIG1vbnRoQWJiciA9IFtdLFxuICAgICAgICBtb250aERpY3QgPSB7fSxcblxuICAgICAgICBkYXRlUGF0dGVybiA9IC95eXl5fHl5fG1tfG18TU18TXxkZHxkL2csXG4gICAgICAgIGRhdGVQYXR0ZXJuTGlicmFyeSA9IHtcbiAgICAgICAgICAgIHl5eXk6IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZS5nZXRGdWxsWWVhcigpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHl5OiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChkYXRlLmdldEZ1bGxZZWFyKCkgKyAnJykuc3Vic3RyaW5nKDIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1tOiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhZChkYXRlLmdldE1vbnRoKCkgKyAxKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtOiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGUuZ2V0TW9udGgoKSArIDE7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgTU06IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbW9udGhzW2RhdGUuZ2V0TW9udGgoKV07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgTTogZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBtb250aEFiYnJbZGF0ZS5nZXRNb250aCgpXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZDogZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYWQoZGF0ZS5nZXREYXRlKCkpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGQ6IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZS5nZXREYXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGF0ZXMsXG5cbiAgICAgICAgbGVuZ3RoID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyXG4gICAgICAgICAgICAgICAgc2VjID0gMTAwMCxcbiAgICAgICAgICAgICAgICBtaW4gPSBzZWMgKiA2MCxcbiAgICAgICAgICAgICAgICBociA9IG1pbiAqIDYwLFxuICAgICAgICAgICAgICAgIGRheSA9IGhyICogMjQsXG4gICAgICAgICAgICAgICAgd2VlayA9IGRheSAqIDc7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHNlYzogc2VjLFxuICAgICAgICAgICAgICAgIG1pbjogbWluLFxuICAgICAgICAgICAgICAgIGhyOiBocixcbiAgICAgICAgICAgICAgICBkYXk6IGRheSxcbiAgICAgICAgICAgICAgICB3ZWVrOiB3ZWVrXG4gICAgICAgICAgICB9O1xuICAgICAgICB9KCkpO1xuXG4gICAgLy8gcG9wdWxhdGUgZGF5LXJlbGF0ZWQgc3RydWN0dXJlc1xuICAgIGRheXNPZldlZWsuZm9yRWFjaChmdW5jdGlvbihkYXksIGluZGV4KSB7XG4gICAgICAgIGRheURpY3RbZGF5XSA9IGluZGV4O1xuICAgICAgICB2YXIgYWJiciA9IGRheS5zdWJzdHIoMCwgMik7XG4gICAgICAgIGRheXMucHVzaChhYmJyKTtcbiAgICAgICAgZGF5RGljdFthYmJyXSA9IGluZGV4O1xuICAgICAgICBhYmJyID0gZGF5LnN1YnN0cigwLCAzKTtcbiAgICAgICAgZGF5czMucHVzaChhYmJyKTtcbiAgICAgICAgZGF5RGljdFthYmJyXSA9IGluZGV4O1xuICAgIH0pO1xuXG4gICAgLy8gcG9wdWxhdGUgbW9udGgtcmVsYXRlZCBzdHJ1Y3R1cmVzXG4gICAgbW9udGhzLmZvckVhY2goZnVuY3Rpb24obW9udGgsIGluZGV4KSB7XG4gICAgICAgIG1vbnRoRGljdFttb250aF0gPSBpbmRleDtcbiAgICAgICAgdmFyIGFiYnIgPSBtb250aC5zdWJzdHIoMCwgMyk7XG4gICAgICAgIG1vbnRoQWJici5wdXNoKGFiYnIpO1xuICAgICAgICBtb250aERpY3RbYWJicl0gPSBpbmRleDtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGlzTGVhcFllYXIoZGF0ZU9yWWVhcikge1xuICAgICAgICB2YXIgeWVhciA9IGRhdGVPclllYXIgaW5zdGFuY2VvZiBEYXRlID8gZGF0ZU9yWWVhci5nZXRGdWxsWWVhcigpIDogZGF0ZU9yWWVhcjtcbiAgICAgICAgcmV0dXJuICEoeWVhciAlIDQwMCkgfHwgKCEoeWVhciAlIDQpICYmICEhKHllYXIgJSAxMDApKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1ZhbGlkT2JqZWN0IChkYXRlKSB7XG4gICAgICAgIHZhciBtcztcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlID09PSAnb2JqZWN0JyAmJiBkYXRlIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICAgICAgbXMgPSBkYXRlLmdldFRpbWUoKTtcbiAgICAgICAgICAgIHJldHVybiAhaXNOYU4obXMpICYmIG1zID4gMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNEYXRlVHlwZSh2YWx1ZSkge1xuICAgICAgICB2YXIgcGFydHMsIGRheSwgbW9udGgsIHllYXIsIGhvdXJzLCBtaW51dGVzLCBzZWNvbmRzLCBtcztcbiAgICAgICAgc3dpdGNoICh0eXBlb2YgdmFsdWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGlzVmFsaWRPYmplY3QodmFsdWUpO1xuICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICAvLyBpcyBpdCBhIGRhdGUgaW4gVVMgZm9ybWF0P1xuICAgICAgICAgICAgICAgIHBhcnRzID0gZGF0ZVJlZ0V4cC5leGVjKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAocGFydHMgJiYgcGFydHNbMl0gPT09IHBhcnRzWzRdKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vbnRoID0gK3BhcnRzWzFdO1xuICAgICAgICAgICAgICAgICAgICBkYXkgPSArcGFydHNbM107XG4gICAgICAgICAgICAgICAgICAgIHllYXIgPSArcGFydHNbNV07XG4gICAgICAgICAgICAgICAgICAgIC8vIHJvdWdoIGNoZWNrIG9mIGEgeWVhclxuICAgICAgICAgICAgICAgICAgICBpZiAoMCA8IHllYXIgJiYgeWVhciA8IDIxMDAgJiYgMSA8PSBtb250aCAmJiBtb250aCA8PSAxMiAmJiAxIDw9IGRheSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgZGF5IDw9IChtb250aCA9PT0gMiAmJiBpc0xlYXBZZWFyKHllYXIpID8gMjkgOiBtb250aExlbmd0aHNbbW9udGggLSAxXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGlzIGl0IGEgdGltZXN0YW1wIGluIGEgc3RhbmRhcmQgZm9ybWF0P1xuICAgICAgICAgICAgICAgIHBhcnRzID0gdHNSZWdFeHAuZXhlYyh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHllYXIgPSArcGFydHNbMV07XG4gICAgICAgICAgICAgICAgICAgIG1vbnRoID0gK3BhcnRzWzJdO1xuICAgICAgICAgICAgICAgICAgICBkYXkgPSArcGFydHNbM107XG4gICAgICAgICAgICAgICAgICAgIGhvdXJzID0gK3BhcnRzWzRdO1xuICAgICAgICAgICAgICAgICAgICBtaW51dGVzID0gK3BhcnRzWzVdO1xuICAgICAgICAgICAgICAgICAgICBzZWNvbmRzID0gK3BhcnRzWzZdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoMCA8IHllYXIgJiYgeWVhciA8IDIxMDAgJiYgMSA8PSBtb250aCAmJiBtb250aCA8PSAxMiAmJiAxIDw9IGRheSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgZGF5IDw9IChtb250aCA9PT0gMiAmJiBpc0xlYXBZZWFyKHllYXIpID8gMjkgOiBtb250aExlbmd0aHNbbW9udGggLSAxXSkgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvdXJzIDwgMjQgJiYgbWludXRlcyA8IDYwICYmIHNlY29uZHMgPCA2MCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBpbnRlbnRpb25hbCBmYWxsLWRvd25cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFkKG51bSkge1xuICAgICAgICByZXR1cm4gKG51bSA8IDEwID8gJzAnIDogJycpICsgbnVtO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1vbnRoKGRhdGVPckluZGV4KSB7XG4gICAgICAgIHJldHVybiB0eXBlb2YgZGF0ZU9ySW5kZXggPT09ICdudW1iZXInID8gZGF0ZU9ySW5kZXggOiBkYXRlT3JJbmRleC5nZXRNb250aCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1vbnRoSW5kZXgobmFtZSkge1xuICAgICAgICAvLyBUT0RPOiBkbyB3ZSByZWFsbHkgd2FudCBhIDAtYmFzZWQgaW5kZXg/IG9yIHNob3VsZCBpdCBiZSBhIDEtYmFzZWQgb25lP1xuICAgICAgICB2YXIgaW5kZXggPSBtb250aERpY3RbbmFtZV07XG4gICAgICAgIHJldHVybiB0eXBlb2YgaW5kZXggPT09ICdudW1iZXInID8gaW5kZXggOiB2b2lkIDA7XG4gICAgICAgIC8vIFRPRE86IHdlIHJldHVybiB1bmRlZmluZWQgZm9yIHdyb25nIG1vbnRoIG5hbWVzIC0tLSBpcyBpdCByaWdodD9cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNb250aE5hbWUoZGF0ZSkge1xuICAgICAgICByZXR1cm4gbW9udGhzW2dldE1vbnRoKGRhdGUpXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRGaXJzdFN1bmRheShkYXRlKSB7XG4gICAgICAgIC8vIFRPRE86IHdoYXQgZG9lcyBpdCByZXR1cm4/IGEgbmVnYXRpdmUgaW5kZXggcmVsYXRlZCB0byB0aGUgMXN0IG9mIHRoZSBtb250aD9cbiAgICAgICAgdmFyIGQgPSBuZXcgRGF0ZShkYXRlLmdldFRpbWUoKSk7XG4gICAgICAgIGQuc2V0RGF0ZSgxKTtcbiAgICAgICAgcmV0dXJuIC1kLmdldERheSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldERheXNJblByZXZNb250aChkYXRlKSB7XG4gICAgICAgIHZhciBkID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgIGQuc2V0TW9udGgoZC5nZXRNb250aCgpIC0gMSk7XG4gICAgICAgIHJldHVybiBnZXREYXlzSW5Nb250aChkKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXREYXlzSW5Nb250aChkYXRlKSB7XG4gICAgICAgIHZhciBtb250aCA9IGRhdGUuZ2V0TW9udGgoKTtcbiAgICAgICAgcmV0dXJuIG1vbnRoID09PSAxICYmIGlzTGVhcFllYXIoZGF0ZSkgPyAyOSA6IG1vbnRoTGVuZ3Roc1ttb250aF07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3RyVG9EYXRlKHN0cikge1xuICAgICAgICBpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGVzLnRpbWVzdGFtcC5pcyhzdHIpKSB7XG4gICAgICAgICAgICAvLyAyMDAwLTAyLTI5VDAwOjAwOjAwXG4gICAgICAgICAgICByZXR1cm4gZGF0ZXMudGltZXN0YW1wLmZyb20oc3RyKTtcbiAgICAgICAgfVxuICAgICAgICAvLyAxMS8yMC8yMDAwXG4gICAgICAgIHZhciBwYXJ0cyA9IGRhdGVSZWdFeHAuZXhlYyhzdHIpO1xuICAgICAgICBpZiAocGFydHMgJiYgcGFydHNbMl0gPT09IHBhcnRzWzRdKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoK3BhcnRzWzVdLCArcGFydHNbMV0gLSAxLCArcGFydHNbM10pO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE86IHdoYXQgdG8gcmV0dXJuIGZvciBhbiBpbnZhbGlkIGRhdGU/IG51bGw/XG4gICAgICAgIHJldHVybiBuZXcgRGF0ZSgtMSk7IC8vIGludmFsaWQgZGF0ZVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZvcm1hdERhdGVQYXR0ZXJuKGRhdGUsIHBhdHRlcm4pIHtcbiAgICAgICAgLy8gJ00gZCwgeXl5eScgRGVjIDUsIDIwMTVcbiAgICAgICAgLy8gJ01NIGRkIHl5JyBEZWNlbWJlciAwNSAxNVxuICAgICAgICAvLyAnbS1kLXl5JyAxLTEtMTVcbiAgICAgICAgLy8gJ21tLWRkLXl5eXknIDAxLTAxLTIwMTVcbiAgICAgICAgLy8gJ20vZC95eScgMTIvMjUvMTVcblxuICAgICAgICByZXR1cm4gcGF0dGVybi5yZXBsYWNlKGRhdGVQYXR0ZXJuLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0ZVBhdHRlcm5MaWJyYXJ5W25hbWVdKGRhdGUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmb3JtYXREYXRlKGRhdGUsIGRlbGltaXRlck9yUGF0dGVybikge1xuICAgICAgICBpZiAoZGVsaW1pdGVyT3JQYXR0ZXJuICYmIGRlbGltaXRlck9yUGF0dGVybi5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0RGF0ZVBhdHRlcm4oZGF0ZSwgZGVsaW1pdGVyT3JQYXR0ZXJuKTtcbiAgICAgICAgfVxuICAgICAgICB2YXJcbiAgICAgICAgICAgIGRlbCA9IGRlbGltaXRlck9yUGF0dGVybiB8fCAnLycsXG4gICAgICAgICAgICB5ID0gZGF0ZS5nZXRGdWxsWWVhcigpLFxuICAgICAgICAgICAgbSA9IGRhdGUuZ2V0TW9udGgoKSArIDEsXG4gICAgICAgICAgICBkID0gZGF0ZS5nZXREYXRlKCk7XG5cbiAgICAgICAgcmV0dXJuIFtwYWQobSksIHBhZChkKSwgeV0uam9pbihkZWwpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRhdGVUb1N0cihkYXRlLCBkZWxpbWl0ZXIpIHtcbiAgICAgICAgcmV0dXJuIGZvcm1hdERhdGUoZGF0ZSwgZGVsaW1pdGVyKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmb3JtYXRUaW1lKGRhdGUsIHVzZVBlcmlvZCkge1xuICAgICAgICBpZiAodHlwZW9mIGRhdGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBkYXRlID0gc3RyVG9EYXRlKGRhdGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyXG4gICAgICAgICAgICBwZXJpb2QgPSAnQU0nLFxuICAgICAgICAgICAgaG91cnMgPSBkYXRlLmdldEhvdXJzKCksXG4gICAgICAgICAgICBtaW51dGVzID0gZGF0ZS5nZXRNaW51dGVzKCksXG4gICAgICAgICAgICByZXR2YWwsXG4gICAgICAgICAgICBzZWNvbmRzID0gZGF0ZS5nZXRTZWNvbmRzKCk7XG5cbiAgICAgICAgaWYgKGhvdXJzID4gMTEpIHtcbiAgICAgICAgICAgIGhvdXJzIC09IDEyO1xuICAgICAgICAgICAgcGVyaW9kID0gJ1BNJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaG91cnMgPT09IDApIHtcbiAgICAgICAgICAgIGhvdXJzID0gMTI7XG4gICAgICAgIH1cblxuICAgICAgICByZXR2YWwgPSBob3VycyArICc6JyArIHBhZChtaW51dGVzKSArICc6JyArIHBhZChzZWNvbmRzKTtcblxuICAgICAgICBpZiAodXNlUGVyaW9kID09IHRydWUpIHtcbiAgICAgICAgICAgIHJldHZhbCA9IHJldHZhbCArICcgJyArIHBlcmlvZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGVyaW9kKGRhdGUpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZGF0ZSA9IHN0clRvRGF0ZShkYXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBob3VycyA9IGRhdGUuZ2V0SG91cnMoKTtcblxuICAgICAgICByZXR1cm4gaG91cnMgPiAxMSA/ICdQTScgOiAnQU0nO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRvSVNPKGRhdGUsIGluY2x1ZGVUWikge1xuICAgICAgICB2YXJcbiAgICAgICAgICAgIHN0cixcbiAgICAgICAgICAgIG5vdyA9IG5ldyBEYXRlKCksXG4gICAgICAgICAgICB0aGVuID0gbmV3IERhdGUoZGF0ZS5nZXRUaW1lKCkpO1xuICAgICAgICB0aGVuLnNldEhvdXJzKG5vdy5nZXRIb3VycygpKTtcbiAgICAgICAgc3RyID0gdGhlbi50b0lTT1N0cmluZygpO1xuICAgICAgICBpZiAoIWluY2x1ZGVUWikge1xuICAgICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCcuJylbMF07XG4gICAgICAgICAgICBzdHIgKz0gJy4wMFonO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbmF0dXJhbChkYXRlKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZGF0ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGRhdGUgPSB0aGlzLmZyb20oZGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXJcbiAgICAgICAgICAgIHllYXIgPSBkYXRlLmdldEZ1bGxZZWFyKCkudG9TdHJpbmcoKS5zdWJzdHIoMiksXG4gICAgICAgICAgICBtb250aCA9IGRhdGUuZ2V0TW9udGgoKSArIDEsXG4gICAgICAgICAgICBkYXkgPSBkYXRlLmdldERhdGUoKSxcbiAgICAgICAgICAgIGhvdXJzID0gZGF0ZS5nZXRIb3VycygpLFxuICAgICAgICAgICAgbWludXRlcyA9IGRhdGUuZ2V0TWludXRlcygpLFxuICAgICAgICAgICAgcGVyaW9kID0gJ0FNJztcblxuICAgICAgICBpZiAoaG91cnMgPiAxMSkge1xuICAgICAgICAgICAgaG91cnMgLT0gMTI7XG4gICAgICAgICAgICBwZXJpb2QgPSAnUE0nO1xuICAgICAgICB9XG4gICAgICAgIGlmIChob3VycyA9PT0gMCkge1xuICAgICAgICAgICAgaG91cnMgPSAxMjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBob3VycyArICc6JyArIHBhZChtaW51dGVzKSArICcgJyArIHBlcmlvZCArICcgb24gJyArIHBhZChtb250aCkgKyAnLycgKyBwYWQoZGF5KSArICcvJyArIHllYXI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkRGF5cyAoZGF0ZSwgZGF5cykge1xuICAgICAgICBjb25zb2xlLndhcm4oJ2FkZERheXMgaXMgZGVwcmVjYXRlZC4gSW5zdGVhZCwgdXNlIGBhZGRgJyk7XG4gICAgICAgIHJldHVybiBhZGQoZGF0ZSwgZGF5cyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkIChkYXRlLCBhbW91bnQsIGRhdGVUeXBlKSB7XG4gICAgICAgIHJldHVybiBzdWJ0cmFjdChkYXRlLCAtYW1vdW50LCBkYXRlVHlwZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3VidHJhY3QoZGF0ZSwgYW1vdW50LCBkYXRlVHlwZSkge1xuICAgICAgICAvLyBzdWJ0cmFjdCBOIGRheXMgZnJvbSBkYXRlXG4gICAgICAgIHZhclxuICAgICAgICAgICAgdGltZSA9IGRhdGUuZ2V0VGltZSgpLFxuICAgICAgICAgICAgdG1wID0gbmV3IERhdGUodGltZSk7XG5cbiAgICAgICAgaWYoZGF0ZVR5cGUgPT09ICdtb250aCcpe1xuICAgICAgICAgICAgdG1wLnNldE1vbnRoKHRtcC5nZXRNb250aCgpIC0gYW1vdW50KTtcbiAgICAgICAgICAgIHJldHVybiB0bXA7XG4gICAgICAgIH1cbiAgICAgICAgaWYoZGF0ZVR5cGUgPT09ICd5ZWFyJyl7XG4gICAgICAgICAgICB0bXAuc2V0RnVsbFllYXIodG1wLmdldEZ1bGxZZWFyKCkgLSBhbW91bnQpO1xuICAgICAgICAgICAgcmV0dXJuIHRtcDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXcgRGF0ZSh0aW1lIC0gbGVuZ3RoLmRheSAqIGFtb3VudCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3VidHJhY3REYXRlKGRhdGUxLCBkYXRlMiwgZGF0ZVR5cGUpIHtcbiAgICAgICAgLy8gZGF0ZVR5cGU6IHdlZWssIGRheSwgaHIsIG1pbiwgc2VjXG4gICAgICAgIC8vIHBhc3QgZGF0ZXMgaGF2ZSBhIHBvc2l0aXZlIHZhbHVlXG4gICAgICAgIC8vIGZ1dHVyZSBkYXRlcyBoYXZlIGEgbmVnYXRpdmUgdmFsdWVcblxuICAgICAgICB2YXIgZGl2aWRlQnkgPSB7XG4gICAgICAgICAgICAgICAgd2VlazogbGVuZ3RoLndlZWssXG4gICAgICAgICAgICAgICAgZGF5OiBsZW5ndGguZGF5LFxuICAgICAgICAgICAgICAgIGhyOiBsZW5ndGguaHIsXG4gICAgICAgICAgICAgICAgbWluOiBsZW5ndGgubWluLFxuICAgICAgICAgICAgICAgIHNlYzogbGVuZ3RoLnNlY1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHV0YzEgPSBEYXRlLlVUQyhkYXRlMS5nZXRGdWxsWWVhcigpLCBkYXRlMS5nZXRNb250aCgpLCBkYXRlMS5nZXREYXRlKCkpLFxuICAgICAgICAgICAgdXRjMiA9IERhdGUuVVRDKGRhdGUyLmdldEZ1bGxZZWFyKCksIGRhdGUyLmdldE1vbnRoKCksIGRhdGUyLmdldERhdGUoKSk7XG5cbiAgICAgICAgZGF0ZVR5cGUgPSBkYXRlVHlwZS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKCh1dGMyIC0gdXRjMSkgLyBkaXZpZGVCeVtkYXRlVHlwZV0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzTGVzcyAoZDEsIGQyKSB7XG4gICAgICAgIGlmKGlzVmFsaWRPYmplY3QoZDEpICYmIGlzVmFsaWRPYmplY3QoZDIpKXtcbiAgICAgICAgICAgIHJldHVybiBkMS5nZXRUaW1lKCkgPCBkMi5nZXRUaW1lKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzR3JlYXRlciAoZDEsIGQyKSB7XG4gICAgICAgIGlmKGlzVmFsaWRPYmplY3QoZDEpICYmIGlzVmFsaWRPYmplY3QoZDIpKXtcbiAgICAgICAgICAgIHJldHVybiBkMS5nZXRUaW1lKCkgPiBkMi5nZXRUaW1lKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpZmYoZGF0ZTEsIGRhdGUyKSB7XG4gICAgICAgIC8vIHJldHVybiB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIDIgZGF0ZXMgaW4gZGF5c1xuICAgICAgICB2YXIgdXRjMSA9IERhdGUuVVRDKGRhdGUxLmdldEZ1bGxZZWFyKCksIGRhdGUxLmdldE1vbnRoKCksIGRhdGUxLmdldERhdGUoKSksXG4gICAgICAgICAgICB1dGMyID0gRGF0ZS5VVEMoZGF0ZTIuZ2V0RnVsbFllYXIoKSwgZGF0ZTIuZ2V0TW9udGgoKSwgZGF0ZTIuZ2V0RGF0ZSgpKTtcblxuICAgICAgICByZXR1cm4gTWF0aC5hYnMoTWF0aC5mbG9vcigodXRjMiAtIHV0YzEpIC8gbGVuZ3RoLmRheSkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvcHkgKGRhdGUpIHtcbiAgICAgICAgaWYoaXNWYWxpZE9iamVjdChkYXRlKSl7XG4gICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoZGF0ZS5nZXRUaW1lKCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE5hdHVyYWxEYXkoZGF0ZSwgY29tcGFyZURhdGUsIG5vRGF5c09mV2Vlaykge1xuXG4gICAgICAgIHZhclxuICAgICAgICAgICAgdG9kYXkgPSBjb21wYXJlRGF0ZSB8fCBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgZGF5c0FnbyA9IHN1YnRyYWN0RGF0ZShkYXRlLCB0b2RheSwgJ2RheScpO1xuXG4gICAgICAgIGlmICghZGF5c0Fnbykge1xuICAgICAgICAgICAgcmV0dXJuICdUb2RheSc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRheXNBZ28gPT09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiAnWWVzdGVyZGF5JztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkYXlzQWdvID09PSAtMSkge1xuICAgICAgICAgICAgcmV0dXJuICdUb21vcnJvdyc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGF5c0FnbyA8IC0xKSB7XG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0RGF0ZShkYXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAhbm9EYXlzT2ZXZWVrICYmIGRheXNBZ28gPCBkYXlzT2ZXZWVrLmxlbmd0aCA/IGRheXNPZldlZWtbZGF0ZS5nZXREYXkoKV0gOiBmb3JtYXREYXRlKGRhdGUpO1xuICAgIH1cblxuICAgIGRhdGVzID0ge1xuICAgICAgICBtb250aHM6IHtcbiAgICAgICAgICAgIGZ1bGw6IG1vbnRocyxcbiAgICAgICAgICAgIGFiYnI6IG1vbnRoQWJicixcbiAgICAgICAgICAgIGRpY3Q6IG1vbnRoRGljdFxuICAgICAgICB9LFxuICAgICAgICBkYXlzOiB7XG4gICAgICAgICAgICBmdWxsOiBkYXlzT2ZXZWVrLFxuICAgICAgICAgICAgYWJicjogZGF5cyxcbiAgICAgICAgICAgIGFiYnIzOiBkYXlzMyxcbiAgICAgICAgICAgIGRpY3Q6IGRheURpY3RcbiAgICAgICAgfSxcbiAgICAgICAgbGVuZ3RoOiBsZW5ndGgsXG4gICAgICAgIHN1YnRyYWN0OiBzdWJ0cmFjdCxcbiAgICAgICAgYWRkOiBhZGQsXG4gICAgICAgIGFkZERheXM6IGFkZERheXMsXG4gICAgICAgIGRpZmY6IGRpZmYsXG4gICAgICAgIGNvcHk6IGNvcHksXG4gICAgICAgIGNsb25lOiBjb3B5LFxuICAgICAgICBpc0xlc3M6IGlzTGVzcyxcbiAgICAgICAgaXNHcmVhdGVyOiBpc0dyZWF0ZXIsXG4gICAgICAgIHRvSVNPOiB0b0lTTyxcbiAgICAgICAgaXNWYWxpZE9iamVjdDogaXNWYWxpZE9iamVjdCxcbiAgICAgICAgaXNWYWxpZDogaXNEYXRlVHlwZSxcbiAgICAgICAgaXNEYXRlVHlwZTogaXNEYXRlVHlwZSxcbiAgICAgICAgaXNMZWFwWWVhcjogaXNMZWFwWWVhcixcbiAgICAgICAgZ2V0TW9udGhJbmRleDogZ2V0TW9udGhJbmRleCxcbiAgICAgICAgZ2V0TW9udGhOYW1lOiBnZXRNb250aE5hbWUsXG4gICAgICAgIGdldEZpcnN0U3VuZGF5OiBnZXRGaXJzdFN1bmRheSxcbiAgICAgICAgZ2V0RGF5c0luTW9udGg6IGdldERheXNJbk1vbnRoLFxuICAgICAgICBnZXREYXlzSW5QcmV2TW9udGg6IGdldERheXNJblByZXZNb250aCxcbiAgICAgICAgZm9ybWF0RGF0ZTogZm9ybWF0RGF0ZSxcbiAgICAgICAgZm9ybWF0VGltZTogZm9ybWF0VGltZSxcbiAgICAgICAgc3RyVG9EYXRlOiBzdHJUb0RhdGUsXG4gICAgICAgIHN1YnRyYWN0RGF0ZTogc3VidHJhY3REYXRlLFxuICAgICAgICBkYXRlVG9TdHI6IGRhdGVUb1N0cixcbiAgICAgICAgcGVyaW9kOiBwZXJpb2QsXG4gICAgICAgIG5hdHVyYWw6IG5hdHVyYWwsXG4gICAgICAgIGdldE5hdHVyYWxEYXk6IGdldE5hdHVyYWxEYXksXG4gICAgICAgIHBhZDogcGFkLFxuICAgICAgICB0aW1lc3RhbXA6IHtcbiAgICAgICAgICAgIHRvOiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGUuZ2V0RnVsbFllYXIoKSArICctJyArIHBhZChkYXRlLmdldE1vbnRoKCkgKyAxKSArICctJyArIHBhZChkYXRlLmdldERhdGUoKSkgKyAnVCcgK1xuICAgICAgICAgICAgICAgICAgICBwYWQoZGF0ZS5nZXRIb3VycygpKSArICc6JyArIHBhZChkYXRlLmdldE1pbnV0ZXMoKSkgKyAnOicgKyBwYWQoZGF0ZS5nZXRTZWNvbmRzKCkpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZyb206IGZ1bmN0aW9uKHN0cikge1xuICAgICAgICAgICAgICAgIC8vIDIwMTUtMDUtMjZUMDA6MDA6MDBcblxuICAgICAgICAgICAgICAgIC8vIHN0cmlwIHRpbWV6b25lIC8vIDIwMTUtMDUtMjZUMDA6MDA6MDBaXG4gICAgICAgICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdaJylbMF07XG5cbiAgICAgICAgICAgICAgICAvLyBbXCIyMDAwLTAyLTMwVDAwOjAwOjAwXCIsIFwiMjAwMFwiLCBcIjAyXCIsIFwiMzBcIiwgXCIwMFwiLCBcIjAwXCIsIFwiMDBcIiwgaW5kZXg6IDAsIGlucHV0OiBcIjIwMDAtMDItMzBUMDA6MDA6MDBcIl1cbiAgICAgICAgICAgICAgICB2YXIgcGFydHMgPSB0c1JlZ0V4cC5leGVjKHN0cik7XG4gICAgICAgICAgICAgICAgLy8gVE9ETzogZG8gd2UgbmVlZCBhIHZhbGlkYXRpb24/XG4gICAgICAgICAgICAgICAgaWYgKHBhcnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG5ldyBEYXRlKDE5OTUsIDExLCAxNywgMywgMjQsIDApO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoK3BhcnRzWzFdLCArcGFydHNbMl0gLSAxLCArcGFydHNbM10sICtwYXJ0c1s0XSwgK3BhcnRzWzVdLCBwYXJzZUludChwYXJ0c1s2XSwgMTApKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gVE9ETzogd2hhdCBkbyB3ZSByZXR1cm4gZm9yIGFuIGludmFsaWQgZGF0ZT8gbnVsbD9cbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoLTEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlzOiBmdW5jdGlvbihzdHIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHNSZWdFeHAudGVzdChzdHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBkYXRlcztcblxufSkpOyIsInJlcXVpcmUoJy4vZGF0ZS1waWNrZXInKTtcbmNvbnN0IEJhc2VDb21wb25lbnQgPSByZXF1aXJlKCdCYXNlQ29tcG9uZW50Jyk7XG5jb25zdCBkYXRlcyA9IHJlcXVpcmUoJ2RhdGVzJyk7XG5cbmNvbnN0IGRlZmF1bHRQbGFjZWhvbGRlciA9ICdNTS9ERC9ZWVlZJztcbmNvbnN0IHByb3BzID0gWydsYWJlbCcsICduYW1lJywgJ3R5cGUnLCAncGxhY2Vob2xkZXInLCAndmFsdWUnXTtcbmNvbnN0IGJvb2xzID0gW107XG5cbmNsYXNzIERhdGVJbnB1dCBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXG5cdHN0YXRpYyBnZXQgb2JzZXJ2ZWRBdHRyaWJ1dGVzICgpIHtcblx0XHRyZXR1cm4gWy4uLnByb3BzLCAuLi5ib29sc107XG5cdH1cblxuXHRnZXQgcHJvcHMgKCkge1xuXHRcdHJldHVybiBwcm9wcztcblx0fVxuXG5cdGdldCBib29scyAoKSB7XG5cdFx0cmV0dXJuIGJvb2xzO1xuXHR9XG5cblx0c2V0IHZhbHVlICh2YWx1ZSkge1xuXHRcdC8vIG1pZ2h0IG5lZWQgYXR0cmlidXRlQ2hhbmdlZFxuXHRcdHRoaXMuc3RyRGF0ZSA9IGRhdGVzLmlzRGF0ZVR5cGUodmFsdWUpID8gdmFsdWUgOiAnJztcblx0XHRvbkRvbVJlYWR5KHRoaXMsICgpID0+IHtcblx0XHRcdHRoaXMuc2V0VmFsdWUodGhpcy5zdHJEYXRlKTtcblx0XHR9KTtcblx0fVxuXG5cdG9uVmFsdWUgKHZhbHVlKSB7XG5cdFx0dGhpcy5zdHJEYXRlID0gZGF0ZXMuaXNEYXRlVHlwZSh2YWx1ZSkgPyB2YWx1ZSA6ICcnO1xuXHRcdHRoaXMuc2V0VmFsdWUodGhpcy5zdHJEYXRlKTtcblx0fVxuXG5cdGdldCB2YWx1ZSAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuc3RyRGF0ZTtcblx0fVxuXHRcblx0Z2V0IHRlbXBsYXRlU3RyaW5nICgpIHtcblx0XHRyZXR1cm4gYFxuPGxhYmVsPlxuXHQ8c3BhbiByZWY9XCJsYWJlbE5vZGVcIj48L3NwYW4+XG5cdDxpbnB1dCByZWY9XCJpbnB1dFwiIC8+XG5cdFxuPC9sYWJlbD5cbjxkYXRlLXBpY2tlciByZWY9XCJwaWNrZXJcIiB0YWJpbmRleD1cIjBcIj48L2RhdGUtcGlja2VyPmA7XG5cdH1cblxuXHRjb25zdHJ1Y3RvciAoKSB7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLnNob3dpbmcgPSBmYWxzZTtcblx0fVxuXG5cdHNldFZhbHVlICh2YWx1ZSkge1xuXHRcdHRoaXMudHlwZWRWYWx1ZSA9IHZhbHVlO1xuXHRcdHRoaXMuaW5wdXQudmFsdWUgPSB2YWx1ZTtcblx0XHRjb25zdCBsZW4gPSB0aGlzLmlucHV0LnZhbHVlLmxlbmd0aCA9PT0gMTA7XG5cdFx0bGV0IHZhbGlkO1xuXHRcdGlmIChsZW4pIHtcblx0XHRcdHZhbGlkID0gZGF0ZXMuaXNWYWxpZCh2YWx1ZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHZhbGlkID0gdHJ1ZTtcblx0XHR9XG5cdFx0ZG9tLmNsYXNzTGlzdC50b2dnbGUodGhpcywgJ2ludmFsaWQnLCAhdmFsaWQpO1xuXHRcdGlmKHZhbGlkICYmIGxlbil7XG5cdFx0XHR0aGlzLnBpY2tlci52YWx1ZSA9IHZhbHVlO1xuXHRcdFx0dGhpcy5lbWl0KCdjaGFuZ2UnLCB7dmFsdWU6IHZhbHVlfSk7XG5cdFx0fVxuXHR9XG5cblx0b25LZXkgKGUpIHtcblx0XHRsZXQgc3RyID0gdGhpcy50eXBlZFZhbHVlO1xuXHRcdGNvbnN0IGsgPSBlLmtleTtcblx0XHRpZihjb250cm9sW2tdKXtcblx0XHRcdGlmKGsgPT09ICdCYWNrc3BhY2UnKXtcblx0XHRcdFx0Ly8gVE9ETzogY2hlY2sgRGVsZXRlIGtleVxuXHRcdFx0XHR0aGlzLnNldFZhbHVlKHRoaXMuaW5wdXQudmFsdWUpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRpZighaXNOdW0oaykpe1xuXHRcdFx0c3RvcEV2ZW50KGUpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRzd2l0Y2goc3RyLmxlbmd0aCl7XG5cdFx0XHRjYXNlIDA6XG5cdFx0XHRjYXNlIDE6XG5cdFx0XHRjYXNlIDM6XG5cdFx0XHRjYXNlIDQ6XG5cdFx0XHRjYXNlIDY6XG5cdFx0XHRjYXNlIDc6XG5cdFx0XHRjYXNlIDg6XG5cdFx0XHRjYXNlIDk6XG5cdFx0XHRcdHN0ciArPSBrO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgMjpcblx0XHRcdGNhc2UgNTpcblx0XHRcdFx0c3RyICs9ICcvJyArIGs7XG5cdFx0fVxuXHRcdHRoaXMuc2V0VmFsdWUoc3RyKTtcblx0fVxuXG5cdHNob3cgKCkge1xuXHRcdGlmKHRoaXMuc2hvd2luZyl7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHRoaXMuc2hvd2luZyA9IHRydWU7XG5cdFx0dGhpcy5waWNrZXIuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG5cdH1cblxuXHRoaWRlICgpIHtcblx0XHRpZighdGhpcy5zaG93aW5nKXtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dGhpcy5zaG93aW5nID0gZmFsc2U7XG5cdFx0dGhpcy5waWNrZXIuc3R5bGUuZGlzcGxheSA9ICcnO1xuXHR9XG5cblx0ZG9tUmVhZHkgKCkge1xuXHRcdHRoaXMubGFiZWxOb2RlLmlubmVySFRNTCA9IHRoaXMubGFiZWwgfHwgJyc7XG5cdFx0dGhpcy5pbnB1dC5zZXRBdHRyaWJ1dGUoJ3R5cGUnLCAndGV4dCcpO1xuXHRcdHRoaXMuaW5wdXQuc2V0QXR0cmlidXRlKCdwbGFjZWhvbGRlcicsIHRoaXMucGxhY2Vob2xkZXIgfHwgZGVmYXVsdFBsYWNlaG9sZGVyKTtcblx0XHR0aGlzLm9uKHRoaXMuaW5wdXQsICdrZXlkb3duJywgc3RvcEV2ZW50KTtcblx0XHR0aGlzLm9uKHRoaXMuaW5wdXQsICdrZXlwcmVzcycsIHN0b3BFdmVudCk7XG5cdFx0dGhpcy5vbih0aGlzLmlucHV0LCAna2V5dXAnLCB0aGlzLm9uS2V5LmJpbmQodGhpcykpO1xuXG5cdFx0dGhpcy5waWNrZXIub24oJ2NoYW5nZScsIChlKSA9PiB7XG5cdFx0XHR0aGlzLnNldFZhbHVlKGUudmFsdWUpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5yZWdpc3RlckhhbmRsZShoYW5kbGVPcGVuKHRoaXMuaW5wdXQsIHRoaXMucGlja2VyLCB0aGlzLnNob3cuYmluZCh0aGlzKSwgdGhpcy5oaWRlLmJpbmQodGhpcykpKTtcblx0fVxufVxuXG5mdW5jdGlvbiBoYW5kbGVPcGVuIChpbnB1dCwgcGlja2VyLCBzaG93LCBoaWRlKSB7XG5cdGxldCBpbnB1dEZvY3VzID0gZmFsc2U7XG5cdGxldCBwaWNrZXJGb2N1cyA9IGZhbHNlO1xuXHRjb25zdCBkb2NIYW5kbGUgPSBvbihkb2N1bWVudCwgJ2tleXVwJywgKGUpID0+IHtcblx0XHRpZihlLmtleSA9PT0gJ0VzY2FwZScpe1xuXHRcdFx0aGlkZSgpO1xuXHRcdH1cblx0fSk7XG5cdGRvY0hhbmRsZS5wYXVzZSgpO1xuXHRyZXR1cm4gb24ubWFrZU11bHRpSGFuZGxlKFtcblx0XHRvbihpbnB1dCwgJ2ZvY3VzJywgKCkgPT4ge1xuXHRcdFx0aW5wdXRGb2N1cyA9IHRydWU7XG5cdFx0XHRzaG93KCk7XG5cdFx0XHRkb2NIYW5kbGUucmVzdW1lKCk7XG5cdFx0fSksXG5cdFx0b24oaW5wdXQsICdibHVyJywgKCkgPT4ge1xuXHRcdFx0aW5wdXRGb2N1cyA9IGZhbHNlO1xuXHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRcdGlmKCFwaWNrZXJGb2N1cyl7XG5cdFx0XHRcdFx0aGlkZSgpO1xuXHRcdFx0XHRcdGRvY0hhbmRsZS5wYXVzZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LCAxMDApO1xuXHRcdH0pLFxuXHRcdG9uKHBpY2tlciwgJ2ZvY3VzJywgKCkgPT4ge1xuXHRcdFx0cGlja2VyRm9jdXMgPSB0cnVlO1xuXHRcdFx0c2hvdygpO1xuXHRcdFx0ZG9jSGFuZGxlLnJlc3VtZSgpO1xuXHRcdH0pLFxuXHRcdG9uKHBpY2tlciwgJ2JsdXInLCAoKSA9PiB7XG5cdFx0XHRwaWNrZXJGb2N1cyA9IGZhbHNlO1xuXHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRcdGlmKCFpbnB1dEZvY3VzKXtcblx0XHRcdFx0XHRoaWRlKCk7XG5cdFx0XHRcdFx0ZG9jSGFuZGxlLnBhdXNlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sIDEwMCk7XG5cblx0XHR9KVxuXHRdKTtcbn1cblxuY29uc3QgbnVtUmVnID0gL1swMTIzNDU2Nzg5XS87XG5mdW5jdGlvbiBpc051bSAoaykge1xuXHRyZXR1cm4gbnVtUmVnLnRlc3Qoayk7XG59XG5cbmNvbnN0IGNvbnRyb2wgPSB7XG5cdCdFbnRlcic6IDEsXG5cdCdCYWNrc3BhY2UnOiAxLFxuXHQnRGVsZXRlJzogMSxcblx0J0Fycm93TGVmdCc6IDEsXG5cdCdBcnJvd1JpZ2h0JzogMSxcblx0J0VzY2FwZSc6IDEsXG5cdCdDb21tYW5kJzogMSxcblx0J1RhYic6IDFcbn07XG5mdW5jdGlvbiBzdG9wRXZlbnQgKGUpIHtcblx0aWYoY29udHJvbFtlLmtleV0pe1xuXHRcdHJldHVybjtcblx0fVxuXHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnZGF0ZS1pbnB1dCcsIERhdGVJbnB1dCk7XG5cbm1vZHVsZS5leHBvcnRzID0gRGF0ZUlucHV0OyIsInJlcXVpcmUoJ0Jhc2VDb21wb25lbnQvc3JjL3Byb3BlcnRpZXMnKTtcbnJlcXVpcmUoJ0Jhc2VDb21wb25lbnQvc3JjL3RlbXBsYXRlJyk7XG5yZXF1aXJlKCdCYXNlQ29tcG9uZW50L3NyYy9yZWZzJyk7XG5jb25zdCBCYXNlQ29tcG9uZW50ID0gcmVxdWlyZSgnQmFzZUNvbXBvbmVudCcpO1xuY29uc3QgZGF0ZXMgPSByZXF1aXJlKCdkYXRlcycpO1xuXG5jb25zdCBwcm9wcyA9IFtdO1xuXG4vLyByYW5nZS1sZWZ0L3JhbmdlLXJpZ2h0IG1lYW4gdGhhdCB0aGlzIGlzIG9uZSBzaWRlIG9mIGEgZGF0ZS1yYW5nZS1waWNrZXJcbmNvbnN0IGJvb2xzID0gWydyYW5nZS1waWNrZXInLCAncmFuZ2UtbGVmdCcsICdyYW5nZS1yaWdodCddO1xuXG5jbGFzcyBEYXRlUGlja2VyIGV4dGVuZHMgQmFzZUNvbXBvbmVudCB7XG5cblx0c3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMgKCkge1xuXHRcdHJldHVybiBbLi4ucHJvcHMsIC4uLmJvb2xzXTtcblx0fVxuXG5cdGdldCBwcm9wcyAoKSB7XG5cdFx0cmV0dXJuIHByb3BzO1xuXHR9XG5cblx0Z2V0IGJvb2xzICgpIHtcblx0XHRyZXR1cm4gYm9vbHM7XG5cdH1cblxuXHRnZXQgdGVtcGxhdGVTdHJpbmcgKCkge1xuXHRcdHJldHVybiBgXG48ZGl2IGNsYXNzPVwiY2FsZW5kYXJcIiByZWY9XCJjYWxOb2RlXCI+XG48ZGl2IGNsYXNzPVwiY2FsLWhlYWRlclwiIHJlZj1cImhlYWRlck5vZGVcIj5cblx0PHNwYW4gY2xhc3M9XCJjYWwtbGZ0XCIgcmVmPVwibGZ0Tm9kZVwiPjwvc3Bhbj5cblx0PHNwYW4gY2xhc3M9XCJjYWwtbW9udGhcIiByZWY9XCJtb250aE5vZGVcIj48L3NwYW4+XG5cdDxzcGFuIGNsYXNzPVwiY2FsLXJndFwiIHJlZj1cInJndE5vZGVcIj48L3NwYW4+XG48L2Rpdj5cbjxkaXYgY2xhc3M9XCJjYWwtY29udGFpbmVyXCIgcmVmPVwiY29udGFpbmVyXCI+PC9kaXY+XG48ZGl2IGNsYXNzPVwiY2FsLWZvb3RlclwiPlxuXHQ8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApO1wiIHJlZj1cImZvb3RlckxpbmtcIj48L2E+XG48L2Rpdj5cbjwvZGl2PmA7XG5cdH1cblxuXHRzZXQgdmFsdWUgKHZhbHVlKSB7XG5cdFx0Ly8gbWlnaHQgbmVlZCBhdHRyaWJ1dGVDaGFuZ2VkXG5cdFx0dGhpcy52YWx1ZURhdGUgPSBkYXRlcy5pc0RhdGVUeXBlKHZhbHVlKSA/IGRhdGVzLnN0clRvRGF0ZSh2YWx1ZSkgOiB0b2RheTtcblx0XHR0aGlzLmN1cnJlbnQgPSB0aGlzLnZhbHVlRGF0ZTtcblx0XHRvbkRvbVJlYWR5KHRoaXMsICgpID0+IHtcblx0XHRcdHRoaXMucmVuZGVyKCk7XG5cdFx0fSk7XG5cdH1cblxuXHRnZXQgdmFsdWUgKCkge1xuXHRcdGlmICghdGhpcy52YWx1ZURhdGUpIHtcblx0XHRcdGNvbnN0IHZhbHVlID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJykgfHwgdG9kYXk7XG5cdFx0XHR0aGlzLnZhbHVlRGF0ZSA9IGRhdGVzLnN0clRvRGF0ZSh2YWx1ZSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLnZhbHVlRGF0ZTtcblx0fVxuXG5cdGNvbnN0cnVjdG9yICgpIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuY3VycmVudCA9IG5ldyBEYXRlKCk7XG5cdFx0dGhpcy5wcmV2aW91cyA9IHt9O1xuXHRcdHRoaXMubW9kZXMgPSBbJ21vbnRoJywgJ3llYXInLCAnZGVjYWRlJ107XG5cdFx0dGhpcy5tb2RlID0gMDtcblx0fVxuXG5cdHNldERpc3BsYXkgKC4uLmFyZ3MvKnllYXIsIG1vbnRoKi8pIHtcblx0XHRpZiAoYXJncy5sZW5ndGggPT09IDIpIHtcblx0XHRcdHRoaXMuY3VycmVudC5zZXRGdWxsWWVhcihhcmdzWzBdKTtcblx0XHRcdHRoaXMuY3VycmVudC5zZXRNb250aChhcmdzWzFdKTtcblx0XHR9IGVsc2UgaWYgKHR5cGVvZiBhcmdzWzBdID09PSAnb2JqZWN0Jykge1xuXHRcdFx0dGhpcy5jdXJyZW50LnNldEZ1bGxZZWFyKGFyZ3NbMF0uZ2V0RnVsbFllYXIoKSk7XG5cdFx0XHR0aGlzLmN1cnJlbnQuc2V0TW9udGgoYXJnc1swXS5nZXRNb250aCgpKTtcblx0XHR9IGVsc2UgaWYgKGFyZ3NbMF0gPiAxMikge1xuXHRcdFx0dGhpcy5jdXJyZW50LnNldEZ1bGxZZWFyKGFyZ3NbMF0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLmN1cnJlbnQuc2V0TW9udGgoYXJnc1swXSk7XG5cdFx0fVxuXHRcdHRoaXMudmFsdWVEYXRlID0gY29weSh0aGlzLmN1cnJlbnQpO1xuXHRcdHRoaXMubm9FdmVudHMgPSB0cnVlO1xuXHRcdHRoaXMucmVuZGVyKCk7XG5cdH1cblxuXHRnZXRGb3JtYXR0ZWRWYWx1ZSAoKSB7XG5cdFx0cmV0dXJuIHRoaXMudmFsdWVEYXRlID09PSB0b2RheSA/ICcnIDogISF0aGlzLnZhbHVlRGF0ZSA/IGRhdGVzLmRhdGVUb1N0cih0aGlzLnZhbHVlRGF0ZSkgOiAnJztcblx0fVxuXG5cdGVtaXRWYWx1ZSAoKSB7XG5cdFx0Ly8gVE9ETyBvcHRpb25zIGZvciB0aW1lc3RhbXAgb3Igb3RoZXIgZm9ybWF0c1xuXHRcdGNvbnN0IGV2ZW50ID0ge1xuXHRcdFx0dmFsdWU6IHRoaXMuZ2V0Rm9ybWF0dGVkVmFsdWUoKSxcblx0XHRcdGRhdGU6IHRoaXMudmFsdWVEYXRlXG5cdFx0fTtcblx0XHRpZiAodGhpc1sncmFuZ2UtcGlja2VyJ10pIHtcblx0XHRcdGV2ZW50LmZpcnN0ID0gdGhpcy5maXJzdFJhbmdlO1xuXHRcdFx0ZXZlbnQuc2Vjb25kID0gdGhpcy5zZWNvbmRSYW5nZTtcblx0XHR9XG5cdFx0dGhpcy5lbWl0KCdjaGFuZ2UnLCBldmVudCk7XG5cdH1cblxuXHRlbWl0RGlzcGxheUV2ZW50cyAoKSB7XG5cdFx0Y29uc3QgbW9udGggPSB0aGlzLmN1cnJlbnQuZ2V0TW9udGgoKSxcblx0XHRcdHllYXIgPSB0aGlzLmN1cnJlbnQuZ2V0RnVsbFllYXIoKTtcblxuXHRcdGlmICghdGhpcy5ub0V2ZW50cyAmJiAobW9udGggIT09IHRoaXMucHJldmlvdXMubW9udGggfHwgeWVhciAhPT0gdGhpcy5wcmV2aW91cy55ZWFyKSkge1xuXHRcdFx0dGhpcy5maXJlKCdkaXNwbGF5LWNoYW5nZScsIHsgbW9udGg6IG1vbnRoLCB5ZWFyOiB5ZWFyIH0pO1xuXHRcdH1cblxuXHRcdHRoaXMubm9FdmVudHMgPSBmYWxzZTtcblx0XHR0aGlzLnByZXZpb3VzID0ge1xuXHRcdFx0bW9udGg6IG1vbnRoLFxuXHRcdFx0eWVhcjogeWVhclxuXHRcdH07XG5cdH1cblxuXHRvbkNsaWNrRGF5IChub2RlKSB7XG5cdFx0dmFyXG5cdFx0XHRkYXkgPSArbm9kZS5pbm5lckhUTUwsXG5cdFx0XHRpc0Z1dHVyZSA9IG5vZGUuY2xhc3NMaXN0LmNvbnRhaW5zKCdmdXR1cmUnKSxcblx0XHRcdGlzUGFzdCA9IG5vZGUuY2xhc3NMaXN0LmNvbnRhaW5zKCdwYXN0Jyk7XG5cblx0XHR0aGlzLmN1cnJlbnQuc2V0RGF0ZShkYXkpO1xuXHRcdGlmIChpc0Z1dHVyZSkge1xuXHRcdFx0dGhpcy5jdXJyZW50LnNldE1vbnRoKHRoaXMuY3VycmVudC5nZXRNb250aCgpICsgMSk7XG5cdFx0fVxuXHRcdGlmIChpc1Bhc3QpIHtcblx0XHRcdHRoaXMuY3VycmVudC5zZXRNb250aCh0aGlzLmN1cnJlbnQuZ2V0TW9udGgoKSAtIDEpO1xuXHRcdH1cblxuXHRcdHRoaXMudmFsdWVEYXRlID0gY29weSh0aGlzLmN1cnJlbnQpO1xuXG5cdFx0dGhpcy5lbWl0VmFsdWUoKTtcblxuXHRcdGlmICh0aGlzWydyYW5nZS1waWNrZXInXSkge1xuXHRcdFx0dGhpcy5jbGlja1NlbGVjdFJhbmdlKCk7XG5cdFx0fVxuXG5cdFx0aWYgKGlzRnV0dXJlIHx8IGlzUGFzdCkge1xuXHRcdFx0dGhpcy5yZW5kZXIoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5zZWxlY3REYXkoKTtcblx0XHR9XG5cdH1cblxuXHRvbkNsaWNrTW9udGggKGRpcmVjdGlvbikge1xuXHRcdHN3aXRjaCAodGhpcy5tb2RlKSB7XG5cdFx0XHRjYXNlIDE6IC8vIHllYXIgbW9kZVxuXHRcdFx0XHR0aGlzLmN1cnJlbnQuc2V0RnVsbFllYXIodGhpcy5jdXJyZW50LmdldEZ1bGxZZWFyKCkgKyAoZGlyZWN0aW9uICogMSkpO1xuXHRcdFx0XHR0aGlzLnNldE1vZGUodGhpcy5tb2RlKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDI6IC8vIGNlbnR1cnkgbW9kZVxuXHRcdFx0XHR0aGlzLmN1cnJlbnQuc2V0RnVsbFllYXIodGhpcy5jdXJyZW50LmdldEZ1bGxZZWFyKCkgKyAoZGlyZWN0aW9uICogMTIpKTtcblx0XHRcdFx0dGhpcy5zZXRNb2RlKHRoaXMubW9kZSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0dGhpcy5jdXJyZW50LnNldE1vbnRoKHRoaXMuY3VycmVudC5nZXRNb250aCgpICsgKGRpcmVjdGlvbiAqIDEpKTtcblx0XHRcdFx0dGhpcy5yZW5kZXIoKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9XG5cblx0b25DbGlja1llYXIgKG5vZGUpIHtcblx0XHR2YXIgaW5kZXggPSBkYXRlcy5nZXRNb250aEluZGV4KG5vZGUuaW5uZXJIVE1MKTtcblx0XHR0aGlzLmN1cnJlbnQuc2V0TW9udGgoaW5kZXgpO1xuXHRcdHRoaXMucmVuZGVyKCk7XG5cdH1cblxuXHRvbkNsaWNrRGVjYWRlIChub2RlKSB7XG5cdFx0dmFyIHllYXIgPSArbm9kZS5pbm5lckhUTUw7XG5cdFx0dGhpcy5jdXJyZW50LnNldEZ1bGxZZWFyKHllYXIpO1xuXHRcdHRoaXMuc2V0TW9kZSh0aGlzLm1vZGUgLSAxKTtcblx0fVxuXG5cdHNldE1vZGUgKG1vZGUpIHtcblx0XHRkZXN0cm95KHRoaXMubW9kZU5vZGUpO1xuXHRcdHRoaXMubW9kZSA9IG1vZGUgfHwgMDtcblx0XHRzd2l0Y2ggKHRoaXMubW9kZXNbdGhpcy5tb2RlXSkge1xuXHRcdFx0Y2FzZSAnbW9udGgnOlxuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ3llYXInOlxuXHRcdFx0XHR0aGlzLnNldFllYXJNb2RlKCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnZGVjYWRlJzpcblx0XHRcdFx0dGhpcy5zZXREZWNhZGVNb2RlKCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxuXG5cdHNldFllYXJNb2RlICgpIHtcblx0XHRkZXN0cm95KHRoaXMuYm9keU5vZGUpO1xuXG5cdFx0dmFyXG5cdFx0XHRpLFxuXHRcdFx0bm9kZSA9IGRvbSgnZGl2JywgeyBjbGFzczogJ2NhbC1ib2R5IHllYXInIH0pO1xuXG5cdFx0Zm9yIChpID0gMDsgaSA8IDEyOyBpKyspIHtcblx0XHRcdGRvbSgnZGl2JywgeyBodG1sOiBkYXRlcy5tb250aHMuYWJicltpXSwgY2xhc3M6ICd5ZWFyJyB9LCBub2RlKTtcblx0XHR9XG5cblx0XHR0aGlzLm1vbnRoTm9kZS5pbm5lckhUTUwgPSB0aGlzLmN1cnJlbnQuZ2V0RnVsbFllYXIoKTtcblx0XHR0aGlzLmNvbnRhaW5lci5hcHBlbmRDaGlsZChub2RlKTtcblx0XHR0aGlzLm1vZGVOb2RlID0gbm9kZTtcblx0fVxuXG5cdHNldERlY2FkZU1vZGUgKCkge1xuXHRcdHZhclxuXHRcdFx0aSxcblx0XHRcdG5vZGUgPSBkb20oJ2RpdicsIHsgY2xhc3M6ICdjYWwtYm9keSBkZWNhZGUnIH0pLFxuXHRcdFx0eWVhciA9IHRoaXMuY3VycmVudC5nZXRGdWxsWWVhcigpIC0gNjtcblxuXHRcdGZvciAoaSA9IDA7IGkgPCAxMjsgaSsrKSB7XG5cdFx0XHRkb20oJ2RpdicsIHsgaHRtbDogeWVhciwgY2xhc3M6ICdkZWNhZGUnIH0sIG5vZGUpO1xuXHRcdFx0eWVhciArPSAxO1xuXHRcdH1cblx0XHR0aGlzLm1vbnRoTm9kZS5pbm5lckhUTUwgPSAoeWVhciAtIDEyKSArICctJyArICh5ZWFyIC0gMSk7XG5cdFx0dGhpcy5jb250YWluZXIuYXBwZW5kQ2hpbGQobm9kZSk7XG5cdFx0dGhpcy5tb2RlTm9kZSA9IG5vZGU7XG5cdH1cblxuXHRzZWxlY3REYXkgKCkge1xuXHRcdGlmICh0aGlzWydyYW5nZS1waWNrZXInXSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR2YXJcblx0XHRcdG5vdyA9IHRoaXMucXVlcnlTZWxlY3RvcignLmF5LXNlbGVjdGVkJyksXG5cdFx0XHRub2RlID0gdGhpcy5kYXlNYXBbdGhpcy5jdXJyZW50LmdldERhdGUoKV07XG5cdFx0aWYgKG5vdykge1xuXHRcdFx0bm93LmNsYXNzTGlzdC5yZW1vdmUoJ2F5LXNlbGVjdGVkJyk7XG5cdFx0fVxuXHRcdG5vZGUuY2xhc3NMaXN0LmFkZCgnYXktc2VsZWN0ZWQnKTtcblxuXHR9XG5cblx0Y2xlYXJSYW5nZSAoKSB7XG5cdFx0dGhpcy5ob3ZlckRhdGUgPSAwO1xuXHRcdHRoaXMuc2V0UmFuZ2UobnVsbCwgbnVsbCk7XG5cdH1cblxuXHRzZXRSYW5nZSAoZmlyc3RSYW5nZSwgc2Vjb25kUmFuZ2UpIHtcblx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBmaXJzdFJhbmdlO1xuXHRcdHRoaXMuc2Vjb25kUmFuZ2UgPSBzZWNvbmRSYW5nZTtcblx0XHR0aGlzLmRpc3BsYXlSYW5nZSgpO1xuXHRcdHRoaXMuc2V0UmFuZ2VFbmRQb2ludHMoKTtcblx0fVxuXG5cdGNsaWNrU2VsZWN0UmFuZ2UgKCkge1xuXHRcdHZhclxuXHRcdFx0cHJldkZpcnN0ID0gISF0aGlzLmZpcnN0UmFuZ2UsXG5cdFx0XHRwcmV2U2Vjb25kID0gISF0aGlzLnNlY29uZFJhbmdlLFxuXHRcdFx0cmFuZ2VEYXRlID0gY29weSh0aGlzLmN1cnJlbnQpO1xuXG5cdFx0aWYgKHRoaXMuaXNPd25lZCkge1xuXHRcdFx0dGhpcy5maXJlKCdzZWxlY3QtcmFuZ2UnLCB7XG5cdFx0XHRcdGZpcnN0OiB0aGlzLmZpcnN0UmFuZ2UsXG5cdFx0XHRcdHNlY29uZDogdGhpcy5zZWNvbmRSYW5nZSxcblx0XHRcdFx0Y3VycmVudDogcmFuZ2VEYXRlXG5cdFx0XHR9KTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0aWYgKHRoaXMuc2Vjb25kUmFuZ2UpIHtcblx0XHRcdHRoaXMuZmlyZSgncmVzZXQtcmFuZ2UnKTtcblx0XHRcdHRoaXMuZmlyc3RSYW5nZSA9IG51bGw7XG5cdFx0XHR0aGlzLnNlY29uZFJhbmdlID0gbnVsbDtcblx0XHR9XG5cdFx0aWYgKHRoaXMuZmlyc3RSYW5nZSAmJiB0aGlzLmlzVmFsaWRSYW5nZShyYW5nZURhdGUpKSB7XG5cdFx0XHR0aGlzLnNlY29uZFJhbmdlID0gcmFuZ2VEYXRlO1xuXHRcdFx0dGhpcy5ob3ZlckRhdGUgPSAwO1xuXHRcdFx0dGhpcy5zZXRSYW5nZSh0aGlzLmZpcnN0UmFuZ2UsIHRoaXMuc2Vjb25kUmFuZ2UpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBudWxsO1xuXHRcdH1cblx0XHRpZiAoIXRoaXMuZmlyc3RSYW5nZSkge1xuXHRcdFx0dGhpcy5ob3ZlckRhdGUgPSAwO1xuXHRcdFx0dGhpcy5zZXRSYW5nZShyYW5nZURhdGUsIG51bGwpO1xuXHRcdH1cblx0XHR0aGlzLmZpcmUoJ3NlbGVjdC1yYW5nZScsIHtcblx0XHRcdGZpcnN0OiB0aGlzLmZpcnN0UmFuZ2UsXG5cdFx0XHRzZWNvbmQ6IHRoaXMuc2Vjb25kUmFuZ2UsXG5cdFx0XHRwcmV2Rmlyc3Q6IHByZXZGaXJzdCxcblx0XHRcdHByZXZTZWNvbmQ6IHByZXZTZWNvbmRcblx0XHR9KTtcblx0fVxuXG5cdGhvdmVyU2VsZWN0UmFuZ2UgKGUpIHtcblx0XHRpZiAodGhpcy5maXJzdFJhbmdlICYmICF0aGlzLnNlY29uZFJhbmdlICYmIGUudGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucygnb24nKSkge1xuXHRcdFx0dGhpcy5ob3ZlckRhdGUgPSBlLnRhcmdldC5fZGF0ZTtcblx0XHRcdHRoaXMuZGlzcGxheVJhbmdlKCk7XG5cdFx0fVxuXHR9XG5cblx0ZGlzcGxheVJhbmdlVG9FbmQgKCkge1xuXHRcdGlmICh0aGlzLmZpcnN0UmFuZ2UpIHtcblx0XHRcdHRoaXMuaG92ZXJEYXRlID0gY29weSh0aGlzLmN1cnJlbnQpO1xuXHRcdFx0dGhpcy5ob3ZlckRhdGUuc2V0TW9udGgodGhpcy5ob3ZlckRhdGUuZ2V0TW9udGgoKSArIDEpO1xuXHRcdFx0dGhpcy5kaXNwbGF5UmFuZ2UoKTtcblx0XHR9XG5cdH1cblxuXHRkaXNwbGF5UmFuZ2UgKCkge1xuXHRcdHZhclxuXHRcdFx0YmVnID0gdGhpcy5maXJzdFJhbmdlLFxuXHRcdFx0ZW5kID0gdGhpcy5zZWNvbmRSYW5nZSA/IHRoaXMuc2Vjb25kUmFuZ2UuZ2V0VGltZSgpIDogdGhpcy5ob3ZlckRhdGUsXG5cdFx0XHRtYXAgPSB0aGlzLmRheU1hcDtcblx0XHRpZiAoIWJlZyB8fCAhZW5kKSB7XG5cdFx0XHRPYmplY3Qua2V5cyhtYXApLmZvckVhY2goZnVuY3Rpb24gKGtleSwgaSkge1xuXHRcdFx0XHRtYXBba2V5XS5jbGFzc0xpc3QucmVtb3ZlKCdheS1yYW5nZScpO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGJlZyA9IGJlZy5nZXRUaW1lKCk7XG5cdFx0XHRPYmplY3Qua2V5cyhtYXApLmZvckVhY2goZnVuY3Rpb24gKGtleSwgaSkge1xuXHRcdFx0XHRpZiAoaW5SYW5nZShtYXBba2V5XS5fZGF0ZSwgYmVnLCBlbmQpKSB7XG5cdFx0XHRcdFx0bWFwW2tleV0uY2xhc3NMaXN0LmFkZCgnYXktcmFuZ2UnKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRtYXBba2V5XS5jbGFzc0xpc3QucmVtb3ZlKCdheS1yYW5nZScpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cblxuXHRoYXNSYW5nZSAoKSB7XG5cdFx0cmV0dXJuICEhdGhpcy5maXJzdFJhbmdlICYmICEhdGhpcy5zZWNvbmRSYW5nZTtcblx0fVxuXG5cdGlzVmFsaWRSYW5nZSAoZGF0ZSkge1xuXHRcdGlmICghdGhpcy5maXJzdFJhbmdlKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIGRhdGUuZ2V0VGltZSgpID4gdGhpcy5maXJzdFJhbmdlLmdldFRpbWUoKTtcblx0fVxuXG5cdHNldFJhbmdlRW5kUG9pbnRzICgpIHtcblx0XHR0aGlzLmNsZWFyRW5kUG9pbnRzKCk7XG5cdFx0aWYgKHRoaXMuZmlyc3RSYW5nZSkge1xuXHRcdFx0aWYgKHRoaXMuZmlyc3RSYW5nZS5nZXRNb250aCgpID09PSB0aGlzLmN1cnJlbnQuZ2V0TW9udGgoKSkge1xuXHRcdFx0XHR0aGlzLmRheU1hcFt0aGlzLmZpcnN0UmFuZ2UuZ2V0RGF0ZSgpXS5jbGFzc0xpc3QuYWRkKCdheS1yYW5nZS1maXJzdCcpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMuc2Vjb25kUmFuZ2UgJiYgdGhpcy5zZWNvbmRSYW5nZS5nZXRNb250aCgpID09PSB0aGlzLmN1cnJlbnQuZ2V0TW9udGgoKSkge1xuXHRcdFx0XHR0aGlzLmRheU1hcFt0aGlzLnNlY29uZFJhbmdlLmdldERhdGUoKV0uY2xhc3NMaXN0LmFkZCgnYXktcmFuZ2Utc2Vjb25kJyk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Y2xlYXJFbmRQb2ludHMgKCkge1xuXHRcdHZhciBmaXJzdCA9IHRoaXMucXVlcnlTZWxlY3RvcignLmF5LXJhbmdlLWZpcnN0JyksXG5cdFx0XHRzZWNvbmQgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJy5heS1yYW5nZS1zZWNvbmQnKTtcblx0XHRpZiAoZmlyc3QpIHtcblx0XHRcdGZpcnN0LmNsYXNzTGlzdC5yZW1vdmUoJ2F5LXJhbmdlLWZpcnN0Jyk7XG5cdFx0fVxuXHRcdGlmIChzZWNvbmQpIHtcblx0XHRcdHNlY29uZC5jbGFzc0xpc3QucmVtb3ZlKCdheS1yYW5nZS1zZWNvbmQnKTtcblx0XHR9XG5cdH1cblxuXHRkb21SZWFkeSAoKSB7XG5cdFx0aWYgKHRoaXNbJ3JhbmdlLWxlZnQnXSkge1xuXHRcdFx0dGhpcy5yZ3ROb2RlLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG5cdFx0XHR0aGlzWydyYW5nZS1waWNrZXInXSA9IHRydWU7XG5cdFx0XHR0aGlzLmlzT3duZWQgPSB0cnVlO1xuXHRcdH1cblx0XHRpZiAodGhpc1sncmFuZ2UtcmlnaHQnXSkge1xuXHRcdFx0dGhpcy5sZnROb2RlLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG5cdFx0XHR0aGlzWydyYW5nZS1waWNrZXInXSA9IHRydWU7XG5cdFx0XHR0aGlzLmlzT3duZWQgPSB0cnVlO1xuXHRcdH1cblx0XHRpZiAodGhpcy5pc093bmVkKSB7XG5cdFx0XHR0aGlzLmNsYXNzTGlzdC5hZGQoJ21pbmltYWwnKTtcblx0XHR9XG5cblx0XHR0aGlzLmN1cnJlbnQgPSBjb3B5KHRoaXMudmFsdWUpO1xuXG5cdFx0dGhpcy5jb25uZWN0KCk7XG5cdFx0dGhpcy5yZW5kZXIoKTtcblx0fVxuXG5cdHJlbmRlciAoKSB7XG5cdFx0Ly8gZGF0ZU51bSBpbmNyZW1lbnRzLCBzdGFydGluZyB3aXRoIHRoZSBmaXJzdCBTdW5kYXlcblx0XHQvLyBzaG93aW5nIG9uIHRoZSBtb250aGx5IGNhbGVuZGFyLiBUaGlzIGlzIHVzdWFsbHkgdGhlXG5cdFx0Ly8gcHJldmlvdXMgbW9udGgsIHNvIGRhdGVOdW0gd2lsbCBzdGFydCBhcyBhIG5lZ2F0aXZlIG51bWJlclxuXHRcdHRoaXMuc2V0TW9kZSgwKTtcblx0XHRpZiAodGhpcy5ib2R5Tm9kZSkge1xuXHRcdFx0ZG9tLmRlc3Ryb3kodGhpcy5ib2R5Tm9kZSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5kYXlNYXAgPSB7fTtcblxuXHRcdHZhclxuXHRcdFx0bm9kZSA9IGRvbSgnZGl2JywgeyBjbGFzczogJ2NhbC1ib2R5JyB9KSxcblx0XHRcdGksIHR4LCBuZXh0TW9udGggPSAwLCBpc1RoaXNNb250aCwgZGF5LCBjc3MsXG5cdFx0XHR0b2RheSA9IG5ldyBEYXRlKCksXG5cdFx0XHRpc1JhbmdlID0gdGhpc1sncmFuZ2UtcGlja2VyJ10sXG5cdFx0XHRkID0gdGhpcy5jdXJyZW50LFxuXHRcdFx0aW5jRGF0ZSA9IGNvcHkoZCksXG5cdFx0XHRkYXlzSW5QcmV2TW9udGggPSBkYXRlcy5nZXREYXlzSW5QcmV2TW9udGgoZCksXG5cdFx0XHRkYXlzSW5Nb250aCA9IGRhdGVzLmdldERheXNJbk1vbnRoKGQpLFxuXHRcdFx0ZGF0ZU51bSA9IGRhdGVzLmdldEZpcnN0U3VuZGF5KGQpLFxuXHRcdFx0ZGF0ZVRvZGF5ID0gZ2V0U2VsZWN0ZWREYXRlKHRvZGF5LCBkKSxcblx0XHRcdGRhdGVTZWxlY3RlZCA9IGdldFNlbGVjdGVkRGF0ZSh0aGlzLnZhbHVlRGF0ZSwgZCk7XG5cblx0XHR0aGlzLm1vbnRoTm9kZS5pbm5lckhUTUwgPSBkYXRlcy5nZXRNb250aE5hbWUoZCkgKyAnICcgKyBkLmdldEZ1bGxZZWFyKCk7XG5cblx0XHRmb3IgKGkgPSAwOyBpIDwgNzsgaSsrKSB7XG5cdFx0XHRkb20oXCJkaXZcIiwgeyBodG1sOiBkYXRlcy5kYXlzLmFiYnJbaV0sIGNsYXNzOiAnZGF5LW9mLXdlZWsnIH0sIG5vZGUpO1xuXHRcdH1cblxuXHRcdGZvciAoaSA9IDA7IGkgPCA0MjsgaSsrKSB7XG5cdFx0XHR0eCA9IGRhdGVOdW0gKyAxID4gMCAmJiBkYXRlTnVtICsgMSA8PSBkYXlzSW5Nb250aCA/IGRhdGVOdW0gKyAxIDogXCImbmJzcDtcIjtcblxuXHRcdFx0aXNUaGlzTW9udGggPSBmYWxzZTtcblx0XHRcdGlmIChkYXRlTnVtICsgMSA+IDAgJiYgZGF0ZU51bSArIDEgPD0gZGF5c0luTW9udGgpIHtcblx0XHRcdFx0Ly8gY3VycmVudCBtb250aFxuXHRcdFx0XHR0eCA9IGRhdGVOdW0gKyAxO1xuXHRcdFx0XHRpc1RoaXNNb250aCA9IHRydWU7XG5cdFx0XHRcdGNzcyA9ICdkYXkgb24nO1xuXHRcdFx0XHRpZiAoZGF0ZVRvZGF5ID09PSB0eCkge1xuXHRcdFx0XHRcdGNzcyArPSAnIHRvZGF5Jztcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoZGF0ZVNlbGVjdGVkID09PSB0eCAmJiAhaXNSYW5nZSkge1xuXHRcdFx0XHRcdGNzcyArPSAnIGF5LXNlbGVjdGVkJztcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmIChkYXRlTnVtIDwgMCkge1xuXHRcdFx0XHQvLyBwcmV2aW91cyBtb250aFxuXHRcdFx0XHR0eCA9IGRheXNJblByZXZNb250aCArIGRhdGVOdW0gKyAxO1xuXHRcdFx0XHRjc3MgPSAnZGF5IG9mZiBwYXN0Jztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIG5leHQgbW9udGhcblx0XHRcdFx0dHggPSArK25leHRNb250aDtcblx0XHRcdFx0Y3NzID0gJ2RheSBvZmYgZnV0dXJlJztcblx0XHRcdH1cblxuXHRcdFx0ZGF5ID0gZG9tKFwiZGl2XCIsIHsgaW5uZXJIVE1MOiB0eCwgY2xhc3M6IGNzcyB9LCBub2RlKTtcblxuXHRcdFx0ZGF0ZU51bSsrO1xuXHRcdFx0aWYgKGlzVGhpc01vbnRoKSB7XG5cdFx0XHRcdC8vIEtlZXAgYSBtYXAgb2YgYWxsIHRoZSBkYXlzXG5cdFx0XHRcdC8vIHVzZSBpdCBmb3IgYWRkaW5nIGFuZCByZW1vdmluZyBzZWxlY3Rpb24vaG92ZXIgY2xhc3Nlc1xuXHRcdFx0XHRpbmNEYXRlLnNldERhdGUodHgpO1xuXHRcdFx0XHRkYXkuX2RhdGUgPSBpbmNEYXRlLmdldFRpbWUoKTtcblx0XHRcdFx0dGhpcy5kYXlNYXBbdHhdID0gZGF5O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuY29udGFpbmVyLmFwcGVuZENoaWxkKG5vZGUpO1xuXHRcdHRoaXMuYm9keU5vZGUgPSBub2RlO1xuXHRcdHRoaXMuc2V0Rm9vdGVyKCk7XG5cdFx0dGhpcy5kaXNwbGF5UmFuZ2UoKTtcblx0XHR0aGlzLnNldFJhbmdlRW5kUG9pbnRzKCk7XG5cblx0XHR0aGlzLmVtaXREaXNwbGF5RXZlbnRzKCk7XG5cdH1cblxuXHRzZXRGb290ZXIgKCkge1xuXHRcdHZhclxuXHRcdFx0ZCA9IG5ldyBEYXRlKCksXG5cdFx0XHRzdHIgPSBkYXRlcy5kYXlzLmZ1bGxbZC5nZXREYXkoKV0gKyAnICcgKyBkYXRlcy5tb250aHMuZnVsbFtkLmdldE1vbnRoKCldICsgJyAnICsgZC5nZXREYXRlKCkgKyAnLCAnICsgZC5nZXRGdWxsWWVhcigpO1xuXHRcdHRoaXMuZm9vdGVyTGluay5pbm5lckhUTUwgPSBzdHI7XG5cdH1cblxuXHRjb25uZWN0ICgpIHtcblx0XHR0aGlzLm9uKHRoaXMubGZ0Tm9kZSwgJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0dGhpcy5vbkNsaWNrTW9udGgoLTEpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5vbih0aGlzLnJndE5vZGUsICdjbGljaycsICgpID0+IHtcblx0XHRcdHRoaXMub25DbGlja01vbnRoKDEpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5vbih0aGlzLmZvb3RlckxpbmssICdjbGljaycsICgpID0+IHtcblx0XHRcdHRoaXMuY3VycmVudCA9IG5ldyBEYXRlKCk7XG5cdFx0XHR0aGlzLnJlbmRlcigpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5vbih0aGlzLmNvbnRhaW5lciwgJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdHRoaXMuZmlyZSgncHJlLWNsaWNrJywgZSwgdHJ1ZSwgdHJ1ZSk7XG5cdFx0XHR2YXIgbm9kZSA9IGUudGFyZ2V0O1xuXHRcdFx0aWYgKG5vZGUuY2xhc3NMaXN0LmNvbnRhaW5zKCdkYXknKSkge1xuXHRcdFx0XHR0aGlzLm9uQ2xpY2tEYXkobm9kZSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChub2RlLmNsYXNzTGlzdC5jb250YWlucygneWVhcicpKSB7XG5cdFx0XHRcdHRoaXMub25DbGlja1llYXIobm9kZSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChub2RlLmNsYXNzTGlzdC5jb250YWlucygnZGVjYWRlJykpIHtcblx0XHRcdFx0dGhpcy5vbkNsaWNrRGVjYWRlKG5vZGUpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5vbih0aGlzLm1vbnRoTm9kZSwgJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0aWYgKHRoaXMubW9kZSArIDEgPT09IHRoaXMubW9kZXMubGVuZ3RoKSB7XG5cdFx0XHRcdHRoaXMubW9kZSA9IDA7XG5cdFx0XHRcdHRoaXMucmVuZGVyKCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0dGhpcy5zZXRNb2RlKHRoaXMubW9kZSArIDEpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0aWYgKHRoaXNbJ3JhbmdlLXBpY2tlciddKSB7XG5cdFx0XHR0aGlzLm9uKHRoaXMuY29udGFpbmVyLCAnbW91c2VvdmVyJywgdGhpcy5ob3ZlclNlbGVjdFJhbmdlLmJpbmQodGhpcykpO1xuXHRcdH1cblx0fVxufVxuXG5jb25zdCB0b2RheSA9IG5ldyBEYXRlKCk7XG5cbmZ1bmN0aW9uIGdldFNlbGVjdGVkRGF0ZSAoZGF0ZSwgY3VycmVudCkge1xuXHRpZiAoZGF0ZS5nZXRNb250aCgpID09PSBjdXJyZW50LmdldE1vbnRoKCkgJiYgZGF0ZS5nZXRGdWxsWWVhcigpID09PSBjdXJyZW50LmdldEZ1bGxZZWFyKCkpIHtcblx0XHRyZXR1cm4gZGF0ZS5nZXREYXRlKCk7XG5cdH1cblx0cmV0dXJuIC05OTk7IC8vIGluZGV4IG11c3QgYmUgb3V0IG9mIHJhbmdlLCBhbmQgLTEgaXMgdGhlIGxhc3QgZGF5IG9mIHRoZSBwcmV2aW91cyBtb250aFxufVxuXG5mdW5jdGlvbiBkZXN0cm95IChub2RlKSB7XG5cdGlmIChub2RlKSB7XG5cdFx0ZG9tLmRlc3Ryb3kobm9kZSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gaXNUaGlzTW9udGggKGRhdGUsIGN1cnJlbnREYXRlKSB7XG5cdHJldHVybiBkYXRlLmdldE1vbnRoKCkgPT09IGN1cnJlbnREYXRlLmdldE1vbnRoKCkgJiYgZGF0ZS5nZXRGdWxsWWVhcigpID09PSBjdXJyZW50RGF0ZS5nZXRGdWxsWWVhcigpO1xufVxuXG5mdW5jdGlvbiBpblJhbmdlIChkYXRlVGltZSwgYmVnVGltZSwgZW5kVGltZSkge1xuXHRyZXR1cm4gZGF0ZVRpbWUgPj0gYmVnVGltZSAmJiBkYXRlVGltZSA8PSBlbmRUaW1lO1xufVxuXG5mdW5jdGlvbiBjb3B5IChkYXRlKSB7XG5cdHJldHVybiBuZXcgRGF0ZShkYXRlLmdldFRpbWUoKSk7XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnZGF0ZS1waWNrZXInLCBEYXRlUGlja2VyKTtcblxubW9kdWxlLmV4cG9ydHMgPSBEYXRlUGlja2VyOyIsInJlcXVpcmUoJy4vZGF0ZS1waWNrZXInKTtcbmNvbnN0IEJhc2VDb21wb25lbnQgPSByZXF1aXJlKCdCYXNlQ29tcG9uZW50Jyk7XG5jb25zdCBkYXRlcyA9IHJlcXVpcmUoJ2RhdGVzJyk7XG5jb25zdCBkb20gPSByZXF1aXJlKCdkb20nKTtcblxuY29uc3QgcHJvcHMgPSBbJ3ZhbHVlJ107XG5jb25zdCBib29scyA9IFsncmFuZ2UtZXhwYW5kcyddO1xuXG5jbGFzcyBEYXRlUmFuZ2VQaWNrZXIgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblxuXHRzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcyAoKSB7XG5cdFx0cmV0dXJuIFsuLi5wcm9wcywgLi4uYm9vbHNdO1xuXHR9XG5cblx0Z2V0IHByb3BzICgpIHtcblx0XHRyZXR1cm4gcHJvcHM7XG5cdH1cblxuXHRnZXQgYm9vbHMgKCkge1xuXHRcdHJldHVybiBib29scztcblx0fVxuXG5cdG9uVmFsdWUgKHZhbHVlKSB7XG5cdFx0Ly8gbWlnaHQgbmVlZCBhdHRyaWJ1dGVDaGFuZ2VkXG5cdFx0dGhpcy5zdHJEYXRlID0gZGF0ZXMuaXNEYXRlVHlwZSh2YWx1ZSkgPyB2YWx1ZSA6ICcnO1xuXHRcdG9uRG9tUmVhZHkodGhpcywgKCkgPT4ge1xuXHRcdFx0dGhpcy5zZXRWYWx1ZSh0aGlzLnN0ckRhdGUpO1xuXHRcdH0pO1xuXHR9XG5cblx0Y29uc3RydWN0b3IgKCkge1xuXHRcdHN1cGVyKCk7XG5cdH1cblxuXHRzZXRWYWx1ZSAodmFsdWUpIHtcblx0XHRpZiAoIXZhbHVlKSB7XG5cdFx0XHR0aGlzLnZhbHVlRGF0ZSA9ICcnO1xuXHRcdFx0dGhpcy5jbGVhclJhbmdlKCk7XG5cblx0XHR9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdHZhciBkYXRlU3RyaW5ncyA9IHNwbGl0KHZhbHVlKTtcblx0XHRcdHRoaXMudmFsdWVEYXRlID0gZGF0ZXMuc3RyVG9EYXRlKHZhbHVlKTtcblx0XHRcdHRoaXMuZmlyc3RSYW5nZSA9IGRhdGVzLnN0clRvRGF0ZShkYXRlU3RyaW5nc1swXSk7XG5cdFx0XHR0aGlzLnNlY29uZFJhbmdlID0gZGF0ZXMuc3RyVG9EYXRlKGRhdGVTdHJpbmdzWzFdKTtcblx0XHRcdHRoaXMuc2V0RGlzcGxheSgpO1xuXHRcdFx0dGhpcy5zZXRSYW5nZSgpO1xuXHRcdH1cblx0fVxuXG5cdGRvbVJlYWR5ICgpIHtcblx0XHR0aGlzLmxlZnRDYWwgPSBkb20oJ2RhdGUtcGlja2VyJywgeydyYW5nZS1sZWZ0JzogdHJ1ZX0sIHRoaXMpO1xuXHRcdHRoaXMucmlnaHRDYWwgPSBkb20oJ2RhdGUtcGlja2VyJywgeydyYW5nZS1yaWdodCc6IHRydWV9LCB0aGlzKTtcblx0XHR0aGlzLnJhbmdlRXhwYW5kcyA9IHRoaXNbJ3JhbmdlLWV4cGFuZHMnXTtcblxuXHRcdHRoaXMuY29ubmVjdEV2ZW50cygpO1xuXHRcdGlmICh0aGlzLmluaXRhbFZhbHVlKSB7XG5cdFx0XHR0aGlzLnNldFZhbHVlKHRoaXMuaW5pdGFsVmFsdWUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLnNldERpc3BsYXkoKTtcblx0XHR9XG5cdH1cblxuXHRzZXREaXNwbGF5ICgpIHtcblx0XHRjb25zdFxuXHRcdFx0Zmlyc3QgPSB0aGlzLmZpcnN0UmFuZ2UgPyBuZXcgRGF0ZSh0aGlzLmZpcnN0UmFuZ2UuZ2V0VGltZSgpKSA6IG5ldyBEYXRlKCksXG5cdFx0XHRzZWNvbmQgPSBuZXcgRGF0ZShmaXJzdC5nZXRUaW1lKCkpO1xuXG5cdFx0c2Vjb25kLnNldE1vbnRoKHNlY29uZC5nZXRNb250aCgpICsgMSk7XG5cdFx0dGhpcy5sZWZ0Q2FsLnNldERpc3BsYXkoZmlyc3QpO1xuXHRcdHRoaXMucmlnaHRDYWwuc2V0RGlzcGxheShzZWNvbmQpO1xuXHR9XG5cblx0c2V0UmFuZ2UgKCkge1xuXHRcdHRoaXMubGVmdENhbC5zZXRSYW5nZSh0aGlzLmZpcnN0UmFuZ2UsIHRoaXMuc2Vjb25kUmFuZ2UpO1xuXHRcdHRoaXMucmlnaHRDYWwuc2V0UmFuZ2UodGhpcy5maXJzdFJhbmdlLCB0aGlzLnNlY29uZFJhbmdlKTtcblx0XHRpZiAodGhpcy5maXJzdFJhbmdlICYmIHRoaXMuc2Vjb25kUmFuZ2UpIHtcblxuXHRcdFx0Y29uc3Rcblx0XHRcdFx0YmVnID0gZGF0ZXMuZGF0ZVRvU3RyKHRoaXMuZmlyc3RSYW5nZSksXG5cdFx0XHRcdGVuZCA9IGRhdGVzLmRhdGVUb1N0cih0aGlzLnNlY29uZFJhbmdlKTtcblxuXHRcdFx0dGhpcy5lbWl0KCdjaGFuZ2UnLCB7XG5cdFx0XHRcdGZpcnN0UmFuZ2U6IHRoaXMuZmlyc3RSYW5nZSxcblx0XHRcdFx0c2Vjb25kUmFuZ2U6IHRoaXMuc2Vjb25kUmFuZ2UsXG5cdFx0XHRcdGJlZ2luOiBiZWcsXG5cdFx0XHRcdGVuZDogZW5kLFxuXHRcdFx0XHR2YWx1ZTogYmVnICsgREVMSU1JVEVSICsgZW5kXG5cblx0XHRcdH0pO1xuXHRcdH1cblx0fVxuXG5cdGNsZWFyUmFuZ2UgKCkge1xuXHRcdHRoaXMubGVmdENhbC5jbGVhclJhbmdlKCk7XG5cdFx0dGhpcy5yaWdodENhbC5jbGVhclJhbmdlKCk7XG5cdH1cblxuXHRjYWxjdWxhdGVSYW5nZSAoZSwgd2hpY2gpIHtcblx0XHRlID0gZS5kZXRhaWwgfHwgZTtcblxuXHRcdGlmIChlLmZpcnN0ID09PSB0aGlzLmxlZnRDYWwuZmlyc3RSYW5nZSkge1xuXHRcdFx0aWYgKCFlLnNlY29uZCkge1xuXHRcdFx0XHR0aGlzLnJpZ2h0Q2FsLmNsZWFyUmFuZ2UoKTtcblx0XHRcdFx0dGhpcy5yaWdodENhbC5zZXRSYW5nZSh0aGlzLmxlZnRDYWwuZmlyc3RSYW5nZSwgbnVsbCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLnJpZ2h0Q2FsLnNldFJhbmdlKHRoaXMubGVmdENhbC5maXJzdFJhbmdlLCB0aGlzLmxlZnRDYWwuc2Vjb25kUmFuZ2UpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGNvbm5lY3RFdmVudHMgKCkge1xuXHRcdHRoaXMubGVmdENhbC5vbignZGlzcGxheS1jaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0bGV0XG5cdFx0XHRcdG0gPSBlLmRldGFpbC5tb250aCxcblx0XHRcdFx0eSA9IGUuZGV0YWlsLnllYXI7XG5cdFx0XHRpZiAobSArIDEgPiAxMSkge1xuXHRcdFx0XHRtID0gMDtcblx0XHRcdFx0eSsrO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bSsrO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5yaWdodENhbC5zZXREaXNwbGF5KHksIG0pO1xuXHRcdH0uYmluZCh0aGlzKSk7XG5cblx0XHR0aGlzLnJpZ2h0Q2FsLm9uKCdkaXNwbGF5LWNoYW5nZScsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRsZXRcblx0XHRcdFx0bSA9IGUuZGV0YWlsLm1vbnRoLFxuXHRcdFx0XHR5ID0gZS5kZXRhaWwueWVhcjtcblx0XHRcdGlmIChtIC0gMSA8IDApIHtcblx0XHRcdFx0bSA9IDExO1xuXHRcdFx0XHR5LS07XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRtLS07XG5cdFx0XHR9XG5cdFx0XHR0aGlzLmxlZnRDYWwuc2V0RGlzcGxheSh5LCBtKTtcblx0XHR9LmJpbmQodGhpcykpO1xuXG5cdFx0dGhpcy5sZWZ0Q2FsLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0ZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9LmJpbmQodGhpcykpO1xuXG5cdFx0dGhpcy5yaWdodENhbC5vbignY2hhbmdlJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fS5iaW5kKHRoaXMpKTtcblxuXG5cdFx0aWYgKCF0aGlzLnJhbmdlRXhwYW5kcykge1xuXHRcdFx0dGhpcy5yaWdodENhbC5vbigncmVzZXQtcmFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHR0aGlzLmxlZnRDYWwuY2xlYXJSYW5nZSgpO1xuXHRcdFx0fS5iaW5kKHRoaXMpKTtcblxuXHRcdFx0dGhpcy5sZWZ0Q2FsLm9uKCdyZXNldC1yYW5nZScsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdHRoaXMucmlnaHRDYWwuY2xlYXJSYW5nZSgpO1xuXHRcdFx0fS5iaW5kKHRoaXMpKTtcblx0XHR9XG5cblxuXHRcdHRoaXMubGVmdENhbC5vbignc2VsZWN0LXJhbmdlJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdHRoaXMuY2FsY3VsYXRlUmFuZ2UoZSwgJ2xlZnQnKTtcblx0XHRcdGUgPSBlLmRldGFpbDtcblx0XHRcdGlmICh0aGlzLnJhbmdlRXhwYW5kcyAmJiBlLmZpcnN0ICYmIGUuc2Vjb25kKSB7XG5cdFx0XHRcdGlmIChpc0RhdGVDbG9zZXJUb0xlZnQoZS5jdXJyZW50LCBlLmZpcnN0LCBlLnNlY29uZCkpIHtcblx0XHRcdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5zZWNvbmRSYW5nZSA9IGUuY3VycmVudDtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLnNldFJhbmdlKCk7XG5cdFx0XHR9IGVsc2UgaWYgKGUuZmlyc3QgJiYgZS5zZWNvbmQpIHtcblx0XHRcdFx0Ly8gbmV3IHJhbmdlXG5cdFx0XHRcdHRoaXMuY2xlYXJSYW5nZSgpO1xuXHRcdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdHRoaXMuc2Vjb25kUmFuZ2UgPSBudWxsO1xuXHRcdFx0XHR0aGlzLnNldFJhbmdlKCk7XG5cdFx0XHR9IGVsc2UgaWYgKGUuZmlyc3QgJiYgIWUuc2Vjb25kKSB7XG5cdFx0XHRcdHRoaXMuc2Vjb25kUmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdHRoaXMuc2V0UmFuZ2UoKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdHRoaXMuc2V0UmFuZ2UoKTtcblx0XHRcdH1cblx0XHR9LmJpbmQodGhpcykpO1xuXG5cdFx0dGhpcy5yaWdodENhbC5vbignc2VsZWN0LXJhbmdlJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdHRoaXMuY2FsY3VsYXRlUmFuZ2UoZSwgJ3JpZ2h0Jyk7XG5cblx0XHRcdGUgPSBlLmRldGFpbDtcblx0XHRcdGlmICh0aGlzLnJhbmdlRXhwYW5kcyAmJiBlLmZpcnN0ICYmIGUuc2Vjb25kKSB7XG5cdFx0XHRcdGlmIChpc0RhdGVDbG9zZXJUb0xlZnQoZS5jdXJyZW50LCBlLmZpcnN0LCBlLnNlY29uZCkpIHtcblx0XHRcdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5zZWNvbmRSYW5nZSA9IGUuY3VycmVudDtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLnNldFJhbmdlKCk7XG5cdFx0XHR9IGVsc2UgaWYgKGUuZmlyc3QgJiYgZS5zZWNvbmQpIHtcblx0XHRcdFx0Ly8gbmV3IHJhbmdlXG5cdFx0XHRcdHRoaXMuY2xlYXJSYW5nZSgpO1xuXHRcdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdHRoaXMuc2Vjb25kUmFuZ2UgPSBudWxsO1xuXHRcdFx0XHR0aGlzLnNldFJhbmdlKCk7XG5cdFx0XHR9IGVsc2UgaWYgKGUuZmlyc3QgJiYgIWUuc2Vjb25kKSB7XG5cdFx0XHRcdHRoaXMuc2Vjb25kUmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdHRoaXMuc2V0UmFuZ2UoKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR0aGlzLmZpcnN0UmFuZ2UgPSBlLmN1cnJlbnQ7XG5cdFx0XHRcdHRoaXMuc2V0UmFuZ2UoKTtcblx0XHRcdH1cblx0XHR9LmJpbmQodGhpcykpO1xuXG5cdFx0dGhpcy5vbih0aGlzLnJpZ2h0Q2FsLCAnbW91c2VvdmVyJywgZnVuY3Rpb24gKCkge1xuXHRcdFx0dGhpcy5sZWZ0Q2FsLmRpc3BsYXlSYW5nZVRvRW5kKCk7XG5cdFx0fS5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdGRlc3Ryb3kgKCkge1xuXHRcdHRoaXMucmlnaHRDYWwuZGVzdHJveSgpO1xuXHRcdHRoaXMubGVmdENhbC5kZXN0cm95KCk7XG5cdH1cbn1cblxuY29uc3QgREVMSU1JVEVSID0gJyAtICc7XG5jb25zdCB0b2RheSA9IG5ldyBEYXRlKCk7XG5cbmZ1bmN0aW9uIHN0ciAoZCkge1xuXHRpZiAoIWQpIHtcblx0XHRyZXR1cm4gbnVsbDtcblx0fVxuXHRyZXR1cm4gZGF0ZXMuZGF0ZVRvU3RyKGQpO1xufVxuXG5mdW5jdGlvbiBzcGxpdCAodmFsdWUpIHtcblx0aWYgKHZhbHVlLmluZGV4T2YoJywnKSA+IC0xKSB7XG5cdFx0cmV0dXJuIHZhbHVlLnNwbGl0KC9cXHMqLFxccyovKTtcblx0fVxuXHRyZXR1cm4gdmFsdWUuc3BsaXQoL1xccyotXFxzKi8pO1xufVxuXG5mdW5jdGlvbiBpc0RhdGVDbG9zZXJUb0xlZnQgKGRhdGUsIGxlZnQsIHJpZ2h0KSB7XG5cdHZhciBkaWZmMSA9IGRhdGVzLmRpZmYoZGF0ZSwgbGVmdCksXG5cdFx0ZGlmZjIgPSBkYXRlcy5kaWZmKGRhdGUsIHJpZ2h0KTtcblx0cmV0dXJuIGRpZmYxIDw9IGRpZmYyO1xufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ2RhdGUtcmFuZ2UtcGlja2VyJywgRGF0ZVJhbmdlUGlja2VyKTtcblxubW9kdWxlLmV4cG9ydHMgPSBEYXRlUmFuZ2VQaWNrZXI7IiwicmVxdWlyZSgnLi9nbG9iYWxzJyk7XG5yZXF1aXJlKCcuLi8uLi9zcmMvZGF0ZS1waWNrZXInKTtcbnJlcXVpcmUoJy4uLy4uL3NyYy9kYXRlLWlucHV0Jyk7XG5yZXF1aXJlKCcuLi8uLi9zcmMvZGF0ZS1yYW5nZS1waWNrZXInKTsiLCJ3aW5kb3dbJ25vLW5hdGl2ZS1zaGltJ10gPSBmYWxzZTtcbnJlcXVpcmUoJ2N1c3RvbS1lbGVtZW50cy1wb2x5ZmlsbCcpO1xud2luZG93Lm9uID0gcmVxdWlyZSgnb24nKTtcbndpbmRvdy5kb20gPSByZXF1aXJlKCdkb20nKTsiXX0=
