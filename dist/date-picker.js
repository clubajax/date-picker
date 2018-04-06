(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.datePicker = f()}})(function(){var define,module,exports;return (function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
const on = require('@clubajax/on');

class BaseComponent extends HTMLElement {
	constructor () {
		super();
		this._uid = uid(this.localName);
		privates[this._uid] = { DOMSTATE: 'created' };
		privates[this._uid].handleList = [];
		plugin('init', this);
	}

	connectedCallback () {
		privates[this._uid].DOMSTATE = privates[this._uid].domReadyFired ? 'domready' : 'connected';
		plugin('preConnected', this);
		nextTick(onCheckDomReady.bind(this));
		if (this.connected) {
			this.connected();
		}
		this.fire('connected');
		plugin('postConnected', this);
	}

	onConnected (callback) {
		if (this.DOMSTATE === 'connected' || this.DOMSTATE === 'domready') {
			callback(this);
			return;
		}
		this.once('connected', () => {
			callback(this);
		});
	}

	onDomReady (callback) {
		if (this.DOMSTATE === 'domready') {
			callback(this);
			return;
		}
		this.once('domready', () => {
			callback(this);
		});
	}

	disconnectedCallback () {
		privates[this._uid].DOMSTATE = 'disconnected';
		plugin('preDisconnected', this);
		if (this.disconnected) {
			this.disconnected();
		}
		this.fire('disconnected');

		let time, dod = BaseComponent.destroyOnDisconnect;
		if (dod) {
			time = typeof dod === 'number' ? doc : 300;
			setTimeout(() => {
				if (this.DOMSTATE === 'disconnected') {
					this.destroy();
				}
			}, time);
		}
	}

	attributeChangedCallback (attrName, oldVal, newVal) {
		if (!this.isSettingAttribute) {
			plugin('preAttributeChanged', this, attrName, newVal, oldVal);
			if (this.attributeChanged) {
				this.attributeChanged(attrName, newVal, oldVal);
			}
		}
	}

	destroy () {
		this.fire('destroy');
		privates[this._uid].handleList.forEach(function (handle) {
			handle.remove();
		});
		destroy(this);
	}

	fire (eventName, eventDetail, bubbles) {
		return on.fire(this, eventName, eventDetail, bubbles);
	}

	emit (eventName, value) {
		return on.emit(this, eventName, value);
	}

	on (node, eventName, selector, callback) {
		return this.registerHandle(
			typeof node !== 'string' ? // no node is supplied
				on(node, eventName, selector, callback) :
				on(this, node, eventName, selector));
	}

	once (node, eventName, selector, callback) {
		return this.registerHandle(
			typeof node !== 'string' ? // no node is supplied
				on.once(node, eventName, selector, callback) :
				on.once(this, node, eventName, selector, callback));
	}

	attr (key, value, toggle) {
		this.isSettingAttribute = true;
		const add = toggle === undefined ? true : !!toggle;
		if (add) {
			this.setAttribute(key, value);
		} else {
			this.removeAttribute(key);
		}
		this.isSettingAttribute = false;
	}

	registerHandle (handle) {
		privates[this._uid].handleList.push(handle);
		return handle;
	}

	get DOMSTATE () {
		return privates[this._uid].DOMSTATE;
	}

	static set destroyOnDisconnect (value) {
		privates['destroyOnDisconnect'] = value;
	}

	static get destroyOnDisconnect () {
		return privates['destroyOnDisconnect'];
	}

	static clone (template) {
		if (template.content && template.content.children) {
			return document.importNode(template.content, true);
		}
		const frag = document.createDocumentFragment();
		const cloneNode = document.createElement('div');
		cloneNode.innerHTML = template.innerHTML;

		while (cloneNode.children.length) {
			frag.appendChild(cloneNode.children[0]);
		}
		return frag;
	}

	static addPlugin (plug) {
		let i, order = plug.order || 100;
		if (!plugins.length) {
			plugins.push(plug);
		}
		else if (plugins.length === 1) {
			if (plugins[0].order <= order) {
				plugins.push(plug);
			}
			else {
				plugins.unshift(plug);
			}
		}
		else if (plugins[0].order > order) {
			plugins.unshift(plug);
		}
		else {

			for (i = 1; i < plugins.length; i++) {
				if (order === plugins[i - 1].order || (order > plugins[i - 1].order && order < plugins[i].order)) {
					plugins.splice(i, 0, plug);
					return;
				}
			}
			// was not inserted...
			plugins.push(plug);
		}
	}
}

let
	privates = {},
	plugins = [];

function plugin (method, node, a, b, c) {
	plugins.forEach(function (plug) {
		if (plug[method]) {
			plug[method](node, a, b, c);
		}
	});
}

function onCheckDomReady () {
	if (this.DOMSTATE !== 'connected' || privates[this._uid].domReadyFired) {
		return;
	}

	let
		count = 0,
		children = getChildCustomNodes(this),
		ourDomReady = onSelfDomReady.bind(this);

	function addReady () {
		count++;
		if (count === children.length) {
			ourDomReady();
		}
	}

	// If no children, we're good - leaf node. Commence with onDomReady
	//
	if (!children.length) {
		ourDomReady();
	}
	else {
		// else, wait for all children to fire their `ready` events
		//
		children.forEach(function (child) {
			// check if child is already ready
			// also check for connected - this handles moving a node from another node
			// NOPE, that failed. removed for now child.DOMSTATE === 'connected'
			if (child.DOMSTATE === 'domready') {
				addReady();
			}
			// if not, wait for event
			child.on('domready', addReady);
		});
	}
}

function onSelfDomReady () {
	privates[this._uid].DOMSTATE = 'domready';
	// domReady should only ever fire once
	privates[this._uid].domReadyFired = true;
	plugin('preDomReady', this);
	// call this.domReady first, so that the component
	// can finish initializing before firing any
	// subsequent events
	if (this.domReady) {
		this.domReady();
		this.domReady = function () {};
	}

	// allow component to fire this event
	// domReady() will still be called
	if (!this.fireOwnDomready) {
		this.fire('domready');
	}

	plugin('postDomReady', this);
}

function getChildCustomNodes (node) {
	// collect any children that are custom nodes
	// used to check if their dom is ready before
	// determining if this is ready
	let i, nodes = [];
	for (i = 0; i < node.children.length; i++) {
		if (node.children[i].nodeName.indexOf('-') > -1) {
			nodes.push(node.children[i]);
		}
	}
	return nodes;
}

function nextTick (cb) {
	requestAnimationFrame(cb);
}

const uids = {};
function uid (type = 'uid') {
	if (uids[type] === undefined) {
		uids[type] = 0;
	}
	const id = type + '-' + (uids[type] + 1);
	uids[type]++;
	return id;
}

const destroyer = document.createElement('div');
function destroy (node) {
	if (node) {
		destroyer.appendChild(node);
		destroyer.innerHTML = '';
	}
}

function makeGlobalListeners (name, eventName) {
	window[name] = function (nodeOrNodes, callback) {
		function handleDomReady (node, cb) {
			function onReady () {
				cb(node);
				node.removeEventListener(eventName, onReady);
			}

			if (node.DOMSTATE === eventName || node.DOMSTATE === 'domready') {
				cb(node);
			}
			else {
				node.addEventListener(eventName, onReady);
			}
		}

		if (!Array.isArray(nodeOrNodes)) {
			handleDomReady(nodeOrNodes, callback);
			return;
		}

		let count = 0;

		function onArrayNodeReady () {
			count++;
			if (count === nodeOrNodes.length) {
				callback(nodeOrNodes);
			}
		}

		for (let i = 0; i < nodeOrNodes.length; i++) {
			handleDomReady(nodeOrNodes[i], onArrayNodeReady);
		}
	};
}

makeGlobalListeners('onDomReady', 'domready');
makeGlobalListeners('onConnected', 'connected');

module.exports = BaseComponent;
},{"@clubajax/on":9}],2:[function(require,module,exports){
module.exports = require('@clubajax/base-component/src/BaseComponent');
require('@clubajax/base-component/src/template');
require('@clubajax/base-component/src/properties');
require('@clubajax/base-component/src/refs');
},{"@clubajax/base-component/src/BaseComponent":1,"@clubajax/base-component/src/properties":3,"@clubajax/base-component/src/refs":4,"@clubajax/base-component/src/template":5}],3:[function(require,module,exports){
const BaseComponent = require('./BaseComponent');

function setBoolean (node, prop) {
	let propValue;
	Object.defineProperty(node, prop, {
		enumerable: true,
		configurable: true,
		get () {
			const att = this.getAttribute(prop);
			return (att !== undefined && att !== null && att !== 'false' && att !== false);
		},
		set (value) {
			this.isSettingAttribute = true;
			if (value) {
				this.setAttribute(prop, '');
			} else {
				this.removeAttribute(prop);
			}
			if (this.attributeChanged) {
				this.attributeChanged(prop, value);
			}
			const fn = this[onify(prop)];
			if (fn) {
				const eventName = this.connectedProps ? 'onConnected' : 'onDomReady';
				window[eventName](this, () => {

					if (value !== undefined && propValue !== value) {
						value = fn.call(this, value) || value;
					}
					propValue = value;
				});
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
			return propValue !== undefined ? propValue : normalize(this.getAttribute(prop));
		},
		set (value) {
			this.isSettingAttribute = true;
			this.setAttribute(prop, value);
			if (this.attributeChanged) {
				this.attributeChanged(prop, value);
			}
			const fn = this[onify(prop)];
			if(fn){
				const eventName = this.connectedProps ? 'onConnected' : 'onDomReady';
				window[eventName](this, () => {
					if(value !== undefined){
						propValue = value;
					}

					value = fn.call(this, value) || value;
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
	return normalize(value);
}

function propNorm (value) {
	return normalize(value);
}

function normalize(val) {
	if (typeof val === 'string') {
		val = val.trim();
		if (val === 'false') {
			return false;
		} else if (val === 'null') {
			return null;
		} else if (val === 'true') {
			return true;
		}
		// finds strings that start with numbers, but are not numbers:
		// '1team' '123 Street', '1-2-3', etc
		if (('' + val).replace(/-?\d*\.?\d*/, '').length) {
			return val;
		}
	}
	if (!isNaN(parseFloat(val))) {
		return parseFloat(val);
	}
	return val;
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
},{"./BaseComponent":1}],4:[function(require,module,exports){
const BaseComponent = require('./BaseComponent');

function assignRefs (node) {

    [...node.querySelectorAll('[ref]')].forEach(function (child) {
        let name = child.getAttribute('ref');
		child.removeAttribute('ref');
        node[name] = child;
    });
}

function assignEvents (node) {
    // <div on="click:onClick">
	[...node.querySelectorAll('[on]')].forEach(function (child, i, children) {
		if(child === node){
			return;
		}
		let
            keyValue = child.getAttribute('on'),
            event = keyValue.split(':')[0].trim(),
            method = keyValue.split(':')[1].trim();
		// remove, so parent does not try to use it
		child.removeAttribute('on');

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
},{"./BaseComponent":1}],5:[function(require,module,exports){
const BaseComponent  = require('./BaseComponent');

const lightNodes = {};
const inserted = {};

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
	return node.templateString || node.templateId;
}

function insertTemplateChain (node) {
    const templates = node.getTemplateChain();
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
    const templateNode = node.getTemplateNode();

    if(templateNode) {
        node.appendChild(BaseComponent.clone(templateNode));
    }
    insertChildren(node);
}

function getContainer (node) {
    const containers = node.querySelectorAll('[ref="container"]');
    if(!containers || !containers.length){
        return node;
    }
    return containers[containers.length - 1];
}

function insertChildren (node) {
    let i;
	const container = getContainer(node);
	const children = lightNodes[node._uid];

    if(container && children && children.length){
        for(i = 0; i < children.length; i++){
            container.appendChild(children[i]);
        }
    }
}

function toDom (html){
	const node = document.createElement('div');
	node.innerHTML = html;
	return node.firstChild;
}

BaseComponent.prototype.getLightNodes = function () {
    return lightNodes[this._uid];
};

BaseComponent.prototype.getTemplateNode = function () {
    // caching causes different classes to pull the same template - wat?
    //if(!this.templateNode) {
	if (this.templateId) {
		this.templateNode = document.getElementById(this.templateId.replace('#',''));
	}
	else if (this.templateString) {
		this.templateNode = toDom('<template>' + this.templateString + '</template>');
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
},{"./BaseComponent":1}],6:[function(require,module,exports){
(function () {
if(window['force-no-ce-shim']){
	return;
}
var supportsV1 = 'customElements' in window;
var nativeShimBase64 = "ZnVuY3Rpb24gbmF0aXZlU2hpbSgpeygoKT0+eyd1c2Ugc3RyaWN0JztpZighd2luZG93LmN1c3RvbUVsZW1lbnRzKXJldHVybjtjb25zdCBhPXdpbmRvdy5IVE1MRWxlbWVudCxiPXdpbmRvdy5jdXN0b21FbGVtZW50cy5kZWZpbmUsYz13aW5kb3cuY3VzdG9tRWxlbWVudHMuZ2V0LGQ9bmV3IE1hcCxlPW5ldyBNYXA7bGV0IGY9ITEsZz0hMTt3aW5kb3cuSFRNTEVsZW1lbnQ9ZnVuY3Rpb24oKXtpZighZil7Y29uc3Qgaj1kLmdldCh0aGlzLmNvbnN0cnVjdG9yKSxrPWMuY2FsbCh3aW5kb3cuY3VzdG9tRWxlbWVudHMsaik7Zz0hMDtjb25zdCBsPW5ldyBrO3JldHVybiBsfWY9ITE7fSx3aW5kb3cuSFRNTEVsZW1lbnQucHJvdG90eXBlPWEucHJvdG90eXBlO09iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3csJ2N1c3RvbUVsZW1lbnRzJyx7dmFsdWU6d2luZG93LmN1c3RvbUVsZW1lbnRzLGNvbmZpZ3VyYWJsZTohMCx3cml0YWJsZTohMH0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3cuY3VzdG9tRWxlbWVudHMsJ2RlZmluZScse3ZhbHVlOihqLGspPT57Y29uc3QgbD1rLnByb3RvdHlwZSxtPWNsYXNzIGV4dGVuZHMgYXtjb25zdHJ1Y3Rvcigpe3N1cGVyKCksT2JqZWN0LnNldFByb3RvdHlwZU9mKHRoaXMsbCksZ3x8KGY9ITAsay5jYWxsKHRoaXMpKSxnPSExO319LG49bS5wcm90b3R5cGU7bS5vYnNlcnZlZEF0dHJpYnV0ZXM9ay5vYnNlcnZlZEF0dHJpYnV0ZXMsbi5jb25uZWN0ZWRDYWxsYmFjaz1sLmNvbm5lY3RlZENhbGxiYWNrLG4uZGlzY29ubmVjdGVkQ2FsbGJhY2s9bC5kaXNjb25uZWN0ZWRDYWxsYmFjayxuLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjaz1sLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayxuLmFkb3B0ZWRDYWxsYmFjaz1sLmFkb3B0ZWRDYWxsYmFjayxkLnNldChrLGopLGUuc2V0KGosayksYi5jYWxsKHdpbmRvdy5jdXN0b21FbGVtZW50cyxqLG0pO30sY29uZmlndXJhYmxlOiEwLHdyaXRhYmxlOiEwfSksT2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdy5jdXN0b21FbGVtZW50cywnZ2V0Jyx7dmFsdWU6KGopPT5lLmdldChqKSxjb25maWd1cmFibGU6ITAsd3JpdGFibGU6ITB9KTt9KSgpO30=";

if(supportsV1 && !window['force-ce-shim']){
if(!window['no-native-shim']) {
eval(window.atob(nativeShimBase64));
nativeShim();
}
}else{
customElements();
}

function customElements() {
(function(){
// @license Polymer Project Authors. http://polymer.github.io/LICENSE.txt
'use strict';var g=new function(){};var aa=new Set("annotation-xml color-profile font-face font-face-src font-face-uri font-face-format font-face-name missing-glyph".split(" "));function k(b){var a=aa.has(b);b=/^[a-z][.0-9_a-z]*-[\-.0-9_a-z]*$/.test(b);return!a&&b}function l(b){var a=b.isConnected;if(void 0!==a)return a;for(;b&&!(b.__CE_isImportDocument||b instanceof Document);)b=b.parentNode||(window.ShadowRoot&&b instanceof ShadowRoot?b.host:void 0);return!(!b||!(b.__CE_isImportDocument||b instanceof Document))}
function m(b,a){for(;a&&a!==b&&!a.nextSibling;)a=a.parentNode;return a&&a!==b?a.nextSibling:null}
function n(b,a,e){e=e?e:new Set;for(var c=b;c;){if(c.nodeType===Node.ELEMENT_NODE){var d=c;a(d);var h=d.localName;if("link"===h&&"import"===d.getAttribute("rel")){c=d.import;if(c instanceof Node&&!e.has(c))for(e.add(c),c=c.firstChild;c;c=c.nextSibling)n(c,a,e);c=m(b,d);continue}else if("template"===h){c=m(b,d);continue}if(d=d.__CE_shadowRoot)for(d=d.firstChild;d;d=d.nextSibling)n(d,a,e)}c=c.firstChild?c.firstChild:m(b,c)}}function q(b,a,e){b[a]=e};function r(){this.a=new Map;this.f=new Map;this.c=[];this.b=!1}function ba(b,a,e){b.a.set(a,e);b.f.set(e.constructor,e)}function t(b,a){b.b=!0;b.c.push(a)}function v(b,a){b.b&&n(a,function(a){return w(b,a)})}function w(b,a){if(b.b&&!a.__CE_patched){a.__CE_patched=!0;for(var e=0;e<b.c.length;e++)b.c[e](a)}}function x(b,a){var e=[];n(a,function(b){return e.push(b)});for(a=0;a<e.length;a++){var c=e[a];1===c.__CE_state?b.connectedCallback(c):y(b,c)}}
function z(b,a){var e=[];n(a,function(b){return e.push(b)});for(a=0;a<e.length;a++){var c=e[a];1===c.__CE_state&&b.disconnectedCallback(c)}}
function A(b,a,e){e=e?e:new Set;var c=[];n(a,function(d){if("link"===d.localName&&"import"===d.getAttribute("rel")){var a=d.import;a instanceof Node&&"complete"===a.readyState?(a.__CE_isImportDocument=!0,a.__CE_hasRegistry=!0):d.addEventListener("load",function(){var a=d.import;a.__CE_documentLoadHandled||(a.__CE_documentLoadHandled=!0,a.__CE_isImportDocument=!0,a.__CE_hasRegistry=!0,new Set(e),e.delete(a),A(b,a,e))})}else c.push(d)},e);if(b.b)for(a=0;a<c.length;a++)w(b,c[a]);for(a=0;a<c.length;a++)y(b,
c[a])}
function y(b,a){if(void 0===a.__CE_state){var e=b.a.get(a.localName);if(e){e.constructionStack.push(a);var c=e.constructor;try{try{if(new c!==a)throw Error("The custom element constructor did not produce the element being upgraded.");}finally{e.constructionStack.pop()}}catch(f){throw a.__CE_state=2,f;}a.__CE_state=1;a.__CE_definition=e;if(e.attributeChangedCallback)for(e=e.observedAttributes,c=0;c<e.length;c++){var d=e[c],h=a.getAttribute(d);null!==h&&b.attributeChangedCallback(a,d,null,h,null)}l(a)&&b.connectedCallback(a)}}}
r.prototype.connectedCallback=function(b){var a=b.__CE_definition;a.connectedCallback&&a.connectedCallback.call(b)};r.prototype.disconnectedCallback=function(b){var a=b.__CE_definition;a.disconnectedCallback&&a.disconnectedCallback.call(b)};r.prototype.attributeChangedCallback=function(b,a,e,c,d){var h=b.__CE_definition;h.attributeChangedCallback&&-1<h.observedAttributes.indexOf(a)&&h.attributeChangedCallback.call(b,a,e,c,d)};function B(b,a){this.c=b;this.a=a;this.b=void 0;A(this.c,this.a);"loading"===this.a.readyState&&(this.b=new MutationObserver(this.f.bind(this)),this.b.observe(this.a,{childList:!0,subtree:!0}))}function C(b){b.b&&b.b.disconnect()}B.prototype.f=function(b){var a=this.a.readyState;"interactive"!==a&&"complete"!==a||C(this);for(a=0;a<b.length;a++)for(var e=b[a].addedNodes,c=0;c<e.length;c++)A(this.c,e[c])};function ca(){var b=this;this.b=this.a=void 0;this.c=new Promise(function(a){b.b=a;b.a&&a(b.a)})}function D(b){if(b.a)throw Error("Already resolved.");b.a=void 0;b.b&&b.b(void 0)};function E(b){this.f=!1;this.a=b;this.h=new Map;this.g=function(b){return b()};this.b=!1;this.c=[];this.j=new B(b,document)}
E.prototype.l=function(b,a){var e=this;if(!(a instanceof Function))throw new TypeError("Custom element constructors must be functions.");if(!k(b))throw new SyntaxError("The element name '"+b+"' is not valid.");if(this.a.a.get(b))throw Error("A custom element with name '"+b+"' has already been defined.");if(this.f)throw Error("A custom element is already being defined.");this.f=!0;var c,d,h,f,u;try{var p=function(b){var a=P[b];if(void 0!==a&&!(a instanceof Function))throw Error("The '"+b+"' callback must be a function.");
return a},P=a.prototype;if(!(P instanceof Object))throw new TypeError("The custom element constructor's prototype is not an object.");c=p("connectedCallback");d=p("disconnectedCallback");h=p("adoptedCallback");f=p("attributeChangedCallback");u=a.observedAttributes||[]}catch(va){return}finally{this.f=!1}ba(this.a,b,{localName:b,constructor:a,connectedCallback:c,disconnectedCallback:d,adoptedCallback:h,attributeChangedCallback:f,observedAttributes:u,constructionStack:[]});this.c.push(b);this.b||(this.b=
!0,this.g(function(){if(!1!==e.b)for(e.b=!1,A(e.a,document);0<e.c.length;){var b=e.c.shift();(b=e.h.get(b))&&D(b)}}))};E.prototype.get=function(b){if(b=this.a.a.get(b))return b.constructor};E.prototype.o=function(b){if(!k(b))return Promise.reject(new SyntaxError("'"+b+"' is not a valid custom element name."));var a=this.h.get(b);if(a)return a.c;a=new ca;this.h.set(b,a);this.a.a.get(b)&&-1===this.c.indexOf(b)&&D(a);return a.c};E.prototype.m=function(b){C(this.j);var a=this.g;this.g=function(e){return b(function(){return a(e)})}};
window.CustomElementRegistry=E;E.prototype.define=E.prototype.l;E.prototype.get=E.prototype.get;E.prototype.whenDefined=E.prototype.o;E.prototype.polyfillWrapFlushCallback=E.prototype.m;var F=window.Document.prototype.createElement,da=window.Document.prototype.createElementNS,ea=window.Document.prototype.importNode,fa=window.Document.prototype.prepend,ga=window.Document.prototype.append,G=window.Node.prototype.cloneNode,H=window.Node.prototype.appendChild,I=window.Node.prototype.insertBefore,J=window.Node.prototype.removeChild,K=window.Node.prototype.replaceChild,L=Object.getOwnPropertyDescriptor(window.Node.prototype,"textContent"),M=window.Element.prototype.attachShadow,N=Object.getOwnPropertyDescriptor(window.Element.prototype,
"innerHTML"),O=window.Element.prototype.getAttribute,Q=window.Element.prototype.setAttribute,R=window.Element.prototype.removeAttribute,S=window.Element.prototype.getAttributeNS,T=window.Element.prototype.setAttributeNS,U=window.Element.prototype.removeAttributeNS,V=window.Element.prototype.insertAdjacentElement,ha=window.Element.prototype.prepend,ia=window.Element.prototype.append,ja=window.Element.prototype.before,ka=window.Element.prototype.after,la=window.Element.prototype.replaceWith,ma=window.Element.prototype.remove,
na=window.HTMLElement,W=Object.getOwnPropertyDescriptor(window.HTMLElement.prototype,"innerHTML"),X=window.HTMLElement.prototype.insertAdjacentElement;function oa(){var b=Y;window.HTMLElement=function(){function a(){var a=this.constructor,c=b.f.get(a);if(!c)throw Error("The custom element being constructed was not registered with `customElements`.");var d=c.constructionStack;if(!d.length)return d=F.call(document,c.localName),Object.setPrototypeOf(d,a.prototype),d.__CE_state=1,d.__CE_definition=c,w(b,d),d;var c=d.length-1,h=d[c];if(h===g)throw Error("The HTMLElement constructor was either called reentrantly for this constructor or called multiple times.");
d[c]=g;Object.setPrototypeOf(h,a.prototype);w(b,h);return h}a.prototype=na.prototype;return a}()};function pa(b,a,e){a.prepend=function(a){for(var d=[],c=0;c<arguments.length;++c)d[c-0]=arguments[c];c=d.filter(function(b){return b instanceof Node&&l(b)});e.i.apply(this,d);for(var f=0;f<c.length;f++)z(b,c[f]);if(l(this))for(c=0;c<d.length;c++)f=d[c],f instanceof Element&&x(b,f)};a.append=function(a){for(var d=[],c=0;c<arguments.length;++c)d[c-0]=arguments[c];c=d.filter(function(b){return b instanceof Node&&l(b)});e.append.apply(this,d);for(var f=0;f<c.length;f++)z(b,c[f]);if(l(this))for(c=0;c<
d.length;c++)f=d[c],f instanceof Element&&x(b,f)}};function qa(){var b=Y;q(Document.prototype,"createElement",function(a){if(this.__CE_hasRegistry){var e=b.a.get(a);if(e)return new e.constructor}a=F.call(this,a);w(b,a);return a});q(Document.prototype,"importNode",function(a,e){a=ea.call(this,a,e);this.__CE_hasRegistry?A(b,a):v(b,a);return a});q(Document.prototype,"createElementNS",function(a,e){if(this.__CE_hasRegistry&&(null===a||"http://www.w3.org/1999/xhtml"===a)){var c=b.a.get(e);if(c)return new c.constructor}a=da.call(this,a,e);w(b,a);return a});
pa(b,Document.prototype,{i:fa,append:ga})};function ra(){var b=Y;function a(a,c){Object.defineProperty(a,"textContent",{enumerable:c.enumerable,configurable:!0,get:c.get,set:function(a){if(this.nodeType===Node.TEXT_NODE)c.set.call(this,a);else{var d=void 0;if(this.firstChild){var e=this.childNodes,u=e.length;if(0<u&&l(this))for(var d=Array(u),p=0;p<u;p++)d[p]=e[p]}c.set.call(this,a);if(d)for(a=0;a<d.length;a++)z(b,d[a])}}})}q(Node.prototype,"insertBefore",function(a,c){if(a instanceof DocumentFragment){var d=Array.prototype.slice.apply(a.childNodes);
a=I.call(this,a,c);if(l(this))for(c=0;c<d.length;c++)x(b,d[c]);return a}d=l(a);c=I.call(this,a,c);d&&z(b,a);l(this)&&x(b,a);return c});q(Node.prototype,"appendChild",function(a){if(a instanceof DocumentFragment){var c=Array.prototype.slice.apply(a.childNodes);a=H.call(this,a);if(l(this))for(var d=0;d<c.length;d++)x(b,c[d]);return a}c=l(a);d=H.call(this,a);c&&z(b,a);l(this)&&x(b,a);return d});q(Node.prototype,"cloneNode",function(a){a=G.call(this,a);this.ownerDocument.__CE_hasRegistry?A(b,a):v(b,a);
return a});q(Node.prototype,"removeChild",function(a){var c=l(a),d=J.call(this,a);c&&z(b,a);return d});q(Node.prototype,"replaceChild",function(a,c){if(a instanceof DocumentFragment){var d=Array.prototype.slice.apply(a.childNodes);a=K.call(this,a,c);if(l(this))for(z(b,c),c=0;c<d.length;c++)x(b,d[c]);return a}var d=l(a),e=K.call(this,a,c),f=l(this);f&&z(b,c);d&&z(b,a);f&&x(b,a);return e});L&&L.get?a(Node.prototype,L):t(b,function(b){a(b,{enumerable:!0,configurable:!0,get:function(){for(var a=[],b=
0;b<this.childNodes.length;b++)a.push(this.childNodes[b].textContent);return a.join("")},set:function(a){for(;this.firstChild;)J.call(this,this.firstChild);H.call(this,document.createTextNode(a))}})})};function sa(b){var a=Element.prototype;a.before=function(a){for(var c=[],d=0;d<arguments.length;++d)c[d-0]=arguments[d];d=c.filter(function(a){return a instanceof Node&&l(a)});ja.apply(this,c);for(var e=0;e<d.length;e++)z(b,d[e]);if(l(this))for(d=0;d<c.length;d++)e=c[d],e instanceof Element&&x(b,e)};a.after=function(a){for(var c=[],d=0;d<arguments.length;++d)c[d-0]=arguments[d];d=c.filter(function(a){return a instanceof Node&&l(a)});ka.apply(this,c);for(var e=0;e<d.length;e++)z(b,d[e]);if(l(this))for(d=
0;d<c.length;d++)e=c[d],e instanceof Element&&x(b,e)};a.replaceWith=function(a){for(var c=[],d=0;d<arguments.length;++d)c[d-0]=arguments[d];var d=c.filter(function(a){return a instanceof Node&&l(a)}),e=l(this);la.apply(this,c);for(var f=0;f<d.length;f++)z(b,d[f]);if(e)for(z(b,this),d=0;d<c.length;d++)e=c[d],e instanceof Element&&x(b,e)};a.remove=function(){var a=l(this);ma.call(this);a&&z(b,this)}};function ta(){var b=Y;function a(a,c){Object.defineProperty(a,"innerHTML",{enumerable:c.enumerable,configurable:!0,get:c.get,set:function(a){var d=this,e=void 0;l(this)&&(e=[],n(this,function(a){a!==d&&e.push(a)}));c.set.call(this,a);if(e)for(var f=0;f<e.length;f++){var h=e[f];1===h.__CE_state&&b.disconnectedCallback(h)}this.ownerDocument.__CE_hasRegistry?A(b,this):v(b,this);return a}})}function e(a,c){q(a,"insertAdjacentElement",function(a,d){var e=l(d);a=c.call(this,a,d);e&&z(b,d);l(a)&&x(b,d);
return a})}M?q(Element.prototype,"attachShadow",function(a){return this.__CE_shadowRoot=a=M.call(this,a)}):console.warn("Custom Elements: `Element#attachShadow` was not patched.");if(N&&N.get)a(Element.prototype,N);else if(W&&W.get)a(HTMLElement.prototype,W);else{var c=F.call(document,"div");t(b,function(b){a(b,{enumerable:!0,configurable:!0,get:function(){return G.call(this,!0).innerHTML},set:function(a){var b="template"===this.localName?this.content:this;for(c.innerHTML=a;0<b.childNodes.length;)J.call(b,
b.childNodes[0]);for(;0<c.childNodes.length;)H.call(b,c.childNodes[0])}})})}q(Element.prototype,"setAttribute",function(a,c){if(1!==this.__CE_state)return Q.call(this,a,c);var d=O.call(this,a);Q.call(this,a,c);c=O.call(this,a);d!==c&&b.attributeChangedCallback(this,a,d,c,null)});q(Element.prototype,"setAttributeNS",function(a,c,e){if(1!==this.__CE_state)return T.call(this,a,c,e);var d=S.call(this,a,c);T.call(this,a,c,e);e=S.call(this,a,c);d!==e&&b.attributeChangedCallback(this,c,d,e,a)});q(Element.prototype,
"removeAttribute",function(a){if(1!==this.__CE_state)return R.call(this,a);var c=O.call(this,a);R.call(this,a);null!==c&&b.attributeChangedCallback(this,a,c,null,null)});q(Element.prototype,"removeAttributeNS",function(a,c){if(1!==this.__CE_state)return U.call(this,a,c);var d=S.call(this,a,c);U.call(this,a,c);var e=S.call(this,a,c);d!==e&&b.attributeChangedCallback(this,c,d,e,a)});X?e(HTMLElement.prototype,X):V?e(Element.prototype,V):console.warn("Custom Elements: `Element#insertAdjacentElement` was not patched.");
pa(b,Element.prototype,{i:ha,append:ia});sa(b)};
var Z=window.customElements;if(!Z||Z.forcePolyfill||"function"!=typeof Z.define||"function"!=typeof Z.get){var Y=new r;oa();qa();ra();ta();document.__CE_hasRegistry=!0;var ua=new E(Y);Object.defineProperty(window,"customElements",{configurable:!0,enumerable:!0,value:ua})};
}).call(self);
}
}());
},{}],7:[function(require,module,exports){
(function (root, factory) {
	if (typeof customLoader === 'function') {
		customLoader(factory, 'dates');
	}
	else if (typeof define === 'function' && define.amd) {
		define([], factory);
	}
	else if (typeof exports === 'object') {
		module.exports = factory();
	}
	else {
		root.returnExports = factory();
		window.dates = factory();
	}
}(this, function () {

	const
		// tests that it is a date string, not a valid date. 88/88/8888 would be true
		dateRegExp = /^(\d{1,2})([\/-])(\d{1,2})([\/-])(\d{4})\b/,

		// 2015-05-26T00:00:00
		tsRegExp = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\b/,

		// 12:30 am
		timeRegExp = /(\d\d):(\d\d)(?:\s|:)(\d\d|[ap]m)(?:\s)*([ap]m)*/i,

		daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
		days = [],
		days3 = [],
		dayDict = {},

		months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
		monthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
		monthAbbr = [],
		monthDict = {},

		// https://docs.oracle.com/javase/7/docs/api/java/text/SimpleDateFormat.html
		//
		datePattern = /yyyy|yy|MMMM|MMM|MM|M|dd|d|E|e|H|h|m|s|A|a/g,
		datePatternLibrary = {
			yyyy: function (date) {
				return date.getFullYear();
			},
			yy: function (date) {
				return (date.getFullYear() + '').substring(2);
			},
			MMMM: function (date) {
				return months[date.getMonth()];
			},
			MMM: function (date) {
				return monthAbbr[date.getMonth()];
			},
			MM: function (date) {
				return pad(date.getMonth() + 1);
			},

			M: function (date) {
				return date.getMonth() + 1;
			},
			dd: function (date) {
				return pad(date.getDate());
			},
			d: function (date) {
				return date.getDate();
			},
			E: function (date) {
				return daysOfWeek[date.getDay()];
			},
			e: function (date) {
				return days3[date.getDay()];
			},
			H: function (date) {
				return pad(date.getHours());
			},
			h: function (date) {
				var hr = date.getHours();
				if (hr > 12) {
					hr -= 12;
				}
				if (hr === 0) {
					hr = 12;
				}
				return pad(hr);
			},
			m: function (date) {
				return pad(date.getMinutes());
			},
			s: function (date) {
				return pad(date.getSeconds());
			},
			A: function (date) {
				return this.a(date).toUpperCase();
			},
			a: function (date) {
				return date.getHours() >= 12 ? 'pm' : 'am';
			},

			// not standard:
			mmmm: function (date) {
				return this.MMMM(date);
			},
			mmm: function (date) {
				return this.MMM(date);
			},
			mm: function (date) {
				return this.MM(date);
			}
		},

		length = (function () {
			const
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
	daysOfWeek.forEach(function (day, index) {
		dayDict[day] = index;
		let abbr = day.substr(0, 2);
		days.push(abbr);
		dayDict[abbr] = index;
		abbr = day.substr(0, 3);
		days3.push(abbr);
		dayDict[abbr] = index;
	});

	// populate month-related structures
	months.forEach(function (month, index) {
		monthDict[month] = index;
		const abbr = month.substr(0, 3);
		monthAbbr.push(abbr);
		monthDict[abbr] = index;
	});

	function isLeapYear (dateOrYear) {
		const year = dateOrYear instanceof Date ? dateOrYear.getFullYear() : dateOrYear;
		return !(year % 400) || (!(year % 4) && !!(year % 100));
	}

	function isValidObject (date) {
		let ms;
		if (typeof date === 'object' && date instanceof Date) {
			ms = date.getTime();
			return !isNaN(ms) && ms > 0;
		}
		return false;
	}

	function isDate (value) {
		if (typeof value === 'object') {
			return isValidObject(value);
		}
		let parts, day, month, year, hours, minutes, seconds, ms;

		if (timeRegExp.test(value)) {
			// does it have a valid time format?
			parts = timeRegExp.exec(value);
			let hr = parseInt(parts[1]);
			let mn = parseInt(parts[2]);
			let sc = 0;
			if (isNaN(hr) || isNaN(mn)) {
				return false;
			}
			if (/[ap]m/i.test(value)) {
				// uses am/pm
				if (hr > 12) {
					return false;
				}

			} else {
				// 24 hour clock
				sc = parseInt(parts[3]);
			}
			// assumes 24 hour clock here
			if (sc < 0 || sc > 59 || mn < 0 || mn > 59 || hr < 0 || hr > 23) {
				return false;
			}
			// continue with date...
		}

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

		return false;
	}

	function pad (num) {
		return (num < 10 ? '0' : '') + num;
	}

	function getMonth (dateOrIndex) {
		return typeof dateOrIndex === 'number' ? dateOrIndex : dateOrIndex.getMonth();
	}

	function getMonthIndex (name) {
		const index = monthDict[name];
		return typeof index === 'number' ? index : void 0;
	}

	function getMonthName (date) {
		return months[getMonth(date)];
	}

	function getFirstSunday (date) {
		// returns a negative index related to the 1st of the month
		const d = new Date(date.getTime());
		d.setDate(1);
		return -d.getDay();
	}

	function getDaysInPrevMonth (date) {
		const d = new Date(date);
		d.setMonth(d.getMonth() - 1);
		return getDaysInMonth(d);
	}

	function getDaysInMonth (date) {
		const month = date.getMonth();
		return month === 1 && isLeapYear(date) ? 29 : monthLengths[month];
	}

	function toDate (value) {
		if (typeof value !== 'string') {
			return value;
		}
		if (isTimestamp(value)) {
			// 2000-02-29T00:00:00
			return fromTimestamp(value);
		}
		let date = new Date(-1);

		// 11/20/2000
		let parts = dateRegExp.exec(value);
		if (parts && parts[2] === parts[4]) {
			date = new Date(+parts[5], +parts[1] - 1, +parts[3]);
		}

		if (timeRegExp.test(value)) {
			parts = timeRegExp.exec(value);
			let hr = parseInt(parts[1]);
			let mn = parseInt(parts[2]);
			let sc = value.split(':').length === 3 ? parseInt(parts[3]) : 0;
			if (isNaN(hr) || isNaN(mn)) {
				return date;
			}
			if (/[ap]m/i.test(value)) {
				// uses am/pm
				if (/pm/i.test(value)) {
					if (hr !== 12) {
						hr += 12;
					}
				} else if (hr === 12) {
					hr = 0;
				}

			} else {
				// 24 hour clock
				sc = parseInt(parts[3]);
			}
			date.setHours(hr);
			date.setMinutes(mn);
			date.setSeconds(sc);
		}

		return date;
	}

	function formatDatePattern (date, pattern) {
		// 'M d, yyyy' Dec 5, 2015
		// 'MM dd yy' December 05 15
		// 'm-d-yy' 1-1-15
		// 'mm-dd-yyyy' 01-01-2015
		// 'm/d/yy' 12/25/15
		// time:
		// 'yyyy/MM/dd h:m A' 2016/01/26 04:23 AM

		if (/^m\/|\/m\//.test(pattern)) {
			console.warn('Invalid pattern. Did you mean:', pattern.replace('m', 'M'));
		}

		return pattern.replace(datePattern, function (name) {
			return datePatternLibrary[name](date);
		});
	}

	function format (date, delimiterOrPattern) {
		if (delimiterOrPattern && delimiterOrPattern.length > 1) {
			return formatDatePattern(date, delimiterOrPattern);
		}
		const
			del = delimiterOrPattern || '/',
			y = date.getFullYear(),
			m = date.getMonth() + 1,
			d = date.getDate();

		return [pad(m), pad(d), y].join(del);
	}

	function toISO (date, includeTZ) {
		const
			now = new Date(),
			then = new Date(date.getTime());
		then.setHours(now.getHours());
		let str = then.toISOString();
		if (!includeTZ) {
			str = str.split('.')[0];
			str += '.00Z';
		}
		return str;
	}

	function natural (date) {
		if (typeof date === 'string') {
			date = this.from(date);
		}

		let
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

	function add (date, amount, dateType) {
		return subtract(date, -amount, dateType);
	}

	function subtract (date, amount, dateType) {
		// subtract N days from date
		const
			time = date.getTime(),
			tmp = new Date(time);

		if (dateType === 'month') {
			tmp.setMonth(tmp.getMonth() - amount);
			return tmp;
		}
		if (dateType === 'year') {
			tmp.setFullYear(tmp.getFullYear() - amount);
			return tmp;
		}

		return new Date(time - length.day * amount);
	}

	function subtractDate (date1, date2, dateType) {
		// dateType: week, day, hr, min, sec
		// past dates have a positive value
		// future dates have a negative value

		const
			divideBy = {
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
		if (isValidObject(d1) && isValidObject(d2)) {
			return d1.getTime() < d2.getTime();
		}
		return false;
	}

	function isGreater (d1, d2) {
		if (isValidObject(d1) && isValidObject(d2)) {
			return d1.getTime() > d2.getTime();
		}
		return false;
	}

	function diff (date1, date2) {
		// return the difference between 2 dates in days
		const
			utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate()),
			utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());

		return Math.abs(Math.floor((utc2 - utc1) / length.day));
	}

	function copy (date) {
		if (isValidObject(date)) {
			return new Date(date.getTime());
		}
		return date;
	}

	function getNaturalDay (date, compareDate, noDaysOfWeek) {

		const
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
			return format(date);
		}

		return !noDaysOfWeek && daysAgo < daysOfWeek.length ? daysOfWeek[date.getDay()] : format(date);
	}

	function zeroTime (date) {
		date = copy(date);
		date.setHours(0);
		date.setMinutes(0);
		date.setSeconds(0);
		date.setMilliseconds(0);
		return date;
	}

	function toTimestamp (date) {
		return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' +
			pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
	}

	function fromTimestamp (str) {
		// 2015-05-26T00:00:00

		// strip timezone // 2015-05-26T00:00:00Z
		str = str.split('Z')[0];

		const parts = tsRegExp.exec(str);
		if (parts) {
			// new Date(1995, 11, 17, 3, 24, 0);
			return new Date(+parts[1], +parts[2] - 1, +parts[3], +parts[4], +parts[5], +parts[6]);
		}
		return new Date(-1);
	}

	function isTimestamp (str) {
		return typeof str === 'string' && tsRegExp.test(str);
	}

	function toUtcTimestamp (date) {
		return toTimestamp(toUTC(date));
	}

	function fromUtcTimestamp (date) {
		date = toDate(date);
		const tz = date.getTimezoneOffset() * 60000;
		const time = date.getTime() + tz;
		const tzDate = new Date(time);
		return new Date(tzDate.toUTCString());
	}

	function toUTC (date) {
		date = toDate(date);
		return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
	}

	function is (d1) {
		return {
			less (d2) {
				return isLess(d1, d2);
			},
			greater (d2) {
				return isGreater(d1, d2);
			},
			valid () {
				return isDate(d1);
			},
			timestamp () {
				return isTimestamp(d1);
			},
			equal(d2) {
				return toDate(d1).getTime() === toDate(d2).getTime();
			},
			equalDate (d2) {
				return d1.getFullYear() === d2.getFullYear() &&
					d1.getMonth() === d2.getMonth() &&
					d1.getDate() === d2.getDate();
			},
			equalTime (d2) {
				return d1.getHours() === d2.getHours() &&
					d1.getMinutes() && d2.getMinutes() &&
					d1.getSeconds() === d2.getSeconds();
			},
			time () {
				if (typeof d1 !== 'string') {
					throw new Error('value should be a string');
				}
				return timeRegExp.test(d1);
			},
			date () {
				if (typeof d1 !== 'string') {
					throw new Error('value should be a string');
				}
				return dateRegExp.test(d1);
			}
		}
	}

	return {
		// converters
		format: format,
		toDate: toDate,
		isValid: isDate,
		isDate: isDate,
		isValidObject: isValidObject,
		toISO: toISO,
		toUTC: toUTC,
		toTimestamp: toTimestamp,
		fromTimestamp: fromTimestamp,
		isTimestamp: isTimestamp,
		toUtcTimestamp: toUtcTimestamp,
		fromUtcTimestamp: fromUtcTimestamp,
		// math
		subtract: subtract,
		add: add,
		diff: diff,
		subtractDate: subtractDate,
		isLess: isLess,
		isGreater: isGreater,
		// special types
		isLeapYear: isLeapYear,
		getMonthIndex: getMonthIndex,
		getMonthName: getMonthName,
		getFirstSunday: getFirstSunday,
		getDaysInMonth: getDaysInMonth,
		getDaysInPrevMonth: getDaysInPrevMonth,
		// helpers
		natural: natural,
		getNaturalDay: getNaturalDay,
		// utils
		is: is,
		zeroTime: zeroTime,
		copy: copy,
		clone: copy,
		length: length,
		pad: pad,
		// lists
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
		}
	};
}));
},{}],8:[function(require,module,exports){
/* UMD.define */
(function (root, factory) {
	if (typeof customLoader === 'function') {
		customLoader(factory, 'dom');
	} else if (typeof define === 'function' && define.amd) {
		define([], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory();
	} else {
		root.returnExports = factory();
		window.dom = factory();
	}
}(this, function () {
	'use strict';
	var
		uids = {},
		destroyer = document.createElement('div');

	function isDimension (prop) {
		return !/opacity|index|flex|weight|^sdcsdcorder|tab|miter|group|zoom/i.test(prop)
	}

	function isNumber (value) {
		if (/\s/.test(value)) {
			return false;
		}
		return !isNaN(parseFloat(value));
	}

	function uid (type) {
		type = type || 'uid';
		if (uids[type] === undefined) {
			uids[type] = 0;
		}
		var id = type + '-' + (uids[type] + 1);
		uids[type]++;
		return id;
	}

	function isNode (item) {
		// safer test for custom elements in FF (with wc shim)
		// fragment is a special case
		return !!item && typeof item === 'object' && (typeof item.innerHTML === 'string' || item.nodeName === '#document-fragment');
	}

	function byId (item) {
		if (typeof item === 'string') {
			return document.getElementById(item);
		}
		return item;
	}

	function style (node, prop, value) {
		var key, computed, result;
		if (typeof prop === 'object') {
			// object setter
			Object.keys(prop).forEach(function (key) {
				style(node, key, prop[key]);
			});
			return null;
		} else if (value !== undefined) {
			// property setter
			if (typeof value === 'number' && isDimension(prop)) {
				value += 'px';
			}
			node.style[prop] = value;
		}

		// getter, if a simple style
		if (node.style[prop]) {
			result = node.style[prop];
			if (/px/.test(result)) {
				return parseFloat(result);
			}
			if (/%/.test(result)) {
				return parseFloat(result) * 0.01;
			}
			if (isNumber(result)) {
				return parseFloat(result);
			}
			return result;
		}

		// getter, computed
		computed = window.getComputedStyle(node);
		if (computed[prop]) {
			result = computed[prop];
			if (isNumber(result)) {
				return parseFloat(result);
			}
			return computed[prop];
		}
		return '';
	}

	function attr (node, prop, value) {
		var key;

		if (typeof prop === 'object') {

			var bools = {};
			var strings = {};
			var objects = {};
			var events = {};
			Object.keys(prop).forEach(function (key) {
				if (typeof prop[key] === 'boolean') {
					bools[key] = prop[key];
				} else if (typeof prop[key] === 'object') {
					objects[key] = prop[key];
				} else if (typeof prop[key] === 'function') {
					if (/on[A-Z]/.test(key)) {
						events[key] = prop[key];
					} else {
						console.warn('dom warning: function used with `onEvent` syntax');
					}
				} else {
					strings[key] = prop[key];
				}
			});

			// assigning properties in specific order of type, namely objects last
			Object.keys(bools).forEach(function (key) { attr(node, key, prop[key]); });
			Object.keys(strings).forEach(function (key) { attr(node, key, prop[key]); });
			Object.keys(events).forEach(function (key) { attr(node, key, prop[key]); });
			Object.keys(objects).forEach(function (key) { attr(node, key, prop[key]); });

			return null;
		}
		else if (value !== undefined) {
			if (prop === 'text' || prop === 'html' || prop === 'innerHTML') {
				// ignore, handled during creation
				return;
			}
			else if (prop === 'className' || prop === 'class') {
				dom.classList.add(node, value);
			}
			else if (prop === 'style') {
				style(node, value);
			}
			else if (prop === 'attr') {
				// back compat
				attr(node, value);
			}
			else if (typeof value === 'function') {
				attachEvent(node, prop, value);
			}
			else if (typeof value === 'object') {
				// object, like 'data'
				node[prop] = value;
			}
			else {
				if (value === false) {
					node.removeAttribute(prop);
				} else {
					node.setAttribute(prop, value);
				}
			}
		}

		return node.getAttribute(prop);
	}

	function attachEvent (node, prop, value) {
		var event = prop.replace('on', '').toLowerCase();
		node.addEventListener(event, value);

		var callback = function(mutationsList) {
			mutationsList.forEach(function (mutation) {
				for (var i = 0; i < mutation.removedNodes.length; i++) {
					var n = mutation.removedNodes[i];
					if (n === node) {
						node.removeEventListener(event, value);
						observer.disconnect();
						break;
					}
				}
			});
		};
		var observer = new MutationObserver(callback);
		observer.observe(node.parentNode || document.body, { childList: true });
	}

	function box (node) {
		if (node === window) {
			node = document.documentElement;
		}
		// node dimensions
		// returned object is immutable
		// add scroll positioning and convenience abbreviations
		var
			dimensions = byId(node).getBoundingClientRect();
		return {
			top: dimensions.top,
			right: dimensions.right,
			bottom: dimensions.bottom,
			left: dimensions.left,
			height: dimensions.height,
			h: dimensions.height,
			width: dimensions.width,
			w: dimensions.width,
			scrollY: window.scrollY,
			scrollX: window.scrollX,
			x: dimensions.left + window.pageXOffset,
			y: dimensions.top + window.pageYOffset
		};
	}

	function relBox (node, parentNode) {
		const parent = parentNode || node.parentNode;
		const pBox = box(parent);
		const bx = box(node);

		return {
			w: bx.w,
			h: bx.h,
			x: bx.left - pBox.left,
			y: bx.top - pBox.top
		};
	}

	function size (node, type) {
		if (node === window) {
			node = document.documentElement;
		}
		if (type === 'scroll') {
			return {
				w: node.scrollWidth,
				h: node.scrollHeight
			};
		}
		if (type === 'client') {
			return {
				w: node.clientWidth,
				h: node.clientHeight
			};
		}
		return {
			w: node.offsetWidth,
			h: node.offsetHeight
		};
	}

	function query (node, selector) {
		if (!selector) {
			selector = node;
			node = document;
		}
		return node.querySelector(selector);
	}

	function queryAll (node, selector) {
		if (!selector) {
			selector = node;
			node = document;
		}
		var nodes = node.querySelectorAll(selector);

		if (!nodes.length) {
			return [];
		}

		// convert to Array and return it
		return Array.prototype.slice.call(nodes);
	}

	function toDom (html, options, parent) {
		var node = dom('div', { html: html });
		parent = byId(parent || options);
		if (parent) {
			while (node.firstChild) {
				parent.appendChild(node.firstChild);
			}
			return node.firstChild;
		}
		if (html.indexOf('<') !== 0) {
			return node;
		}
		return node.firstChild;
	}

	function fromDom (node) {
		function getAttrs (node) {
			var att, i, attrs = {};
			for (i = 0; i < node.attributes.length; i++) {
				att = node.attributes[i];
				attrs[att.localName] = normalize(att.value === '' ? true : att.value);
			}
			return attrs;
		}

		function getText (node) {
			var i, t, text = '';
			for (i = 0; i < node.childNodes.length; i++) {
				t = node.childNodes[i];
				if (t.nodeType === 3 && t.textContent.trim()) {
					text += t.textContent.trim();
				}
			}
			return text;
		}

		var i, object = getAttrs(node);
		object.text = getText(node);
		object.children = [];
		if (node.children.length) {
			for (i = 0; i < node.children.length; i++) {
				object.children.push(fromDom(node.children[i]));
			}
		}
		return object;
	}

	function addChildren (node, children) {
		if (Array.isArray(children)) {
			for (var i = 0; i < children.length; i++) {
				if (children[i]) {
					if (typeof children[i] === 'string') {
						node.appendChild(toDom(children[i]));
					} else {
						node.appendChild(children[i]);
					}
				}
			}
		}
		else if (children) {
			node.appendChild(children);
		}
	}

	function addContent (node, options) {
		var html;
		if (options.html !== undefined || options.innerHTML !== undefined) {
			html = options.html || options.innerHTML || '';
			if (typeof html === 'object') {
				addChildren(node, html);
			} else {
				// careful assuming textContent -
				// misses some HTML, such as entities (&npsp;)
				node.innerHTML = html;
			}
		}
		if (options.text) {
			node.appendChild(document.createTextNode(options.text));
		}
		if (options.children) {
			addChildren(node, options.children);
		}
	}

	function dom (nodeType, options, parent, prepend) {
		options = options || {};

		// if first argument is a string and starts with <, pass to toDom()
		if (nodeType.indexOf('<') === 0) {
			return toDom(nodeType, options, parent);
		}

		var node = document.createElement(nodeType);

		parent = byId(parent);

		addContent(node, options);

		attr(node, options);

		if (parent && isNode(parent)) {
			if (prepend && parent.hasChildNodes()) {
				parent.insertBefore(node, parent.children[0]);
			} else {
				parent.appendChild(node);
			}
		}

		return node;
	}

	function insertAfter (refNode, node) {
		var sibling = refNode.nextElementSibling;
		if (!sibling) {
			refNode.parentNode.appendChild(node);
		} else {
			refNode.parentNode.insertBefore(node, sibling);
		}
		return sibling;
	}

	function destroy (node) {
		// destroys a node completely
		//
		if (node) {
			node.destroyed = true;
			destroyer.appendChild(node);
			destroyer.innerHTML = '';
		}
	}

	function clean (node, dispose) {
		//	Removes all child nodes
		//		dispose: destroy child nodes
		if (dispose) {
			while (node.children.length) {
				destroy(node.children[0]);
			}
			return;
		}
		while (node.children.length) {
			node.removeChild(node.children[0]);
		}
	}

	dom.frag = function (nodes) {
		var frag = document.createDocumentFragment();
		if (arguments.length > 1) {
			for (var i = 0; i < arguments.length; i++) {
				frag.appendChild(arguments[i]);
			}
		} else {
			if (Array.isArray(nodes)) {
				nodes.forEach(function (n) {
					frag.appendChild(n);
				});
			} else {
				frag.appendChild(nodes);
			}
		}
		return frag;
	};

	dom.classList = {
		// in addition to fixing IE11-toggle,
		// these methods also handle arrays
		remove: function (node, names) {
			toArray(names).forEach(function (name) {
				node.classList.remove(name);
			});
		},
		add: function (node, names) {
			toArray(names).forEach(function (name) {
				node.classList.add(name);
			});
		},
		contains: function (node, names) {
			return toArray(names).every(function (name) {
				return node.classList.contains(name);
			});
		},
		toggle: function (node, names, value) {
			names = toArray(names);
			if (typeof value === 'undefined') {
				// use standard functionality, supported by IE
				names.forEach(function (name) {
					node.classList.toggle(name, value);
				});
			}
			// IE11 does not support the second parameter
			else if (value) {
				names.forEach(function (name) {
					node.classList.add(name);
				});
			}
			else {
				names.forEach(function (name) {
					node.classList.remove(name);
				});
			}
		}
	};

	function toArray (names) {
		if (!names) {
			return [];
		}
		return names.split(' ').map(function (name) {
			return name.trim();
		}).filter(function (name) {
			return !!name;
		});
	}

	function normalize (val) {
		if (typeof val === 'string') {
			val = val.trim();
			if (val === 'false') {
				return false;
			} else if (val === 'null') {
				return null;
			} else if (val === 'true') {
				return true;
			}
			// finds strings that start with numbers, but are not numbers:
			// '2team' '123 Street', '1-2-3', etc
			if (('' + val).replace(/-?\d*\.?\d*/, '').length) {
				return val;
			}
		}
		if (!isNaN(parseFloat(val))) {
			return parseFloat(val);
		}
		return val;
	}

	dom.normalize = normalize;
	dom.clean = clean;
	dom.query = query;
	dom.queryAll = queryAll;
	dom.byId = byId;
	dom.attr = attr;
	dom.box = box;
	dom.style = style;
	dom.destroy = destroy;
	dom.uid = uid;
	dom.isNode = isNode;
	dom.toDom = toDom;
	dom.fromDom = fromDom;
	dom.insertAfter = insertAfter;
	dom.size = size;
	dom.relBox = relBox;

	return dom;
}));

},{}],9:[function(require,module,exports){
(function (root, factory) {
	if (typeof customLoader === 'function') {
		customLoader(factory, 'on');
	} else if (typeof define === 'function' && define.amd) {
		define([], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory();
	} else {
		root.returnExports = window.on = factory();
	}
}(this, function () {
	'use strict';

	// main function

	function on (node, eventName, filter, handler) {
		// normalize parameters
		if (typeof node === 'string') {
			node = getNodeById(node);
		}

		// prepare a callback
		var callback = makeCallback(node, filter, handler);

		// functional event
		if (typeof eventName === 'function') {
			return eventName(node, callback);
		}

		// special case: keydown/keyup with a list of expected keys
		// TODO: consider replacing with an explicit event function:
		// var h = on(node, onKeyEvent('keyup', /Enter,Esc/), callback);
		var keyEvent = /^(keyup|keydown):(.+)$/.exec(eventName);
		if (keyEvent) {
			return onKeyEvent(keyEvent[1], new RegExp(keyEvent[2].split(',').join('|')))(node, callback);
		}

		// handle multiple event types, like: on(node, 'mouseup, mousedown', callback);
		if (/,/.test(eventName)) {
			return on.makeMultiHandle(eventName.split(',').map(function (name) {
				return name.trim();
			}).filter(function (name) {
				return name;
			}).map(function (name) {
				return on(node, name, callback);
			}));
		}

		// handle registered functional events
		if (Object.prototype.hasOwnProperty.call(on.events, eventName)) {
			return on.events[eventName](node, callback);
		}

		// special case: loading an image
		if (eventName === 'load' && node.tagName.toLowerCase() === 'img') {
			return onImageLoad(node, callback);
		}

		// special case: mousewheel
		if (eventName === 'wheel') {
			// pass through, but first curry callback to wheel events
			callback = normalizeWheelEvent(callback);
			if (!hasWheel) {
				// old Firefox, old IE, Chrome
				return on.makeMultiHandle([
					on(node, 'DOMMouseScroll', callback),
					on(node, 'mousewheel', callback)
				]);
			}
		}

		// special case: keyboard
		if (/^key/.test(eventName)) {
			callback = normalizeKeyEvent(callback);
		}

		// default case
		return on.onDomEvent(node, eventName, callback);
	}

	// registered functional events
	on.events = {
		// handle click and Enter
		button: function (node, callback) {
			return on.makeMultiHandle([
				on(node, 'click', callback),
				on(node, 'keyup:Enter', callback)
			]);
		},

		// custom - used for popups 'n stuff
		clickoff: function (node, callback) {
			// important note!
			// starts paused
			//
			var bHandle = on(node.ownerDocument.documentElement, 'click', function (e) {
				var target = e.target;
				if (target.nodeType !== 1) {
					target = target.parentNode;
				}
				if (target && !node.contains(target)) {
					callback(e);
				}
			});

			var handle = {
				state: 'resumed',
				resume: function () {
					setTimeout(function () {
						bHandle.resume();
					}, 100);
					this.state = 'resumed';
				},
				pause: function () {
					bHandle.pause();
					this.state = 'paused';
				},
				remove: function () {
					bHandle.remove();
					this.state = 'removed';
				}
			};
			handle.pause();

			return handle;
		}
	};

	// internal event handlers

	function onDomEvent (node, eventName, callback) {
		node.addEventListener(eventName, callback, false);
		return {
			remove: function () {
				node.removeEventListener(eventName, callback, false);
				node = callback = null;
				this.remove = this.pause = this.resume = function () {};
			},
			pause: function () {
				node.removeEventListener(eventName, callback, false);
			},
			resume: function () {
				node.addEventListener(eventName, callback, false);
			}
		};
	}

	function onImageLoad (node, callback) {
		var handle = on.makeMultiHandle([
			on.onDomEvent(node, 'load', onImageLoad),
			on(node, 'error', callback)
		]);

		return handle;

		function onImageLoad (e) {
			var interval = setInterval(function () {
				if (node.naturalWidth || node.naturalHeight) {
					clearInterval(interval);
					e.width  = e.naturalWidth  = node.naturalWidth;
					e.height = e.naturalHeight = node.naturalHeight;
					callback(e);
				}
			}, 100);
			handle.remove();
		}
	}

	function onKeyEvent (keyEventName, re) {
		return function onKeyHandler (node, callback) {
			return on(node, keyEventName, function onKey (e) {
				if (re.test(e.key)) {
					callback(e);
				}
			});
		};
	}

	// internal utilities

	var hasWheel = (function hasWheelTest () {
		var
			isIE = navigator.userAgent.indexOf('Trident') > -1,
			div = document.createElement('div');
		return "onwheel" in div || "wheel" in div ||
			(isIE && document.implementation.hasFeature("Events.wheel", "3.0")); // IE feature detection
	})();

	var matches;
	['matches', 'matchesSelector', 'webkit', 'moz', 'ms', 'o'].some(function (name) {
		if (name.length < 7) { // prefix
			name += 'MatchesSelector';
		}
		if (Element.prototype[name]) {
			matches = name;
			return true;
		}
		return false;
	});

	function closest (element, selector, parent) {
		while (element) {
			if (element[on.matches] && element[on.matches](selector)) {
				return element;
			}
			if (element === parent) {
				break;
			}
			element = element.parentElement;
		}
		return null;
	}

	var INVALID_PROPS = {
		isTrusted: 1
	};
	function mix (object, value) {
		if (!value) {
			return object;
		}
		if (typeof value === 'object') {
			for(var key in value){
				if (!INVALID_PROPS[key]) {
					object[key] = value[key];
				}
			}
		} else {
			object.value = value;
		}
		return object;
	}

	var ieKeys = {
		//a: 'TEST',
		Up: 'ArrowUp',
		Down: 'ArrowDown',
		Left: 'ArrowLeft',
		Right: 'ArrowRight',
		Esc: 'Escape',
		Spacebar: ' ',
		Win: 'Command'
	};

	function normalizeKeyEvent (callback) {
		// IE uses old spec
		return function normalizeKeys (e) {
			if (ieKeys[e.key]) {
				var fakeEvent = mix({}, e);
				fakeEvent.key = ieKeys[e.key];
				callback(fakeEvent);
			} else {
				callback(e);
			}
		}
	}

	var
		FACTOR = navigator.userAgent.indexOf('Windows') > -1 ? 10 : 0.1,
		XLR8 = 0,
		mouseWheelHandle;

	function normalizeWheelEvent (callback) {
		// normalizes all browsers' events to a standard:
		// delta, wheelY, wheelX
		// also adds acceleration and deceleration to make
		// Mac and Windows behave similarly
		return function normalizeWheel (e) {
			XLR8 += FACTOR;
			var
				deltaY = Math.max(-1, Math.min(1, (e.wheelDeltaY || e.deltaY))),
				deltaX = Math.max(-10, Math.min(10, (e.wheelDeltaX || e.deltaX)));

			deltaY = deltaY <= 0 ? deltaY - XLR8 : deltaY + XLR8;

			e.delta  = deltaY;
			e.wheelY = deltaY;
			e.wheelX = deltaX;

			clearTimeout(mouseWheelHandle);
			mouseWheelHandle = setTimeout(function () {
				XLR8 = 0;
			}, 300);
			callback(e);
		};
	}

	function closestFilter (element, selector) {
		return function (e) {
			return on.closest(e.target, selector, element);
		};
	}

	function makeMultiHandle (handles) {
		return {
			state: 'resumed',
			remove: function () {
				handles.forEach(function (h) {
					// allow for a simple function in the list
					if (h.remove) {
						h.remove();
					} else if (typeof h === 'function') {
						h();
					}
				});
				handles = [];
				this.remove = this.pause = this.resume = function () {};
				this.state = 'removed';
			},
			pause: function () {
				handles.forEach(function (h) {
					if (h.pause) {
						h.pause();
					}
				});
				this.state = 'paused';
			},
			resume: function () {
				handles.forEach(function (h) {
					if (h.resume) {
						h.resume();
					}
				});
				this.state = 'resumed';
			}
		};
	}

	function getNodeById (id) {
		var node = document.getElementById(id);
		if (!node) {
			console.error('`on` Could not find:', id);
		}
		return node;
	}

	function makeCallback (node, filter, handler) {
		if (filter && handler) {
			if (typeof filter === 'string') {
				filter = closestFilter(node, filter);
			}
			return function (e) {
				var result = filter(e);
				if (result) {
					e.filteredTarget = result;
					handler(e, result);
				}
			};
		}
		return filter || handler;
	}

	function getDoc (node) {
		return node === document || node === window ? document : node.ownerDocument;
	}

	// public functions

	on.once = function (node, eventName, filter, callback) {
		var h;
		if (filter && callback) {
			h = on(node, eventName, filter, function once () {
				callback.apply(window, arguments);
				h.remove();
			});
		} else {
			h = on(node, eventName, function once () {
				filter.apply(window, arguments);
				h.remove();
			});
		}
		return h;
	};

	on.emit = function (node, eventName, value) {
		node = typeof node === 'string' ? getNodeById(node) : node;
		var event = getDoc(node).createEvent('HTMLEvents');
		event.initEvent(eventName, true, true); // event type, bubbling, cancelable
		return node.dispatchEvent(mix(event, value));
	};

	on.fire = function (node, eventName, eventDetail, bubbles) {
		node = typeof node === 'string' ? getNodeById(node) : node;
		var event = getDoc(node).createEvent('CustomEvent');
		event.initCustomEvent(eventName, !!bubbles, true, eventDetail); // event type, bubbling, cancelable, value
		return node.dispatchEvent(event);
	};

	// TODO: DEPRECATED
	on.isAlphaNumeric = function (str) {
		return /^[0-9a-z]$/i.test(str);
	};

	on.makeMultiHandle = makeMultiHandle;
	on.onDomEvent = onDomEvent; // use directly to prevent possible definition loops
	on.closest = closest;
	on.matches = matches;

	return on;
}));

},{}],10:[function(require,module,exports){
require('./date-picker');
const BaseComponent = require('@clubajax/base-component');
const dom = require('@clubajax/dom');
const dates = require('@clubajax/dates');
const util = require('./util');
const onKey = require('./onKey');
const focusManager = require('./focusManager');
require('./icon-calendar');

const defaultPlaceholder = 'MM/DD/YYYY';
const defaultMask = 'XX/XX/XXXX';
const props = ['label', 'name', 'placeholder', 'mask', 'min', 'max', 'time'];
const bools = ['required', 'time', 'static'];

const FLASH_TIME = 1000;

class DateInput extends BaseComponent {

	static get observedAttributes () {
		return [...props, ...bools, 'value'];
	}

	get props () {
		return props;
	}

	get bools () {
		return bools;
	}

	attributeChanged (name, value) {
		// need to manage value manually
		if (name === 'value') {
			this.value = value;
		}
	}

	set value (value) {
		if (value === this.strDate) {
			return;
		}
		const isInit = !this.strDate;
		this.strDate = dates.isValid(value) ? value : '';
		onDomReady(this, () => {
			this.setValue(this.strDate, isInit);
		});
	}

	get value () {
		return this.strDate;
	}

	get valid () {
		return this.isValid();
	}

	onLabel (value) {
		this.labelNode.innerHTML = value;
	}

	onMin (value) {
		const d = dates.toDate(value);
		this.minDate = d;
		this.minInt = d.getTime();
		this.picker.min = value;
	}

	onMax (value) {
		const d = dates.toDate(value);
		this.maxDate = d;
		this.maxInt = d.getTime();
		this.picker.max = value;
	}


	get templateString () {
		return `
<label>
	<span ref="labelNode"></span>
	<div class="input-wrapper">
		<input ref="input" class="empty" />
		<icon-calendar />
	</div>
</label>`;
	}

	constructor () {
		super();
		this.showing = false;
	}

	setValue (value, silent) {
		if (value === this.typedValue) {
			return;
		}
		value = this.format(value);
		this.typedValue = value;
		this.input.value = value;
		const len = this.input.value.length === this.mask.length;
		const valid = this.validate();
		if (valid) {
			this.strDate = value;
			this.picker.value = value;
			if (!silent) {
				this.emit('change', { value: value });
			}
		}

		if (!silent && valid && !this.static) {
			setTimeout(this.hide.bind(this), 300);
		}
		return value;
	}

	format (value) {
		return  util.formatDate(value, this.mask);
	}

	isValid (value = this.input.value) {
		if(!value && !this.required){
			return true;
		}
		return dates.isValid(this.input.value);
	}

	validate () {
		if (this.isValid(this.input.value)) {
			this.classList.remove('invalid');
			return true;
		}
		this.classList.add('invalid');
		return false;
	}

	flash (addFocus) {
		this.classList.add('warning');
		setTimeout(() => {
			this.classList.remove('warning');
		}, FLASH_TIME);

		if(addFocus){
			this.focus();
		}
	}

	show () {
		if (this.showing) {
			return;
		}
		this.showing = true;
		this.picker.onShow();
		this.picker.classList.add('show');

		window.requestAnimationFrame(() => {
			const win = dom.box(window);
			const box = dom.box(this.picker);
			if (box.x + box.w > win.h) {
				this.picker.classList.add('right-align');
			}
			if (box.top + box.h > win.h) {
				this.picker.classList.add('bottom-align');
			}
		});
	}

	hide () {
		if (!this.showing || window.keepPopupsOpen) {
			return;
		}
		this.showing = false;
		dom.classList.remove(this.picker, 'right-align bottom-align show');
		dom.classList.toggle(this, 'invalid', !this.isValid());
		console.log('ONHIDE');
		this.picker.onHide();
	}

	focus () {
		onDomReady(this, () => {
			this.input.focus();
		});
	}

	blur () {
		if (this.input) {
			this.input.blur();
		}
	}

	domReady () {
		this.time = this.time || this.hasTime;
		this.mask = this.mask || defaultMask;
		this.maskLength = this.mask.match(/X/g).join('').length;
		this.input.setAttribute('type', 'text');
		this.input.setAttribute('placeholder', this.placeholder || defaultPlaceholder);
		if (this.name) {
			this.input.setAttribute('name', this.name);
		}
		if (this.label) {
			this.labelNode.innerHTML = this.label;
		}
		this.connectKeys();

		this.picker = dom('date-picker', { time: this.time, tabindex: '0' }, this);
		this.picker.onDomReady(() => {
			this.picker.on('change', (e) => {
				this.setValue(e.value, e.silent);
			});
			if (this.static) {
				this.show();
			} else {
				this.focusHandle = focusManager(this, this.show.bind(this), this.hide.bind(this));
			}
		});
	}

	connectKeys () {
		this.on(this.input, 'keydown', util.stopEvent);
		this.on(this.input, 'keypress', util.stopEvent);
		this.on(this.input, 'keyup', (e) => {
			onKey.call(this, e);
		});
	}

	destroy () {
		if (this.focusHandle) {
			this.focusHandle.remove();
		}
	}
}

customElements.define('date-input', DateInput);

module.exports = DateInput;
},{"./date-picker":11,"./focusManager":16,"./icon-calendar":17,"./onKey":18,"./util":20,"@clubajax/base-component":2,"@clubajax/dates":7,"@clubajax/dom":8}],11:[function(require,module,exports){
const BaseComponent = require('@clubajax/base-component');
const dates = require('@clubajax/dates');
const dom = require('@clubajax/dom');
const util = require('./util');
require('./time-input');

// TODO:
// https://axesslab.com/accessible-datepickers/
// http://whatsock.com/tsg/Coding%20Arena/ARIA%20Date%20Pickers/ARIA%20Date%20Picker%20(Basic)/demo.htm

const props = ['min', 'max'];

// range-left/range-right mean that this is one side of a date-range-picker
const bools = ['range-picker', 'range-left', 'range-right', 'time'];

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
	<span class="cal-yr-lft" ref="lftYrNode" tabindex="0" role="button" aria-label="Previous Year"></span>
	<span class="cal-lft" ref="lftMoNode" tabindex="0" role="button" aria-label="Previous Month"></span>
	<span class="cal-month" ref="monthNode" role="presentation"></span>	
	<span class="cal-rgt" ref="rgtMoNode" tabindex="0"  role="button" aria-label="Next Month"></span>
	<span class="cal-yr-rgt" ref="rgtYrNode" tabindex="0" role="button" aria-label="Next Year"></span>
</div>
<div class="cal-container" ref="container"></div>
<div class="cal-footer" ref="calFooter">
	<span ref="footerLink" tabindex="0" role="button" aria-label="Set Date to Today"></span>
</div>
</div>
<input class="focus-loop" aria-hidden="true"/>
`;
	}

	set value (value) {
		this.setValue(dates.isDate(value) ? dates.toDate(value) : today);
	}

	get value () {
		if (!this.valueDate) {
			const value = this.getAttribute('value') || today;
			this.valueDate = dates.toDate(value);
		}
		return this.valueDate;
	}

	onMin (value) {
		this.minDate = util.getMinDate(value);
		if (this.timeInput) {
			this.timeInput.min = value;
		}
		this.render();
	}

	onMax (value) {
		this.maxDate = util.getMaxDate(value);
		if (this.timeInput) {
			this.timeInput.max = value;
		}
		this.render();
	}

	constructor () {
		super();
		this.current = new Date();
		this.previous = {};
	}

	setDisplay (...args) {
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

	getFormattedValue () {
		let str = this.valueDate === today ? '' : !!this.valueDate ? dates.format(this.valueDate) : '';
		if (this.time) {
			str += ` ${this.timeInput.value}`;
		}
		return str;
	}

	emitEvent (silent) {
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

	onHide () {
		// not an attribute; called by owner
	}

	onShow () {
		this.current = dates.copy(this.valueDate);
		this.render();
	}

	setValue (valueObject) {
		this.valueDate = valueObject;
		this.current = dates.copy(this.valueDate);
		onDomReady(this, () => {
			this.render();
		});
	}

	onClickDay (node, silent) {
		const
			day = +node.textContent,
			isFuture = node.classList.contains('future'),
			isPast = node.classList.contains('past'),
			isDisabled = node.classList.contains('disabled');

		if (isDisabled) {
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

	selectDay () {
		if (this['range-picker']) {
			return;
		}
		console.log('SELECT DAY');
		const now = this.querySelector('.selected');
		const node = this.dayMap[this.current.getDate()];
		if (now) {
			now.classList.remove('selected');
		}
		node.classList.add('selected');

	}

	focusDay () {
		const node = this.container.querySelector('div.highlighted[tabindex="0"]') ||
			this.container.querySelector('div.selected[tabindex="0"]');
		if (node) {
			node.focus();
		}
	}

	highlightDay (date) {
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

	isValidDate (date) {
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

	onClickMonth (direction) {
		this.current.setMonth(this.current.getMonth() + direction);
		this.render();
	}

	onClickYear (direction) {
		this.current.setFullYear(this.current.getFullYear() + direction);
		this.render();
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

	hoverSelectRange (e) {
		if (this.firstRange && !this.secondRange && e.target.classList.contains('on')) {
			this.hoverDate = e.target._date;
			this.displayRange();
		}
	}

	displayRangeToEnd () {
		if (this.firstRange) {
			this.hoverDate = dates.copy(this.current);
			this.hoverDate.setMonth(this.hoverDate.getMonth() + 1);
			this.displayRange();
		}
	}

	displayRange () {
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
				this.dayMap[this.firstRange.getDate()].classList.add('range-first');
			}
			if (this.secondRange && this.secondRange.getMonth() === this.current.getMonth()) {
				this.dayMap[this.secondRange.getDate()].classList.add('range-second');
			}
		}
	}

	clearEndPoints () {
		const first = this.querySelector('.range-first'),
			second = this.querySelector('.range-second');
		if (first) {
			first.classList.remove('range-first');
		}
		if (second) {
			second.classList.remove('range-second');
		}
	}

	domReady () {
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
	}

	render () {
		// dateNum increments, starting with the first Sunday
		// showing on the monthly calendar. This is usually the
		// previous month, so dateNum will start as a negative number
		destroy(this.bodyNode);

		this.dayMap = {};

		let
			node = dom('div', { class: 'cal-body' }),
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
			dateObj = dates.add(new Date(d.getFullYear(), d.getMonth(), 1), dateNum),
			defaultDate = 15;

		this.monthNode.innerHTML = dates.getMonthName(d) + ' ' + d.getFullYear();

		for (i = 0; i < 7; i++) {
			dom("div", { html: dates.days.abbr[i], class: 'day-of-week' }, node);
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

			const ariaLabel = util.toAriaLabel(dateObj);
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
	}

	setFooter () {
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
			this.timeInput.on('time-change', this.emitEvent.bind(this));
			destroy(this.footerLink);
		} else {
			const d = new Date();
			this.footerLink.innerHTML = dates.format(d, 'E MMMM dd, yyyy');
		}
	}

	connect () {
		this.on(this.container, 'click', (e) => {
			this.fire('pre-click', e, true, true);
			const node = e.target.closest('.day');
			if (node) {
				this.onClickDay(node);
			}
		});

		this.on(this.container, 'keydown', (e) => {
			let date;
			let stopEvent = false;
			let num;
			console.log('container.key', e.key);
			switch (e.key) {
				case 'ArrowLeft' :
					num = -1;
					break;
				case 'ArrowRight' :
					num = 1;
					break;
				case 'ArrowUp' :
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
			console.log('doc.key', e.key);
			if (e.key === ' ' && isControl(e.target, this)) {
				on.emit(e.target, 'click');
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
		});

		if (this['range-picker']) {
			this.on(this.container, 'mouseover', this.hoverSelectRange.bind(this));
		}
	}
}

const today = new Date();

function isControl (node, picker) {
	console.log('isControl');
	return node === picker.lftMoNode || node === picker.rgtMoNode || node === picker.lftYrNode || node === picker.rgtYrNode || node === picker.footerLink;
}

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

function inRange (dateTime, begTime, endTime) {
	return dateTime >= begTime && dateTime <= endTime;
}

customElements.define('date-picker', DatePicker);

module.exports = DatePicker;
},{"./time-input":19,"./util":20,"@clubajax/base-component":2,"@clubajax/dates":7,"@clubajax/dom":8}],12:[function(require,module,exports){
require('./date-range-picker');
const DateInput = require('./date-input');
const dates = require('@clubajax/dates');

const props = ['label', 'name', 'placeholder'];
const bools = ['range-expands'];

class DateRangeInput extends DateInput {

	static get observedAttributes () {
		return [...props, ...bools, 'value'];
	}

	get props () {
		return props;
	}

	get bools () {
		return bools;
	}

	get templateString () {
		return `
<label>
	<span ref="labelNode"></span>
	<input ref="input" />
	
</label>
<date-range-picker ref="picker" tabindex="0"></date-range-picker>`;
	}

	constructor () {
		super();
		this.mask = 'XX/XX/XXXX - XX/XX/XXXX'
	}

	isValid (value) {
		const ds = value.split(/\s*-\s*/);
		return dates.isDate(ds[0]) && dates.isDate(ds[1]);
	}
}

customElements.define('date-range-input', DateRangeInput);

module.exports = DateRangeInput;
},{"./date-input":10,"./date-range-picker":14,"@clubajax/dates":7}],13:[function(require,module,exports){
const BaseComponent = require('@clubajax/base-component');
require('./date-input');
const dates = require('@clubajax/dates');
const dom = require('@clubajax/dom');

const props = ['left-label', 'right-label', 'name', 'placeholder'];
const bools = ['range-expands', 'required'];

const DELIMITER = ' - ';

class DateRangeInputs extends BaseComponent {

	static get observedAttributes () {
		return [...props, ...bools, 'value'];
	}

	get props () {
		return props;
	}

	get bools () {
		return bools;
	}

	set value (value) {
		this.setValue(value);
	}

	get value () {
		if (!this.leftInput.value || !this.rightInput.value) {
			return null;
		}
		return `${this.leftInput.value}${DELIMITER}${this.rightInput.value}`;
	}

	attributeChanged (prop, value) {
		if (prop === 'value') {
			this.value = value;
		}
	}

	get values () {
		return {
			start: this.leftInput.value,
			end: this.leftInput.value
		};
	}

	constructor () {
		super();
		this.fireOwnDomready = true;
		this.mask = 'XX/XX/XXXX';
	}

	isValid (value) {
		if (!value) {
			return true; // TODO: required
		}
		const ds = value.split(/\s*-\s*/);
		return dates.isDate(ds[0]) && dates.isDate(ds[1]);
	}

	setValue (value, silent) {
		if (!this.isValid(value)) {
			console.error('Invalid dates', value);
			return;
		}
		onDomReady(this, () => {
			const ds = value ? value.split(/\s*-\s*/) : ['', ''];
			this.isBeingSet = true;
			this.leftInput.setValue(ds[0], silent);
			this.rightInput.setValue(ds[1], silent);
			this.isBeingSet = false;
		});
	}

	clear (silent) {
		this.leftInput.setValue('', true);
		this.rightInput.setValue('', true);
		if (!silent) {
			this.emit('change', { value: null });
		}
	}

	emitEvent () {
		clearTimeout(this.debounce);
		this.debounce = setTimeout(() => {
			const value = this.value;
			if (this.isValid(value)) {
				this.emit('change', { value });
			}
		}, 100);
	}

	connected () {
		this.leftInput = dom('date-input', {
			label: this['left-label'],
			required: this.required,
			placeholder: this.placeholder
		}, this);
		this.rightInput = dom('date-input', {
			label: this['right-label'],
			required: this.required,
			placeholder: this.placeholder
		}, this);

		this.leftInput.on('change', (e) => {
			const changesDate = dates.toDate(this.rightInput.value) < dates.toDate(e.value);
			if (!this.rightInput.value || changesDate) {
				if (e.value) {
					this.rightInput.setValue(e.value, true, true);
				}
				if (changesDate) {
					this.rightInput.flash(true);
				} else if (!this.isBeingSet) {
					this.rightInput.focus();
				}
			} else {
				this.emitEvent();
			}
			e.stopPropagation();
			e.preventDefault();
			return false;
		});

		this.rightInput.on('change', (e) => {
			const changesDate = dates.toDate(this.leftInput.value) > dates.toDate(e.value);
			if (!this.leftInput.value || changesDate) {
				if (e.value) {
					this.leftInput.setValue(e.value, true, true);
				}
				if (changesDate) {
					this.leftInput.flash(true);
				} else if (!this.isBeingSet) {
					this.leftInput.focus();
				}
			} else {
				this.emitEvent();
			}
			e.stopPropagation();
			e.preventDefault();

			return false;
		});

		onDomReady([this.leftInput, this.rightInput], () => {
			this.fire('domready');
		});
		this.connected = function () {};
	}

	domReady () {

	}
}

customElements.define('date-range-inputs', DateRangeInputs);

module.exports = DateRangeInputs;
},{"./date-input":10,"@clubajax/base-component":2,"@clubajax/dates":7,"@clubajax/dom":8}],14:[function(require,module,exports){
require('./date-picker');
const BaseComponent = require('@clubajax/base-component');
const dates = require('@clubajax/dates');
const dom = require('@clubajax/dom');

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
		this.strDate = dates.isDate(value) ? value : '';
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
			this.valueDate = dates.toDate(value);
			this.firstRange = dates.toDate(dateStrings[0]);
			this.secondRange = dates.toDate(dateStrings[1]);
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
},{"./date-picker":11,"@clubajax/base-component":2,"@clubajax/dates":7,"@clubajax/dom":8}],15:[function(require,module,exports){
const DateInput = require('./date-input');
const util = require('./util');

// FIXME: time-input blur does not close calendar

class DateTimeInput extends DateInput {
	constructor () {
		super();
		this.hasTime = true;
	}

	domReady () {
		this.mask = 'XX/XX/XXXX XX:XX pm';
		super.domReady();
	}

	format (value) {
		const parts = value.split(' ');
		const dateStr = parts[0] || '';
		const timeStr = `${parts[1] || ''} ${parts[2] || ''}`;
		const date = util.formatDate(dateStr, this.mask);
		let time = util.formatTime(timeStr);
		time = this.setAMPM(time, util.getAMPM(value));
		return `${date} ${time}`;
	}

	setAMPM (value, ampm) {
		let isAM;
		if (ampm) {
			isAM = /a/i.test(ampm);
		} else if (/[ap]/.test(value)) {
			isAM = /a/i.test(value);
		} else {
			isAM = this.isAM;
		}
		value = value.replace(/\s*[ap]m/i, '') + (isAM ? ' am' : ' pm');
		this.isAM = isAM;
		this.isPM = !isAM;
		return value;
	}
}

customElements.define('date-time-input', DateTimeInput);

module.exports = DateTimeInput;
},{"./date-input":10,"./util":20}],16:[function(require,module,exports){
const on = require('@clubajax/on');

module.exports = function (component, show, hide) {
	const input = component.input;
	const picker = component.picker;
	const timeInput = picker.timeInput;
	const focusLoop = picker.querySelector('input.focus-loop');

	let current;
	let inPicker = false;

	function onNavigate (e, tabbingBackwards) {
		const first = picker.querySelector('[tabindex="0"]');

		if (e.target === picker) {
			if (tabbingBackwards) {
				input.focus();
				return stop(e);
			} else {
				first.focus();
				return stop(e);
			}
		}

		if (e.target === focusLoop) {
			console.log('focus-loop');
			first.focus();
			return stop(e);
		}
		current = getParent(e.target);

		inPicker = current === picker;
		if (!current) {
			hide();
		}

		return true;
	}

	const upHandle = on(document, 'keyup', (e) => {
		if (e.key === 'Escape') {
			hide();
			return;
		}
		if (e.key === 'Tab') {
			return onNavigate(e, e.shiftKey);
		}
	});

	on(input, 'focus', show);

	const docHandle = on(document.body, 'mousedown', (e) => {
		return onNavigate(e);
	});

	function getParent (node) {
		if (node === input) {
			return input;
		}
		if (node === picker) {
			return picker;
		}
		if (node === timeInput) {
			return timeInput;
		}
		if (node === document.body || !node.parentNode) {
			return null;
		}
		return getParent(node.parentNode);
	}

	function stop (e) {
		e.preventDefault();
		e.stopImmediatePropagation();
		return false;
	}

	//show();

	return on.makeMultiHandle([upHandle, docHandle]);
};

},{"@clubajax/on":9}],17:[function(require,module,exports){
const BaseComponent = require('@clubajax/base-component');

class Icon extends BaseComponent {
	get templateString () {
		return `
<?xml version="1.0" ?>
<svg viewBox="0 0 12 13" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs></defs>
    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g id="mvp-projectdb-web" transform="translate(-544.000000, -84.000000)" fill="#0A0B09">
            <g id="Header" transform="translate(0.000000, 70.000000)">
                <g id="Calender-&amp;-Date" transform="translate(544.000000, 14.000000)">
                    <g id="fa-calendar">
                        <path d="M0.284719899,11.8128991 C0.452589453,11.9813033 0.656812922,12.0652381 0.884559514,12.0652381 L10.3162623,12.0652381 C10.5445435,12.0652381 10.7482323,11.9813033 10.9166365,11.8128991 C11.0845061,11.6450296 11.1684408,11.4408061 11.1684408,11.2130595 L11.1684408,2.63300073 C11.1684408,2.40525413 11.0845061,2.20103066 10.9166365,2.03316111 C10.7482323,1.86529156 10.5445435,1.78135678 10.3162623,1.78135678 L9.45232214,1.78135678 L9.45232214,1.13340169 C9.45232214,0.845243441 9.34432963,0.593439111 9.14064078,0.37745408 C8.92465575,0.173230611 8.6723168,0.0652380952 8.38469317,0.0652380952 L7.95272311,0.0652380952 C7.66456486,0.0652380952 7.41276053,0.173230611 7.1967755,0.37745408 C6.99255203,0.593439111 6.88455951,0.845243441 6.88455951,1.13340169 L6.88455951,1.78135678 L4.31679688,1.78135678 L4.31679688,1.13340169 C4.31679688,0.845243441 4.20880437,0.593439111 4.0045809,0.37745408 C3.78859587,0.173230611 3.53679154,0.0652380952 3.24863329,0.0652380952 L2.81666323,0.0652380952 C2.52850498,0.0652380952 2.27670065,0.173230611 2.06071562,0.37745408 C1.85649215,0.593439111 1.74849964,0.845243441 1.74849964,1.13340169 L1.74849964,1.78135678 L0.896855692,1.78135678 C0.656812922,1.78135678 0.452589453,1.86529156 0.284719899,2.03316111 C0.116850346,2.20103066 0.0323809524,2.40525413 0.0323809524,2.63300073 L0.0323809524,11.2130595 C0.0323809524,11.4408061 0.116850346,11.6450296 0.284719899,11.8128991 L0.284719899,11.8128991 Z M0.884559514,9.28095582 L2.81666323,9.28095582 L2.81666323,11.2130595 L0.884559514,11.2130595 L0.884559514,9.28095582 Z M0.884559514,6.70089701 L2.81666323,6.70089701 L2.81666323,8.84898576 L0.884559514,8.84898576 L0.884559514,6.70089701 Z M0.884559514,4.34911941 L2.81666323,4.34911941 L2.81666323,6.26892695 L0.884559514,6.26892695 L0.884559514,4.34911941 Z M2.6006782,1.13340169 C2.6006782,1.07299003 2.62473594,1.02540917 2.66055524,0.977293695 C2.70867071,0.941474396 2.75678619,0.917416657 2.81666323,0.917416657 L3.24863329,0.917416657 C3.30851033,0.917416657 3.35662581,0.941474396 3.40474128,0.977293695 C3.44056058,1.02540917 3.46461832,1.07299003 3.46461832,1.13340169 L3.46461832,3.06497079 C3.46461832,3.12538244 3.44056058,3.1729633 3.40474128,3.22107878 C3.35662581,3.2574327 3.30851033,3.28095582 3.24863329,3.28095582 L2.81666323,3.28095582 C2.75678619,3.28095582 2.70867071,3.2574327 2.66055524,3.22107878 C2.62473594,3.1729633 2.6006782,3.12538244 2.6006782,3.06497079 L2.6006782,1.13340169 L2.6006782,1.13340169 Z M3.24863329,9.28095582 L5.38442586,9.28095582 L5.38442586,11.2130595 L3.24863329,11.2130595 L3.24863329,9.28095582 Z M3.24863329,6.70089701 L5.38442586,6.70089701 L5.38442586,8.84898576 L3.24863329,8.84898576 L3.24863329,6.70089701 Z M3.24863329,4.34911941 L5.38442586,4.34911941 L5.38442586,6.26892695 L3.24863329,6.26892695 L3.24863329,4.34911941 Z M5.81639592,9.28095582 L7.96448467,9.28095582 L7.96448467,11.2130595 L5.81639592,11.2130595 L5.81639592,9.28095582 Z M5.81639592,6.70089701 L7.96448467,6.70089701 L7.96448467,8.84898576 L5.81639592,8.84898576 L5.81639592,6.70089701 Z M5.81639592,4.34911941 L7.96448467,4.34911941 L7.96448467,6.26892695 L5.81639592,6.26892695 L5.81639592,4.34911941 Z M7.73673808,1.13340169 C7.73673808,1.07299003 7.7602612,1.02540917 7.79661511,0.977293695 C7.84473059,0.941474396 7.89231145,0.917416657 7.95272311,0.917416657 L8.38469317,0.917416657 C8.44457021,0.917416657 8.49268568,0.941474396 8.54026654,0.977293695 C8.57662046,1.02540917 8.6006782,1.07299003 8.6006782,1.13340169 L8.6006782,3.06497079 C8.6006782,3.12538244 8.57662046,3.1729633 8.54026654,3.22107878 C8.49268568,3.2574327 8.44457021,3.28095582 8.38469317,3.28095582 L7.95272311,3.28095582 C7.89231145,3.28095582 7.84473059,3.2574327 7.79661511,3.22107878 C7.7602612,3.1729633 7.73673808,3.12538244 7.73673808,3.06497079 L7.73673808,1.13340169 L7.73673808,1.13340169 Z M8.39645473,9.28095582 L10.3162623,9.28095582 L10.3162623,11.2130595 L8.39645473,11.2130595 L8.39645473,9.28095582 Z M8.39645473,6.70089701 L10.3162623,6.70089701 L10.3162623,8.84898576 L8.39645473,8.84898576 L8.39645473,6.70089701 Z M8.39645473,4.34911941 L10.3162623,4.34911941 L10.3162623,6.26892695 L8.39645473,6.26892695 L8.39645473,4.34911941 Z"></path>
                    </g>
                </g>
            </g>
        </g>
    </g>
</svg>

`;
	}
}


customElements.define('icon-calendar', Icon);

module.exports = Icon;

},{"@clubajax/base-component":2}],18:[function(require,module,exports){
const util = require('./util');

function onKey (e) {
	let str = this.typedValue || '';
	const beg = e.target.selectionStart;
	const end = e.target.selectionEnd;
	const k = e.key;

	if (k === 'Enter') {
		this.hide();
		this.emit('change', { value: this.value });
	}

	if (k === 'Escape') {
		if (!this.isValid()) {
			this.value = this.strDate;
			this.hide();
			this.input.blur();
		}
	}

	if (util.isControl(e)) {
		util.stopEvent(e);
		return;
	}

	function setSelection (pos) {
		e.target.selectionEnd = pos;
	}

	if (!util.isNum(k)) {
		// handle paste, backspace
		if (this.input.value !== this.typedValue) {
			this.setValue(this.input.value, true);
		}

		const value = this.input.value;
		const type = util.is(value).type();

		if (util.isArrowKey[k]) {

			// FIXME: test is not adding picker time
			// 12/12/2017 06:30 am'

			const inc = k === 'ArrowUp' ? 1 : -1;
			if (/time/.test(type)) {
				const HR = type === 'time' ? [0,2] : [11,13];
				const MN = type === 'time' ? [3,5] : [14,16];
				if (end >= HR[0] && end <= HR[1]) {
					this.setValue(util.incHours(value, inc), true);
				} else if (end >= MN[0] && end <= MN[1]) {
					this.setValue(util.incMinutes(value, inc, 15), true);
				} else {
					this.setValue(value.replace(/([ap]m)/i, str => /a/i.test(str) ? 'pm' : 'am' ), true);
					// this.setValue(value, true, /a/i.test(value) ? 'pm' : 'am');
				}
			}

			if (/date/.test(type)) {
				if (end <= 2 ) {
					this.setValue(util.incMonth(value, inc), true);
				} else if (end < 5) {
					this.setValue(util.incDate(value, inc), true);
				} else if (end < 11) {
					this.setValue(util.incYear(value, inc), true);
				}
			}

		} else if (/[ap]/i.test(k) && /time/.test(type)) {
			this.setValue(this.setAMPM(value, k === 'a' ? 'am' : 'pm'), true);
		}

		setSelection(beg);
		util.stopEvent(e);
		return;
	}
	if (str.length !== end && beg === end) {
		// handle selection or middle-string edit
		let temp = this.typedValue.substring(0, beg) + k + this.typedValue.substring(end);
		const nextCharPos = util.nextNumPos(beg + 1, temp);
		if (nextCharPos > -1) {
			temp = util.removeCharAtPos(temp, beg + 1);
		}

		const value = this.setValue(temp, true);
		const nextChar = value.charAt(beg + 1);

		setSelection(/[\s\/:]/.test(nextChar) ? beg + 2 : beg + 1);
		util.stopEvent(e);
		return;

	} else if (end !== beg) {
		// selection replace
		let temp = util.replaceText(this.typedValue, k, beg, end, 'X');
		const value = this.setValue(temp, true);

		setSelection(beg + 1);
		util.stopEvent(e);
		return;
	}


	this.setValue(str + k, true);
}

module.exports = onKey;
},{"./util":20}],19:[function(require,module,exports){
const BaseComponent = require('@clubajax/base-component');
const dom = require('@clubajax/dom');
const on = require('@clubajax/on');
const dates = require('@clubajax/dates');
const util = require('./util');
const onKey = require('./onKey');

const defaultPlaceholder = 'HH:MM am/pm';
const defaultMask = 'XX:XX';
const props = ['label', 'name', 'placeholder', 'mask', 'event-name', 'min', 'max'];
const bools = ['required'];
const EVENT_NAME = 'change';

class TimeInput extends BaseComponent {
	static get observedAttributes () {
		return [...props, ...bools, 'value'];
	}

	get props () {
		return props;
	}

	get bools () {
		return bools;
	}

	attributeChanged (name, value) {
		// need to manage value manually
		if (name === 'value') {
			this.value = value;
		}
	}

	set value (value) {
		if (dates.isValidObject(value)) {
			// this.orgDate = value;
			// this.setDate(value);
			value = dates.format(value, 'h:m a');
			this.setAMPM(value);
		}
		this.strDate = util.stripDate(value);
		onDomReady(this, () => {
			this.setValue(this.strDate);
		});
	}

	get value () {
		return this.strDate;
	}

	get valid () {
		return this.isValid();
	}

	onLabel (value) {
		this.labelNode.innerHTML = value;
	}

	onMin (value) {
		this.minTime = dates.format(util.getMinTime(value), 'h:m a');
		this.minDate = util.getMinDate(value);
		this.validate();
	}

	onMax (value) {
		this.maxTime = dates.format(util.getMaxTime(value), 'h:m a');
		this.maxDate = util.getMaxDate(value);
		this.validate();
	}

	get templateString () {
		return `
<label>
	<span ref="labelNode"></span>
	<input ref="input" class="empty" />
</label>`;
	}

	constructor () {
		super();
		this.typedValue = '';
	}

	setValue (value, silent, ampm) {
		const isReady = /[ap]m/i.test(value) || value.replace(/(?!X)\D/g, '').length >= 4;
		if (isReady) {
			this.setAMPM(value, getAMPM(value, ampm));
			value = util.formatTime(value);
			if (value.length === 5) {
				value = this.setAMPM(value);
			}
		}

		this.typedValue = value;
		this.input.value = value;
		const valid = this.validate();

		if (valid) {
			this.strDate = value;
			if (!silent) {
				this.emitEvent();
			}
		}
		return value;
	}

	setDate (value) {
		// sets the current date, but not the time
		// used when inside a date picker for min/max
		this.date = value;
		this.validate();
	}

	isValid (value = this.input.value) {
		if (!value && this.required) {
			this.emitError('This field is required');
			return false;
		}
		if (this.date && value) {
			if (this.minDate && dates.is(this.date).equalDate(this.minDate)) {
				if (util.is(value).less(this.minTime)) {
					const msg = this.min === 'now' ? 'Value must be in the future' : `Value is less than the minimum, ${this.min}`;
					this.emitError(msg);
					return false;
				}
			}
			if (this.maxDate && dates.is(this.date).equalDate(this.maxDate)) {
				if (util.is(value).greater(this.maxTime)) {
					const msg = this.max === 'now' ? 'Value must be in the past' : `Value is greater than the maximum, ${this.max}`;
					this.emitError(msg);
					return false;
				}
			}
		} else if (value) {
			if (this.minTime) {
				if (util.is(value).less(this.minTime)) {
					const msg = this.min === 'now' ? 'Value must be in the future' : `Value is less than the minimum, ${this.min}`;
					this.emitError(msg);
					return false;
				}
			}
			if (this.maxTime) {
				if (util.is(value).greater(this.maxTime)) {
					const msg = this.max === 'now' ? 'Value must be in the past' : `Value is greater than the maximum, ${this.max}`;
					this.emitError(msg);
					return false;
				}
			}
		}
		return util.timeIsValid(value);
	}

	validate () {
		if (this.isValid()) {
			this.classList.remove('invalid');
			this.emitError(null);
			return true;
		}
		this.classList.add('invalid');
		return false;
	}

	setAMPM (value, ampm) {
		let isAM;
		if (ampm) {
			isAM = /a/i.test(ampm);
		} else if (/[ap]/.test(value)) {
			isAM = /a/i.test(value);
		} else {
			isAM = this.isAM;
		}
		value = value.replace(/\s*[ap]m/i, '') + (isAM ? ' am' : ' pm');
		this.isAM = isAM;
		this.isPM = !isAM;
		return value;
	}

	focus () {
		this.onDomReady(() => {
			this.input.focus();
		});
	}

	blur () {
		this.onDomReady(() => {
			this.input.blur();
			this.validate();
			this.emitEvent();
		})
	}

	domReady () {
		this.mask = this.mask || defaultMask;
		this.maskLength = this.mask.match(/X/g).join('').length;
		this.input.setAttribute('type', 'text');
		this.input.setAttribute('placeholder', this.placeholder || defaultPlaceholder);
		if (this.name) {
			this.input.setAttribute('name', this.name);
		}
		if (this.label) {
			this.labelNode.innerHTML = this.label;
		}
		this.eventName = this['event-name'] || EVENT_NAME;
		this.emitType = this.eventName === EVENT_NAME ? 'emit' : 'fire';
		this.connectKeys();
	}

	emitEvent () {
		const value = this.value;
		if (value === this.lastValue || !this.isValid(value)) {
			return;
		}
		this.lastValue = value;
		this[this.emitType](this.eventName, { value }, true);
	}

	emitError (msg) {
		if (msg === this.validationError) {
			return;
		}
		this.validationError = msg;
		this.fire('validation', { message: msg }, true);
	}

	connectKeys () {
		this.on(this.input, 'keydown', util.stopEvent);
		this.on(this.input, 'keypress', util.stopEvent);
		this.on(this.input, 'keyup', (e) => {
			onKey.call(this, e);
		});
		this.on(this.input, 'blur', () => {
			this.blur();
		});
	}
}

function getAMPM (value, ampm) {
	if (ampm) {
		return ampm;
	}
	if (/a/i.test(value)) {
		return 'am';
	}
	if (/p/i.test(value)) {
		return 'pm';
	}
	return '';
}

customElements.define('time-input', TimeInput);

module.exports = TimeInput;
},{"./onKey":18,"./util":20,"@clubajax/base-component":2,"@clubajax/dates":7,"@clubajax/dom":8,"@clubajax/on":9}],20:[function(require,module,exports){
function round (n, r, down) {
	return (Math.ceil(n / r) * r) - (down ? r : 0);
}

function incMinutes (value, inc, mult = 1) {

	const type = is(value).type();
	const MN = type === 'time' ? [3,5] : [14,16];

	let mn = parseInt(value.substring(MN[0], MN[1]));
	const org = mn;

	mn = round(mn, mult, inc === -1);

	if (mn === org) {
		mn += (inc * mult);
	}

	if (mn > 59) {
		mn = 0;
	}
	if (mn < 0) {
		mn = 45;
	}

	return `${value.substring(0, MN[0])}${pad(mn)}${value.substring(MN[1])}`;
}

function incHours (value, inc) {
	const type = is(value).type();
	const HR = type === 'time' ? [0,2] : [11,13];
	let hr = parseInt(value.substring(HR[0], HR[1]));
	hr += inc;
	if (hr < 1) {
		hr = 12;
	} else if (hr > 12) {
		hr = 1;
	}
	return `${value.substring(0, HR[0])}${pad(hr)}${value.substring(HR[1])}`;
}

function incMonth (value, inc) {
	let mo = parseInt(value.substring(0,2));
	mo += inc;
	if (mo > 12) {
		mo = 1;
	} else if (mo <= 0) {
		mo = 12;
	}
	return `${pad(mo)}${value.substring(2)}`;
}

function incDate (value, inc) {
	const date = dates.toDate(value);
	const max = dates.getDaysInMonth(date);
	let dt = parseInt(value.substring(3,5));
	dt += inc;
	if (dt <= 0) {
		dt = max;
	} else if (dt > max) {
		dt = 1;
	}
	return `${value.substring(0,2)}${pad(dt)}${value.substring(6)}`;
}

function incYear (value, inc) {
	let yr = parseInt(value.substring(6,10));
	yr += inc;
	return `${value.substring(0,5)}${pad(yr)}${value.substring(11)}`;
}

function pad (num) {
	if (num < 10) {
		return '0' + num;
	}
	return '' + num;
}

function toDateTime (value) {
	// FIXME: toTime() or to strTime() or DELETE - only used in util
	if (typeof value === 'object') {
		value = dates.format(value, 'h:m a');
	} else {
		value = stripDate(value);
	}
	const hr = getHours(value);
	const mn = getMinutes(value);
	const sc = getSeconds(value);
	if (isNaN(hr) || isNaN(mn)) {
		throw new Error('Invalid time ' + time);
	}
	const date = new Date();
	date.setHours(hr);
	date.setMinutes(mn);
	date.setSeconds(sc);
	return date;
}

function timeIsValid (value) {
	// 12:34 am
	if (value.length < 8) {
		return false;
	}
	const hr = getHours(value);
	const mn = getMinutes(value);
	if (isNaN(hr) || isNaN(mn)) {
		return false;
	}
	if (!/[ap]m/i.test(value)) {
		return false;
	}
	if (hr < 0 || hr > 12) {
		return false;
	}
	if (mn < 0 || mn > 59) {
		return false;
	}
	return true;
}

function timeIsInRange (time, min, max, date) {
	if (!min && !max) {
		return true;
	}

	if (date) {
		// first check date range, before time range
		console.log('date.range', date, '/', min, '/', max);
		return true;
	}


	console.log('time.range', time, '/', min, '/', max);
	const d = toDateTime(time);
	// isGreater: 1st > 2nd
	if (min && !dates.is(d).greater(toDateTime(min))) {
		return false;
	}
	if (max && !dates.is(d).less(toDateTime(max))) {
		return false;
	}

	return true;
}

function addTimeToDate (time, date) {
	if (!timeIsValid(time)) {
		console.warn('time is not valid', time);
		return date;
	}
	let hr = getHours(time);
	const mn = getMinutes(time);
	if (/pm/i.test(time) && hr !== 12) {
		hr += 12;
	}
	date.setHours(hr);
	date.setMinutes(mn);
	return date;
}

function nextNumPos (beg, s) {
	let char, i, found = false;
	for (i = 0; i < s.length; i++) {
		if (i < beg) {
			continue;
		}
		char = s.charAt(i);
		if (!isNaN(parseInt(char))) {
			char = parseInt(char);
		}
		if (typeof char === 'number') {
			found = true;
			break;
		}
	}

	return found ? i : -1;
}

const numReg = /[0-9]/;

function isNum (k) {
	return numReg.test(k);
}

const control = {
	'Shift': 1,
	'Enter': 1,
	'Backspace': 1,
	'Delete': 1,
	'ArrowLeft': 1,
	'ArrowRight': 1,
	'Escape': 1,
	'Command': 1,
	'Tab': 1,
	'Meta': 1,
	'Alt': 1
};

const isArrowKey = {
	'ArrowUp': 1,
	'ArrowDown': 1
};

function isControl (e) {
	return control[e.key];
}

function timeToSeconds (value) {
	const isAM = /am/i.test(value);
	let hr = getHours(value);
	if (isAM && hr === 12) {
		hr = 0;
	} else if (!isAM && hr !== 12) {
		hr += 12;
	}
	let mn = getMinutes(value);
	const sc = getSeconds(value);
	if (isNaN(hr) || isNaN(mn)) {
		throw new Error('Invalid time ' + time);
	}
	mn *= 60;
	hr *= 3600;
	return hr + mn + sc;
}

function getHours (value) {
	return parseInt(value.substring(0, 2));
}

function getMinutes (value) {
	return parseInt(value.substring(3, 5));
}

function getSeconds (value) {
	if (value.split(':').length === 3) {
		return parseInt(value.substring(6, 8));
	}
	return 0;
}

function stripDate (str) {
	return str.replace(/\d+[\/-]\d+[\/-]\d+\s*/, '');
}

function stopEvent (e) {
	if (e.metaKey || control[e.key]) {
		return;
	}
	e.preventDefault();
	e.stopImmediatePropagation();
	return false;
}

function removeCharAtPos (str, pos) {
	return str.substring(0, pos) + str.substring(pos + 1);
}

function replaceText (str, chars, beg, end, xChars) {
	chars = chars.padEnd(end - beg, xChars);
	return str.substring(0, beg) + chars + str.substring(end);
}

function formatDate (s, mask) {
	function sub (pos) {
		let subStr = '';
		for (let i = pos; i < mask.length; i++) {
			if (mask[i] === 'X') {
				break;
			}
			subStr += mask[i];
		}
		return subStr;
	}

	s = s.replace(/(?!X)\D/g, '');
	const maskLength = mask.match(/X/g).join('').length;
	let f = '';
	const len = Math.min(s.length, maskLength);
	for (let i = 0; i < len; i++) {
		if (mask[f.length] !== 'X') {
			f += sub(f.length);
		}
		f += s[i];
	}
	return f;
}

function formatTime (s) {
	s = s.replace(/(?!X)\D/g, '');
	s = s.substring(0, 4);
	if (s.length < 4) {
		s = `0${s}`;
	}
	if (s.length >= 2) {
		s = s.split('');
		s.splice(2, 0, ':');
		s = s.join('');
	}
	return s;
}

function getAMPM (value) {
	const result = /[ap]m/.exec(value);
	return result ? result[0] : null;
}

function getMinDate (value) {
	if (value === 'now') {
		value = new Date();
	} else {
		value = dates.toDate(value);
	}
	value.setHours(0);
	value.setMinutes(0);
	value.setSeconds(0);
	value.setMilliseconds(0);
	return value;
}

function getMaxDate (value) {
	if (value === 'now') {
		value = new Date();
	} else {
		value = dates.toDate(value);
	}
	value.setHours(23);
	value.setMinutes(59);
	value.setSeconds(59);
	value.setMilliseconds(999);
	return value;
}

function getMinTime (value) {
	if (value === 'now') {
		value = new Date();
	} else {
		value = dates.toDate(value);
	}
	value.setSeconds(value.getSeconds() - 2);
	return value;
}

function getMaxTime (value) {
	if (value === 'now') {
		value = new Date();
	} else {
		value = dates.toDate(value);
	}
	value.setSeconds(value.getSeconds() + 2);
	return value;
}

function toAriaLabel (date) {
	date = dates.toDate(date);
	return dates.format(date, 'd, E MMMM yyyy');
}

function is (value) {
	return {
		less (time) {
			return timeToSeconds(value) < timeToSeconds(time);
		},
		greater (time) {
			return timeToSeconds(value) > timeToSeconds(time);
		},
		dateAndTime () {
			return dates.is(value).date() && dates.is(value).time();
		},
		time () {
			return dates.is(value).time();
		},
		date () {
			return dates.is(value).date();
		},
		type () {
			if (this.dateAndTime()) {
				return 'datetime';
			}
			if (this.time()) {
				return 'time';
			}
			if (this.date()) {
				return 'date';
			}
			return '';
		}
	}
}

module.exports = {
	is,
	addTimeToDate,
	timeIsValid,
	incMinutes,
	incHours,
	incMonth,
	incDate,
	incYear,
	round,
	pad,
	isNum,
	control,
	isArrowKey,
	isControl,
	stopEvent,
	nextNumPos,
	removeCharAtPos,
	replaceText,
	formatDate,
	formatTime,
	getAMPM,
	getMinDate,
	getMaxDate,
	toAriaLabel,
	getMinTime,
	getMaxTime,
	timeIsInRange,
	toDateTime,
	timeToSeconds,
	stripDate
};

},{}],21:[function(require,module,exports){
require('./globals');
require('../../src/date-picker');
require('../../src/date-input');
require('../../src/time-input');
require('../../src/date-range-picker');
require('../../src/date-range-input');
require('../../src/date-range-inputs');
require('../../src/date-time-input');
},{"../../src/date-input":10,"../../src/date-picker":11,"../../src/date-range-input":12,"../../src/date-range-inputs":13,"../../src/date-range-picker":14,"../../src/date-time-input":15,"../../src/time-input":19,"./globals":22}],22:[function(require,module,exports){
window['no-native-shim'] = 1;
require('@clubajax/custom-elements-polyfill');
window.on = require('@clubajax/on');
window.dom = require('@clubajax/dom');
window.dates = require('@clubajax/dates');
window.util = require('../../src/util');
},{"../../src/util":20,"@clubajax/custom-elements-polyfill":6,"@clubajax/dates":7,"@clubajax/dom":8,"@clubajax/on":9}]},{},[21])(21)
});