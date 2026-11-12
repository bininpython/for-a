import { Hero } from '@/components/site/Hero';
import { AboutSection } from '@/components/site/AboutSection';
import { ServicesSection } from '@/components/site/ServicesSection';
import { AvailabilitySection } from '@/components/site/AvailabilitySection';
import { LocationSection } from '@/components/site/LocationSection';
import { TestimonialsSection } from '@/components/site/TestimonialsSection';
import { CtaSection } from '@/components/site/CtaSection';
import { SetupNotice } from '@/components/ui/SetupNotice';
import { getPublicContent } from '@/lib/data/public';

export default async function HomePage() {
  const { configured, settings, services, availability, testimonials } =
    await getPublicContent();

  return (
    <>
      <Hero
        professionalName={settings?.professional_name ?? 'Patrick Personal'}
        gymName={settings?.gym_name ?? 'ALP FIT'}
        gymCity={settings?.gym_city ?? 'Coronel Fabriciano/MG'}
        logoUrl={settings?.logo_url}
      />

      {!configured ? (
        <div className="px-5 py-16">
          <SetupNotice context="O conteúdo do site, os serviços e a agenda são carregados do banco de dados." />
        </div>
      ) : null}

      <AboutSection settings={settings} />
      <ServicesSection services={services} />
      <AvailabilitySection availability={availability} />
      <LocationSection settings={settings} />
      <TestimonialsSection testimonials={testimonials} />
      <CtaSection whatsapp={settings?.whatsapp} />
    </>
  );
}
