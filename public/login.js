// Legacy login.js is retired. No credentials, tokens or privileged APIs are used.
// Protect any previously cached login.html page that still references this script.
function switchView() {
  window.location.replace("/#/companion");
}
function handleAuthSubmission(event) {
  event.preventDefault();
  window.location.replace("/#/companion");
}
