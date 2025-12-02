"use client";

import { useState } from "react";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download, Check } from "lucide-react";

interface ExportReportModalProps {
  type: string;
  data: any[];
  onClose: () => void;
}

export function ExportReportModal({
  type,
  data,
  onClose,
}: ExportReportModalProps) {
  const [format, setFormat] = useState<"csv" | "pdf" | "excel">("csv");
  const [fileName, setFileName] = useState(
    `${type}-report-${new Date().toISOString().split("T")[0]}`,
  );
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const handleExportCSV = () => {
    if (data.length === 0) return;

    // Get all unique keys from the data
    const allKeys = Array.from(
      new Set(data.flatMap((item) => getAllKeys(item))),
    );

    // Create CSV content
    let csv = "";

    // Add headers if enabled
    if (includeHeaders) {
      csv += allKeys.join(",") + "\n";
    }

    // Add data rows
    data.forEach((item) => {
      const row = allKeys.map((key) => {
        const value = getNestedValue(item, key);
        // Escape values that contain commas or quotes
        if (
          typeof value === "string" &&
          (value.includes(",") || value.includes('"'))
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? "";
      });
      csv += row.join(",") + "\n";
    });

    // Create download link
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    // In a real app, would use a library like jsPDF
    // For now, create a simple HTML table and print it
    const printWindow = window.open("", "", "height=600,width=800");
    if (!printWindow) return;

    const allKeys = Array.from(
      new Set(data.flatMap((item) => getAllKeys(item))),
    );

    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${fileName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f4f4f4; font-weight: bold; }
            tr:hover { background-color: #f9f9f9; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${type.replace(/-/g, " ").toUpperCase()} Report</h1>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Total Records:</strong> ${data.length}</p>
          <table>
            ${
              includeHeaders
                ? `<thead><tr>${allKeys
                    .map((key) => `<th>${formatKey(key)}</th>`)
                    .join("")}</tr></thead>`
                : ""
            }
            <tbody>
              ${data
                .map(
                  (item) =>
                    `<tr>${allKeys
                      .map(
                        (key) => `<td>${getNestedValue(item, key) ?? ""}</td>`,
                      )
                      .join("")}</tr>`,
                )
                .join("")}
            </tbody>
          </table>
          <div style="margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Print / Save as PDF
            </button>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportExcel = () => {
    // Create a TSV (Tab-Separated Values) which Excel can open
    // In a real app, would use a library like xlsx
    if (data.length === 0) return;

    const allKeys = Array.from(
      new Set(data.flatMap((item) => getAllKeys(item))),
    );

    let tsv = "";

    // Add headers if enabled
    if (includeHeaders) {
      tsv += allKeys.join("\t") + "\n";
    }

    // Add data rows
    data.forEach((item) => {
      const row = allKeys.map((key) => {
        const value = getNestedValue(item, key);
        return value ?? "";
      });
      tsv += row.join("\t") + "\n";
    });

    // Create download link
    const blob = new Blob([tsv], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}.xls`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = async () => {
    setExporting(true);

    // Simulate export delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    switch (format) {
      case "csv":
        handleExportCSV();
        break;
      case "pdf":
        handleExportPDF();
        break;
      case "excel":
        handleExportExcel();
        break;
    }

    setExporting(false);
    setExportComplete(true);

    // Auto-close after 2 seconds
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  // Helper function to get all keys (including nested)
  const getAllKeys = (obj: any, prefix = ""): string[] => {
    let keys: string[] = [];

    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (
        typeof obj[key] === "object" &&
        obj[key] !== null &&
        !Array.isArray(obj[key])
      ) {
        keys = keys.concat(getAllKeys(obj[key], fullKey));
      } else if (!Array.isArray(obj[key])) {
        keys.push(fullKey);
      }
    }

    return keys;
  };

  // Helper function to get nested value
  const getNestedValue = (obj: any, path: string): any => {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  };

  // Helper function to format key for display
  const formatKey = (key: string): string => {
    return key
      .split(".")
      .map((part) =>
        part
          .replace(/([A-Z])/g, " $1")
          .trim()
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
      )
      .join(" > ");
  };

  if (exportComplete) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            Export Complete
          </DialogTitle>
          <DialogDescription>
            Your report has been successfully exported as {format.toUpperCase()}
            .
          </DialogDescription>
        </DialogHeader>
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            This dialog will close automatically...
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Export Report</DialogTitle>
        <DialogDescription>
          Choose your export format and customize settings
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Format Selection */}
        <div className="space-y-3">
          <Label className="text-base">Export Format</Label>
          <div className="grid grid-cols-3 gap-4">
            {(["csv", "pdf", "excel"] as const).map((fmt) => (
              <Card
                key={fmt}
                className={`cursor-pointer transition-all ${
                  format === fmt
                    ? "ring-2 ring-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => setFormat(fmt)}
              >
                <CardContent className="pt-6 text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <div className="font-medium capitalize">
                    {fmt.toUpperCase()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {fmt === "csv" && "Comma-separated values"}
                    {fmt === "pdf" && "Portable document"}
                    {fmt === "excel" && "Microsoft Excel"}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* File Name */}
        <div className="space-y-2">
          <Label htmlFor="fileName">File Name</Label>
          <div className="flex gap-2">
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="report-name"
            />
            <div className="flex items-center px-3 py-2 border rounded-md bg-muted text-muted-foreground text-sm">
              .{format === "excel" ? "xls" : format}
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <Label className="text-base">Options</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeHeaders"
                checked={includeHeaders}
                onCheckedChange={(checked) =>
                  setIncludeHeaders(checked as boolean)
                }
              />
              <label
                htmlFor="includeHeaders"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Include column headers
              </label>
            </div>
          </div>
        </div>

        {/* Preview Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Report Type:</span>
                <span className="font-medium capitalize">
                  {type.replace(/-/g, " ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Records:</span>
                <span className="font-medium">{data.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Export Format:</span>
                <span className="font-medium uppercase">{format}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated Size:</span>
                <span className="font-medium">
                  {format === "pdf"
                    ? "~" + Math.ceil(data.length / 20) + " pages"
                    : "~" + Math.ceil((data.length * 50) / 1024) + " KB"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={exporting}>
          Cancel
        </Button>
        <Button onClick={handleExport} disabled={exporting || !fileName}>
          {exporting ? (
            <>
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export {format.toUpperCase()}
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
