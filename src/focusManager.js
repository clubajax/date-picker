const on = require('@clubajax/on');

module.exports = function (component, show, hide) {

	const input = component.input;
	const picker = component.picker;
	const timeInput = picker.timeInput;
	const focusLoop = picker.querySelector('input.focus-loop');

	let current;
	let daySelectMode = false;
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

		daySelectMode = inPicker && e.target.closest('.day');
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
		if (daySelectMode) {
			switch (e.key) {
				case 'ArrowLeft' :

					break;
				case 'ArrowRight' :

					break;
			}
		}
	});

	const downHandle = on(document, 'keydown', (e) => {
		if (e.key === ' ' && isControl(e.target)) {
			on.emit(e.target, 'click');
			return stop(e);
		}
	});

	on(input, 'focus', show);

	on(document.body, 'mousedown', (e) => {
		return onNavigate(e);
	});

	function isControl (node) {
		return node === picker.lftMoNode || node === picker.rgtMoNode || node === picker.lftYrNode || node === picker.rgtYrNode;
	}

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

	show();
};
