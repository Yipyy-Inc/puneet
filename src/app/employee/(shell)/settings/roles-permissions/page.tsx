// The SAME section the facility admin sees, re-exported into the employee
// shell — the pattern every other route under (shell) already uses.
//
// It has to be a real file. Next resolves a static segment ahead of a dynamic
// one, so once the facility portal grew 50 static pages the employee portal's
// lone [section] route was the ONLY thing serving them there — and it answers
// 404 for a segment that already has a page, which is exactly what a groomer
// opening /employee/settings/my-profile got.
//
// No route gate, deliberately: personal sections belong to every employee. The
// layout's permission guard filters the rest from the acting viewer's own map.
export { default } from "@/app/facility/dashboard/settings/roles-permissions/page";
