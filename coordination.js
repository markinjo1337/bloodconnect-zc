// Coordination totals are explicitly verified by staff, never inferred from donations.
export const CONTACT_RESULTS = ['unverified', 'awaiting reply', 'no stock', 'possible availability', 'referral'];
export const BLOOD_TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
export function normalizeRequest(record) {
  return { ...record,
    notified: Array.isArray(record.notified) ? record.notified : [],
    responses: record.responses && typeof record.responses === 'object' && !Array.isArray(record.responses) ? record.responses : {},
    donated: Array.isArray(record.donated) ? record.donated : [],
    verifiedReceivedUnits: Number.isInteger(record.verifiedReceivedUnits) && record.verifiedReceivedUnits >= 0 ? record.verifiedReceivedUnits : 0,
    receiptRevision: Number.isInteger(record.receiptRevision) ? record.receiptRevision : 0
  };
}
export const unresolved = r => !['fulfilled', 'cancelled'].includes(r.status);
export const outstanding = r => Math.max(0, (Number(r.units) || 0) - normalizeRequest(r).verifiedReceivedUnits);
export function coordinationQueue(records) {
  const priority = { Critical: 0, Urgent: 1, Scheduled: 2 };
  return records.filter(unresolved).slice().sort((a, b) =>
    (priority[a.urgency] ?? 3) - (priority[b.urgency] ?? 3) || (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0) || String(a.code).localeCompare(String(b.code)));
}
export function validateReceivedTotal(r, total) {
  if (!unresolved(r)) throw new Error('This request is already closed.');
  if (!Number.isInteger(total) || total < 0 || total > r.units) throw new Error('Enter a whole cumulative total from 0 to the requested units.');
}
export function validateFulfillment(r, confirmed) {
  if (!unresolved(r)) throw new Error('This request is already closed.');
  if (!BLOOD_TYPES.includes(r.bloodType)) throw new Error('Confirm the request blood type first.');
  if (!Number.isInteger(r.units) || r.units < 1 || normalizeRequest(r).verifiedReceivedUnits < r.units) throw new Error('The full requested total must be verified as received first.');
  if (!confirmed) throw new Error('Explicit staff confirmation is required.');
}
