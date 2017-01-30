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
