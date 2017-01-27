(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
}

var queryState = require('query-state');
var emailInput = document.getElementById('email-input')
var sendLink = document.getElementById('send-link')
var defaultState = {
  label: 'Send to Future Self'
};
var qs = queryState(defaultState);
var initialAppState = qs.get();
// Initialize input box with current app state:
updateInputBox(initialAppState);
setFocus(initialAppState);
// and listen to all events from query state:
qs.onChange(updateInputBox);

// When input changes, we update query state too!
emailInput.addEventListener('keyup', updateQueryState);
emailInput.addEventListener('blur', updateQueryState);
emailInput.addEventListener('keydown', updateQueryState);

function updateQueryState(e) {
  qs.set('email', emailInput.value);
  updateLink(emailInput.value);
}

function updateInputBox(appState) {
  emailInput.value = appState.email || '';
  sendLink.innerText = appState.label || '';
  document.title = appState.label || defaultState.label;
  updateLink(emailInput.value);
}

function updateLink(email) {
  sendLink.href = ('mailto:' + email) || ''
  if (email.indexOf('@') > -1) { // very naive email validator.
    sendLink.classList.remove('disabled');
  } else {
    sendLink.classList.add('disabled');
  }
}


function setFocus(appState) {
  if (appState.email) return; // no need to change focus if email is here

  emailInput.focus();

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy5ucG0tZ2xvYmFsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiaW5kZXguanMiLCIuLi8uLi9xdWVyeS1zdGF0ZS9pbmRleC5qcyIsIi4uLy4uL3F1ZXJ5LXN0YXRlL2xpYi9pbk1lbW9yeUhpc3RvcnkuanMiLCIuLi8uLi9xdWVyeS1zdGF0ZS9saWIvcXVlcnkuanMiLCIuLi8uLi9xdWVyeS1zdGF0ZS9saWIvd2luZG93SGFzaEhpc3RvcnkuanMiLCIuLi8uLi9xdWVyeS1zdGF0ZS9ub2RlX21vZHVsZXMvbmdyYXBoLmV2ZW50cy9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImlmICgnc2VydmljZVdvcmtlcicgaW4gbmF2aWdhdG9yKSB7XG4gIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyKCdzZXJ2aWNlLXdvcmtlci5qcycpO1xufVxuXG52YXIgcXVlcnlTdGF0ZSA9IHJlcXVpcmUoJ3F1ZXJ5LXN0YXRlJyk7XG52YXIgZW1haWxJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdlbWFpbC1pbnB1dCcpXG52YXIgc2VuZExpbmsgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2VuZC1saW5rJylcbnZhciBkZWZhdWx0U3RhdGUgPSB7XG4gIGxhYmVsOiAnU2VuZCB0byBGdXR1cmUgU2VsZidcbn07XG52YXIgcXMgPSBxdWVyeVN0YXRlKGRlZmF1bHRTdGF0ZSk7XG52YXIgaW5pdGlhbEFwcFN0YXRlID0gcXMuZ2V0KCk7XG4vLyBJbml0aWFsaXplIGlucHV0IGJveCB3aXRoIGN1cnJlbnQgYXBwIHN0YXRlOlxudXBkYXRlSW5wdXRCb3goaW5pdGlhbEFwcFN0YXRlKTtcbnNldEZvY3VzKGluaXRpYWxBcHBTdGF0ZSk7XG4vLyBhbmQgbGlzdGVuIHRvIGFsbCBldmVudHMgZnJvbSBxdWVyeSBzdGF0ZTpcbnFzLm9uQ2hhbmdlKHVwZGF0ZUlucHV0Qm94KTtcblxuLy8gV2hlbiBpbnB1dCBjaGFuZ2VzLCB3ZSB1cGRhdGUgcXVlcnkgc3RhdGUgdG9vIVxuZW1haWxJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIHVwZGF0ZVF1ZXJ5U3RhdGUpO1xuZW1haWxJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgdXBkYXRlUXVlcnlTdGF0ZSk7XG5lbWFpbElucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB1cGRhdGVRdWVyeVN0YXRlKTtcblxuZnVuY3Rpb24gdXBkYXRlUXVlcnlTdGF0ZShlKSB7XG4gIHFzLnNldCgnZW1haWwnLCBlbWFpbElucHV0LnZhbHVlKTtcbiAgdXBkYXRlTGluayhlbWFpbElucHV0LnZhbHVlKTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlSW5wdXRCb3goYXBwU3RhdGUpIHtcbiAgZW1haWxJbnB1dC52YWx1ZSA9IGFwcFN0YXRlLmVtYWlsIHx8ICcnO1xuICBzZW5kTGluay5pbm5lclRleHQgPSBhcHBTdGF0ZS5sYWJlbCB8fCAnJztcbiAgZG9jdW1lbnQudGl0bGUgPSBhcHBTdGF0ZS5sYWJlbCB8fCBkZWZhdWx0U3RhdGUubGFiZWw7XG4gIHVwZGF0ZUxpbmsoZW1haWxJbnB1dC52YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUxpbmsoZW1haWwpIHtcbiAgc2VuZExpbmsuaHJlZiA9ICgnbWFpbHRvOicgKyBlbWFpbCkgfHwgJydcbiAgaWYgKGVtYWlsLmluZGV4T2YoJ0AnKSA+IC0xKSB7IC8vIHZlcnkgbmFpdmUgZW1haWwgdmFsaWRhdG9yLlxuICAgIHNlbmRMaW5rLmNsYXNzTGlzdC5yZW1vdmUoJ2Rpc2FibGVkJyk7XG4gIH0gZWxzZSB7XG4gICAgc2VuZExpbmsuY2xhc3NMaXN0LmFkZCgnZGlzYWJsZWQnKTtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHNldEZvY3VzKGFwcFN0YXRlKSB7XG4gIGlmIChhcHBTdGF0ZS5lbWFpbCkgcmV0dXJuOyAvLyBubyBuZWVkIHRvIGNoYW5nZSBmb2N1cyBpZiBlbWFpbCBpcyBoZXJlXG5cbiAgZW1haWxJbnB1dC5mb2N1cygpO1xuXG59XG4iLCIvKipcbiAqIEFsbG93cyBhcHBsaWNhdGlvbiB0byBhY2Nlc3MgYW5kIHVwZGF0ZSBjdXJyZW50IGFwcCBzdGF0ZSB2aWEgcXVlcnkgc3RyaW5nXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gcXVlcnlTdGF0ZTtcblxudmFyIGV2ZW50aWZ5ID0gcmVxdWlyZSgnbmdyYXBoLmV2ZW50cycpO1xudmFyIHdpbmRvd0hhc2hIaXN0b3J5ID0gcmVxdWlyZSgnLi9saWIvd2luZG93SGFzaEhpc3RvcnkuanMnKTtcblxuLyoqXG4gKiBKdXN0IGEgY29udmVuaWVuY2UgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHNpbmdsZXRvbiBpbnN0YW5jZSBvZiBhIHF1ZXJ5IHN0YXRlXG4gKi9cbnF1ZXJ5U3RhdGUuaW5zdGFuY2UgPSBpbnN0YW5jZTtcblxuLy8gdGhpcyB2YXJpYWJsZSBob2xkcyBzaW5nbGV0b24gaW5zdGFuY2Ugb2YgdGhlIHF1ZXJ5IHN0YXRlXG52YXIgc2luZ2xldG9uUVM7XG5cbi8qKlxuICogQ3JlYXRlcyBuZXcgaW5zdGFuY2Ugb2YgdGhlIHF1ZXJ5IHN0YXRlLlxuICovXG5mdW5jdGlvbiBxdWVyeVN0YXRlKGRlZmF1bHRzLCBoaXN0b3J5KSB7XG4gIGhpc3RvcnkgPSBoaXN0b3J5IHx8IHdpbmRvd0hhc2hIaXN0b3J5KGRlZmF1bHRzKTtcbiAgdmFsaWRhdGVIaXN0b3J5QVBJKGhpc3RvcnkpO1xuXG4gIGhpc3Rvcnkub25DaGFuZ2VkKHVwZGF0ZVF1ZXJ5KVxuXG4gIHZhciBxdWVyeSA9IGhpc3RvcnkuZ2V0KCkgfHwgT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICB2YXIgYXBpID0ge1xuXG4gICAgLyoqXG4gICAgICogR2V0cyBjdXJyZW50IHN0YXRlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmc/fSBrZXlOYW1lIGlmIHByZXNlbnQgdGhlbiB2YWx1ZSBmb3IgdGhpcyBrZXkgaXMgcmV0dXJuZWQuXG4gICAgICogT3RoZXJ3aXNlIHRoZSBlbnRpcmUgYXBwIHN0YXRlIGlzIHJldHVybmVkLlxuICAgICAqL1xuICAgIGdldDogZ2V0VmFsdWUsXG5cbiAgICAvKipcbiAgICAgKiBNZXJnZXMgY3VycmVudCBhcHAgc3RhdGUgd2l0aCBuZXcga2V5L3ZhbHVlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBuYW1lXG4gICAgICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyfGRhdGV9IHZhbHVlXG4gICAgICovXG4gICAgc2V0OiBzZXRWYWx1ZSxcblxuICAgIC8qKlxuICAgICAqIFNpbWlsYXIgdG8gYHNldCgpYCwgYnV0IG9ubHkgc2V0cyB2YWx1ZSBpZiBpdCB3YXMgbm90IHNldCBiZWZvcmUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IG5hbWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xudW1iZXJ8ZGF0ZX0gdmFsdWVcbiAgICAgKi9cbiAgICBzZXRJZkVtcHR5OiBzZXRJZkVtcHR5LFxuXG4gICAgLyoqXG4gICAgICogUmVsZWFzZXMgYWxsIHJlc291cmNlcyBhY3F1aXJlZCBieSBxdWVyeSBzdGF0ZS4gQWZ0ZXIgY2FsbGluZyB0aGlzIG1ldGhvZFxuICAgICAqIG5vIGhhc2ggbW9uaXRvcmluZyB3aWxsIGhhcHBlbiBhbmQgbm8gbW9yZSBldmVudHMgd2lsbCBiZSBmaXJlZC5cbiAgICAgKi9cbiAgICBkaXNwb3NlOiBkaXNwb3NlLFxuXG4gICAgb25DaGFuZ2U6IG9uQ2hhbmdlLFxuICAgIG9mZkNoYW5nZTogb2ZmQ2hhbmdlLFxuXG4gICAgZ2V0SGlzdG9yeU9iamVjdDogZ2V0SGlzdG9yeU9iamVjdCxcbiAgfVxuXG4gIHZhciBldmVudEJ1cyA9IGV2ZW50aWZ5KHt9KTtcblxuICByZXR1cm4gYXBpO1xuXG4gIGZ1bmN0aW9uIG9uQ2hhbmdlKGNhbGxiYWNrLCBjdHgpIHtcbiAgICBldmVudEJ1cy5vbignY2hhbmdlJywgY2FsbGJhY2ssIGN0eCk7XG4gIH1cblxuICBmdW5jdGlvbiBvZmZDaGFuZ2UoY2FsbGJhY2ssIGN0eCkge1xuICAgIGV2ZW50QnVzLm9mZignY2hhbmdlJywgY2FsbGJhY2ssIGN0eClcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEhpc3RvcnlPYmplY3QoKSB7XG4gICAgcmV0dXJuIGhpc3Rvcnk7XG4gIH1cblxuICBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgIC8vIGRpc3Bvc2UgYWxsIGhpc3RvcnkgbGlzdGVuZXJzXG4gICAgaGlzdG9yeS5kaXNwb3NlKCk7XG5cbiAgICAvLyBBbmQgcmVtb3ZlIG91ciBvd24gbGlzdGVuZXJzXG4gICAgZXZlbnRCdXMub2ZmKCk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRWYWx1ZShrZXlOYW1lKSB7XG4gICAgaWYgKGtleU5hbWUgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHF1ZXJ5O1xuXG4gICAgcmV0dXJuIHF1ZXJ5W2tleU5hbWVdO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0VmFsdWUoa2V5TmFtZSwgdmFsdWUpIHtcbiAgICB2YXIga2V5TmFtZVR5cGUgPSB0eXBlb2Yga2V5TmFtZTtcblxuICAgIGlmIChrZXlOYW1lVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIE9iamVjdC5rZXlzKGtleU5hbWUpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHF1ZXJ5W2tleV0gPSBrZXlOYW1lW2tleV07XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGtleU5hbWVUeXBlID09PSAnc3RyaW5nJykge1xuICAgICAgcXVlcnlba2V5TmFtZV0gPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBoaXN0b3J5LnNldChxdWVyeSk7XG5cbiAgICByZXR1cm4gYXBpO1xuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlUXVlcnkobmV3QXBwU3RhdGUpIHtcbiAgICBxdWVyeSA9IG5ld0FwcFN0YXRlO1xuICAgIGV2ZW50QnVzLmZpcmUoJ2NoYW5nZScsIHF1ZXJ5KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldElmRW1wdHkoa2V5TmFtZSwgdmFsdWUpIHtcbiAgICBpZiAodHlwZW9mIGtleU5hbWUgPT09ICdvYmplY3QnKSB7XG4gICAgICBPYmplY3Qua2V5cyhrZXlOYW1lKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAvLyBUT0RPOiBDYW4gSSByZW1vdmUgY29kZSBkdXBsaWNhdGlvbj8gVGhlIG1haW4gcmVhc29uIHdoeSBJIGRvbid0XG4gICAgICAgIC8vIHdhbnQgcmVjdXJzaW9uIGhlcmUgaXMgdG8gYXZvaWQgc3BhbW1pbmcgYGhpc3Rvcnkuc2V0KClgXG4gICAgICAgIGlmIChrZXkgaW4gcXVlcnkpIHJldHVybjsgLy8ga2V5IG5hbWUgaXMgbm90IGVtcHR5XG5cbiAgICAgICAgcXVlcnlba2V5XSA9IGtleU5hbWVba2V5XTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChrZXlOYW1lIGluIHF1ZXJ5KSByZXR1cm47IC8vIGtleSBuYW1lIGlzIG5vdCBlbXB0eVxuICAgIHF1ZXJ5W2tleU5hbWVdID0gdmFsdWU7XG5cbiAgICBoaXN0b3J5LnNldChxdWVyeSk7XG5cbiAgICByZXR1cm4gYXBpO1xuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyBzaW5nbGV0b24gaW5zdGFuY2Ugb2YgdGhlIHF1ZXJ5IHN0YXRlLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBkZWZhdWx0cyAtIGlmIHByZXNlbnQsIHRoZW4gaXQgaXMgcGFzc2VkIHRvIHRoZSBjdXJyZW50IGluc3RhbmNlXG4gKiBvZiB0aGUgcXVlcnkgc3RhdGUuIERlZmF1bHRzIGFyZSBhcHBsaWVkIG9ubHkgaWYgdGhleSB3ZXJlIG5vdCBwcmVzZW50IGJlZm9yZS5cbiAqL1xuZnVuY3Rpb24gaW5zdGFuY2UoZGVmYXVsdHMpIHtcbiAgaWYgKCFzaW5nbGV0b25RUykge1xuICAgIHNpbmdsZXRvblFTID0gcXVlcnlTdGF0ZShkZWZhdWx0cyk7XG4gIH0gZWxzZSBpZiAoZGVmYXVsdHMpIHtcbiAgICBzaW5nbGV0b25RUy5zZXRJZkVtcHR5KGRlZmF1bHRzKTtcbiAgfVxuXG4gIHJldHVybiBzaW5nbGV0b25RUztcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVIaXN0b3J5QVBJKGhpc3RvcnkpIHtcbiAgaWYgKCFoaXN0b3J5KSB0aHJvdyBuZXcgRXJyb3IoJ2hpc3RvcnkgaXMgcmVxdWlyZWQnKTtcbiAgaWYgKHR5cGVvZiBoaXN0b3J5LmRpc3Bvc2UgIT09ICdmdW5jdGlvbicpIHRocm93IG5ldyBFcnJvcignZGlzcG9zZSBpcyByZXF1aXJlZCcpO1xuICBpZiAodHlwZW9mIGhpc3Rvcnkub25DaGFuZ2VkICE9PSAnZnVuY3Rpb24nKSB0aHJvdyBuZXcgRXJyb3IoJ29uQ2hhbmdlZCBpcyByZXF1aXJlZCcpO1xufVxuIiwiLyoqXG4gKiBQcm92aWRlcyBhIGBudWxsYCBvYmplY3QgdGhhdCBtYXRjaGVzIGhpc3RvcnkgQVBJXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gaW5NZW1vcnlIaXN0b3J5O1xuXG5mdW5jdGlvbiBpbk1lbW9yeUhpc3RvcnkoZGVmYXVsdHMpIHtcbiAgdmFyIGxpc3RlbmVycyA9IFtdO1xuICB2YXIgbGFzdFF1ZXJ5T2JqZWN0ID0gZGVmYXVsdHM7XG5cbiAgcmV0dXJuIHtcbiAgICBkaXNwb3NlOiBkaXNwb3NlLFxuICAgIG9uQ2hhbmdlZDogb25DaGFuZ2VkLFxuICAgIHNldDogc2V0LFxuICAgIGdldDogZ2V0XG4gIH07XG5cbiAgZnVuY3Rpb24gZ2V0KCkge1xuICAgIHJldHVybiBsYXN0UXVlcnlPYmplY3Q7XG4gIH1cblxuICBmdW5jdGlvbiBzZXQobmV3UXVlcnlPYmplY3QpIHtcbiAgICBsYXN0UXVlcnlPYmplY3QgPSBuZXdRdWVyeU9iamVjdDtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgdHJpZ2dlckNoYW5nZShuZXdRdWVyeU9iamVjdCk7XG4gICAgfSwgMCk7XG4gIH1cblxuICBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgIGxpc3RlbmVycyA9IFtdO1xuICB9XG5cbiAgZnVuY3Rpb24gb25DaGFuZ2VkKGNoYW5nZUNhbGxiYWNrKSB7XG4gICAgaWYgKHR5cGVvZiBjaGFuZ2VDYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdjaGFuZ2VDYWxsYmFjayBzaG91bGQgYmUgYSBmdW5jdGlvbicpXG4gICAgfVxuXG4gICAgbGlzdGVuZXJzLnB1c2goY2hhbmdlQ2FsbGJhY2spO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJpZ2dlckNoYW5nZShhcHBTdGF0ZSkge1xuICAgIGxpc3RlbmVycy5mb3JFYWNoKGZ1bmN0aW9uKGxpc3RlbmVyKSB7XG4gICAgICBsaXN0ZW5lcihhcHBTdGF0ZSk7XG4gICAgfSk7XG4gIH1cbn1cbiIsIi8qKlxuICogVGhpcyBtb2R1bGUgaXMgc2ltaWxhciB0byBKU09OLCBidXQgaXQgZW5jb2Rlcy9kZWNvZGVzIGluIHF1ZXJ5IHN0cmluZ1xuICogZm9ybWF0IGBrZXkxPXZhbHVlMS4uLmBcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHBhcnNlOiBwYXJzZSxcbiAgc3RyaW5naWZ5OiBzdHJpbmdpZnlcbn07XG5cbmZ1bmN0aW9uIHN0cmluZ2lmeShvYmplY3QpIHtcbiAgaWYgKCFvYmplY3QpIHJldHVybiAnJztcblxuICByZXR1cm4gT2JqZWN0LmtleXMob2JqZWN0KS5tYXAodG9QYWlycykuam9pbignJicpO1xuXG4gIGZ1bmN0aW9uIHRvUGFpcnMoa2V5KSB7XG4gICAgdmFyIHZhbHVlID0gb2JqZWN0W2tleV07XG4gICAgdmFyIHBhaXIgPSBlbmNvZGVVUklDb21wb25lbnQoa2V5KTtcbiAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcGFpciArPSAnPScgKyBlbmNvZGVWYWx1ZSh2YWx1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhaXI7XG4gIH1cbn1cblxuZnVuY3Rpb24gcGFyc2UocXVlcnlTdHJpbmcpIHtcbiAgdmFyIHF1ZXJ5ID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICBpZiAoIXF1ZXJ5U3RyaW5nKSByZXR1cm4gcXVlcnk7XG5cbiAgcXVlcnlTdHJpbmcuc3BsaXQoJyYnKS5mb3JFYWNoKGRlY29kZVJlY29yZCk7XG5cbiAgcmV0dXJuIHF1ZXJ5O1xuXG4gIGZ1bmN0aW9uIGRlY29kZVJlY29yZChxdWVyeVJlY29yZCkge1xuICAgIGlmICghcXVlcnlSZWNvcmQpIHJldHVybjtcblxuICAgIHZhciBwYWlyID0gcXVlcnlSZWNvcmQuc3BsaXQoJz0nKTtcbiAgICBxdWVyeVtkZWNvZGVVUklDb21wb25lbnQocGFpclswXSldID0gZGVjb2RlVmFsdWUocGFpclsxXSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZW5jb2RlVmFsdWUodmFsdWUpIHtcbiAgLy8gVE9ETzogRG8gSSBuZWVkIHRoaXM/XG4gIC8vIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gIC8vICAgaWYgKHZhbHVlLm1hdGNoKC9eKHRydWV8ZmFsc2UpJC8pKSB7XG4gIC8vICAgICAvLyBzcGVjaWFsIGhhbmRsaW5nIG9mIHN0cmluZ3MgdGhhdCBsb29rIGxpa2UgYm9vbGVhbnNcbiAgLy8gICAgIHZhbHVlID0gSlNPTi5zdHJpbmdpZnkoJycgKyB2YWx1ZSk7XG4gIC8vICAgfSBlbHNlIGlmICh2YWx1ZS5tYXRjaCgvXi0/XFxkK1xcLj9cXGQqJC8pKSB7XG4gIC8vICAgICAvLyBzcGVjaWFsIGhhbmRsaW5nIG9mIHN0cmluZ3MgdGhhdCBsb29rIGxpa2UgbnVtYmVyc1xuICAvLyAgICAgdmFsdWUgPSBKU09OLnN0cmluZ2lmeSgnJyArIHZhbHVlKTtcbiAgLy8gICB9XG4gIC8vIH1cbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgIHZhbHVlID0gdmFsdWUudG9JU09TdHJpbmcoKTtcbiAgfVxuICB2YXIgdXJpVmFsdWUgPSBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICByZXR1cm4gdXJpVmFsdWU7XG59XG5cbi8qKlxuICogVGhpcyBtZXRob2QgcmV0dXJucyB0eXBlZCB2YWx1ZSBmcm9tIHN0cmluZ1xuICovXG5mdW5jdGlvbiBkZWNvZGVWYWx1ZSh2YWx1ZSkge1xuICB2YWx1ZSA9IGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG5cbiAgaWYgKHZhbHVlID09PSBcIlwiKSByZXR1cm4gdmFsdWU7XG4gIGlmICghaXNOYU4odmFsdWUpKSByZXR1cm4gcGFyc2VGbG9hdCh2YWx1ZSk7XG4gIGlmIChpc0JvbGVhbih2YWx1ZSkpIHJldHVybiB2YWx1ZSA9PT0gJ3RydWUnO1xuICBpZiAoaXNJU09EYXRlU3RyaW5nKHZhbHVlKSkgcmV0dXJuIG5ldyBEYXRlKHZhbHVlKTtcblxuICByZXR1cm4gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIGlzQm9sZWFuKHN0clZhbHVlKSB7XG4gIHJldHVybiBzdHJWYWx1ZSA9PT0gJ3RydWUnIHx8IHN0clZhbHVlID09PSAnZmFsc2UnO1xufVxuXG5mdW5jdGlvbiBpc0lTT0RhdGVTdHJpbmcoc3RyKSB7XG4gIHJldHVybiBzdHIgJiYgc3RyLm1hdGNoKC8oXFxkezR9LVswMV1cXGQtWzAtM11cXGRUWzAtMl1cXGQ6WzAtNV1cXGQ6WzAtNV1cXGRcXC5cXGQrKFsrLV1bMC0yXVxcZDpbMC01XVxcZHxaKSl8KFxcZHs0fS1bMDFdXFxkLVswLTNdXFxkVFswLTJdXFxkOlswLTVdXFxkOlswLTVdXFxkKFsrLV1bMC0yXVxcZDpbMC01XVxcZHxaKSl8KFxcZHs0fS1bMDFdXFxkLVswLTNdXFxkVFswLTJdXFxkOlswLTVdXFxkKFsrLV1bMC0yXVxcZDpbMC01XVxcZHxaKSkvKVxufVxuIiwiLyoqXG4gKiBVc2VzIGB3aW5kb3dgIHRvIG1vbml0b3IgaGFzaCBhbmQgdXBkYXRlIGhhc2hcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSB3aW5kb3dIaXN0b3J5O1xuXG52YXIgaW5NZW1vcnlIaXN0b3J5ID0gcmVxdWlyZSgnLi9pbk1lbW9yeUhpc3RvcnkuanMnKTtcbnZhciBxdWVyeSA9IHJlcXVpcmUoJy4vcXVlcnkuanMnKTtcblxuZnVuY3Rpb24gd2luZG93SGlzdG9yeShkZWZhdWx0cykge1xuICAvLyBJZiB3ZSBkb24ndCBzdXBwb3J0IHdpbmRvdywgd2UgYXJlIHByb2JhYmx5IHJ1bm5pbmcgaW4gbm9kZS4gSnVzdCByZXR1cm5cbiAgLy8gaW4gbWVtb3J5IGhpc3RvcnlcbiAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSByZXR1cm4gaW5NZW1vcnlIaXN0b3J5KGRlZmF1bHRzKTtcblxuICAvLyBTdG9yZSBhbGwgYG9uQ2hhbmdlZCgpYCBsaXN0ZW5lcnMgaGVyZSwgc28gdGhhdCB3ZSBjYW4gaGF2ZSBqdXN0IG9uZVxuICAvLyBgaGFzaGNoYW5nZWAgbGlzdGVuZXIsIGFuZCBub3RpZnkgb25lIGxpc3RlbmVycyB3aXRoaW4gc2luZ2xlIGV2ZW50LlxuICB2YXIgbGlzdGVuZXJzID0gW107XG5cbiAgLy8gVGhpcyBwcmVmaXggaXMgdXNlZCBmb3IgYWxsIHF1ZXJ5IHN0cmluZ3MuIFNvIG91ciBzdGF0ZSBpcyBzdG9yZWQgYXNcbiAgLy8gbXktYXBwLmNvbS8jP2tleT12YWx1ZVxuICB2YXIgaGFzaFByZWZpeCA9ICcjPyc7XG5cbiAgaW5pdCgpO1xuXG4gIC8vIFRoaXMgaXMgb3VyIHB1YmxpYyBBUEk6XG4gIHJldHVybiB7XG4gICAgLyoqXG4gICAgICogQWRkcyBjYWxsYmFjayB0aGF0IGlzIGNhbGxlZCB3aGVuIGhhc2ggY2hhbmdlIGhhcHBlbi4gQ2FsbGJhY2sgcmVjZWl2ZXNcbiAgICAgKiBjdXJyZW50IGhhc2ggc3RyaW5nIHdpdGggYCM/YCBzaWduXG4gICAgICogXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2hhbmdlQ2FsbGJhY2sgLSBhIGZ1bmN0aW9uIHRoYXQgaXMgY2FsbGVkIHdoZW4gaGFzaCBpc1xuICAgICAqIGNoYW5nZWQuIENhbGxiYWNrIGdldHMgb25lIGFyZ3VtZW50IHRoYXQgcmVwcmVzZW50cyB0aGUgbmV3IHN0YXRlLlxuICAgICAqL1xuICAgIG9uQ2hhbmdlZDogb25DaGFuZ2VkLFxuXG4gICAgLyoqXG4gICAgICogUmVsZWFzZXMgYWxsIHJlc291cmNlc1xuICAgICAqL1xuICAgIGRpc3Bvc2U6IGRpc3Bvc2UsXG5cbiAgICAvKipcbiAgICAgKiBTZXRzIGEgbmV3IGFwcCBzdGF0ZVxuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGFwcFN0YXRlIC0gdGhlIG5ldyBhcHBsaWNhdGlvbiBzdGF0ZSwgdGhhdCBzaG91bGQgYmVcbiAgICAgKiBwZXJzaXN0ZWQgaW4gdGhlIGhhc2ggc3RyaW5nXG4gICAgICovXG4gICAgc2V0OiBzZXQsXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIGN1cnJlbnQgYXBwIHN0YXRlXG4gICAgICovXG4gICAgZ2V0OiBnZXRTdGF0ZUZyb21IYXNoXG4gIH07XG5cbiAgLy8gUHVibGljIEFQSSBpcyBvdmVyLiBZb3UgY2FuIGlnbm9yZSB0aGlzIHBhcnQuXG5cbiAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICB2YXIgc3RhdGVGcm9tSGFzaCA9IGdldFN0YXRlRnJvbUhhc2goKTtcbiAgICB2YXIgc3RhdGVDaGFuZ2VkID0gZmFsc2U7XG5cbiAgICBpZiAodHlwZW9mIGRlZmF1bHRzID09PSAnb2JqZWN0JyAmJiBkZWZhdWx0cykge1xuICAgICAgT2JqZWN0LmtleXMoZGVmYXVsdHMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGlmIChrZXkgaW4gc3RhdGVGcm9tSGFzaCkgcmV0dXJuO1xuXG4gICAgICAgIHN0YXRlRnJvbUhhc2hba2V5XSA9IGRlZmF1bHRzW2tleV1cbiAgICAgICAgc3RhdGVDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChzdGF0ZUNoYW5nZWQpIHNldChzdGF0ZUZyb21IYXNoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldChhcHBTdGF0ZSkge1xuICAgIHZhciBoYXNoID0gaGFzaFByZWZpeCArIHF1ZXJ5LnN0cmluZ2lmeShhcHBTdGF0ZSk7XG5cbiAgICBpZiAod2luZG93Lmhpc3RvcnkpIHtcbiAgICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh1bmRlZmluZWQsIHVuZGVmaW5lZCwgaGFzaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZXBsYWNlKGhhc2gpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG9uQ2hhbmdlZChjaGFuZ2VDYWxsYmFjaykge1xuICAgIGlmICh0eXBlb2YgY2hhbmdlQ2FsbGJhY2sgIT09ICdmdW5jdGlvbicpIHRocm93IG5ldyBFcnJvcignY2hhbmdlQ2FsbGJhY2sgbmVlZHMgdG8gYmUgYSBmdW5jdGlvbicpO1xuXG4gICAgLy8gd2Ugc3RhcnQgbGlzdGVuIGp1c3Qgb25jZSwgb25seSBpZiB3ZSBkaWRuJ3QgbGlzdGVuIGJlZm9yZTpcbiAgICBpZiAobGlzdGVuZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2hhc2hjaGFuZ2UnLCBvbkhhc2hDaGFuZ2VkLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgbGlzdGVuZXJzLnB1c2goY2hhbmdlQ2FsbGJhY2spO1xuICB9XG5cbiAgZnVuY3Rpb24gZGlzcG9zZSgpIHtcbiAgICBpZiAobGlzdGVuZXJzLmxlbmd0aCA9PT0gMCkgcmV0dXJuOyAvLyBubyBuZWVkIHRvIGRvIGFueXRoaW5nLlxuXG4gICAgLy8gTGV0IGdhcmJhZ2UgY29sbGVjdG9yIGNvbGxlY3QgYWxsIGxpc3RlbmVycztcbiAgICBsaXN0ZW5lcnMgPSBbXTtcblxuICAgIC8vIEFuZCByZWxlYXNlIGhhc2ggY2hhbmdlIGV2ZW50OlxuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdoYXNoY2hhbmdlJywgb25IYXNoQ2hhbmdlZCwgZmFsc2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gb25IYXNoQ2hhbmdlZCgpIHtcbiAgICB2YXIgYXBwU3RhdGUgPSBnZXRTdGF0ZUZyb21IYXNoKCk7XG4gICAgbm90aWZ5TGlzdGVuZXJzKGFwcFN0YXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vdGlmeUxpc3RlbmVycyhhcHBTdGF0ZSkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJzLmxlbmd0aDsgKytpKSB7XG4gICAgICB2YXIgbGlzdGVuZXIgPSBsaXN0ZW5lcnNbaV07XG4gICAgICBsaXN0ZW5lcihhcHBTdGF0ZSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0U3RhdGVGcm9tSGFzaCgpIHtcbiAgICB2YXIgcXVlcnlTdHJpbmcgPSAod2luZG93LmxvY2F0aW9uLmhhc2ggfHwgaGFzaFByZWZpeCkuc3Vic3RyKGhhc2hQcmVmaXgubGVuZ3RoKTtcblxuICAgIHJldHVybiBxdWVyeS5wYXJzZShxdWVyeVN0cmluZyk7XG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc3ViamVjdCkge1xuICB2YWxpZGF0ZVN1YmplY3Qoc3ViamVjdCk7XG5cbiAgdmFyIGV2ZW50c1N0b3JhZ2UgPSBjcmVhdGVFdmVudHNTdG9yYWdlKHN1YmplY3QpO1xuICBzdWJqZWN0Lm9uID0gZXZlbnRzU3RvcmFnZS5vbjtcbiAgc3ViamVjdC5vZmYgPSBldmVudHNTdG9yYWdlLm9mZjtcbiAgc3ViamVjdC5maXJlID0gZXZlbnRzU3RvcmFnZS5maXJlO1xuICByZXR1cm4gc3ViamVjdDtcbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZUV2ZW50c1N0b3JhZ2Uoc3ViamVjdCkge1xuICAvLyBTdG9yZSBhbGwgZXZlbnQgbGlzdGVuZXJzIHRvIHRoaXMgaGFzaC4gS2V5IGlzIGV2ZW50IG5hbWUsIHZhbHVlIGlzIGFycmF5XG4gIC8vIG9mIGNhbGxiYWNrIHJlY29yZHMuXG4gIC8vXG4gIC8vIEEgY2FsbGJhY2sgcmVjb3JkIGNvbnNpc3RzIG9mIGNhbGxiYWNrIGZ1bmN0aW9uIGFuZCBpdHMgb3B0aW9uYWwgY29udGV4dDpcbiAgLy8geyAnZXZlbnROYW1lJyA9PiBbe2NhbGxiYWNrOiBmdW5jdGlvbiwgY3R4OiBvYmplY3R9XSB9XG4gIHZhciByZWdpc3RlcmVkRXZlbnRzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICByZXR1cm4ge1xuICAgIG9uOiBmdW5jdGlvbiAoZXZlbnROYW1lLCBjYWxsYmFjaywgY3R4KSB7XG4gICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY2FsbGJhY2sgaXMgZXhwZWN0ZWQgdG8gYmUgYSBmdW5jdGlvbicpO1xuICAgICAgfVxuICAgICAgdmFyIGhhbmRsZXJzID0gcmVnaXN0ZXJlZEV2ZW50c1tldmVudE5hbWVdO1xuICAgICAgaWYgKCFoYW5kbGVycykge1xuICAgICAgICBoYW5kbGVycyA9IHJlZ2lzdGVyZWRFdmVudHNbZXZlbnROYW1lXSA9IFtdO1xuICAgICAgfVxuICAgICAgaGFuZGxlcnMucHVzaCh7Y2FsbGJhY2s6IGNhbGxiYWNrLCBjdHg6IGN0eH0pO1xuXG4gICAgICByZXR1cm4gc3ViamVjdDtcbiAgICB9LFxuXG4gICAgb2ZmOiBmdW5jdGlvbiAoZXZlbnROYW1lLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHdhbnRUb1JlbW92ZUFsbCA9ICh0eXBlb2YgZXZlbnROYW1lID09PSAndW5kZWZpbmVkJyk7XG4gICAgICBpZiAod2FudFRvUmVtb3ZlQWxsKSB7XG4gICAgICAgIC8vIEtpbGxpbmcgb2xkIGV2ZW50cyBzdG9yYWdlIHNob3VsZCBiZSBlbm91Z2ggaW4gdGhpcyBjYXNlOlxuICAgICAgICByZWdpc3RlcmVkRXZlbnRzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgcmV0dXJuIHN1YmplY3Q7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWdpc3RlcmVkRXZlbnRzW2V2ZW50TmFtZV0pIHtcbiAgICAgICAgdmFyIGRlbGV0ZUFsbENhbGxiYWNrc0ZvckV2ZW50ID0gKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJyk7XG4gICAgICAgIGlmIChkZWxldGVBbGxDYWxsYmFja3NGb3JFdmVudCkge1xuICAgICAgICAgIGRlbGV0ZSByZWdpc3RlcmVkRXZlbnRzW2V2ZW50TmFtZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIGNhbGxiYWNrcyA9IHJlZ2lzdGVyZWRFdmVudHNbZXZlbnROYW1lXTtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNhbGxiYWNrcy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrc1tpXS5jYWxsYmFjayA9PT0gY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2tzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHN1YmplY3Q7XG4gICAgfSxcblxuICAgIGZpcmU6IGZ1bmN0aW9uIChldmVudE5hbWUpIHtcbiAgICAgIHZhciBjYWxsYmFja3MgPSByZWdpc3RlcmVkRXZlbnRzW2V2ZW50TmFtZV07XG4gICAgICBpZiAoIWNhbGxiYWNrcykge1xuICAgICAgICByZXR1cm4gc3ViamVjdDtcbiAgICAgIH1cblxuICAgICAgdmFyIGZpcmVBcmd1bWVudHM7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZmlyZUFyZ3VtZW50cyA9IEFycmF5LnByb3RvdHlwZS5zcGxpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgfVxuICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGNhbGxiYWNrcy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgY2FsbGJhY2tJbmZvID0gY2FsbGJhY2tzW2ldO1xuICAgICAgICBjYWxsYmFja0luZm8uY2FsbGJhY2suYXBwbHkoY2FsbGJhY2tJbmZvLmN0eCwgZmlyZUFyZ3VtZW50cyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzdWJqZWN0O1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVTdWJqZWN0KHN1YmplY3QpIHtcbiAgaWYgKCFzdWJqZWN0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdFdmVudGlmeSBjYW5ub3QgdXNlIGZhbHN5IG9iamVjdCBhcyBldmVudHMgc3ViamVjdCcpO1xuICB9XG4gIHZhciByZXNlcnZlZFdvcmRzID0gWydvbicsICdmaXJlJywgJ29mZiddO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHJlc2VydmVkV29yZHMubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoc3ViamVjdC5oYXNPd25Qcm9wZXJ0eShyZXNlcnZlZFdvcmRzW2ldKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU3ViamVjdCBjYW5ub3QgYmUgZXZlbnRpZmllZCwgc2luY2UgaXQgYWxyZWFkeSBoYXMgcHJvcGVydHkgJ1wiICsgcmVzZXJ2ZWRXb3Jkc1tpXSArIFwiJ1wiKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==
