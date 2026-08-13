const PDF_VENDOR_PATTERN =
  /node_modules[/\\](jspdf|html-to-image|html2canvas|dompurify|canvg|fflate|fast-png|iobuffer)/;

const REACT_VENDOR_PATTERN =
  /node_modules[/\\](react[/\\]|react-dom[/\\]|react-dom\.|scheduler[/\\])/;

const RECHARTS_VENDOR_PATTERN =
  /node_modules[/\\](recharts[/\\]|d3-[^/\\]+[/\\]|victory-vendor[/\\]|@reduxjs[/\\]toolkit[/\\]|react-redux[/\\]|immer[/\\]|reselect[/\\]|decimal\.js-light[/\\]|es-toolkit[/\\]|tiny-invariant[/\\]|eventemitter3[/\\]|clsx[/\\])/;

const TANSTACK_VENDOR_PATTERN = /node_modules[/\\]@tanstack[/\\]/;

/** Prüft ob ein Modul zum dynamisch geladenen PDF Export gehört. */
function isPdfVendorModule(id: string): boolean {
  return PDF_VENDOR_PATTERN.test(id);
}

/** Prüft ob ein Modul zum React Laufzeitpaket gehört. */
function isReactVendorModule(id: string): boolean {
  return REACT_VENDOR_PATTERN.test(id);
}

/** Prüft ob ein Modul zur Recharts Diagrammbibliothek gehört. */
function isRechartsVendorModule(id: string): boolean {
  return RECHARTS_VENDOR_PATTERN.test(id);
}

/** Prüft ob ein Modul zur TanStack Tabellenbibliothek gehört. */
function isTanStackVendorModule(id: string): boolean {
  return TANSTACK_VENDOR_PATTERN.test(id);
}

/** Ordnet grosse stabile Anbieterpakete festen Rollup Chunks zu. */
export function resolveManualChunk(id: string): string | undefined {
  if (!id.includes("node_modules")) {
    return undefined;
  }

  if (isPdfVendorModule(id)) {
    return undefined;
  }

  if (isReactVendorModule(id)) {
    return "vendor-react";
  }

  if (isRechartsVendorModule(id)) {
    return "vendor-recharts";
  }

  if (isTanStackVendorModule(id)) {
    return "vendor-tanstack";
  }

  return undefined;
}
