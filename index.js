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
