'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from './ui/button'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from './ui/form'
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

const formSchema = z.object({
  dateRange: z.object({
    from: z.date({
      required_error: "A start date is required",
    }),
    to: z.date({
      required_error: "An end date is required",
    }),
  }).refine((data) => data.from <= data.to, {
    message: "End date cannot be before start date",
    path: ["to"],
  }),
  username: z.string().optional()
})

interface ReportFormProps {
  onSubmit: (values: z.infer<typeof formSchema>) => void
  onReset: () => void
  isFilterActive: boolean
}

export function ReportForm({ onSubmit, onReset, isFilterActive }: ReportFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dateRange: {
        from: new Date(),
        to: new Date(new Date().setDate(new Date().getDate() + 7)),
      },
      username: ""
    }
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date Range Field */}
          <FormField
            control={form.control}
            name="dateRange"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date Range</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value?.from ? (
                          field.value.to ? (
                            <>
                              {format(field.value.from, "dd-MM-yyyy")} -{" "}
                              {format(field.value.to, "dd-MM-yyyy")}
                            </>
                          ) : (
                            format(field.value.from, "dd-MM-yyyy")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={field.value?.from}
                      selected={{
                        from: field.value?.from,
                        to: field.value?.to
                      }}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          field.onChange(range)
                        } else if (range?.from) {
                          field.onChange({ from: range.from, to: range.from })
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Username Field */}
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="Filter by username..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onReset()
              form.reset()
            }}
            disabled={!isFilterActive}
          >
            Reset Filters
          </Button>
          <Button type="submit">Apply Filters</Button>
        </div>
      </form>
    </Form>
  )
}