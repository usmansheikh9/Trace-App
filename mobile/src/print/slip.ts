import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { boxRows } from '@/api';
import type { BoxFields, RoleConfig } from '@/api';

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ============================================================================
// PLACEHOLDER SLIP TEMPLATE. The final layout is coming later: replace this
// function's HTML. Rows are the same visibleFields the Result screen shows.
// Print HTML is a separate rendering surface, so it uses literal CSS values
// rather than the app's theme tokens.
// ============================================================================
export function slipHtml(box: BoxFields, role: RoleConfig): string {
  const body = boxRows(box, role.visibleFields)
    .map((r) => `<tr><th>${escape(r.label)}</th><td>${escape(r.value)}</td></tr>`)
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1A1B1F; padding: 32px; }
  .note { font-size: 11px; color: #BA1A1A; text-transform: uppercase; letter-spacing: 0.05em; }
  h1 { font-size: 22px; margin: 8px 0 4px; }
  .role { font-size: 12px; color: #005AB3; text-transform: uppercase; letter-spacing: 0.05em; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th, td { text-align: left; padding: 10px 0; border-bottom: 1px solid #EEEDF3; font-size: 14px; }
  th { color: #717786; font-weight: 400; width: 40%; }
  td { font-weight: 600; }
  .foot { margin-top: 24px; font-size: 11px; color: #717786; }
</style>
</head>
<body>
  <div class="note">Placeholder slip layout</div>
  <h1>Trace Slip</h1>
  <div class="role">${escape(role.name)}</div>
  <table>${body}</table>
  <div class="foot">Generated ${escape(new Date().toLocaleString())}</div>
</body>
</html>`;
}

/**
 * Renders the slip to a PDF and opens the system share sheet, from which the
 * user can save it to Files / Downloads, print, or send it.
 * Resolves to false if sharing isn't available on this device (the PDF is still written).
 */
export async function exportSlip(box: BoxFields, role: RoleConfig): Promise<boolean> {
  const { uri } = await Print.printToFileAsync({ html: slipHtml(box, role) });
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: 'Save or share slip',
  });
  return true;
}
