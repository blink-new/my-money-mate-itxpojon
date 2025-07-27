import React, { useState, useEffect, useCallback } from 'react'
import { 
  Plus, 
  CreditCard, 
  Calendar, 
  User, 
  DollarSign,
  IndianRupee,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { blink } from '../blink/client'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/use-toast'
import type { Debt, DebtPayment } from '../types'

export function DebtManager() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null)
  const [exchangeRate] = useState(61.5)

  // Add debt form state
  const [newDebt, setNewDebt] = useState({
    type: 'owe' as 'owe' | 'lent',
    person_name: '',
    amount: '',
    purpose: '',
    due_date: ''
  })

  // Payment form state
  const [payment, setPayment] = useState({
    amount: '',
    notes: ''
  })

  const loadDebts = async () => {
    try {
      setLoading(true)
      const allDebts = await blink.db.debts.list({
        where: { user_id: user!.id },
        orderBy: { created_at: 'desc' }
      })
      setDebts(allDebts)
    } catch (error) {
      console.error('Error loading debts:', error)
      toast({
        variant: "destructive",
        description: "Failed to load debts"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      loadDebts()
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const formatCurrency = (amount: number, currency: 'CAD' | 'INR' = 'CAD') => {
    if (currency === 'CAD') {
      return `CA$${amount.toFixed(2)}`
    } else {
      return `₹${(amount * exchangeRate).toFixed(0)}`
    }
  }

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newDebt.person_name || !newDebt.amount || !newDebt.purpose) {
      toast({
        variant: "destructive",
        description: "Please fill in all required fields"
      })
      return
    }

    const amountCad = parseFloat(newDebt.amount)
    if (isNaN(amountCad) || amountCad <= 0) {
      toast({
        variant: "destructive",
        description: "Please enter a valid amount"
      })
      return
    }

    try {
      const debt: Debt = {
        id: `debt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: user!.id,
        type: newDebt.type,
        person_name: newDebt.person_name,
        total_amount_cad: amountCad,
        total_amount_inr: amountCad * exchangeRate,
        remaining_amount_cad: amountCad,
        remaining_amount_inr: amountCad * exchangeRate,
        exchange_rate: exchangeRate,
        purpose: newDebt.purpose,
        due_date: newDebt.due_date || undefined,
        is_paid: '0',
        priority_score: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      await blink.db.debts.create(debt)
      
      toast({
        description: `${newDebt.type === 'owe' ? 'Debt' : 'Loan'} added successfully!`
      })
      
      setNewDebt({
        type: 'owe',
        person_name: '',
        amount: '',
        purpose: '',
        due_date: ''
      })
      setAddDialogOpen(false)
      loadDebts()
      
    } catch (error) {
      console.error('Error adding debt:', error)
      toast({
        variant: "destructive",
        description: "Failed to add debt"
      })
    }
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedDebt || !payment.amount) {
      toast({
        variant: "destructive",
        description: "Please enter payment amount"
      })
      return
    }

    const paymentAmount = parseFloat(payment.amount)
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast({
        variant: "destructive",
        description: "Please enter a valid payment amount"
      })
      return
    }

    if (paymentAmount > selectedDebt.remaining_amount_cad) {
      toast({
        variant: "destructive",
        description: "Payment amount cannot exceed remaining debt"
      })
      return
    }

    try {
      // Create payment record
      const paymentRecord: DebtPayment = {
        id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        debt_id: selectedDebt.id,
        user_id: user!.id,
        amount_cad: paymentAmount,
        amount_inr: paymentAmount * exchangeRate,
        exchange_rate: exchangeRate,
        payment_date: new Date().toISOString().split('T')[0],
        notes: payment.notes || undefined,
        created_at: new Date().toISOString()
      }

      await blink.db.debt_payments.create(paymentRecord)

      // Update debt
      const newRemainingAmount = selectedDebt.remaining_amount_cad - paymentAmount
      const updatedDebt = {
        ...selectedDebt,
        remaining_amount_cad: newRemainingAmount,
        remaining_amount_inr: newRemainingAmount * exchangeRate,
        is_paid: newRemainingAmount <= 0 ? '1' : '0',
        updated_at: new Date().toISOString()
      }

      await blink.db.debts.update(selectedDebt.id, updatedDebt)
      
      toast({
        description: `Payment of ${formatCurrency(paymentAmount)} recorded successfully!`
      })
      
      setPayment({ amount: '', notes: '' })
      setPaymentDialogOpen(false)
      setSelectedDebt(null)
      loadDebts()
      
    } catch (error) {
      console.error('Error recording payment:', error)
      toast({
        variant: "destructive",
        description: "Failed to record payment"
      })
    }
  }

  const deleteDebt = async (debtId: string) => {
    try {
      await blink.db.debts.delete(debtId)
      toast({
        description: "Debt deleted successfully"
      })
      loadDebts()
    } catch (error) {
      console.error('Error deleting debt:', error)
      toast({
        variant: "destructive",
        description: "Failed to delete debt"
      })
    }
  }

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getPriorityLevel = (debt: Debt) => {
    if (!debt.due_date) return 'low'
    const daysUntilDue = getDaysUntilDue(debt.due_date)
    
    if (daysUntilDue < 0) return 'overdue'
    if (daysUntilDue <= 7) return 'urgent'
    if (daysUntilDue <= 30) return 'medium'
    return 'low'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'overdue': return 'text-red-600 bg-red-50 border-red-200'
      case 'urgent': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const activeDebts = debts.filter(d => Number(d.is_paid) === 0)
  const paidDebts = debts.filter(d => Number(d.is_paid) === 1)
  const debtsByType = {
    owe: activeDebts.filter(d => d.type === 'owe'),
    lent: activeDebts.filter(d => d.type === 'lent')
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Debt Manager</h1>
          <p className="text-muted-foreground mt-1">
            Track money you owe and lent with smart prioritization
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mt-4 sm:mt-0">
              <Plus className="w-4 h-4 mr-2" />
              Add Debt
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Debt</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddDebt} className="space-y-4">
              {/* Debt Type */}
              <div className="grid grid-cols-2 gap-4">
                <Card 
                  className={`cursor-pointer transition-all ${
                    newDebt.type === 'owe' 
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
                      : 'hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setNewDebt({...newDebt, type: 'owe'})}
                >
                  <CardContent className="flex items-center justify-center p-4">
                    <div className="text-center">
                      <ArrowDownCircle className={`w-6 h-6 mx-auto mb-1 ${
                        newDebt.type === 'owe' ? 'text-orange-600' : 'text-muted-foreground'
                      }`} />
                      <h3 className={`text-sm font-medium ${
                        newDebt.type === 'owe' ? 'text-orange-600' : 'text-foreground'
                      }`}>
                        I Owe
                      </h3>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all ${
                    newDebt.type === 'lent' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setNewDebt({...newDebt, type: 'lent'})}
                >
                  <CardContent className="flex items-center justify-center p-4">
                    <div className="text-center">
                      <ArrowUpCircle className={`w-6 h-6 mx-auto mb-1 ${
                        newDebt.type === 'lent' ? 'text-blue-600' : 'text-muted-foreground'
                      }`} />
                      <h3 className={`text-sm font-medium ${
                        newDebt.type === 'lent' ? 'text-blue-600' : 'text-foreground'
                      }`}>
                        I Lent
                      </h3>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <Label>Person Name</Label>
                <Input
                  value={newDebt.person_name}
                  onChange={(e) => setNewDebt({...newDebt, person_name: e.target.value})}
                  placeholder="Who do you owe money to / lent money to?"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Amount (CAD)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    value={newDebt.amount}
                    onChange={(e) => setNewDebt({...newDebt, amount: e.target.value})}
                    placeholder="0.00"
                    className="pl-10"
                    required
                  />
                </div>
                {parseFloat(newDebt.amount) > 0 && (
                  <p className="text-sm text-muted-foreground">
                    ≈ {formatCurrency(parseFloat(newDebt.amount), 'INR')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Purpose</Label>
                <Textarea
                  value={newDebt.purpose}
                  onChange={(e) => setNewDebt({...newDebt, purpose: e.target.value})}
                  placeholder="What is this debt for?"
                  rows={2}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Due Date (Optional)</Label>
                <Input
                  type="date"
                  value={newDebt.due_date}
                  onChange={(e) => setNewDebt({...newDebt, due_date: e.target.value})}
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setAddDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Add {newDebt.type === 'owe' ? 'Debt' : 'Loan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total I Owe</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(debtsByType.owe.reduce((sum, d) => sum + d.remaining_amount_cad, 0))}
                </p>
              </div>
              <ArrowDownCircle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Lent Out</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(debtsByType.lent.reduce((sum, d) => sum + d.remaining_amount_cad, 0))}
                </p>
              </div>
              <ArrowUpCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Debts</p>
                <p className="text-2xl font-bold text-foreground">
                  {activeDebts.length}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debts List */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Debts ({activeDebts.length})</TabsTrigger>
          <TabsTrigger value="paid">Paid Debts ({paidDebts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeDebts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CreditCard className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Active Debts</h3>
                <p className="text-muted-foreground text-center mb-4">
                  You're all caught up! Add a debt to start tracking.
                </p>
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Debt
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeDebts.map((debt) => {
                const priority = getPriorityLevel(debt)
                const progressPercentage = ((debt.total_amount_cad - debt.remaining_amount_cad) / debt.total_amount_cad) * 100
                
                return (
                  <Card key={debt.id} className={`relative ${getPriorityColor(priority)} border`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          {debt.type === 'owe' ? (
                            <ArrowDownCircle className="w-5 h-5 text-orange-600" />
                          ) : (
                            <ArrowUpCircle className="w-5 h-5 text-blue-600" />
                          )}
                          <div>
                            <CardTitle className="text-lg">
                              {debt.type === 'owe' ? 'Owe to' : 'Lent to'} {debt.person_name}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">{debt.purpose}</p>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDebt(debt)
                              setPaymentDialogOpen(true)
                            }}
                          >
                            <DollarSign className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDebt(debt.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted-foreground">Remaining</span>
                          <span className={`text-lg font-bold ${
                            debt.type === 'owe' ? 'text-orange-600' : 'text-blue-600'
                          }`}>
                            {formatCurrency(debt.remaining_amount_cad)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(debt.remaining_amount_cad, 'INR')}
                        </p>
                        
                        {debt.total_amount_cad !== debt.remaining_amount_cad && (
                          <div className="mt-3">
                            <div className="flex justify-between text-sm text-muted-foreground mb-1">
                              <span>Paid: {formatCurrency(debt.total_amount_cad - debt.remaining_amount_cad)}</span>
                              <span>{progressPercentage.toFixed(0)}%</span>
                            </div>
                            <Progress value={progressPercentage} className="h-2" />
                          </div>
                        )}
                      </div>

                      {debt.due_date && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Due: {new Date(debt.due_date).toLocaleDateString()}
                          </span>
                          {priority === 'overdue' && (
                            <Badge variant="destructive" className="text-xs">
                              Overdue
                            </Badge>
                          )}
                          {priority === 'urgent' && (
                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                              Urgent
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="paid" className="space-y-4">
          {paidDebts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="w-12 h-12 text-green-600 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Paid Debts Yet</h3>
                <p className="text-muted-foreground text-center">
                  Paid debts will appear here for your records.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paidDebts.map((debt) => (
                <Card key={debt.id} className="border-green-200 bg-green-50 dark:bg-green-900/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <CardTitle className="text-lg">
                          {debt.type === 'owe' ? 'Paid to' : 'Received from'} {debt.person_name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{debt.purpose}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(debt.total_amount_cad)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(debt.total_amount_cad, 'INR')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Completed on {new Date(debt.updated_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            {selectedDebt && (
              <p className="text-muted-foreground">
                {selectedDebt.type === 'owe' ? 'Payment to' : 'Payment from'} {selectedDebt.person_name}
              </p>
            )}
          </DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Amount (CAD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  value={payment.amount}
                  onChange={(e) => setPayment({...payment, amount: e.target.value})}
                  placeholder="0.00"
                  className="pl-10"
                  max={selectedDebt?.remaining_amount_cad}
                  required
                />
              </div>
              {selectedDebt && (
                <p className="text-sm text-muted-foreground">
                  Remaining: {formatCurrency(selectedDebt.remaining_amount_cad)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={payment.notes}
                onChange={(e) => setPayment({...payment, notes: e.target.value})}
                placeholder="Add any notes about this payment..."
                rows={2}
              />
            </div>

            <div className="flex space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setPaymentDialogOpen(false)
                  setSelectedDebt(null)
                  setPayment({ amount: '', notes: '' })
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Record Payment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}