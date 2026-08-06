// Wraps navigator.geolocation with clearer, actionable error messages, and
// provides an address -> lat/lng fallback (via OpenStreetMap Nominatim) for
// devices/browsers where GPS/location services aren't available or allowed.

export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser doesn't support location access."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        let message = "Couldn't get your current location.";
        if (err.code === err.PERMISSION_DENIED) {
          message =
            "Location access is blocked for this site. Allow it in your browser's site " +
            "settings, and make sure Location is turned on in Windows Settings \u2192 Privacy " +
            "& security \u2192 Location.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message =
            "Your device couldn't determine a location. Check that Location is turned on in " +
            "Windows Settings \u2192 Privacy & security \u2192 Location, and that you're connected " +
            "to the internet or Wi-Fi (used for positioning).";
        } else if (err.code === err.TIMEOUT) {
          message = "Getting your location took too long. Please try again.";
        }
        reject(new Error(message));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000, ...options }
    );
  });
}

// Looks up approximate coordinates for a free-text address using OpenStreetMap's
// public Nominatim API. No API key needed; fine for occasional, user-triggered
// lookups like this. For high-volume production use, swap in a paid geocoder.
export async function geocodeAddress(query) {
  if (!query || !query.trim()) {
    throw new Error("Enter a location first.");
  }
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  let res;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" } });
  } catch {
    throw new Error("Couldn't reach the location lookup service. Check your connection.");
  }
  if (!res.ok) throw new Error("Location lookup failed. Please try again.");
  const data = await res.json();
  if (!data.length) throw new Error("Couldn't find that location. Try a more specific address.");
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}
