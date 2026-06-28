"use client";

import {
  formatCell,
  type ReportField,
  type ReportResult,
  type ReportRow,
} from "@/lib/report-data-sources";

const MAX_ROWS = 100;

function Cells({ fields, row }: { fields: ReportField[]; row: ReportRow }) {
  return (
    <>
      {fields.map((f) => (
        <td key={f.key} className="px-3 py-2 whitespace-nowrap tabular-nums">
          {formatCell(row[f.key], f.type)}
        </td>
      ))}
    </>
  );
}

export function ReportPreviewTable({ result }: { result: ReportResult }) {
  if (result.fields.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Select at least one column to preview.
      </p>
    );
  }

  const shown = result.rows.slice(0, MAX_ROWS);
  const groupKey = result.groupField;
  const groupFld = result.fields.find((f) => f.key === groupKey);

  const groups: { value: string; rows: ReportRow[] }[] = [];
  if (groupKey) {
    for (const row of shown) {
      const gv = String(row[groupKey] ?? "—");
      const last = groups[groups.length - 1];
      if (last && last.value === gv) last.rows.push(row);
      else groups.push({ value: gv, rows: [row] });
    }
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-xs">
              {result.fields.map((f) => (
                <th
                  key={f.key}
                  className="px-3 py-2 text-left font-medium whitespace-nowrap"
                >
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          {groupKey ? (
            groups.map((g, gi) => (
              <tbody key={gi} className="divide-y">
                <tr className="bg-muted/50">
                  <td
                    colSpan={result.fields.length}
                    className="px-3 py-1.5 text-xs font-semibold"
                  >
                    {groupFld?.label ?? "Group"}: {g.value}{" "}
                    <span className="text-muted-foreground font-normal">
                      · {g.rows.length}
                    </span>
                  </td>
                </tr>
                {g.rows.map((row, ri) => (
                  <tr key={ri}>
                    <Cells fields={result.fields} row={row} />
                  </tr>
                ))}
              </tbody>
            ))
          ) : (
            <tbody className="divide-y">
              {shown.map((row, ri) => (
                <tr key={ri}>
                  <Cells fields={result.fields} row={row} />
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
      <p className="text-muted-foreground text-xs">
        {result.total === 0
          ? "No rows match the current filters."
          : result.total > MAX_ROWS
            ? `Showing first ${MAX_ROWS} of ${result.total} rows`
            : `${result.total} row${result.total === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}
