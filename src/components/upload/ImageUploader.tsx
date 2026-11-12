'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Envia a imagem para o Supabase Storage e devolve a URL pública.
 * As permissões de escrita são aplicadas pelas policies do bucket.
 */
export function ImageUploader({
  label,
  bucket,
  folder,
  value,
  onChange,
  hint,
  className,
}: {
  label: string;
  bucket: 'public-assets' | 'avatars';
  folder: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  className?: string;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error('Use uma imagem PNG, JPG ou WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('A imagem precisa ter menos de 5 MB.');
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `${folder}/${crypto.randomUUID()}.${extension}`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: '31536000', upsert: false });

      if (error) {
        toast.error('Não foi possível enviar a imagem.');
        return;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success('Imagem enviada.');
    } catch {
      toast.error('Falha ao enviar a imagem.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className={cn('w-full', className)}>
      <p className="hpe-label">{label}</p>

      <div className="flex items-start gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-hpe-black">
          {value ? (
            <>
              <img src={value} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange('')}
                aria-label="Remover imagem"
                className="absolute right-1 top-1 rounded-lg bg-black/70 p-1 text-white transition-colors hover:bg-black"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <span className="flex h-full items-center justify-center">
              <ImagePlus className="h-6 w-6 text-white/20" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="hpe-btn-ghost hpe-btn-sm"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando…
              </>
            ) : (
              <>
                <ImagePlus className="h-4 w-4" />
                {value ? 'Trocar imagem' : 'Enviar imagem'}
              </>
            )}
          </button>
          {hint ? <p className="mt-2 text-xs text-hpe-muted/80">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}
