/**
 * Utility functions for Data Export (CSV/Excel format)
 */

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers.join(","), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
