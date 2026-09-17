'use client';

import { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStores } from '@/hooks/use-stores';
import { useOpeningBalanceTemplate, useOpeningBalance } from '@/hooks/use-inventory';
import type { OpeningBalanceRow } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Stable key used as the Excel row ID and as the edits map key.
// Double-pipe separator — safe inside UUIDs which only use hex + dashes.
function rowKey(r: OpeningBalanceRow) {
  return `${r.productId}||${r.variantId ?? 'null'}`;
}

function variantLabel(r: OpeningBalanceRow) {
  return r.variantAttributes ? Object.values(r.variantAttributes).join(' / ') : '';
}

function deltaColor(d: number) {
  if (d > 0) return 'text-emerald-600 font-semibold';
  if (d < 0) return 'text-red-600 font-semibold';
  return 'text-gray-300';
}

function qtyColor(qty: number) {
  if (qty <= 0)  return 'text-red-600';
  if (qty <= 10) return 'text-amber-600';
  return 'text-emerald-600';
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportedRow {
  key:         string;
  productId:   string;
  variantId:   string | null;
  productName: string;
  variantLabel: string;
  currentQty:  number;
  newQty:      number;
  delta:       number;
}

// ─── Excel helpers ────────────────────────────────────────────────────────────

// Column layout
// A (hidden): __id = rowKey
// B: Product Name
// C: Product SKU
// D: Variant
// E: Variant SKU
// F: Current Stock  (read-only reference)
// G: New Quantity   ← user edits this

const XL_HEADER = [
  '__id (Do Not Edit)',
  'Product Name',
  'Product SKU',
  'Variant',
  'Variant SKU',
  'Current Stock',
  'New Quantity',
];

async function downloadExcel(template: OpeningBalanceRow[], storeName: string) {
  const XLSX = await import('xlsx');

  const data = [
    XL_HEADER,
    ...template.map((r) => [
      rowKey(r),
      r.productName,
      r.productSku ?? '',
      variantLabel(r),
      r.variantSku ?? '',
      r.currentQuantity,
      r.currentQuantity, // pre-fill New Quantity with current so user only changes what differs
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column widths; hide the ID column
  ws['!cols'] = [
    { wch: 8, hidden: true }, // A: __id — hidden in Excel
    { wch: 38 },               // B: Product Name
    { wch: 16 },               // C: Product SKU
    { wch: 28 },               // D: Variant
    { wch: 16 },               // E: Variant SKU
    { wch: 16 },               // F: Current Stock
    { wch: 16 },               // G: New Quantity
  ];

  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Opening Balance');

  const safeName = storeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const date     = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `opening-balance-${safeName}-${date}.xlsx`);
}

async function parseExcel(
  file: File,
  templateMap: Record<string, OpeningBalanceRow>,
): Promise<ImportedRow[]> {
  const XLSX       = await import('xlsx');
  const buffer     = await file.arrayBuffer();
  const wb         = XLSX.read(buffer, { type: 'array' });
  const ws         = wb.Sheets[wb.SheetNames[0]];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

  const results: ImportedRow[] = [];

  for (const row of raw.slice(1)) { // skip header
    const key       = String(row[0] ?? '').trim();
    const newQtyRaw = row[6]; // column G

    // Skip non-data rows (header accidentally included, empty rows)
    if (!key || key.startsWith('__id')) continue;

    const newQty =
      typeof newQtyRaw === 'number'
        ? Math.round(newQtyRaw)
        : parseInt(String(newQtyRaw ?? ''), 10);
    if (isNaN(newQty) || newQty < 0) continue;

    const tmpl = templateMap[key];
    if (!tmpl) continue; // unknown product/variant — skip silently

    const delta = newQty - tmpl.currentQuantity;
    if (delta === 0) continue; // no change — skip

    const [productId, variantIdRaw] = key.split('||');
    const variantId = variantIdRaw === 'null' ? null : (variantIdRaw ?? null);

    results.push({
      key,
      productId,
      variantId,
      productName:  tmpl.productName,
      variantLabel: variantLabel(tmpl),
      currentQty:   tmpl.currentQuantity,
      newQty,
      delta,
    });
  }

  return results;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OpeningBalancePage() {
  const router = useRouter();
  const { data: stores = [], isLoading: storesLoading } = useStores();

  const [storeId, setStoreId] = useState<string>('');
  const [search,  setSearch]  = useState('');
  const [notes,   setNotes]   = useState('');
  const [edits,   setEdits]   = useState<Record<string, string>>({});

  // Parsed-Excel preview (null = no file loaded yet)
  const [importPreview, setImportPreview]       = useState<ImportedRow[] | null>(null);
  const [importError,   setImportError]         = useState<string | null>(null);
  const [downloadBusy,  setDownloadBusy]        = useState(false);
  const [uploadParsing, setUploadParsing]       = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: template = [], isFetching: templateLoading } =
    useOpeningBalanceTemplate(storeId || null);
  const openingBalance = useOpeningBalance();

  // Quick lookup by rowKey for upload parsing
  const templateMap = useMemo(() => {
    const m: Record<string, OpeningBalanceRow> = {};
    for (const r of template) m[rowKey(r)] = r;
    return m;
  }, [template]);

  // Rows with edits merged in
  const rows = useMemo(
    () => template.map((r) => ({ ...r, editedQty: edits[rowKey(r)] ?? String(r.currentQuantity) })),
    [template, edits],
  );

  // Filtered view
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.productName.toLowerCase().includes(q) ||
        (r.productSku ?? '').toLowerCase().includes(q) ||
        (r.variantSku ?? '').toLowerCase().includes(q) ||
        Object.values(r.variantAttributes ?? {}).some((v) => v.toLowerCase().includes(q)),
    );
  }, [rows, search]);

  // Changed entries ready to submit
  const changedEntries = useMemo(
    () =>
      rows
        .filter((r) => {
          const p = parseInt(edits[rowKey(r)] ?? '', 10);
          return !isNaN(p) && p !== r.currentQuantity;
        })
        .map((r) => ({
          productId: r.productId,
          variantId: r.variantId ?? null,
          quantity:  parseInt(edits[rowKey(r)]!, 10),
        })),
    [rows, edits],
  );

  const hasChanges = changedEntries.length > 0;
  const storeName  = stores.find((s) => s.id === storeId)?.name ?? '';

  // ── Handlers ──────────────────────────────────────────────────────────────

  function setQty(r: OpeningBalanceRow, val: string) {
    setEdits((prev) => ({ ...prev, [rowKey(r)]: val }));
  }

  async function handleSubmit() {
    if (!storeId || !hasChanges) return;
    await openingBalance.mutateAsync({ storeId, entries: changedEntries, notes: notes.trim() || undefined });
    setEdits({});
    setNotes('');
  }

  async function handleDownload() {
    if (!storeId || !template.length || downloadBusy) return;
    setDownloadBusy(true);
    try {
      await downloadExcel(template, storeName);
    } finally {
      setDownloadBusy(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    setImportError(null);
    setImportPreview(null);
    setUploadParsing(true);
    try {
      const parsed = await parseExcel(file, templateMap);
      if (!parsed.length) {
        setImportError('No changes detected in the uploaded file. Make sure you filled the "New Quantity" column with values different from "Current Stock".');
      } else {
        setImportPreview(parsed);
      }
    } catch {
      setImportError('Could not read the file. Please upload a valid .xlsx file downloaded from this page.');
    } finally {
      setUploadParsing(false);
    }
  }

  function applyImport() {
    if (!importPreview) return;
    setEdits((prev) => {
      const next = { ...prev };
      for (const row of importPreview) next[row.key] = String(row.newQty);
      return next;
    });
    setImportPreview(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Opening Balance Entry</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Set initial stock quantities for a store. Fill quantities here or download the Excel template, fill it offline, and upload.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">

        {/* ── Controls card ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">

          {/* Row 1: store / search / notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Store *</label>
              {storesLoading ? (
                <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              ) : (
                <select
                  value={storeId}
                  onChange={(e) => { setStoreId(e.target.value); setEdits({}); setImportPreview(null); setImportError(null); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a store…</option>
                  {stores.filter((s) => s.isActive).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Search Products</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by name or SKU…"
                  disabled={!storeId}
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes (optional)</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Physical count — 2024-01-15"
                disabled={!storeId}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Row 2: Excel download / upload — only when store is selected */}
          {storeId && !templateLoading && template.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Excel</span>

              {/* Download */}
              <button
                onClick={handleDownload}
                disabled={downloadBusy}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {downloadBusy ? 'Preparing…' : 'Download Template'}
              </button>

              {/* Upload */}
              <label className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg transition-colors cursor-pointer
                ${uploadParsing
                  ? 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed'
                  : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200'
                }`}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                </svg>
                {uploadParsing ? 'Reading file…' : 'Upload Filled Template'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="sr-only"
                  disabled={uploadParsing}
                  onChange={handleFileChange}
                />
              </label>

              <p className="text-xs text-gray-400 hidden sm:block">
                Download → fill "New Quantity" column → upload to import
              </p>
            </div>
          )}

          {/* Row 3: save bar */}
          {storeId && (
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="text-sm text-gray-500">
                {templateLoading ? (
                  <span className="text-gray-400">Loading products…</span>
                ) : (
                  <>
                    <span className="font-medium text-gray-900">{template.length}</span> rows for{' '}
                    <span className="font-medium text-gray-900">{storeName}</span>
                    {hasChanges && (
                      <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        {changedEntries.length} unsaved {changedEntries.length === 1 ? 'change' : 'changes'}
                      </span>
                    )}
                  </>
                )}
              </div>
              <button
                onClick={handleSubmit}
                disabled={!hasChanges || openingBalance.isPending}
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {openingBalance.isPending
                  ? 'Saving…'
                  : `Save ${hasChanges ? `${changedEntries.length} ` : ''}Changes`}
              </button>
            </div>
          )}

          {openingBalance.isSuccess && (
            <p className="text-sm text-emerald-600 font-medium">Opening balance saved successfully.</p>
          )}
          {openingBalance.isError && (
            <p className="text-sm text-red-600">Failed to save: {(openingBalance.error as Error)?.message}</p>
          )}
        </div>

        {/* ── Import preview card ────────────────────────────────────────────── */}
        {importError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3">
            <svg className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">Import failed</p>
              <p className="text-sm text-red-600 mt-0.5">{importError}</p>
            </div>
            <button onClick={() => setImportError(null)} className="text-red-400 hover:text-red-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {importPreview && (
          <div className="bg-white rounded-xl border border-indigo-200 overflow-hidden shadow-sm">
            {/* Preview header */}
            <div className="flex items-center justify-between px-5 py-4 bg-indigo-50 border-b border-indigo-200">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-indigo-900">Excel import preview</p>
                  <p className="text-xs text-indigo-600">
                    {importPreview.length} {importPreview.length === 1 ? 'row' : 'rows'} with changes detected
                    {' '}— review below then click Apply to load into the editor
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setImportPreview(null)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={applyImport}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  Apply {importPreview.length} {importPreview.length === 1 ? 'Change' : 'Changes'} →
                </button>
              </div>
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-2.5 text-left font-semibold text-gray-500 uppercase">Product</th>
                    <th className="px-5 py-2.5 text-left font-semibold text-gray-500 uppercase">Variant</th>
                    <th className="px-5 py-2.5 text-right font-semibold text-gray-500 uppercase">Current</th>
                    <th className="px-5 py-2.5 text-right font-semibold text-gray-500 uppercase">New</th>
                    <th className="px-5 py-2.5 text-right font-semibold text-gray-500 uppercase">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {importPreview.map((row) => (
                    <tr key={row.key} className="hover:bg-gray-50">
                      <td className="px-5 py-2.5 font-medium text-gray-900">{row.productName}</td>
                      <td className="px-5 py-2.5 text-gray-500">{row.variantLabel || <span className="text-gray-300">—</span>}</td>
                      <td className={`px-5 py-2.5 text-right tabular-nums font-semibold ${qtyColor(row.currentQty)}`}>{row.currentQty}</td>
                      <td className={`px-5 py-2.5 text-right tabular-nums font-semibold ${qtyColor(row.newQty)}`}>{row.newQty}</td>
                      <td className={`px-5 py-2.5 text-right tabular-nums ${deltaColor(row.delta)}`}>
                        {row.delta > 0 ? `+${row.delta}` : row.delta}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Main table ─────────────────────────────────────────────────────── */}
        {!storeId ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 py-20 text-center">
            <svg className="h-12 w-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
            <p className="text-gray-400 font-medium">Select a store to begin</p>
            <p className="text-gray-300 text-sm mt-1">
              All active products will load with their current stock quantities
            </p>
          </div>
        ) : templateLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-3 border-b border-gray-100 last:border-0">
                <div className="h-4 bg-gray-100 rounded animate-pulse flex-1" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-24" />
                <div className="h-8 bg-gray-100 rounded animate-pulse w-20" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-12" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
            No products match your search.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Variant / SKU</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Current Qty</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">New Qty</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((row) => {
                  const newQtyStr = edits[rowKey(row)] ?? String(row.currentQuantity);
                  const newQty    = parseInt(newQtyStr, 10);
                  const valid     = !isNaN(newQty) && newQty >= 0;
                  const delta     = valid ? newQty - row.currentQuantity : null;
                  const changed   = delta !== null && delta !== 0;

                  return (
                    <tr key={rowKey(row)} className={`hover:bg-gray-50 transition-colors ${changed ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{row.productName}</p>
                        {row.productSku && <span className="text-xs font-mono text-gray-400">{row.productSku}</span>}
                      </td>

                      <td className="px-5 py-3 text-gray-500">
                        {row.variantAttributes ? (
                          <div>
                            <p className="text-xs font-medium text-gray-700">
                              {Object.values(row.variantAttributes).join(' / ')}
                            </p>
                            {row.variantSku && <span className="text-xs font-mono text-gray-400">{row.variantSku}</span>}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs italic">—</span>
                        )}
                      </td>

                      <td className={`px-5 py-3 text-right tabular-nums font-semibold ${qtyColor(row.currentQuantity)}`}>
                        {row.currentQuantity}
                      </td>

                      <td className="px-5 py-3">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={newQtyStr}
                          onChange={(e) => setQty(row, e.target.value)}
                          className={`w-full text-center border rounded-lg px-2 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 transition-colors
                            ${changed
                              ? 'border-amber-400 bg-amber-50 focus:ring-amber-400 font-semibold text-gray-900'
                              : 'border-gray-200 bg-white focus:ring-indigo-400 text-gray-700'
                            }`}
                        />
                      </td>

                      <td className={`px-5 py-3 text-right tabular-nums text-sm ${delta !== null ? deltaColor(delta) : 'text-gray-300'}`}>
                        {delta !== null && delta !== 0 ? (delta > 0 ? `+${delta}` : delta) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={2} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                    {filtered.length} rows shown
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-gray-700 tabular-nums">
                    {filtered.reduce((s, r) => s + r.currentQuantity, 0)}
                  </td>
                  <td className="px-5 py-3 text-center text-sm font-bold text-gray-700 tabular-nums">
                    {filtered.reduce((s, r) => {
                      const n = parseInt(edits[rowKey(r)] ?? String(r.currentQuantity), 10);
                      return s + (isNaN(n) ? r.currentQuantity : n);
                    }, 0)}
                  </td>
                  <td className="px-5 py-3 text-right text-sm tabular-nums">
                    {(() => {
                      const d = filtered.reduce((s, r) => {
                        const n = parseInt(edits[rowKey(r)] ?? String(r.currentQuantity), 10);
                        return s + ((isNaN(n) ? r.currentQuantity : n) - r.currentQuantity);
                      }, 0);
                      return d === 0
                        ? <span className="text-gray-300">—</span>
                        : <span className={d > 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {d > 0 ? `+${d}` : d}
                          </span>;
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
