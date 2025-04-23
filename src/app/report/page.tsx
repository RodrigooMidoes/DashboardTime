'use client'

import { useState } from 'react'
import { ReportForm } from '@/components/report-form'
import { LogsTable } from '@/components/logs-table'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { format } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export default function LogsPage() {
  const [filters, setFilters] = useState<{
    dateRange?: { from: Date; to: Date }
    username?: string
  }>({
    dateRange: {
      from: new Date(),
      to: new Date(new Date().setDate(new Date().getDate() + 7)),
    }
  })

  const handleSubmit = (values: {
    dateRange: { from: Date; to: Date }
    username?: string
  }) => {
    setFilters({
      dateRange: values.dateRange,
      username: values.username || undefined
    })
  }

  const handleReset = () => {
    setFilters({})
  }

  const isFilterActive = !!filters.dateRange || !!filters.username

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
              <Link href="/">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Back to home</span>
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Time Logs Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            View and analyze time tracking data across your projects
          </p>
        </div>
      </div>

      <Separator className="my-6" />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportForm
            onSubmit={handleSubmit}
            onReset={handleReset}
            isFilterActive={isFilterActive}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Time Logs</CardTitle>
              <CardDescription>
                {filters.dateRange ? (
                  <>
                    Showing logs from {format(filters.dateRange.from, "dd-MM-yyyy")} to {format(filters.dateRange.to, "dd-MM-yyyy")}
                    {filters.username && `, filtered by username: ${filters.username}`}
                  </>
                ) : (
                  filters.username ? `Showing logs filtered by username: ${filters.username}` : 'Showing all available time logs'
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <LogsTable
            dateRange={filters.dateRange}
            usernameFilter={filters.username}
          />
        </CardContent>
      </Card>
    </div>
  )
}