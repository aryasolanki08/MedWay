import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import L from "leaflet";
import { Star } from "lucide-react";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { useTheme } from "../context/ThemeContext.jsx";
import PharmacyReviewModal from "./PharmacyReviewModal.jsx";

const defaultIcon = new L.Icon({ iconUrl, shadowUrl, iconSize: [25, 41], iconAnchor: [12, 41] });

const TILE_LAYERS = {
  light: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; OpenStreetMap contributors',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; OpenStreetMap contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
};

function pinIcon(label) {
  const html = renderToStaticMarkup(
    <div className={`map-pin${label ? "" : " map-pin-muted"}`}>{label || "?"}</div>
  );
  return L.divIcon({ html, className: "", iconSize: null, iconAnchor: [28, 14] });
}

const userLocationIcon = L.divIcon({
  html: renderToStaticMarkup(
    <div className="user-location-marker">
      <div className="user-location-pulse" />
      <div className="user-location-dot" />
    </div>
  ),
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function FitToMarkers({ points, includePoint }) {
  const map = useMap();
  useEffect(() => {
    const all = includePoint ? [...points, includePoint] : points;
    if (all.length === 0) return;
    if (all.length === 1) {
      map.setView(all[0], 13);
      return;
    }
    map.fitBounds(all, { padding: [30, 30] });
  }, [map, points, includePoint]);
  return null;
}

export default function PharmacyMap({ center, pharmacies = [], height = 320, fitToMarkers = false, customPins = false, activeId = null, showUserLocation = true }) {
  const { theme } = useTheme();
  const tiles = TILE_LAYERS[theme] || TILE_LAYERS.light;
  const [reviewing, setReviewing] = useState(null);

  if (!center) return null;

  const points = pharmacies.map((p) => [p.lat ?? p.pharmacy_lat, p.lng ?? p.pharmacy_lng]);

  return (
    <>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height, width: "100%", borderRadius: "12px" }}
        scrollWheelZoom={false}
      >
        <TileLayer attribution={tiles.attribution} url={tiles.url} />
        {fitToMarkers && <FitToMarkers points={points} includePoint={showUserLocation ? center : null} />}
        {showUserLocation && (
          <Marker position={center} icon={userLocationIcon} zIndexOffset={2000}>
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>You are here</Tooltip>
          </Marker>
        )}
        {pharmacies.map((p) => {
          const id = p.id || p.pharmacy_id;
          const name = p.name || p.pharmacy_name;
          const tooltipLabel = p.price != null ? `₹${p.price}` : p.avg_rating != null ? `★ ${p.avg_rating.toFixed(1)}` : null;
          return (
            <Marker
              key={id}
              position={[p.lat ?? p.pharmacy_lat, p.lng ?? p.pharmacy_lng]}
              icon={customPins ? pinIcon(tooltipLabel) : defaultIcon}
              zIndexOffset={activeId === id ? 1000 : 0}
            >
              {customPins && tooltipLabel && (
                <Tooltip direction="top" offset={[0, -16]} opacity={1}>
                  {name}
                </Tooltip>
              )}
              <Popup>
                <strong>{name}</strong>
                {p.distance_km != null && <div>{p.distance_km} km away</div>}
                {p.avg_rating != null && (
                  <div className="row" style={{ gap: 3, marginTop: 4 }}>
                    <Star className="h-3.5 w-3.5" style={{ color: "#f59e0b" }} fill="#f59e0b" />
                    <span>{p.avg_rating.toFixed(1)} ({p.review_count})</span>
                  </div>
                )}
                <button
                  className="link-btn"
                  style={{ marginTop: 6, display: "block" }}
                  onClick={() => setReviewing({ id, name, address: p.address })}
                >
                  Rate & reviews
                </button>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      {reviewing && <PharmacyReviewModal pharmacy={reviewing} onClose={() => setReviewing(null)} />}
    </>
  );
}
