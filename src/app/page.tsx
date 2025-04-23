import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CalendarIcon, ClockIcon, FileTextIcon } from 'lucide-react'

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen w-full bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center flex-grow">
        {/* Hero Section */}
        <div className="text-center mb-16 max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-4">
            Time Tracking Dashboard
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Visualize and analyze your team&apos;s time tracking data with powerful insights
          </p>

          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/report">
                <FileTextIcon className="mr-2 h-5 w-5" />
                View Reports
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="#features">
                <ClockIcon className="mr-2 h-5 w-5" />
                Learn More
              </Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div id="features" className="w-full max-w-6xl">
          <h2 className="text-2xl font-semibold text-gray-800 mb-8 text-center">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CalendarIcon className="h-8 w-8 text-primary mb-4" />
                <CardTitle>Date Range Filtering</CardTitle>
                <CardDescription>
                  Analyze time logs for any date range with precision
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <FileTextIcon className="h-8 w-8 text-primary mb-4" />
                <CardTitle>Detailed Reports</CardTitle>
                <CardDescription>
                  Comprehensive breakdowns by project and user
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <ClockIcon className="h-8 w-8 text-primary mb-4" />
                <CardTitle>Time Analysis</CardTitle>
                <CardDescription>
                  Track hours spent and identify productivity trends
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-4">
            Ready to explore your time tracking data?
          </h3>
          <Button asChild size="lg" className="px-8">
            <Link href="/report">
              Get Started
              <FileTextIcon className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t py-6">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          <p>Time Tracking Dashboard - Rodrigo Midões © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </main>
  )
}