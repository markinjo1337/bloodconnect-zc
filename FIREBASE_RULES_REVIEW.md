# Review of user-provided production rules

Date: November 26, 2026 (UTC+8). Source: rules pasted by the project owner in this chat after opening Firebase console. This is a source review of that supplied copy, not an authenticated fetch of the deployed rules/version. No production write or rule publication was performed.

| Area | Supplied rules | Review branch |
| --- | --- | --- |
| Coordination and donation history | No matching collection rules; access is implicitly denied | Explicit staff-only coordination; staff-written, owner-readable immutable donation history |
| Received units and fulfillment | Staff may update any request fields without further constraints | Bounded cumulative totals, server metadata, revisions, known blood type, full total and separate explicit confirmation |
| Donor alerts | Any signed-in user can change `notified` arbitrarily | Exact single append, authorized actor and current compatibility/eligibility checks |
| Donor responses | Only checks changed response keys against profile donor code; no ownership, notification, status or response-value validation | Linked donor ownership, open request, notified donor, accepted/declined values and current eligibility for acceptance |
| Account creation | Allows an arbitrary `donorCode` alongside `role: user`; combined with the response rule this permits donor impersonation in responses | Initial donor code must be empty; linkage requires the owned donor record |
| Consent and initial request state | No mandatory consent linkage, unit bounds or protection against preloaded receipt fields | Explicit consent-linked creation and restricted fields/initial totals |
| Donation/date consistency | No donation collection access; unrestricted staff donor/request updates | Donation recording atomically requires the corresponding donor last-donation date and repeat status |
| Private-record reads | Already restricted to owner or staff | Retained; no blanket public access added |

The supplied `myDonorCode()` directly calls `profile()`, unlike the guarded fallback in the original repository. Do not assume the published rules are byte-identical to a repository revision.

## Consequences for the current PR preview

If this supplied copy is the published ruleset, coordination reads/saves and donation history reads/recording fail with permission errors even though the new UI is visible. Existing client validation is not a replacement for the new rules: a modified client can still bypass receipt and matching restrictions permitted by the old rules.

Do not fix this by granting broad access or by treating a failed UI save as successful. Validate the branch rules in a separate staging Firebase project, then plan an explicitly authorized app/rules release. The new rules change request creation and alert writes, so publishing them alone can reject writes from old cached app versions. No data backfill is required or authorized.

Remaining evidence: published rules version/date, independent administrative retrieval if access is later connected, and authenticated hosted staging results. Emulator tests already cover the intended replacement rules; they do not prove what production currently runs.
