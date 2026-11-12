import type { Metadata } from 'next';
import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  Dumbbell,
  Home,
  LineChart,
  Ruler,
  UserCircle,
} from 'lucide-react';
import { Sidebar, type NavItem } from '@/components/dashboard/Sidebar';
import { requireStudent } from '@/lib/auth';

export const metadata = { title: 'Área do aluno' } satisfies Metadata;
export const dynamic = 'force-dynamic';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStudent();

  const items: NavItem[] = [
    { href: '/aluno', label: 'Início', icon: Home },
    { href: '/aluno/ficha', label: 'Minha ficha', icon: ClipboardList },
    { href: '/aluno/treino', label: 'Meus treinos', icon: Dumbbell },
    { href: '/aluno/agendamentos', label: 'Agendamentos', icon: CalendarDays },
    { href: '/aluno/evolucao', label: 'Minha evolução', icon: LineChart },
    { href: '/aluno/avaliacoes', label: 'Minhas avaliações', icon: Ruler },
    { href: '/aluno/financeiro', label: 'Meu financeiro', icon: CreditCard },
    { href: '/aluno/perfil', label: 'Meu perfil', icon: UserCircle },
  ];

  return (
    <div className="min-h-dvh bg-hpe-black">
      <Sidebar
        items={items}
        title="Aluno"
        userName={session.student.full_name}
        userPhoto={session.student.photo_url}
        userRole="Aluno"
      />
      <div className="lg:pl-[17rem]">
        <main className="mx-auto max-w-5xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
