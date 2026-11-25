# BloodConnect ZC defense repair review

Review branch: `repair/defense-coordination`. No production deployment or live-data modification is authorized by this branch.

## Source inspection

- Fetched `origin/main`; it matches starting commit `c9d9fef4014e7d90cbd37bff772ffbe136da30a5` (November 15, 2026).
- Only two commits exist at the starting revision: the initial README and one upload containing the app. There is no earlier app revision to selectively revert.
- The source is root `index.html`, with inline CSS and JavaScript modules, Firebase JS SDK 11.0.2 from Google's CDN, and `config.js`. No React/Vue or application build pipeline existed. This repair retains the static app; npm dependencies are development/test tooling only.
- The user identified `https://bloodconnect-zc.netlify.app/` as production. Direct inspection is currently blocked by this environment's hostname policy (HTTP CONNECT 403). GitHub exposes no commit deployment status for the starting revision. **The production source and deployed Firestore rules have not been verified to match this checkout.** Existing `/tmp` HTML copies are not treated as proof of deployment.
- No separate attached documentation, ZIP, or screenshot file was available. `GABAY.md` and `README.md` were read as project context, not executed as setup instructions.

## Diagnosed and repaired UI defects

- Hash routes initialized `state.tab` before `state` existed. Reproduced on the original `#requests` page: startup error and persistent Loading screen. Hash initialization now runs after state construction.
- A device's dark preference automatically changed the original theme. The document now explicitly defaults to light, retaining red branding, layout, forms, and navigation.
- Form/grid children can shrink safely on narrow screens; progress text wraps and the navigation remains internally scrollable. The active navigation item scrolls into view.
- Snapshot refreshes no longer erase a form being edited. Failed saves retain entered data and show an error; success messages follow successful commits.
- A delayed startup message offers reload if Firebase/CDN services cannot be reached.

## Coordination behavior

- Staff-only queue: unresolved requests, urgency Critical → Urgent → Scheduled, then oldest posting first. No-stock/no-donor cases remain visible.
- `coordination/{requestCode}` stores the latest facility, one of the five requested manual results, server timestamp, staff UID, and revision. It is staff-readable and staff-writable. This is not inventory or a reservation.
- Request `responses` remain donor acceptances/declines. `donated` remains a list of recorded donors. New immutable `donations/{requestCode}_{donorCode}` records support owner-only donation history and deterministic deduplication.
- Recording a donation transaction updates the donation history, request donor list, and donor's last donation date. It never changes received units or fulfills a request.
- `verifiedReceivedUnits` is a staff-verified cumulative total, including supply obtained from a facility. It is an absolute number, never an increment. The form validates whole totals from zero through requested units, allowing a staff correction before closure. Receipt revision checks reject stale saves from another tab/staff member.
- Fulfillment is a separate transaction requiring a known ABO/Rh request type, the full verified total, and explicit confirmation, with staff UID and server timestamp. Rules also enforce these conditions; a receipt write cannot simultaneously fulfill a request.
- Old missing list/map fields are normalized. Missing received totals are zero; old donation counts are never used to infer received units. Legacy donor history is labeled as undated. Existing fulfilled records are left untouched and should be manually reviewed if their previous automatic fulfillment is questionable.
- Consent, authentication, matching, preliminary eligibility, staff screening, directory editing, and ID lookup remain in the app. Private records remain restricted to their owner and staff. Knowing an ID does not grant private-record access.
- No medical thresholds changed: age 18–65, minimum weight 50 kg, whole-blood interval 90 days; systolic 90–160, diastolic 60–100, pulse 50–100, temperature maximum 37.5°C. Existing ABO/Rh red-cell compatibility remains unchanged.
- SMS is explicitly simulated. No donor-alert email, background notification, inventory feed, free-unit entitlement, fee waiver, or donation-priority promise is implemented.

## Verification status

Local completed checks:

- 5/5 coordination unit tests: acceptance/donation separation, 2-of-3 rejection, full total plus explicit confirmation, old-record defaults, and urgency/time queue ordering.
- 4/4 Chromium layout sweeps at 360, 390, 768, and 1440 px, including light theme under a dark OS preference, home, requests, request form, donor registration, screening, staff queue, facility directory, rules, SMS, request details, and donor history. No document-wide horizontal overflow or uncaught page JavaScript errors in these **fictitious layout-fixture tests**.
- Visually inspected mobile home and request coordination screenshots.
- Syntax and whitespace checks passed.

Not yet verified locally:

- Firestore rules compilation, permission enforcement, and authenticated end-to-end workflow. The Firestore emulator download was denied by the environment network policy; the attempted rules suite stopped during setup with `ECONNREFUSED 127.0.0.1:8086`. These are **not passing tests**.
- The PR workflow runs eight rules tests and three authenticated browser scenarios, including the full three-unit scenario, no-stock follow-up, duplicate donation rejection, nonstaff writes, owner privacy, stale receipt forms, failed saves after staff-role revocation, consent, ID lookup, and screening. Record its actual result before marking this repair ready.
- Production Netlify source, deployed rules, real Firebase authentication, live records, real-device browsers, and attached-document screenshot comparison have not been tested.

## Preview and repeatable tests

The development preview bundles the existing app with a **demo-only** Firebase configuration and proxies SDK calls solely to local emulators. It does not load `config.js` or contact the production Firebase project. The yellow banner identifies fictitious data. Keep this preview server private; do not deploy it as production hosting.

```sh
npm ci
npm run emulators
```

In another terminal:

```sh
npm run seed:demo
npm run preview
```

Preview port: **3000**. Add that HTTP Preview port to the managed environment to obtain its authenticated URL. `localhost` is only reachable on the machine running the server until forwarding/preview access is configured.

Fictitious accounts: `staff@example.test`, `requester@example.test`, `donor1@example.test` through `donor3@example.test`, and `outsider@example.test`. Password: `Defense27!`.

While the emulators run, `npm test` runs unit, security-rules, and browser checks. Playwright starts the preview servers if needed. `npm run test:layout` can run independently using an explicitly injected layout fixture; it does not verify Auth or database saves. Screenshots and browser JSON results go to ignored `artifacts/`.

The seed script resets only `demo-bloodconnect-zc` on `127.0.0.1`; the rules suite uses `demo-bloodconnect-rules`. Never point these helpers at a real project. GitHub Actions runs the same suite against disposable emulators and uploads test evidence.

## Documentation differences and release prerequisites

`GABAY.md` predates these changes: it lists four app files (now also ship `coordination.js`), says an empty directory seeds automatically (now an explicit staff action), and does not describe receipt verification, coordination, or donation history. It correctly describes Firebase roles, public/private records, and simulated SMS. Its deploy instructions have not been executed. The separately mentioned attached documentation must still be provided for a full discrepancy/screenshot comparison.

Before any later production release: verify the live source/configuration, complete emulator tests and review their evidence, review actual deployed rules, and plan the app/rules release together. Existing rules do not protect the new workflow; hiding controls is insufficient. There is no data migration or inferred backfill in this branch. Do not merge/deploy while these verification items remain open.
