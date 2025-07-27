import React, { useState } from 'react'
import { History, CreditCard, BarChart3, Settings, Users } from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { Dashboard } from './components/Dashboard'
import { AddTransaction } from './components/AddTransaction'
import { TransactionHistory } from './components/TransactionHistory'
import { DebtManager } from './components/DebtManager'
import { Analytics } from './components/Analytics'
import { Settings as SettingsComponent } from './components/Settings'
import { FamilyAccess } from './components/FamilyAccess'
import { PlaceholderPage } from './components/PlaceholderPage'
import { Button } from './components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Toaster } from './components/ui/toaster'

function LoginScreen() {
  const { login } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08 .402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold">Money Mate</CardTitle>
          <p className="text-muted-foreground">
            Your personal finance tracker
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span>Track Income & Expenses</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span>CAD/INR Conversion</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <span>Debt Management</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                <span>Family Sharing</span>
              </div>
            </div>
          </div>

          <Button 
            onClick={login} 
            className="w-full bg-primary hover:bg-primary/90"
            size="lg"
          >
            Get Started Free
          </Button>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              100% Free • No Ads • Secure Cloud Sync
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AppContent() {
  const { user, isLoading } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-primary rounded-lg animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Money Mate...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onPageChange={setCurrentPage} />
      case 'add-transaction':
        return <AddTransaction />
      case 'history':
        return <TransactionHistory />
      case 'debts':
        return <DebtManager />
      case 'analytics':
        return <Analytics />
      case 'family':
        return <FamilyAccess />
      case 'settings':
        return <SettingsComponent />
      default:
        return <Dashboard onPageChange={setCurrentPage} />
    }
  }

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  )
}

export default App