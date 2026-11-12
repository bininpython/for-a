-- ════════════════════════════════════════════════════════════════════════════
-- HPE — PATRICK PERSONAL · Catálogo inicial
-- ════════════════════════════════════════════════════════════════════════════
-- Apenas estrutura operacional: os serviços oferecidos e uma grade de
-- horários padrão, ambos editáveis pelo painel administrativo.
-- Nenhuma informação profissional, certificação ou resultado é inventado aqui:
-- esses campos ficam vazios até Patrick preenchê-los em /admin/perfil.

insert into public.services
  (slug, name, description, benefits, duration_minutes, is_individual, sort_order)
values
  ('personal-training-individual', 'Personal Training Individual',
   'Atendimento exclusivo, com treino construído para o seu corpo, sua rotina e seu objetivo. Correção de execução em tempo real e progressão de carga acompanhada sessão a sessão.',
   array['Treino 100% individualizado','Correção técnica a cada série','Progressão de carga controlada','Acompanhamento próximo da evolução'],
   60, true, 1),

  ('hipertrofia', 'Treinamento de Hipertrofia',
   'Periodização voltada ao aumento de massa muscular, com controle de volume, intensidade e recuperação para gerar estímulo real de crescimento.',
   array['Periodização por grupo muscular','Controle de volume e intensidade','Gestão de recuperação','Registro de cargas e evolução'],
   60, true, 2),

  ('condicionamento-fisico', 'Condicionamento Físico',
   'Trabalho de capacidade cardiorrespiratória, resistência e mobilidade para ganhar disposição no dia a dia e sustentar treinos mais intensos.',
   array['Ganho de resistência','Mais disposição no dia a dia','Melhora da mobilidade','Base para treinos intensos'],
   60, true, 3),

  ('emagrecimento', 'Emagrecimento',
   'Programa de redução de gordura corporal com gasto calórico planejado e preservação de massa muscular, acompanhado por avaliações periódicas.',
   array['Gasto calórico planejado','Preservação de massa magra','Avaliações periódicas','Metas reais e sustentáveis'],
   60, true, 4),

  ('ganho-de-massa', 'Ganho de Massa Muscular',
   'Estratégia de treino focada em construção muscular consistente, com sobrecarga progressiva e divisão de treino adequada ao seu nível.',
   array['Sobrecarga progressiva','Divisão de treino sob medida','Foco em grupos prioritários','Evolução medida em números'],
   60, true, 5),

  ('treinamento-de-forca', 'Treinamento de Força',
   'Desenvolvimento de força máxima nos padrões fundamentais de movimento, com técnica apurada e progressão segura.',
   array['Força nos movimentos base','Técnica apurada','Progressão segura','Menos risco de lesão'],
   60, true, 6),

  ('acompanhamento-evolucao', 'Acompanhamento e Evolução Física',
   'Avaliação física, medidas corporais, registro fotográfico e comparativos ao longo do tempo para enxergar a evolução com clareza.',
   array['Avaliação física completa','Medidas corporais registradas','Comparativo entre avaliações','Relatórios de evolução'],
   45, true, 7)
on conflict (slug) do nothing;

-- Grade padrão: segunda a sexta, 06:00–11:00 e 14:00–21:00; sábado 08:00–12:00.
insert into public.availability (weekday, start_time, end_time)
select wd, '06:00'::time, '11:00'::time from generate_series(1, 5) wd
union all
select wd, '14:00'::time, '21:00'::time from generate_series(1, 5) wd
union all
select 6, '08:00'::time, '12:00'::time;
