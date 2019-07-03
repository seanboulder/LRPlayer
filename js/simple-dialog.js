/* Utility functions */
function bindEventHandler(element, eventName, handler) {
	if (element.addEventListener) {
		// The standard way
		element.addEventListener(eventName, handler, false);
	} else if (element.attachEvent) {
		// The Microsoft way
		element.attachEvent('on' + eventName, handler);
	}
}

/**
 * The modal dialog class
 * @constructor
 */
function Dialog(options) {
	this.options = {
		width: 400,
		top: 120,
		openOnCreate: true,
		destroyOnClose: true,
		escHandler: this.close,
		buttons: {'OK': this.close}
	};
	// Overwrite the default options
	for (var option in options) {
		this.options[option] = options[option];
	}
	// Create dialog dom
	this._makeNodes();
	if (this.options.openOnCreate) {
		this.open();
	}
}

Dialog.prototype = {
	/* handles to the dom nodes */
	container: null,
	header: null,
	body: null,
	content: null,
	actions: null,
	_overlay: null,
	_wrapper: null,
	_zIndex: 0,
	_escHandler: null,
	
	/**
	 * Shows the dialog
	 */
	open: function() {
		this._makeTop();
		var ws = this._wrapper.style;
		ws.left = (document.body.clientWidth - this.options.width) / 2 + 'px';
		ws.top = (document.body.scrollTop || document.documentElement.scrollTop) + this.options.top + 'px';
		this._overlay.style.display = 'block';
		ws.display = 'block';
		this._wrapper.focus();

		if (this.options.focus) {
			var input = document.getElementById(this.options.focus);
			if (input) {
				input.focus();
			}
		}
	},
	
	/**
	 * Closes the dialog
	 */
	close: function() {
		if (this.options.destroyOnClose) {
			this._destroy();
		} else {
			this._overlay.style.display = 'none';
			this._wrapper.style.display = 'none';
		}
	},

	/**
	 * Add buttons to the dialog actions panel after creation
	 * @param {object} buttons Object with property name as button text and value as click handler
	 * @param {boolean} prepend If true, buttons will be prepended to the panel instead of being appended
	 */
	addButtons: function(buttons, prepend) {
		var actions = this.actions;
		var buttonArray = this._makeButtons(buttons);
		var first = null;
		if (prepend && (first = actions.firstChild) != null) {
			for (var i in buttonArray) {
				actions.insertBefore(buttonArray[i], first);
			}
		} else {
			for (var i in buttonArray) {
				actions.appendChild(buttonArray[i]);
			}
		}
	},

	/**
	 * Change (or set) title after creation
	 * @param {string} title The dialog title
	 */
	setTitle: function(title) {
		if (!this.header) {
			var header = document.createElement('div');
			header.className = 'dialog-header';
			this.container.insertBefore(header, this.body);
			this.header = header;
		}
		this.header.innerHTML = title;
	},

	/**
	 * Makes the dom tree for the dialog
	 */
	_makeNodes: function() {
		if (this._overlay || this._wrapper) {
			return; // Avoid duplicate invocation
		}
		// Make overlay
		this._overlay = document.createElement('div');
		this._overlay.className = 'dialog-overlay';
		document.body.appendChild(this._overlay);

		if (typeof this.options.title == 'string' && this.options.title != '') {
			var header = document.createElement('div');
			header.className = 'dialog-header';
			header.innerHTML = this.options.title;
			this.header = header;
		}

		// {begin dialog body
		var content = document.createElement('div');
		content.className = 'dialog-content';
		content.innerHTML = this.options.content;
		this.content = content;

		//   {begin actions panel
		var actions = document.createElement('div');
		actions.className = 'dialog-actions';
		var buttons = this._makeButtons(this.options.buttons);
		if (buttons.length > 0) {
			for (var i in buttons) {
				actions.appendChild(buttons[i]);
			}
		}
		this.actions = actions;
		//   }end actions panel

		var body = document.createElement('div');
		body.className = 'dialog-body';
		body.appendChild(content);
		body.appendChild(actions);
		this.body = body;
		// }end dialog body

		var container = document.createElement('div');
		container.className = 'dialog';
		if (this.header) {
			container.appendChild(header);
		}
		container.appendChild(body);
		this.container = container;

		var wrapper = document.createElement('div');
		wrapper.className = 'dialog-wrapper';
		var ws = wrapper.style;
		ws.position = 'absolute';
		ws.width = this.options.width + 'px';
		ws.display = 'none';
		ws.outline = 'none';
		wrapper.appendChild(container);
		// register keydown event
		if (this.options.escHandler) {
			wrapper.tabIndex = -1;
			this._onKeydown = this._makeHandler(function(e) {
				if (!e) {
					e = window.event;
				}
				if (e.keyCode && e.keyCode == 27) {
					this.options.escHandler.apply(this);
				}
			}, this);
			bindEventHandler(wrapper, 'keydown', this._onKeydown);
		}
		this._wrapper = document.body.appendChild(wrapper);

		if (Dialog.needIEFix) {
			this._fixIE();
		}
	},

	/**
	 * Removes the nodes from document
	 * @param {object} buttons Object with property name as button text and value as click handler
	 * @return {Array} Array of buttons as dom nodes
	 */
	_makeButtons: function(buttons) {
		var buttonArray = new Array();
		for (var buttonText in buttons) {
			var button = document.createElement('button');
			button.className = 'dialog-button';
			button.innerHTML = buttonText;

			bindEventHandler(button, 'click', this._makeHandler(buttons[buttonText], this));

			buttonArray.push(button);
		}
		return buttonArray;
	},

	/** A helper function used by makeButtons */
	_makeHandler: function(method, obj) {
		return function(e) {
			method.call(obj, e);
		}
	},

	/** A helper function used by open */
	_makeTop: function() {
		if (this._zIndex < Dialog.Manager.currentZIndex) {
			this._overlay.style.zIndex = Dialog.Manager.newZIndex();
			this._zIndex = this._wrapper.style.zIndex = Dialog.Manager.newZIndex();
		}
	},

	_fixIE: function() {
		var width = document.documentElement["scrollWidth"] + 'px';
		var height = document.documentElement["scrollHeight"] + 'px';
		var os = this._overlay.style;
		os.position = 'absolute';
		os.width = width;
		os.height = height;

		var iframe = document.createElement('iframe');
		iframe.className = 'iefix';
		iframe.style.width = width;
		iframe.style.height = height;
		this._wrapper.appendChild(iframe);
	},

	/**
	 * Removes the nodes from document
	 */
	_destroy: function() {
		document.body.removeChild(this._wrapper);
		document.body.removeChild(this._overlay);
		this.container = null;
		this.header = null;
		this.body = null;
		this.content = null;
		this.actions = null;
		this._overlay = null;
		this._wrapper = null;
	}
};

Dialog.needIEFix = (function () {
	var userAgent = navigator.userAgent.toLowerCase();
	return /msie/.test(userAgent) && !/opera/.test(userAgent) && !window.XMLHttpRequest;
})();

/** This simple object manages the z indices */
Dialog.Manager = {
	currentZIndex: 3000,
	newZIndex: function() {
		return ++this.currentZIndex;
	}
};
