import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/env';
import type {
  Availability,
  PersonalSettings,
  Service,
  Testimonial,
} from '@/lib/supabase/database.types';

export interface PublicContent {
  configured: boolean;
  settings: PersonalSettings | null;
  services: Service[];
  availability: Availability[];
  testimonials: Testimonial[];
}

/**
 * Conteúdo do site institucional. Tudo vem do banco e é editável pelo
 * painel administrativo — nenhum texto sobre a trajetória do Patrick é
 * inventado aqui. Campos vazios simplesmente não são renderizados.
 */
export async function getPublicContent(): Promise<PublicContent> {
  if (!supabaseConfigured) {
    return {
      configured: false,
      settings: null,
      services: [],
      availability: [],
      testimonials: [],
    };
  }

  const supabase = createClient();

  const [settings, services, availability, testimonials] = await Promise.all([
    supabase.from('personal_settings').select('*').limit(1).maybeSingle(),
    supabase.from('services').select('*').order('sort_order'),
    supabase.from('availability').select('*').eq('active', true).order('weekday'),
    supabase
      .from('testimonials')
      .select('*')
      .eq('published', true)
      .order('sort_order')
      .limit(12),
  ]);

  return {
    configured: true,
    settings: settings.data ?? null,
    services: services.data ?? [],
    availability: availability.data ?? [],
    testimonials: testimonials.data ?? [],
  };
}
