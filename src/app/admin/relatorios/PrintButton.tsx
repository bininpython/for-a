'use client';

import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="hpe-btn-ghost hpe-btn-sm">
      <Printer className="h-4 w-4" />
      Imprimir / salvar em PDF
    </button>
  );
}
