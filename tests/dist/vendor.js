require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"BaseComponent":[function(require,module,exports){
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(["on", "dom"], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node / CommonJS
        module.exports = factory(require('on'), require('dom'));
    } else {
        // Browser globals (root is window)
        root['BaseComponent'] = factory(root.on, root.dom);
    }
	}(this, function (on, dom) {
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var BaseComponent = function (_HTMLElement) {
	_inherits(BaseComponent, _HTMLElement);

	function BaseComponent() {
		_classCallCheck(this, BaseComponent);

		var _this = _possibleConstructorReturn(this, (BaseComponent.__proto__ || Object.getPrototypeOf(BaseComponent)).call(this));

		_this._uid = dom.uid(_this.localName);
		privates[_this._uid] = { DOMSTATE: 'created' };
		privates[_this._uid].handleList = [];
		plugin('init', _this);
		return _this;
	}

	_createClass(BaseComponent, [{
		key: 'connectedCallback',
		value: function connectedCallback() {
			privates[this._uid].DOMSTATE = privates[this._uid].domReadyFired ? 'domready' : 'connected';
			plugin('preConnected', this);
			nextTick(onCheckDomReady.bind(this));
			if (this.connected) {
				this.connected();
			}
			this.fire('connected');
			plugin('postConnected', this);
		}
	}, {
		key: 'onConnected',
		value: function onConnected(callback) {
			var _this2 = this;

			if (this.DOMSTATE === 'connected' || this.DOMSTATE === 'domready') {
				callback(this);
				return;
			}
			this.once('connected', function () {
				callback(_this2);
			});
		}
	}, {
		key: 'onDomReady',
		value: function onDomReady(callback) {
			var _this3 = this;

			if (this.DOMSTATE === 'domready') {
				callback(this);
				return;
			}
			this.once('domready', function () {
				callback(_this3);
			});
		}
	}, {
		key: 'disconnectedCallback',
		value: function disconnectedCallback() {
			var _this4 = this;

			privates[this._uid].DOMSTATE = 'disconnected';
			plugin('preDisconnected', this);
			if (this.disconnected) {
				this.disconnected();
			}
			this.fire('disconnected');

			var time = void 0,
			    dod = BaseComponent.destroyOnDisconnect;
			if (dod) {
				time = typeof dod === 'number' ? doc : 300;
				setTimeout(function () {
					if (_this4.DOMSTATE === 'disconnected') {
						_this4.destroy();
					}
				}, time);
			}
		}
	}, {
		key: 'attributeChangedCallback',
		value: function attributeChangedCallback(attrName, oldVal, newVal) {
			plugin('preAttributeChanged', this, attrName, newVal, oldVal);
			if (this.attributeChanged) {
				this.attributeChanged(attrName, newVal, oldVal);
			}
		}
	}, {
		key: 'destroy',
		value: function destroy() {
			this.fire('destroy');
			privates[this._uid].handleList.forEach(function (handle) {
				handle.remove();
			});
			dom.destroy(this);
		}
	}, {
		key: 'fire',
		value: function fire(eventName, eventDetail, bubbles) {
			return on.fire(this, eventName, eventDetail, bubbles);
		}
	}, {
		key: 'emit',
		value: function emit(eventName, value) {
			return on.emit(this, eventName, value);
		}
	}, {
		key: 'on',
		value: function (_on) {
			function on(_x, _x2, _x3, _x4) {
				return _on.apply(this, arguments);
			}

			on.toString = function () {
				return _on.toString();
			};

			return on;
		}(function (node, eventName, selector, callback) {
			return this.registerHandle(typeof node !== 'string' ? // no node is supplied
			on(node, eventName, selector, callback) : on(this, node, eventName, selector));
		})
	}, {
		key: 'once',
		value: function once(node, eventName, selector, callback) {
			return this.registerHandle(typeof node !== 'string' ? // no node is supplied
			on.once(node, eventName, selector, callback) : on.once(this, node, eventName, selector, callback));
		}
	}, {
		key: 'attr',
		value: function attr(key, value, toggle) {
			this.isSettingAttribute = true;
			var add = toggle === undefined ? true : !!toggle;
			if (add) {
				this.setAttribute(key, value);
			} else {
				this.removeAttribute(key);
			}
			this.isSettingAttribute = false;
		}
	}, {
		key: 'registerHandle',
		value: function registerHandle(handle) {
			privates[this._uid].handleList.push(handle);
			return handle;
		}
	}, {
		key: 'DOMSTATE',
		get: function get() {
			return privates[this._uid].DOMSTATE;
		}
	}], [{
		key: 'clone',
		value: function clone(template) {
			if (template.content && template.content.children) {
				return document.importNode(template.content, true);
			}
			var frag = document.createDocumentFragment();
			var cloneNode = document.createElement('div');
			cloneNode.innerHTML = template.innerHTML;

			while (cloneNode.children.length) {
				frag.appendChild(cloneNode.children[0]);
			}
			return frag;
		}
	}, {
		key: 'addPlugin',
		value: function addPlugin(plug) {
			var i = void 0,
			    order = plug.order || 100;
			if (!plugins.length) {
				plugins.push(plug);
			} else if (plugins.length === 1) {
				if (plugins[0].order <= order) {
					plugins.push(plug);
				} else {
					plugins.unshift(plug);
				}
			} else if (plugins[0].order > order) {
				plugins.unshift(plug);
			} else {

				for (i = 1; i < plugins.length; i++) {
					if (order === plugins[i - 1].order || order > plugins[i - 1].order && order < plugins[i].order) {
						plugins.splice(i, 0, plug);
						return;
					}
				}
				// was not inserted...
				plugins.push(plug);
			}
		}
	}, {
		key: 'destroyOnDisconnect',
		set: function set(value) {
			privates['destroyOnDisconnect'] = value;
		},
		get: function get() {
			return privates['destroyOnDisconnect'];
		}
	}]);

	return BaseComponent;
}(HTMLElement);

var privates = {},
    plugins = [];

function plugin(method, node, a, b, c) {
	plugins.forEach(function (plug) {
		if (plug[method]) {
			plug[method](node, a, b, c);
		}
	});
}

function onCheckDomReady() {
	if (this.DOMSTATE !== 'connected' || privates[this._uid].domReadyFired) {
		return;
	}

	var count = 0,
	    children = getChildCustomNodes(this),
	    ourDomReady = onDomReady.bind(this);

	function addReady() {
		count++;
		if (count === children.length) {
			ourDomReady();
		}
	}

	// If no children, we're good - leaf node. Commence with onDomReady
	//
	if (!children.length) {
		ourDomReady();
	} else {
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

function onDomReady() {
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

	this.fire('domready');

	plugin('postDomReady', this);
}

function getChildCustomNodes(node) {
	// collect any children that are custom nodes
	// used to check if their dom is ready before
	// determining if this is ready
	var i = void 0,
	    nodes = [];
	for (i = 0; i < node.children.length; i++) {
		if (node.children[i].nodeName.indexOf('-') > -1) {
			nodes.push(node.children[i]);
		}
	}
	return nodes;
}

function nextTick(cb) {
	requestAnimationFrame(cb);
}

window.onDomReady = function (node, callback) {
	function onReady() {
		callback(node);
		node.removeEventListener('domready', onReady);
	}

	if (node.DOMSTATE === 'domready') {
		callback(node);
	} else {
		node.addEventListener('domready', onReady);
	}
};

	return BaseComponent;

}));
},{"dom":"dom","on":"on"}],"custom-elements-polyfill":[function(require,module,exports){
var supportsV1 = 'customElements' in window;
var supportsPromise = 'Promise' in window;
var nativeShimBase64 = "ZnVuY3Rpb24gbmF0aXZlU2hpbSgpeygoKT0+eyd1c2Ugc3RyaWN0JztpZighd2luZG93LmN1c3RvbUVsZW1lbnRzKXJldHVybjtjb25zdCBhPXdpbmRvdy5IVE1MRWxlbWVudCxiPXdpbmRvdy5jdXN0b21FbGVtZW50cy5kZWZpbmUsYz13aW5kb3cuY3VzdG9tRWxlbWVudHMuZ2V0LGQ9bmV3IE1hcCxlPW5ldyBNYXA7bGV0IGY9ITEsZz0hMTt3aW5kb3cuSFRNTEVsZW1lbnQ9ZnVuY3Rpb24oKXtpZighZil7Y29uc3Qgaj1kLmdldCh0aGlzLmNvbnN0cnVjdG9yKSxrPWMuY2FsbCh3aW5kb3cuY3VzdG9tRWxlbWVudHMsaik7Zz0hMDtjb25zdCBsPW5ldyBrO3JldHVybiBsfWY9ITE7fSx3aW5kb3cuSFRNTEVsZW1lbnQucHJvdG90eXBlPWEucHJvdG90eXBlO09iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3csJ2N1c3RvbUVsZW1lbnRzJyx7dmFsdWU6d2luZG93LmN1c3RvbUVsZW1lbnRzLGNvbmZpZ3VyYWJsZTohMCx3cml0YWJsZTohMH0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3cuY3VzdG9tRWxlbWVudHMsJ2RlZmluZScse3ZhbHVlOihqLGspPT57Y29uc3QgbD1rLnByb3RvdHlwZSxtPWNsYXNzIGV4dGVuZHMgYXtjb25zdHJ1Y3Rvcigpe3N1cGVyKCksT2JqZWN0LnNldFByb3RvdHlwZU9mKHRoaXMsbCksZ3x8KGY9ITAsay5jYWxsKHRoaXMpKSxnPSExO319LG49bS5wcm90b3R5cGU7bS5vYnNlcnZlZEF0dHJpYnV0ZXM9ay5vYnNlcnZlZEF0dHJpYnV0ZXMsbi5jb25uZWN0ZWRDYWxsYmFjaz1sLmNvbm5lY3RlZENhbGxiYWNrLG4uZGlzY29ubmVjdGVkQ2FsbGJhY2s9bC5kaXNjb25uZWN0ZWRDYWxsYmFjayxuLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjaz1sLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayxuLmFkb3B0ZWRDYWxsYmFjaz1sLmFkb3B0ZWRDYWxsYmFjayxkLnNldChrLGopLGUuc2V0KGosayksYi5jYWxsKHdpbmRvdy5jdXN0b21FbGVtZW50cyxqLG0pO30sY29uZmlndXJhYmxlOiEwLHdyaXRhYmxlOiEwfSksT2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdy5jdXN0b21FbGVtZW50cywnZ2V0Jyx7dmFsdWU6KGopPT5lLmdldChqKSxjb25maWd1cmFibGU6ITAsd3JpdGFibGU6ITB9KTt9KSgpO30=";
if(supportsV1){
	if(!window['no-native-shim']) {
		eval(window.atob(nativeShimBase64));
		nativeShim();
	}
}else{
	customElements();
}
if (!supportsPromise) {
	promisePolyfill();
}

function customElements() {
(function(){
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
// @license Polymer Project Authors. http://polymer.github.io/LICENSE.txt


function promisePolyfill () {
// https://github.com/taylorhakes/promise-polyfill/blob/master/promise.js
var setTimeoutFunc = setTimeout;
function noop() {}
function bind(fn, thisArg) {
return function () {
fn.apply(thisArg, arguments);
};
}
function Promise(fn) {
if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new');
if (typeof fn !== 'function') throw new TypeError('not a function');
this._state = 0;
this._handled = false;
this._value = undefined;
this._deferreds = [];

doResolve(fn, this);
}
function handle(self, deferred) {
while (self._state === 3) {
self = self._value;
}
if (self._state === 0) {
self._deferreds.push(deferred);
return;
}
self._handled = true;
Promise._immediateFn(function () {
var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
if (cb === null) {
(self._state === 1 ? resolve : reject)(deferred.promise, self._value);
return;
}
var ret;
try {
ret = cb(self._value);
} catch (e) {
reject(deferred.promise, e);
return;
}
resolve(deferred.promise, ret);
});
}
function resolve(self, newValue) {
try {
// Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
if (newValue === self) throw new TypeError('A promise cannot be resolved with itself.');
if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
var then = newValue.then;
if (newValue instanceof Promise) {
self._state = 3;
self._value = newValue;
finale(self);
return;
} else if (typeof then === 'function') {
doResolve(bind(then, newValue), self);
return;
}
}
self._state = 1;
self._value = newValue;
finale(self);
} catch (e) {
reject(self, e);
}
}
function reject(self, newValue) {
self._state = 2;
self._value = newValue;
finale(self);
}
function finale(self) {
if (self._state === 2 && self._deferreds.length === 0) {
Promise._immediateFn(function() {
if (!self._handled) {
Promise._unhandledRejectionFn(self._value);
}
});
}

for (var i = 0, len = self._deferreds.length; i < len; i++) {
handle(self, self._deferreds[i]);
}
self._deferreds = null;
}
function Handler(onFulfilled, onRejected, promise) {
this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
this.onRejected = typeof onRejected === 'function' ? onRejected : null;
this.promise = promise;
}
function doResolve(fn, self) {
var done = false;
try {
fn(function (value) {
if (done) return;
done = true;
resolve(self, value);
}, function (reason) {
if (done) return;
done = true;
reject(self, reason);
});
} catch (ex) {
if (done) return;
done = true;
reject(self, ex);
}
}
Promise.prototype['catch'] = function (onRejected) {
return this.then(null, onRejected);
};
Promise.prototype.then = function (onFulfilled, onRejected) {
var prom = new (this.constructor)(noop);

handle(this, new Handler(onFulfilled, onRejected, prom));
return prom;
};
Promise.all = function (arr) {
var args = Array.prototype.slice.call(arr);
return new Promise(function (resolve, reject) {
if (args.length === 0) return resolve([]);
var remaining = args.length;

function res(i, val) {
try {
if (val && (typeof val === 'object' || typeof val === 'function')) {
var then = val.then;
if (typeof then === 'function') {
then.call(val, function (val) {
res(i, val);
}, reject);
return;
}
}
args[i] = val;
if (--remaining === 0) {
resolve(args);
}
} catch (ex) {
reject(ex);
}
}

for (var i = 0; i < args.length; i++) {
res(i, args[i]);
}
});
};
Promise.resolve = function (value) {
if (value && typeof value === 'object' && value.constructor === Promise) {
return value;
}

return new Promise(function (resolve) {
resolve(value);
});
};
Promise.reject = function (value) {
return new Promise(function (resolve, reject) {
reject(value);
});
};
Promise.race = function (values) {
return new Promise(function (resolve, reject) {
for (var i = 0, len = values.length; i < len; i++) {
values[i].then(resolve, reject);
}
});
};
Promise._immediateFn = (typeof setImmediate === 'function' && function (fn) { setImmediate(fn); }) ||
function (fn) {
setTimeoutFunc(fn, 0);
};
Promise._unhandledRejectionFn = function _unhandledRejectionFn(err) {
if (typeof console !== 'undefined' && console) {
console.warn('Possible Unhandled Promise Rejection:', err); // eslint-disable-line no-console
}
};
Promise._setImmediateFn = function _setImmediateFn(fn) {
Promise._immediateFn = fn;
};
Promise._setUnhandledRejectionFn = function _setUnhandledRejectionFn(fn) {
Promise._unhandledRejectionFn = fn;
};
console.log('Promise polyfill');
window.Promise = Promise;
}

},{}],"dom":[function(require,module,exports){
/* UMD.define */ (function (root, factory) {
    if (typeof customLoader === 'function'){ customLoader(factory, 'dom'); }else if (typeof define === 'function' && define.amd) { define([], factory); } else if (typeof exports === 'object') { module.exports = factory(); } else { root.returnExports = factory(); window.dom = factory(); }
}(this, function () {

    var
        isFloat = {
            opacity: 1,
            zIndex: 1,
            'z-index': 1
        },
        isDimension = {
            width:1,
            height:1,
            top:1,
            left:1,
            right:1,
            bottom:1,
            maxWidth:1,
            'max-width':1,
            minWidth:1,
            'min-width':1,
            maxHeight:1,
            'max-height':1
        },
        uids = {},
        destroyer = document.createElement('div');

    function uid (type){
        if(!uids[type]){
            uids[type] = [];
        }
        var id = type + '-' + (uids[type].length + 1);
        uids[type].push(id);
        return id;
    }

    function isNode (item){
        // safer test for custom elements in FF (with wc shim)
        return !!item && typeof item === 'object' && typeof item.innerHTML === 'string';
    }

    function getNode (item){
        if(typeof item === 'string'){
            return document.getElementById(item);
        }
        return item;
    }

    function byId (id){
        return getNode(id);
    }

    function style (node, prop, value){
        var key, computed;
        if(typeof prop === 'object'){
            // object setter
            for(key in prop){
                if(prop.hasOwnProperty(key)){
                    style(node, key, prop[key]);
                }
            }
            return null;
        }else if(value !== undefined){
            // property setter
            if(typeof value === 'number' && isDimension[prop]){
                value += 'px';
            }
            node.style[prop] = value;
        }

        // getter, if a simple style
        if(node.style[prop]){
            if(isDimension[prop]){
                return parseInt(node.style[prop], 10);
            }
            if(isFloat[prop]){
                return parseFloat(node.style[prop]);
            }
            return node.style[prop];
        }

        // getter, computed
        computed = getComputedStyle(node, prop);
        if(computed[prop]){
            if(/\d/.test(computed[prop])){
                if(!isNaN(parseInt(computed[prop], 10))){
                    return parseInt(computed[prop], 10);
                }
                return computed[prop];
            }
            return computed[prop];
        }
        return '';
    }

    function attr (node, prop, value){
        var key;
        if(typeof prop === 'object'){
            for(key in prop){
                if(prop.hasOwnProperty(key)){
                    attr(node, key, prop[key]);
                }
            }
            return null;
        }
        else if(value !== undefined){
            if(prop === 'text' || prop === 'html' || prop === 'innerHTML') {
            	// ignore, handled during creation
				return;
			}
			else if(prop === 'className' || prop === 'class') {
				node.className = value;
			}
			else if(prop === 'style') {
				style(node, value);
			}
			else if(prop === 'attr') {
            	// back compat
				attr(node, value);
			}
			else if(typeof value === 'object'){
            	// object, like 'data'
				node[prop] = value;
            }
            else{
                node.setAttribute(prop, value);
            }
        }

        return node.getAttribute(prop);
    }

    function box (node){
        if(node === window){
            node = document.documentElement;
        }
        // node dimensions
        // returned object is immutable
        // add scroll positioning and convenience abbreviations
        var
            dimensions = getNode(node).getBoundingClientRect();
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

    function query (node, selector){
        if(!selector){
            selector = node;
            node = document;
        }
        return node.querySelector(selector);
    }
    
    function queryAll (node, selector){
        if(!selector){
            selector = node;
            node = document;
        }
        var nodes = node.querySelectorAll(selector);

        if(!nodes.length){ return []; }

        // convert to Array and return it
        return Array.prototype.slice.call(nodes);
    }

    function toDom (html, options, parent){
        var node = dom('div', {html: html});
        parent = byId(parent || options);
        if(parent){
            while(node.firstChild){
                parent.appendChild(node.firstChild);
            }
            return node.firstChild;
        }
        if(html.indexOf('<') !== 0){
            return node;
        }
        return node.firstChild;
    }

    function fromDom (node) {
        function getAttrs (node) {
            var att, i, attrs = {};
            for(i = 0; i < node.attributes.length; i++){
                att = node.attributes[i];
                attrs[att.localName] = normalize(att.value === '' ? true : att.value);
            }
            return attrs;
        }
        function getText (node) {
            var i, t, text = '';
            for(i = 0; i < node.childNodes.length; i++){
                t = node.childNodes[i];
                if(t.nodeType === 3 && t.textContent.trim()){
                    text += t.textContent.trim();
                }
            }
            return text;
        }
        var i, object = getAttrs(node);
        object.text = getText(node);
        object.children = [];
        if(node.children.length){
            for(i = 0; i < node.children.length; i++){
                object.children.push(fromDom(node.children[i]));
            }
        }
        return object;
    }

    function addChildren (node, children) {
        if(Array.isArray(children)){
            for(var i = 0; i < children.length; i++){
            	if(typeof children[i] === 'string'){
					node.appendChild(toDom(children[i]));
				}else {
					node.appendChild(children[i]);
				}
            }
        }
        else{
            node.appendChild(children);
        }
    }

    function addContent (node, options) {
        var html;
        if(options.html !== undefined || options.innerHTML !== undefined){
            html = options.html || options.innerHTML || '';
            if(typeof html === 'object'){
                addChildren(node, html);
            }else{
            	// careful assuming textContent -
				// misses some HTML, such as entities (&npsp;)
                node.innerHTML = html;
            }
        }
        if(options.text){
            node.appendChild(document.createTextNode(options.text));
        }
        if(options.children){
            addChildren(node, options.children);
        }
    }
    
    function dom (nodeType, options, parent, prepend){
		options = options || {};

		// if first argument is a string and starts with <, pass to toDom()
        if(nodeType.indexOf('<') === 0){
            return toDom(nodeType, options, parent);
        }

        var node = document.createElement(nodeType);

        parent = getNode(parent);

        addContent(node, options);

		attr(node, options);

        if(parent && isNode(parent)){
            if(prepend && parent.hasChildNodes()){
                parent.insertBefore(node, parent.children[0]);
            }else{
                parent.appendChild(node);
            }
        }

        return node;
    }

    function insertAfter (refNode, node) {
        var sibling = refNode.nextElementSibling;
        if(!sibling){
            refNode.parentNode.appendChild(node);
        }else{
            refNode.parentNode.insertBefore(node, sibling);
        }
        return sibling;
    }

    function destroy (node){
        // destroys a node completely
        //
        if(node) {
            destroyer.appendChild(node);
            destroyer.innerHTML = '';
        }
    }

    function clean (node, dispose){
        //	Removes all child nodes
        //		dispose: destroy child nodes
        if(dispose){
            while(node.children.length){
                destroy(node.children[0]);
            }
            return;
        }
        while(node.children.length){
            node.removeChild(node.children[0]);
        }
    }

    dom.classList = {
    	// in addition to fixing IE11 toggle
		// these methods also handle arrays
        remove: function (node, names){
            toArray(names).forEach(function(name){
                node.classList.remove(name);
            });
        },
        add: function (node, names){
            toArray(names).forEach(function(name){
                node.classList.add(name);
            });
        },
        contains: function (node, names){
            return toArray(names).every(function (name) {
                return node.classList.contains(name);
            });
        },
        toggle: function (node, names, value){
            names = toArray(names);
            if(typeof value === 'undefined') {
                // use standard functionality, supported by IE
                names.forEach(function (name) {
                    node.classList.toggle(name, value);
                });
            }
            // IE11 does not support the second parameter  
            else if(value){
                names.forEach(function (name) {
                    node.classList.add(name);
                });
            }
            else{
                names.forEach(function (name) {
                    node.classList.remove(name);
                });
            }
        }
    };

    function toArray (names){
        if(!names){
            console.error('dom.classList should include a node and a className');
            return [];
        }
        return names.split(' ').map(function (name) {
            return name.trim();
        });
    }
    
    function normalize (val){
        if(typeof val === 'string') {
			if(val === 'false'){
				return false;
			}
			else if(val === 'null'){
				return null;
			}
			else if(val === 'true'){
				return true;
			}
			if (val.indexOf('/') > -1 || (val.match(/-/g) || []).length > 1) {
				// type of date
				return val;
			}
		}
        if(!isNaN(parseFloat(val))){
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

    return dom;
}));

},{}],"on":[function(require,module,exports){
(function (root, factory) {
	if (typeof customLoader === 'function') {
		customLoader(factory, 'on');
	} else if (typeof define === 'function' && define.amd) {
		define([], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory();
	} else {
		root.returnExports = factory();
		window.on = factory();
	}
}(this, function () {
	'use strict';

	function hasWheelTest () {
		var
			isIE = navigator.userAgent.indexOf('Trident') > -1,
			div = document.createElement('div');
		return "onwheel" in div || "wheel" in div ||
			(isIE && document.implementation.hasFeature("Events.wheel", "3.0")); // IE feature detection
	}

	var
		INVALID_PROPS,
		matches,
		hasWheel = hasWheelTest(),
		isWin = navigator.userAgent.indexOf('Windows') > -1,
		FACTOR = isWin ? 10 : 0.1,
		XLR8 = 0,
		mouseWheelHandle;


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
			if (element[matches] && element[matches](selector)) {
				return element;
			}
			if (element === parent) {
				break;
			}
			element = element.parentElement;
		}
		return null;
	}

	function closestFilter (element, selector) {
		return function (e) {
			return closest(e.target, selector, element);
		};
	}

	function makeMultiHandle (handles) {
		return {
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
			},
			pause: function () {
				handles.forEach(function (h) {
					if (h.pause) {
						h.pause();
					}
				});
			},
			resume: function () {
				handles.forEach(function (h) {
					if (h.resume) {
						h.resume();
					}
				});
			}
		};
	}

	function onClickoff (node, callback) {
		// important note!
		// starts paused
		//
		var
			handle,
			bHandle = on(document.body, 'click', function (event) {
				var target = event.target;
				if (target.nodeType !== 1) {
					target = target.parentNode;
				}
				if (target && !node.contains(target)) {
					callback(event);
				}
			});

		handle = {
			resume: function () {
				setTimeout(function () {
					bHandle.resume();
				}, 100);
			},
			pause: function () {
				bHandle.pause();
			},
			remove: function () {
				bHandle.remove();
			}
		};

		handle.pause();

		return handle;
	}

	function onImageLoad (img, callback) {
		function onImageLoad (e) {
			var h = setInterval(function () {
				if (img.naturalWidth) {
					e.width = img.naturalWidth;
					e.naturalWidth = img.naturalWidth;
					e.height = img.naturalHeight;
					e.naturalHeight = img.naturalHeight;
					callback(e);
					clearInterval(h);
				}
			}, 100);
			img.removeEventListener('load', onImageLoad);
			img.removeEventListener('error', callback);
		}

		img.addEventListener('load', onImageLoad);
		img.addEventListener('error', callback);
		return {
			pause: function () {},
			resume: function () {},
			remove: function () {
				img.removeEventListener('load', onImageLoad);
				img.removeEventListener('error', callback);
			}
		}
	}

	function getNode (str) {
		if (typeof str !== 'string') {
			return str;
		}
		var node = document.getElementById(str);
		if (!node) {
			console.error('`on` Could not find:', str);
		}
		return node;
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
		return function (e) {
			if (ieKeys[e.key]) {
				var fakeEvent = mix({}, e);
				fakeEvent.key = ieKeys[e.key];
				callback(fakeEvent);
			} else {
				callback(e);
			}
		}
	}

	function normalizeWheelEvent (callback) {
		// normalizes all browsers' events to a standard:
		// delta, wheelY, wheelX
		// also adds acceleration and deceleration to make
		// Mac and Windows behave similarly
		return function (e) {
			XLR8 += FACTOR;
			var
				deltaY = Math.max(-1, Math.min(1, (e.wheelDeltaY || e.deltaY))),
				deltaX = Math.max(-10, Math.min(10, (e.wheelDeltaX || e.deltaX)));

			deltaY = deltaY <= 0 ? deltaY - XLR8 : deltaY + XLR8;

			e.delta = deltaY;
			e.wheelY = deltaY;
			e.wheelX = deltaX;

			clearTimeout(mouseWheelHandle);
			mouseWheelHandle = setTimeout(function () {
				XLR8 = 0;
			}, 300);
			callback(e);
		};
	}

	function isMultiKey (eventName) {
		return /,/.test(eventName) && !/click|mouse|resize|scroll/.test(eventName);
	}

	function keysToRegExp (eventName) {
		return new RegExp(eventName.replace('keydown:', '').replace('keyup:', '').split(',').join('|'));
	}

	function on (node, eventName, filter, handler) {
		var
			callback,
			handles,
			handle,
			keyRegExp;

		if (isMultiKey(eventName)) {
			keyRegExp = keysToRegExp(eventName);
			callback = function (e) {
				if (keyRegExp.test(e.key)) {
					(handler || filter)(e);
				}
			};
			eventName = /keydown/.test(eventName) ? 'keydown' : 'keyup';
		}

		if (/,/.test(eventName)) {
			// handle multiple event types, like:
			// on(node, 'mouseup, mousedown', callback);
			//
			handles = [];
			eventName.split(',').forEach(function (eStr) {
				handles.push(on(node, eStr.trim(), filter, handler));
			});
			return makeMultiHandle(handles);
		}

		if(eventName === 'button'){
			// handle click and Enter
			return makeMultiHandle([
				on(node, 'click', filter, handle),
				on(node, 'keyup:Enter', filter, handle)
			]);
		}

		node = getNode(node);

		if (filter && handler) {
			if (typeof filter === 'string') {
				filter = closestFilter(node, filter);
			}
			// else it is a custom function
			callback = function (e) {
				var result = filter(e);
				if (result) {
					e.filteredTarget = result;
					handler(e, result);
				}
			};
		} else if (!callback) {
			callback = filter || handler;
		}

		if (eventName === 'clickoff') {
			// custom - used for popups 'n stuff
			return onClickoff(node, callback);
		}

		if (eventName === 'load' && node.localName === 'img') {
			return onImageLoad(node, callback);
		}

		if (eventName === 'wheel') {
			// mousewheel events, natch
			if (hasWheel) {
				// pass through, but first curry callback to wheel events
				callback = normalizeWheelEvent(callback);
			} else {
				// old Firefox, old IE, Chrome
				return makeMultiHandle([
					on(node, 'DOMMouseScroll', normalizeWheelEvent(callback)),
					on(node, 'mousewheel', normalizeWheelEvent(callback))
				]);
			}
		}

		if (/key/.test(eventName)) {
			callback = normalizeKeyEvent(callback);
		}

		node.addEventListener(eventName, callback, false);

		handle = {
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

		return handle;
	}

	on.once = function (node, eventName, filter, callback) {
		var h;
		if (filter && callback) {
			h = on(node, eventName, filter, function () {
				callback.apply(window, arguments);
				h.remove();
			});
		} else {
			h = on(node, eventName, function () {
				filter.apply(window, arguments);
				h.remove();
			});
		}
		return h;
	};

	INVALID_PROPS = {
		isTrusted: 1
	};
	function mix (object, value) {
		if (!value) {
			return object;
		}
		if (typeof value === 'object') {
			for(var key in value){
				if (!INVALID_PROPS[key] && typeof value[key] !== 'function') {
					object[key] = value[key];
				}
			}
		} else {
			object.value = value;
		}
		return object;
	}

	on.emit = function (node, eventName, value) {
		node = getNode(node);
		var event = document.createEvent('HTMLEvents');
		event.initEvent(eventName, true, true); // event type, bubbling, cancelable
		return node.dispatchEvent(mix(event, value));
	};

	on.fire = function (node, eventName, eventDetail, bubbles) {
		var event = document.createEvent('CustomEvent');
		event.initCustomEvent(eventName, !!bubbles, true, eventDetail); // event type, bubbling, cancelable, value
		return node.dispatchEvent(event);
	};

	on.isAlphaNumeric = function (str) {
		if (str.length > 1) {
			return false;
		}
		if (str === ' ') {
			return false;
		}
		if (!isNaN(Number(str))) {
			return true;
		}
		var code = str.toLowerCase().charCodeAt(0);
		return code >= 97 && code <= 122;
	};

	on.makeMultiHandle = makeMultiHandle;
	on.closest = closest;
	on.matches = matches;

	return on;

}));

},{}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJCYXNlQ29tcG9uZW50IiwiY3VzdG9tLWVsZW1lbnRzLXBvbHlmaWxsIiwiZG9tIiwib24iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIC8vIEFNRFxuICAgICAgICBkZWZpbmUoW1wib25cIiwgXCJkb21cIl0sIGZhY3RvcnkpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgLy8gTm9kZSAvIENvbW1vbkpTXG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCdvbicpLCByZXF1aXJlKCdkb20nKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICAgICAgcm9vdFsnQmFzZUNvbXBvbmVudCddID0gZmFjdG9yeShyb290Lm9uLCByb290LmRvbSk7XG4gICAgfVxuXHR9KHRoaXMsIGZ1bmN0aW9uIChvbiwgZG9tKSB7XG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF9jcmVhdGVDbGFzcyA9IGZ1bmN0aW9uICgpIHsgZnVuY3Rpb24gZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7IGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHsgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTsgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8IGZhbHNlOyBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7IGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikgZGVzY3JpcHRvci53cml0YWJsZSA9IHRydWU7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGRlc2NyaXB0b3Iua2V5LCBkZXNjcmlwdG9yKTsgfSB9IHJldHVybiBmdW5jdGlvbiAoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7IGlmIChwcm90b1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7IGlmIChzdGF0aWNQcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH07IH0oKTtcblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxuZnVuY3Rpb24gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4oc2VsZiwgY2FsbCkgeyBpZiAoIXNlbGYpIHsgdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKFwidGhpcyBoYXNuJ3QgYmVlbiBpbml0aWFsaXNlZCAtIHN1cGVyKCkgaGFzbid0IGJlZW4gY2FsbGVkXCIpOyB9IHJldHVybiBjYWxsICYmICh0eXBlb2YgY2FsbCA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSA/IGNhbGwgOiBzZWxmOyB9XG5cbmZ1bmN0aW9uIF9pbmhlcml0cyhzdWJDbGFzcywgc3VwZXJDbGFzcykgeyBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgIT09IFwiZnVuY3Rpb25cIiAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJTdXBlciBleHByZXNzaW9uIG11c3QgZWl0aGVyIGJlIG51bGwgb3IgYSBmdW5jdGlvbiwgbm90IFwiICsgdHlwZW9mIHN1cGVyQ2xhc3MpOyB9IHN1YkNsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDbGFzcyAmJiBzdXBlckNsYXNzLnByb3RvdHlwZSwgeyBjb25zdHJ1Y3RvcjogeyB2YWx1ZTogc3ViQ2xhc3MsIGVudW1lcmFibGU6IGZhbHNlLCB3cml0YWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0gfSk7IGlmIChzdXBlckNsYXNzKSBPYmplY3Quc2V0UHJvdG90eXBlT2YgPyBPYmplY3Quc2V0UHJvdG90eXBlT2Yoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIDogc3ViQ2xhc3MuX19wcm90b19fID0gc3VwZXJDbGFzczsgfVxuXG52YXIgQmFzZUNvbXBvbmVudCA9IGZ1bmN0aW9uIChfSFRNTEVsZW1lbnQpIHtcblx0X2luaGVyaXRzKEJhc2VDb21wb25lbnQsIF9IVE1MRWxlbWVudCk7XG5cblx0ZnVuY3Rpb24gQmFzZUNvbXBvbmVudCgpIHtcblx0XHRfY2xhc3NDYWxsQ2hlY2sodGhpcywgQmFzZUNvbXBvbmVudCk7XG5cblx0XHR2YXIgX3RoaXMgPSBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybih0aGlzLCAoQmFzZUNvbXBvbmVudC5fX3Byb3RvX18gfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKEJhc2VDb21wb25lbnQpKS5jYWxsKHRoaXMpKTtcblxuXHRcdF90aGlzLl91aWQgPSBkb20udWlkKF90aGlzLmxvY2FsTmFtZSk7XG5cdFx0cHJpdmF0ZXNbX3RoaXMuX3VpZF0gPSB7IERPTVNUQVRFOiAnY3JlYXRlZCcgfTtcblx0XHRwcml2YXRlc1tfdGhpcy5fdWlkXS5oYW5kbGVMaXN0ID0gW107XG5cdFx0cGx1Z2luKCdpbml0JywgX3RoaXMpO1xuXHRcdHJldHVybiBfdGhpcztcblx0fVxuXG5cdF9jcmVhdGVDbGFzcyhCYXNlQ29tcG9uZW50LCBbe1xuXHRcdGtleTogJ2Nvbm5lY3RlZENhbGxiYWNrJyxcblx0XHR2YWx1ZTogZnVuY3Rpb24gY29ubmVjdGVkQ2FsbGJhY2soKSB7XG5cdFx0XHRwcml2YXRlc1t0aGlzLl91aWRdLkRPTVNUQVRFID0gcHJpdmF0ZXNbdGhpcy5fdWlkXS5kb21SZWFkeUZpcmVkID8gJ2RvbXJlYWR5JyA6ICdjb25uZWN0ZWQnO1xuXHRcdFx0cGx1Z2luKCdwcmVDb25uZWN0ZWQnLCB0aGlzKTtcblx0XHRcdG5leHRUaWNrKG9uQ2hlY2tEb21SZWFkeS5iaW5kKHRoaXMpKTtcblx0XHRcdGlmICh0aGlzLmNvbm5lY3RlZCkge1xuXHRcdFx0XHR0aGlzLmNvbm5lY3RlZCgpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5maXJlKCdjb25uZWN0ZWQnKTtcblx0XHRcdHBsdWdpbigncG9zdENvbm5lY3RlZCcsIHRoaXMpO1xuXHRcdH1cblx0fSwge1xuXHRcdGtleTogJ29uQ29ubmVjdGVkJyxcblx0XHR2YWx1ZTogZnVuY3Rpb24gb25Db25uZWN0ZWQoY2FsbGJhY2spIHtcblx0XHRcdHZhciBfdGhpczIgPSB0aGlzO1xuXG5cdFx0XHRpZiAodGhpcy5ET01TVEFURSA9PT0gJ2Nvbm5lY3RlZCcgfHwgdGhpcy5ET01TVEFURSA9PT0gJ2RvbXJlYWR5Jykge1xuXHRcdFx0XHRjYWxsYmFjayh0aGlzKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5vbmNlKCdjb25uZWN0ZWQnLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKF90aGlzMik7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH0sIHtcblx0XHRrZXk6ICdvbkRvbVJlYWR5Jyxcblx0XHR2YWx1ZTogZnVuY3Rpb24gb25Eb21SZWFkeShjYWxsYmFjaykge1xuXHRcdFx0dmFyIF90aGlzMyA9IHRoaXM7XG5cblx0XHRcdGlmICh0aGlzLkRPTVNUQVRFID09PSAnZG9tcmVhZHknKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRoaXMpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHR0aGlzLm9uY2UoJ2RvbXJlYWR5JywgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRjYWxsYmFjayhfdGhpczMpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9LCB7XG5cdFx0a2V5OiAnZGlzY29ubmVjdGVkQ2FsbGJhY2snLFxuXHRcdHZhbHVlOiBmdW5jdGlvbiBkaXNjb25uZWN0ZWRDYWxsYmFjaygpIHtcblx0XHRcdHZhciBfdGhpczQgPSB0aGlzO1xuXG5cdFx0XHRwcml2YXRlc1t0aGlzLl91aWRdLkRPTVNUQVRFID0gJ2Rpc2Nvbm5lY3RlZCc7XG5cdFx0XHRwbHVnaW4oJ3ByZURpc2Nvbm5lY3RlZCcsIHRoaXMpO1xuXHRcdFx0aWYgKHRoaXMuZGlzY29ubmVjdGVkKSB7XG5cdFx0XHRcdHRoaXMuZGlzY29ubmVjdGVkKCk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLmZpcmUoJ2Rpc2Nvbm5lY3RlZCcpO1xuXG5cdFx0XHR2YXIgdGltZSA9IHZvaWQgMCxcblx0XHRcdCAgICBkb2QgPSBCYXNlQ29tcG9uZW50LmRlc3Ryb3lPbkRpc2Nvbm5lY3Q7XG5cdFx0XHRpZiAoZG9kKSB7XG5cdFx0XHRcdHRpbWUgPSB0eXBlb2YgZG9kID09PSAnbnVtYmVyJyA/IGRvYyA6IDMwMDtcblx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0aWYgKF90aGlzNC5ET01TVEFURSA9PT0gJ2Rpc2Nvbm5lY3RlZCcpIHtcblx0XHRcdFx0XHRcdF90aGlzNC5kZXN0cm95KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LCB0aW1lKTtcblx0XHRcdH1cblx0XHR9XG5cdH0sIHtcblx0XHRrZXk6ICdhdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2snLFxuXHRcdHZhbHVlOiBmdW5jdGlvbiBhdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2soYXR0ck5hbWUsIG9sZFZhbCwgbmV3VmFsKSB7XG5cdFx0XHRwbHVnaW4oJ3ByZUF0dHJpYnV0ZUNoYW5nZWQnLCB0aGlzLCBhdHRyTmFtZSwgbmV3VmFsLCBvbGRWYWwpO1xuXHRcdFx0aWYgKHRoaXMuYXR0cmlidXRlQ2hhbmdlZCkge1xuXHRcdFx0XHR0aGlzLmF0dHJpYnV0ZUNoYW5nZWQoYXR0ck5hbWUsIG5ld1ZhbCwgb2xkVmFsKTtcblx0XHRcdH1cblx0XHR9XG5cdH0sIHtcblx0XHRrZXk6ICdkZXN0cm95Jyxcblx0XHR2YWx1ZTogZnVuY3Rpb24gZGVzdHJveSgpIHtcblx0XHRcdHRoaXMuZmlyZSgnZGVzdHJveScpO1xuXHRcdFx0cHJpdmF0ZXNbdGhpcy5fdWlkXS5oYW5kbGVMaXN0LmZvckVhY2goZnVuY3Rpb24gKGhhbmRsZSkge1xuXHRcdFx0XHRoYW5kbGUucmVtb3ZlKCk7XG5cdFx0XHR9KTtcblx0XHRcdGRvbS5kZXN0cm95KHRoaXMpO1xuXHRcdH1cblx0fSwge1xuXHRcdGtleTogJ2ZpcmUnLFxuXHRcdHZhbHVlOiBmdW5jdGlvbiBmaXJlKGV2ZW50TmFtZSwgZXZlbnREZXRhaWwsIGJ1YmJsZXMpIHtcblx0XHRcdHJldHVybiBvbi5maXJlKHRoaXMsIGV2ZW50TmFtZSwgZXZlbnREZXRhaWwsIGJ1YmJsZXMpO1xuXHRcdH1cblx0fSwge1xuXHRcdGtleTogJ2VtaXQnLFxuXHRcdHZhbHVlOiBmdW5jdGlvbiBlbWl0KGV2ZW50TmFtZSwgdmFsdWUpIHtcblx0XHRcdHJldHVybiBvbi5lbWl0KHRoaXMsIGV2ZW50TmFtZSwgdmFsdWUpO1xuXHRcdH1cblx0fSwge1xuXHRcdGtleTogJ29uJyxcblx0XHR2YWx1ZTogZnVuY3Rpb24gKF9vbikge1xuXHRcdFx0ZnVuY3Rpb24gb24oX3gsIF94MiwgX3gzLCBfeDQpIHtcblx0XHRcdFx0cmV0dXJuIF9vbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHRcdFx0fVxuXG5cdFx0XHRvbi50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIF9vbi50b1N0cmluZygpO1xuXHRcdFx0fTtcblxuXHRcdFx0cmV0dXJuIG9uO1xuXHRcdH0oZnVuY3Rpb24gKG5vZGUsIGV2ZW50TmFtZSwgc2VsZWN0b3IsIGNhbGxiYWNrKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5yZWdpc3RlckhhbmRsZSh0eXBlb2Ygbm9kZSAhPT0gJ3N0cmluZycgPyAvLyBubyBub2RlIGlzIHN1cHBsaWVkXG5cdFx0XHRvbihub2RlLCBldmVudE5hbWUsIHNlbGVjdG9yLCBjYWxsYmFjaykgOiBvbih0aGlzLCBub2RlLCBldmVudE5hbWUsIHNlbGVjdG9yKSk7XG5cdFx0fSlcblx0fSwge1xuXHRcdGtleTogJ29uY2UnLFxuXHRcdHZhbHVlOiBmdW5jdGlvbiBvbmNlKG5vZGUsIGV2ZW50TmFtZSwgc2VsZWN0b3IsIGNhbGxiYWNrKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5yZWdpc3RlckhhbmRsZSh0eXBlb2Ygbm9kZSAhPT0gJ3N0cmluZycgPyAvLyBubyBub2RlIGlzIHN1cHBsaWVkXG5cdFx0XHRvbi5vbmNlKG5vZGUsIGV2ZW50TmFtZSwgc2VsZWN0b3IsIGNhbGxiYWNrKSA6IG9uLm9uY2UodGhpcywgbm9kZSwgZXZlbnROYW1lLCBzZWxlY3RvciwgY2FsbGJhY2spKTtcblx0XHR9XG5cdH0sIHtcblx0XHRrZXk6ICdhdHRyJyxcblx0XHR2YWx1ZTogZnVuY3Rpb24gYXR0cihrZXksIHZhbHVlLCB0b2dnbGUpIHtcblx0XHRcdHRoaXMuaXNTZXR0aW5nQXR0cmlidXRlID0gdHJ1ZTtcblx0XHRcdHZhciBhZGQgPSB0b2dnbGUgPT09IHVuZGVmaW5lZCA/IHRydWUgOiAhIXRvZ2dsZTtcblx0XHRcdGlmIChhZGQpIHtcblx0XHRcdFx0dGhpcy5zZXRBdHRyaWJ1dGUoa2V5LCB2YWx1ZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLnJlbW92ZUF0dHJpYnV0ZShrZXkpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5pc1NldHRpbmdBdHRyaWJ1dGUgPSBmYWxzZTtcblx0XHR9XG5cdH0sIHtcblx0XHRrZXk6ICdyZWdpc3RlckhhbmRsZScsXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIHJlZ2lzdGVySGFuZGxlKGhhbmRsZSkge1xuXHRcdFx0cHJpdmF0ZXNbdGhpcy5fdWlkXS5oYW5kbGVMaXN0LnB1c2goaGFuZGxlKTtcblx0XHRcdHJldHVybiBoYW5kbGU7XG5cdFx0fVxuXHR9LCB7XG5cdFx0a2V5OiAnRE9NU1RBVEUnLFxuXHRcdGdldDogZnVuY3Rpb24gZ2V0KCkge1xuXHRcdFx0cmV0dXJuIHByaXZhdGVzW3RoaXMuX3VpZF0uRE9NU1RBVEU7XG5cdFx0fVxuXHR9XSwgW3tcblx0XHRrZXk6ICdjbG9uZScsXG5cdFx0dmFsdWU6IGZ1bmN0aW9uIGNsb25lKHRlbXBsYXRlKSB7XG5cdFx0XHRpZiAodGVtcGxhdGUuY29udGVudCAmJiB0ZW1wbGF0ZS5jb250ZW50LmNoaWxkcmVuKSB7XG5cdFx0XHRcdHJldHVybiBkb2N1bWVudC5pbXBvcnROb2RlKHRlbXBsYXRlLmNvbnRlbnQsIHRydWUpO1xuXHRcdFx0fVxuXHRcdFx0dmFyIGZyYWcgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cdFx0XHR2YXIgY2xvbmVOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0XHRjbG9uZU5vZGUuaW5uZXJIVE1MID0gdGVtcGxhdGUuaW5uZXJIVE1MO1xuXG5cdFx0XHR3aGlsZSAoY2xvbmVOb2RlLmNoaWxkcmVuLmxlbmd0aCkge1xuXHRcdFx0XHRmcmFnLmFwcGVuZENoaWxkKGNsb25lTm9kZS5jaGlsZHJlblswXSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZnJhZztcblx0XHR9XG5cdH0sIHtcblx0XHRrZXk6ICdhZGRQbHVnaW4nLFxuXHRcdHZhbHVlOiBmdW5jdGlvbiBhZGRQbHVnaW4ocGx1Zykge1xuXHRcdFx0dmFyIGkgPSB2b2lkIDAsXG5cdFx0XHQgICAgb3JkZXIgPSBwbHVnLm9yZGVyIHx8IDEwMDtcblx0XHRcdGlmICghcGx1Z2lucy5sZW5ndGgpIHtcblx0XHRcdFx0cGx1Z2lucy5wdXNoKHBsdWcpO1xuXHRcdFx0fSBlbHNlIGlmIChwbHVnaW5zLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHRpZiAocGx1Z2luc1swXS5vcmRlciA8PSBvcmRlcikge1xuXHRcdFx0XHRcdHBsdWdpbnMucHVzaChwbHVnKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRwbHVnaW5zLnVuc2hpZnQocGx1Zyk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAocGx1Z2luc1swXS5vcmRlciA+IG9yZGVyKSB7XG5cdFx0XHRcdHBsdWdpbnMudW5zaGlmdChwbHVnKTtcblx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0Zm9yIChpID0gMTsgaSA8IHBsdWdpbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRpZiAob3JkZXIgPT09IHBsdWdpbnNbaSAtIDFdLm9yZGVyIHx8IG9yZGVyID4gcGx1Z2luc1tpIC0gMV0ub3JkZXIgJiYgb3JkZXIgPCBwbHVnaW5zW2ldLm9yZGVyKSB7XG5cdFx0XHRcdFx0XHRwbHVnaW5zLnNwbGljZShpLCAwLCBwbHVnKTtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gd2FzIG5vdCBpbnNlcnRlZC4uLlxuXHRcdFx0XHRwbHVnaW5zLnB1c2gocGx1Zyk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LCB7XG5cdFx0a2V5OiAnZGVzdHJveU9uRGlzY29ubmVjdCcsXG5cdFx0c2V0OiBmdW5jdGlvbiBzZXQodmFsdWUpIHtcblx0XHRcdHByaXZhdGVzWydkZXN0cm95T25EaXNjb25uZWN0J10gPSB2YWx1ZTtcblx0XHR9LFxuXHRcdGdldDogZnVuY3Rpb24gZ2V0KCkge1xuXHRcdFx0cmV0dXJuIHByaXZhdGVzWydkZXN0cm95T25EaXNjb25uZWN0J107XG5cdFx0fVxuXHR9XSk7XG5cblx0cmV0dXJuIEJhc2VDb21wb25lbnQ7XG59KEhUTUxFbGVtZW50KTtcblxudmFyIHByaXZhdGVzID0ge30sXG4gICAgcGx1Z2lucyA9IFtdO1xuXG5mdW5jdGlvbiBwbHVnaW4obWV0aG9kLCBub2RlLCBhLCBiLCBjKSB7XG5cdHBsdWdpbnMuZm9yRWFjaChmdW5jdGlvbiAocGx1Zykge1xuXHRcdGlmIChwbHVnW21ldGhvZF0pIHtcblx0XHRcdHBsdWdbbWV0aG9kXShub2RlLCBhLCBiLCBjKTtcblx0XHR9XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBvbkNoZWNrRG9tUmVhZHkoKSB7XG5cdGlmICh0aGlzLkRPTVNUQVRFICE9PSAnY29ubmVjdGVkJyB8fCBwcml2YXRlc1t0aGlzLl91aWRdLmRvbVJlYWR5RmlyZWQpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHR2YXIgY291bnQgPSAwLFxuXHQgICAgY2hpbGRyZW4gPSBnZXRDaGlsZEN1c3RvbU5vZGVzKHRoaXMpLFxuXHQgICAgb3VyRG9tUmVhZHkgPSBvbkRvbVJlYWR5LmJpbmQodGhpcyk7XG5cblx0ZnVuY3Rpb24gYWRkUmVhZHkoKSB7XG5cdFx0Y291bnQrKztcblx0XHRpZiAoY291bnQgPT09IGNoaWxkcmVuLmxlbmd0aCkge1xuXHRcdFx0b3VyRG9tUmVhZHkoKTtcblx0XHR9XG5cdH1cblxuXHQvLyBJZiBubyBjaGlsZHJlbiwgd2UncmUgZ29vZCAtIGxlYWYgbm9kZS4gQ29tbWVuY2Ugd2l0aCBvbkRvbVJlYWR5XG5cdC8vXG5cdGlmICghY2hpbGRyZW4ubGVuZ3RoKSB7XG5cdFx0b3VyRG9tUmVhZHkoKTtcblx0fSBlbHNlIHtcblx0XHQvLyBlbHNlLCB3YWl0IGZvciBhbGwgY2hpbGRyZW4gdG8gZmlyZSB0aGVpciBgcmVhZHlgIGV2ZW50c1xuXHRcdC8vXG5cdFx0Y2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiAoY2hpbGQpIHtcblx0XHRcdC8vIGNoZWNrIGlmIGNoaWxkIGlzIGFscmVhZHkgcmVhZHlcblx0XHRcdC8vIGFsc28gY2hlY2sgZm9yIGNvbm5lY3RlZCAtIHRoaXMgaGFuZGxlcyBtb3ZpbmcgYSBub2RlIGZyb20gYW5vdGhlciBub2RlXG5cdFx0XHQvLyBOT1BFLCB0aGF0IGZhaWxlZC4gcmVtb3ZlZCBmb3Igbm93IGNoaWxkLkRPTVNUQVRFID09PSAnY29ubmVjdGVkJ1xuXHRcdFx0aWYgKGNoaWxkLkRPTVNUQVRFID09PSAnZG9tcmVhZHknKSB7XG5cdFx0XHRcdGFkZFJlYWR5KCk7XG5cdFx0XHR9XG5cdFx0XHQvLyBpZiBub3QsIHdhaXQgZm9yIGV2ZW50XG5cdFx0XHRjaGlsZC5vbignZG9tcmVhZHknLCBhZGRSZWFkeSk7XG5cdFx0fSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gb25Eb21SZWFkeSgpIHtcblx0cHJpdmF0ZXNbdGhpcy5fdWlkXS5ET01TVEFURSA9ICdkb21yZWFkeSc7XG5cdC8vIGRvbVJlYWR5IHNob3VsZCBvbmx5IGV2ZXIgZmlyZSBvbmNlXG5cdHByaXZhdGVzW3RoaXMuX3VpZF0uZG9tUmVhZHlGaXJlZCA9IHRydWU7XG5cdHBsdWdpbigncHJlRG9tUmVhZHknLCB0aGlzKTtcblx0Ly8gY2FsbCB0aGlzLmRvbVJlYWR5IGZpcnN0LCBzbyB0aGF0IHRoZSBjb21wb25lbnRcblx0Ly8gY2FuIGZpbmlzaCBpbml0aWFsaXppbmcgYmVmb3JlIGZpcmluZyBhbnlcblx0Ly8gc3Vic2VxdWVudCBldmVudHNcblx0aWYgKHRoaXMuZG9tUmVhZHkpIHtcblx0XHR0aGlzLmRvbVJlYWR5KCk7XG5cdFx0dGhpcy5kb21SZWFkeSA9IGZ1bmN0aW9uICgpIHt9O1xuXHR9XG5cblx0dGhpcy5maXJlKCdkb21yZWFkeScpO1xuXG5cdHBsdWdpbigncG9zdERvbVJlYWR5JywgdGhpcyk7XG59XG5cbmZ1bmN0aW9uIGdldENoaWxkQ3VzdG9tTm9kZXMobm9kZSkge1xuXHQvLyBjb2xsZWN0IGFueSBjaGlsZHJlbiB0aGF0IGFyZSBjdXN0b20gbm9kZXNcblx0Ly8gdXNlZCB0byBjaGVjayBpZiB0aGVpciBkb20gaXMgcmVhZHkgYmVmb3JlXG5cdC8vIGRldGVybWluaW5nIGlmIHRoaXMgaXMgcmVhZHlcblx0dmFyIGkgPSB2b2lkIDAsXG5cdCAgICBub2RlcyA9IFtdO1xuXHRmb3IgKGkgPSAwOyBpIDwgbm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuXHRcdGlmIChub2RlLmNoaWxkcmVuW2ldLm5vZGVOYW1lLmluZGV4T2YoJy0nKSA+IC0xKSB7XG5cdFx0XHRub2Rlcy5wdXNoKG5vZGUuY2hpbGRyZW5baV0pO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gbm9kZXM7XG59XG5cbmZ1bmN0aW9uIG5leHRUaWNrKGNiKSB7XG5cdHJlcXVlc3RBbmltYXRpb25GcmFtZShjYik7XG59XG5cbndpbmRvdy5vbkRvbVJlYWR5ID0gZnVuY3Rpb24gKG5vZGUsIGNhbGxiYWNrKSB7XG5cdGZ1bmN0aW9uIG9uUmVhZHkoKSB7XG5cdFx0Y2FsbGJhY2sobm9kZSk7XG5cdFx0bm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKCdkb21yZWFkeScsIG9uUmVhZHkpO1xuXHR9XG5cblx0aWYgKG5vZGUuRE9NU1RBVEUgPT09ICdkb21yZWFkeScpIHtcblx0XHRjYWxsYmFjayhub2RlKTtcblx0fSBlbHNlIHtcblx0XHRub2RlLmFkZEV2ZW50TGlzdGVuZXIoJ2RvbXJlYWR5Jywgb25SZWFkeSk7XG5cdH1cbn07XG5cblx0cmV0dXJuIEJhc2VDb21wb25lbnQ7XG5cbn0pKTsiLCJ2YXIgc3VwcG9ydHNWMSA9ICdjdXN0b21FbGVtZW50cycgaW4gd2luZG93O1xudmFyIHN1cHBvcnRzUHJvbWlzZSA9ICdQcm9taXNlJyBpbiB3aW5kb3c7XG52YXIgbmF0aXZlU2hpbUJhc2U2NCA9IFwiWm5WdVkzUnBiMjRnYm1GMGFYWmxVMmhwYlNncGV5Z29LVDArZXlkMWMyVWdjM1J5YVdOMEp6dHBaaWdoZDJsdVpHOTNMbU4xYzNSdmJVVnNaVzFsYm5SektYSmxkSFZ5Ymp0amIyNXpkQ0JoUFhkcGJtUnZkeTVJVkUxTVJXeGxiV1Z1ZEN4aVBYZHBibVJ2ZHk1amRYTjBiMjFGYkdWdFpXNTBjeTVrWldacGJtVXNZejEzYVc1a2IzY3VZM1Z6ZEc5dFJXeGxiV1Z1ZEhNdVoyVjBMR1E5Ym1WM0lFMWhjQ3hsUFc1bGR5Qk5ZWEE3YkdWMElHWTlJVEVzWnowaE1UdDNhVzVrYjNjdVNGUk5URVZzWlcxbGJuUTlablZ1WTNScGIyNG9LWHRwWmlnaFppbDdZMjl1YzNRZ2FqMWtMbWRsZENoMGFHbHpMbU52Ym5OMGNuVmpkRzl5S1N4clBXTXVZMkZzYkNoM2FXNWtiM2N1WTNWemRHOXRSV3hsYldWdWRITXNhaWs3WnowaE1EdGpiMjV6ZENCc1BXNWxkeUJyTzNKbGRIVnliaUJzZldZOUlURTdmU3gzYVc1a2IzY3VTRlJOVEVWc1pXMWxiblF1Y0hKdmRHOTBlWEJsUFdFdWNISnZkRzkwZVhCbE8wOWlhbVZqZEM1a1pXWnBibVZRY205d1pYSjBlU2gzYVc1a2IzY3NKMk4xYzNSdmJVVnNaVzFsYm5Sekp5eDdkbUZzZFdVNmQybHVaRzkzTG1OMWMzUnZiVVZzWlcxbGJuUnpMR052Ym1acFozVnlZV0pzWlRvaE1DeDNjbWwwWVdKc1pUb2hNSDBwTEU5aWFtVmpkQzVrWldacGJtVlFjbTl3WlhKMGVTaDNhVzVrYjNjdVkzVnpkRzl0Uld4bGJXVnVkSE1zSjJSbFptbHVaU2NzZTNaaGJIVmxPaWhxTEdzcFBUNTdZMjl1YzNRZ2JEMXJMbkJ5YjNSdmRIbHdaU3h0UFdOc1lYTnpJR1Y0ZEdWdVpITWdZWHRqYjI1emRISjFZM1J2Y2lncGUzTjFjR1Z5S0Nrc1QySnFaV04wTG5ObGRGQnliM1J2ZEhsd1pVOW1LSFJvYVhNc2JDa3NaM3g4S0dZOUlUQXNheTVqWVd4c0tIUm9hWE1wS1N4blBTRXhPMzE5TEc0OWJTNXdjbTkwYjNSNWNHVTdiUzV2WW5ObGNuWmxaRUYwZEhKcFluVjBaWE05YXk1dlluTmxjblpsWkVGMGRISnBZblYwWlhNc2JpNWpiMjV1WldOMFpXUkRZV3hzWW1GamF6MXNMbU52Ym01bFkzUmxaRU5oYkd4aVlXTnJMRzR1WkdselkyOXVibVZqZEdWa1EyRnNiR0poWTJzOWJDNWthWE5qYjI1dVpXTjBaV1JEWVd4c1ltRmpheXh1TG1GMGRISnBZblYwWlVOb1lXNW5aV1JEWVd4c1ltRmphejFzTG1GMGRISnBZblYwWlVOb1lXNW5aV1JEWVd4c1ltRmpheXh1TG1Ga2IzQjBaV1JEWVd4c1ltRmphejFzTG1Ga2IzQjBaV1JEWVd4c1ltRmpheXhrTG5ObGRDaHJMR29wTEdVdWMyVjBLR29zYXlrc1lpNWpZV3hzS0hkcGJtUnZkeTVqZFhOMGIyMUZiR1Z0Wlc1MGN5eHFMRzBwTzMwc1kyOXVabWxuZFhKaFlteGxPaUV3TEhkeWFYUmhZbXhsT2lFd2ZTa3NUMkpxWldOMExtUmxabWx1WlZCeWIzQmxjblI1S0hkcGJtUnZkeTVqZFhOMGIyMUZiR1Z0Wlc1MGN5d25aMlYwSnl4N2RtRnNkV1U2S0dvcFBUNWxMbWRsZENocUtTeGpiMjVtYVdkMWNtRmliR1U2SVRBc2QzSnBkR0ZpYkdVNklUQjlLVHQ5S1NncE8zMD1cIjtcbmlmKHN1cHBvcnRzVjEpe1xuXHRpZighd2luZG93Wyduby1uYXRpdmUtc2hpbSddKSB7XG5cdFx0ZXZhbCh3aW5kb3cuYXRvYihuYXRpdmVTaGltQmFzZTY0KSk7XG5cdFx0bmF0aXZlU2hpbSgpO1xuXHR9XG59ZWxzZXtcblx0Y3VzdG9tRWxlbWVudHMoKTtcbn1cbmlmICghc3VwcG9ydHNQcm9taXNlKSB7XG5cdHByb21pc2VQb2x5ZmlsbCgpO1xufVxuXG5mdW5jdGlvbiBjdXN0b21FbGVtZW50cygpIHtcbihmdW5jdGlvbigpe1xuJ3VzZSBzdHJpY3QnO3ZhciBnPW5ldyBmdW5jdGlvbigpe307dmFyIGFhPW5ldyBTZXQoXCJhbm5vdGF0aW9uLXhtbCBjb2xvci1wcm9maWxlIGZvbnQtZmFjZSBmb250LWZhY2Utc3JjIGZvbnQtZmFjZS11cmkgZm9udC1mYWNlLWZvcm1hdCBmb250LWZhY2UtbmFtZSBtaXNzaW5nLWdseXBoXCIuc3BsaXQoXCIgXCIpKTtmdW5jdGlvbiBrKGIpe3ZhciBhPWFhLmhhcyhiKTtiPS9eW2Etel1bLjAtOV9hLXpdKi1bXFwtLjAtOV9hLXpdKiQvLnRlc3QoYik7cmV0dXJuIWEmJmJ9ZnVuY3Rpb24gbChiKXt2YXIgYT1iLmlzQ29ubmVjdGVkO2lmKHZvaWQgMCE9PWEpcmV0dXJuIGE7Zm9yKDtiJiYhKGIuX19DRV9pc0ltcG9ydERvY3VtZW50fHxiIGluc3RhbmNlb2YgRG9jdW1lbnQpOyliPWIucGFyZW50Tm9kZXx8KHdpbmRvdy5TaGFkb3dSb290JiZiIGluc3RhbmNlb2YgU2hhZG93Um9vdD9iLmhvc3Q6dm9pZCAwKTtyZXR1cm4hKCFifHwhKGIuX19DRV9pc0ltcG9ydERvY3VtZW50fHxiIGluc3RhbmNlb2YgRG9jdW1lbnQpKX1cbmZ1bmN0aW9uIG0oYixhKXtmb3IoO2EmJmEhPT1iJiYhYS5uZXh0U2libGluZzspYT1hLnBhcmVudE5vZGU7cmV0dXJuIGEmJmEhPT1iP2EubmV4dFNpYmxpbmc6bnVsbH1cbmZ1bmN0aW9uIG4oYixhLGUpe2U9ZT9lOm5ldyBTZXQ7Zm9yKHZhciBjPWI7Yzspe2lmKGMubm9kZVR5cGU9PT1Ob2RlLkVMRU1FTlRfTk9ERSl7dmFyIGQ9YzthKGQpO3ZhciBoPWQubG9jYWxOYW1lO2lmKFwibGlua1wiPT09aCYmXCJpbXBvcnRcIj09PWQuZ2V0QXR0cmlidXRlKFwicmVsXCIpKXtjPWQuaW1wb3J0O2lmKGMgaW5zdGFuY2VvZiBOb2RlJiYhZS5oYXMoYykpZm9yKGUuYWRkKGMpLGM9Yy5maXJzdENoaWxkO2M7Yz1jLm5leHRTaWJsaW5nKW4oYyxhLGUpO2M9bShiLGQpO2NvbnRpbnVlfWVsc2UgaWYoXCJ0ZW1wbGF0ZVwiPT09aCl7Yz1tKGIsZCk7Y29udGludWV9aWYoZD1kLl9fQ0Vfc2hhZG93Um9vdClmb3IoZD1kLmZpcnN0Q2hpbGQ7ZDtkPWQubmV4dFNpYmxpbmcpbihkLGEsZSl9Yz1jLmZpcnN0Q2hpbGQ/Yy5maXJzdENoaWxkOm0oYixjKX19ZnVuY3Rpb24gcShiLGEsZSl7YlthXT1lfTtmdW5jdGlvbiByKCl7dGhpcy5hPW5ldyBNYXA7dGhpcy5mPW5ldyBNYXA7dGhpcy5jPVtdO3RoaXMuYj0hMX1mdW5jdGlvbiBiYShiLGEsZSl7Yi5hLnNldChhLGUpO2IuZi5zZXQoZS5jb25zdHJ1Y3RvcixlKX1mdW5jdGlvbiB0KGIsYSl7Yi5iPSEwO2IuYy5wdXNoKGEpfWZ1bmN0aW9uIHYoYixhKXtiLmImJm4oYSxmdW5jdGlvbihhKXtyZXR1cm4gdyhiLGEpfSl9ZnVuY3Rpb24gdyhiLGEpe2lmKGIuYiYmIWEuX19DRV9wYXRjaGVkKXthLl9fQ0VfcGF0Y2hlZD0hMDtmb3IodmFyIGU9MDtlPGIuYy5sZW5ndGg7ZSsrKWIuY1tlXShhKX19ZnVuY3Rpb24geChiLGEpe3ZhciBlPVtdO24oYSxmdW5jdGlvbihiKXtyZXR1cm4gZS5wdXNoKGIpfSk7Zm9yKGE9MDthPGUubGVuZ3RoO2ErKyl7dmFyIGM9ZVthXTsxPT09Yy5fX0NFX3N0YXRlP2IuY29ubmVjdGVkQ2FsbGJhY2soYyk6eShiLGMpfX1cbmZ1bmN0aW9uIHooYixhKXt2YXIgZT1bXTtuKGEsZnVuY3Rpb24oYil7cmV0dXJuIGUucHVzaChiKX0pO2ZvcihhPTA7YTxlLmxlbmd0aDthKyspe3ZhciBjPWVbYV07MT09PWMuX19DRV9zdGF0ZSYmYi5kaXNjb25uZWN0ZWRDYWxsYmFjayhjKX19XG5mdW5jdGlvbiBBKGIsYSxlKXtlPWU/ZTpuZXcgU2V0O3ZhciBjPVtdO24oYSxmdW5jdGlvbihkKXtpZihcImxpbmtcIj09PWQubG9jYWxOYW1lJiZcImltcG9ydFwiPT09ZC5nZXRBdHRyaWJ1dGUoXCJyZWxcIikpe3ZhciBhPWQuaW1wb3J0O2EgaW5zdGFuY2VvZiBOb2RlJiZcImNvbXBsZXRlXCI9PT1hLnJlYWR5U3RhdGU/KGEuX19DRV9pc0ltcG9ydERvY3VtZW50PSEwLGEuX19DRV9oYXNSZWdpc3RyeT0hMCk6ZC5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLGZ1bmN0aW9uKCl7dmFyIGE9ZC5pbXBvcnQ7YS5fX0NFX2RvY3VtZW50TG9hZEhhbmRsZWR8fChhLl9fQ0VfZG9jdW1lbnRMb2FkSGFuZGxlZD0hMCxhLl9fQ0VfaXNJbXBvcnREb2N1bWVudD0hMCxhLl9fQ0VfaGFzUmVnaXN0cnk9ITAsbmV3IFNldChlKSxlLmRlbGV0ZShhKSxBKGIsYSxlKSl9KX1lbHNlIGMucHVzaChkKX0sZSk7aWYoYi5iKWZvcihhPTA7YTxjLmxlbmd0aDthKyspdyhiLGNbYV0pO2ZvcihhPTA7YTxjLmxlbmd0aDthKyspeShiLFxuY1thXSl9XG5mdW5jdGlvbiB5KGIsYSl7aWYodm9pZCAwPT09YS5fX0NFX3N0YXRlKXt2YXIgZT1iLmEuZ2V0KGEubG9jYWxOYW1lKTtpZihlKXtlLmNvbnN0cnVjdGlvblN0YWNrLnB1c2goYSk7dmFyIGM9ZS5jb25zdHJ1Y3Rvcjt0cnl7dHJ5e2lmKG5ldyBjIT09YSl0aHJvdyBFcnJvcihcIlRoZSBjdXN0b20gZWxlbWVudCBjb25zdHJ1Y3RvciBkaWQgbm90IHByb2R1Y2UgdGhlIGVsZW1lbnQgYmVpbmcgdXBncmFkZWQuXCIpO31maW5hbGx5e2UuY29uc3RydWN0aW9uU3RhY2sucG9wKCl9fWNhdGNoKGYpe3Rocm93IGEuX19DRV9zdGF0ZT0yLGY7fWEuX19DRV9zdGF0ZT0xO2EuX19DRV9kZWZpbml0aW9uPWU7aWYoZS5hdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2spZm9yKGU9ZS5vYnNlcnZlZEF0dHJpYnV0ZXMsYz0wO2M8ZS5sZW5ndGg7YysrKXt2YXIgZD1lW2NdLGg9YS5nZXRBdHRyaWJ1dGUoZCk7bnVsbCE9PWgmJmIuYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrKGEsZCxudWxsLGgsbnVsbCl9bChhKSYmYi5jb25uZWN0ZWRDYWxsYmFjayhhKX19fVxuci5wcm90b3R5cGUuY29ubmVjdGVkQ2FsbGJhY2s9ZnVuY3Rpb24oYil7dmFyIGE9Yi5fX0NFX2RlZmluaXRpb247YS5jb25uZWN0ZWRDYWxsYmFjayYmYS5jb25uZWN0ZWRDYWxsYmFjay5jYWxsKGIpfTtyLnByb3RvdHlwZS5kaXNjb25uZWN0ZWRDYWxsYmFjaz1mdW5jdGlvbihiKXt2YXIgYT1iLl9fQ0VfZGVmaW5pdGlvbjthLmRpc2Nvbm5lY3RlZENhbGxiYWNrJiZhLmRpc2Nvbm5lY3RlZENhbGxiYWNrLmNhbGwoYil9O3IucHJvdG90eXBlLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjaz1mdW5jdGlvbihiLGEsZSxjLGQpe3ZhciBoPWIuX19DRV9kZWZpbml0aW9uO2guYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrJiYtMTxoLm9ic2VydmVkQXR0cmlidXRlcy5pbmRleE9mKGEpJiZoLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjay5jYWxsKGIsYSxlLGMsZCl9O2Z1bmN0aW9uIEIoYixhKXt0aGlzLmM9Yjt0aGlzLmE9YTt0aGlzLmI9dm9pZCAwO0EodGhpcy5jLHRoaXMuYSk7XCJsb2FkaW5nXCI9PT10aGlzLmEucmVhZHlTdGF0ZSYmKHRoaXMuYj1uZXcgTXV0YXRpb25PYnNlcnZlcih0aGlzLmYuYmluZCh0aGlzKSksdGhpcy5iLm9ic2VydmUodGhpcy5hLHtjaGlsZExpc3Q6ITAsc3VidHJlZTohMH0pKX1mdW5jdGlvbiBDKGIpe2IuYiYmYi5iLmRpc2Nvbm5lY3QoKX1CLnByb3RvdHlwZS5mPWZ1bmN0aW9uKGIpe3ZhciBhPXRoaXMuYS5yZWFkeVN0YXRlO1wiaW50ZXJhY3RpdmVcIiE9PWEmJlwiY29tcGxldGVcIiE9PWF8fEModGhpcyk7Zm9yKGE9MDthPGIubGVuZ3RoO2ErKylmb3IodmFyIGU9YlthXS5hZGRlZE5vZGVzLGM9MDtjPGUubGVuZ3RoO2MrKylBKHRoaXMuYyxlW2NdKX07ZnVuY3Rpb24gY2EoKXt2YXIgYj10aGlzO3RoaXMuYj10aGlzLmE9dm9pZCAwO3RoaXMuYz1uZXcgUHJvbWlzZShmdW5jdGlvbihhKXtiLmI9YTtiLmEmJmEoYi5hKX0pfWZ1bmN0aW9uIEQoYil7aWYoYi5hKXRocm93IEVycm9yKFwiQWxyZWFkeSByZXNvbHZlZC5cIik7Yi5hPXZvaWQgMDtiLmImJmIuYih2b2lkIDApfTtmdW5jdGlvbiBFKGIpe3RoaXMuZj0hMTt0aGlzLmE9Yjt0aGlzLmg9bmV3IE1hcDt0aGlzLmc9ZnVuY3Rpb24oYil7cmV0dXJuIGIoKX07dGhpcy5iPSExO3RoaXMuYz1bXTt0aGlzLmo9bmV3IEIoYixkb2N1bWVudCl9XG5FLnByb3RvdHlwZS5sPWZ1bmN0aW9uKGIsYSl7dmFyIGU9dGhpcztpZighKGEgaW5zdGFuY2VvZiBGdW5jdGlvbikpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkN1c3RvbSBlbGVtZW50IGNvbnN0cnVjdG9ycyBtdXN0IGJlIGZ1bmN0aW9ucy5cIik7aWYoIWsoYikpdGhyb3cgbmV3IFN5bnRheEVycm9yKFwiVGhlIGVsZW1lbnQgbmFtZSAnXCIrYitcIicgaXMgbm90IHZhbGlkLlwiKTtpZih0aGlzLmEuYS5nZXQoYikpdGhyb3cgRXJyb3IoXCJBIGN1c3RvbSBlbGVtZW50IHdpdGggbmFtZSAnXCIrYitcIicgaGFzIGFscmVhZHkgYmVlbiBkZWZpbmVkLlwiKTtpZih0aGlzLmYpdGhyb3cgRXJyb3IoXCJBIGN1c3RvbSBlbGVtZW50IGlzIGFscmVhZHkgYmVpbmcgZGVmaW5lZC5cIik7dGhpcy5mPSEwO3ZhciBjLGQsaCxmLHU7dHJ5e3ZhciBwPWZ1bmN0aW9uKGIpe3ZhciBhPVBbYl07aWYodm9pZCAwIT09YSYmIShhIGluc3RhbmNlb2YgRnVuY3Rpb24pKXRocm93IEVycm9yKFwiVGhlICdcIitiK1wiJyBjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24uXCIpO1xucmV0dXJuIGF9LFA9YS5wcm90b3R5cGU7aWYoIShQIGluc3RhbmNlb2YgT2JqZWN0KSl0aHJvdyBuZXcgVHlwZUVycm9yKFwiVGhlIGN1c3RvbSBlbGVtZW50IGNvbnN0cnVjdG9yJ3MgcHJvdG90eXBlIGlzIG5vdCBhbiBvYmplY3QuXCIpO2M9cChcImNvbm5lY3RlZENhbGxiYWNrXCIpO2Q9cChcImRpc2Nvbm5lY3RlZENhbGxiYWNrXCIpO2g9cChcImFkb3B0ZWRDYWxsYmFja1wiKTtmPXAoXCJhdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2tcIik7dT1hLm9ic2VydmVkQXR0cmlidXRlc3x8W119Y2F0Y2godmEpe3JldHVybn1maW5hbGx5e3RoaXMuZj0hMX1iYSh0aGlzLmEsYix7bG9jYWxOYW1lOmIsY29uc3RydWN0b3I6YSxjb25uZWN0ZWRDYWxsYmFjazpjLGRpc2Nvbm5lY3RlZENhbGxiYWNrOmQsYWRvcHRlZENhbGxiYWNrOmgsYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrOmYsb2JzZXJ2ZWRBdHRyaWJ1dGVzOnUsY29uc3RydWN0aW9uU3RhY2s6W119KTt0aGlzLmMucHVzaChiKTt0aGlzLmJ8fCh0aGlzLmI9XG4hMCx0aGlzLmcoZnVuY3Rpb24oKXtpZighMSE9PWUuYilmb3IoZS5iPSExLEEoZS5hLGRvY3VtZW50KTswPGUuYy5sZW5ndGg7KXt2YXIgYj1lLmMuc2hpZnQoKTsoYj1lLmguZ2V0KGIpKSYmRChiKX19KSl9O0UucHJvdG90eXBlLmdldD1mdW5jdGlvbihiKXtpZihiPXRoaXMuYS5hLmdldChiKSlyZXR1cm4gYi5jb25zdHJ1Y3Rvcn07RS5wcm90b3R5cGUubz1mdW5jdGlvbihiKXtpZighayhiKSlyZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IFN5bnRheEVycm9yKFwiJ1wiK2IrXCInIGlzIG5vdCBhIHZhbGlkIGN1c3RvbSBlbGVtZW50IG5hbWUuXCIpKTt2YXIgYT10aGlzLmguZ2V0KGIpO2lmKGEpcmV0dXJuIGEuYzthPW5ldyBjYTt0aGlzLmguc2V0KGIsYSk7dGhpcy5hLmEuZ2V0KGIpJiYtMT09PXRoaXMuYy5pbmRleE9mKGIpJiZEKGEpO3JldHVybiBhLmN9O0UucHJvdG90eXBlLm09ZnVuY3Rpb24oYil7Qyh0aGlzLmopO3ZhciBhPXRoaXMuZzt0aGlzLmc9ZnVuY3Rpb24oZSl7cmV0dXJuIGIoZnVuY3Rpb24oKXtyZXR1cm4gYShlKX0pfX07XG53aW5kb3cuQ3VzdG9tRWxlbWVudFJlZ2lzdHJ5PUU7RS5wcm90b3R5cGUuZGVmaW5lPUUucHJvdG90eXBlLmw7RS5wcm90b3R5cGUuZ2V0PUUucHJvdG90eXBlLmdldDtFLnByb3RvdHlwZS53aGVuRGVmaW5lZD1FLnByb3RvdHlwZS5vO0UucHJvdG90eXBlLnBvbHlmaWxsV3JhcEZsdXNoQ2FsbGJhY2s9RS5wcm90b3R5cGUubTt2YXIgRj13aW5kb3cuRG9jdW1lbnQucHJvdG90eXBlLmNyZWF0ZUVsZW1lbnQsZGE9d2luZG93LkRvY3VtZW50LnByb3RvdHlwZS5jcmVhdGVFbGVtZW50TlMsZWE9d2luZG93LkRvY3VtZW50LnByb3RvdHlwZS5pbXBvcnROb2RlLGZhPXdpbmRvdy5Eb2N1bWVudC5wcm90b3R5cGUucHJlcGVuZCxnYT13aW5kb3cuRG9jdW1lbnQucHJvdG90eXBlLmFwcGVuZCxHPXdpbmRvdy5Ob2RlLnByb3RvdHlwZS5jbG9uZU5vZGUsSD13aW5kb3cuTm9kZS5wcm90b3R5cGUuYXBwZW5kQ2hpbGQsST13aW5kb3cuTm9kZS5wcm90b3R5cGUuaW5zZXJ0QmVmb3JlLEo9d2luZG93Lk5vZGUucHJvdG90eXBlLnJlbW92ZUNoaWxkLEs9d2luZG93Lk5vZGUucHJvdG90eXBlLnJlcGxhY2VDaGlsZCxMPU9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iod2luZG93Lk5vZGUucHJvdG90eXBlLFwidGV4dENvbnRlbnRcIiksTT13aW5kb3cuRWxlbWVudC5wcm90b3R5cGUuYXR0YWNoU2hhZG93LE49T2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih3aW5kb3cuRWxlbWVudC5wcm90b3R5cGUsXG5cImlubmVySFRNTFwiKSxPPXdpbmRvdy5FbGVtZW50LnByb3RvdHlwZS5nZXRBdHRyaWJ1dGUsUT13aW5kb3cuRWxlbWVudC5wcm90b3R5cGUuc2V0QXR0cmlidXRlLFI9d2luZG93LkVsZW1lbnQucHJvdG90eXBlLnJlbW92ZUF0dHJpYnV0ZSxTPXdpbmRvdy5FbGVtZW50LnByb3RvdHlwZS5nZXRBdHRyaWJ1dGVOUyxUPXdpbmRvdy5FbGVtZW50LnByb3RvdHlwZS5zZXRBdHRyaWJ1dGVOUyxVPXdpbmRvdy5FbGVtZW50LnByb3RvdHlwZS5yZW1vdmVBdHRyaWJ1dGVOUyxWPXdpbmRvdy5FbGVtZW50LnByb3RvdHlwZS5pbnNlcnRBZGphY2VudEVsZW1lbnQsaGE9d2luZG93LkVsZW1lbnQucHJvdG90eXBlLnByZXBlbmQsaWE9d2luZG93LkVsZW1lbnQucHJvdG90eXBlLmFwcGVuZCxqYT13aW5kb3cuRWxlbWVudC5wcm90b3R5cGUuYmVmb3JlLGthPXdpbmRvdy5FbGVtZW50LnByb3RvdHlwZS5hZnRlcixsYT13aW5kb3cuRWxlbWVudC5wcm90b3R5cGUucmVwbGFjZVdpdGgsbWE9d2luZG93LkVsZW1lbnQucHJvdG90eXBlLnJlbW92ZSxcbm5hPXdpbmRvdy5IVE1MRWxlbWVudCxXPU9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iod2luZG93LkhUTUxFbGVtZW50LnByb3RvdHlwZSxcImlubmVySFRNTFwiKSxYPXdpbmRvdy5IVE1MRWxlbWVudC5wcm90b3R5cGUuaW5zZXJ0QWRqYWNlbnRFbGVtZW50O2Z1bmN0aW9uIG9hKCl7dmFyIGI9WTt3aW5kb3cuSFRNTEVsZW1lbnQ9ZnVuY3Rpb24oKXtmdW5jdGlvbiBhKCl7dmFyIGE9dGhpcy5jb25zdHJ1Y3RvcixjPWIuZi5nZXQoYSk7aWYoIWMpdGhyb3cgRXJyb3IoXCJUaGUgY3VzdG9tIGVsZW1lbnQgYmVpbmcgY29uc3RydWN0ZWQgd2FzIG5vdCByZWdpc3RlcmVkIHdpdGggYGN1c3RvbUVsZW1lbnRzYC5cIik7dmFyIGQ9Yy5jb25zdHJ1Y3Rpb25TdGFjaztpZighZC5sZW5ndGgpcmV0dXJuIGQ9Ri5jYWxsKGRvY3VtZW50LGMubG9jYWxOYW1lKSxPYmplY3Quc2V0UHJvdG90eXBlT2YoZCxhLnByb3RvdHlwZSksZC5fX0NFX3N0YXRlPTEsZC5fX0NFX2RlZmluaXRpb249Yyx3KGIsZCksZDt2YXIgYz1kLmxlbmd0aC0xLGg9ZFtjXTtpZihoPT09Zyl0aHJvdyBFcnJvcihcIlRoZSBIVE1MRWxlbWVudCBjb25zdHJ1Y3RvciB3YXMgZWl0aGVyIGNhbGxlZCByZWVudHJhbnRseSBmb3IgdGhpcyBjb25zdHJ1Y3RvciBvciBjYWxsZWQgbXVsdGlwbGUgdGltZXMuXCIpO1xuZFtjXT1nO09iamVjdC5zZXRQcm90b3R5cGVPZihoLGEucHJvdG90eXBlKTt3KGIsaCk7cmV0dXJuIGh9YS5wcm90b3R5cGU9bmEucHJvdG90eXBlO3JldHVybiBhfSgpfTtmdW5jdGlvbiBwYShiLGEsZSl7YS5wcmVwZW5kPWZ1bmN0aW9uKGEpe2Zvcih2YXIgZD1bXSxjPTA7Yzxhcmd1bWVudHMubGVuZ3RoOysrYylkW2MtMF09YXJndW1lbnRzW2NdO2M9ZC5maWx0ZXIoZnVuY3Rpb24oYil7cmV0dXJuIGIgaW5zdGFuY2VvZiBOb2RlJiZsKGIpfSk7ZS5pLmFwcGx5KHRoaXMsZCk7Zm9yKHZhciBmPTA7ZjxjLmxlbmd0aDtmKyspeihiLGNbZl0pO2lmKGwodGhpcykpZm9yKGM9MDtjPGQubGVuZ3RoO2MrKylmPWRbY10sZiBpbnN0YW5jZW9mIEVsZW1lbnQmJngoYixmKX07YS5hcHBlbmQ9ZnVuY3Rpb24oYSl7Zm9yKHZhciBkPVtdLGM9MDtjPGFyZ3VtZW50cy5sZW5ndGg7KytjKWRbYy0wXT1hcmd1bWVudHNbY107Yz1kLmZpbHRlcihmdW5jdGlvbihiKXtyZXR1cm4gYiBpbnN0YW5jZW9mIE5vZGUmJmwoYil9KTtlLmFwcGVuZC5hcHBseSh0aGlzLGQpO2Zvcih2YXIgZj0wO2Y8Yy5sZW5ndGg7ZisrKXooYixjW2ZdKTtpZihsKHRoaXMpKWZvcihjPTA7YzxcbmQubGVuZ3RoO2MrKylmPWRbY10sZiBpbnN0YW5jZW9mIEVsZW1lbnQmJngoYixmKX19O2Z1bmN0aW9uIHFhKCl7dmFyIGI9WTtxKERvY3VtZW50LnByb3RvdHlwZSxcImNyZWF0ZUVsZW1lbnRcIixmdW5jdGlvbihhKXtpZih0aGlzLl9fQ0VfaGFzUmVnaXN0cnkpe3ZhciBlPWIuYS5nZXQoYSk7aWYoZSlyZXR1cm4gbmV3IGUuY29uc3RydWN0b3J9YT1GLmNhbGwodGhpcyxhKTt3KGIsYSk7cmV0dXJuIGF9KTtxKERvY3VtZW50LnByb3RvdHlwZSxcImltcG9ydE5vZGVcIixmdW5jdGlvbihhLGUpe2E9ZWEuY2FsbCh0aGlzLGEsZSk7dGhpcy5fX0NFX2hhc1JlZ2lzdHJ5P0EoYixhKTp2KGIsYSk7cmV0dXJuIGF9KTtxKERvY3VtZW50LnByb3RvdHlwZSxcImNyZWF0ZUVsZW1lbnROU1wiLGZ1bmN0aW9uKGEsZSl7aWYodGhpcy5fX0NFX2hhc1JlZ2lzdHJ5JiYobnVsbD09PWF8fFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbFwiPT09YSkpe3ZhciBjPWIuYS5nZXQoZSk7aWYoYylyZXR1cm4gbmV3IGMuY29uc3RydWN0b3J9YT1kYS5jYWxsKHRoaXMsYSxlKTt3KGIsYSk7cmV0dXJuIGF9KTtcbnBhKGIsRG9jdW1lbnQucHJvdG90eXBlLHtpOmZhLGFwcGVuZDpnYX0pfTtmdW5jdGlvbiByYSgpe3ZhciBiPVk7ZnVuY3Rpb24gYShhLGMpe09iamVjdC5kZWZpbmVQcm9wZXJ0eShhLFwidGV4dENvbnRlbnRcIix7ZW51bWVyYWJsZTpjLmVudW1lcmFibGUsY29uZmlndXJhYmxlOiEwLGdldDpjLmdldCxzZXQ6ZnVuY3Rpb24oYSl7aWYodGhpcy5ub2RlVHlwZT09PU5vZGUuVEVYVF9OT0RFKWMuc2V0LmNhbGwodGhpcyxhKTtlbHNle3ZhciBkPXZvaWQgMDtpZih0aGlzLmZpcnN0Q2hpbGQpe3ZhciBlPXRoaXMuY2hpbGROb2Rlcyx1PWUubGVuZ3RoO2lmKDA8dSYmbCh0aGlzKSlmb3IodmFyIGQ9QXJyYXkodSkscD0wO3A8dTtwKyspZFtwXT1lW3BdfWMuc2V0LmNhbGwodGhpcyxhKTtpZihkKWZvcihhPTA7YTxkLmxlbmd0aDthKyspeihiLGRbYV0pfX19KX1xKE5vZGUucHJvdG90eXBlLFwiaW5zZXJ0QmVmb3JlXCIsZnVuY3Rpb24oYSxjKXtpZihhIGluc3RhbmNlb2YgRG9jdW1lbnRGcmFnbWVudCl7dmFyIGQ9QXJyYXkucHJvdG90eXBlLnNsaWNlLmFwcGx5KGEuY2hpbGROb2Rlcyk7XG5hPUkuY2FsbCh0aGlzLGEsYyk7aWYobCh0aGlzKSlmb3IoYz0wO2M8ZC5sZW5ndGg7YysrKXgoYixkW2NdKTtyZXR1cm4gYX1kPWwoYSk7Yz1JLmNhbGwodGhpcyxhLGMpO2QmJnooYixhKTtsKHRoaXMpJiZ4KGIsYSk7cmV0dXJuIGN9KTtxKE5vZGUucHJvdG90eXBlLFwiYXBwZW5kQ2hpbGRcIixmdW5jdGlvbihhKXtpZihhIGluc3RhbmNlb2YgRG9jdW1lbnRGcmFnbWVudCl7dmFyIGM9QXJyYXkucHJvdG90eXBlLnNsaWNlLmFwcGx5KGEuY2hpbGROb2Rlcyk7YT1ILmNhbGwodGhpcyxhKTtpZihsKHRoaXMpKWZvcih2YXIgZD0wO2Q8Yy5sZW5ndGg7ZCsrKXgoYixjW2RdKTtyZXR1cm4gYX1jPWwoYSk7ZD1ILmNhbGwodGhpcyxhKTtjJiZ6KGIsYSk7bCh0aGlzKSYmeChiLGEpO3JldHVybiBkfSk7cShOb2RlLnByb3RvdHlwZSxcImNsb25lTm9kZVwiLGZ1bmN0aW9uKGEpe2E9Ry5jYWxsKHRoaXMsYSk7dGhpcy5vd25lckRvY3VtZW50Ll9fQ0VfaGFzUmVnaXN0cnk/QShiLGEpOnYoYixhKTtcbnJldHVybiBhfSk7cShOb2RlLnByb3RvdHlwZSxcInJlbW92ZUNoaWxkXCIsZnVuY3Rpb24oYSl7dmFyIGM9bChhKSxkPUouY2FsbCh0aGlzLGEpO2MmJnooYixhKTtyZXR1cm4gZH0pO3EoTm9kZS5wcm90b3R5cGUsXCJyZXBsYWNlQ2hpbGRcIixmdW5jdGlvbihhLGMpe2lmKGEgaW5zdGFuY2VvZiBEb2N1bWVudEZyYWdtZW50KXt2YXIgZD1BcnJheS5wcm90b3R5cGUuc2xpY2UuYXBwbHkoYS5jaGlsZE5vZGVzKTthPUsuY2FsbCh0aGlzLGEsYyk7aWYobCh0aGlzKSlmb3IoeihiLGMpLGM9MDtjPGQubGVuZ3RoO2MrKyl4KGIsZFtjXSk7cmV0dXJuIGF9dmFyIGQ9bChhKSxlPUsuY2FsbCh0aGlzLGEsYyksZj1sKHRoaXMpO2YmJnooYixjKTtkJiZ6KGIsYSk7ZiYmeChiLGEpO3JldHVybiBlfSk7TCYmTC5nZXQ/YShOb2RlLnByb3RvdHlwZSxMKTp0KGIsZnVuY3Rpb24oYil7YShiLHtlbnVtZXJhYmxlOiEwLGNvbmZpZ3VyYWJsZTohMCxnZXQ6ZnVuY3Rpb24oKXtmb3IodmFyIGE9W10sYj1cbjA7Yjx0aGlzLmNoaWxkTm9kZXMubGVuZ3RoO2IrKylhLnB1c2godGhpcy5jaGlsZE5vZGVzW2JdLnRleHRDb250ZW50KTtyZXR1cm4gYS5qb2luKFwiXCIpfSxzZXQ6ZnVuY3Rpb24oYSl7Zm9yKDt0aGlzLmZpcnN0Q2hpbGQ7KUouY2FsbCh0aGlzLHRoaXMuZmlyc3RDaGlsZCk7SC5jYWxsKHRoaXMsZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoYSkpfX0pfSl9O2Z1bmN0aW9uIHNhKGIpe3ZhciBhPUVsZW1lbnQucHJvdG90eXBlO2EuYmVmb3JlPWZ1bmN0aW9uKGEpe2Zvcih2YXIgYz1bXSxkPTA7ZDxhcmd1bWVudHMubGVuZ3RoOysrZCljW2QtMF09YXJndW1lbnRzW2RdO2Q9Yy5maWx0ZXIoZnVuY3Rpb24oYSl7cmV0dXJuIGEgaW5zdGFuY2VvZiBOb2RlJiZsKGEpfSk7amEuYXBwbHkodGhpcyxjKTtmb3IodmFyIGU9MDtlPGQubGVuZ3RoO2UrKyl6KGIsZFtlXSk7aWYobCh0aGlzKSlmb3IoZD0wO2Q8Yy5sZW5ndGg7ZCsrKWU9Y1tkXSxlIGluc3RhbmNlb2YgRWxlbWVudCYmeChiLGUpfTthLmFmdGVyPWZ1bmN0aW9uKGEpe2Zvcih2YXIgYz1bXSxkPTA7ZDxhcmd1bWVudHMubGVuZ3RoOysrZCljW2QtMF09YXJndW1lbnRzW2RdO2Q9Yy5maWx0ZXIoZnVuY3Rpb24oYSl7cmV0dXJuIGEgaW5zdGFuY2VvZiBOb2RlJiZsKGEpfSk7a2EuYXBwbHkodGhpcyxjKTtmb3IodmFyIGU9MDtlPGQubGVuZ3RoO2UrKyl6KGIsZFtlXSk7aWYobCh0aGlzKSlmb3IoZD1cbjA7ZDxjLmxlbmd0aDtkKyspZT1jW2RdLGUgaW5zdGFuY2VvZiBFbGVtZW50JiZ4KGIsZSl9O2EucmVwbGFjZVdpdGg9ZnVuY3Rpb24oYSl7Zm9yKHZhciBjPVtdLGQ9MDtkPGFyZ3VtZW50cy5sZW5ndGg7KytkKWNbZC0wXT1hcmd1bWVudHNbZF07dmFyIGQ9Yy5maWx0ZXIoZnVuY3Rpb24oYSl7cmV0dXJuIGEgaW5zdGFuY2VvZiBOb2RlJiZsKGEpfSksZT1sKHRoaXMpO2xhLmFwcGx5KHRoaXMsYyk7Zm9yKHZhciBmPTA7ZjxkLmxlbmd0aDtmKyspeihiLGRbZl0pO2lmKGUpZm9yKHooYix0aGlzKSxkPTA7ZDxjLmxlbmd0aDtkKyspZT1jW2RdLGUgaW5zdGFuY2VvZiBFbGVtZW50JiZ4KGIsZSl9O2EucmVtb3ZlPWZ1bmN0aW9uKCl7dmFyIGE9bCh0aGlzKTttYS5jYWxsKHRoaXMpO2EmJnooYix0aGlzKX19O2Z1bmN0aW9uIHRhKCl7dmFyIGI9WTtmdW5jdGlvbiBhKGEsYyl7T2JqZWN0LmRlZmluZVByb3BlcnR5KGEsXCJpbm5lckhUTUxcIix7ZW51bWVyYWJsZTpjLmVudW1lcmFibGUsY29uZmlndXJhYmxlOiEwLGdldDpjLmdldCxzZXQ6ZnVuY3Rpb24oYSl7dmFyIGQ9dGhpcyxlPXZvaWQgMDtsKHRoaXMpJiYoZT1bXSxuKHRoaXMsZnVuY3Rpb24oYSl7YSE9PWQmJmUucHVzaChhKX0pKTtjLnNldC5jYWxsKHRoaXMsYSk7aWYoZSlmb3IodmFyIGY9MDtmPGUubGVuZ3RoO2YrKyl7dmFyIGg9ZVtmXTsxPT09aC5fX0NFX3N0YXRlJiZiLmRpc2Nvbm5lY3RlZENhbGxiYWNrKGgpfXRoaXMub3duZXJEb2N1bWVudC5fX0NFX2hhc1JlZ2lzdHJ5P0EoYix0aGlzKTp2KGIsdGhpcyk7cmV0dXJuIGF9fSl9ZnVuY3Rpb24gZShhLGMpe3EoYSxcImluc2VydEFkamFjZW50RWxlbWVudFwiLGZ1bmN0aW9uKGEsZCl7dmFyIGU9bChkKTthPWMuY2FsbCh0aGlzLGEsZCk7ZSYmeihiLGQpO2woYSkmJngoYixkKTtcbnJldHVybiBhfSl9TT9xKEVsZW1lbnQucHJvdG90eXBlLFwiYXR0YWNoU2hhZG93XCIsZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuX19DRV9zaGFkb3dSb290PWE9TS5jYWxsKHRoaXMsYSl9KTpjb25zb2xlLndhcm4oXCJDdXN0b20gRWxlbWVudHM6IGBFbGVtZW50I2F0dGFjaFNoYWRvd2Agd2FzIG5vdCBwYXRjaGVkLlwiKTtpZihOJiZOLmdldClhKEVsZW1lbnQucHJvdG90eXBlLE4pO2Vsc2UgaWYoVyYmVy5nZXQpYShIVE1MRWxlbWVudC5wcm90b3R5cGUsVyk7ZWxzZXt2YXIgYz1GLmNhbGwoZG9jdW1lbnQsXCJkaXZcIik7dChiLGZ1bmN0aW9uKGIpe2EoYix7ZW51bWVyYWJsZTohMCxjb25maWd1cmFibGU6ITAsZ2V0OmZ1bmN0aW9uKCl7cmV0dXJuIEcuY2FsbCh0aGlzLCEwKS5pbm5lckhUTUx9LHNldDpmdW5jdGlvbihhKXt2YXIgYj1cInRlbXBsYXRlXCI9PT10aGlzLmxvY2FsTmFtZT90aGlzLmNvbnRlbnQ6dGhpcztmb3IoYy5pbm5lckhUTUw9YTswPGIuY2hpbGROb2Rlcy5sZW5ndGg7KUouY2FsbChiLFxuYi5jaGlsZE5vZGVzWzBdKTtmb3IoOzA8Yy5jaGlsZE5vZGVzLmxlbmd0aDspSC5jYWxsKGIsYy5jaGlsZE5vZGVzWzBdKX19KX0pfXEoRWxlbWVudC5wcm90b3R5cGUsXCJzZXRBdHRyaWJ1dGVcIixmdW5jdGlvbihhLGMpe2lmKDEhPT10aGlzLl9fQ0Vfc3RhdGUpcmV0dXJuIFEuY2FsbCh0aGlzLGEsYyk7dmFyIGQ9Ty5jYWxsKHRoaXMsYSk7US5jYWxsKHRoaXMsYSxjKTtjPU8uY2FsbCh0aGlzLGEpO2QhPT1jJiZiLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayh0aGlzLGEsZCxjLG51bGwpfSk7cShFbGVtZW50LnByb3RvdHlwZSxcInNldEF0dHJpYnV0ZU5TXCIsZnVuY3Rpb24oYSxjLGUpe2lmKDEhPT10aGlzLl9fQ0Vfc3RhdGUpcmV0dXJuIFQuY2FsbCh0aGlzLGEsYyxlKTt2YXIgZD1TLmNhbGwodGhpcyxhLGMpO1QuY2FsbCh0aGlzLGEsYyxlKTtlPVMuY2FsbCh0aGlzLGEsYyk7ZCE9PWUmJmIuYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrKHRoaXMsYyxkLGUsYSl9KTtxKEVsZW1lbnQucHJvdG90eXBlLFxuXCJyZW1vdmVBdHRyaWJ1dGVcIixmdW5jdGlvbihhKXtpZigxIT09dGhpcy5fX0NFX3N0YXRlKXJldHVybiBSLmNhbGwodGhpcyxhKTt2YXIgYz1PLmNhbGwodGhpcyxhKTtSLmNhbGwodGhpcyxhKTtudWxsIT09YyYmYi5hdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2sodGhpcyxhLGMsbnVsbCxudWxsKX0pO3EoRWxlbWVudC5wcm90b3R5cGUsXCJyZW1vdmVBdHRyaWJ1dGVOU1wiLGZ1bmN0aW9uKGEsYyl7aWYoMSE9PXRoaXMuX19DRV9zdGF0ZSlyZXR1cm4gVS5jYWxsKHRoaXMsYSxjKTt2YXIgZD1TLmNhbGwodGhpcyxhLGMpO1UuY2FsbCh0aGlzLGEsYyk7dmFyIGU9Uy5jYWxsKHRoaXMsYSxjKTtkIT09ZSYmYi5hdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2sodGhpcyxjLGQsZSxhKX0pO1g/ZShIVE1MRWxlbWVudC5wcm90b3R5cGUsWCk6Vj9lKEVsZW1lbnQucHJvdG90eXBlLFYpOmNvbnNvbGUud2FybihcIkN1c3RvbSBFbGVtZW50czogYEVsZW1lbnQjaW5zZXJ0QWRqYWNlbnRFbGVtZW50YCB3YXMgbm90IHBhdGNoZWQuXCIpO1xucGEoYixFbGVtZW50LnByb3RvdHlwZSx7aTpoYSxhcHBlbmQ6aWF9KTtzYShiKX07XG52YXIgWj13aW5kb3cuY3VzdG9tRWxlbWVudHM7aWYoIVp8fFouZm9yY2VQb2x5ZmlsbHx8XCJmdW5jdGlvblwiIT10eXBlb2YgWi5kZWZpbmV8fFwiZnVuY3Rpb25cIiE9dHlwZW9mIFouZ2V0KXt2YXIgWT1uZXcgcjtvYSgpO3FhKCk7cmEoKTt0YSgpO2RvY3VtZW50Ll9fQ0VfaGFzUmVnaXN0cnk9ITA7dmFyIHVhPW5ldyBFKFkpO09iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3csXCJjdXN0b21FbGVtZW50c1wiLHtjb25maWd1cmFibGU6ITAsZW51bWVyYWJsZTohMCx2YWx1ZTp1YX0pfTtcbn0pLmNhbGwoc2VsZik7XG59XG4vLyBAbGljZW5zZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG5cblxuZnVuY3Rpb24gcHJvbWlzZVBvbHlmaWxsICgpIHtcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS90YXlsb3JoYWtlcy9wcm9taXNlLXBvbHlmaWxsL2Jsb2IvbWFzdGVyL3Byb21pc2UuanNcbnZhciBzZXRUaW1lb3V0RnVuYyA9IHNldFRpbWVvdXQ7XG5mdW5jdGlvbiBub29wKCkge31cbmZ1bmN0aW9uIGJpbmQoZm4sIHRoaXNBcmcpIHtcbnJldHVybiBmdW5jdGlvbiAoKSB7XG5mbi5hcHBseSh0aGlzQXJnLCBhcmd1bWVudHMpO1xufTtcbn1cbmZ1bmN0aW9uIFByb21pc2UoZm4pIHtcbmlmICh0eXBlb2YgdGhpcyAhPT0gJ29iamVjdCcpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Byb21pc2VzIG11c3QgYmUgY29uc3RydWN0ZWQgdmlhIG5ldycpO1xuaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykgdGhyb3cgbmV3IFR5cGVFcnJvcignbm90IGEgZnVuY3Rpb24nKTtcbnRoaXMuX3N0YXRlID0gMDtcbnRoaXMuX2hhbmRsZWQgPSBmYWxzZTtcbnRoaXMuX3ZhbHVlID0gdW5kZWZpbmVkO1xudGhpcy5fZGVmZXJyZWRzID0gW107XG5cbmRvUmVzb2x2ZShmbiwgdGhpcyk7XG59XG5mdW5jdGlvbiBoYW5kbGUoc2VsZiwgZGVmZXJyZWQpIHtcbndoaWxlIChzZWxmLl9zdGF0ZSA9PT0gMykge1xuc2VsZiA9IHNlbGYuX3ZhbHVlO1xufVxuaWYgKHNlbGYuX3N0YXRlID09PSAwKSB7XG5zZWxmLl9kZWZlcnJlZHMucHVzaChkZWZlcnJlZCk7XG5yZXR1cm47XG59XG5zZWxmLl9oYW5kbGVkID0gdHJ1ZTtcblByb21pc2UuX2ltbWVkaWF0ZUZuKGZ1bmN0aW9uICgpIHtcbnZhciBjYiA9IHNlbGYuX3N0YXRlID09PSAxID8gZGVmZXJyZWQub25GdWxmaWxsZWQgOiBkZWZlcnJlZC5vblJlamVjdGVkO1xuaWYgKGNiID09PSBudWxsKSB7XG4oc2VsZi5fc3RhdGUgPT09IDEgPyByZXNvbHZlIDogcmVqZWN0KShkZWZlcnJlZC5wcm9taXNlLCBzZWxmLl92YWx1ZSk7XG5yZXR1cm47XG59XG52YXIgcmV0O1xudHJ5IHtcbnJldCA9IGNiKHNlbGYuX3ZhbHVlKTtcbn0gY2F0Y2ggKGUpIHtcbnJlamVjdChkZWZlcnJlZC5wcm9taXNlLCBlKTtcbnJldHVybjtcbn1cbnJlc29sdmUoZGVmZXJyZWQucHJvbWlzZSwgcmV0KTtcbn0pO1xufVxuZnVuY3Rpb24gcmVzb2x2ZShzZWxmLCBuZXdWYWx1ZSkge1xudHJ5IHtcbi8vIFByb21pc2UgUmVzb2x1dGlvbiBQcm9jZWR1cmU6IGh0dHBzOi8vZ2l0aHViLmNvbS9wcm9taXNlcy1hcGx1cy9wcm9taXNlcy1zcGVjI3RoZS1wcm9taXNlLXJlc29sdXRpb24tcHJvY2VkdXJlXG5pZiAobmV3VmFsdWUgPT09IHNlbGYpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0EgcHJvbWlzZSBjYW5ub3QgYmUgcmVzb2x2ZWQgd2l0aCBpdHNlbGYuJyk7XG5pZiAobmV3VmFsdWUgJiYgKHR5cGVvZiBuZXdWYWx1ZSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIG5ld1ZhbHVlID09PSAnZnVuY3Rpb24nKSkge1xudmFyIHRoZW4gPSBuZXdWYWx1ZS50aGVuO1xuaWYgKG5ld1ZhbHVlIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuc2VsZi5fc3RhdGUgPSAzO1xuc2VsZi5fdmFsdWUgPSBuZXdWYWx1ZTtcbmZpbmFsZShzZWxmKTtcbnJldHVybjtcbn0gZWxzZSBpZiAodHlwZW9mIHRoZW4gPT09ICdmdW5jdGlvbicpIHtcbmRvUmVzb2x2ZShiaW5kKHRoZW4sIG5ld1ZhbHVlKSwgc2VsZik7XG5yZXR1cm47XG59XG59XG5zZWxmLl9zdGF0ZSA9IDE7XG5zZWxmLl92YWx1ZSA9IG5ld1ZhbHVlO1xuZmluYWxlKHNlbGYpO1xufSBjYXRjaCAoZSkge1xucmVqZWN0KHNlbGYsIGUpO1xufVxufVxuZnVuY3Rpb24gcmVqZWN0KHNlbGYsIG5ld1ZhbHVlKSB7XG5zZWxmLl9zdGF0ZSA9IDI7XG5zZWxmLl92YWx1ZSA9IG5ld1ZhbHVlO1xuZmluYWxlKHNlbGYpO1xufVxuZnVuY3Rpb24gZmluYWxlKHNlbGYpIHtcbmlmIChzZWxmLl9zdGF0ZSA9PT0gMiAmJiBzZWxmLl9kZWZlcnJlZHMubGVuZ3RoID09PSAwKSB7XG5Qcm9taXNlLl9pbW1lZGlhdGVGbihmdW5jdGlvbigpIHtcbmlmICghc2VsZi5faGFuZGxlZCkge1xuUHJvbWlzZS5fdW5oYW5kbGVkUmVqZWN0aW9uRm4oc2VsZi5fdmFsdWUpO1xufVxufSk7XG59XG5cbmZvciAodmFyIGkgPSAwLCBsZW4gPSBzZWxmLl9kZWZlcnJlZHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbmhhbmRsZShzZWxmLCBzZWxmLl9kZWZlcnJlZHNbaV0pO1xufVxuc2VsZi5fZGVmZXJyZWRzID0gbnVsbDtcbn1cbmZ1bmN0aW9uIEhhbmRsZXIob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQsIHByb21pc2UpIHtcbnRoaXMub25GdWxmaWxsZWQgPSB0eXBlb2Ygb25GdWxmaWxsZWQgPT09ICdmdW5jdGlvbicgPyBvbkZ1bGZpbGxlZCA6IG51bGw7XG50aGlzLm9uUmVqZWN0ZWQgPSB0eXBlb2Ygb25SZWplY3RlZCA9PT0gJ2Z1bmN0aW9uJyA/IG9uUmVqZWN0ZWQgOiBudWxsO1xudGhpcy5wcm9taXNlID0gcHJvbWlzZTtcbn1cbmZ1bmN0aW9uIGRvUmVzb2x2ZShmbiwgc2VsZikge1xudmFyIGRvbmUgPSBmYWxzZTtcbnRyeSB7XG5mbihmdW5jdGlvbiAodmFsdWUpIHtcbmlmIChkb25lKSByZXR1cm47XG5kb25lID0gdHJ1ZTtcbnJlc29sdmUoc2VsZiwgdmFsdWUpO1xufSwgZnVuY3Rpb24gKHJlYXNvbikge1xuaWYgKGRvbmUpIHJldHVybjtcbmRvbmUgPSB0cnVlO1xucmVqZWN0KHNlbGYsIHJlYXNvbik7XG59KTtcbn0gY2F0Y2ggKGV4KSB7XG5pZiAoZG9uZSkgcmV0dXJuO1xuZG9uZSA9IHRydWU7XG5yZWplY3Qoc2VsZiwgZXgpO1xufVxufVxuUHJvbWlzZS5wcm90b3R5cGVbJ2NhdGNoJ10gPSBmdW5jdGlvbiAob25SZWplY3RlZCkge1xucmV0dXJuIHRoaXMudGhlbihudWxsLCBvblJlamVjdGVkKTtcbn07XG5Qcm9taXNlLnByb3RvdHlwZS50aGVuID0gZnVuY3Rpb24gKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKSB7XG52YXIgcHJvbSA9IG5ldyAodGhpcy5jb25zdHJ1Y3Rvcikobm9vcCk7XG5cbmhhbmRsZSh0aGlzLCBuZXcgSGFuZGxlcihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgcHJvbSkpO1xucmV0dXJuIHByb207XG59O1xuUHJvbWlzZS5hbGwgPSBmdW5jdGlvbiAoYXJyKSB7XG52YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFycik7XG5yZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuaWYgKGFyZ3MubGVuZ3RoID09PSAwKSByZXR1cm4gcmVzb2x2ZShbXSk7XG52YXIgcmVtYWluaW5nID0gYXJncy5sZW5ndGg7XG5cbmZ1bmN0aW9uIHJlcyhpLCB2YWwpIHtcbnRyeSB7XG5pZiAodmFsICYmICh0eXBlb2YgdmFsID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nKSkge1xudmFyIHRoZW4gPSB2YWwudGhlbjtcbmlmICh0eXBlb2YgdGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xudGhlbi5jYWxsKHZhbCwgZnVuY3Rpb24gKHZhbCkge1xucmVzKGksIHZhbCk7XG59LCByZWplY3QpO1xucmV0dXJuO1xufVxufVxuYXJnc1tpXSA9IHZhbDtcbmlmICgtLXJlbWFpbmluZyA9PT0gMCkge1xucmVzb2x2ZShhcmdzKTtcbn1cbn0gY2F0Y2ggKGV4KSB7XG5yZWplY3QoZXgpO1xufVxufVxuXG5mb3IgKHZhciBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbnJlcyhpLCBhcmdzW2ldKTtcbn1cbn0pO1xufTtcblByb21pc2UucmVzb2x2ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUuY29uc3RydWN0b3IgPT09IFByb21pc2UpIHtcbnJldHVybiB2YWx1ZTtcbn1cblxucmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlKSB7XG5yZXNvbHZlKHZhbHVlKTtcbn0pO1xufTtcblByb21pc2UucmVqZWN0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG5yZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xucmVqZWN0KHZhbHVlKTtcbn0pO1xufTtcblByb21pc2UucmFjZSA9IGZ1bmN0aW9uICh2YWx1ZXMpIHtcbnJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5mb3IgKHZhciBpID0gMCwgbGVuID0gdmFsdWVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG52YWx1ZXNbaV0udGhlbihyZXNvbHZlLCByZWplY3QpO1xufVxufSk7XG59O1xuUHJvbWlzZS5faW1tZWRpYXRlRm4gPSAodHlwZW9mIHNldEltbWVkaWF0ZSA9PT0gJ2Z1bmN0aW9uJyAmJiBmdW5jdGlvbiAoZm4pIHsgc2V0SW1tZWRpYXRlKGZuKTsgfSkgfHxcbmZ1bmN0aW9uIChmbikge1xuc2V0VGltZW91dEZ1bmMoZm4sIDApO1xufTtcblByb21pc2UuX3VuaGFuZGxlZFJlamVjdGlvbkZuID0gZnVuY3Rpb24gX3VuaGFuZGxlZFJlamVjdGlvbkZuKGVycikge1xuaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiBjb25zb2xlKSB7XG5jb25zb2xlLndhcm4oJ1Bvc3NpYmxlIFVuaGFuZGxlZCBQcm9taXNlIFJlamVjdGlvbjonLCBlcnIpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbnNvbGVcbn1cbn07XG5Qcm9taXNlLl9zZXRJbW1lZGlhdGVGbiA9IGZ1bmN0aW9uIF9zZXRJbW1lZGlhdGVGbihmbikge1xuUHJvbWlzZS5faW1tZWRpYXRlRm4gPSBmbjtcbn07XG5Qcm9taXNlLl9zZXRVbmhhbmRsZWRSZWplY3Rpb25GbiA9IGZ1bmN0aW9uIF9zZXRVbmhhbmRsZWRSZWplY3Rpb25Gbihmbikge1xuUHJvbWlzZS5fdW5oYW5kbGVkUmVqZWN0aW9uRm4gPSBmbjtcbn07XG5jb25zb2xlLmxvZygnUHJvbWlzZSBwb2x5ZmlsbCcpO1xud2luZG93LlByb21pc2UgPSBQcm9taXNlO1xufVxuIiwiLyogVU1ELmRlZmluZSAqLyAoZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgICBpZiAodHlwZW9mIGN1c3RvbUxvYWRlciA9PT0gJ2Z1bmN0aW9uJyl7IGN1c3RvbUxvYWRlcihmYWN0b3J5LCAnZG9tJyk7IH1lbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHsgZGVmaW5lKFtdLCBmYWN0b3J5KTsgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7IH0gZWxzZSB7IHJvb3QucmV0dXJuRXhwb3J0cyA9IGZhY3RvcnkoKTsgd2luZG93LmRvbSA9IGZhY3RvcnkoKTsgfVxufSh0aGlzLCBmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXJcbiAgICAgICAgaXNGbG9hdCA9IHtcbiAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICB6SW5kZXg6IDEsXG4gICAgICAgICAgICAnei1pbmRleCc6IDFcbiAgICAgICAgfSxcbiAgICAgICAgaXNEaW1lbnNpb24gPSB7XG4gICAgICAgICAgICB3aWR0aDoxLFxuICAgICAgICAgICAgaGVpZ2h0OjEsXG4gICAgICAgICAgICB0b3A6MSxcbiAgICAgICAgICAgIGxlZnQ6MSxcbiAgICAgICAgICAgIHJpZ2h0OjEsXG4gICAgICAgICAgICBib3R0b206MSxcbiAgICAgICAgICAgIG1heFdpZHRoOjEsXG4gICAgICAgICAgICAnbWF4LXdpZHRoJzoxLFxuICAgICAgICAgICAgbWluV2lkdGg6MSxcbiAgICAgICAgICAgICdtaW4td2lkdGgnOjEsXG4gICAgICAgICAgICBtYXhIZWlnaHQ6MSxcbiAgICAgICAgICAgICdtYXgtaGVpZ2h0JzoxXG4gICAgICAgIH0sXG4gICAgICAgIHVpZHMgPSB7fSxcbiAgICAgICAgZGVzdHJveWVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgICBmdW5jdGlvbiB1aWQgKHR5cGUpe1xuICAgICAgICBpZighdWlkc1t0eXBlXSl7XG4gICAgICAgICAgICB1aWRzW3R5cGVdID0gW107XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGlkID0gdHlwZSArICctJyArICh1aWRzW3R5cGVdLmxlbmd0aCArIDEpO1xuICAgICAgICB1aWRzW3R5cGVdLnB1c2goaWQpO1xuICAgICAgICByZXR1cm4gaWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNOb2RlIChpdGVtKXtcbiAgICAgICAgLy8gc2FmZXIgdGVzdCBmb3IgY3VzdG9tIGVsZW1lbnRzIGluIEZGICh3aXRoIHdjIHNoaW0pXG4gICAgICAgIHJldHVybiAhIWl0ZW0gJiYgdHlwZW9mIGl0ZW0gPT09ICdvYmplY3QnICYmIHR5cGVvZiBpdGVtLmlubmVySFRNTCA9PT0gJ3N0cmluZyc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Tm9kZSAoaXRlbSl7XG4gICAgICAgIGlmKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJyl7XG4gICAgICAgICAgICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaXRlbSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYnlJZCAoaWQpe1xuICAgICAgICByZXR1cm4gZ2V0Tm9kZShpZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3R5bGUgKG5vZGUsIHByb3AsIHZhbHVlKXtcbiAgICAgICAgdmFyIGtleSwgY29tcHV0ZWQ7XG4gICAgICAgIGlmKHR5cGVvZiBwcm9wID09PSAnb2JqZWN0Jyl7XG4gICAgICAgICAgICAvLyBvYmplY3Qgc2V0dGVyXG4gICAgICAgICAgICBmb3Ioa2V5IGluIHByb3Ape1xuICAgICAgICAgICAgICAgIGlmKHByb3AuaGFzT3duUHJvcGVydHkoa2V5KSl7XG4gICAgICAgICAgICAgICAgICAgIHN0eWxlKG5vZGUsIGtleSwgcHJvcFtrZXldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfWVsc2UgaWYodmFsdWUgIT09IHVuZGVmaW5lZCl7XG4gICAgICAgICAgICAvLyBwcm9wZXJ0eSBzZXR0ZXJcbiAgICAgICAgICAgIGlmKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgJiYgaXNEaW1lbnNpb25bcHJvcF0pe1xuICAgICAgICAgICAgICAgIHZhbHVlICs9ICdweCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBub2RlLnN0eWxlW3Byb3BdID0gdmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBnZXR0ZXIsIGlmIGEgc2ltcGxlIHN0eWxlXG4gICAgICAgIGlmKG5vZGUuc3R5bGVbcHJvcF0pe1xuICAgICAgICAgICAgaWYoaXNEaW1lbnNpb25bcHJvcF0pe1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUludChub2RlLnN0eWxlW3Byb3BdLCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihpc0Zsb2F0W3Byb3BdKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VGbG9hdChub2RlLnN0eWxlW3Byb3BdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBub2RlLnN0eWxlW3Byb3BdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZ2V0dGVyLCBjb21wdXRlZFxuICAgICAgICBjb21wdXRlZCA9IGdldENvbXB1dGVkU3R5bGUobm9kZSwgcHJvcCk7XG4gICAgICAgIGlmKGNvbXB1dGVkW3Byb3BdKXtcbiAgICAgICAgICAgIGlmKC9cXGQvLnRlc3QoY29tcHV0ZWRbcHJvcF0pKXtcbiAgICAgICAgICAgICAgICBpZighaXNOYU4ocGFyc2VJbnQoY29tcHV0ZWRbcHJvcF0sIDEwKSkpe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoY29tcHV0ZWRbcHJvcF0sIDEwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbXB1dGVkW3Byb3BdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGNvbXB1dGVkW3Byb3BdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhdHRyIChub2RlLCBwcm9wLCB2YWx1ZSl7XG4gICAgICAgIHZhciBrZXk7XG4gICAgICAgIGlmKHR5cGVvZiBwcm9wID09PSAnb2JqZWN0Jyl7XG4gICAgICAgICAgICBmb3Ioa2V5IGluIHByb3Ape1xuICAgICAgICAgICAgICAgIGlmKHByb3AuaGFzT3duUHJvcGVydHkoa2V5KSl7XG4gICAgICAgICAgICAgICAgICAgIGF0dHIobm9kZSwga2V5LCBwcm9wW2tleV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYodmFsdWUgIT09IHVuZGVmaW5lZCl7XG4gICAgICAgICAgICBpZihwcm9wID09PSAndGV4dCcgfHwgcHJvcCA9PT0gJ2h0bWwnIHx8IHByb3AgPT09ICdpbm5lckhUTUwnKSB7XG4gICAgICAgICAgICBcdC8vIGlnbm9yZSwgaGFuZGxlZCBkdXJpbmcgY3JlYXRpb25cblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZihwcm9wID09PSAnY2xhc3NOYW1lJyB8fCBwcm9wID09PSAnY2xhc3MnKSB7XG5cdFx0XHRcdG5vZGUuY2xhc3NOYW1lID0gdmFsdWU7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmKHByb3AgPT09ICdzdHlsZScpIHtcblx0XHRcdFx0c3R5bGUobm9kZSwgdmFsdWUpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZihwcm9wID09PSAnYXR0cicpIHtcbiAgICAgICAgICAgIFx0Ly8gYmFjayBjb21wYXRcblx0XHRcdFx0YXR0cihub2RlLCB2YWx1ZSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpe1xuICAgICAgICAgICAgXHQvLyBvYmplY3QsIGxpa2UgJ2RhdGEnXG5cdFx0XHRcdG5vZGVbcHJvcF0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUocHJvcCwgdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5vZGUuZ2V0QXR0cmlidXRlKHByb3ApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGJveCAobm9kZSl7XG4gICAgICAgIGlmKG5vZGUgPT09IHdpbmRvdyl7XG4gICAgICAgICAgICBub2RlID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICAgICAgICB9XG4gICAgICAgIC8vIG5vZGUgZGltZW5zaW9uc1xuICAgICAgICAvLyByZXR1cm5lZCBvYmplY3QgaXMgaW1tdXRhYmxlXG4gICAgICAgIC8vIGFkZCBzY3JvbGwgcG9zaXRpb25pbmcgYW5kIGNvbnZlbmllbmNlIGFiYnJldmlhdGlvbnNcbiAgICAgICAgdmFyXG4gICAgICAgICAgICBkaW1lbnNpb25zID0gZ2V0Tm9kZShub2RlKS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRvcDogZGltZW5zaW9ucy50b3AsXG4gICAgICAgICAgICByaWdodDogZGltZW5zaW9ucy5yaWdodCxcbiAgICAgICAgICAgIGJvdHRvbTogZGltZW5zaW9ucy5ib3R0b20sXG4gICAgICAgICAgICBsZWZ0OiBkaW1lbnNpb25zLmxlZnQsXG4gICAgICAgICAgICBoZWlnaHQ6IGRpbWVuc2lvbnMuaGVpZ2h0LFxuICAgICAgICAgICAgaDogZGltZW5zaW9ucy5oZWlnaHQsXG4gICAgICAgICAgICB3aWR0aDogZGltZW5zaW9ucy53aWR0aCxcbiAgICAgICAgICAgIHc6IGRpbWVuc2lvbnMud2lkdGgsXG4gICAgICAgICAgICBzY3JvbGxZOiB3aW5kb3cuc2Nyb2xsWSxcbiAgICAgICAgICAgIHNjcm9sbFg6IHdpbmRvdy5zY3JvbGxYLFxuICAgICAgICAgICAgeDogZGltZW5zaW9ucy5sZWZ0ICsgd2luZG93LnBhZ2VYT2Zmc2V0LFxuICAgICAgICAgICAgeTogZGltZW5zaW9ucy50b3AgKyB3aW5kb3cucGFnZVlPZmZzZXRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBxdWVyeSAobm9kZSwgc2VsZWN0b3Ipe1xuICAgICAgICBpZighc2VsZWN0b3Ipe1xuICAgICAgICAgICAgc2VsZWN0b3IgPSBub2RlO1xuICAgICAgICAgICAgbm9kZSA9IGRvY3VtZW50O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBub2RlLnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgIH1cbiAgICBcbiAgICBmdW5jdGlvbiBxdWVyeUFsbCAobm9kZSwgc2VsZWN0b3Ipe1xuICAgICAgICBpZighc2VsZWN0b3Ipe1xuICAgICAgICAgICAgc2VsZWN0b3IgPSBub2RlO1xuICAgICAgICAgICAgbm9kZSA9IGRvY3VtZW50O1xuICAgICAgICB9XG4gICAgICAgIHZhciBub2RlcyA9IG5vZGUucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG5cbiAgICAgICAgaWYoIW5vZGVzLmxlbmd0aCl7IHJldHVybiBbXTsgfVxuXG4gICAgICAgIC8vIGNvbnZlcnQgdG8gQXJyYXkgYW5kIHJldHVybiBpdFxuICAgICAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwobm9kZXMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRvRG9tIChodG1sLCBvcHRpb25zLCBwYXJlbnQpe1xuICAgICAgICB2YXIgbm9kZSA9IGRvbSgnZGl2Jywge2h0bWw6IGh0bWx9KTtcbiAgICAgICAgcGFyZW50ID0gYnlJZChwYXJlbnQgfHwgb3B0aW9ucyk7XG4gICAgICAgIGlmKHBhcmVudCl7XG4gICAgICAgICAgICB3aGlsZShub2RlLmZpcnN0Q2hpbGQpe1xuICAgICAgICAgICAgICAgIHBhcmVudC5hcHBlbmRDaGlsZChub2RlLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG5vZGUuZmlyc3RDaGlsZDtcbiAgICAgICAgfVxuICAgICAgICBpZihodG1sLmluZGV4T2YoJzwnKSAhPT0gMCl7XG4gICAgICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbm9kZS5maXJzdENoaWxkO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZyb21Eb20gKG5vZGUpIHtcbiAgICAgICAgZnVuY3Rpb24gZ2V0QXR0cnMgKG5vZGUpIHtcbiAgICAgICAgICAgIHZhciBhdHQsIGksIGF0dHJzID0ge307XG4gICAgICAgICAgICBmb3IoaSA9IDA7IGkgPCBub2RlLmF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspe1xuICAgICAgICAgICAgICAgIGF0dCA9IG5vZGUuYXR0cmlidXRlc1tpXTtcbiAgICAgICAgICAgICAgICBhdHRyc1thdHQubG9jYWxOYW1lXSA9IG5vcm1hbGl6ZShhdHQudmFsdWUgPT09ICcnID8gdHJ1ZSA6IGF0dC52YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYXR0cnM7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gZ2V0VGV4dCAobm9kZSkge1xuICAgICAgICAgICAgdmFyIGksIHQsIHRleHQgPSAnJztcbiAgICAgICAgICAgIGZvcihpID0gMDsgaSA8IG5vZGUuY2hpbGROb2Rlcy5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICAgICAgdCA9IG5vZGUuY2hpbGROb2Rlc1tpXTtcbiAgICAgICAgICAgICAgICBpZih0Lm5vZGVUeXBlID09PSAzICYmIHQudGV4dENvbnRlbnQudHJpbSgpKXtcbiAgICAgICAgICAgICAgICAgICAgdGV4dCArPSB0LnRleHRDb250ZW50LnRyaW0oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGV4dDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaSwgb2JqZWN0ID0gZ2V0QXR0cnMobm9kZSk7XG4gICAgICAgIG9iamVjdC50ZXh0ID0gZ2V0VGV4dChub2RlKTtcbiAgICAgICAgb2JqZWN0LmNoaWxkcmVuID0gW107XG4gICAgICAgIGlmKG5vZGUuY2hpbGRyZW4ubGVuZ3RoKXtcbiAgICAgICAgICAgIGZvcihpID0gMDsgaSA8IG5vZGUuY2hpbGRyZW4ubGVuZ3RoOyBpKyspe1xuICAgICAgICAgICAgICAgIG9iamVjdC5jaGlsZHJlbi5wdXNoKGZyb21Eb20obm9kZS5jaGlsZHJlbltpXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkQ2hpbGRyZW4gKG5vZGUsIGNoaWxkcmVuKSB7XG4gICAgICAgIGlmKEFycmF5LmlzQXJyYXkoY2hpbGRyZW4pKXtcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICBcdGlmKHR5cGVvZiBjaGlsZHJlbltpXSA9PT0gJ3N0cmluZycpe1xuXHRcdFx0XHRcdG5vZGUuYXBwZW5kQ2hpbGQodG9Eb20oY2hpbGRyZW5baV0pKTtcblx0XHRcdFx0fWVsc2Uge1xuXHRcdFx0XHRcdG5vZGUuYXBwZW5kQ2hpbGQoY2hpbGRyZW5baV0pO1xuXHRcdFx0XHR9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIG5vZGUuYXBwZW5kQ2hpbGQoY2hpbGRyZW4pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkQ29udGVudCAobm9kZSwgb3B0aW9ucykge1xuICAgICAgICB2YXIgaHRtbDtcbiAgICAgICAgaWYob3B0aW9ucy5odG1sICE9PSB1bmRlZmluZWQgfHwgb3B0aW9ucy5pbm5lckhUTUwgIT09IHVuZGVmaW5lZCl7XG4gICAgICAgICAgICBodG1sID0gb3B0aW9ucy5odG1sIHx8IG9wdGlvbnMuaW5uZXJIVE1MIHx8ICcnO1xuICAgICAgICAgICAgaWYodHlwZW9mIGh0bWwgPT09ICdvYmplY3QnKXtcbiAgICAgICAgICAgICAgICBhZGRDaGlsZHJlbihub2RlLCBodG1sKTtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgXHQvLyBjYXJlZnVsIGFzc3VtaW5nIHRleHRDb250ZW50IC1cblx0XHRcdFx0Ly8gbWlzc2VzIHNvbWUgSFRNTCwgc3VjaCBhcyBlbnRpdGllcyAoJm5wc3A7KVxuICAgICAgICAgICAgICAgIG5vZGUuaW5uZXJIVE1MID0gaHRtbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZihvcHRpb25zLnRleHQpe1xuICAgICAgICAgICAgbm9kZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShvcHRpb25zLnRleHQpKTtcbiAgICAgICAgfVxuICAgICAgICBpZihvcHRpb25zLmNoaWxkcmVuKXtcbiAgICAgICAgICAgIGFkZENoaWxkcmVuKG5vZGUsIG9wdGlvbnMuY2hpbGRyZW4pO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIGZ1bmN0aW9uIGRvbSAobm9kZVR5cGUsIG9wdGlvbnMsIHBhcmVudCwgcHJlcGVuZCl7XG5cdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cblx0XHQvLyBpZiBmaXJzdCBhcmd1bWVudCBpcyBhIHN0cmluZyBhbmQgc3RhcnRzIHdpdGggPCwgcGFzcyB0byB0b0RvbSgpXG4gICAgICAgIGlmKG5vZGVUeXBlLmluZGV4T2YoJzwnKSA9PT0gMCl7XG4gICAgICAgICAgICByZXR1cm4gdG9Eb20obm9kZVR5cGUsIG9wdGlvbnMsIHBhcmVudCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQobm9kZVR5cGUpO1xuXG4gICAgICAgIHBhcmVudCA9IGdldE5vZGUocGFyZW50KTtcblxuICAgICAgICBhZGRDb250ZW50KG5vZGUsIG9wdGlvbnMpO1xuXG5cdFx0YXR0cihub2RlLCBvcHRpb25zKTtcblxuICAgICAgICBpZihwYXJlbnQgJiYgaXNOb2RlKHBhcmVudCkpe1xuICAgICAgICAgICAgaWYocHJlcGVuZCAmJiBwYXJlbnQuaGFzQ2hpbGROb2RlcygpKXtcbiAgICAgICAgICAgICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKG5vZGUsIHBhcmVudC5jaGlsZHJlblswXSk7XG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICBwYXJlbnQuYXBwZW5kQ2hpbGQobm9kZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnNlcnRBZnRlciAocmVmTm9kZSwgbm9kZSkge1xuICAgICAgICB2YXIgc2libGluZyA9IHJlZk5vZGUubmV4dEVsZW1lbnRTaWJsaW5nO1xuICAgICAgICBpZighc2libGluZyl7XG4gICAgICAgICAgICByZWZOb2RlLnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQobm9kZSk7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgcmVmTm9kZS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCBzaWJsaW5nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2libGluZztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZXN0cm95IChub2RlKXtcbiAgICAgICAgLy8gZGVzdHJveXMgYSBub2RlIGNvbXBsZXRlbHlcbiAgICAgICAgLy9cbiAgICAgICAgaWYobm9kZSkge1xuICAgICAgICAgICAgZGVzdHJveWVyLmFwcGVuZENoaWxkKG5vZGUpO1xuICAgICAgICAgICAgZGVzdHJveWVyLmlubmVySFRNTCA9ICcnO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYW4gKG5vZGUsIGRpc3Bvc2Upe1xuICAgICAgICAvL1x0UmVtb3ZlcyBhbGwgY2hpbGQgbm9kZXNcbiAgICAgICAgLy9cdFx0ZGlzcG9zZTogZGVzdHJveSBjaGlsZCBub2Rlc1xuICAgICAgICBpZihkaXNwb3NlKXtcbiAgICAgICAgICAgIHdoaWxlKG5vZGUuY2hpbGRyZW4ubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICBkZXN0cm95KG5vZGUuY2hpbGRyZW5bMF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlKG5vZGUuY2hpbGRyZW4ubGVuZ3RoKXtcbiAgICAgICAgICAgIG5vZGUucmVtb3ZlQ2hpbGQobm9kZS5jaGlsZHJlblswXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkb20uY2xhc3NMaXN0ID0ge1xuICAgIFx0Ly8gaW4gYWRkaXRpb24gdG8gZml4aW5nIElFMTEgdG9nZ2xlXG5cdFx0Ly8gdGhlc2UgbWV0aG9kcyBhbHNvIGhhbmRsZSBhcnJheXNcbiAgICAgICAgcmVtb3ZlOiBmdW5jdGlvbiAobm9kZSwgbmFtZXMpe1xuICAgICAgICAgICAgdG9BcnJheShuYW1lcykuZm9yRWFjaChmdW5jdGlvbihuYW1lKXtcbiAgICAgICAgICAgICAgICBub2RlLmNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgYWRkOiBmdW5jdGlvbiAobm9kZSwgbmFtZXMpe1xuICAgICAgICAgICAgdG9BcnJheShuYW1lcykuZm9yRWFjaChmdW5jdGlvbihuYW1lKXtcbiAgICAgICAgICAgICAgICBub2RlLmNsYXNzTGlzdC5hZGQobmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgY29udGFpbnM6IGZ1bmN0aW9uIChub2RlLCBuYW1lcyl7XG4gICAgICAgICAgICByZXR1cm4gdG9BcnJheShuYW1lcykuZXZlcnkoZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZS5jbGFzc0xpc3QuY29udGFpbnMobmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgdG9nZ2xlOiBmdW5jdGlvbiAobm9kZSwgbmFtZXMsIHZhbHVlKXtcbiAgICAgICAgICAgIG5hbWVzID0gdG9BcnJheShuYW1lcyk7XG4gICAgICAgICAgICBpZih0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgLy8gdXNlIHN0YW5kYXJkIGZ1bmN0aW9uYWxpdHksIHN1cHBvcnRlZCBieSBJRVxuICAgICAgICAgICAgICAgIG5hbWVzLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5jbGFzc0xpc3QudG9nZ2xlKG5hbWUsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElFMTEgZG9lcyBub3Qgc3VwcG9ydCB0aGUgc2Vjb25kIHBhcmFtZXRlciAgXG4gICAgICAgICAgICBlbHNlIGlmKHZhbHVlKXtcbiAgICAgICAgICAgICAgICBuYW1lcy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUuY2xhc3NMaXN0LmFkZChuYW1lKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgbmFtZXMuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBub2RlLmNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gdG9BcnJheSAobmFtZXMpe1xuICAgICAgICBpZighbmFtZXMpe1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignZG9tLmNsYXNzTGlzdCBzaG91bGQgaW5jbHVkZSBhIG5vZGUgYW5kIGEgY2xhc3NOYW1lJyk7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5hbWVzLnNwbGl0KCcgJykubWFwKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gbmFtZS50cmltKCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICBmdW5jdGlvbiBub3JtYWxpemUgKHZhbCl7XG4gICAgICAgIGlmKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRpZih2YWwgPT09ICdmYWxzZScpe1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmKHZhbCA9PT0gJ251bGwnKXtcblx0XHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmKHZhbCA9PT0gJ3RydWUnKXtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0XHRpZiAodmFsLmluZGV4T2YoJy8nKSA+IC0xIHx8ICh2YWwubWF0Y2goLy0vZykgfHwgW10pLmxlbmd0aCA+IDEpIHtcblx0XHRcdFx0Ly8gdHlwZSBvZiBkYXRlXG5cdFx0XHRcdHJldHVybiB2YWw7XG5cdFx0XHR9XG5cdFx0fVxuICAgICAgICBpZighaXNOYU4ocGFyc2VGbG9hdCh2YWwpKSl7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VGbG9hdCh2YWwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfVxuXG4gICAgZG9tLm5vcm1hbGl6ZSA9IG5vcm1hbGl6ZTtcbiAgICBkb20uY2xlYW4gPSBjbGVhbjtcbiAgICBkb20ucXVlcnkgPSBxdWVyeTtcbiAgICBkb20ucXVlcnlBbGwgPSBxdWVyeUFsbDtcbiAgICBkb20uYnlJZCA9IGJ5SWQ7XG4gICAgZG9tLmF0dHIgPSBhdHRyO1xuICAgIGRvbS5ib3ggPSBib3g7XG4gICAgZG9tLnN0eWxlID0gc3R5bGU7XG4gICAgZG9tLmRlc3Ryb3kgPSBkZXN0cm95O1xuICAgIGRvbS51aWQgPSB1aWQ7XG4gICAgZG9tLmlzTm9kZSA9IGlzTm9kZTtcbiAgICBkb20udG9Eb20gPSB0b0RvbTtcbiAgICBkb20uZnJvbURvbSA9IGZyb21Eb207XG4gICAgZG9tLmluc2VydEFmdGVyID0gaW5zZXJ0QWZ0ZXI7XG5cbiAgICByZXR1cm4gZG9tO1xufSkpO1xuIiwiKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG5cdGlmICh0eXBlb2YgY3VzdG9tTG9hZGVyID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0Y3VzdG9tTG9hZGVyKGZhY3RvcnksICdvbicpO1xuXHR9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuXHRcdGRlZmluZShbXSwgZmFjdG9yeSk7XG5cdH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG5cdH0gZWxzZSB7XG5cdFx0cm9vdC5yZXR1cm5FeHBvcnRzID0gZmFjdG9yeSgpO1xuXHRcdHdpbmRvdy5vbiA9IGZhY3RvcnkoKTtcblx0fVxufSh0aGlzLCBmdW5jdGlvbiAoKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRmdW5jdGlvbiBoYXNXaGVlbFRlc3QgKCkge1xuXHRcdHZhclxuXHRcdFx0aXNJRSA9IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignVHJpZGVudCcpID4gLTEsXG5cdFx0XHRkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRyZXR1cm4gXCJvbndoZWVsXCIgaW4gZGl2IHx8IFwid2hlZWxcIiBpbiBkaXYgfHxcblx0XHRcdChpc0lFICYmIGRvY3VtZW50LmltcGxlbWVudGF0aW9uLmhhc0ZlYXR1cmUoXCJFdmVudHMud2hlZWxcIiwgXCIzLjBcIikpOyAvLyBJRSBmZWF0dXJlIGRldGVjdGlvblxuXHR9XG5cblx0dmFyXG5cdFx0SU5WQUxJRF9QUk9QUyxcblx0XHRtYXRjaGVzLFxuXHRcdGhhc1doZWVsID0gaGFzV2hlZWxUZXN0KCksXG5cdFx0aXNXaW4gPSBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJ1dpbmRvd3MnKSA+IC0xLFxuXHRcdEZBQ1RPUiA9IGlzV2luID8gMTAgOiAwLjEsXG5cdFx0WExSOCA9IDAsXG5cdFx0bW91c2VXaGVlbEhhbmRsZTtcblxuXG5cdFsnbWF0Y2hlcycsICdtYXRjaGVzU2VsZWN0b3InLCAnd2Via2l0JywgJ21veicsICdtcycsICdvJ10uc29tZShmdW5jdGlvbiAobmFtZSkge1xuXHRcdGlmIChuYW1lLmxlbmd0aCA8IDcpIHsgLy8gcHJlZml4XG5cdFx0XHRuYW1lICs9ICdNYXRjaGVzU2VsZWN0b3InO1xuXHRcdH1cblx0XHRpZiAoRWxlbWVudC5wcm90b3R5cGVbbmFtZV0pIHtcblx0XHRcdG1hdGNoZXMgPSBuYW1lO1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fSk7XG5cblx0ZnVuY3Rpb24gY2xvc2VzdCAoZWxlbWVudCwgc2VsZWN0b3IsIHBhcmVudCkge1xuXHRcdHdoaWxlIChlbGVtZW50KSB7XG5cdFx0XHRpZiAoZWxlbWVudFttYXRjaGVzXSAmJiBlbGVtZW50W21hdGNoZXNdKHNlbGVjdG9yKSkge1xuXHRcdFx0XHRyZXR1cm4gZWxlbWVudDtcblx0XHRcdH1cblx0XHRcdGlmIChlbGVtZW50ID09PSBwYXJlbnQpIHtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRlbGVtZW50ID0gZWxlbWVudC5wYXJlbnRFbGVtZW50O1xuXHRcdH1cblx0XHRyZXR1cm4gbnVsbDtcblx0fVxuXG5cdGZ1bmN0aW9uIGNsb3Nlc3RGaWx0ZXIgKGVsZW1lbnQsIHNlbGVjdG9yKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRyZXR1cm4gY2xvc2VzdChlLnRhcmdldCwgc2VsZWN0b3IsIGVsZW1lbnQpO1xuXHRcdH07XG5cdH1cblxuXHRmdW5jdGlvbiBtYWtlTXVsdGlIYW5kbGUgKGhhbmRsZXMpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVtb3ZlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGhhbmRsZXMuZm9yRWFjaChmdW5jdGlvbiAoaCkge1xuXHRcdFx0XHRcdC8vIGFsbG93IGZvciBhIHNpbXBsZSBmdW5jdGlvbiBpbiB0aGUgbGlzdFxuXHRcdFx0XHRcdGlmIChoLnJlbW92ZSkge1xuXHRcdFx0XHRcdFx0aC5yZW1vdmUoKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHR5cGVvZiBoID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0XHRoKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0aGFuZGxlcyA9IFtdO1xuXHRcdFx0XHR0aGlzLnJlbW92ZSA9IHRoaXMucGF1c2UgPSB0aGlzLnJlc3VtZSA9IGZ1bmN0aW9uICgpIHt9O1xuXHRcdFx0fSxcblx0XHRcdHBhdXNlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGhhbmRsZXMuZm9yRWFjaChmdW5jdGlvbiAoaCkge1xuXHRcdFx0XHRcdGlmIChoLnBhdXNlKSB7XG5cdFx0XHRcdFx0XHRoLnBhdXNlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cdFx0XHRyZXN1bWU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0aGFuZGxlcy5mb3JFYWNoKGZ1bmN0aW9uIChoKSB7XG5cdFx0XHRcdFx0aWYgKGgucmVzdW1lKSB7XG5cdFx0XHRcdFx0XHRoLnJlc3VtZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fTtcblx0fVxuXG5cdGZ1bmN0aW9uIG9uQ2xpY2tvZmYgKG5vZGUsIGNhbGxiYWNrKSB7XG5cdFx0Ly8gaW1wb3J0YW50IG5vdGUhXG5cdFx0Ly8gc3RhcnRzIHBhdXNlZFxuXHRcdC8vXG5cdFx0dmFyXG5cdFx0XHRoYW5kbGUsXG5cdFx0XHRiSGFuZGxlID0gb24oZG9jdW1lbnQuYm9keSwgJ2NsaWNrJywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRcdHZhciB0YXJnZXQgPSBldmVudC50YXJnZXQ7XG5cdFx0XHRcdGlmICh0YXJnZXQubm9kZVR5cGUgIT09IDEpIHtcblx0XHRcdFx0XHR0YXJnZXQgPSB0YXJnZXQucGFyZW50Tm9kZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAodGFyZ2V0ICYmICFub2RlLmNvbnRhaW5zKHRhcmdldCkpIHtcblx0XHRcdFx0XHRjYWxsYmFjayhldmVudCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0aGFuZGxlID0ge1xuXHRcdFx0cmVzdW1lOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGJIYW5kbGUucmVzdW1lKCk7XG5cdFx0XHRcdH0sIDEwMCk7XG5cdFx0XHR9LFxuXHRcdFx0cGF1c2U6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0YkhhbmRsZS5wYXVzZSgpO1xuXHRcdFx0fSxcblx0XHRcdHJlbW92ZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRiSGFuZGxlLnJlbW92ZSgpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRoYW5kbGUucGF1c2UoKTtcblxuXHRcdHJldHVybiBoYW5kbGU7XG5cdH1cblxuXHRmdW5jdGlvbiBvbkltYWdlTG9hZCAoaW1nLCBjYWxsYmFjaykge1xuXHRcdGZ1bmN0aW9uIG9uSW1hZ2VMb2FkIChlKSB7XG5cdFx0XHR2YXIgaCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0aWYgKGltZy5uYXR1cmFsV2lkdGgpIHtcblx0XHRcdFx0XHRlLndpZHRoID0gaW1nLm5hdHVyYWxXaWR0aDtcblx0XHRcdFx0XHRlLm5hdHVyYWxXaWR0aCA9IGltZy5uYXR1cmFsV2lkdGg7XG5cdFx0XHRcdFx0ZS5oZWlnaHQgPSBpbWcubmF0dXJhbEhlaWdodDtcblx0XHRcdFx0XHRlLm5hdHVyYWxIZWlnaHQgPSBpbWcubmF0dXJhbEhlaWdodDtcblx0XHRcdFx0XHRjYWxsYmFjayhlKTtcblx0XHRcdFx0XHRjbGVhckludGVydmFsKGgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LCAxMDApO1xuXHRcdFx0aW1nLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBvbkltYWdlTG9hZCk7XG5cdFx0XHRpbWcucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCBjYWxsYmFjayk7XG5cdFx0fVxuXG5cdFx0aW1nLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBvbkltYWdlTG9hZCk7XG5cdFx0aW1nLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgY2FsbGJhY2spO1xuXHRcdHJldHVybiB7XG5cdFx0XHRwYXVzZTogZnVuY3Rpb24gKCkge30sXG5cdFx0XHRyZXN1bWU6IGZ1bmN0aW9uICgpIHt9LFxuXHRcdFx0cmVtb3ZlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGltZy5yZW1vdmVFdmVudExpc3RlbmVyKCdsb2FkJywgb25JbWFnZUxvYWQpO1xuXHRcdFx0XHRpbWcucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCBjYWxsYmFjayk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0Tm9kZSAoc3RyKSB7XG5cdFx0aWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG5cdFx0XHRyZXR1cm4gc3RyO1xuXHRcdH1cblx0XHR2YXIgbm9kZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHN0cik7XG5cdFx0aWYgKCFub2RlKSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKCdgb25gIENvdWxkIG5vdCBmaW5kOicsIHN0cik7XG5cdFx0fVxuXHRcdHJldHVybiBub2RlO1xuXHR9XG5cblx0dmFyIGllS2V5cyA9IHtcblx0XHQvL2E6ICdURVNUJyxcblx0XHRVcDogJ0Fycm93VXAnLFxuXHRcdERvd246ICdBcnJvd0Rvd24nLFxuXHRcdExlZnQ6ICdBcnJvd0xlZnQnLFxuXHRcdFJpZ2h0OiAnQXJyb3dSaWdodCcsXG5cdFx0RXNjOiAnRXNjYXBlJyxcblx0XHRTcGFjZWJhcjogJyAnLFxuXHRcdFdpbjogJ0NvbW1hbmQnXG5cdH07XG5cblx0ZnVuY3Rpb24gbm9ybWFsaXplS2V5RXZlbnQgKGNhbGxiYWNrKSB7XG5cdFx0Ly8gSUUgdXNlcyBvbGQgc3BlY1xuXHRcdHJldHVybiBmdW5jdGlvbiAoZSkge1xuXHRcdFx0aWYgKGllS2V5c1tlLmtleV0pIHtcblx0XHRcdFx0dmFyIGZha2VFdmVudCA9IG1peCh7fSwgZSk7XG5cdFx0XHRcdGZha2VFdmVudC5rZXkgPSBpZUtleXNbZS5rZXldO1xuXHRcdFx0XHRjYWxsYmFjayhmYWtlRXZlbnQpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y2FsbGJhY2soZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gbm9ybWFsaXplV2hlZWxFdmVudCAoY2FsbGJhY2spIHtcblx0XHQvLyBub3JtYWxpemVzIGFsbCBicm93c2VycycgZXZlbnRzIHRvIGEgc3RhbmRhcmQ6XG5cdFx0Ly8gZGVsdGEsIHdoZWVsWSwgd2hlZWxYXG5cdFx0Ly8gYWxzbyBhZGRzIGFjY2VsZXJhdGlvbiBhbmQgZGVjZWxlcmF0aW9uIHRvIG1ha2Vcblx0XHQvLyBNYWMgYW5kIFdpbmRvd3MgYmVoYXZlIHNpbWlsYXJseVxuXHRcdHJldHVybiBmdW5jdGlvbiAoZSkge1xuXHRcdFx0WExSOCArPSBGQUNUT1I7XG5cdFx0XHR2YXJcblx0XHRcdFx0ZGVsdGFZID0gTWF0aC5tYXgoLTEsIE1hdGgubWluKDEsIChlLndoZWVsRGVsdGFZIHx8IGUuZGVsdGFZKSkpLFxuXHRcdFx0XHRkZWx0YVggPSBNYXRoLm1heCgtMTAsIE1hdGgubWluKDEwLCAoZS53aGVlbERlbHRhWCB8fCBlLmRlbHRhWCkpKTtcblxuXHRcdFx0ZGVsdGFZID0gZGVsdGFZIDw9IDAgPyBkZWx0YVkgLSBYTFI4IDogZGVsdGFZICsgWExSODtcblxuXHRcdFx0ZS5kZWx0YSA9IGRlbHRhWTtcblx0XHRcdGUud2hlZWxZID0gZGVsdGFZO1xuXHRcdFx0ZS53aGVlbFggPSBkZWx0YVg7XG5cblx0XHRcdGNsZWFyVGltZW91dChtb3VzZVdoZWVsSGFuZGxlKTtcblx0XHRcdG1vdXNlV2hlZWxIYW5kbGUgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0WExSOCA9IDA7XG5cdFx0XHR9LCAzMDApO1xuXHRcdFx0Y2FsbGJhY2soZSk7XG5cdFx0fTtcblx0fVxuXG5cdGZ1bmN0aW9uIGlzTXVsdGlLZXkgKGV2ZW50TmFtZSkge1xuXHRcdHJldHVybiAvLC8udGVzdChldmVudE5hbWUpICYmICEvY2xpY2t8bW91c2V8cmVzaXplfHNjcm9sbC8udGVzdChldmVudE5hbWUpO1xuXHR9XG5cblx0ZnVuY3Rpb24ga2V5c1RvUmVnRXhwIChldmVudE5hbWUpIHtcblx0XHRyZXR1cm4gbmV3IFJlZ0V4cChldmVudE5hbWUucmVwbGFjZSgna2V5ZG93bjonLCAnJykucmVwbGFjZSgna2V5dXA6JywgJycpLnNwbGl0KCcsJykuam9pbignfCcpKTtcblx0fVxuXG5cdGZ1bmN0aW9uIG9uIChub2RlLCBldmVudE5hbWUsIGZpbHRlciwgaGFuZGxlcikge1xuXHRcdHZhclxuXHRcdFx0Y2FsbGJhY2ssXG5cdFx0XHRoYW5kbGVzLFxuXHRcdFx0aGFuZGxlLFxuXHRcdFx0a2V5UmVnRXhwO1xuXG5cdFx0aWYgKGlzTXVsdGlLZXkoZXZlbnROYW1lKSkge1xuXHRcdFx0a2V5UmVnRXhwID0ga2V5c1RvUmVnRXhwKGV2ZW50TmFtZSk7XG5cdFx0XHRjYWxsYmFjayA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdGlmIChrZXlSZWdFeHAudGVzdChlLmtleSkpIHtcblx0XHRcdFx0XHQoaGFuZGxlciB8fCBmaWx0ZXIpKGUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0ZXZlbnROYW1lID0gL2tleWRvd24vLnRlc3QoZXZlbnROYW1lKSA/ICdrZXlkb3duJyA6ICdrZXl1cCc7XG5cdFx0fVxuXG5cdFx0aWYgKC8sLy50ZXN0KGV2ZW50TmFtZSkpIHtcblx0XHRcdC8vIGhhbmRsZSBtdWx0aXBsZSBldmVudCB0eXBlcywgbGlrZTpcblx0XHRcdC8vIG9uKG5vZGUsICdtb3VzZXVwLCBtb3VzZWRvd24nLCBjYWxsYmFjayk7XG5cdFx0XHQvL1xuXHRcdFx0aGFuZGxlcyA9IFtdO1xuXHRcdFx0ZXZlbnROYW1lLnNwbGl0KCcsJykuZm9yRWFjaChmdW5jdGlvbiAoZVN0cikge1xuXHRcdFx0XHRoYW5kbGVzLnB1c2gob24obm9kZSwgZVN0ci50cmltKCksIGZpbHRlciwgaGFuZGxlcikpO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gbWFrZU11bHRpSGFuZGxlKGhhbmRsZXMpO1xuXHRcdH1cblxuXHRcdGlmKGV2ZW50TmFtZSA9PT0gJ2J1dHRvbicpe1xuXHRcdFx0Ly8gaGFuZGxlIGNsaWNrIGFuZCBFbnRlclxuXHRcdFx0cmV0dXJuIG1ha2VNdWx0aUhhbmRsZShbXG5cdFx0XHRcdG9uKG5vZGUsICdjbGljaycsIGZpbHRlciwgaGFuZGxlKSxcblx0XHRcdFx0b24obm9kZSwgJ2tleXVwOkVudGVyJywgZmlsdGVyLCBoYW5kbGUpXG5cdFx0XHRdKTtcblx0XHR9XG5cblx0XHRub2RlID0gZ2V0Tm9kZShub2RlKTtcblxuXHRcdGlmIChmaWx0ZXIgJiYgaGFuZGxlcikge1xuXHRcdFx0aWYgKHR5cGVvZiBmaWx0ZXIgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdGZpbHRlciA9IGNsb3Nlc3RGaWx0ZXIobm9kZSwgZmlsdGVyKTtcblx0XHRcdH1cblx0XHRcdC8vIGVsc2UgaXQgaXMgYSBjdXN0b20gZnVuY3Rpb25cblx0XHRcdGNhbGxiYWNrID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0dmFyIHJlc3VsdCA9IGZpbHRlcihlKTtcblx0XHRcdFx0aWYgKHJlc3VsdCkge1xuXHRcdFx0XHRcdGUuZmlsdGVyZWRUYXJnZXQgPSByZXN1bHQ7XG5cdFx0XHRcdFx0aGFuZGxlcihlLCByZXN1bHQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdH0gZWxzZSBpZiAoIWNhbGxiYWNrKSB7XG5cdFx0XHRjYWxsYmFjayA9IGZpbHRlciB8fCBoYW5kbGVyO1xuXHRcdH1cblxuXHRcdGlmIChldmVudE5hbWUgPT09ICdjbGlja29mZicpIHtcblx0XHRcdC8vIGN1c3RvbSAtIHVzZWQgZm9yIHBvcHVwcyAnbiBzdHVmZlxuXHRcdFx0cmV0dXJuIG9uQ2xpY2tvZmYobm9kZSwgY2FsbGJhY2spO1xuXHRcdH1cblxuXHRcdGlmIChldmVudE5hbWUgPT09ICdsb2FkJyAmJiBub2RlLmxvY2FsTmFtZSA9PT0gJ2ltZycpIHtcblx0XHRcdHJldHVybiBvbkltYWdlTG9hZChub2RlLCBjYWxsYmFjayk7XG5cdFx0fVxuXG5cdFx0aWYgKGV2ZW50TmFtZSA9PT0gJ3doZWVsJykge1xuXHRcdFx0Ly8gbW91c2V3aGVlbCBldmVudHMsIG5hdGNoXG5cdFx0XHRpZiAoaGFzV2hlZWwpIHtcblx0XHRcdFx0Ly8gcGFzcyB0aHJvdWdoLCBidXQgZmlyc3QgY3VycnkgY2FsbGJhY2sgdG8gd2hlZWwgZXZlbnRzXG5cdFx0XHRcdGNhbGxiYWNrID0gbm9ybWFsaXplV2hlZWxFdmVudChjYWxsYmFjayk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBvbGQgRmlyZWZveCwgb2xkIElFLCBDaHJvbWVcblx0XHRcdFx0cmV0dXJuIG1ha2VNdWx0aUhhbmRsZShbXG5cdFx0XHRcdFx0b24obm9kZSwgJ0RPTU1vdXNlU2Nyb2xsJywgbm9ybWFsaXplV2hlZWxFdmVudChjYWxsYmFjaykpLFxuXHRcdFx0XHRcdG9uKG5vZGUsICdtb3VzZXdoZWVsJywgbm9ybWFsaXplV2hlZWxFdmVudChjYWxsYmFjaykpXG5cdFx0XHRcdF0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICgva2V5Ly50ZXN0KGV2ZW50TmFtZSkpIHtcblx0XHRcdGNhbGxiYWNrID0gbm9ybWFsaXplS2V5RXZlbnQoY2FsbGJhY2spO1xuXHRcdH1cblxuXHRcdG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGNhbGxiYWNrLCBmYWxzZSk7XG5cblx0XHRoYW5kbGUgPSB7XG5cdFx0XHRyZW1vdmU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0bm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgY2FsbGJhY2ssIGZhbHNlKTtcblx0XHRcdFx0bm9kZSA9IGNhbGxiYWNrID0gbnVsbDtcblx0XHRcdFx0dGhpcy5yZW1vdmUgPSB0aGlzLnBhdXNlID0gdGhpcy5yZXN1bWUgPSBmdW5jdGlvbiAoKSB7fTtcblx0XHRcdH0sXG5cdFx0XHRwYXVzZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBjYWxsYmFjaywgZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdHJlc3VtZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRub2RlLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBjYWxsYmFjaywgZmFsc2UpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRyZXR1cm4gaGFuZGxlO1xuXHR9XG5cblx0b24ub25jZSA9IGZ1bmN0aW9uIChub2RlLCBldmVudE5hbWUsIGZpbHRlciwgY2FsbGJhY2spIHtcblx0XHR2YXIgaDtcblx0XHRpZiAoZmlsdGVyICYmIGNhbGxiYWNrKSB7XG5cdFx0XHRoID0gb24obm9kZSwgZXZlbnROYW1lLCBmaWx0ZXIsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0Y2FsbGJhY2suYXBwbHkod2luZG93LCBhcmd1bWVudHMpO1xuXHRcdFx0XHRoLnJlbW92ZSgpO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGggPSBvbihub2RlLCBldmVudE5hbWUsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0ZmlsdGVyLmFwcGx5KHdpbmRvdywgYXJndW1lbnRzKTtcblx0XHRcdFx0aC5yZW1vdmUoKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRyZXR1cm4gaDtcblx0fTtcblxuXHRJTlZBTElEX1BST1BTID0ge1xuXHRcdGlzVHJ1c3RlZDogMVxuXHR9O1xuXHRmdW5jdGlvbiBtaXggKG9iamVjdCwgdmFsdWUpIHtcblx0XHRpZiAoIXZhbHVlKSB7XG5cdFx0XHRyZXR1cm4gb2JqZWN0O1xuXHRcdH1cblx0XHRpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuXHRcdFx0Zm9yKHZhciBrZXkgaW4gdmFsdWUpe1xuXHRcdFx0XHRpZiAoIUlOVkFMSURfUFJPUFNba2V5XSAmJiB0eXBlb2YgdmFsdWVba2V5XSAhPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdG9iamVjdFtrZXldID0gdmFsdWVba2V5XTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRvYmplY3QudmFsdWUgPSB2YWx1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIG9iamVjdDtcblx0fVxuXG5cdG9uLmVtaXQgPSBmdW5jdGlvbiAobm9kZSwgZXZlbnROYW1lLCB2YWx1ZSkge1xuXHRcdG5vZGUgPSBnZXROb2RlKG5vZGUpO1xuXHRcdHZhciBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdIVE1MRXZlbnRzJyk7XG5cdFx0ZXZlbnQuaW5pdEV2ZW50KGV2ZW50TmFtZSwgdHJ1ZSwgdHJ1ZSk7IC8vIGV2ZW50IHR5cGUsIGJ1YmJsaW5nLCBjYW5jZWxhYmxlXG5cdFx0cmV0dXJuIG5vZGUuZGlzcGF0Y2hFdmVudChtaXgoZXZlbnQsIHZhbHVlKSk7XG5cdH07XG5cblx0b24uZmlyZSA9IGZ1bmN0aW9uIChub2RlLCBldmVudE5hbWUsIGV2ZW50RGV0YWlsLCBidWJibGVzKSB7XG5cdFx0dmFyIGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0N1c3RvbUV2ZW50Jyk7XG5cdFx0ZXZlbnQuaW5pdEN1c3RvbUV2ZW50KGV2ZW50TmFtZSwgISFidWJibGVzLCB0cnVlLCBldmVudERldGFpbCk7IC8vIGV2ZW50IHR5cGUsIGJ1YmJsaW5nLCBjYW5jZWxhYmxlLCB2YWx1ZVxuXHRcdHJldHVybiBub2RlLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHR9O1xuXG5cdG9uLmlzQWxwaGFOdW1lcmljID0gZnVuY3Rpb24gKHN0cikge1xuXHRcdGlmIChzdHIubGVuZ3RoID4gMSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRpZiAoc3RyID09PSAnICcpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0aWYgKCFpc05hTihOdW1iZXIoc3RyKSkpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0XHR2YXIgY29kZSA9IHN0ci50b0xvd2VyQ2FzZSgpLmNoYXJDb2RlQXQoMCk7XG5cdFx0cmV0dXJuIGNvZGUgPj0gOTcgJiYgY29kZSA8PSAxMjI7XG5cdH07XG5cblx0b24ubWFrZU11bHRpSGFuZGxlID0gbWFrZU11bHRpSGFuZGxlO1xuXHRvbi5jbG9zZXN0ID0gY2xvc2VzdDtcblx0b24ubWF0Y2hlcyA9IG1hdGNoZXM7XG5cblx0cmV0dXJuIG9uO1xuXG59KSk7XG4iXX0=
