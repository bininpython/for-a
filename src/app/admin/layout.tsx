import type { Metadata } from 'next';
import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  Dumbbell,
  FileBarChart,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Receipt,
  Ruler,
  Settings,
  UserCircle,
  Users,
} from 'lucide-react';
import { Sidebar, type NavItem } from '@/components/dashboard/Sidebar';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Painel' };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const supabase = createClient();

  // No primeiro acesso ainda não existe a linha de configurações do personal.
  // Criamos vazia, para que ele apenas preencha — sem nenhum dado inventado.
  const { data: settings } = await supabase
    .from('personal_settings')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (!settings) {
    await supabase.from('personal_settings').insert({
      profile_id: session.userId,
      professional_name: session.profile.full_name || 'Patrick Personal',
      public_email: session.email,
    });
  }

  // Pedidos de agendamento aguardando confirmação viram contador no menu.
  const { count: pendingRequests } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'requested');

  const items: NavItem[] = [
    { href: '/admin', label: 'Visão geral', icon: LayoutDashboard },
    { href: '/admin/alunos', label: 'Alunos', icon: Users },
    {
      href: '/admin/agenda',
      label: 'Agenda',
      icon: CalendarDays,
      badge: pendingRequests ?? 0,
    },
    { href: '/admin/treinamentos', label: 'Treinamentos', icon: Dumbbell },
    { href: '/admin/fichas', label: 'Fichas de treino', icon: ClipboardList },
    { href: '/admin/avaliacoes', label: 'Avaliações físicas', icon: Ruler },
    { href: '/admin/evolucao', label: 'Evolução dos alunos', icon: LineChart },
    { href: '/admin/financeiro', label: 'Financeiro', icon: CreditCard },
    { href: '/admin/mensalidades', label: 'Mensalidades', icon: Receipt },
    { href: '/admin/relatorios', label: 'Relatórios', icon: FileBarChart },
    { href: '/admin/mensagens', label: 'Mensagens', icon: MessageSquare },
    { href: '/admin/configuracoes', label: 'Configurações', icon: Settings },
    { href: '/admin/perfil', label: 'Meu perfil', icon: UserCircle },
  ];

  return (
    <div className="min-h-dvh bg-hpe-black">
      <Sidebar
        items={items}
        title="Painel"
        userName={session.profile.full_name || 'Patrick'}
        userPhoto={session.profile.avatar_url}
        userRole="Personal trainer"
      />
      <div className="lg:pl-[17rem]">
        <main className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
