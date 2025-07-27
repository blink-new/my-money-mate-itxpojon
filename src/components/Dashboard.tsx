import React, { useState, useEffect, useCallback } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  AlertCircle, 
  Plus,
  RefreshCw,
  DollarSign,
  IndianRupee
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { blink } from '../blink/client'
import { useAuth } from '../contexts/AuthContext'
import type { Transaction, Debt } from '../types'

interface DashboardProps {
  onPageChange: (page: string) => void
}

export function Dashboard({ onPageChange }: DashboardProps) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [exchangeRate, setExchangeRate] = useState(61.5) // Default CAD to INR rate

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load recent transactions
      const recentTransactions = await blink.db.transactions.list({
        where: { user_id: user!.id },
        orderBy: { date: 'desc' },
        limit: 5
      })
      
      // Load active debts - corrected query structure
      const activeDebts = await blink.db.debts.list({
        where: { 
          user_id: user!.id,
          is_paid: "0"  // SQLite boolean as string "0" for false
        },
        orderBy: { due_date: 'asc' },
        limit: 5
      })

      setTransactions(recentTransactions)
      setDebts(activeDebts)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user?.id) {
      loadDashboardData()
    }
  }, [user?.id, loadDashboardData])

  // Calculate financial summary
  const thisMonth = new Date().toISOString().substring(0, 7) // YYYY-MM format
  const monthlyTransactions = transactions.filter(t => t.date.startsWith(thisMonth))
  
  const monthlyIncome = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount_cad, 0)
    
  const monthlyExpenses = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount_cad, 0)

  const totalOwed = debts
    .filter(d => d.type === 'owe' && Number(d.is_paid) === 0)
    .reduce((sum, d) => sum + d.remaining_amount_cad, 0)
    
  const totalLent = debts
    .filter(d => d.type === 'lent' && Number(d.is_paid) === 0)
    .reduce((sum, d) => sum + d.remaining_amount_cad, 0)

  const formatCurrency = (amount: number, currency: 'CAD' | 'INR' = 'CAD') => {
    if (currency === 'CAD') {
      return `CA$${amount.toFixed(2)}`
    } else {
      return `₹${(amount * exchangeRate).toFixed(0)}`
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-muted rounded-lg" />
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.displayName || user?.email?.split('@')[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's your financial overview for today
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <Button
            onClick={() => onPageChange('add-transaction')}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
          <Button
            variant="outline"
            onClick={loadDashboardData}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(monthlyIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(monthlyIncome, 'INR')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(monthlyExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(monthlyExpenses, 'INR')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Money You Owe</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(totalOwed)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalOwed, 'INR')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Money Lent</CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalLent)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalLent, 'INR')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Urgent Debts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange('history')}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No transactions yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange('add-transaction')}
                    className="mt-2"
                  >
                    Add Your First Transaction
                  </Button>
                </div>
              ) : (
                transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        transaction.type === 'income' ? 'bg-emerald-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.category} • {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount_cad)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(transaction.amount_cad, 'INR')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Urgent Debts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Urgent Debts</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange('debts')}
            >
              Manage All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {debts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No active debts</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange('debts')}
                    className="mt-2"
                  >
                    Track Debts
                  </Button>
                </div>
              ) : (
                debts.map((debt) => (
                  <div key={debt.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        debt.type === 'owe' ? 'bg-orange-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium">
                          {debt.type === 'owe' ? 'Owe to' : 'Lent to'} {debt.person_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {debt.purpose}
                          {debt.due_date && ` • Due ${new Date(debt.due_date).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        debt.type === 'owe' ? 'text-orange-600' : 'text-blue-600'
                      }`}>
                        {formatCurrency(debt.remaining_amount_cad)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(debt.remaining_amount_cad, 'INR')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exchange Rate Info */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4" />
            <IndianRupee className="w-4 h-4" />
            <span className="text-sm text-muted-foreground">
              Current Exchange Rate: 1 CAD = ₹{exchangeRate}
            </span>
          </div>
          <Badge variant="secondary">
            Updated Daily
          </Badge>
        </CardContent>
      </Card>
    </div>
  )
}