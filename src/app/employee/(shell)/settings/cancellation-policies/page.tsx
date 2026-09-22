// The SAME section the facility admin sees, re-exported into the employee
// shell — the pattern every other route under (shell) already uses.
//
// It has to be a real file: Next resolves a static segment ahead of a dynamic
// one, so the lone [section] route answers 404 for a segment that already has
// a page in the facility portal.
export { default } from "@/app/facility/dashboard/settings/cancellation-policies/page";
