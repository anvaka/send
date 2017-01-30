(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// This is the main script that manages the bookmark form. It first reads the
// query string, and if email/button text are present, then it renders the send form.
// Otherwise a configuration screen is rendnered where user is prompeted to configure
// theire send link button.

// Before we do anything at all, let's make sure that this website works offline.
installServiceWorkerForOfflineSupport();

// Now let's work
var queryString = require('query-state')();
queryString.onChange(updateForms);


updateForms();

// public part is over. Everything below is just an implementatino detail.
var emailInput = q('#email-input');
var labelInput = q('#label-input');
var linkDom = q('#link-output');

var currentEmail = emailInput.value;
var currentLabel = labelInput.value;

validateDesignForm();

whenInputChanges(emailInput, updateEmail);
whenInputChanges(labelInput, updateLabel);

function updateEmail(e) {
  currentEmail = emailInput.value;
  refreshLink();
}

function updateLabel() {
  currentLabel = labelInput.value;
  refreshLink();
}

function refreshLink() {
  var link = window.location.origin + window.location.pathname + '#?';
  link += 'email=' + window.encodeURIComponent(currentEmail) + '&' + 
    'label=' + window.encodeURIComponent(currentLabel);

  linkDom.innerText = link;
  linkDom.href = link;
  validateDesignForm();
}

function validateDesignForm() {
  var step2 = q('.step-2');
  var formValid = currentEmail.indexOf('@') > -1 && currentLabel;
  if (formValid) { // very naive email validator.
    step2.classList.add('valid');
  } else {
    step2.classList.remove('valid');
  }
}

function showConfigureForm() {
  q('.design-form').classList.remove('hidden');
  q('.send-form').classList.add('hidden');
}

function showSendForm() {
  var appState = queryString.get();
  var label = q('#label-output');
  var sendTo = q('#send-to');

  q('.design-form').classList.add('hidden');
  q('.send-form').classList.remove('hidden');

  // Initialize input box with current app state:
  updateSendForm(appState);

  function updateSendForm(appState) {
    sendTo.innerText = appState.email || '';
    label.innerText = appState.label || '';
    label.href = ('mailto:' + appState.email) || ''
    document.title = appState.label;
  }
}

function updateForms() {
  var appState = queryString.get();
  if (appState.email && appState.label) {
    showSendForm();
  } else {
    showConfigureForm();
  }
}

function setFocus(appState) {
  if (appState.email) return; // no need to change focus if email is here

  emailInput.focus();
}

function installServiceWorkerForOfflineSupport() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
  }
}

function q(selector) {
  return document.querySelector(selector);
}

