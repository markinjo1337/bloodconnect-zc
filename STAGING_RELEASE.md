# Staging verification and release preparation

Production deployment is not authorized yet. The existing PR Netlify preview still loads production Firebase. Do not use that preview for fictitious writes.

## 1. Inspect deployed production rules without changing them

In Firebase console, open `bloodconnect-zc` → Firestore Database → Rules. Copy the currently published rules to a local text file for comparison with this branch's `firestore.rules`. Record the published version/date shown. Do not press Publish. A repository file is not evidence of what is deployed.

## 2. Prepare a separate Firebase test project

Create a separate project, for example `bloodconnect-zc-staging` (the actual ID may differ if taken). Use the free Spark plan if available; the static Auth/Firestore prototype needs no Cloud Functions or SMS integration. Do not copy production accounts or records.

- Enable Authentication → Email/Password.
- Create Cloud Firestore using production/locked mode initially, then publish this branch's `firestore.rules` **only to the staging project** after verifying its project ID in the console.
- Register a Web app. Save its `firebaseConfig` object as valid JSON locally (no `const`, no JavaScript wrapper). This is public web configuration, not a service-account key. Never share private keys, CLI tokens or passwords in chat.
- Add the staging site's exact hostname to Authentication → Settings → Authorized domains if required by the selected authentication flow. Do not weaken production settings.

## 3. Produce the isolated static artifact

From the review branch:

```sh
node scripts/build-staging.cjs /path/to/staging-firebase.json
```

Only `.preview/staging/` is for the separate staging site. It contains `index.html`, `coordination.js`, staging `config.js`, and `_headers`. The builder rejects the production project ID, production web app identifiers, emulator IDs and service-account fields. It does not deploy anything or modify production configuration. The banner identifies the target project. The supplied JSON still needs to be checked against the staging console; local validation is not proof of Firebase ownership/access.

Deploy that generated folder to a **separate Netlify test site**, not the live site. Do not upload the repository root or the emulator preview server. Record the actual resulting URL; do not guess it. Keep any Netlify access protection available for review. The staging Firebase rules still enforce access independently of the website's visibility.

## 4. Validate authenticated workflows on staging

Create fictitious requester, staff, three compatible donor, and non-staff accounts in the staging app. In the staging Firestore console only, an administrator sets the staff test account's `users/{uid}.role` to `staff`. Do not change any production account. Never point the local reset/seed helpers at a hosted project; they are emulator-only.

Run the three-unit scenario from DEFENSE_REVIEW.md. Verify acceptances and recorded donations leave the request open; two received units leave one outstanding; fulfillment at two fails; three units require separate explicit confirmation; no-stock/no-donor requests stay in the queue. Verify donor history and staff-only actions with the non-staff account. Confirm compatibility/eligibility, stale-save rejection, failed-save messages, and draft preservation. Use only fictitious identities and contacts.

Record browser, viewport, account role, observed outcome and console errors. Console-only/manual checks do not replace the already existing adversarial emulator rules tests. Do not claim hosted tests passed until observed.

## 5. Later production release, only after explicit authorization

Review the actual deployed rules, passing CI and staging evidence first. Archive the currently deployed app and rules. The new rules and app change request-creation/alert writes together; old cached app tabs may be rejected by the stricter rules. Plan a short coordinated release window and ask users to reload. Do not temporarily weaken rules for compatibility.

The release must include `index.html`, `coordination.js`, the original production `config.js`, and the reviewed Firestore rules. Never publish staging config or emulator helpers to production. Do not infer received totals or migrate old donations automatically. Review any rollback as an app/rules pair; reverting only the rules can restore the reviewed security defects. No release or rollback is executed by this document.
