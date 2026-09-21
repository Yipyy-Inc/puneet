// The SAME section the facility admin sees, re-exported into the employee
// shell — the pattern every other route under (shell) already uses.
//
// It has to be a real file: Next resolves a static segment ahead of a dynamic
// one, so the employee portal's lone [section] route 404s any segment the
// facility portal has given a page of its own.
export { default } from "@/app/facility/dashboard/settings/species/page";
