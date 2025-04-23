'use client'
import { TimeLog } from "@/app/models/timelog"
import { useCallback, useEffect, useState } from "react"
import { Skeleton } from "./ui/skeleton"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "./ui/table"
import { PageInfo } from "@/app/models/pageInfo"
import { Button } from "./ui/button"
import { ChevronLeft, ChevronRight, FileDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import * as XLSX from 'xlsx'
import { format, parseISO } from "date-fns"

interface LogsTableProps {
  dateRange?: {
    from: Date
    to: Date
  } | null
  usernameFilter?: string
}

export function LogsTable({ dateRange, usernameFilter }: LogsTableProps) {
  const [logs, setLogs] = useState<TimeLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageInfo, setPageInfo] = useState<PageInfo>({
    hasNextPage: false,
    endCursor: null
  })
  const [currentCursor, setCurrentCursor] = useState<string | null>(null)
  const [cursorHistory, setCursorHistory] = useState<string[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [pageSize, setPageSize] = useState<number>(20) // Default page size

  const exportToExcel = async () => {
    try {
      const allLogs = await fetchAllLogs();
      if (!allLogs.length) {
        alert('No data to export');
        return;
      }

      // First determine all date columns we'll need (in correct order)
      const dateColumns: string[] = [];
      const dateFormatsMap = new Map<string, string>(); // Maps YYYY-MM-DD to dd/MM/yyyy

      if (dateRange) {
        const currentDate = new Date(dateRange.from);
        const endDate = new Date(dateRange.to);

        while (currentDate <= endDate) {
          const dateKey = format(currentDate, 'yyyy-MM-dd');
          const isoDate = format(currentDate, 'yyyy-MM-dd');

          dateColumns.push(dateKey);
          dateFormatsMap.set(isoDate, dateKey);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      // Group logs by project and user
      const dataMap: Record<string, Record<string, any>> = {};
      console.log(allLogs)
      allLogs.forEach(log => {
        const projectId = log.project.id.split('/').pop();
        const projectName = formatProjectName(log.project.fullPath);
        const userKey = `${projectId}-${log.user.username}`;

        if (!dataMap[userKey]) {
          // Initialize with all date columns set to 0
          dataMap[userKey] = {
            'Project Id': projectId,
            'Project Name': projectName,
            'Username': log.user.username,
            ...Object.fromEntries(dateColumns.map(date => [date, 0]))
          };
        }

        // Parse the log date (handle both ISO string and other formats)
        const logDate = log.spentAt.split('T')[0];
        const logIsoDate = format(logDate, 'yyyy-MM-dd');

        // Find matching date key in our columns
        const dateKey = dateFormatsMap.get(logIsoDate);

        if (dateKey) {
          // Convert seconds to hours and add to the correct date column
          console.log("DATA: " + dateKey + " USER: " + userKey + " => " + dataMap[userKey][dateKey])
          dataMap[userKey][dateKey] += log.timeSpent / 3600;
          console.log("DEPOIS -> DATA: " + dateKey + " USER: " + userKey + " => " + dataMap[userKey][dateKey])
        } else {
          console.warn(`Date ${log.spentAt} (formatted as ${logIsoDate}) not in export range`);
        }
      });

      // Convert to array and sort
      const excelData = Object.values(dataMap).sort((a, b) => {
        const projectCompare = a['Project Name'].toString().localeCompare(b['Project Name'].toString());
        if (projectCompare !== 0) return projectCompare;
        return a['Username'].toString().localeCompare(b['Username'].toString());
      });

      // Create worksheet with ordered columns
      const ws = XLSX.utils.json_to_sheet(excelData, {
        header: ['Project Id', 'Project Name', 'Username', ...dateColumns]
      });

      // Create workbook and export
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "TimeLogs");

      let fileName = "TimeLogs";
      if (dateRange) {
        fileName += `_${format(dateRange.from, 'dd-MM-yyyy')}-${format(dateRange.to, 'dd-MM-yyyy')}`;
      }
      if (usernameFilter) {
        fileName += `_${usernameFilter}`;
      }
      fileName += ".xlsx";

      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please check console for details.');
    }
  };

  const fetchAllLogs = async () => {
    try {
      let allNodes: TimeLog[] = [];
      let hasNextPage = true;
      let endCursor: string | null = null;

      while (hasNextPage) {
        const response = await fetch('https://gitlab.informantem.gen/api/graphql', {
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
              startDate: dateRange?.from.toISOString(),
              endDate: dateRange?.to.toISOString(),
              username: usernameFilter || null
            }
          })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        if (result.errors) throw new Error(result.errors[0].message);

        allNodes = [...allNodes, ...result.data.timelogs.nodes];
        hasNextPage = result.data.timelogs.pageInfo.hasNextPage;
        endCursor = result.data.timelogs.pageInfo.endCursor;
      }

      return allNodes;
    } catch (err) {
      console.error('Export failed:', err);
      return [];
    }
  };

  const fetchLogs = useCallback(async (cursor: string | null = null) => {
    setLoading(true)
    try {
      const response = await fetch('https://gitlab.informantem.gen/api/graphql', {
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
            startDate: format(dateRange!.from, 'yyyy-MM-dd'),
            endDate: format(dateRange!.to, 'yyyy-MM-dd'),
            username: usernameFilter || null
          }
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.errors) {
        throw new Error(result.errors[0].message)
      }

      setLogs(result.data.timelogs.nodes)
      setPageInfo(result.data.timelogs.pageInfo)
      setTotalCount(result.data.timelogs.count)

      // Update cursor history for back navigation
      if (cursor) {
        setCursorHistory(prev => [...prev, cursor])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }, [dateRange, pageSize, usernameFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

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
    const newSize = parseInt(value)
    setPageSize(newSize)
    setCursorHistory([]) // Reset history when changing page size
    setCurrentCursor(null) // Reset cursor
  }

  const formatTimeSpent = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const formatProjectName = (fullPath: string) => {
    const projectName = fullPath.split('/').pop() || ''

    if (fullPath.toLowerCase().includes('hydra')) {
      return 'Hydra'
    }

    return projectName.charAt(0).toUpperCase() + projectName.slice(1)
  }

  const formatDate = (dateString: string) => {
    return dateString.split('T')[0];
  };

  // Calculate current range
  const currentPosition = cursorHistory.length * pageSize
  const showingFrom = currentPosition + 1
  const showingTo = currentPosition + logs.length
  const showingTotal = totalCount

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={handlePageSizeChange}
            disabled={loading}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize.toString()} />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 40, 50].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={exportToExcel}
          variant="outline"
          className="ml-4"
          disabled={loading}
        >
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
              <TableCell colSpan={5} className="text-center">
                Loading...
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log, index) => (
              <TableRow key={`${log.user.id}-${log.issue.id}-${index}`}>
                <TableCell className="font-medium">{log.user.username}</TableCell>
                <TableCell>{formatProjectName(log.project.fullPath)}</TableCell>
                <TableCell>{log.issue.id.split('/').pop()}</TableCell>
                <TableCell>{formatTimeSpent(log.timeSpent)}</TableCell>
                <TableCell>{formatDate(log.spentAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {showingFrom} to {showingTo} of {showingTotal} results
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={cursorHistory.length === 0 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!pageInfo.hasNextPage || loading}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}