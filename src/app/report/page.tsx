"use client";

import { useState, useMemo } from "react";
import { ReportForm } from "@/components/report-form";
import { LogsTable } from "@/components/logs-table";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format, addDays, eachDayOfInterval, isWeekend } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function LogsPage() {
  const [filters, setFilters] = useState<{
    dateRange?: { from: Date; to: Date };
    username?: string;
    apiDateRange?: { from: Date; to: Date } | null;
  }>({
    dateRange: {
      from: new Date(),
      to: addDays(new Date(), 7),
    },
    apiDateRange: {
      from: new Date(new Date().setDate(new Date().getDate() - 1)),
      to: addDays(new Date(), 7),
    },
  });

  const [reportedHours, setReportedHours] = useState(0); // Estado para armazenar as horas reportadas

  const handleSubmit = (values: {
    dateRange: { from: Date; to: Date };
    username?: string;
  }) => {
    const apiFrom = new Date(values.dateRange.from);
    apiFrom.setDate(apiFrom.getDate() - 1); // Include previous day

    setFilters({
      dateRange: values.dateRange,
      username: values.username || undefined,
      apiDateRange: {
        from: apiFrom,
        to: values.dateRange.to,
      },
    });
  };

  const handleReset = () => {
    const today = new Date();
    setFilters({
      dateRange: {
        from: today,
        to: addDays(today, 7),
      },
      username: undefined,
      apiDateRange: {
        from: addDays(today, -1),
        to: addDays(today, 7),
      },
    });
  };

  const isFilterActive = !!filters.dateRange || !!filters.username;

  const workingDaysInfo = useMemo(() => {
    if (!filters.dateRange) return [];

    const { from, to } = filters.dateRange;
    const months = new Map();

    eachDayOfInterval({ start: from, end: to }).forEach((date) => {
      const monthKey = format(date, "MMMM yyyy"); // e.g., "September 2025"
      if (!months.has(monthKey)) {
        months.set(monthKey, { workingDays: 0, reportedHours: 0 });
      }

      if (!isWeekend(date)) {
        months.get(monthKey).workingDays += 1;
      }
    });

    const result: {
      month: string;
      workingDays: number;
      missingHours: number;
    }[] = [];
    months.forEach((value, key) => {
      const totalHours = value.workingDays * 8;
      const missingHours = totalHours - reportedHours; // Subtrai as horas reportadas
      result.push({ month: key, workingDays: value.workingDays, missingHours });
    });

    return result;
  }, [filters.dateRange, reportedHours]); // Inclui reportedHours como dependência

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
            <h1 className="text-3xl font-bold tracking-tight">
              Time Logs Dashboard
            </h1>
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
                    Showing logs from{" "}
                    {format(filters.dateRange.from, "dd-MM-yyyy")} to{" "}
                    {format(filters.dateRange.to, "dd-MM-yyyy")}
                    {filters.username &&
                      `, filtered by username: ${filters.username}`}
                  </>
                ) : filters.username ? (
                  `Showing logs filtered by username: ${filters.username}`
                ) : (
                  "Showing all available time logs"
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <LogsTable
            dateRange={filters.dateRange}
            usernameFilter={filters.username}
            apiDateRange={filters.apiDateRange}
            onReportedHoursUpdate={setReportedHours} // Passa o callback para o LogsTable
          />
          {filters.username && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">
                Working Days Summary
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 rounded-md">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-600">
                        Month
                      </th>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-600">
                        Working Days
                      </th>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-600">
                        Missing Hours
                      </th>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-600">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {workingDaysInfo.map(
                      ({ month, workingDays, missingHours }) => (
                        <tr key={month} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">
                            {month}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">
                            {workingDays}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">
                            {missingHours}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-sm">
                            {missingHours > 0 ? (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-md">
                                Incomplete
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-md">
                                Complete
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
