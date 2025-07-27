import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'

interface PlaceholderPageProps {
  title: string
  description: string
  icon: React.ReactNode
  comingSoon?: boolean
}

export function PlaceholderPage({ title, description, icon, comingSoon = true }: PlaceholderPageProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            {icon}
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {description}
          </p>
          {comingSoon && (
            <div className="space-y-4">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary font-medium">
                🚀 Coming Soon
              </div>
              <p className="text-sm text-muted-foreground">
                This feature is currently under development and will be available in the next update.
              </p>
              <Button variant="outline" disabled>
                Feature In Development
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}