export interface Transaction {
  id: string
  userId: string
  type: 'income' | 'expense'
  category: string
  amountCad: number
  amountInr: number
  exchangeRate: number
  description: string
  date: string
  createdAt: string
  updatedAt: string
}

export interface Debt {
  id: string
  userId: string
  type: 'owe' | 'lent'
  personName: string
  totalAmountCad: number
  totalAmountInr: number
  remainingAmountCad: number
  remainingAmountInr: number
  exchangeRate: number
  purpose: string
  dueDate?: string
  isPaid: boolean
  priorityScore: number
  createdAt: string
  updatedAt: string
}

export interface DebtPayment {
  id: string
  debtId: string
  userId: string
  amountCad: number
  amountInr: number
  exchangeRate: number
  paymentDate: string
  notes?: string
  createdAt: string
}

export interface UserPreferences {
  id: string
  userId: string
  defaultCurrency: 'CAD' | 'INR'
  theme: 'light' | 'dark'
  exchangeRateCadToInr: number
  createdAt: string
  updatedAt: string
}

export interface FamilyAccess {
  id: string
  ownerUserId: string
  memberEmail: string
  accessLevel: 'view'
  isActive: boolean
  createdAt: string
  updatedAt: string
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