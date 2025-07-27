import React, { useState, useEffect, useCallback } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Calendar,
  DollarSign,
  IndianRupee,
  ArrowUpCircle,
  ArrowDownCircle,
  Target,
  Filter
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { blink } from '../blink/client'
import { useAuth } from '../contexts/AuthContext'
import type { Transaction, Debt } from '../types'

interface MonthlyData {
  month: string
  income: number
  expenses: number
  net: number
}

interface CategoryData {
  category: string
  amount: number
  percentage: number
  transactions: number
}

export function Analytics() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [timeRange, setTimeRange] = useState('6months')
  const [exchangeRate] = useState(61.5)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      
      switch (timeRange) {
        case '1month':
          startDate.setMonth(endDate.getMonth() - 1)
          break
        case '3months':
          startDate.setMonth(endDate.getMonth() - 3)
          break
        case '6months':
          startDate.setMonth(endDate.getMonth() - 6)
          break
        case '1year':
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
        default:
          startDate.setMonth(endDate.getMonth() - 6)
      }

      const [allTransactions, allDebts] = await Promise.all([
        blink.db.transactions.list({
          where: { user_id: user!.id },
          orderBy: { date: 'desc' }
        }),
        blink.db.debts.list({
          where: { user_id: user!.id }
        })
      ])

      // Filter transactions by date range
      const filteredTransactions = allTransactions.filter(t => {
        const transactionDate = new Date(t.date)
        return transactionDate >= startDate && transactionDate <= endDate
      })

      setTransactions(filteredTransactions)
      setDebts(allDebts)
    } catch (error) {
      console.error('Error loading analytics data:', error)
    } finally {
      setLoading(false)
    }
  }, [user, timeRange])

  useEffect(() => {
    if (user?.id) {
      loadData()
    }
  }, [user?.id, timeRange, loadData])

  const formatCurrency = (amount: number, currency: 'CAD' | 'INR' = 'CAD') => {
    if (currency === 'CAD') {
      return `CA$${amount.toFixed(2)}`
    } else {
      return `₹${(amount * exchangeRate).toFixed(0)}`
    }
  }

  // Calculate monthly data
  const getMonthlyData = (): MonthlyData[] => {
    const monthlyMap = new Map<string, { income: number; expenses: number }>()
    
    transactions.forEach(transaction => {
      const monthKey = transaction.date.substring(0, 7) // YYYY-MM
      const existing = monthlyMap.get(monthKey) || { income: 0, expenses: 0 }
      
      if (transaction.type === 'income') {
        existing.income += transaction.amount_cad
      } else {
        existing.expenses += transaction.amount_cad
      }
      
      monthlyMap.set(monthKey, existing)
    })

    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }

  // Calculate category breakdown
  const getCategoryData = (type: 'income' | 'expense'): CategoryData[] => {
    const categoryMap = new Map<string, { amount: number; count: number }>()
    const typeTransactions = transactions.filter(t => t.type === type)
    const totalAmount = typeTransactions.reduce((sum, t) => sum + t.amount_cad, 0)
    
    typeTransactions.forEach(transaction => {
      const existing = categoryMap.get(transaction.category) || { amount: 0, count: 0 }
      existing.amount += transaction.amount_cad
      existing.count += 1
      categoryMap.set(transaction.category, existing)
    })

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
        transactions: data.count
      }))
      .sort((a, b) => b.amount - a.amount)
  }

  // Calculate summary stats
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount_cad, 0)
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount_cad, 0)
  const netWorth = totalIncome - totalExpenses
  const avgMonthlyIncome = totalIncome / Math.max(1, getMonthlyData().length)
  const avgMonthlyExpenses = totalExpenses / Math.max(1, getMonthlyData().length)
  
  const totalOwed = debts.filter(d => d.type === 'owe' && Number(d.is_paid) === 0).reduce((sum, d) => sum + d.remaining_amount_cad, 0)
  const totalLent = debts.filter(d => d.type === 'lent' && Number(d.is_paid) === 0).reduce((sum, d) => sum + d.remaining_amount_cad, 0)

  const monthlyData = getMonthlyData()
  const expenseCategories = getCategoryData('expense')
  const incomeCategories = getCategoryData('income')

  const getColorForCategory = (index: number) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500',
      'bg-pink-500', 'bg-indigo-500', 'bg-orange-500', 'bg-teal-500', 'bg-gray-500'
    ]
    return colors[index % colors.length]
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financial Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Visualize your spending patterns and financial health
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(totalIncome)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(totalIncome, 'INR')}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalExpenses)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(totalExpenses, 'INR')}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Worth</p>
                <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {netWorth >= 0 ? '+' : ''}{formatCurrency(netWorth)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(netWorth, 'INR')}
                </p>
              </div>
              <Target className={`w-8 h-8 ${netWorth >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Savings Rate</p>
                <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {totalIncome > 0 ? ((netWorth / totalIncome) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Of total income
                </p>
              </div>
              <PieChart className={`w-8 h-8 ${netWorth >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="debts">Debts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Monthly Trends</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No data available for the selected period</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {monthlyData.map((month, index) => (
                    <div key={month.month} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          {new Date(month.month + '-01').toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long' 
                          })}
                        </span>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-emerald-600">+{formatCurrency(month.income)}</span>
                          <span className="text-red-600">-{formatCurrency(month.expenses)}</span>
                          <span className={`font-medium ${month.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {month.net >= 0 ? '+' : ''}{formatCurrency(month.net)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="relative h-6 bg-muted rounded-full overflow-hidden">
                        {month.income > 0 && (
                          <div 
                            className="absolute left-0 top-0 h-full bg-emerald-500 transition-all"
                            style={{ width: `${(month.income / Math.max(month.income, month.expenses)) * 50}%` }}
                          />
                        )}
                        {month.expenses > 0 && (
                          <div 
                            className="absolute right-0 top-0 h-full bg-red-500 transition-all"
                            style={{ width: `${(month.expenses / Math.max(month.income, month.expenses)) * 50}%` }}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Averages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Average Income</span>
                  <span className="font-medium text-emerald-600">{formatCurrency(avgMonthlyIncome)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Average Expenses</span>
                  <span className="font-medium text-red-600">{formatCurrency(avgMonthlyExpenses)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Average Savings</span>
                  <span className={`font-medium ${(avgMonthlyIncome - avgMonthlyExpenses) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(avgMonthlyIncome - avgMonthlyExpenses)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transaction Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Transactions</span>
                  <span className="font-medium">{transactions.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Income Transactions</span>
                  <span className="font-medium text-emerald-600">
                    {transactions.filter(t => t.type === 'income').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Expense Transactions</span>
                  <span className="font-medium text-red-600">
                    {transactions.filter(t => t.type === 'expense').length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingDown className="w-5 h-5" />
                <span>Expense Breakdown</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expenseCategories.length === 0 ? (
                <div className="text-center py-8">
                  <PieChart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No expense data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {expenseCategories.map((category, index) => (
                    <div key={category.category} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded ${getColorForCategory(index)}`} />
                          <span className="font-medium">{category.category}</span>
                          <Badge variant="secondary">{category.transactions} transactions</Badge>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">{formatCurrency(category.amount)}</span>
                          <p className="text-xs text-muted-foreground">{category.percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                      <Progress value={category.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Income Breakdown</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {incomeCategories.length === 0 ? (
                <div className="text-center py-8">
                  <PieChart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No income data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {incomeCategories.map((category, index) => (
                    <div key={category.category} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded ${getColorForCategory(index)}`} />
                          <span className="font-medium">{category.category}</span>
                          <Badge variant="secondary">{category.transactions} transactions</Badge>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">{formatCurrency(category.amount)}</span>
                          <p className="text-xs text-muted-foreground">{category.percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                      <Progress value={category.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debts" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ArrowDownCircle className="w-5 h-5 text-orange-600" />
                  <span>Money I Owe</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-orange-600">{formatCurrency(totalOwed)}</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(totalOwed, 'INR')}</p>
                  </div>
                  
                  {debts.filter(d => d.type === 'owe' && Number(d.is_paid) === 0).length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium">Active Debts</h4>
                      {debts
                        .filter(d => d.type === 'owe' && Number(d.is_paid) === 0)
                        .slice(0, 5)
                        .map(debt => (
                          <div key={debt.id} className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">{debt.person_name}</span>
                            <span className="font-medium">{formatCurrency(debt.remaining_amount_cad)}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ArrowUpCircle className="w-5 h-5 text-blue-600" />
                  <span>Money I Lent</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">{formatCurrency(totalLent)}</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(totalLent, 'INR')}</p>
                  </div>
                  
                  {debts.filter(d => d.type === 'lent' && Number(d.is_paid) === 0).length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium">Outstanding Loans</h4>
                      {debts
                        .filter(d => d.type === 'lent' && Number(d.is_paid) === 0)
                        .slice(0, 5)
                        .map(debt => (
                          <div key={debt.id} className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">{debt.person_name}</span>
                            <span className="font-medium">{formatCurrency(debt.remaining_amount_cad)}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}