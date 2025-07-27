import React, { useState, useEffect } from 'react'
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Edit,
  Trash2,
  DollarSign,
  IndianRupee
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Textarea } from './ui/textarea'
import { blink } from '../blink/client'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/use-toast'
import type { Transaction } from '../types'
import { TRANSACTION_CATEGORIES } from '../types'

export function TransactionHistory() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [exchangeRate] = useState(61.5)

  // Edit form state
  const [editForm, setEditForm] = useState({
    amount: '',
    category: '',
    description: '',
    date: ''
  })

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const allTransactions = await blink.db.transactions.list({
        where: { user_id: user!.id },
        orderBy: { date: 'desc' }
      })
      setTransactions(allTransactions)
    } catch (error) {
      console.error('Error loading transactions:', error)
      toast({
        variant: "destructive",
        description: "Failed to load transactions"
      })
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...transactions]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter)
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter)
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      const filterDate = new Date()
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0)
          filtered = filtered.filter(t => new Date(t.date) >= filterDate)
          break
        case 'week':
          filterDate.setDate(now.getDate() - 7)
          filtered = filtered.filter(t => new Date(t.date) >= filterDate)
          break
        case 'month':
          filterDate.setMonth(now.getMonth() - 1)
          filtered = filtered.filter(t => new Date(t.date) >= filterDate)
          break
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1)
          filtered = filtered.filter(t => new Date(t.date) >= filterDate)
          break
      }
    }

    setFilteredTransactions(filtered)
  }

  useEffect(() => {
    if (user?.id) {
      loadTransactions()
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    applyFilters()
  }, [transactions, searchTerm, typeFilter, categoryFilter, dateFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const formatCurrency = (amount: number, currency: 'CAD' | 'INR' = 'CAD') => {
    if (currency === 'CAD') {
      return `CA$${amount.toFixed(2)}`
    } else {
      return `₹${(amount * exchangeRate).toFixed(0)}`
    }
  }

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setEditForm({
      amount: transaction.amount_cad.toString(),
      category: transaction.category,
      description: transaction.description,
      date: transaction.date
    })
    setEditDialogOpen(true)
  }

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingTransaction) return

    const amount = parseFloat(editForm.amount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: "destructive",
        description: "Please enter a valid amount"
      })
      return
    }

    try {
      const updatedTransaction = {
        ...editingTransaction,
        amount_cad: amount,
        amount_inr: amount * exchangeRate,
        category: editForm.category,
        description: editForm.description,
        date: editForm.date,
        updated_at: new Date().toISOString()
      }

      await blink.db.transactions.update(editingTransaction.id, updatedTransaction)
      
      toast({
        description: "Transaction updated successfully!"
      })
      
      setEditDialogOpen(false)
      setEditingTransaction(null)
      loadTransactions()
      
    } catch (error) {
      console.error('Error updating transaction:', error)
      toast({
        variant: "destructive",
        description: "Failed to update transaction"
      })
    }
  }

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return
    }

    try {
      await blink.db.transactions.delete(transactionId)
      toast({
        description: "Transaction deleted successfully"
      })
      loadTransactions()
    } catch (error) {
      console.error('Error deleting transaction:', error)
      toast({
        variant: "destructive",
        description: "Failed to delete transaction"
      })
    }
  }

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount CAD', 'Amount INR']
    const csvRows = [
      headers.join(','),
      ...filteredTransactions.map(t => [
        t.date,
        t.type,
        t.category,
        `"${t.description}"`,
        t.amount_cad,
        t.amount_inr
      ].join(','))
    ]
    
    const csvBlob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const csvUrl = URL.createObjectURL(csvBlob)
    const link = document.createElement('a')
    link.href = csvUrl
    link.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(csvUrl)

    toast({
      description: "Transactions exported successfully!"
    })
  }

  const clearFilters = () => {
    setSearchTerm('')
    setTypeFilter('all')
    setCategoryFilter('all')
    setDateFilter('all')
  }

  const getAllCategories = () => {
    const allCategories = [...TRANSACTION_CATEGORIES.income, ...TRANSACTION_CATEGORIES.expense]
    return Array.from(new Set(allCategories)).sort()
  }

  // Calculate summary stats for filtered transactions
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount_cad, 0)
  
  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount_cad, 0)

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
        <div className="h-96 bg-muted rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transaction History</h1>
          <p className="text-muted-foreground mt-1">
            View, filter, and manage all your financial transactions
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="mt-4 sm:mt-0">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <p className="text-sm text-muted-foreground">Net Amount</p>
                <p className={`text-2xl font-bold ${(totalIncome - totalExpenses) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {(totalIncome - totalExpenses) >= 0 ? '+' : ''}{formatCurrency(totalIncome - totalExpenses)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {filteredTransactions.length} transactions
                </p>
              </div>
              <History className={`w-8 h-8 ${(totalIncome - totalExpenses) >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Filters</span>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {getAllCategories().map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Results</Label>
              <div className="flex items-center h-10 px-3 py-2 text-sm bg-muted rounded-md">
                {filteredTransactions.length} of {transactions.length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {transactions.length === 0 ? 'No Transactions Yet' : 'No Matching Transactions'}
              </h3>
              <p className="text-muted-foreground">
                {transactions.length === 0 
                  ? 'Start by adding your first transaction to track your finances.'
                  : 'Try adjusting your filters to see more results.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <div 
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      transaction.type === 'income' ? 'bg-emerald-500' : 'bg-red-500'
                    }`} />
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-foreground">{transaction.description}</h4>
                        <Badge variant="secondary">{transaction.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${
                        transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount_cad)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(transaction.amount_cad, 'INR')}
                      </p>
                    </div>

                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTransaction(transaction)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTransaction(transaction.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Transaction Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateTransaction} className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (CAD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
                  placeholder="0.00"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={editForm.category} onValueChange={(value) => setEditForm({...editForm, category: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {editingTransaction && (
                    TRANSACTION_CATEGORIES[editingTransaction.type].map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                rows={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Update Transaction
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}