/**
 * Tipos do banco de dados.
 *
 * Este arquivo é mantido manualmente em sincronia com supabase/migrations.
 * Depois de aplicar as migrations você pode regerá-lo automaticamente:
 *
 *   npx supabase link --project-ref <ref>
 *   npm run db:types
 */

export type UserRole = 'admin' | 'student';
export type ContractStatus = 'active' | 'paused' | 'inactive' | 'archived';
export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced';
export type AppointmentStatus =
  | 'requested'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show';
export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'exempt' | 'cancelled';
export type NotificationKind =
  | 'appointment'
  | 'schedule_change'
  | 'reminder'
  | 'payment'
  | 'announcement';
export type DeliveryChannel = 'in_app' | 'whatsapp' | 'email';
export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type PersonalSettings = {
  id: string;
  profile_id: string;
  professional_name: string;
  headline: string | null;
  bio: string | null;
  philosophy: string | null;
  methodology: string | null;
  experience: string | null;
  differentials: string[];
  specialties: string[];
  certifications: string[];
  photo_url: string | null;
  logo_url: string | null;
  whatsapp: string | null;
  instagram: string | null;
  public_email: string | null;
  gym_name: string;
  gym_address: string | null;
  gym_city: string;
  gym_maps_url: string | null;
  attendance_notes: string | null;
  default_session_minutes: number;
  buffer_minutes: number;
  min_hours_to_cancel: number;
  booking_horizon_days: number;
  updated_at: string;
}

export type Service = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  benefits: string[];
  duration_minutes: number;
  is_individual: boolean;
  max_capacity: number;
  bookable: boolean;
  sort_order: number;
  created_at: string;
}

export type Student = {
  id: string;
  profile_id: string | null;
  full_name: string;
  photo_url: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  joined_at: string;
  main_goal: string | null;
  training_level: TrainingLevel;
  plan_name: string | null;
  monthly_fee: number | null;
  due_day: number | null;
  contract_status: ContractStatus;
  notes: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  lgpd_consent_at: string | null;
  photo_consent: boolean;
  created_at: string;
  updated_at: string;
}

export type Availability = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  active: boolean;
  created_at: string;
}

export type BlockedTime = {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  all_day: boolean;
  created_at: string;
}

