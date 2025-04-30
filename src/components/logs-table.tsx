'use client'
import { TimeLog } from "@/models/timelog"
import { useCallback, useEffect, useState } from "react"
import { Skeleton } from "./ui/skeleton"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "./ui/table"
import { PageInfo } from "@/models/pageInfo"
import { Button } from "./ui/button"
import { ChevronLeft, ChevronRight, FileDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import * as XLSX from 'xlsx'
import { format, addHours } from 'date-fns'
import type { ApiResponse } from "@/models/apiResponse"

interface LogsTableProps {
  dateRange?: { from: Date; to: Date } | null
  usernameFilter?: string
  apiDateRange?: { from: Date; to: Date } | null
}

export function LogsTable({ dateRange, usernameFilter, apiDateRange }: LogsTableProps) {
  const [logs, setLogs] = useState<TimeLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageInfo, setPageInfo] = useState<PageInfo>({ hasNextPage: false, endCursor: null })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentCursor, setCurrentCursor] = useState<string | null>(null)
  const [cursorHistory, setCursorHistory] = useState<string[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [pageSize, setPageSize] = useState<number>(20)

  const convertToLocalDate = (utcDate: string) => {
    const date = new Date(utcDate)
    return addHours(date, 1) // Adjust for UTC+1
  }

  const fetchLogs = useCallback(async (cursor: string | null = null) => {
    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_GITLAB_URL}/api/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GITLAB_TOKEN}`
        },
        body: JSON.stringify({
          query: `
            query GetAllLogs($cursor: String, $first: Int, $startDate: Time, $endDate: Time, $username: String) {
              timelogs(
                groupId: "gid://gitlab/Group/6",
                after: $cursor,
                first: $first,
                startDate: $startDate,
                endDate: $endDate,
                username: $username
              ) {
                count
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  project {
                    id
                    fullPath
                  }
                  issue {
                    id
                  }
                  timeSpent
                  spentAt
                  user {
                    id
                    username
                  }
                }
              }
            }
          `,
          variables: {
            cursor,
            first: pageSize,
            startDate: apiDateRange ? format(apiDateRange.from, 'yyyy-MM-dd') : null,
            endDate: apiDateRange ? format(apiDateRange.to, 'yyyy-MM-dd') : null,
            username: usernameFilter || null
          }
        })
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const result: ApiResponse = await response.json()

      const processedNodes = result.data.timelogs.nodes.map(log => {
        const localDate = convertToLocalDate(log.spentAt)
        return {
          ...log,
          spentAt: localDate.toISOString(),
          spentAtDisplay: format(localDate, 'yyyy-MM-dd')
        }
      })

      setLogs(processedNodes)
      setPageInfo(result.data.timelogs.pageInfo)
      setTotalCount(result.data.timelogs.count)

      if (cursor) setCursorHistory(prev => [...prev, cursor])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }, [apiDateRange, pageSize, usernameFilter])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const fetchAllLogs = async () => {
    try {
      let allNodes: TimeLog[] = []
      let hasNextPage = true
      let endCursor: string | null = null

      while (hasNextPage) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_GITLAB_URL}/api/graphql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GITLAB_TOKEN}`
          },
          body: JSON.stringify({
            query: `
              query GetAllLogs($cursor: String, $startDate: Time, $endDate: Time, $username: String) {
                timelogs(
                  groupId: "gid://gitlab/Group/6",
                  after: $cursor,
                  first: 100,
                  startDate: $startDate,
                  endDate: $endDate,
                  username: $username
                ) {
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                  nodes {
                    project {
                      id
                      fullPath
                    }
                    issue {
                      id
                    }
                    timeSpent
                    spentAt
                    user {
                      id
                      username
                    }
                  }
                }
              }
            `,
            variables: {
              cursor: endCursor,
              startDate: apiDateRange ? format(apiDateRange.from, 'yyyy-MM-dd') : null,
              endDate: apiDateRange ? format(apiDateRange.to, 'yyyy-MM-dd') : null,
              username: usernameFilter || null
            }
          })
        })

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = await response.json()
        if (result.errors) throw new Error(result.errors[0].message)

        allNodes = [...allNodes, ...result.data.timelogs.nodes.map((log: TimeLog) => ({
          ...log,
          spentAt: convertToLocalDate(log.spentAt).toISOString()
        }))]
        hasNextPage = result.data.timelogs.pageInfo.hasNextPage
        endCursor = result.data.timelogs.pageInfo.endCursor
      }

      return allNodes
    } catch (err) {
      console.error('Export failed:', err)
      return []
    }
  }

  const exportToExcel = async () => {
    try {
      const allLogs = await fetchAllLogs()
      if (!allLogs.length) {
        alert('No data to export')
        return
      }

      const dateColumns: string[] = []
      const dateFormatsMap = new Map<string, string>()

      if (dateRange) {
        const currentDate = new Date(dateRange.from)
        const endDate = new Date(dateRange.to)

        while (currentDate <= endDate) {
          const dateKey = format(currentDate, 'yyyy-MM-dd')
          dateColumns.push(dateKey)
          dateFormatsMap.set(dateKey, dateKey)
          currentDate.setDate(currentDate.getDate() + 1)
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataMap: Record<string, Record<string, any>> = {}

      allLogs.forEach(log => {
        const projectId = log.project.id.split('/').pop()
        const projectName = formatProjectName(log.project.fullPath)
        const userKey = `${projectId}-${log.user.username}`

        if (!dataMap[userKey]) {
          dataMap[userKey] = {
            'Project Id': projectId,
            'Project Name': projectName,
            'Username': log.user.username,
            ...Object.fromEntries(dateColumns.map(date => [date, 0]))
          }
        }

        const logDate = log.spentAt.split('T')[0]
        const dateKey = dateFormatsMap.get(logDate)
        if (dateKey) dataMap[userKey][dateKey] += log.timeSpent / 3600
      })

      const excelData = Object.values(dataMap).sort((a, b) => {
        const projectCompare = a['Project Name'].toString().localeCompare(b['Project Name'].toString())
        return projectCompare !== 0 ? projectCompare : a['Username'].toString().localeCompare(b['Username'].toString())
      })

      const ws = XLSX.utils.json_to_sheet(excelData, {
        header: ['Project Id', 'Project Name', 'Username', ...dateColumns]
      })

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "TimeLogs")

      let fileName = "TimeLogs"
      if (dateRange) fileName += `_${format(dateRange.from, 'dd-MM-yyyy')}-${format(dateRange.to, 'dd-MM-yyyy')}`
      if (usernameFilter) fileName += `_${usernameFilter}`
      fileName += ".xlsx"

      XLSX.writeFile(wb, fileName)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please check console for details.')
    }
  }

  const handleNextPage = () => {
    if (pageInfo.hasNextPage && pageInfo.endCursor) {
      setCurrentCursor(pageInfo.endCursor)
      fetchLogs(pageInfo.endCursor)
    }
  }

  const handlePreviousPage = () => {
    if (cursorHistory.length > 0) {
      const newHistory = [...cursorHistory]
      newHistory.pop()
      setCursorHistory(newHistory)
      const prevCursor = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null
      setCurrentCursor(prevCursor)
      fetchLogs(prevCursor)
    }
  }

  const handlePageSizeChange = (value: string) => {
    setPageSize(parseInt(value))
    setCursorHistory([])
    setCurrentCursor(null)
  }

  const formatTimeSpent = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const formatProjectName = (fullPath: string) => {
    const projectName = fullPath.split('/').pop() || ''
    if (fullPath.toLowerCase().includes('hydra')) return 'Hydra'
    return projectName.charAt(0).toUpperCase() + projectName.slice(1)
  }

  // Filter logs based on date range
  const filteredLogs = logs.filter(log => {
    if (!dateRange?.from) return true;
    const logDate = new Date(log.spentAt);
    return logDate >= new Date(dateRange.from);
  });

  const currentPosition = cursorHistory.length * pageSize;
  const showingFrom = filteredLogs.length > 0 ? currentPosition + 1 : 0;
  const showingTo = currentPosition + filteredLogs.length;
  const hasNoResults = filteredLogs.length === 0;

  if (loading && !logs.length) return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  )

  if (error) return <div className="text-red-500">Error: {error}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select value={pageSize.toString()} onValueChange={handlePageSizeChange} disabled={loading}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize.toString()} />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 40, 50].map(size => (
                <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={exportToExcel} variant="outline" className="ml-4" disabled={loading || hasNoResults}>
          <FileDown className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Issue</TableHead>
            <TableHead>Time Spent</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">Loading...</TableCell>
            </TableRow>
          ) : hasNoResults ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                No logs found for the selected date range
              </TableCell>
            </TableRow>
          ) : (
            filteredLogs.map((log, index) => (
              <TableRow key={`${log.user.id}-${log.issue.id}-${index}`}>
                <TableCell className="font-medium">{log.user.username}</TableCell>
                <TableCell>{formatProjectName(log.project.fullPath)}</TableCell>
                <TableCell>{log.issue.id.split('/').pop()}</TableCell>
                <TableCell>{formatTimeSpent(log.timeSpent)}</TableCell>
                <TableCell>{log.spentAt.toString().split('T')[0]}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {hasNoResults ? (
            `Showing 0 results`
          ) : (
            `Showing ${showingFrom} to ${showingTo} of ${totalCount} results`
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={!cursorHistory.length || loading || hasNoResults}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!pageInfo.hasNextPage || loading || hasNoResults}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}