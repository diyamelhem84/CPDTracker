CPD Tracker GOLD V90 – Clean Rebuild Stable Core
Build: 20260510goldv90_clean_rebuild_stable_core

Built from V68 Responsive Enterprise as the baseline.

Clean rebuild changes:
1. One stable logout engine: cleanLogout().
2. One sidebar clock only; no page-head/top-right clock.
3. One CPD color engine:
   Green = Completed >=80/80
   Blue = In Progress >0 and <80
   Red = At Risk 0/80
   Gray = T.Nurse / No CPD Required
4. Replaced old Smart Alerts wording with Leadership Focus to avoid legacy alert return.
5. One notification overlay; clicking outside closes it.
6. Notification badge excludes DHP email sent logs.
7. DHP email reminders are protected by database sent logs, not localStorage only.
8. Print / Save as PDF styling preserved.
9. Removed old backup/readme files from the deploy package.

Important after Netlify upload:
1. Open /clear-cache.html
2. Clear site data + unregister service worker
3. Open /?v=20260510goldv90_clean_rebuild_stable_core