export type Appointment = {
  id: string;
  student_id: string;
  service_id: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
  student_notes: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type TrainingPlan = {
  id: string;
  student_id: string | null;
  name: string;
  goal: string | null;
  split: string | null;
  notes: string | null;
  is_template: boolean;
  published: boolean;
  starts_on: string | null;
  ends_on: string | null;
  created_at: string;
  updated_at: string;
}

export type TrainingDay = {
  id: string;
  plan_id: string;
  label: string;
  title: string;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

export type Exercise = {
  id: string;
  day_id: string;
  name: string;
  muscle_group: string | null;
  media_url: string | null;
  sets: number;
  reps: string;
  load_kg: number | null;
  rest_seconds: number;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

export type ExerciseLog = {
  id: string;
  student_id: string;
  exercise_id: string;
  day_id: string | null;
  performed_at: string;
  set_number: number;
  reps_done: number | null;
  load_kg: number | null;
  notes: string | null;
  created_at: string;
}

export type PhysicalAssessment = {
  id: string;
  student_id: string;
  assessed_on: string;
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_pct: number | null;
  lean_mass_kg: number | null;
  resting_hr: number | null;
  notes: string | null;
  created_at: string;
}

export type BodyMeasurement = {
  id: string;
  assessment_id: string;
  site: string;
  value_cm: number;
}

export type ProgressPhoto = {
  id: string;
  student_id: string;
  assessment_id: string | null;
  storage_path: string;
  angle: string | null;
  taken_on: string;
  created_at: string;
}

export type Subscription = {
  id: string;
  student_id: string;
  plan_name: string;
  amount: number;
  due_day: number;
  starts_on: string;
  ends_on: string | null;
  active: boolean;
  created_at: string;
}

export type Payment = {
  id: string;
  student_id: string;
  subscription_id: string | null;
  reference_month: string;
  amount: number;
  due_date: string;
  status: PaymentStatus;
  paid_at: string | null;
  method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type Expense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  spent_on: string;
  notes: string | null;
  created_at: string;
}

export type Notification = {
  id: string;
  profile_id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  link: string | null;
  channel: DeliveryChannel;
  delivery: DeliveryStatus;
  delivery_error: string | null;
  read_at: string | null;
  created_at: string;
}

export type Message = {
  id: string;
  author_id: string;
  student_id: string | null;
  subject: string | null;
  body: string;
  created_at: string;
}

export type Testimonial = {
  id: string;
  student_id: string | null;
  author_name: string;
  author_role: string | null;
  content: string;
  published: boolean;
  consent_at: string | null;
  sort_order: number;
  created_at: string;
}

/** Retorno de public.available_slots() */
export type AvailableSlot = {
  slot_start: string;
  slot_end: string;
}

/** Retorno de public.admin_overview() */
export type AdminOverview = {
  active_students: number;
  new_students: number;
  inactive_students: number;
  sessions_today: number;
  pending_requests: number;
  revenue_month: number;
  pending_amount: number;
  overdue_count: number;
  expenses_month: number;
  attendance_rate: number | null;
  next_appointments: {
    id: string;
    starts_at: string;
    ends_at: string;
    status: AppointmentStatus;
    student_name: string;
    student_photo: string | null;
    service_name: string | null;
  }[];
  students_growth: { month: string; total: number }[];
  revenue_series: {
    month: string;
    received: number;
    pending: number;
    expenses: number;
  }[];
  occupancy: { day: string; booked: number }[];
}

type Relationship<Column extends string, Target extends string> = {
  foreignKeyName: string;
  columns: [Column];
  isOneToOne: false;
  referencedRelation: Target;
  referencedColumns: ['id'];
};

type Table<Row, Rel extends readonly unknown[] = []> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: Rel;
};

type Empty = { [_ in never]: never };

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      personal_settings: Table<
        PersonalSettings,
        [Relationship<'profile_id', 'profiles'>]
      >;
      services: Table<Service>;
      students: Table<Student, [Relationship<'profile_id', 'profiles'>]>;
      availability: Table<Availability>;
      blocked_times: Table<BlockedTime>;
      appointments: Table<
        Appointment,
        [Relationship<'student_id', 'students'>, Relationship<'service_id', 'services'>]
      >;
      training_plans: Table<TrainingPlan, [Relationship<'student_id', 'students'>]>;
      training_days: Table<TrainingDay, [Relationship<'plan_id', 'training_plans'>]>;
      exercises: Table<Exercise, [Relationship<'day_id', 'training_days'>]>;
      exercise_logs: Table<
        ExerciseLog,
        [
          Relationship<'student_id', 'students'>,
          Relationship<'exercise_id', 'exercises'>,
          Relationship<'day_id', 'training_days'>,
        ]
      >;
      physical_assessments: Table<
        PhysicalAssessment,
        [Relationship<'student_id', 'students'>]
      >;
      body_measurements: Table<
        BodyMeasurement,
        [Relationship<'assessment_id', 'physical_assessments'>]
      >;
      progress_photos: Table<
        ProgressPhoto,
        [
          Relationship<'student_id', 'students'>,
          Relationship<'assessment_id', 'physical_assessments'>,
        ]
      >;
      subscriptions: Table<Subscription, [Relationship<'student_id', 'students'>]>;
      payments: Table<
        Payment,
        [
          Relationship<'student_id', 'students'>,
          Relationship<'subscription_id', 'subscriptions'>,
        ]
      >;
      expenses: Table<Expense>;
      notifications: Table<Notification, [Relationship<'profile_id', 'profiles'>]>;
      messages: Table<
        Message,
        [Relationship<'author_id', 'profiles'>, Relationship<'student_id', 'students'>]
      >;
      testimonials: Table<Testimonial, [Relationship<'student_id', 'students'>]>;
    };
    Views: Empty;
    Functions: {
      available_slots: {
        Args: { p_date: string; p_service_id?: string | null; p_timezone?: string };
        Returns: AvailableSlot[];
      };
      book_appointment: {
        Args: {
          p_service_id: string | null;
          p_starts_at: string;
          p_student_notes?: string | null;
          p_student_id?: string | null;
        };
        Returns: Appointment;
      };
      cancel_appointment: {
        Args: { p_appointment_id: string; p_reason?: string | null };
        Returns: Appointment;
      };
      admin_overview: {
        Args: { p_timezone?: string };
        Returns: AdminOverview;
      };
      refresh_overdue_payments: { Args: Empty; Returns: number };
      is_admin: { Args: Empty; Returns: boolean };
      current_student_id: { Args: Empty; Returns: string | null };
    };
    Enums: {
      user_role: UserRole;
      contract_status: ContractStatus;
      training_level: TrainingLevel;
      appointment_status: AppointmentStatus;
      payment_status: PaymentStatus;
      notification_kind: NotificationKind;
      delivery_channel: DeliveryChannel;
      delivery_status: DeliveryStatus;
    };
    CompositeTypes: Empty;
  };
}
