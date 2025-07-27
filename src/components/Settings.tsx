import React, { useState, useEffect } from 'react'
import { 
  Settings as SettingsIcon, 
  User, 
  Palette, 
  DollarSign, 
  Download,
  Shield,
  Moon,
  Sun,
  Globe,
  RefreshCw,
  Save
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Separator } from './ui/separator'
import { Badge } from './ui/badge'
import { blink } from '../blink/client'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/use-toast'
import type { UserPreferences } from '../types'

export function Settings() {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [exchangeRate, setExchangeRate] = useState('61.5')
  const [isUpdatingRate, setIsUpdatingRate] = useState(false)

  const loadPreferences = async () => {
    try {
      const userPrefs = await blink.db.user_preferences.list({
        where: { user_id: user!.id },
        limit: 1
      })
      
      if (userPrefs.length > 0) {
        setPreferences(userPrefs[0])
        setExchangeRate(userPrefs[0].exchange_rate_cad_to_inr.toString())
      } else {
        // Create default preferences
        const defaultPrefs: UserPreferences = {
          id: `pref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: user!.id,
          default_currency: 'CAD',
          theme: 'light',
          exchange_rate_cad_to_inr: 61.5, // Ensure this is a number, not string
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        const created = await blink.db.user_preferences.create(defaultPrefs)
        setPreferences(created)
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    }
  }

  useEffect(() => {
    if (user?.id) {
      loadPreferences()
    }
    // Check current theme
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!preferences) return

    try {
      setLoading(true)
      const updatedPrefs = {
        ...preferences,
        ...updates,
        updated_at: new Date().toISOString()
      }
      
      await blink.db.user_preferences.update(preferences.id, updatedPrefs)
      setPreferences(updatedPrefs)
      
      toast({
        description: "Settings updated successfully!"
      })
    } catch (error) {
      console.error('Error updating preferences:', error)
      toast({
        variant: "destructive",
        description: "Failed to update settings"
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark'
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
    updatePreferences({ theme: newTheme })
  }

  const updateExchangeRate = async () => {
    const rate = parseFloat(exchangeRate)
    if (isNaN(rate) || rate <= 0) {
      toast({
        variant: "destructive",
        description: "Please enter a valid exchange rate"
      })
      return
    }

    setIsUpdatingRate(true)
    try {
      await updatePreferences({ exchange_rate_cad_to_inr: rate }) // Pass as number
      toast({
        description: "Exchange rate updated successfully!"
      })
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Failed to update exchange rate"
      })
    } finally {
      setIsUpdatingRate(false)
    }
  }

  const exportData = async (format: 'csv' | 'json') => {
    try {
      setLoading(true)
      
      // Get all user data
      const [transactions, debts, debtPayments] = await Promise.all([
        blink.db.transactions.list({ where: { user_id: user!.id } }),
        blink.db.debts.list({ where: { user_id: user!.id } }),
        blink.db.debt_payments.list({ where: { user_id: user!.id } })
      ])

      const userData = {
        user: {
          id: user!.id,
          email: user!.email,
          displayName: user!.displayName
        },
        preferences,
        transactions,
        debts,
        debtPayments,
        exportedAt: new Date().toISOString()
      }

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `money-mate-data-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else {
        // Create CSV for transactions
        const headers = ['Date', 'Type', 'Category', 'Description', 'Amount CAD', 'Amount INR']
        const csvRows = [
          headers.join(','),
          ...transactions.map(t => [
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
        const csvLink = document.createElement('a')
        csvLink.href = csvUrl
        csvLink.download = `money-mate-transactions-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(csvLink)
        csvLink.click()
        document.body.removeChild(csvLink)
        URL.revokeObjectURL(csvUrl)
      }

      toast({
        description: `Data exported successfully as ${format.toUpperCase()}`
      })
    } catch (error) {
      console.error('Error exporting data:', error)
      toast({
        variant: "destructive",
        description: "Failed to export data"
      })
    } finally {
      setLoading(false)
    }
  }

  const clearAllData = async () => {
    if (!confirm('Are you sure you want to delete ALL your data? This action cannot be undone.')) {
      return
    }

    try {
      setLoading(true)
      
      // Delete all user data
      await Promise.all([
        blink.db.transactions.list({ where: { user_id: user!.id } })
          .then(transactions => Promise.all(transactions.map(t => blink.db.transactions.delete(t.id)))),
        blink.db.debts.list({ where: { user_id: user!.id } })
          .then(debts => Promise.all(debts.map(d => blink.db.debts.delete(d.id)))),
        blink.db.debt_payments.list({ where: { user_id: user!.id } })
          .then(payments => Promise.all(payments.map(p => blink.db.debt_payments.delete(p.id))))
      ])

      toast({
        description: "All data cleared successfully"
      })
    } catch (error) {
      console.error('Error clearing data:', error)
      toast({
        variant: "destructive",
        description: "Failed to clear data"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account preferences and app settings
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="currency">Currency</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="w-5 h-5" />
                <span>Appearance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle between light and dark theme
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Sun className="w-4 h-4" />
                  <Switch
                    checked={isDark}
                    onCheckedChange={toggleTheme}
                  />
                  <Moon className="w-4 h-4" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="w-5 h-5" />
                <span>Language & Region</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Currency Display</Label>
                  <Select 
                    value={preferences?.default_currency || 'CAD'} 
                    onValueChange={(value) => updatePreferences({ default_currency: value as 'CAD' | 'INR' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CAD">CAD (Canadian Dollar)</SelectItem>
                      <SelectItem value="INR">INR (Indian Rupee)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select defaultValue="dd/mm/yyyy">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5" />
                <span>Exchange Rate Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>CAD to INR Exchange Rate</Label>
                <div className="flex space-x-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    placeholder="61.50"
                    className="flex-1"
                  />
                  <Button 
                    onClick={updateExchangeRate}
                    disabled={isUpdatingRate}
                    variant="outline"
                  >
                    {isUpdatingRate ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Current rate: 1 CAD = ₹{preferences?.exchange_rate_cad_to_inr || 61.5}
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium">Exchange Rate Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Source:</span>
                      <span>Manual Entry</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Updated:</span>
                      <span>{preferences?.updated_at ? new Date(preferences.updated_at).toLocaleDateString() : 'Never'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Auto Update:</span>
                      <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Historical Tracking:</span>
                      <Badge variant="outline">Enabled</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="w-5 h-5" />
                <span>Export Data</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Download your financial data for backup or import into other applications.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => exportData('csv')}
                  disabled={loading}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export as CSV
                </Button>
                <Button 
                  onClick={() => exportData('json')}
                  disabled={loading}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export as JSON
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Data Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-foreground">Cloud Sync</h4>
                  <p className="text-sm text-muted-foreground">
                    Your data is automatically synced securely to the cloud.
                  </p>
                  <Badge variant="outline" className="mt-1">
                    ✓ Enabled
                  </Badge>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium text-foreground mb-2">Clear All Data</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Permanently delete all your transactions, debts, and preferences. This action cannot be undone.
                  </p>
                  <Button 
                    onClick={clearAllData}
                    disabled={loading}
                    variant="destructive"
                    size="sm"
                  >
                    Clear All Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Account Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input 
                    value={user?.displayName || user?.email?.split('@')[0] || ''} 
                    disabled 
                  />
                </div>
              </div>
              
              <div className="pt-4">
                <h4 className="font-medium mb-3">Account Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="font-bold text-foreground">{user?.id ? 'Active' : 'Inactive'}</div>
                    <div className="text-muted-foreground">Status</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="font-bold text-foreground">Free</div>
                    <div className="text-muted-foreground">Plan</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="font-bold text-foreground">✓</div>
                    <div className="text-muted-foreground">Cloud Sync</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="font-bold text-foreground">Unlimited</div>
                    <div className="text-muted-foreground">Storage</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-foreground mb-2">Sign Out</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Sign out of your Money Mate account. Your data will remain safe in the cloud.
                </p>
                <Button 
                  onClick={logout}
                  variant="outline"
                  size="sm"
                >
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}