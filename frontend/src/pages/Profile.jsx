import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { geocodeAddress } from "../utils/geo.js";
import { AHMEDABAD_AREAS, DEFAULT_CITY, DEFAULT_STATE } from "../utils/locations.js";

const labelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    phone: user?.phone || "",
    city: user?.city || DEFAULT_CITY,
    state: user?.state || DEFAULT_STATE,
    area: user?.area || "",
    location_label: user?.location_label || "",
    avoid_nsaids: user?.avoid_nsaids || false,
  });
  const [busy, setBusy] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const useAddressLocation = async () => {
    setGeocoding(true);
    try {
      const { lat, lng } = await geocodeAddress(form.location_label);
      await updateProfile({ location_lat: lat, location_lng: lng });
      toast.success("Location updated");
    } catch (err) {
      toast.error(err.message || "Couldn't look up that address.", 6000);
    } finally {
      setGeocoding(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updateProfile(form);
      toast.success("Profile saved");
    } catch {
      toast.error("Couldn't save your changes. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page stack">
      <div>
        <h1>Profile</h1>
        <p className="muted">Your account details and search preferences.</p>
      </div>

      <form className="card stack" onSubmit={submit}>
        <div>
          <label className={labelClass}>Username</label>
          <div className="muted" style={{ marginTop: 0 }}>{user?.username} (cannot be changed)</div>
        </div>

        <div>
          <label className={labelClass}>Phone</label>
          <input
            className="input"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>

        <div>
          <label className={labelClass}>Area</label>
          <select
            className="input"
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value })}
          >
            <option value="" disabled>Select your area (Ahmedabad)</option>
            {AHMEDABAD_AREAS.map((area) => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
          <p className="muted" style={{ marginBottom: 0 }}>
            Search and the pharmacy directory default to pharmacies in this area.
          </p>
        </div>

        <div>
          <label className={labelClass}>Precise address (optional)</label>
          <input
            className="input"
            placeholder="e.g. 12 Some Society, Navrangpura, Ahmedabad"
            value={form.location_label}
            onChange={(e) => setForm({ ...form, location_label: e.target.value })}
          />
          <p className="muted" style={{ marginBottom: 0 }}>
            Overrides your area's default map pin with a precise location -- useful for
            distance-sorted results and the store-locator map.
          </p>
        </div>

        <div className="stack" style={{ gap: 8 }}>
          <button
            type="button"
            className="btn secondary"
            onClick={useAddressLocation}
            disabled={geocoding || !form.location_label.trim()}
            style={{ alignSelf: "flex-start" }}
          >
            {geocoding ? "Looking up..." : "Set location from address above"}
          </button>
          {user?.location_lat && (
            <span className="muted" style={{ marginTop: 0 }}>
              Saved: {user.location_lat.toFixed(4)}, {user.location_lng.toFixed(4)}
            </span>
          )}
        </div>

        <label className="row" style={{ alignItems: "flex-start" }}>
          <input
            type="checkbox"
            checked={form.avoid_nsaids}
            onChange={(e) => setForm({ ...form, avoid_nsaids: e.target.checked })}
            style={{ marginTop: 4 }}
          />
          <span>
            Hide NSAID-category results from my searches
            <div className="muted">
              This only filters what's shown to you -- it isn't medical advice. Please confirm
              any exclusions with your doctor or pharmacist.
            </div>
          </span>
        </label>

        <button className="btn" disabled={busy}>{busy ? "Saving..." : "Save changes"}</button>
      </form>
    </div>
  );
}
