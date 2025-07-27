export interface Transaction {
  id: string
  user_id: string
  type: 'income' | 'expense'
  category: string
  amount_cad: number
  amount_inr: number
  exchange_rate: number
  description: string
  date: string
  created_at: string
  updated_at: string
}

export interface Debt {
  id: string
  user_id: string
  type: 'owe' | 'lent'
  person_name: string
  total_amount_cad: number
  total_amount_inr: number
  remaining_amount_cad: number
  remaining_amount_inr: number
  exchange_rate: number
  purpose: string
  due_date?: string
  is_paid: string
  priority_score: number
  created_at: string
  updated_at: string
}

export interface DebtPayment {
  id: string
  debt_id: string
  user_id: string
  amount_cad: number
  amount_inr: number
  exchange_rate: number
  payment_date: string
  notes?: string
  created_at: string
}

export interface UserPreferences {
  id: string
  user_id: string
  default_currency: 'CAD' | 'INR'
  theme: 'light' | 'dark'
  exchange_rate_cad_to_inr: number
  created_at: string
  updated_at: string
}

export interface FamilyAccess {
  id: string
  owner_user_id: string
  member_email: string
  access_level: 'view'
  is_active: string
  created_at: string
  updated_at: string
}

export const TRANSACTION_CATEGORIES = {
  income: [
    'Salary',
    'Freelance',
    'Investment',
    'Gift',
    'Other Income'
  ],
  expense: [
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Healthcare',
    'Education',
    'Travel',
    'Groceries',
    'Other Expense'
  ]
} as const