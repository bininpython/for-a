import type {
  AppointmentStatus,
  ContractStatus,
  PaymentStatus,
  TrainingLevel,
} from '@/lib/supabase/database.types';

export const APPOINTMENT_STATUS: Record<
  AppointmentStatus,
  { label: string; tone: 'orange' | 'green' | 'blue' | 'red' | 'gray' }
> = {
  requested: { label: 'Solicitado', tone: 'orange' },
  confirmed: { label: 'Confirmado', tone: 'blue' },
  completed: { label: 'Concluído', tone: 'green' },
  cancelled: { label: 'Cancelado', tone: 'gray' },
  no_show: { label: 'Falta', tone: 'red' },
};

export const PAYMENT_STATUS: Record<
  PaymentStatus,
  { label: string; tone: 'orange' | 'green' | 'blue' | 'red' | 'gray' }
> = {
  paid: { label: 'Pago', tone: 'green' },
  pending: { label: 'Pendente', tone: 'orange' },
  overdue: { label: 'Atrasado', tone: 'red' },
  exempt: { label: 'Isento', tone: 'blue' },
  cancelled: { label: 'Cancelado', tone: 'gray' },
};

export const CONTRACT_STATUS: Record<
  ContractStatus,
  { label: string; tone: 'orange' | 'green' | 'blue' | 'red' | 'gray' }
> = {
  active: { label: 'Ativo', tone: 'green' },
  paused: { label: 'Pausado', tone: 'orange' },
  inactive: { label: 'Inativo', tone: 'gray' },
  archived: { label: 'Arquivado', tone: 'gray' },
};

export const TRAINING_LEVEL: Record<TrainingLevel, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

export const MEASUREMENT_SITES = [
  'Tórax',
  'Cintura',
  'Abdômen',
  'Quadril',
  'Braço direito',
  'Braço esquerdo',
  'Antebraço direito',
  'Antebraço esquerdo',
  'Coxa direita',
  'Coxa esquerda',
  'Panturrilha direita',
  'Panturrilha esquerda',
] as const;

export const MUSCLE_GROUPS = [
  'Peito',
  'Costas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Antebraço',
  'Abdômen',
  'Quadríceps',
  'Posterior de coxa',
  'Glúteos',
  'Panturrilha',
  'Corpo inteiro',
  'Cardio',
] as const;

export const SPLIT_PRESETS = [
  { value: 'A/B', days: ['A', 'B'] },
  { value: 'A/B/C', days: ['A', 'B', 'C'] },
  { value: 'A/B/C/D', days: ['A', 'B', 'C', 'D'] },
  { value: 'A/B/C/D/E', days: ['A', 'B', 'C', 'D', 'E'] },
] as const;
