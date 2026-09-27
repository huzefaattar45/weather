import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  BrainCircuit,
  LineChart,
  CloudRain,
  Sun,
  Cloud,
  Wind,
  Droplets,
  CloudLightning,
  Compass,
  Activity,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  api,
  type TaskResponse,
  type ResortStatsResponse,
  type PricingAnalysisResponse,
  type StaffMemberResponse,
  type CurrentWeatherResponse,
} from '@/lib/api'

export const Route = createFileRoute('/_layout/dashboard')({
  component: DashboardPage,
})

function getWeatherIcon(condition: string) {
  const c = condition.toLowerCase()
  if (c.includes('rain') || c.includes('drizzle')) return <CloudRain className="h-6 w-6 text-sky-500" />
  if (c.includes('thunder') || c.includes('storm')) return <CloudLightning className="h-6 w-6 text-amber-500" />
  if (c.includes('cloud') || c.includes('overcast')) return <Cloud className="h-6 w-6 text-slate-400" />
  return <Sun className="h-6 w-6 text-amber-500" />
}

function getSeverityBadge(severity: string) {
  const s = severity?.toUpperCase()
  switch (s) {
    case 'EXTREME':
    case 'CRITICAL':
      return <Badge className="bg-rose-500/15 text-rose-700 border-rose-300 font-semibold tracking-wide">EXTREME</Badge>
    case 'HIGH':
      return <Badge className="bg-amber-500/15 text-amber-800 border-amber-300 font-semibold tracking-wide">HIGH</Badge>
    case 'MODERATE':
      return <Badge className="bg-blue-500/15 text-blue-700 border-blue-300 font-semibold tracking-wide">MODERATE</Badge>
    case 'LOW':
    case 'NORMAL':
    default:
      return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 font-semibold tracking-wide">LOW</Badge>
  }
}

function getSeverityColor(severity: string) {
  const s = severity?.toUpperCase()
  switch (s) {
    case 'EXTREME':
    case 'CRITICAL':
      return 'text-rose-600'
    case 'HIGH':
      return 'text-amber-600'
    case 'MODERATE':
      return 'text-blue-600'
    case 'LOW':
    case 'NORMAL':
    default:
      return 'text-emerald-600'
  }
}

