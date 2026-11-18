# How TARA protects mental privacy

TARA reads a stress signal from a small sensor behind the ear. That is brain-derived data, so we built TARA so that
**it never leaves her phone** — and so that every promise below can be checked, not just believed.

**Try this:** install the APK → turn on **airplane mode** → Choose language → *Try to Calm Your Brain* → Connect →
**Use demo instead** → watch the Story → Safety → **Delete Everything** (hold 3 s). Everything works offline.

| # | Promise | How TARA keeps it | How you can check |
|---|---|---|---|
| P1 | Brain data never leaves the phone | The release app does **not** request the INTERNET permission; no network, analytics, crash or update libraries | `aapt2 dump badging app-release.apk` → no `INTERNET` (CI checks every build) · run it in airplane mode |
| P2 | Processed on the phone only | All stress logic is local code on the phone; there is no server and no remote model | Airplane mode: the Calm meter, prompts and cooling all still work |
| P3 | Encrypted | Saved data is in an encrypted database (SQLCipher); the key lives in the phone's secure keystore | Pull `tara.db` from a debug build and open it with plain SQLite → "file is not a database" |
| P4 | Deleted after 7 days at most | Only one summary per minute is stored; rows older than her setting (7, 3 or 1 day) are deleted on start and every hour; the database itself refuses more than 7 days | Safety → *Delete my data after* offers only shorter choices |
| P5 | Delete Everything | The key is destroyed first (unreadable at once), then the database files, then preferences; reminders cancelled; tarha forgotten | Safety → Delete Everything → the app returns to *Choose language* like a new install |
| P6 | Nothing saved while trying | Storage is created only when she taps **Yes** on "Do you want to save this experience?" | Choose **No** → "Nothing was saved." → the app restarts fresh |
| P7 | No location tracking | No location API anywhere in the code; Android 12+ scans Bluetooth with "never for location"; Android 8–11 needs the phone's "location" permission only to find the tarha, explained first | App permissions screen · CI source scan for location APIs |
| P8 | Help only with her approval, every time | The only outgoing path is the phone's own SMS app, opened from the preview she sees; **she** presses Send | Help → Yes → the exact message is shown before anything opens |
| P9 | A general place only | She may add one of four words (in the field / at home / at the market / on the road) — no coordinates exist | Safety → General place |
| P10 | No identity required | No login, no phone number of hers, no exact age; name is optional | Screen 5: name and age group both have Skip |
| P11 | Others holding her phone can't see her data (if she wants) | Optional App Lock with the phone's own PIN / pattern / fingerprint | Safety → Lock TARA |
| P12 | The lock screen doesn't reveal stress | Notifications say only "TARA: time for a cool break." — never "high stress" | Lock the phone during the Story demo |
| P4a | Cycle dates are minimal (opt-in PMDD-aware cooling) | Only the day each period started — never flow, pain or mood — and only the latest 6; never on the lock screen; deleted with everything else | Settings → PMDD-aware cooling explains exactly this |
| P13 | Demo never mixes with real data | Every reading carries its source; the database refuses demo rows; demo screens always show **DEMO — not real brain data** | The yellow DEMO banner is on every demo screen |

**Honesty:** TARA's stress index is a research signal compared with her own calm baseline, not a medical
measurement. TARA is a research prototype, not a medical device, and does not diagnose illness.
