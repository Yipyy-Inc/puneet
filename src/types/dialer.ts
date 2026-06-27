// A facility the support team recently placed an outbound call to (powers the
// Dialer "Recent Contacts" quick-redial list).

export interface RecentCall {
  id: string;
  facilityId: number;
  facilityName: string;
  /** The number that was dialed (the facility's contact number). */
  number: string;
  /** When the call was placed (ISO). */
  at: string;
}
