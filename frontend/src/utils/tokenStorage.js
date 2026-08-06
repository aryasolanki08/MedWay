// "Remember me" backing store: checked -> tokens survive browser restarts
// (localStorage); unchecked -> tokens are cleared when the tab/browser
// closes (sessionStorage). The remember flag itself lives in localStorage
// (not sensitive) so a page reload knows which storage to read from.
const REMEMBER_KEY = "medway_remember";
const ACCESS_KEY = "medway_access";
const REFRESH_KEY = "medway_refresh";

function isRemembering() {
  return localStorage.getItem(REMEMBER_KEY) !== "false";
}

function activeStorage() {
  return isRemembering() ? localStorage : sessionStorage;
}

export function setTokens(access, refresh, remember = true) {
  localStorage.setItem(REMEMBER_KEY, remember ? "true" : "false");
  const store = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  store.setItem(ACCESS_KEY, access);
  store.setItem(REFRESH_KEY, refresh);
  other.removeItem(ACCESS_KEY);
  other.removeItem(REFRESH_KEY);
}

export function setAccess(access) {
  activeStorage().setItem(ACCESS_KEY, access);
}

export function getAccess() {
  return activeStorage().getItem(ACCESS_KEY);
}

export function getRefresh() {
  return activeStorage().getItem(REFRESH_KEY);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}
