const on = require('@clubajax/on');

module.exports = function (component, show, hide) {
    const icon = component.icon;
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

	on(icon, 'click', show);

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

	return on.makeMultiHandle([upHandle, docHandle]);
};
