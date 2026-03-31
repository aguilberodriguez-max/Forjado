export type Industry = 'cleaning' | 'handyman' | 'auto_detailing' | 'landscaping' | 'beauty_barber' | 'food_catering' | 'painting' | 'moving' | 'roofing' | 'auto_sales' | 'retail' | 'corner_market' | 'construction' | 'other';
export type Language = 'en' | 'es';
export type EstimateStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';
export type PaymentMethod = 'cash' | 'zelle' | 'venmo' | 'check' | 'card' | 'other';
export type SendChannel = 'whatsapp' | 'sms' | 'email' | 'link';
export type ExpenseCategory = 'supplies' | 'fuel' | 'equipment' | 'marketing' | 'food' | 'insurance' | 'subcontractor' | 'rent' | 'phone' | 'other';

export interface LineItem {
  id: string;
  description: string;
  description_es?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  owner_name: string;
  industry: Industry;
  logo_url?: string;
  phone: string;
  email: string;
  street_address?: string;
  city?: string;
  /** Legacy; prefer state_province */
  state?: string;
  state_province?: string;
  zip_code?: string;
  /** ISO 3166-1 alpha-2 */
  country_code?: string;
  /** ISO 4217 */
  currency_code?: string;
  currency_symbol?: string;
  language_preference: Language;
  default_tax_rate: number;
  onboarding_completed: boolean;
  stripe_customer_id?: string;
  subscription_status: SubscriptionStatus;
  trial_ends_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  phone?: string;
  email?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  /** ISO 3166-1 alpha-2 */
  country_code?: string;
  notes?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Estimate {
  id: string;
  user_id: string;
  client_id: string;
  client?: Client;
  estimate_number: string;
  status: EstimateStatus;
  industry: Industry;
  industry_template_data: Record<string, unknown>;
  line_items: LineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes_internal?: string;
  notes_client?: string;
  sent_via?: SendChannel;
  sent_at?: string;
  valid_until?: string;
  public_token: string;
  converted_to_invoice_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string;
  client?: Client;
  estimate_id?: string;
  invoice_number: string;
  status: InvoiceStatus;
  line_items: LineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes_client?: string;
  due_date: string;
  sent_via?: SendChannel;
  sent_at?: string;
  paid_at?: string;
  payment_method?: PaymentMethod;
  public_token: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category: ExpenseCategory;
  description?: string;
  receipt_photo_url?: string;
  expense_date: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  revenue: number;
  expenses: number;
  profit: number;
  outstanding: {
    count: number;
    total: number;
  };
  recent_activity: ActivityEvent[];
  period_label: string;
}

export interface ActivityEvent {
  id: string;
  type: 'estimate_sent' | 'invoice_paid' | 'invoice_sent' | 'expense_added' | 'estimate_accepted';
  description: string;
  amount?: number;
  created_at: string;
  reference_id?: string;
  reference_type?: 'estimate' | 'invoice' | 'expense';
}
