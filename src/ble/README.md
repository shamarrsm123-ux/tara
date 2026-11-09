# ble/ — tarha connection (Phase 7)
Scan, blink-to-identify, bond, encrypted-link check, reconnect backoff. Implements `TarhaSource` (09 §2). Only ui/ selectors and engine/ inputs cross this boundary; ui/ never imports ble/ (06 §4).
