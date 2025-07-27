import React, { useState, useEffect } from 'react'
import { 
  Users, 
  Plus, 
  Mail, 
  Eye, 
  Shield, 
  Trash2,
  UserCheck,
  UserX,
  Share,
  Lock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { blink } from '../blink/client'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/use-toast'
import type { FamilyAccess } from '../types'

export function FamilyAccess() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [familyMembers, setFamilyMembers] = useState<FamilyAccess[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')

  const loadFamilyMembers = async () => {
    try {
      setLoading(true)
      const members = await blink.db.family_access.list({
        where: { owner_user_id: user!.id },
        orderBy: { created_at: 'desc' }
      })
      setFamilyMembers(members)
    } catch (error) {
      console.error('Error loading family members:', error)
      toast({
        variant: "destructive",
        description: "Failed to load family members"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      loadFamilyMembers()
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const addFamilyMember = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMemberEmail || !newMemberEmail.includes('@')) {
      toast({
        variant: "destructive",
        description: "Please enter a valid email address"
      })
      return
    }

    if (newMemberEmail === user?.email) {
      toast({
        variant: "destructive",
        description: "You cannot add yourself as a family member"
      })
      return
    }

    // Check if member already exists
    const existingMember = familyMembers.find(m => m.member_email === newMemberEmail)
    if (existingMember) {
      toast({
        variant: "destructive",
        description: "This email is already added as a family member"
      })
      return
    }

    try {
      const familyMember: FamilyAccess = {
        id: `family_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        owner_user_id: user!.id,
        member_email: newMemberEmail,
        access_level: 'view',
        is_active: '1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      await blink.db.family_access.create(familyMember)
      
      toast({
        description: "Family member added successfully! They can now view your financial data."
      })
      
      setNewMemberEmail('')
      setAddDialogOpen(false)
      loadFamilyMembers()
      
    } catch (error) {
      console.error('Error adding family member:', error)
      toast({
        variant: "destructive",
        description: "Failed to add family member"
      })
    }
  }

  const toggleMemberAccess = async (memberId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === '1' ? '0' : '1'
      await blink.db.family_access.update(memberId, {
        is_active: newStatus,
        updated_at: new Date().toISOString()
      })
      
      toast({
        description: `Family member access ${newStatus === '1' ? 'enabled' : 'disabled'}`
      })
      
      loadFamilyMembers()
    } catch (error) {
      console.error('Error updating member access:', error)
      toast({
        variant: "destructive",
        description: "Failed to update member access"
      })
    }
  }

  const removeFamilyMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from family access?`)) {
      return
    }

    try {
      await blink.db.family_access.delete(memberId)
      toast({
        description: "Family member removed successfully"
      })
      loadFamilyMembers()
    } catch (error) {
      console.error('Error removing family member:', error)
      toast({
        variant: "destructive",
        description: "Failed to remove family member"
      })
    }
  }

  const activeMembersCount = familyMembers.filter(m => Number(m.is_active) === 1).length
  const totalMembersCount = familyMembers.length

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <h1 className="text-2xl font-bold text-foreground">Family Access</h1>
          <p className="text-muted-foreground mt-1">
            Share view-only access to your financial data with family members
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mt-4 sm:mt-0">
              <Plus className="w-4 h-4 mr-2" />
              Add Family Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Share className="w-5 h-5" />
                <span>Add Family Member</span>
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={addFamilyMember} className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="family.member@example.com"
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  They will get view-only access to your financial data
                </p>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Family members can only view your data - they cannot edit, delete, or add any transactions or debts.
                </AlertDescription>
              </Alert>

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
                  Add Member
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Members</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {activeMembersCount}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold text-foreground">
                  {totalMembersCount}
                </p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Access Level</p>
                <p className="text-2xl font-bold text-blue-600">
                  View Only
                </p>
              </div>
              <Eye className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Family Members List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Family Members</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {familyMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Family Members</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't shared access with any family members yet.
                </p>
                <Button onClick={() => setAddDialogOpen(true)} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Member
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {familyMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        Number(member.is_active) === 1 ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {Number(member.is_active) === 1 ? (
                          <UserCheck className="w-4 h-4" />
                        ) : (
                          <UserX className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{member.member_email}</p>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">
                            <Eye className="w-3 h-3 mr-1" />
                            View Only
                          </Badge>
                          <Badge variant={Number(member.is_active) === 1 ? "default" : "secondary"}>
                            {Number(member.is_active) === 1 ? 'Active' : 'Disabled'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleMemberAccess(member.id, member.is_active)}
                        title={Number(member.is_active) === 1 ? 'Disable access' : 'Enable access'}
                      >
                        {Number(member.is_active) === 1 ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFamilyMember(member.id, member.member_email)}
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Information Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Privacy & Security</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium text-foreground mb-3">What Family Members Can See</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span>All transaction history with amounts and categories</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span>Debt information and payment tracking</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span>Financial analytics and trends</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span>Monthly income and expense summaries</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-3">What Family Members Cannot Do</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>Add, edit, or delete transactions</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>Modify debt information</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>Change account settings or preferences</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>Export data or access sensitive information</span>
                </li>
              </ul>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                You can disable or remove family member access at any time. All data remains secure and encrypted.
              </AlertDescription>
            </Alert>

            <div className="bg-muted rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">Need Help?</h4>
              <p className="text-sm text-muted-foreground">
                Family sharing is designed to help couples, parents, and trusted family members 
                stay informed about household finances while maintaining security and privacy.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}