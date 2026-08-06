"""Real Ahmedabad localities pharmacies/users can be tagged with, replacing
free-text-only addressing with a proper City/State/Area hierarchy (see
pharmacies.Pharmacy.city/state/area and accounts.User.city/state/area).

Deliberately a plain list, not a DB table -- this is static reference data
that essentially never changes at runtime, not something either portal
needs to query live. Mirrored by hand in three other places that can't
share a Python import across services/languages:
  - pharmacy-backend/accounts/locations.py
  - frontend/src/utils/locations.js
  - pharmacy-frontend/src/utils/locations.js
Keep all four in sync if this list changes.

Every locality below is a real, well-known Ahmedabad area (verified against
either a live OpenStreetMap Overpass API pharmacy-location pull, or general
knowledge of the city's well-established localities) -- none are invented.
"""

DEFAULT_CITY = "Ahmedabad"
DEFAULT_STATE = "Gujarat"

AHMEDABAD_AREAS = [
    "Satellite",
    "Vastrapur",
    "Bodakdev",
    "Thaltej",
    "Prahladnagar",
    "Bopal",
    "South Bopal",
    "Navrangpura",
    "Ellisbridge",
    "Paldi",
    "CG Road",
    "Ashram Road",
    "Maninagar",
    "Naranpura",
    "Ghatlodia",
    "Chandkheda",
    "Sabarmati",
    "Motera",
    "Nava Vadaj",
    "Ranip",
    "New Ranip",
    "Gota",
    "Shahibaug",
    "Memnagar",
    "Vejalpur",
    "Ambawadi",
    "Usmanpura",
    "Vastral",
    "Bapunagar",
    "Sarkhej",
    "Juhapura",
    "SG Highway",
]

# Representative lat/lng per area, geocoded via Nominatim (the same free
# OSM geocoder used elsewhere in this codebase, see
# management/commands/sync_pharmacy_data.py) -- real coordinates, not
# guessed. Used to place new pharmacies and to backfill a user's
# location_lat/lng once they pick an Area, without a separate geocode step.
AREA_COORDINATES = {
    "Satellite": (23.0271754, 72.5094001),
    "Vastrapur": (23.0400861, 72.5290418),
    "Bodakdev": (23.0445921, 72.5173440),
    "Thaltej": (23.0485393, 72.5117420),
    "Prahladnagar": (23.0114464, 72.5092934),
    "Bopal": (23.0385802, 72.4587752),
    "South Bopal": (23.0235385, 72.4705270),
    "Navrangpura": (23.0359998, 72.5643429),
    "Ellisbridge": (23.0231657, 72.5602628),
    "Paldi": (23.0145531, 72.5635432),
    "CG Road": (23.0260111, 72.5567179),
    "Ashram Road": (23.0242311, 72.5713983),
    "Maninagar": (22.9986596, 72.6114013),
    "Naranpura": (23.0567133, 72.5508575),
    "Ghatlodia": (23.0848516, 72.5303277),
    "Chandkheda": (23.1100643, 72.5811205),
    "Sabarmati": (23.0770712, 72.5890677),
    "Motera": (23.0917717, 72.5973345),
    "Nava Vadaj": (23.0682238, 72.5640995),
    "Ranip": (23.0766234, 72.5764197),
    "New Ranip": (23.0925290, 72.5613230),
    "Gota": (23.1010002, 72.5408363),
    "Shahibaug": (23.0556364, 72.5965538),
    "Memnagar": (23.0516973, 72.5351690),
    "Vejalpur": (23.0069372, 72.5208415),
    "Ambawadi": (23.0226117, 72.5490834),
    "Usmanpura": (23.0494863, 72.5672615),
    "Vastral": (22.9948656, 72.6624431),
    "Bapunagar": (23.0324369, 72.6313566),
    "Sarkhej": (22.9834830, 72.5007203),
    "Juhapura": (23.0040778, 72.5285046),
    "SG Highway": (23.1141806, 72.5363076),
}
