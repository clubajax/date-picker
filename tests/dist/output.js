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
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

require('BaseComponent/src/properties');
require('BaseComponent/src/template');
require('BaseComponent/src/refs');
var BaseComponent = require('BaseComponent');
var dom = require('dom');
var on = require('on');

console.log('DP LOADED');
var props = ['label', 'name'];
var bools = ['no-event', 'disabled', 'readonly', 'checked'];

var DatePicker = function (_BaseComponent) {
	_inherits(DatePicker, _BaseComponent);

	function DatePicker() {
		_classCallCheck(this, DatePicker);

		return _possibleConstructorReturn(this, (DatePicker.__proto__ || Object.getPrototypeOf(DatePicker)).apply(this, arguments));
	}

	_createClass(DatePicker, [{
		key: 'domReady',
		value: function domReady() {
			dom('div', { html: 'DATE PICKER!!' }, this);
		}
	}, {
		key: 'templateString',
		get: function get() {
			return '\n<label>\n\t<icon-check></icon-check>\n\t<span ref="labelNode"></span>\n</label>\n';
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
		get: function get() {}
	}], [{
		key: 'observedAttributes',
		get: function get() {
			return [].concat(props, bools);
		}
	}]);

	return DatePicker;
}(BaseComponent);

customElements.define('date-picker', DatePicker);

module.exports = DatePicker;

},{"BaseComponent":"BaseComponent","BaseComponent/src/properties":1,"BaseComponent/src/refs":2,"BaseComponent/src/template":3,"dom":"dom","on":"on"}],5:[function(require,module,exports){
'use strict';

require('./globals');
require('../../src/date-picker');

},{"../../src/date-picker":4,"./globals":6}],6:[function(require,module,exports){
'use strict';

window['no-native-shim'] = false;
require('custom-elements-polyfill');
window.on = require('on');
window.dom = require('dom');

},{"custom-elements-polyfill":"custom-elements-polyfill","dom":"dom","on":"on"}]},{},[5])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQmFzZUNvbXBvbmVudC9zcmMvcHJvcGVydGllcy5qcyIsIm5vZGVfbW9kdWxlcy9CYXNlQ29tcG9uZW50L3NyYy9yZWZzLmpzIiwibm9kZV9tb2R1bGVzL0Jhc2VDb21wb25lbnQvc3JjL3RlbXBsYXRlLmpzIiwic3JjL2RhdGUtcGlja2VyLmpzIiwidGVzdHMvc3JjL2RhdGUtcGlja2VyLXRlc3RzLmpzIiwidGVzdHMvc3JjL2dsb2JhbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7O0FDcEhBLFFBQVEsOEJBQVI7QUFDQSxRQUFRLDRCQUFSO0FBQ0EsUUFBUSx3QkFBUjtBQUNBLElBQU0sZ0JBQWdCLFFBQVEsZUFBUixDQUF0QjtBQUNBLElBQU0sTUFBTSxRQUFRLEtBQVIsQ0FBWjtBQUNBLElBQU0sS0FBSyxRQUFRLElBQVIsQ0FBWDs7QUFFQSxRQUFRLEdBQVIsQ0FBWSxXQUFaO0FBQ0EsSUFBTSxRQUFRLENBQUMsT0FBRCxFQUFVLE1BQVYsQ0FBZDtBQUNBLElBQU0sUUFBUSxDQUFDLFVBQUQsRUFBYSxVQUFiLEVBQXlCLFVBQXpCLEVBQXFDLFNBQXJDLENBQWQ7O0lBRU0sVTs7Ozs7Ozs7Ozs7NkJBMkJPO0FBQ1gsT0FBSSxLQUFKLEVBQVcsRUFBQyxNQUFNLGVBQVAsRUFBWCxFQUFvQyxJQUFwQztBQUNBOzs7c0JBM0JxQjtBQUNyQjtBQU1BOzs7c0JBTVk7QUFDWixVQUFPLEtBQVA7QUFDQTs7O3NCQUVZO0FBQ1osVUFBTyxLQUFQO0FBQ0E7OztzQkFFWSxDQUVaOzs7c0JBZGdDO0FBQ2hDLG9CQUFXLEtBQVgsRUFBcUIsS0FBckI7QUFDQTs7OztFQWJ1QixhOztBQWdDekIsZUFBZSxNQUFmLENBQXNCLGFBQXRCLEVBQXFDLFVBQXJDOztBQUVBLE9BQU8sT0FBUCxHQUFpQixVQUFqQjs7Ozs7QUM3Q0EsUUFBUSxXQUFSO0FBQ0EsUUFBUSx1QkFBUjs7Ozs7QUNEQSxPQUFPLGdCQUFQLElBQTJCLEtBQTNCO0FBQ0EsUUFBUSwwQkFBUjtBQUNBLE9BQU8sRUFBUCxHQUFZLFFBQVEsSUFBUixDQUFaO0FBQ0EsT0FBTyxHQUFQLEdBQWEsUUFBUSxLQUFSLENBQWIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiY29uc3QgQmFzZUNvbXBvbmVudCA9IHJlcXVpcmUoJ0Jhc2VDb21wb25lbnQnKTtcbmNvbnN0IGRvbSA9IHJlcXVpcmUoJ2RvbScpO1xuXG5mdW5jdGlvbiBzZXRCb29sZWFuIChub2RlLCBwcm9wKSB7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShub2RlLCBwcm9wLCB7XG5cdFx0ZW51bWVyYWJsZTogdHJ1ZSxcblx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdFx0Z2V0ICgpIHtcblx0XHRcdHJldHVybiBub2RlLmhhc0F0dHJpYnV0ZShwcm9wKTtcblx0XHR9LFxuXHRcdHNldCAodmFsdWUpIHtcblx0XHRcdHRoaXMuaXNTZXR0aW5nQXR0cmlidXRlID0gdHJ1ZTtcblx0XHRcdGlmICh2YWx1ZSkge1xuXHRcdFx0XHR0aGlzLnNldEF0dHJpYnV0ZShwcm9wLCAnJyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLnJlbW92ZUF0dHJpYnV0ZShwcm9wKTtcblx0XHRcdH1cblx0XHRcdGNvbnN0IGZuID0gdGhpc1tvbmlmeShwcm9wKV07XG5cdFx0XHRpZihmbil7XG5cdFx0XHRcdGZuLmNhbGwodGhpcywgdmFsdWUpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmlzU2V0dGluZ0F0dHJpYnV0ZSA9IGZhbHNlO1xuXHRcdH1cblx0fSk7XG59XG5cbmZ1bmN0aW9uIHNldFByb3BlcnR5IChub2RlLCBwcm9wKSB7XG5cdGxldCBwcm9wVmFsdWU7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShub2RlLCBwcm9wLCB7XG5cdFx0ZW51bWVyYWJsZTogdHJ1ZSxcblx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdFx0Z2V0ICgpIHtcblx0XHRcdHJldHVybiBwcm9wVmFsdWUgIT09IHVuZGVmaW5lZCA/IHByb3BWYWx1ZSA6IGRvbS5ub3JtYWxpemUodGhpcy5nZXRBdHRyaWJ1dGUocHJvcCkpO1xuXHRcdH0sXG5cdFx0c2V0ICh2YWx1ZSkge1xuXHRcdFx0dGhpcy5pc1NldHRpbmdBdHRyaWJ1dGUgPSB0cnVlO1xuXHRcdFx0dGhpcy5zZXRBdHRyaWJ1dGUocHJvcCwgdmFsdWUpO1xuXHRcdFx0Y29uc3QgZm4gPSB0aGlzW29uaWZ5KHByb3ApXTtcblx0XHRcdGlmKGZuKXtcblx0XHRcdFx0b25Eb21SZWFkeSh0aGlzLCAoKSA9PiB7XG5cdFx0XHRcdFx0dmFsdWUgPSBmbi5jYWxsKHRoaXMsIHZhbHVlKSB8fCB2YWx1ZTtcblx0XHRcdFx0XHRpZih2YWx1ZSAhPT0gdW5kZWZpbmVkKXtcblx0XHRcdFx0XHRcdHByb3BWYWx1ZSA9IHZhbHVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLmlzU2V0dGluZ0F0dHJpYnV0ZSA9IGZhbHNlO1xuXHRcdH1cblx0fSk7XG59XG5cbmZ1bmN0aW9uIHNldE9iamVjdCAobm9kZSwgcHJvcCkge1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkobm9kZSwgcHJvcCwge1xuXHRcdGVudW1lcmFibGU6IHRydWUsXG5cdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHRcdGdldCAoKSB7XG5cdFx0XHRyZXR1cm4gdGhpc1snX18nICsgcHJvcF07XG5cdFx0fSxcblx0XHRzZXQgKHZhbHVlKSB7XG5cdFx0XHR0aGlzWydfXycgKyBwcm9wXSA9IHZhbHVlO1xuXHRcdH1cblx0fSk7XG59XG5cbmZ1bmN0aW9uIHNldFByb3BlcnRpZXMgKG5vZGUpIHtcblx0bGV0IHByb3BzID0gbm9kZS5wcm9wcyB8fCBub2RlLnByb3BlcnRpZXM7XG5cdGlmIChwcm9wcykge1xuXHRcdHByb3BzLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcblx0XHRcdGlmIChwcm9wID09PSAnZGlzYWJsZWQnKSB7XG5cdFx0XHRcdHNldEJvb2xlYW4obm9kZSwgcHJvcCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0c2V0UHJvcGVydHkobm9kZSwgcHJvcCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gc2V0Qm9vbGVhbnMgKG5vZGUpIHtcblx0bGV0IHByb3BzID0gbm9kZS5ib29scyB8fCBub2RlLmJvb2xlYW5zO1xuXHRpZiAocHJvcHMpIHtcblx0XHRwcm9wcy5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG5cdFx0XHRzZXRCb29sZWFuKG5vZGUsIHByb3ApO1xuXHRcdH0pO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHNldE9iamVjdHMgKG5vZGUpIHtcblx0bGV0IHByb3BzID0gbm9kZS5vYmplY3RzO1xuXHRpZiAocHJvcHMpIHtcblx0XHRwcm9wcy5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG5cdFx0XHRzZXRPYmplY3Qobm9kZSwgcHJvcCk7XG5cdFx0fSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gY2FwIChuYW1lKSB7XG5cdHJldHVybiBuYW1lLnN1YnN0cmluZygwLDEpLnRvVXBwZXJDYXNlKCkgKyBuYW1lLnN1YnN0cmluZygxKTtcbn1cblxuZnVuY3Rpb24gb25pZnkgKG5hbWUpIHtcblx0cmV0dXJuICdvbicgKyBuYW1lLnNwbGl0KCctJykubWFwKHdvcmQgPT4gY2FwKHdvcmQpKS5qb2luKCcnKTtcbn1cblxuZnVuY3Rpb24gaXNCb29sIChub2RlLCBuYW1lKSB7XG5cdHJldHVybiAobm9kZS5ib29scyB8fCBub2RlLmJvb2xlYW5zIHx8IFtdKS5pbmRleE9mKG5hbWUpID4gLTE7XG59XG5cbmZ1bmN0aW9uIGJvb2xOb3JtICh2YWx1ZSkge1xuXHRpZih2YWx1ZSA9PT0gJycpe1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cdHJldHVybiBkb20ubm9ybWFsaXplKHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gcHJvcE5vcm0gKHZhbHVlKSB7XG5cdHJldHVybiBkb20ubm9ybWFsaXplKHZhbHVlKTtcbn1cblxuQmFzZUNvbXBvbmVudC5hZGRQbHVnaW4oe1xuXHRuYW1lOiAncHJvcGVydGllcycsXG5cdG9yZGVyOiAxMCxcblx0aW5pdDogZnVuY3Rpb24gKG5vZGUpIHtcblx0XHRzZXRQcm9wZXJ0aWVzKG5vZGUpO1xuXHRcdHNldEJvb2xlYW5zKG5vZGUpO1xuXHR9LFxuXHRwcmVBdHRyaWJ1dGVDaGFuZ2VkOiBmdW5jdGlvbiAobm9kZSwgbmFtZSwgdmFsdWUpIHtcblx0XHRpZiAobm9kZS5pc1NldHRpbmdBdHRyaWJ1dGUpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0aWYoaXNCb29sKG5vZGUsIG5hbWUpKXtcblx0XHRcdHZhbHVlID0gYm9vbE5vcm0odmFsdWUpO1xuXHRcdFx0bm9kZVtuYW1lXSA9ICEhdmFsdWU7XG5cdFx0XHRpZighdmFsdWUpe1xuXHRcdFx0XHRub2RlW25hbWVdID0gZmFsc2U7XG5cdFx0XHRcdG5vZGUuaXNTZXR0aW5nQXR0cmlidXRlID0gdHJ1ZTtcblx0XHRcdFx0bm9kZS5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG5cdFx0XHRcdG5vZGUuaXNTZXR0aW5nQXR0cmlidXRlID0gZmFsc2U7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRub2RlW25hbWVdID0gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRub2RlW25hbWVdID0gcHJvcE5vcm0odmFsdWUpO1xuXHR9XG59KTsiLCJjb25zdCBkb20gPSByZXF1aXJlKCdkb20nKTtcbmNvbnN0IEJhc2VDb21wb25lbnQgPSByZXF1aXJlKCdCYXNlQ29tcG9uZW50Jyk7XG5cbmZ1bmN0aW9uIGFzc2lnblJlZnMgKG5vZGUpIHtcbiAgICBkb20ucXVlcnlBbGwobm9kZSwgJ1tyZWZdJykuZm9yRWFjaChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgICAgbGV0IG5hbWUgPSBjaGlsZC5nZXRBdHRyaWJ1dGUoJ3JlZicpO1xuICAgICAgICBub2RlW25hbWVdID0gY2hpbGQ7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGFzc2lnbkV2ZW50cyAobm9kZSkge1xuICAgIC8vIDxkaXYgb249XCJjbGljazpvbkNsaWNrXCI+XG4gICAgZG9tLnF1ZXJ5QWxsKG5vZGUsICdbb25dJykuZm9yRWFjaChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgICAgbGV0XG4gICAgICAgICAgICBrZXlWYWx1ZSA9IGNoaWxkLmdldEF0dHJpYnV0ZSgnb24nKSxcbiAgICAgICAgICAgIGV2ZW50ID0ga2V5VmFsdWUuc3BsaXQoJzonKVswXS50cmltKCksXG4gICAgICAgICAgICBtZXRob2QgPSBrZXlWYWx1ZS5zcGxpdCgnOicpWzFdLnRyaW0oKTtcbiAgICAgICAgbm9kZS5vbihjaGlsZCwgZXZlbnQsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBub2RlW21ldGhvZF0oZSlcbiAgICAgICAgfSlcbiAgICB9KTtcbn1cblxuQmFzZUNvbXBvbmVudC5hZGRQbHVnaW4oe1xuICAgIG5hbWU6ICdyZWZzJyxcbiAgICBvcmRlcjogMzAsXG4gICAgcHJlQ29ubmVjdGVkOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICBhc3NpZ25SZWZzKG5vZGUpO1xuICAgICAgICBhc3NpZ25FdmVudHMobm9kZSk7XG4gICAgfVxufSk7IiwiY29uc3QgQmFzZUNvbXBvbmVudCAgPSByZXF1aXJlKCdCYXNlQ29tcG9uZW50Jyk7XG5jb25zdCBkb20gPSByZXF1aXJlKCdkb20nKTtcblxudmFyXG4gICAgbGlnaHROb2RlcyA9IHt9LFxuICAgIGluc2VydGVkID0ge307XG5cbmZ1bmN0aW9uIGluc2VydCAobm9kZSkge1xuICAgIGlmKGluc2VydGVkW25vZGUuX3VpZF0gfHwgIWhhc1RlbXBsYXRlKG5vZGUpKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb2xsZWN0TGlnaHROb2Rlcyhub2RlKTtcbiAgICBpbnNlcnRUZW1wbGF0ZShub2RlKTtcbiAgICBpbnNlcnRlZFtub2RlLl91aWRdID0gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gY29sbGVjdExpZ2h0Tm9kZXMobm9kZSl7XG4gICAgbGlnaHROb2Rlc1tub2RlLl91aWRdID0gbGlnaHROb2Rlc1tub2RlLl91aWRdIHx8IFtdO1xuICAgIHdoaWxlKG5vZGUuY2hpbGROb2Rlcy5sZW5ndGgpe1xuICAgICAgICBsaWdodE5vZGVzW25vZGUuX3VpZF0ucHVzaChub2RlLnJlbW92ZUNoaWxkKG5vZGUuY2hpbGROb2Rlc1swXSkpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gaGFzVGVtcGxhdGUgKG5vZGUpIHtcbiAgICByZXR1cm4gISFub2RlLmdldFRlbXBsYXRlTm9kZSgpO1xufVxuXG5mdW5jdGlvbiBpbnNlcnRUZW1wbGF0ZUNoYWluIChub2RlKSB7XG4gICAgdmFyIHRlbXBsYXRlcyA9IG5vZGUuZ2V0VGVtcGxhdGVDaGFpbigpO1xuICAgIHRlbXBsYXRlcy5yZXZlcnNlKCkuZm9yRWFjaChmdW5jdGlvbiAodGVtcGxhdGUpIHtcbiAgICAgICAgZ2V0Q29udGFpbmVyKG5vZGUpLmFwcGVuZENoaWxkKEJhc2VDb21wb25lbnQuY2xvbmUodGVtcGxhdGUpKTtcbiAgICB9KTtcbiAgICBpbnNlcnRDaGlsZHJlbihub2RlKTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0VGVtcGxhdGUgKG5vZGUpIHtcbiAgICBpZihub2RlLm5lc3RlZFRlbXBsYXRlKXtcbiAgICAgICAgaW5zZXJ0VGVtcGxhdGVDaGFpbihub2RlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXJcbiAgICAgICAgdGVtcGxhdGVOb2RlID0gbm9kZS5nZXRUZW1wbGF0ZU5vZGUoKTtcblxuICAgIGlmKHRlbXBsYXRlTm9kZSkge1xuICAgICAgICBub2RlLmFwcGVuZENoaWxkKEJhc2VDb21wb25lbnQuY2xvbmUodGVtcGxhdGVOb2RlKSk7XG4gICAgfVxuICAgIGluc2VydENoaWxkcmVuKG5vZGUpO1xufVxuXG5mdW5jdGlvbiBnZXRDb250YWluZXIgKG5vZGUpIHtcbiAgICB2YXIgY29udGFpbmVycyA9IG5vZGUucXVlcnlTZWxlY3RvckFsbCgnW3JlZj1cImNvbnRhaW5lclwiXScpO1xuICAgIGlmKCFjb250YWluZXJzIHx8ICFjb250YWluZXJzLmxlbmd0aCl7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgICByZXR1cm4gY29udGFpbmVyc1tjb250YWluZXJzLmxlbmd0aCAtIDFdO1xufVxuXG5mdW5jdGlvbiBpbnNlcnRDaGlsZHJlbiAobm9kZSkge1xuICAgIHZhciBpLFxuICAgICAgICBjb250YWluZXIgPSBnZXRDb250YWluZXIobm9kZSksXG4gICAgICAgIGNoaWxkcmVuID0gbGlnaHROb2Rlc1tub2RlLl91aWRdO1xuXG4gICAgaWYoY29udGFpbmVyICYmIGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCl7XG4gICAgICAgIGZvcihpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChjaGlsZHJlbltpXSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbkJhc2VDb21wb25lbnQucHJvdG90eXBlLmdldExpZ2h0Tm9kZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGxpZ2h0Tm9kZXNbdGhpcy5fdWlkXTtcbn07XG5cbkJhc2VDb21wb25lbnQucHJvdG90eXBlLmdldFRlbXBsYXRlTm9kZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBjYWNoaW5nIGNhdXNlcyBkaWZmZXJlbnQgY2xhc3NlcyB0byBwdWxsIHRoZSBzYW1lIHRlbXBsYXRlIC0gd2F0P1xuICAgIC8vaWYoIXRoaXMudGVtcGxhdGVOb2RlKSB7XG4gICAgICAgIGlmICh0aGlzLnRlbXBsYXRlSWQpIHtcbiAgICAgICAgICAgIHRoaXMudGVtcGxhdGVOb2RlID0gZG9tLmJ5SWQodGhpcy50ZW1wbGF0ZUlkLnJlcGxhY2UoJyMnLCcnKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy50ZW1wbGF0ZVN0cmluZykge1xuICAgICAgICAgICAgdGhpcy50ZW1wbGF0ZU5vZGUgPSBkb20udG9Eb20oJzx0ZW1wbGF0ZT4nICsgdGhpcy50ZW1wbGF0ZVN0cmluZyArICc8L3RlbXBsYXRlPicpO1xuICAgICAgICB9XG4gICAgLy99XG4gICAgcmV0dXJuIHRoaXMudGVtcGxhdGVOb2RlO1xufTtcblxuQmFzZUNvbXBvbmVudC5wcm90b3R5cGUuZ2V0VGVtcGxhdGVDaGFpbiA9IGZ1bmN0aW9uICgpIHtcblxuICAgIGxldFxuICAgICAgICBjb250ZXh0ID0gdGhpcyxcbiAgICAgICAgdGVtcGxhdGVzID0gW10sXG4gICAgICAgIHRlbXBsYXRlO1xuXG4gICAgLy8gd2FsayB0aGUgcHJvdG90eXBlIGNoYWluOyBCYWJlbCBkb2Vzbid0IGFsbG93IHVzaW5nXG4gICAgLy8gYHN1cGVyYCBzaW5jZSB3ZSBhcmUgb3V0c2lkZSBvZiB0aGUgQ2xhc3NcbiAgICB3aGlsZShjb250ZXh0KXtcbiAgICAgICAgY29udGV4dCA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihjb250ZXh0KTtcbiAgICAgICAgaWYoIWNvbnRleHQpeyBicmVhazsgfVxuICAgICAgICAvLyBza2lwIHByb3RvdHlwZXMgd2l0aG91dCBhIHRlbXBsYXRlXG4gICAgICAgIC8vIChlbHNlIGl0IHdpbGwgcHVsbCBhbiBpbmhlcml0ZWQgdGVtcGxhdGUgYW5kIGNhdXNlIGR1cGxpY2F0ZXMpXG4gICAgICAgIGlmKGNvbnRleHQuaGFzT3duUHJvcGVydHkoJ3RlbXBsYXRlU3RyaW5nJykgfHwgY29udGV4dC5oYXNPd25Qcm9wZXJ0eSgndGVtcGxhdGVJZCcpKSB7XG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IGNvbnRleHQuZ2V0VGVtcGxhdGVOb2RlKCk7XG4gICAgICAgICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZXMucHVzaCh0ZW1wbGF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRlbXBsYXRlcztcbn07XG5cbkJhc2VDb21wb25lbnQuYWRkUGx1Z2luKHtcbiAgICBuYW1lOiAndGVtcGxhdGUnLFxuICAgIG9yZGVyOiAyMCxcbiAgICBwcmVDb25uZWN0ZWQ6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIGluc2VydChub2RlKTtcbiAgICB9XG59KTsiLCJyZXF1aXJlKCdCYXNlQ29tcG9uZW50L3NyYy9wcm9wZXJ0aWVzJyk7XG5yZXF1aXJlKCdCYXNlQ29tcG9uZW50L3NyYy90ZW1wbGF0ZScpO1xucmVxdWlyZSgnQmFzZUNvbXBvbmVudC9zcmMvcmVmcycpO1xuY29uc3QgQmFzZUNvbXBvbmVudCA9IHJlcXVpcmUoJ0Jhc2VDb21wb25lbnQnKTtcbmNvbnN0IGRvbSA9IHJlcXVpcmUoJ2RvbScpO1xuY29uc3Qgb24gPSByZXF1aXJlKCdvbicpO1xuXG5jb25zb2xlLmxvZygnRFAgTE9BREVEJyk7XG5jb25zdCBwcm9wcyA9IFsnbGFiZWwnLCAnbmFtZSddO1xuY29uc3QgYm9vbHMgPSBbJ25vLWV2ZW50JywgJ2Rpc2FibGVkJywgJ3JlYWRvbmx5JywgJ2NoZWNrZWQnXTtcblxuY2xhc3MgRGF0ZVBpY2tlciBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXG5cdGdldCB0ZW1wbGF0ZVN0cmluZyAoKSB7XG5cdFx0cmV0dXJuIGBcbjxsYWJlbD5cblx0PGljb24tY2hlY2s+PC9pY29uLWNoZWNrPlxuXHQ8c3BhbiByZWY9XCJsYWJlbE5vZGVcIj48L3NwYW4+XG48L2xhYmVsPlxuYDtcblx0fVxuXG5cdHN0YXRpYyBnZXQgb2JzZXJ2ZWRBdHRyaWJ1dGVzICgpIHtcblx0XHRyZXR1cm4gWy4uLnByb3BzLCAuLi5ib29sc107XG5cdH1cblxuXHRnZXQgcHJvcHMgKCkge1xuXHRcdHJldHVybiBwcm9wcztcblx0fVxuXG5cdGdldCBib29scyAoKSB7XG5cdFx0cmV0dXJuIGJvb2xzO1xuXHR9XG5cblx0Z2V0IHZhbHVlICgpIHtcblxuXHR9XG5cblx0ZG9tUmVhZHkgKCkge1xuXHRcdGRvbSgnZGl2Jywge2h0bWw6ICdEQVRFIFBJQ0tFUiEhJ30sIHRoaXMpXG5cdH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdkYXRlLXBpY2tlcicsIERhdGVQaWNrZXIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERhdGVQaWNrZXI7IiwicmVxdWlyZSgnLi9nbG9iYWxzJyk7XG5yZXF1aXJlKCcuLi8uLi9zcmMvZGF0ZS1waWNrZXInKTsiLCJ3aW5kb3dbJ25vLW5hdGl2ZS1zaGltJ10gPSBmYWxzZTtcbnJlcXVpcmUoJ2N1c3RvbS1lbGVtZW50cy1wb2x5ZmlsbCcpO1xud2luZG93Lm9uID0gcmVxdWlyZSgnb24nKTtcbndpbmRvdy5kb20gPSByZXF1aXJlKCdkb20nKTsiXX0=