function whenInputChanges(input, changeCallback) {
  input.addEventListener('keyup', changeCallback);
  input.addEventListener('blur', changeCallback);
  input.addEventListener('keydown', changeCallback);
}

},{"query-state":2}],2:[function(require,module,exports){
/**
 * Allows application to access and update current app state via query string
 */
module.exports = queryState;

var eventify = require('ngraph.events');
var windowHashHistory = require('./lib/windowHashHistory.js');

/**
 * Just a convenience function that returns singleton instance of a query state
 */
queryState.instance = instance;

// this variable holds singleton instance of the query state
var singletonQS;

/**
 * Creates new instance of the query state.
 */
function queryState(defaults, history) {
  history = history || windowHashHistory(defaults);
  validateHistoryAPI(history);

  history.onChanged(updateQuery)

  var query = history.get() || Object.create(null);

  var api = {

    /**
     * Gets current state.
     *
     * @param {string?} keyName if present then value for this key is returned.
     * Otherwise the entire app state is returned.
     */
    get: getValue,

    /**
     * Merges current app state with new key/value.
     *
     * @param {string} key name
     * @param {string|number|date} value
     */
    set: setValue,

    /**
     * Similar to `set()`, but only sets value if it was not set before.
     *
     * @param {string} key name
     * @param {string|number|date} value
     */
    setIfEmpty: setIfEmpty,

    /**
     * Releases all resources acquired by query state. After calling this method
     * no hash monitoring will happen and no more events will be fired.
     */
    dispose: dispose,

    onChange: onChange,
    offChange: offChange,

    getHistoryObject: getHistoryObject,
  }

  var eventBus = eventify({});

  return api;

  function onChange(callback, ctx) {
    eventBus.on('change', callback, ctx);
  }

  function offChange(callback, ctx) {
    eventBus.off('change', callback, ctx)
  }

  function getHistoryObject() {
    return history;
  }

  function dispose() {
    // dispose all history listeners
    history.dispose();

    // And remove our own listeners
    eventBus.off();
  }

  function getValue(keyName) {
    if (keyName === undefined) return query;

    return query[keyName];
  }

  function setValue(keyName, value) {
    var keyNameType = typeof keyName;

    if (keyNameType === 'object') {
      Object.keys(keyName).forEach(function(key) {
        query[key] = keyName[key];
      });
    } else if (keyNameType === 'string') {
      query[keyName] = value;
    }

    history.set(query);

    return api;
  }

  function updateQuery(newAppState) {
    query = newAppState;
    eventBus.fire('change', query);
  }

  function setIfEmpty(keyName, value) {
    if (typeof keyName === 'object') {
      Object.keys(keyName).forEach(function(key) {
        // TODO: Can I remove code duplication? The main reason why I don't
        // want recursion here is to avoid spamming `history.set()`
        if (key in query) return; // key name is not empty

        query[key] = keyName[key];
      });
    }

    if (keyName in query) return; // key name is not empty
    query[keyName] = value;

    history.set(query);

    return api;
  }
}

/**
 * Returns singleton instance of the query state.
 *
 * @param {Object} defaults - if present, then it is passed to the current instance
 * of the query state. Defaults are applied only if they were not present before.
 */
function instance(defaults) {
  if (!singletonQS) {
    singletonQS = queryState(defaults);
  } else if (defaults) {
    singletonQS.setIfEmpty(defaults);
  }

  return singletonQS;
}

function validateHistoryAPI(history) {
  if (!history) throw new Error('history is required');
  if (typeof history.dispose !== 'function') throw new Error('dispose is required');
  if (typeof history.onChanged !== 'function') throw new Error('onChanged is required');
}

},{"./lib/windowHashHistory.js":5,"ngraph.events":6}],3:[function(require,module,exports){
/**
 * Provides a `null` object that matches history API
 */
module.exports = inMemoryHistory;

function inMemoryHistory(defaults) {
  var listeners = [];
  var lastQueryObject = defaults;

  return {
    dispose: dispose,
    onChanged: onChanged,
    set: set,
    get: get
  };

  function get() {
    return lastQueryObject;
  }

  function set(newQueryObject) {
    lastQueryObject = newQueryObject;
    setTimeout(function() {
      triggerChange(newQueryObject);
    }, 0);
  }

  function dispose() {
    listeners = [];
  }

  function onChanged(changeCallback) {
    if (typeof changeCallback !== 'function') {
      throw new Error('changeCallback should be a function')
    }

    listeners.push(changeCallback);
  }

  function triggerChange(appState) {
    listeners.forEach(function(listener) {
      listener(appState);
    });
  }
}

},{}],4:[function(require,module,exports){
/**
 * This module is similar to JSON, but it encodes/decodes in query string
 * format `key1=value1...`
 */
module.exports = {
  parse: parse,
  stringify: stringify
};

function stringify(object) {
  if (!object) return '';

  return Object.keys(object).map(toPairs).join('&');

  function toPairs(key) {
    var value = object[key];
    var pair = encodeURIComponent(key);
    if (value !== undefined) {
      pair += '=' + encodeValue(value);
    }

    return pair;
  }
}

function parse(queryString) {
  var query = Object.create(null);

  if (!queryString) return query;

  queryString.split('&').forEach(decodeRecord);

  return query;

  function decodeRecord(queryRecord) {
    if (!queryRecord) return;

    var pair = queryRecord.split('=');
    query[decodeURIComponent(pair[0])] = decodeValue(pair[1]);
  }
}

function encodeValue(value) {
  // TODO: Do I need this?
  // if (typeof value === 'string') {
  //   if (value.match(/^(true|false)$/)) {
  //     // special handling of strings that look like booleans
  //     value = JSON.stringify('' + value);
  //   } else if (value.match(/^-?\d+\.?\d*$/)) {
  //     // special handling of strings that look like numbers
  //     value = JSON.stringify('' + value);
  //   }
  // }
  if (value instanceof Date) {
    value = value.toISOString();
  }
  var uriValue = encodeURIComponent(value);
  return uriValue;
}

/**
 * This method returns typed value from string
 */
function decodeValue(value) {
  value = decodeURIComponent(value);

  if (value === "") return value;
  if (!isNaN(value)) return parseFloat(value);
  if (isBolean(value)) return value === 'true';
  if (isISODateString(value)) return new Date(value);

  return value;
}

function isBolean(strValue) {
  return strValue === 'true' || strValue === 'false';
}

function isISODateString(str) {
  return str && str.match(/(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/)
}

},{}],5:[function(require,module,exports){
/**
 * Uses `window` to monitor hash and update hash
 */
module.exports = windowHistory;

var inMemoryHistory = require('./inMemoryHistory.js');
var query = require('./query.js');

function windowHistory(defaults) {
  // If we don't support window, we are probably running in node. Just return
  // in memory history
  if (typeof window === 'undefined') return inMemoryHistory(defaults);

  // Store all `onChanged()` listeners here, so that we can have just one
  // `hashchange` listener, and notify one listeners within single event.
  var listeners = [];

  // This prefix is used for all query strings. So our state is stored as
  // my-app.com/#?key=value
  var hashPrefix = '#?';

  init();

  // This is our public API:
  return {
    /**
     * Adds callback that is called when hash change happen. Callback receives
     * current hash string with `#?` sign
     * 
     * @param {Function} changeCallback - a function that is called when hash is
     * changed. Callback gets one argument that represents the new state.
     */
    onChanged: onChanged,

    /**
     * Releases all resources
     */
    dispose: dispose,

    /**
     * Sets a new app state
     *
     * @param {object} appState - the new application state, that should be
     * persisted in the hash string
     */
    set: set,

    /**
     * Gets current app state
     */
    get: getStateFromHash
  };

  // Public API is over. You can ignore this part.

  function init() {
    var stateFromHash = getStateFromHash();
    var stateChanged = false;

    if (typeof defaults === 'object' && defaults) {
      Object.keys(defaults).forEach(function(key) {
        if (key in stateFromHash) return;

        stateFromHash[key] = defaults[key]
        stateChanged = true;
      });
    }

    if (stateChanged) set(stateFromHash);
  }

  function set(appState) {
    var hash = hashPrefix + query.stringify(appState);

    if (window.history) {
      window.history.replaceState(undefined, undefined, hash);
    } else {
      window.location.replace(hash);
    }
  }

  function onChanged(changeCallback) {
    if (typeof changeCallback !== 'function') throw new Error('changeCallback needs to be a function');

    // we start listen just once, only if we didn't listen before:
    if (listeners.length === 0) {
      window.addEventListener('hashchange', onHashChanged, false);
    }

    listeners.push(changeCallback);
  }

  function dispose() {
    if (listeners.length === 0) return; // no need to do anything.

    // Let garbage collector collect all listeners;
    listeners = [];

    // And release hash change event:
    window.removeEventListener('hashchange', onHashChanged, false);
  }

  function onHashChanged() {
    var appState = getStateFromHash();
    notifyListeners(appState);
  }

  function notifyListeners(appState) {
    for (var i = 0; i < listeners.length; ++i) {
      var listener = listeners[i];
      listener(appState);
    }
  }

  function getStateFromHash() {
    var queryString = (window.location.hash || hashPrefix).substr(hashPrefix.length);

    return query.parse(queryString);
  }
}

},{"./inMemoryHistory.js":3,"./query.js":4}],6:[function(require,module,exports){
module.exports = function(subject) {
  validateSubject(subject);

  var eventsStorage = createEventsStorage(subject);
  subject.on = eventsStorage.on;
  subject.off = eventsStorage.off;
  subject.fire = eventsStorage.fire;
  return subject;
};

function createEventsStorage(subject) {
  // Store all event listeners to this hash. Key is event name, value is array
  // of callback records.
  //
  // A callback record consists of callback function and its optional context:
  // { 'eventName' => [{callback: function, ctx: object}] }
  var registeredEvents = Object.create(null);

  return {
    on: function (eventName, callback, ctx) {
      if (typeof callback !== 'function') {
        throw new Error('callback is expected to be a function');
      }
      var handlers = registeredEvents[eventName];
      if (!handlers) {
        handlers = registeredEvents[eventName] = [];
      }
      handlers.push({callback: callback, ctx: ctx});

      return subject;
    },

    off: function (eventName, callback) {
      var wantToRemoveAll = (typeof eventName === 'undefined');
      if (wantToRemoveAll) {
        // Killing old events storage should be enough in this case:
        registeredEvents = Object.create(null);
        return subject;
      }

      if (registeredEvents[eventName]) {
        var deleteAllCallbacksForEvent = (typeof callback !== 'function');
        if (deleteAllCallbacksForEvent) {
          delete registeredEvents[eventName];
        } else {
          var callbacks = registeredEvents[eventName];
          for (var i = 0; i < callbacks.length; ++i) {
            if (callbacks[i].callback === callback) {
              callbacks.splice(i, 1);
            }
          }
        }
      }

      return subject;
    },

    fire: function (eventName) {
      var callbacks = registeredEvents[eventName];
      if (!callbacks) {
        return subject;
      }

      var fireArguments;
      if (arguments.length > 1) {
        fireArguments = Array.prototype.splice.call(arguments, 1);
      }
      for(var i = 0; i < callbacks.length; ++i) {
        var callbackInfo = callbacks[i];
        callbackInfo.callback.apply(callbackInfo.ctx, fireArguments);
      }

      return subject;
    }
  };
}

function validateSubject(subject) {
  if (!subject) {
    throw new Error('Eventify cannot use falsy object as events subject');
  }
  var reservedWords = ['on', 'fire', 'off'];
  for (var i = 0; i < reservedWords.length; ++i) {
    if (subject.hasOwnProperty(reservedWords[i])) {
      throw new Error("Subject cannot be eventified, since it already has property '" + reservedWords[i] + "'");
    }
  }
}

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy5ucG0tZ2xvYmFsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiaW5kZXguanMiLCIuLi8uLi9xdWVyeS1zdGF0ZS9pbmRleC5qcyIsIi4uLy4uL3F1ZXJ5LXN0YXRlL2xpYi9pbk1lbW9yeUhpc3RvcnkuanMiLCIuLi8uLi9xdWVyeS1zdGF0ZS9saWIvcXVlcnkuanMiLCIuLi8uLi9xdWVyeS1zdGF0ZS9saWIvd2luZG93SGFzaEhpc3RvcnkuanMiLCIuLi8uLi9xdWVyeS1zdGF0ZS9ub2RlX21vZHVsZXMvbmdyYXBoLmV2ZW50cy9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gVGhpcyBpcyB0aGUgbWFpbiBzY3JpcHQgdGhhdCBtYW5hZ2VzIHRoZSBib29rbWFyayBmb3JtLiBJdCBmaXJzdCByZWFkcyB0aGVcbi8vIHF1ZXJ5IHN0cmluZywgYW5kIGlmIGVtYWlsL2J1dHRvbiB0ZXh0IGFyZSBwcmVzZW50LCB0aGVuIGl0IHJlbmRlcnMgdGhlIHNlbmQgZm9ybS5cbi8vIE90aGVyd2lzZSBhIGNvbmZpZ3VyYXRpb24gc2NyZWVuIGlzIHJlbmRuZXJlZCB3aGVyZSB1c2VyIGlzIHByb21wZXRlZCB0byBjb25maWd1cmVcbi8vIHRoZWlyZSBzZW5kIGxpbmsgYnV0dG9uLlxuXG4vLyBCZWZvcmUgd2UgZG8gYW55dGhpbmcgYXQgYWxsLCBsZXQncyBtYWtlIHN1cmUgdGhhdCB0aGlzIHdlYnNpdGUgd29ya3Mgb2ZmbGluZS5cbmluc3RhbGxTZXJ2aWNlV29ya2VyRm9yT2ZmbGluZVN1cHBvcnQoKTtcblxuLy8gTm93IGxldCdzIHdvcmtcbnZhciBxdWVyeVN0cmluZyA9IHJlcXVpcmUoJ3F1ZXJ5LXN0YXRlJykoKTtcbnF1ZXJ5U3RyaW5nLm9uQ2hhbmdlKHVwZGF0ZUZvcm1zKTtcblxuXG51cGRhdGVGb3JtcygpO1xuXG4vLyBwdWJsaWMgcGFydCBpcyBvdmVyLiBFdmVyeXRoaW5nIGJlbG93IGlzIGp1c3QgYW4gaW1wbGVtZW50YXRpbm8gZGV0YWlsLlxudmFyIGVtYWlsSW5wdXQgPSBxKCcjZW1haWwtaW5wdXQnKTtcbnZhciBsYWJlbElucHV0ID0gcSgnI2xhYmVsLWlucHV0Jyk7XG52YXIgbGlua0RvbSA9IHEoJyNsaW5rLW91dHB1dCcpO1xuXG52YXIgY3VycmVudEVtYWlsID0gZW1haWxJbnB1dC52YWx1ZTtcbnZhciBjdXJyZW50TGFiZWwgPSBsYWJlbElucHV0LnZhbHVlO1xuXG52YWxpZGF0ZURlc2lnbkZvcm0oKTtcblxud2hlbklucHV0Q2hhbmdlcyhlbWFpbElucHV0LCB1cGRhdGVFbWFpbCk7XG53aGVuSW5wdXRDaGFuZ2VzKGxhYmVsSW5wdXQsIHVwZGF0ZUxhYmVsKTtcblxuZnVuY3Rpb24gdXBkYXRlRW1haWwoZSkge1xuICBjdXJyZW50RW1haWwgPSBlbWFpbElucHV0LnZhbHVlO1xuICByZWZyZXNoTGluaygpO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVMYWJlbCgpIHtcbiAgY3VycmVudExhYmVsID0gbGFiZWxJbnB1dC52YWx1ZTtcbiAgcmVmcmVzaExpbmsoKTtcbn1cblxuZnVuY3Rpb24gcmVmcmVzaExpbmsoKSB7XG4gIHZhciBsaW5rID0gd2luZG93LmxvY2F0aW9uLm9yaWdpbiArIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArICcjPyc7XG4gIGxpbmsgKz0gJ2VtYWlsPScgKyB3aW5kb3cuZW5jb2RlVVJJQ29tcG9uZW50KGN1cnJlbnRFbWFpbCkgKyAnJicgKyBcbiAgICAnbGFiZWw9JyArIHdpbmRvdy5lbmNvZGVVUklDb21wb25lbnQoY3VycmVudExhYmVsKTtcblxuICBsaW5rRG9tLmlubmVyVGV4dCA9IGxpbms7XG4gIGxpbmtEb20uaHJlZiA9IGxpbms7XG4gIHZhbGlkYXRlRGVzaWduRm9ybSgpO1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZURlc2lnbkZvcm0oKSB7XG4gIHZhciBzdGVwMiA9IHEoJy5zdGVwLTInKTtcbiAgdmFyIGZvcm1WYWxpZCA9IGN1cnJlbnRFbWFpbC5pbmRleE9mKCdAJykgPiAtMSAmJiBjdXJyZW50TGFiZWw7XG4gIGlmIChmb3JtVmFsaWQpIHsgLy8gdmVyeSBuYWl2ZSBlbWFpbCB2YWxpZGF0b3IuXG4gICAgc3RlcDIuY2xhc3NMaXN0LmFkZCgndmFsaWQnKTtcbiAgfSBlbHNlIHtcbiAgICBzdGVwMi5jbGFzc0xpc3QucmVtb3ZlKCd2YWxpZCcpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNob3dDb25maWd1cmVGb3JtKCkge1xuICBxKCcuZGVzaWduLWZvcm0nKS5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgcSgnLnNlbmQtZm9ybScpLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xufVxuXG5mdW5jdGlvbiBzaG93U2VuZEZvcm0oKSB7XG4gIHZhciBhcHBTdGF0ZSA9IHF1ZXJ5U3RyaW5nLmdldCgpO1xuICB2YXIgbGFiZWwgPSBxKCcjbGFiZWwtb3V0cHV0Jyk7XG4gIHZhciBzZW5kVG8gPSBxKCcjc2VuZC10bycpO1xuXG4gIHEoJy5kZXNpZ24tZm9ybScpLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICBxKCcuc2VuZC1mb3JtJykuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG5cbiAgLy8gSW5pdGlhbGl6ZSBpbnB1dCBib3ggd2l0aCBjdXJyZW50IGFwcCBzdGF0ZTpcbiAgdXBkYXRlU2VuZEZvcm0oYXBwU3RhdGUpO1xuXG4gIGZ1bmN0aW9uIHVwZGF0ZVNlbmRGb3JtKGFwcFN0YXRlKSB7XG4gICAgc2VuZFRvLmlubmVyVGV4dCA9IGFwcFN0YXRlLmVtYWlsIHx8ICcnO1xuICAgIGxhYmVsLmlubmVyVGV4dCA9IGFwcFN0YXRlLmxhYmVsIHx8ICcnO1xuICAgIGxhYmVsLmhyZWYgPSAoJ21haWx0bzonICsgYXBwU3RhdGUuZW1haWwpIHx8ICcnXG4gICAgZG9jdW1lbnQudGl0bGUgPSBhcHBTdGF0ZS5sYWJlbDtcbiAgfVxufVxuXG5mdW5jdGlvbiB1cGRhdGVGb3JtcygpIHtcbiAgdmFyIGFwcFN0YXRlID0gcXVlcnlTdHJpbmcuZ2V0KCk7XG4gIGlmIChhcHBTdGF0ZS5lbWFpbCAmJiBhcHBTdGF0ZS5sYWJlbCkge1xuICAgIHNob3dTZW5kRm9ybSgpO1xuICB9IGVsc2Uge1xuICAgIHNob3dDb25maWd1cmVGb3JtKCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2V0Rm9jdXMoYXBwU3RhdGUpIHtcbiAgaWYgKGFwcFN0YXRlLmVtYWlsKSByZXR1cm47IC8vIG5vIG5lZWQgdG8gY2hhbmdlIGZvY3VzIGlmIGVtYWlsIGlzIGhlcmVcblxuICBlbWFpbElucHV0LmZvY3VzKCk7XG59XG5cbmZ1bmN0aW9uIGluc3RhbGxTZXJ2aWNlV29ya2VyRm9yT2ZmbGluZVN1cHBvcnQoKSB7XG4gIGlmICgnc2VydmljZVdvcmtlcicgaW4gbmF2aWdhdG9yKSB7XG4gICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoJ3NlcnZpY2Utd29ya2VyLmpzJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcShzZWxlY3Rvcikge1xuICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG59XG5cbmZ1bmN0aW9uIHdoZW5JbnB1dENoYW5nZXMoaW5wdXQsIGNoYW5nZUNhbGxiYWNrKSB7XG4gIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgY2hhbmdlQ2FsbGJhY2spO1xuICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgY2hhbmdlQ2FsbGJhY2spO1xuICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgY2hhbmdlQ2FsbGJhY2spO1xufVxuIiwiLyoqXG4gKiBBbGxvd3MgYXBwbGljYXRpb24gdG8gYWNjZXNzIGFuZCB1cGRhdGUgY3VycmVudCBhcHAgc3RhdGUgdmlhIHF1ZXJ5IHN0cmluZ1xuICovXG5tb2R1bGUuZXhwb3J0cyA9IHF1ZXJ5U3RhdGU7XG5cbnZhciBldmVudGlmeSA9IHJlcXVpcmUoJ25ncmFwaC5ldmVudHMnKTtcbnZhciB3aW5kb3dIYXNoSGlzdG9yeSA9IHJlcXVpcmUoJy4vbGliL3dpbmRvd0hhc2hIaXN0b3J5LmpzJyk7XG5cbi8qKlxuICogSnVzdCBhIGNvbnZlbmllbmNlIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBzaW5nbGV0b24gaW5zdGFuY2Ugb2YgYSBxdWVyeSBzdGF0ZVxuICovXG5xdWVyeVN0YXRlLmluc3RhbmNlID0gaW5zdGFuY2U7XG5cbi8vIHRoaXMgdmFyaWFibGUgaG9sZHMgc2luZ2xldG9uIGluc3RhbmNlIG9mIHRoZSBxdWVyeSBzdGF0ZVxudmFyIHNpbmdsZXRvblFTO1xuXG4vKipcbiAqIENyZWF0ZXMgbmV3IGluc3RhbmNlIG9mIHRoZSBxdWVyeSBzdGF0ZS5cbiAqL1xuZnVuY3Rpb24gcXVlcnlTdGF0ZShkZWZhdWx0cywgaGlzdG9yeSkge1xuICBoaXN0b3J5ID0gaGlzdG9yeSB8fCB3aW5kb3dIYXNoSGlzdG9yeShkZWZhdWx0cyk7XG4gIHZhbGlkYXRlSGlzdG9yeUFQSShoaXN0b3J5KTtcblxuICBoaXN0b3J5Lm9uQ2hhbmdlZCh1cGRhdGVRdWVyeSlcblxuICB2YXIgcXVlcnkgPSBoaXN0b3J5LmdldCgpIHx8IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgdmFyIGFwaSA9IHtcblxuICAgIC8qKlxuICAgICAqIEdldHMgY3VycmVudCBzdGF0ZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nP30ga2V5TmFtZSBpZiBwcmVzZW50IHRoZW4gdmFsdWUgZm9yIHRoaXMga2V5IGlzIHJldHVybmVkLlxuICAgICAqIE90aGVyd2lzZSB0aGUgZW50aXJlIGFwcCBzdGF0ZSBpcyByZXR1cm5lZC5cbiAgICAgKi9cbiAgICBnZXQ6IGdldFZhbHVlLFxuXG4gICAgLyoqXG4gICAgICogTWVyZ2VzIGN1cnJlbnQgYXBwIHN0YXRlIHdpdGggbmV3IGtleS92YWx1ZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgbmFtZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG51bWJlcnxkYXRlfSB2YWx1ZVxuICAgICAqL1xuICAgIHNldDogc2V0VmFsdWUsXG5cbiAgICAvKipcbiAgICAgKiBTaW1pbGFyIHRvIGBzZXQoKWAsIGJ1dCBvbmx5IHNldHMgdmFsdWUgaWYgaXQgd2FzIG5vdCBzZXQgYmVmb3JlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBuYW1lXG4gICAgICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyfGRhdGV9IHZhbHVlXG4gICAgICovXG4gICAgc2V0SWZFbXB0eTogc2V0SWZFbXB0eSxcblxuICAgIC8qKlxuICAgICAqIFJlbGVhc2VzIGFsbCByZXNvdXJjZXMgYWNxdWlyZWQgYnkgcXVlcnkgc3RhdGUuIEFmdGVyIGNhbGxpbmcgdGhpcyBtZXRob2RcbiAgICAgKiBubyBoYXNoIG1vbml0b3Jpbmcgd2lsbCBoYXBwZW4gYW5kIG5vIG1vcmUgZXZlbnRzIHdpbGwgYmUgZmlyZWQuXG4gICAgICovXG4gICAgZGlzcG9zZTogZGlzcG9zZSxcblxuICAgIG9uQ2hhbmdlOiBvbkNoYW5nZSxcbiAgICBvZmZDaGFuZ2U6IG9mZkNoYW5nZSxcblxuICAgIGdldEhpc3RvcnlPYmplY3Q6IGdldEhpc3RvcnlPYmplY3QsXG4gIH1cblxuICB2YXIgZXZlbnRCdXMgPSBldmVudGlmeSh7fSk7XG5cbiAgcmV0dXJuIGFwaTtcblxuICBmdW5jdGlvbiBvbkNoYW5nZShjYWxsYmFjaywgY3R4KSB7XG4gICAgZXZlbnRCdXMub24oJ2NoYW5nZScsIGNhbGxiYWNrLCBjdHgpO1xuICB9XG5cbiAgZnVuY3Rpb24gb2ZmQ2hhbmdlKGNhbGxiYWNrLCBjdHgpIHtcbiAgICBldmVudEJ1cy5vZmYoJ2NoYW5nZScsIGNhbGxiYWNrLCBjdHgpXG4gIH1cblxuICBmdW5jdGlvbiBnZXRIaXN0b3J5T2JqZWN0KCkge1xuICAgIHJldHVybiBoaXN0b3J5O1xuICB9XG5cbiAgZnVuY3Rpb24gZGlzcG9zZSgpIHtcbiAgICAvLyBkaXNwb3NlIGFsbCBoaXN0b3J5IGxpc3RlbmVyc1xuICAgIGhpc3RvcnkuZGlzcG9zZSgpO1xuXG4gICAgLy8gQW5kIHJlbW92ZSBvdXIgb3duIGxpc3RlbmVyc1xuICAgIGV2ZW50QnVzLm9mZigpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VmFsdWUoa2V5TmFtZSkge1xuICAgIGlmIChrZXlOYW1lID09PSB1bmRlZmluZWQpIHJldHVybiBxdWVyeTtcblxuICAgIHJldHVybiBxdWVyeVtrZXlOYW1lXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFZhbHVlKGtleU5hbWUsIHZhbHVlKSB7XG4gICAgdmFyIGtleU5hbWVUeXBlID0gdHlwZW9mIGtleU5hbWU7XG5cbiAgICBpZiAoa2V5TmFtZVR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICBPYmplY3Qua2V5cyhrZXlOYW1lKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBxdWVyeVtrZXldID0ga2V5TmFtZVtrZXldO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChrZXlOYW1lVHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHF1ZXJ5W2tleU5hbWVdID0gdmFsdWU7XG4gICAgfVxuXG4gICAgaGlzdG9yeS5zZXQocXVlcnkpO1xuXG4gICAgcmV0dXJuIGFwaTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZVF1ZXJ5KG5ld0FwcFN0YXRlKSB7XG4gICAgcXVlcnkgPSBuZXdBcHBTdGF0ZTtcbiAgICBldmVudEJ1cy5maXJlKCdjaGFuZ2UnLCBxdWVyeSk7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRJZkVtcHR5KGtleU5hbWUsIHZhbHVlKSB7XG4gICAgaWYgKHR5cGVvZiBrZXlOYW1lID09PSAnb2JqZWN0Jykge1xuICAgICAgT2JqZWN0LmtleXMoa2V5TmFtZSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgLy8gVE9ETzogQ2FuIEkgcmVtb3ZlIGNvZGUgZHVwbGljYXRpb24/IFRoZSBtYWluIHJlYXNvbiB3aHkgSSBkb24ndFxuICAgICAgICAvLyB3YW50IHJlY3Vyc2lvbiBoZXJlIGlzIHRvIGF2b2lkIHNwYW1taW5nIGBoaXN0b3J5LnNldCgpYFxuICAgICAgICBpZiAoa2V5IGluIHF1ZXJ5KSByZXR1cm47IC8vIGtleSBuYW1lIGlzIG5vdCBlbXB0eVxuXG4gICAgICAgIHF1ZXJ5W2tleV0gPSBrZXlOYW1lW2tleV07XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoa2V5TmFtZSBpbiBxdWVyeSkgcmV0dXJuOyAvLyBrZXkgbmFtZSBpcyBub3QgZW1wdHlcbiAgICBxdWVyeVtrZXlOYW1lXSA9IHZhbHVlO1xuXG4gICAgaGlzdG9yeS5zZXQocXVlcnkpO1xuXG4gICAgcmV0dXJuIGFwaTtcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgc2luZ2xldG9uIGluc3RhbmNlIG9mIHRoZSBxdWVyeSBzdGF0ZS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gZGVmYXVsdHMgLSBpZiBwcmVzZW50LCB0aGVuIGl0IGlzIHBhc3NlZCB0byB0aGUgY3VycmVudCBpbnN0YW5jZVxuICogb2YgdGhlIHF1ZXJ5IHN0YXRlLiBEZWZhdWx0cyBhcmUgYXBwbGllZCBvbmx5IGlmIHRoZXkgd2VyZSBub3QgcHJlc2VudCBiZWZvcmUuXG4gKi9cbmZ1bmN0aW9uIGluc3RhbmNlKGRlZmF1bHRzKSB7XG4gIGlmICghc2luZ2xldG9uUVMpIHtcbiAgICBzaW5nbGV0b25RUyA9IHF1ZXJ5U3RhdGUoZGVmYXVsdHMpO1xuICB9IGVsc2UgaWYgKGRlZmF1bHRzKSB7XG4gICAgc2luZ2xldG9uUVMuc2V0SWZFbXB0eShkZWZhdWx0cyk7XG4gIH1cblxuICByZXR1cm4gc2luZ2xldG9uUVM7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlSGlzdG9yeUFQSShoaXN0b3J5KSB7XG4gIGlmICghaGlzdG9yeSkgdGhyb3cgbmV3IEVycm9yKCdoaXN0b3J5IGlzIHJlcXVpcmVkJyk7XG4gIGlmICh0eXBlb2YgaGlzdG9yeS5kaXNwb3NlICE9PSAnZnVuY3Rpb24nKSB0aHJvdyBuZXcgRXJyb3IoJ2Rpc3Bvc2UgaXMgcmVxdWlyZWQnKTtcbiAgaWYgKHR5cGVvZiBoaXN0b3J5Lm9uQ2hhbmdlZCAhPT0gJ2Z1bmN0aW9uJykgdGhyb3cgbmV3IEVycm9yKCdvbkNoYW5nZWQgaXMgcmVxdWlyZWQnKTtcbn1cbiIsIi8qKlxuICogUHJvdmlkZXMgYSBgbnVsbGAgb2JqZWN0IHRoYXQgbWF0Y2hlcyBoaXN0b3J5IEFQSVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGluTWVtb3J5SGlzdG9yeTtcblxuZnVuY3Rpb24gaW5NZW1vcnlIaXN0b3J5KGRlZmF1bHRzKSB7XG4gIHZhciBsaXN0ZW5lcnMgPSBbXTtcbiAgdmFyIGxhc3RRdWVyeU9iamVjdCA9IGRlZmF1bHRzO1xuXG4gIHJldHVybiB7XG4gICAgZGlzcG9zZTogZGlzcG9zZSxcbiAgICBvbkNoYW5nZWQ6IG9uQ2hhbmdlZCxcbiAgICBzZXQ6IHNldCxcbiAgICBnZXQ6IGdldFxuICB9O1xuXG4gIGZ1bmN0aW9uIGdldCgpIHtcbiAgICByZXR1cm4gbGFzdFF1ZXJ5T2JqZWN0O1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0KG5ld1F1ZXJ5T2JqZWN0KSB7XG4gICAgbGFzdFF1ZXJ5T2JqZWN0ID0gbmV3UXVlcnlPYmplY3Q7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHRyaWdnZXJDaGFuZ2UobmV3UXVlcnlPYmplY3QpO1xuICAgIH0sIDApO1xuICB9XG5cbiAgZnVuY3Rpb24gZGlzcG9zZSgpIHtcbiAgICBsaXN0ZW5lcnMgPSBbXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uQ2hhbmdlZChjaGFuZ2VDYWxsYmFjaykge1xuICAgIGlmICh0eXBlb2YgY2hhbmdlQ2FsbGJhY2sgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignY2hhbmdlQ2FsbGJhY2sgc2hvdWxkIGJlIGEgZnVuY3Rpb24nKVxuICAgIH1cblxuICAgIGxpc3RlbmVycy5wdXNoKGNoYW5nZUNhbGxiYWNrKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyaWdnZXJDaGFuZ2UoYXBwU3RhdGUpIHtcbiAgICBsaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbihsaXN0ZW5lcikge1xuICAgICAgbGlzdGVuZXIoYXBwU3RhdGUpO1xuICAgIH0pO1xuICB9XG59XG4iLCIvKipcbiAqIFRoaXMgbW9kdWxlIGlzIHNpbWlsYXIgdG8gSlNPTiwgYnV0IGl0IGVuY29kZXMvZGVjb2RlcyBpbiBxdWVyeSBzdHJpbmdcbiAqIGZvcm1hdCBga2V5MT12YWx1ZTEuLi5gXG4gKi9cbm1vZHVsZS5leHBvcnRzID0ge1xuICBwYXJzZTogcGFyc2UsXG4gIHN0cmluZ2lmeTogc3RyaW5naWZ5XG59O1xuXG5mdW5jdGlvbiBzdHJpbmdpZnkob2JqZWN0KSB7XG4gIGlmICghb2JqZWN0KSByZXR1cm4gJyc7XG5cbiAgcmV0dXJuIE9iamVjdC5rZXlzKG9iamVjdCkubWFwKHRvUGFpcnMpLmpvaW4oJyYnKTtcblxuICBmdW5jdGlvbiB0b1BhaXJzKGtleSkge1xuICAgIHZhciB2YWx1ZSA9IG9iamVjdFtrZXldO1xuICAgIHZhciBwYWlyID0gZW5jb2RlVVJJQ29tcG9uZW50KGtleSk7XG4gICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHBhaXIgKz0gJz0nICsgZW5jb2RlVmFsdWUodmFsdWUpO1xuICAgIH1cblxuICAgIHJldHVybiBwYWlyO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBhcnNlKHF1ZXJ5U3RyaW5nKSB7XG4gIHZhciBxdWVyeSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgaWYgKCFxdWVyeVN0cmluZykgcmV0dXJuIHF1ZXJ5O1xuXG4gIHF1ZXJ5U3RyaW5nLnNwbGl0KCcmJykuZm9yRWFjaChkZWNvZGVSZWNvcmQpO1xuXG4gIHJldHVybiBxdWVyeTtcblxuICBmdW5jdGlvbiBkZWNvZGVSZWNvcmQocXVlcnlSZWNvcmQpIHtcbiAgICBpZiAoIXF1ZXJ5UmVjb3JkKSByZXR1cm47XG5cbiAgICB2YXIgcGFpciA9IHF1ZXJ5UmVjb3JkLnNwbGl0KCc9Jyk7XG4gICAgcXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KHBhaXJbMF0pXSA9IGRlY29kZVZhbHVlKHBhaXJbMV0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGVuY29kZVZhbHVlKHZhbHVlKSB7XG4gIC8vIFRPRE86IERvIEkgbmVlZCB0aGlzP1xuICAvLyBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAvLyAgIGlmICh2YWx1ZS5tYXRjaCgvXih0cnVlfGZhbHNlKSQvKSkge1xuICAvLyAgICAgLy8gc3BlY2lhbCBoYW5kbGluZyBvZiBzdHJpbmdzIHRoYXQgbG9vayBsaWtlIGJvb2xlYW5zXG4gIC8vICAgICB2YWx1ZSA9IEpTT04uc3RyaW5naWZ5KCcnICsgdmFsdWUpO1xuICAvLyAgIH0gZWxzZSBpZiAodmFsdWUubWF0Y2goL14tP1xcZCtcXC4/XFxkKiQvKSkge1xuICAvLyAgICAgLy8gc3BlY2lhbCBoYW5kbGluZyBvZiBzdHJpbmdzIHRoYXQgbG9vayBsaWtlIG51bWJlcnNcbiAgLy8gICAgIHZhbHVlID0gSlNPTi5zdHJpbmdpZnkoJycgKyB2YWx1ZSk7XG4gIC8vICAgfVxuICAvLyB9XG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICB2YWx1ZSA9IHZhbHVlLnRvSVNPU3RyaW5nKCk7XG4gIH1cbiAgdmFyIHVyaVZhbHVlID0gZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcbiAgcmV0dXJuIHVyaVZhbHVlO1xufVxuXG4vKipcbiAqIFRoaXMgbWV0aG9kIHJldHVybnMgdHlwZWQgdmFsdWUgZnJvbSBzdHJpbmdcbiAqL1xuZnVuY3Rpb24gZGVjb2RlVmFsdWUodmFsdWUpIHtcbiAgdmFsdWUgPSBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuXG4gIGlmICh2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuICBpZiAoIWlzTmFOKHZhbHVlKSkgcmV0dXJuIHBhcnNlRmxvYXQodmFsdWUpO1xuICBpZiAoaXNCb2xlYW4odmFsdWUpKSByZXR1cm4gdmFsdWUgPT09ICd0cnVlJztcbiAgaWYgKGlzSVNPRGF0ZVN0cmluZyh2YWx1ZSkpIHJldHVybiBuZXcgRGF0ZSh2YWx1ZSk7XG5cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBpc0JvbGVhbihzdHJWYWx1ZSkge1xuICByZXR1cm4gc3RyVmFsdWUgPT09ICd0cnVlJyB8fCBzdHJWYWx1ZSA9PT0gJ2ZhbHNlJztcbn1cblxuZnVuY3Rpb24gaXNJU09EYXRlU3RyaW5nKHN0cikge1xuICByZXR1cm4gc3RyICYmIHN0ci5tYXRjaCgvKFxcZHs0fS1bMDFdXFxkLVswLTNdXFxkVFswLTJdXFxkOlswLTVdXFxkOlswLTVdXFxkXFwuXFxkKyhbKy1dWzAtMl1cXGQ6WzAtNV1cXGR8WikpfChcXGR7NH0tWzAxXVxcZC1bMC0zXVxcZFRbMC0yXVxcZDpbMC01XVxcZDpbMC01XVxcZChbKy1dWzAtMl1cXGQ6WzAtNV1cXGR8WikpfChcXGR7NH0tWzAxXVxcZC1bMC0zXVxcZFRbMC0yXVxcZDpbMC01XVxcZChbKy1dWzAtMl1cXGQ6WzAtNV1cXGR8WikpLylcbn1cbiIsIi8qKlxuICogVXNlcyBgd2luZG93YCB0byBtb25pdG9yIGhhc2ggYW5kIHVwZGF0ZSBoYXNoXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gd2luZG93SGlzdG9yeTtcblxudmFyIGluTWVtb3J5SGlzdG9yeSA9IHJlcXVpcmUoJy4vaW5NZW1vcnlIaXN0b3J5LmpzJyk7XG52YXIgcXVlcnkgPSByZXF1aXJlKCcuL3F1ZXJ5LmpzJyk7XG5cbmZ1bmN0aW9uIHdpbmRvd0hpc3RvcnkoZGVmYXVsdHMpIHtcbiAgLy8gSWYgd2UgZG9uJ3Qgc3VwcG9ydCB3aW5kb3csIHdlIGFyZSBwcm9iYWJseSBydW5uaW5nIGluIG5vZGUuIEp1c3QgcmV0dXJuXG4gIC8vIGluIG1lbW9yeSBoaXN0b3J5XG4gIGlmICh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJykgcmV0dXJuIGluTWVtb3J5SGlzdG9yeShkZWZhdWx0cyk7XG5cbiAgLy8gU3RvcmUgYWxsIGBvbkNoYW5nZWQoKWAgbGlzdGVuZXJzIGhlcmUsIHNvIHRoYXQgd2UgY2FuIGhhdmUganVzdCBvbmVcbiAgLy8gYGhhc2hjaGFuZ2VgIGxpc3RlbmVyLCBhbmQgbm90aWZ5IG9uZSBsaXN0ZW5lcnMgd2l0aGluIHNpbmdsZSBldmVudC5cbiAgdmFyIGxpc3RlbmVycyA9IFtdO1xuXG4gIC8vIFRoaXMgcHJlZml4IGlzIHVzZWQgZm9yIGFsbCBxdWVyeSBzdHJpbmdzLiBTbyBvdXIgc3RhdGUgaXMgc3RvcmVkIGFzXG4gIC8vIG15LWFwcC5jb20vIz9rZXk9dmFsdWVcbiAgdmFyIGhhc2hQcmVmaXggPSAnIz8nO1xuXG4gIGluaXQoKTtcblxuICAvLyBUaGlzIGlzIG91ciBwdWJsaWMgQVBJOlxuICByZXR1cm4ge1xuICAgIC8qKlxuICAgICAqIEFkZHMgY2FsbGJhY2sgdGhhdCBpcyBjYWxsZWQgd2hlbiBoYXNoIGNoYW5nZSBoYXBwZW4uIENhbGxiYWNrIHJlY2VpdmVzXG4gICAgICogY3VycmVudCBoYXNoIHN0cmluZyB3aXRoIGAjP2Agc2lnblxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNoYW5nZUNhbGxiYWNrIC0gYSBmdW5jdGlvbiB0aGF0IGlzIGNhbGxlZCB3aGVuIGhhc2ggaXNcbiAgICAgKiBjaGFuZ2VkLiBDYWxsYmFjayBnZXRzIG9uZSBhcmd1bWVudCB0aGF0IHJlcHJlc2VudHMgdGhlIG5ldyBzdGF0ZS5cbiAgICAgKi9cbiAgICBvbkNoYW5nZWQ6IG9uQ2hhbmdlZCxcblxuICAgIC8qKlxuICAgICAqIFJlbGVhc2VzIGFsbCByZXNvdXJjZXNcbiAgICAgKi9cbiAgICBkaXNwb3NlOiBkaXNwb3NlLFxuXG4gICAgLyoqXG4gICAgICogU2V0cyBhIG5ldyBhcHAgc3RhdGVcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBhcHBTdGF0ZSAtIHRoZSBuZXcgYXBwbGljYXRpb24gc3RhdGUsIHRoYXQgc2hvdWxkIGJlXG4gICAgICogcGVyc2lzdGVkIGluIHRoZSBoYXNoIHN0cmluZ1xuICAgICAqL1xuICAgIHNldDogc2V0LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBjdXJyZW50IGFwcCBzdGF0ZVxuICAgICAqL1xuICAgIGdldDogZ2V0U3RhdGVGcm9tSGFzaFxuICB9O1xuXG4gIC8vIFB1YmxpYyBBUEkgaXMgb3Zlci4gWW91IGNhbiBpZ25vcmUgdGhpcyBwYXJ0LlxuXG4gIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgdmFyIHN0YXRlRnJvbUhhc2ggPSBnZXRTdGF0ZUZyb21IYXNoKCk7XG4gICAgdmFyIHN0YXRlQ2hhbmdlZCA9IGZhbHNlO1xuXG4gICAgaWYgKHR5cGVvZiBkZWZhdWx0cyA9PT0gJ29iamVjdCcgJiYgZGVmYXVsdHMpIHtcbiAgICAgIE9iamVjdC5rZXlzKGRlZmF1bHRzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBpZiAoa2V5IGluIHN0YXRlRnJvbUhhc2gpIHJldHVybjtcblxuICAgICAgICBzdGF0ZUZyb21IYXNoW2tleV0gPSBkZWZhdWx0c1trZXldXG4gICAgICAgIHN0YXRlQ2hhbmdlZCA9IHRydWU7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoc3RhdGVDaGFuZ2VkKSBzZXQoc3RhdGVGcm9tSGFzaCk7XG4gIH1cblxuICBmdW5jdGlvbiBzZXQoYXBwU3RhdGUpIHtcbiAgICB2YXIgaGFzaCA9IGhhc2hQcmVmaXggKyBxdWVyeS5zdHJpbmdpZnkoYXBwU3RhdGUpO1xuXG4gICAgaWYgKHdpbmRvdy5oaXN0b3J5KSB7XG4gICAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUodW5kZWZpbmVkLCB1bmRlZmluZWQsIGhhc2gpO1xuICAgIH0gZWxzZSB7XG4gICAgICB3aW5kb3cubG9jYXRpb24ucmVwbGFjZShoYXNoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBvbkNoYW5nZWQoY2hhbmdlQ2FsbGJhY2spIHtcbiAgICBpZiAodHlwZW9mIGNoYW5nZUNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB0aHJvdyBuZXcgRXJyb3IoJ2NoYW5nZUNhbGxiYWNrIG5lZWRzIHRvIGJlIGEgZnVuY3Rpb24nKTtcblxuICAgIC8vIHdlIHN0YXJ0IGxpc3RlbiBqdXN0IG9uY2UsIG9ubHkgaWYgd2UgZGlkbid0IGxpc3RlbiBiZWZvcmU6XG4gICAgaWYgKGxpc3RlbmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdoYXNoY2hhbmdlJywgb25IYXNoQ2hhbmdlZCwgZmFsc2UpO1xuICAgIH1cblxuICAgIGxpc3RlbmVycy5wdXNoKGNoYW5nZUNhbGxiYWNrKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XG4gICAgaWYgKGxpc3RlbmVycy5sZW5ndGggPT09IDApIHJldHVybjsgLy8gbm8gbmVlZCB0byBkbyBhbnl0aGluZy5cblxuICAgIC8vIExldCBnYXJiYWdlIGNvbGxlY3RvciBjb2xsZWN0IGFsbCBsaXN0ZW5lcnM7XG4gICAgbGlzdGVuZXJzID0gW107XG5cbiAgICAvLyBBbmQgcmVsZWFzZSBoYXNoIGNoYW5nZSBldmVudDpcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignaGFzaGNoYW5nZScsIG9uSGFzaENoYW5nZWQsIGZhbHNlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uSGFzaENoYW5nZWQoKSB7XG4gICAgdmFyIGFwcFN0YXRlID0gZ2V0U3RhdGVGcm9tSGFzaCgpO1xuICAgIG5vdGlmeUxpc3RlbmVycyhhcHBTdGF0ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBub3RpZnlMaXN0ZW5lcnMoYXBwU3RhdGUpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3RlbmVycy5sZW5ndGg7ICsraSkge1xuICAgICAgdmFyIGxpc3RlbmVyID0gbGlzdGVuZXJzW2ldO1xuICAgICAgbGlzdGVuZXIoYXBwU3RhdGUpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFN0YXRlRnJvbUhhc2goKSB7XG4gICAgdmFyIHF1ZXJ5U3RyaW5nID0gKHdpbmRvdy5sb2NhdGlvbi5oYXNoIHx8IGhhc2hQcmVmaXgpLnN1YnN0cihoYXNoUHJlZml4Lmxlbmd0aCk7XG5cbiAgICByZXR1cm4gcXVlcnkucGFyc2UocXVlcnlTdHJpbmcpO1xuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHN1YmplY3QpIHtcbiAgdmFsaWRhdGVTdWJqZWN0KHN1YmplY3QpO1xuXG4gIHZhciBldmVudHNTdG9yYWdlID0gY3JlYXRlRXZlbnRzU3RvcmFnZShzdWJqZWN0KTtcbiAgc3ViamVjdC5vbiA9IGV2ZW50c1N0b3JhZ2Uub247XG4gIHN1YmplY3Qub2ZmID0gZXZlbnRzU3RvcmFnZS5vZmY7XG4gIHN1YmplY3QuZmlyZSA9IGV2ZW50c1N0b3JhZ2UuZmlyZTtcbiAgcmV0dXJuIHN1YmplY3Q7XG59O1xuXG5mdW5jdGlvbiBjcmVhdGVFdmVudHNTdG9yYWdlKHN1YmplY3QpIHtcbiAgLy8gU3RvcmUgYWxsIGV2ZW50IGxpc3RlbmVycyB0byB0aGlzIGhhc2guIEtleSBpcyBldmVudCBuYW1lLCB2YWx1ZSBpcyBhcnJheVxuICAvLyBvZiBjYWxsYmFjayByZWNvcmRzLlxuICAvL1xuICAvLyBBIGNhbGxiYWNrIHJlY29yZCBjb25zaXN0cyBvZiBjYWxsYmFjayBmdW5jdGlvbiBhbmQgaXRzIG9wdGlvbmFsIGNvbnRleHQ6XG4gIC8vIHsgJ2V2ZW50TmFtZScgPT4gW3tjYWxsYmFjazogZnVuY3Rpb24sIGN0eDogb2JqZWN0fV0gfVxuICB2YXIgcmVnaXN0ZXJlZEV2ZW50cyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgcmV0dXJuIHtcbiAgICBvbjogZnVuY3Rpb24gKGV2ZW50TmFtZSwgY2FsbGJhY2ssIGN0eCkge1xuICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NhbGxiYWNrIGlzIGV4cGVjdGVkIHRvIGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgIH1cbiAgICAgIHZhciBoYW5kbGVycyA9IHJlZ2lzdGVyZWRFdmVudHNbZXZlbnROYW1lXTtcbiAgICAgIGlmICghaGFuZGxlcnMpIHtcbiAgICAgICAgaGFuZGxlcnMgPSByZWdpc3RlcmVkRXZlbnRzW2V2ZW50TmFtZV0gPSBbXTtcbiAgICAgIH1cbiAgICAgIGhhbmRsZXJzLnB1c2goe2NhbGxiYWNrOiBjYWxsYmFjaywgY3R4OiBjdHh9KTtcblxuICAgICAgcmV0dXJuIHN1YmplY3Q7XG4gICAgfSxcblxuICAgIG9mZjogZnVuY3Rpb24gKGV2ZW50TmFtZSwgY2FsbGJhY2spIHtcbiAgICAgIHZhciB3YW50VG9SZW1vdmVBbGwgPSAodHlwZW9mIGV2ZW50TmFtZSA9PT0gJ3VuZGVmaW5lZCcpO1xuICAgICAgaWYgKHdhbnRUb1JlbW92ZUFsbCkge1xuICAgICAgICAvLyBLaWxsaW5nIG9sZCBldmVudHMgc3RvcmFnZSBzaG91bGQgYmUgZW5vdWdoIGluIHRoaXMgY2FzZTpcbiAgICAgICAgcmVnaXN0ZXJlZEV2ZW50cyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICAgIHJldHVybiBzdWJqZWN0O1xuICAgICAgfVxuXG4gICAgICBpZiAocmVnaXN0ZXJlZEV2ZW50c1tldmVudE5hbWVdKSB7XG4gICAgICAgIHZhciBkZWxldGVBbGxDYWxsYmFja3NGb3JFdmVudCA9ICh0eXBlb2YgY2FsbGJhY2sgIT09ICdmdW5jdGlvbicpO1xuICAgICAgICBpZiAoZGVsZXRlQWxsQ2FsbGJhY2tzRm9yRXZlbnQpIHtcbiAgICAgICAgICBkZWxldGUgcmVnaXN0ZXJlZEV2ZW50c1tldmVudE5hbWVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBjYWxsYmFja3MgPSByZWdpc3RlcmVkRXZlbnRzW2V2ZW50TmFtZV07XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjYWxsYmFja3MubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGlmIChjYWxsYmFja3NbaV0uY2FsbGJhY2sgPT09IGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrcy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzdWJqZWN0O1xuICAgIH0sXG5cbiAgICBmaXJlOiBmdW5jdGlvbiAoZXZlbnROYW1lKSB7XG4gICAgICB2YXIgY2FsbGJhY2tzID0gcmVnaXN0ZXJlZEV2ZW50c1tldmVudE5hbWVdO1xuICAgICAgaWYgKCFjYWxsYmFja3MpIHtcbiAgICAgICAgcmV0dXJuIHN1YmplY3Q7XG4gICAgICB9XG5cbiAgICAgIHZhciBmaXJlQXJndW1lbnRzO1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZpcmVBcmd1bWVudHMgPSBBcnJheS5wcm90b3R5cGUuc3BsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgIH1cbiAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBjYWxsYmFja3MubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIGNhbGxiYWNrSW5mbyA9IGNhbGxiYWNrc1tpXTtcbiAgICAgICAgY2FsbGJhY2tJbmZvLmNhbGxiYWNrLmFwcGx5KGNhbGxiYWNrSW5mby5jdHgsIGZpcmVBcmd1bWVudHMpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gc3ViamVjdDtcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlU3ViamVjdChzdWJqZWN0KSB7XG4gIGlmICghc3ViamVjdCkge1xuICAgIHRocm93IG5ldyBFcnJvcignRXZlbnRpZnkgY2Fubm90IHVzZSBmYWxzeSBvYmplY3QgYXMgZXZlbnRzIHN1YmplY3QnKTtcbiAgfVxuICB2YXIgcmVzZXJ2ZWRXb3JkcyA9IFsnb24nLCAnZmlyZScsICdvZmYnXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXNlcnZlZFdvcmRzLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKHN1YmplY3QuaGFzT3duUHJvcGVydHkocmVzZXJ2ZWRXb3Jkc1tpXSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlN1YmplY3QgY2Fubm90IGJlIGV2ZW50aWZpZWQsIHNpbmNlIGl0IGFscmVhZHkgaGFzIHByb3BlcnR5ICdcIiArIHJlc2VydmVkV29yZHNbaV0gKyBcIidcIik7XG4gICAgfVxuICB9XG59XG4iXX0=
