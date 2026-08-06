// Lightweight cross-component signal: anything that changes what the
// notification feed would show (creating/cancelling a reservation, etc.)
// calls notifyNotificationsChanged() so the bell refetches immediately
// instead of waiting on its 60s poll.
const EVENT = "medway:notifications-changed";

export function notifyNotificationsChanged() {
  window.dispatchEvent(new Event(EVENT));
}

export function onNotificationsChanged(handler) {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