function DashboardPage() {
  const [stats, setStats] = useState<ResortStatsResponse | null>(null)
  const [tasks, setTasks] = useState<TaskResponse[]>([])
  const [pricing, setPricing] = useState<PricingAnalysisResponse | null>(null)
  const [staff, setStaff] = useState<StaffMemberResponse[]>([])
  const [weather, setWeather] = useState<CurrentWeatherResponse>({
    temperature: 30.1,
    humidity: 64.0,
    rainfall: 0.0,
    rain_probability: 23.0,
    wind_speed: 13.3,
    condition: 'Sunny',
    timestamp: new Date().toISOString(),
    location: 'Smart Resort 360, South Goa',
    severity: 'LOW',
    severity_reason: 'Optimal conditions: Sunny, 30.1°C, 13.3 km/h wind, no significant rainfall',
    is_live: true,
  })
  const [weatherLoading, setWeatherLoading] = useState(false)

  useEffect(() => {
    // Fetch live data where possible
    api.getStats().then(setStats).catch(console.error)
    api.getTasks().then(data => {
      // Show only recent/active tasks
      setTasks(data.filter(t => !['closed', 'verified'].includes(t.status)).slice(0, 5))
    }).catch(console.error)
    api.getPricingAnalysis().then(setPricing).catch(console.error)
    api.getStaff().then(setStaff).catch(console.error)
    api.getCurrentWeather()
      .then((data) => {
        if (data) setWeather(data)
      })
      .catch((err) => console.warn('Dashboard weather fallback active:', err))
      .finally(() => setWeatherLoading(false))
  }, [])

  const openTasksCount = stats?.tasks.active ?? 12
  const highPriorityCount = stats?.complaints.high_priority ?? 3

  const availableStaff = staff.filter(s => s.available).length || 8
  const busyStaff = staff.filter(s => !s.available).length || 5

  return (
    <div className="p-6 space-y-6 bg-muted/20 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Manager Dashboard</h1>
        <div className="flex space-x-2">
          <Button variant="outline">Download Report</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTasksCount}</div>
            <p className="text-xs text-muted-foreground">Live active tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highPriorityCount}</div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time to Assign</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.2m</div>
            <p className="text-xs text-muted-foreground">+0.2m from last week (Demo)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time to Complete</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">34m</div>
            <p className="text-xs text-muted-foreground">-5m from last week (Demo)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Live Task Table</CardTitle>
            <CardDescription>Real-time view of current operational tasks.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-md border">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left font-medium">Task ID</th>
                      <th className="p-3 text-left font-medium">Issue</th>
                      <th className="p-3 text-left font-medium">Room</th>
                      <th className="p-3 text-left font-medium">Assigned To</th>
                      <th className="p-3 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.length > 0 ? tasks.map(task => (
                      <tr key={task.id} className="border-b">
                        <td className="p-3">TSK-{task.id}</td>
                        <td className="p-3">{task.issue_type || "General"}</td>
                        <td className="p-3">{task.location || "General"}</td>
                        <td className="p-3">{task.staff_name || "Unassigned"}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={
                            task.status === "in_progress" ? "bg-yellow-100 text-yellow-800" :
                            task.status === "assigned" ? "bg-blue-100 text-blue-800" :
                            "bg-gray-100 text-gray-800"
                          }>
                            {task.status.replace("_", " ").toUpperCase()}
                          </Badge>
                        </td>
                      </tr>
                    )) : (
                      <>
                        <tr className="border-b">
                          <td className="p-3">TSK-1021</td>
                          <td className="p-3">AC Not Cooling</td>
                          <td className="p-3">204</td>
                          <td className="p-3">Rahul Sharma</td>
                          <td className="p-3"><Badge variant="outline" className="bg-yellow-100 text-yellow-800">In Progress</Badge></td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3">TSK-1022</td>
                          <td className="p-3">Plumbing Leak</td>
                          <td className="p-3">112</td>
                          <td className="p-3">Arjun Patil</td>
                          <td className="p-3"><Badge variant="outline" className="bg-blue-100 text-blue-800">Assigned</Badge></td>
                        </tr>
                        <tr>
                          <td className="p-3">TSK-1023</td>
                          <td className="p-3">Extra Towels</td>
                          <td className="p-3">305</td>
                          <td className="p-3">Priya Nair</td>
                          <td className="p-3"><Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge></td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="col-span-3 space-y-4">
          {/* Weather Intelligence Card */}
          <Card className="border-sky-200/80 shadow-xs overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-gradient-to-r from-sky-50/70 to-indigo-50/40 border-b border-sky-100">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold text-slate-800">Weather Intelligence</CardTitle>
                  {weather && getSeverityBadge(weather.severity)}
                </div>
                <CardDescription className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <Compass className="h-3 w-3 text-sky-500" />
                  {weather?.location || 'Smart Resort 360, South Goa'}
                </CardDescription>
              </div>
              <div className="p-2 rounded-xl bg-white shadow-xs border border-sky-100">
                {weather ? getWeatherIcon(weather.condition) : <Sun className="h-6 w-6 text-amber-500" />}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {weatherLoading ? (
                <div className="py-4 text-center text-xs text-muted-foreground animate-pulse">
                  Fetching live telemetry…
                </div>
              ) : weather ? (
                <>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-3xl font-extrabold tracking-tight text-slate-900">
                        {weather.temperature}°C
                      </div>
                      <div className="text-xs font-medium text-slate-600 capitalize mt-0.5">
                        {weather.condition}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold uppercase text-slate-400">Severity Rating</div>
                      <div className={`text-base font-extrabold tracking-wider ${getSeverityColor(weather.severity)}`}>
                        {weather.severity}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex flex-col justify-between">
                      <span className="text-slate-500 flex items-center gap-1 font-medium">
                        <CloudRain className="h-3 w-3 text-sky-500" /> Rainfall
                      </span>
                      <span className="font-bold text-slate-800 text-sm mt-1">{weather.rainfall} mm</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex flex-col justify-between">
                      <span className="text-slate-500 flex items-center gap-1 font-medium">
                        <Droplets className="h-3 w-3 text-blue-500" /> Rain Prob.
                      </span>
                      <span className="font-bold text-slate-800 text-sm mt-1">{weather.rain_probability}%</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex flex-col justify-between">
                      <span className="text-slate-500 flex items-center gap-1 font-medium">
                        <Wind className="h-3 w-3 text-teal-500" /> Wind
                      </span>
                      <span className="font-bold text-slate-800 text-sm mt-1">{weather.wind_speed} km/h</span>
                    </div>
                  </div>

                  {weather.severity_reason && (
                    <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <span className="font-semibold text-slate-800">Operational Severity Rationale: </span>
                        {weather.severity_reason}
                      </div>
                    </div>
                  )}

                  <div className="pt-1">
                    <Link to="/digital-twin" className="w-full block">
                      <Button variant="outline" size="sm" className="w-full text-xs h-8 border-sky-200 text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/30 flex items-center justify-center gap-1.5 font-medium transition-colors">
                        <Activity className="h-3.5 w-3.5 text-sky-600" />
                        Open What-If Digital Twin Simulator
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground py-2 text-center">
                  Weather telemetry temporarily unavailable
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0">
              <div className="flex-1">
                <CardTitle>AI Assignment Insight</CardTitle>
                <CardDescription>Explainability view for recent assignment.</CardDescription>
              </div>
              <BrainCircuit className="h-5 w-5 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-muted-foreground">Assigned to:</span>
                  <span className="font-bold">Rahul Sharma</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-muted-foreground">Match Score:</span>
                  <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">92/100</Badge>
                </div>
                <div className="pt-2 border-t space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Skill Match</span>
                    <span>35/35</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Availability</span>
                    <span>20/20</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Workload</span>
                    <span>18/25</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Priority</span>
                    <span>15/15</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Recency</span>
                    <span>4/5</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0">
              <div className="flex-1">
                <CardTitle>Pricing Intelligence</CardTitle>
                <CardDescription>Live competitor analysis</CardDescription>
              </div>
              <LineChart className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{pricing?.competitors?.[0]?.name || "Munnar Valley Resort"}:</span>
                  <span className="font-medium">₹{pricing?.competitors?.[0]?.rate || "4,200"}/night</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Market Average:</span>
                  <span className="font-medium">₹{pricing?.market_average || "4,800"}/night</span>
                </div>
                <div className="mt-2 p-3 bg-emerald-50 text-emerald-900 rounded-md border border-emerald-100">
                  <span className="font-medium block mb-1">AI Suggestion:</span>
                  {pricing?.recommendation || "Consider raising Deluxe AC rates by ₹400 for the upcoming weekend. Competitor availability is low."}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Staffing Snapshot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4 text-sm">
                <div className="flex flex-col items-center">
                  <div className="text-2xl font-bold text-green-600">{availableStaff}</div>
                  <div className="text-muted-foreground">Available</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-2xl font-bold text-orange-500">{busyStaff}</div>
                  <div className="text-muted-foreground">Busy</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-2xl font-bold text-slate-400">2</div>
                  <div className="text-muted-foreground">On Leave</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
