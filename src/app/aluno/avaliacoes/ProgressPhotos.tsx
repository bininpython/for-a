'use client';

import { useState } from 'react';
import { ImageOff, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export interface SignedPhoto {
  id: string;
  url: string | null;
  angle: string | null;
  takenOn: string;
}

export function ProgressPhotos({ photos }: { photos: SignedPhoto[] }) {
  const [open, setOpen] = useState<SignedPhoto | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => photo.url && setOpen(photo)}
            disabled={!photo.url}
            className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10 bg-hpe-black-2"
          >
            {photo.url ? (
              <img
                src={photo.url}
                alt={`Evolução — ${formatDate(photo.takenOn)}`}
                className="h-full w-full object-cover transition-transform duration-500 ease-hpe group-hover:scale-105"
              />
            ) : (
              <span className="flex h-full items-center justify-center">
                <ImageOff className="h-6 w-6 text-white/20" />
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2.5 text-left">
              <span className="block text-xs font-medium text-white">
                {formatDate(photo.takenOn)}
              </span>
              {photo.angle ? (
                <span className="block text-[10px] uppercase tracking-wider text-white/60">
                  {photo.angle}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>

      {open?.url ? (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/90 p-5"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-label="Fechar"
            className="absolute right-5 top-5 rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={open.url}
            alt={`Evolução — ${formatDate(open.takenOn)}`}
            className="max-h-[88dvh] max-w-full rounded-xl object-contain"
          />
        </div>
      ) : null}
    </>
  );
}
