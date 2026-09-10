/**
 * One empty list, the same one every render.
 *
 * `const { data: rows = [] } = useQuery(...)` builds a NEW array on every
 * render while the query loads. Anything that depends on `rows` re-runs every
 * render — every memo, and every effect, which is a render loop the moment
 * that effect sets state. That is how the occupancy board rendered itself into
 * React's update-depth limit on 2026-09-11. Write `data ?? NO_ITEMS` instead;
 * `bun run check:query-default-loops` fails on the other shape.
 *
 * Frozen, because it is shared: pushing onto it would put the item in every
 * empty list in the app.
 */
export const NO_ITEMS: never[] = Object.freeze([]) as unknown as never[];
