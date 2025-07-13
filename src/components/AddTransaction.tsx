import React, { useState } from 'react'
import { ArrowUpCircle, ArrowDownCircle, Calendar, Tag, DollarSign, IndianRupee } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { blink } from '../blink/client'
import { useAuth } from '../contexts/AuthContext'
import { TRANSACTION_CATEGORIES } from '../types'
import { useToast } from '../hooks/use-toast'

export function AddTransaction() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [exchangeRate] = useState(61.5) // Default CAD to INR rate

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!amount || !category || !description || !user?.id) {
      toast({
        variant: "destructive",
        description: "Please fill in all fields"
      })
      return
    }

    const amountCad = parseFloat(amount)
    if (isNaN(amountCad) || amountCad <= 0) {
      toast({
        variant: "destructive",
        description: "Please enter a valid amount"
      })
      return
    }

    try {
      setLoading(true)
      
      const transaction = {
        id: `transaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: user.id,
        type,
        category,
        amount_cad: amountCad,
        amount_inr: amountCad * exchangeRate,
        exchange_rate: exchangeRate,
        description,
        date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      await blink.db.transactions.create(transaction)
      
      toast({
        description: `${type === 'income' ? 'Income' : 'Expense'} added successfully!`
      })
      
      // Reset form
      setAmount('')
      setCategory('')
      setDescription('')
      setDate(new Date().toISOString().split('T')[0])
      
    } catch (error) {
      console.error('Error adding transaction:', error)
      toast({
        variant: "destructive",
        description: "Failed to add transaction"
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency: 'CAD' | 'INR' = 'CAD') => {
    if (currency === 'CAD') {
      return `CA$${amount.toFixed(2)}`
    } else {
      return `₹${(amount * exchangeRate).toFixed(0)}`
    }
  }

  const amountValue = parseFloat(amount) || 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Add Transaction</h1>
        <p className="text-muted-foreground mt-1">
          Track your income and expenses in CAD with automatic INR conversion
        </p>
      </div>

      {/* Transaction Type Selector */}
      <div className="grid grid-cols-2 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${
            type === 'income' 
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
              : 'hover:border-muted-foreground/50'
          }`}
          onClick={() => setType('income')}
        >
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <ArrowUpCircle className={`w-8 h-8 mx-auto mb-2 ${
                type === 'income' ? 'text-emerald-600' : 'text-muted-foreground'
              }`} />
              <h3 className={`font-medium ${
                type === 'income' ? 'text-emerald-600' : 'text-foreground'
              }`}>
                Income
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Money received
              </p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${
            type === 'expense' 
              ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
              : 'hover:border-muted-foreground/50'
          }`}
          onClick={() => setType('expense')}
        >
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <ArrowDownCircle className={`w-8 h-8 mx-auto mb-2 ${
                type === 'expense' ? 'text-red-600' : 'text-muted-foreground'
              }`} />
              <h3 className={`font-medium ${
                type === 'expense' ? 'text-red-600' : 'text-foreground'
              }`}>
                Expense
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Money spent
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Tag className="w-5 h-5" />
            <span>Transaction Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (CAD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-10"
                  required
                />
              </div>
              {amountValue > 0 && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <IndianRupee className="w-4 h-4" />
                  <span>≈ {formatCurrency(amountValue, 'INR')}</span>
                  <Badge variant="secondary" className="text-xs">
                    Rate: 1 CAD = ₹{exchangeRate}
                  </Badge>
                </div>
              )}
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_CATEGORIES[type].map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={type === 'income' 
                  ? 'e.g., Salary, freelance work, gift received...' 
                  : 'e.g., Grocery shopping, dinner at restaurant...'
                }
                rows={3}
                required
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className={`w-full ${
                type === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {loading ? 'Adding...' : `Add ${type === 'income' ? 'Income' : 'Expense'}`}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium text-sm mb-2">💡 Quick Tips</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• All amounts are entered in CAD and automatically converted to INR</li>
            <li>• Use clear descriptions to track your spending patterns</li>
            <li>• Regular tracking helps you understand your financial habits</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}