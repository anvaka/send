(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
  console.log('installing oflfine worker');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy5ucG0tZ2xvYmFsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiaW5kZXguanMiLCIuLi8uLi9xdWVyeS1zdGF0ZS9pbmRleC5qcyIsIi4uLy4uL3F1ZXJ5LXN0YXRlL2xpYi9pbk1lbW9yeUhpc3RvcnkuanMiLCIuLi8uLi9xdWVyeS1zdGF0ZS9saWIvcXVlcnkuanMiLCIuLi8uLi9xdWVyeS1zdGF0ZS9saWIvd2luZG93SGFzaEhpc3RvcnkuanMiLCIuLi8uLi9xdWVyeS1zdGF0ZS9ub2RlX21vZHVsZXMvbmdyYXBoLmV2ZW50cy9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaWYgKCdzZXJ2aWNlV29ya2VyJyBpbiBuYXZpZ2F0b3IpIHtcbiAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoJ3NlcnZpY2Utd29ya2VyLmpzJyk7XG4gIGNvbnNvbGUubG9nKCdpbnN0YWxsaW5nIG9mbGZpbmUgd29ya2VyJyk7XG59XG5cbnZhciBxdWVyeVN0YXRlID0gcmVxdWlyZSgncXVlcnktc3RhdGUnKTtcbnZhciBlbWFpbElucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2VtYWlsLWlucHV0JylcbnZhciBzZW5kTGluayA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzZW5kLWxpbmsnKVxudmFyIGRlZmF1bHRTdGF0ZSA9IHtcbiAgbGFiZWw6ICdTZW5kIHRvIEZ1dHVyZSBTZWxmJ1xufTtcbnZhciBxcyA9IHF1ZXJ5U3RhdGUoZGVmYXVsdFN0YXRlKTtcbnZhciBpbml0aWFsQXBwU3RhdGUgPSBxcy5nZXQoKTtcbi8vIEluaXRpYWxpemUgaW5wdXQgYm94IHdpdGggY3VycmVudCBhcHAgc3RhdGU6XG51cGRhdGVJbnB1dEJveChpbml0aWFsQXBwU3RhdGUpO1xuc2V0Rm9jdXMoaW5pdGlhbEFwcFN0YXRlKTtcbi8vIGFuZCBsaXN0ZW4gdG8gYWxsIGV2ZW50cyBmcm9tIHF1ZXJ5IHN0YXRlOlxucXMub25DaGFuZ2UodXBkYXRlSW5wdXRCb3gpO1xuXG4vLyBXaGVuIGlucHV0IGNoYW5nZXMsIHdlIHVwZGF0ZSBxdWVyeSBzdGF0ZSB0b28hXG5lbWFpbElucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgdXBkYXRlUXVlcnlTdGF0ZSk7XG5lbWFpbElucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCB1cGRhdGVRdWVyeVN0YXRlKTtcbmVtYWlsSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHVwZGF0ZVF1ZXJ5U3RhdGUpO1xuXG5mdW5jdGlvbiB1cGRhdGVRdWVyeVN0YXRlKGUpIHtcbiAgcXMuc2V0KCdlbWFpbCcsIGVtYWlsSW5wdXQudmFsdWUpO1xuICB1cGRhdGVMaW5rKGVtYWlsSW5wdXQudmFsdWUpO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVJbnB1dEJveChhcHBTdGF0ZSkge1xuICBlbWFpbElucHV0LnZhbHVlID0gYXBwU3RhdGUuZW1haWwgfHwgJyc7XG4gIHNlbmRMaW5rLmlubmVyVGV4dCA9IGFwcFN0YXRlLmxhYmVsIHx8ICcnO1xuICBkb2N1bWVudC50aXRsZSA9IGFwcFN0YXRlLmxhYmVsIHx8IGRlZmF1bHRTdGF0ZS5sYWJlbDtcbiAgdXBkYXRlTGluayhlbWFpbElucHV0LnZhbHVlKTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlTGluayhlbWFpbCkge1xuICBzZW5kTGluay5ocmVmID0gKCdtYWlsdG86JyArIGVtYWlsKSB8fCAnJ1xuICBpZiAoZW1haWwuaW5kZXhPZignQCcpID4gLTEpIHsgLy8gdmVyeSBuYWl2ZSBlbWFpbCB2YWxpZGF0b3IuXG4gICAgc2VuZExpbmsuY2xhc3NMaXN0LnJlbW92ZSgnZGlzYWJsZWQnKTtcbiAgfSBlbHNlIHtcbiAgICBzZW5kTGluay5jbGFzc0xpc3QuYWRkKCdkaXNhYmxlZCcpO1xuICB9XG59XG5cblxuZnVuY3Rpb24gc2V0Rm9jdXMoYXBwU3RhdGUpIHtcbiAgaWYgKGFwcFN0YXRlLmVtYWlsKSByZXR1cm47IC8vIG5vIG5lZWQgdG8gY2hhbmdlIGZvY3VzIGlmIGVtYWlsIGlzIGhlcmVcblxuICBlbWFpbElucHV0LmZvY3VzKCk7XG5cbn1cbiIsIi8qKlxuICogQWxsb3dzIGFwcGxpY2F0aW9uIHRvIGFjY2VzcyBhbmQgdXBkYXRlIGN1cnJlbnQgYXBwIHN0YXRlIHZpYSBxdWVyeSBzdHJpbmdcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBxdWVyeVN0YXRlO1xuXG52YXIgZXZlbnRpZnkgPSByZXF1aXJlKCduZ3JhcGguZXZlbnRzJyk7XG52YXIgd2luZG93SGFzaEhpc3RvcnkgPSByZXF1aXJlKCcuL2xpYi93aW5kb3dIYXNoSGlzdG9yeS5qcycpO1xuXG4vKipcbiAqIEp1c3QgYSBjb252ZW5pZW5jZSBmdW5jdGlvbiB0aGF0IHJldHVybnMgc2luZ2xldG9uIGluc3RhbmNlIG9mIGEgcXVlcnkgc3RhdGVcbiAqL1xucXVlcnlTdGF0ZS5pbnN0YW5jZSA9IGluc3RhbmNlO1xuXG4vLyB0aGlzIHZhcmlhYmxlIGhvbGRzIHNpbmdsZXRvbiBpbnN0YW5jZSBvZiB0aGUgcXVlcnkgc3RhdGVcbnZhciBzaW5nbGV0b25RUztcblxuLyoqXG4gKiBDcmVhdGVzIG5ldyBpbnN0YW5jZSBvZiB0aGUgcXVlcnkgc3RhdGUuXG4gKi9cbmZ1bmN0aW9uIHF1ZXJ5U3RhdGUoZGVmYXVsdHMsIGhpc3RvcnkpIHtcbiAgaGlzdG9yeSA9IGhpc3RvcnkgfHwgd2luZG93SGFzaEhpc3RvcnkoZGVmYXVsdHMpO1xuICB2YWxpZGF0ZUhpc3RvcnlBUEkoaGlzdG9yeSk7XG5cbiAgaGlzdG9yeS5vbkNoYW5nZWQodXBkYXRlUXVlcnkpXG5cbiAgdmFyIHF1ZXJ5ID0gaGlzdG9yeS5nZXQoKSB8fCBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIHZhciBhcGkgPSB7XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIGN1cnJlbnQgc3RhdGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZz99IGtleU5hbWUgaWYgcHJlc2VudCB0aGVuIHZhbHVlIGZvciB0aGlzIGtleSBpcyByZXR1cm5lZC5cbiAgICAgKiBPdGhlcndpc2UgdGhlIGVudGlyZSBhcHAgc3RhdGUgaXMgcmV0dXJuZWQuXG4gICAgICovXG4gICAgZ2V0OiBnZXRWYWx1ZSxcblxuICAgIC8qKlxuICAgICAqIE1lcmdlcyBjdXJyZW50IGFwcCBzdGF0ZSB3aXRoIG5ldyBrZXkvdmFsdWUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IG5hbWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xudW1iZXJ8ZGF0ZX0gdmFsdWVcbiAgICAgKi9cbiAgICBzZXQ6IHNldFZhbHVlLFxuXG4gICAgLyoqXG4gICAgICogU2ltaWxhciB0byBgc2V0KClgLCBidXQgb25seSBzZXRzIHZhbHVlIGlmIGl0IHdhcyBub3Qgc2V0IGJlZm9yZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgbmFtZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG51bWJlcnxkYXRlfSB2YWx1ZVxuICAgICAqL1xuICAgIHNldElmRW1wdHk6IHNldElmRW1wdHksXG5cbiAgICAvKipcbiAgICAgKiBSZWxlYXNlcyBhbGwgcmVzb3VyY2VzIGFjcXVpcmVkIGJ5IHF1ZXJ5IHN0YXRlLiBBZnRlciBjYWxsaW5nIHRoaXMgbWV0aG9kXG4gICAgICogbm8gaGFzaCBtb25pdG9yaW5nIHdpbGwgaGFwcGVuIGFuZCBubyBtb3JlIGV2ZW50cyB3aWxsIGJlIGZpcmVkLlxuICAgICAqL1xuICAgIGRpc3Bvc2U6IGRpc3Bvc2UsXG5cbiAgICBvbkNoYW5nZTogb25DaGFuZ2UsXG4gICAgb2ZmQ2hhbmdlOiBvZmZDaGFuZ2UsXG5cbiAgICBnZXRIaXN0b3J5T2JqZWN0OiBnZXRIaXN0b3J5T2JqZWN0LFxuICB9XG5cbiAgdmFyIGV2ZW50QnVzID0gZXZlbnRpZnkoe30pO1xuXG4gIHJldHVybiBhcGk7XG5cbiAgZnVuY3Rpb24gb25DaGFuZ2UoY2FsbGJhY2ssIGN0eCkge1xuICAgIGV2ZW50QnVzLm9uKCdjaGFuZ2UnLCBjYWxsYmFjaywgY3R4KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9mZkNoYW5nZShjYWxsYmFjaywgY3R4KSB7XG4gICAgZXZlbnRCdXMub2ZmKCdjaGFuZ2UnLCBjYWxsYmFjaywgY3R4KVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0SGlzdG9yeU9iamVjdCgpIHtcbiAgICByZXR1cm4gaGlzdG9yeTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XG4gICAgLy8gZGlzcG9zZSBhbGwgaGlzdG9yeSBsaXN0ZW5lcnNcbiAgICBoaXN0b3J5LmRpc3Bvc2UoKTtcblxuICAgIC8vIEFuZCByZW1vdmUgb3VyIG93biBsaXN0ZW5lcnNcbiAgICBldmVudEJ1cy5vZmYoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFZhbHVlKGtleU5hbWUpIHtcbiAgICBpZiAoa2V5TmFtZSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gcXVlcnk7XG5cbiAgICByZXR1cm4gcXVlcnlba2V5TmFtZV07XG4gIH1cblxuICBmdW5jdGlvbiBzZXRWYWx1ZShrZXlOYW1lLCB2YWx1ZSkge1xuICAgIHZhciBrZXlOYW1lVHlwZSA9IHR5cGVvZiBrZXlOYW1lO1xuXG4gICAgaWYgKGtleU5hbWVUeXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgT2JqZWN0LmtleXMoa2V5TmFtZSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgcXVlcnlba2V5XSA9IGtleU5hbWVba2V5XTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoa2V5TmFtZVR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBxdWVyeVtrZXlOYW1lXSA9IHZhbHVlO1xuICAgIH1cblxuICAgIGhpc3Rvcnkuc2V0KHF1ZXJ5KTtcblxuICAgIHJldHVybiBhcGk7XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGVRdWVyeShuZXdBcHBTdGF0ZSkge1xuICAgIHF1ZXJ5ID0gbmV3QXBwU3RhdGU7XG4gICAgZXZlbnRCdXMuZmlyZSgnY2hhbmdlJywgcXVlcnkpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0SWZFbXB0eShrZXlOYW1lLCB2YWx1ZSkge1xuICAgIGlmICh0eXBlb2Yga2V5TmFtZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIE9iamVjdC5rZXlzKGtleU5hbWUpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIC8vIFRPRE86IENhbiBJIHJlbW92ZSBjb2RlIGR1cGxpY2F0aW9uPyBUaGUgbWFpbiByZWFzb24gd2h5IEkgZG9uJ3RcbiAgICAgICAgLy8gd2FudCByZWN1cnNpb24gaGVyZSBpcyB0byBhdm9pZCBzcGFtbWluZyBgaGlzdG9yeS5zZXQoKWBcbiAgICAgICAgaWYgKGtleSBpbiBxdWVyeSkgcmV0dXJuOyAvLyBrZXkgbmFtZSBpcyBub3QgZW1wdHlcblxuICAgICAgICBxdWVyeVtrZXldID0ga2V5TmFtZVtrZXldO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKGtleU5hbWUgaW4gcXVlcnkpIHJldHVybjsgLy8ga2V5IG5hbWUgaXMgbm90IGVtcHR5XG4gICAgcXVlcnlba2V5TmFtZV0gPSB2YWx1ZTtcblxuICAgIGhpc3Rvcnkuc2V0KHF1ZXJ5KTtcblxuICAgIHJldHVybiBhcGk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIHNpbmdsZXRvbiBpbnN0YW5jZSBvZiB0aGUgcXVlcnkgc3RhdGUuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGRlZmF1bHRzIC0gaWYgcHJlc2VudCwgdGhlbiBpdCBpcyBwYXNzZWQgdG8gdGhlIGN1cnJlbnQgaW5zdGFuY2VcbiAqIG9mIHRoZSBxdWVyeSBzdGF0ZS4gRGVmYXVsdHMgYXJlIGFwcGxpZWQgb25seSBpZiB0aGV5IHdlcmUgbm90IHByZXNlbnQgYmVmb3JlLlxuICovXG5mdW5jdGlvbiBpbnN0YW5jZShkZWZhdWx0cykge1xuICBpZiAoIXNpbmdsZXRvblFTKSB7XG4gICAgc2luZ2xldG9uUVMgPSBxdWVyeVN0YXRlKGRlZmF1bHRzKTtcbiAgfSBlbHNlIGlmIChkZWZhdWx0cykge1xuICAgIHNpbmdsZXRvblFTLnNldElmRW1wdHkoZGVmYXVsdHMpO1xuICB9XG5cbiAgcmV0dXJuIHNpbmdsZXRvblFTO1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZUhpc3RvcnlBUEkoaGlzdG9yeSkge1xuICBpZiAoIWhpc3RvcnkpIHRocm93IG5ldyBFcnJvcignaGlzdG9yeSBpcyByZXF1aXJlZCcpO1xuICBpZiAodHlwZW9mIGhpc3RvcnkuZGlzcG9zZSAhPT0gJ2Z1bmN0aW9uJykgdGhyb3cgbmV3IEVycm9yKCdkaXNwb3NlIGlzIHJlcXVpcmVkJyk7XG4gIGlmICh0eXBlb2YgaGlzdG9yeS5vbkNoYW5nZWQgIT09ICdmdW5jdGlvbicpIHRocm93IG5ldyBFcnJvcignb25DaGFuZ2VkIGlzIHJlcXVpcmVkJyk7XG59XG4iLCIvKipcbiAqIFByb3ZpZGVzIGEgYG51bGxgIG9iamVjdCB0aGF0IG1hdGNoZXMgaGlzdG9yeSBBUElcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBpbk1lbW9yeUhpc3Rvcnk7XG5cbmZ1bmN0aW9uIGluTWVtb3J5SGlzdG9yeShkZWZhdWx0cykge1xuICB2YXIgbGlzdGVuZXJzID0gW107XG4gIHZhciBsYXN0UXVlcnlPYmplY3QgPSBkZWZhdWx0cztcblxuICByZXR1cm4ge1xuICAgIGRpc3Bvc2U6IGRpc3Bvc2UsXG4gICAgb25DaGFuZ2VkOiBvbkNoYW5nZWQsXG4gICAgc2V0OiBzZXQsXG4gICAgZ2V0OiBnZXRcbiAgfTtcblxuICBmdW5jdGlvbiBnZXQoKSB7XG4gICAgcmV0dXJuIGxhc3RRdWVyeU9iamVjdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldChuZXdRdWVyeU9iamVjdCkge1xuICAgIGxhc3RRdWVyeU9iamVjdCA9IG5ld1F1ZXJ5T2JqZWN0O1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICB0cmlnZ2VyQ2hhbmdlKG5ld1F1ZXJ5T2JqZWN0KTtcbiAgICB9LCAwKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XG4gICAgbGlzdGVuZXJzID0gW107XG4gIH1cblxuICBmdW5jdGlvbiBvbkNoYW5nZWQoY2hhbmdlQ2FsbGJhY2spIHtcbiAgICBpZiAodHlwZW9mIGNoYW5nZUNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NoYW5nZUNhbGxiYWNrIHNob3VsZCBiZSBhIGZ1bmN0aW9uJylcbiAgICB9XG5cbiAgICBsaXN0ZW5lcnMucHVzaChjaGFuZ2VDYWxsYmFjayk7XG4gIH1cblxuICBmdW5jdGlvbiB0cmlnZ2VyQ2hhbmdlKGFwcFN0YXRlKSB7XG4gICAgbGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24obGlzdGVuZXIpIHtcbiAgICAgIGxpc3RlbmVyKGFwcFN0YXRlKTtcbiAgICB9KTtcbiAgfVxufVxuIiwiLyoqXG4gKiBUaGlzIG1vZHVsZSBpcyBzaW1pbGFyIHRvIEpTT04sIGJ1dCBpdCBlbmNvZGVzL2RlY29kZXMgaW4gcXVlcnkgc3RyaW5nXG4gKiBmb3JtYXQgYGtleTE9dmFsdWUxLi4uYFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcGFyc2U6IHBhcnNlLFxuICBzdHJpbmdpZnk6IHN0cmluZ2lmeVxufTtcblxuZnVuY3Rpb24gc3RyaW5naWZ5KG9iamVjdCkge1xuICBpZiAoIW9iamVjdCkgcmV0dXJuICcnO1xuXG4gIHJldHVybiBPYmplY3Qua2V5cyhvYmplY3QpLm1hcCh0b1BhaXJzKS5qb2luKCcmJyk7XG5cbiAgZnVuY3Rpb24gdG9QYWlycyhrZXkpIHtcbiAgICB2YXIgdmFsdWUgPSBvYmplY3Rba2V5XTtcbiAgICB2YXIgcGFpciA9IGVuY29kZVVSSUNvbXBvbmVudChrZXkpO1xuICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBwYWlyICs9ICc9JyArIGVuY29kZVZhbHVlKHZhbHVlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFpcjtcbiAgfVxufVxuXG5mdW5jdGlvbiBwYXJzZShxdWVyeVN0cmluZykge1xuICB2YXIgcXVlcnkgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIGlmICghcXVlcnlTdHJpbmcpIHJldHVybiBxdWVyeTtcblxuICBxdWVyeVN0cmluZy5zcGxpdCgnJicpLmZvckVhY2goZGVjb2RlUmVjb3JkKTtcblxuICByZXR1cm4gcXVlcnk7XG5cbiAgZnVuY3Rpb24gZGVjb2RlUmVjb3JkKHF1ZXJ5UmVjb3JkKSB7XG4gICAgaWYgKCFxdWVyeVJlY29yZCkgcmV0dXJuO1xuXG4gICAgdmFyIHBhaXIgPSBxdWVyeVJlY29yZC5zcGxpdCgnPScpO1xuICAgIHF1ZXJ5W2RlY29kZVVSSUNvbXBvbmVudChwYWlyWzBdKV0gPSBkZWNvZGVWYWx1ZShwYWlyWzFdKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBlbmNvZGVWYWx1ZSh2YWx1ZSkge1xuICAvLyBUT0RPOiBEbyBJIG5lZWQgdGhpcz9cbiAgLy8gaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgLy8gICBpZiAodmFsdWUubWF0Y2goL14odHJ1ZXxmYWxzZSkkLykpIHtcbiAgLy8gICAgIC8vIHNwZWNpYWwgaGFuZGxpbmcgb2Ygc3RyaW5ncyB0aGF0IGxvb2sgbGlrZSBib29sZWFuc1xuICAvLyAgICAgdmFsdWUgPSBKU09OLnN0cmluZ2lmeSgnJyArIHZhbHVlKTtcbiAgLy8gICB9IGVsc2UgaWYgKHZhbHVlLm1hdGNoKC9eLT9cXGQrXFwuP1xcZCokLykpIHtcbiAgLy8gICAgIC8vIHNwZWNpYWwgaGFuZGxpbmcgb2Ygc3RyaW5ncyB0aGF0IGxvb2sgbGlrZSBudW1iZXJzXG4gIC8vICAgICB2YWx1ZSA9IEpTT04uc3RyaW5naWZ5KCcnICsgdmFsdWUpO1xuICAvLyAgIH1cbiAgLy8gfVxuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgdmFsdWUgPSB2YWx1ZS50b0lTT1N0cmluZygpO1xuICB9XG4gIHZhciB1cmlWYWx1ZSA9IGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG4gIHJldHVybiB1cmlWYWx1ZTtcbn1cblxuLyoqXG4gKiBUaGlzIG1ldGhvZCByZXR1cm5zIHR5cGVkIHZhbHVlIGZyb20gc3RyaW5nXG4gKi9cbmZ1bmN0aW9uIGRlY29kZVZhbHVlKHZhbHVlKSB7XG4gIHZhbHVlID0gZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcblxuICBpZiAodmFsdWUgPT09IFwiXCIpIHJldHVybiB2YWx1ZTtcbiAgaWYgKCFpc05hTih2YWx1ZSkpIHJldHVybiBwYXJzZUZsb2F0KHZhbHVlKTtcbiAgaWYgKGlzQm9sZWFuKHZhbHVlKSkgcmV0dXJuIHZhbHVlID09PSAndHJ1ZSc7XG4gIGlmIChpc0lTT0RhdGVTdHJpbmcodmFsdWUpKSByZXR1cm4gbmV3IERhdGUodmFsdWUpO1xuXG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gaXNCb2xlYW4oc3RyVmFsdWUpIHtcbiAgcmV0dXJuIHN0clZhbHVlID09PSAndHJ1ZScgfHwgc3RyVmFsdWUgPT09ICdmYWxzZSc7XG59XG5cbmZ1bmN0aW9uIGlzSVNPRGF0ZVN0cmluZyhzdHIpIHtcbiAgcmV0dXJuIHN0ciAmJiBzdHIubWF0Y2goLyhcXGR7NH0tWzAxXVxcZC1bMC0zXVxcZFRbMC0yXVxcZDpbMC01XVxcZDpbMC01XVxcZFxcLlxcZCsoWystXVswLTJdXFxkOlswLTVdXFxkfFopKXwoXFxkezR9LVswMV1cXGQtWzAtM11cXGRUWzAtMl1cXGQ6WzAtNV1cXGQ6WzAtNV1cXGQoWystXVswLTJdXFxkOlswLTVdXFxkfFopKXwoXFxkezR9LVswMV1cXGQtWzAtM11cXGRUWzAtMl1cXGQ6WzAtNV1cXGQoWystXVswLTJdXFxkOlswLTVdXFxkfFopKS8pXG59XG4iLCIvKipcbiAqIFVzZXMgYHdpbmRvd2AgdG8gbW9uaXRvciBoYXNoIGFuZCB1cGRhdGUgaGFzaFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IHdpbmRvd0hpc3Rvcnk7XG5cbnZhciBpbk1lbW9yeUhpc3RvcnkgPSByZXF1aXJlKCcuL2luTWVtb3J5SGlzdG9yeS5qcycpO1xudmFyIHF1ZXJ5ID0gcmVxdWlyZSgnLi9xdWVyeS5qcycpO1xuXG5mdW5jdGlvbiB3aW5kb3dIaXN0b3J5KGRlZmF1bHRzKSB7XG4gIC8vIElmIHdlIGRvbid0IHN1cHBvcnQgd2luZG93LCB3ZSBhcmUgcHJvYmFibHkgcnVubmluZyBpbiBub2RlLiBKdXN0IHJldHVyblxuICAvLyBpbiBtZW1vcnkgaGlzdG9yeVxuICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybiBpbk1lbW9yeUhpc3RvcnkoZGVmYXVsdHMpO1xuXG4gIC8vIFN0b3JlIGFsbCBgb25DaGFuZ2VkKClgIGxpc3RlbmVycyBoZXJlLCBzbyB0aGF0IHdlIGNhbiBoYXZlIGp1c3Qgb25lXG4gIC8vIGBoYXNoY2hhbmdlYCBsaXN0ZW5lciwgYW5kIG5vdGlmeSBvbmUgbGlzdGVuZXJzIHdpdGhpbiBzaW5nbGUgZXZlbnQuXG4gIHZhciBsaXN0ZW5lcnMgPSBbXTtcblxuICAvLyBUaGlzIHByZWZpeCBpcyB1c2VkIGZvciBhbGwgcXVlcnkgc3RyaW5ncy4gU28gb3VyIHN0YXRlIGlzIHN0b3JlZCBhc1xuICAvLyBteS1hcHAuY29tLyM/a2V5PXZhbHVlXG4gIHZhciBoYXNoUHJlZml4ID0gJyM/JztcblxuICBpbml0KCk7XG5cbiAgLy8gVGhpcyBpcyBvdXIgcHVibGljIEFQSTpcbiAgcmV0dXJuIHtcbiAgICAvKipcbiAgICAgKiBBZGRzIGNhbGxiYWNrIHRoYXQgaXMgY2FsbGVkIHdoZW4gaGFzaCBjaGFuZ2UgaGFwcGVuLiBDYWxsYmFjayByZWNlaXZlc1xuICAgICAqIGN1cnJlbnQgaGFzaCBzdHJpbmcgd2l0aCBgIz9gIHNpZ25cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjaGFuZ2VDYWxsYmFjayAtIGEgZnVuY3Rpb24gdGhhdCBpcyBjYWxsZWQgd2hlbiBoYXNoIGlzXG4gICAgICogY2hhbmdlZC4gQ2FsbGJhY2sgZ2V0cyBvbmUgYXJndW1lbnQgdGhhdCByZXByZXNlbnRzIHRoZSBuZXcgc3RhdGUuXG4gICAgICovXG4gICAgb25DaGFuZ2VkOiBvbkNoYW5nZWQsXG5cbiAgICAvKipcbiAgICAgKiBSZWxlYXNlcyBhbGwgcmVzb3VyY2VzXG4gICAgICovXG4gICAgZGlzcG9zZTogZGlzcG9zZSxcblxuICAgIC8qKlxuICAgICAqIFNldHMgYSBuZXcgYXBwIHN0YXRlXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gYXBwU3RhdGUgLSB0aGUgbmV3IGFwcGxpY2F0aW9uIHN0YXRlLCB0aGF0IHNob3VsZCBiZVxuICAgICAqIHBlcnNpc3RlZCBpbiB0aGUgaGFzaCBzdHJpbmdcbiAgICAgKi9cbiAgICBzZXQ6IHNldCxcblxuICAgIC8qKlxuICAgICAqIEdldHMgY3VycmVudCBhcHAgc3RhdGVcbiAgICAgKi9cbiAgICBnZXQ6IGdldFN0YXRlRnJvbUhhc2hcbiAgfTtcblxuICAvLyBQdWJsaWMgQVBJIGlzIG92ZXIuIFlvdSBjYW4gaWdub3JlIHRoaXMgcGFydC5cblxuICBmdW5jdGlvbiBpbml0KCkge1xuICAgIHZhciBzdGF0ZUZyb21IYXNoID0gZ2V0U3RhdGVGcm9tSGFzaCgpO1xuICAgIHZhciBzdGF0ZUNoYW5nZWQgPSBmYWxzZTtcblxuICAgIGlmICh0eXBlb2YgZGVmYXVsdHMgPT09ICdvYmplY3QnICYmIGRlZmF1bHRzKSB7XG4gICAgICBPYmplY3Qua2V5cyhkZWZhdWx0cykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgaWYgKGtleSBpbiBzdGF0ZUZyb21IYXNoKSByZXR1cm47XG5cbiAgICAgICAgc3RhdGVGcm9tSGFzaFtrZXldID0gZGVmYXVsdHNba2V5XVxuICAgICAgICBzdGF0ZUNoYW5nZWQgPSB0cnVlO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHN0YXRlQ2hhbmdlZCkgc2V0KHN0YXRlRnJvbUhhc2gpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0KGFwcFN0YXRlKSB7XG4gICAgdmFyIGhhc2ggPSBoYXNoUHJlZml4ICsgcXVlcnkuc3RyaW5naWZ5KGFwcFN0YXRlKTtcblxuICAgIGlmICh3aW5kb3cuaGlzdG9yeSkge1xuICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBoYXNoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgd2luZG93LmxvY2F0aW9uLnJlcGxhY2UoaGFzaCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gb25DaGFuZ2VkKGNoYW5nZUNhbGxiYWNrKSB7XG4gICAgaWYgKHR5cGVvZiBjaGFuZ2VDYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykgdGhyb3cgbmV3IEVycm9yKCdjaGFuZ2VDYWxsYmFjayBuZWVkcyB0byBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgICAvLyB3ZSBzdGFydCBsaXN0ZW4ganVzdCBvbmNlLCBvbmx5IGlmIHdlIGRpZG4ndCBsaXN0ZW4gYmVmb3JlOlxuICAgIGlmIChsaXN0ZW5lcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignaGFzaGNoYW5nZScsIG9uSGFzaENoYW5nZWQsIGZhbHNlKTtcbiAgICB9XG5cbiAgICBsaXN0ZW5lcnMucHVzaChjaGFuZ2VDYWxsYmFjayk7XG4gIH1cblxuICBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgIGlmIChsaXN0ZW5lcnMubGVuZ3RoID09PSAwKSByZXR1cm47IC8vIG5vIG5lZWQgdG8gZG8gYW55dGhpbmcuXG5cbiAgICAvLyBMZXQgZ2FyYmFnZSBjb2xsZWN0b3IgY29sbGVjdCBhbGwgbGlzdGVuZXJzO1xuICAgIGxpc3RlbmVycyA9IFtdO1xuXG4gICAgLy8gQW5kIHJlbGVhc2UgaGFzaCBjaGFuZ2UgZXZlbnQ6XG4gICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2hhc2hjaGFuZ2UnLCBvbkhhc2hDaGFuZ2VkLCBmYWxzZSk7XG4gIH1cblxuICBmdW5jdGlvbiBvbkhhc2hDaGFuZ2VkKCkge1xuICAgIHZhciBhcHBTdGF0ZSA9IGdldFN0YXRlRnJvbUhhc2goKTtcbiAgICBub3RpZnlMaXN0ZW5lcnMoYXBwU3RhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gbm90aWZ5TGlzdGVuZXJzKGFwcFN0YXRlKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0ZW5lcnMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhciBsaXN0ZW5lciA9IGxpc3RlbmVyc1tpXTtcbiAgICAgIGxpc3RlbmVyKGFwcFN0YXRlKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRTdGF0ZUZyb21IYXNoKCkge1xuICAgIHZhciBxdWVyeVN0cmluZyA9ICh3aW5kb3cubG9jYXRpb24uaGFzaCB8fCBoYXNoUHJlZml4KS5zdWJzdHIoaGFzaFByZWZpeC5sZW5ndGgpO1xuXG4gICAgcmV0dXJuIHF1ZXJ5LnBhcnNlKHF1ZXJ5U3RyaW5nKTtcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzdWJqZWN0KSB7XG4gIHZhbGlkYXRlU3ViamVjdChzdWJqZWN0KTtcblxuICB2YXIgZXZlbnRzU3RvcmFnZSA9IGNyZWF0ZUV2ZW50c1N0b3JhZ2Uoc3ViamVjdCk7XG4gIHN1YmplY3Qub24gPSBldmVudHNTdG9yYWdlLm9uO1xuICBzdWJqZWN0Lm9mZiA9IGV2ZW50c1N0b3JhZ2Uub2ZmO1xuICBzdWJqZWN0LmZpcmUgPSBldmVudHNTdG9yYWdlLmZpcmU7XG4gIHJldHVybiBzdWJqZWN0O1xufTtcblxuZnVuY3Rpb24gY3JlYXRlRXZlbnRzU3RvcmFnZShzdWJqZWN0KSB7XG4gIC8vIFN0b3JlIGFsbCBldmVudCBsaXN0ZW5lcnMgdG8gdGhpcyBoYXNoLiBLZXkgaXMgZXZlbnQgbmFtZSwgdmFsdWUgaXMgYXJyYXlcbiAgLy8gb2YgY2FsbGJhY2sgcmVjb3Jkcy5cbiAgLy9cbiAgLy8gQSBjYWxsYmFjayByZWNvcmQgY29uc2lzdHMgb2YgY2FsbGJhY2sgZnVuY3Rpb24gYW5kIGl0cyBvcHRpb25hbCBjb250ZXh0OlxuICAvLyB7ICdldmVudE5hbWUnID0+IFt7Y2FsbGJhY2s6IGZ1bmN0aW9uLCBjdHg6IG9iamVjdH1dIH1cbiAgdmFyIHJlZ2lzdGVyZWRFdmVudHMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIHJldHVybiB7XG4gICAgb246IGZ1bmN0aW9uIChldmVudE5hbWUsIGNhbGxiYWNrLCBjdHgpIHtcbiAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYWxsYmFjayBpcyBleHBlY3RlZCB0byBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICB9XG4gICAgICB2YXIgaGFuZGxlcnMgPSByZWdpc3RlcmVkRXZlbnRzW2V2ZW50TmFtZV07XG4gICAgICBpZiAoIWhhbmRsZXJzKSB7XG4gICAgICAgIGhhbmRsZXJzID0gcmVnaXN0ZXJlZEV2ZW50c1tldmVudE5hbWVdID0gW107XG4gICAgICB9XG4gICAgICBoYW5kbGVycy5wdXNoKHtjYWxsYmFjazogY2FsbGJhY2ssIGN0eDogY3R4fSk7XG5cbiAgICAgIHJldHVybiBzdWJqZWN0O1xuICAgIH0sXG5cbiAgICBvZmY6IGZ1bmN0aW9uIChldmVudE5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgd2FudFRvUmVtb3ZlQWxsID0gKHR5cGVvZiBldmVudE5hbWUgPT09ICd1bmRlZmluZWQnKTtcbiAgICAgIGlmICh3YW50VG9SZW1vdmVBbGwpIHtcbiAgICAgICAgLy8gS2lsbGluZyBvbGQgZXZlbnRzIHN0b3JhZ2Ugc2hvdWxkIGJlIGVub3VnaCBpbiB0aGlzIGNhc2U6XG4gICAgICAgIHJlZ2lzdGVyZWRFdmVudHMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgICByZXR1cm4gc3ViamVjdDtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlZ2lzdGVyZWRFdmVudHNbZXZlbnROYW1lXSkge1xuICAgICAgICB2YXIgZGVsZXRlQWxsQ2FsbGJhY2tzRm9yRXZlbnQgPSAodHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKTtcbiAgICAgICAgaWYgKGRlbGV0ZUFsbENhbGxiYWNrc0ZvckV2ZW50KSB7XG4gICAgICAgICAgZGVsZXRlIHJlZ2lzdGVyZWRFdmVudHNbZXZlbnROYW1lXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgY2FsbGJhY2tzID0gcmVnaXN0ZXJlZEV2ZW50c1tldmVudE5hbWVdO1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2FsbGJhY2tzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2tzW2ldLmNhbGxiYWNrID09PSBjYWxsYmFjaykge1xuICAgICAgICAgICAgICBjYWxsYmFja3Muc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gc3ViamVjdDtcbiAgICB9LFxuXG4gICAgZmlyZTogZnVuY3Rpb24gKGV2ZW50TmFtZSkge1xuICAgICAgdmFyIGNhbGxiYWNrcyA9IHJlZ2lzdGVyZWRFdmVudHNbZXZlbnROYW1lXTtcbiAgICAgIGlmICghY2FsbGJhY2tzKSB7XG4gICAgICAgIHJldHVybiBzdWJqZWN0O1xuICAgICAgfVxuXG4gICAgICB2YXIgZmlyZUFyZ3VtZW50cztcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmaXJlQXJndW1lbnRzID0gQXJyYXkucHJvdG90eXBlLnNwbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICB9XG4gICAgICBmb3IodmFyIGkgPSAwOyBpIDwgY2FsbGJhY2tzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBjYWxsYmFja0luZm8gPSBjYWxsYmFja3NbaV07XG4gICAgICAgIGNhbGxiYWNrSW5mby5jYWxsYmFjay5hcHBseShjYWxsYmFja0luZm8uY3R4LCBmaXJlQXJndW1lbnRzKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHN1YmplY3Q7XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZVN1YmplY3Qoc3ViamVjdCkge1xuICBpZiAoIXN1YmplY3QpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0V2ZW50aWZ5IGNhbm5vdCB1c2UgZmFsc3kgb2JqZWN0IGFzIGV2ZW50cyBzdWJqZWN0Jyk7XG4gIH1cbiAgdmFyIHJlc2VydmVkV29yZHMgPSBbJ29uJywgJ2ZpcmUnLCAnb2ZmJ107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcmVzZXJ2ZWRXb3Jkcy5sZW5ndGg7ICsraSkge1xuICAgIGlmIChzdWJqZWN0Lmhhc093blByb3BlcnR5KHJlc2VydmVkV29yZHNbaV0pKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTdWJqZWN0IGNhbm5vdCBiZSBldmVudGlmaWVkLCBzaW5jZSBpdCBhbHJlYWR5IGhhcyBwcm9wZXJ0eSAnXCIgKyByZXNlcnZlZFdvcmRzW2ldICsgXCInXCIpO1xuICAgIH1cbiAgfVxufVxuIl19
