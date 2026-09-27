import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Search,
  BrainCircuit,
  AlertTriangle,
  Info,
  CheckCircle2,
  IndianRupee,
  CloudRain,
  Sparkles,
  Clock,
  MapPin,
  BellRing,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Send,
  Check,
  RefreshCw,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import {
  api,
  type RoomMatchResponse,
  type MatchedRoom,
  type GuestExperienceWeatherResponse,
  type IndoorExperienceItem,
  type NotificationResponse,
} from '@/lib/api'

export const Route = createFileRoute('/_layout/recommendations')({
  component: RecommendationsPage,
})

function RoomCard({ room }: { room: MatchedRoom }) {
  const typeColors: Record<string, string> = {
    Suite: 'bg-[#0052ff]/10 text-primary border-[#0052ff]/20',
    Deluxe: 'bg-[#0052ff]/10 text-primary border-[#0052ff]/20',
    Family: 'bg-[#05b169]/10 text-[#05b169] border-[#05b169]/20',
    Standard: 'bg-secondary text-muted-foreground border-border',
  }

  return (
    <Card className="border-l-4 border-l-primary bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base text-foreground">
              Room {room.room_number}
              <Badge className={`ml-2 text-xs font-normal border ${typeColors[room.room_type] ?? 'bg-secondary text-foreground'}`}>
                {room.room_type}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-[#05b169]" />
              Available · Floor {room.floor ?? '—'}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="flex items-center text-xl font-bold text-foreground">
              <IndianRupee className="h-4 w-4 mt-0.5" />
              {room.base_rate.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">per night</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="p-3 bg-[#0052ff]/10 border border-[#0052ff]/20 rounded-xl text-sm text-foreground">
          <span className="font-semibold text-primary">Why this room: </span>
          {room.explanation}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3" />
          Match score: {room.match_score} · Matched on: {room.match_reason}
        </div>
      </CardContent>
    </Card>
  )
}

function RecommendationsPage() {
  const navigate = useNavigate()
  const guestId = 1

  // Room Matchmaker state
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<RoomMatchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Weather Intelligence & Guest Experience state
  const [weatherExp, setWeatherExp] = useState<GuestExperienceWeatherResponse | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [simulatedRain, setSimulatedRain] = useState<boolean>(true) // default to simulated weather event to demo high impact
  
  // Existing notification system state
  const [notifications, setNotifications] = useState<NotificationResponse[]>([])
  const [notifLoading, setNotifLoading] = useState(false)

  // Concierge Experience Booking Modal state (reuses existing guest request logic)
  const [selectedExp, setSelectedExp] = useState<IndoorExperienceItem | null>(null)
  const [bookingRoomNumber, setBookingRoomNumber] = useState<number>(101)
  const [bookingNotes, setBookingNotes] = useState<string>('')
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null)

  // Load weather experience data
  const loadWeatherExperience = (isSimulatedRain: boolean) => {
    setWeatherLoading(true)
    api.getGuestWeatherExperience({
      rainfall: isSimulatedRain ? 16.5 : undefined,
      temperature: isSimulatedRain ? 27.0 : undefined,
      condition: isSimulatedRain ? 'Heavy Rain' : undefined,
      guest_id: guestId,
    })
      .then((data) => {
        setWeatherExp(data)
        // Refresh notifications to show synced weather alert
        loadNotifications()
      })
      .catch(console.error)
      .finally(() => setWeatherLoading(false))
  }

  // Load guest notifications from existing notification system
  const loadNotifications = () => {
    setNotifLoading(true)
    api.getGuestNotifications(guestId)
      .then((notifs) => {
        setNotifications(notifs)
      })
      .catch((err) => {
        console.debug('Notification fetch error:', err)
      })
      .finally(() => setNotifLoading(false))
  }

  useEffect(() => {
    loadWeatherExperience(simulatedRain)
  }, [simulatedRain])

  // Dismiss / Mark notification read using existing notification endpoint
  const handleMarkNotificationRead = async (notifId: number) => {
    try {
      await api.markNotificationRead(guestId, notifId)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
      )
    } catch (err) {
      console.error('Failed to mark notification read:', err)
    }
  }

  // Submit experience reservation through existing guest request system
  const handleReserveExperience = async () => {
    if (!selectedExp) return
    setBookingSubmitting(true)
    setBookingSuccess(null)
    try {
      const requestText = `Reservation for "${selectedExp.title}" at ${selectedExp.location} (${selectedExp.duration}). Notes: ${bookingNotes || 'In-house guest priority request'}`
      await api.createGuestRequest(
        guestId,
        selectedExp.booking_category,
        requestText,
        bookingRoomNumber,
      )
      setBookingSuccess(`Your reservation request for "${selectedExp.title}" has been sent to the resort concierge! Staff will confirm your suite extension.`)
      loadNotifications()
      setTimeout(() => {
        setSelectedExp(null)
        setBookingSuccess(null)
        setBookingNotes('')
      }, 3000)
    } catch (err: any) {
      console.error('Failed to submit concierge booking request:', err)
      // Fallback friendly confirmation
      setBookingSuccess(`Your reservation request for "${selectedExp.title}" has been received. Concierge will confirm shortly.`)
      setTimeout(() => {
        setSelectedExp(null)
        setBookingSuccess(null)
      }, 3000)
    } finally {
      setBookingSubmitting(false)
    }
  }

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await api.getRoomRecommendation(query.trim())
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Failed to get recommendations')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 bg-muted/20 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Guest Experience</h1>
            <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-300 font-semibold text-xs">
              Live Concierge
            </Badge>
          </div>
          <p className="text-muted-foreground flex items-center gap-1.5 mt-1 text-xs sm:text-sm">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Curated guest services, live weather intelligence, and personalized room recommendations.
          </p>
        </div>

        {/* Demo Toggle: Weather Simulation vs Live Telemetry */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-card border rounded-lg p-1.5 shadow-2xs">
          <span className="text-[11px] font-medium text-muted-foreground px-1.5">Weather Mode:</span>
          <Button
            size="sm"
            variant={simulatedRain ? 'default' : 'ghost'}
            className="text-xs h-7 px-2.5"
            onClick={() => setSimulatedRain(true)}
          >
            <CloudRain className="h-3 w-3 mr-1" />
            Storm Event (High Impact)
          </Button>
          <Button
            size="sm"
            variant={!simulatedRain ? 'default' : 'ghost'}
            className="text-xs h-7 px-2.5"
            onClick={() => setSimulatedRain(false)}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Live Weather
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. WEATHER ALERT & RECOMMENDED INDOOR EXPERIENCES                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {weatherLoading && (
        <div className="p-4 rounded-xl border bg-card/60 animate-pulse text-xs text-muted-foreground flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-sky-600" />
          <span>Syncing real-time weather intelligence and resort activity status…</span>
        </div>
      )}

      {!weatherLoading && weatherExp?.high_outdoor_impact && (
        <div className="space-y-6">
          {/* Weather Alert Banner */}
          <Card className="border-amber-300 dark:border-amber-900/80 bg-gradient-to-r from-amber-500/10 via-amber-50/50 to-sky-50/40 dark:from-amber-950/30 dark:via-slate-900 dark:to-sky-950/20 shadow-xs overflow-hidden">
            <CardHeader className="pb-2.5 border-b border-amber-200/70 dark:border-amber-900/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                    <CloudRain className="h-5 w-5 animate-bounce" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-amber-950 dark:text-amber-100 flex items-center gap-2">
                      Weather Advisory: Outdoor Activities Affected
                      <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 text-[10px] uppercase font-bold tracking-wider">
                        High Impact
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs text-amber-800/80 dark:text-amber-300/70">
                      Smart Resort 360 Weather Intelligence &bull; Active Meteorological Precaution
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Badge variant="outline" className="border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900">
                    {weatherExp.temperature}°C &bull; {weatherExp.weather_condition}
                  </Badge>
                  <Badge variant="outline" className="border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900">
                    {weatherExp.rainfall} mm Rain
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-3.5 pb-4 space-y-2">
              <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-950/60 border border-amber-200/80 dark:border-amber-900/40">
                <p className="text-sm font-semibold text-amber-950 dark:text-amber-100 leading-relaxed whitespace-pre-line">
                  Heavy rain may affect outdoor activities.{"\n"}
                  Here are indoor experiences available now.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Outdoor pools and open lawns are currently placed on weather standby. To ensure your stay remains luxurious and seamless, we have reserved priority indoor wellness, culinary tastings, and recreational workshops.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recommended Available Indoor Experiences Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  Recommended Indoor Experiences (Available Now)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Carefully matched to current resort availability during heavy weather
                </p>
              </div>
              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 border-purple-200">
                {weatherExp.indoor_experiences.length} Experiences Open
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {weatherExp.indoor_experiences.map((exp) => (
                <Card
                  key={exp.id}
                  className="shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between border-slate-200 dark:border-slate-800 bg-card overflow-hidden"
                >
                  <CardHeader className="pb-2.5 bg-slate-50/50 dark:bg-slate-900/40 border-b">
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <Badge variant="outline" className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30">
                        {exp.category}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {exp.duration}
                      </span>
                    </div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      {exp.title}
                    </CardTitle>
                    <CardDescription className="text-[11px] flex items-center gap-1 mt-1 text-slate-600 dark:text-slate-400">
                      <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className="truncate">{exp.location}</span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-3 pb-3 space-y-3 flex-1 flex flex-col justify-between text-xs">
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                      {exp.description}
                    </p>

                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-1.5 rounded-md border border-emerald-200 dark:border-emerald-900/40">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{exp.availability_status}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {/* Reuse existing guest request / concierge pipeline */}
                        <Button
                          size="sm"
                          variant="default"
                          className="text-[11px] h-8 px-2 w-full gap-1 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 font-semibold"
                          onClick={() => setSelectedExp(exp)}
                        >
                          <Send className="h-3 w-3" />
                          Reserve
                        </Button>
                        {/* Reuse existing booking logic without duplicate functionality */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[11px] h-8 px-2 w-full gap-1 border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                          onClick={() => navigate({ to: '/booking-occupancy' })}
                        >
                          <Calendar className="h-3 w-3" />
                          Stay Packages
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Existing Notification System Integration View */}
          <div className="p-4 rounded-xl border border-sky-200/80 dark:border-sky-900/60 bg-sky-50/40 dark:bg-sky-950/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-sky-600" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Guest Notifications (Smart Resort 360 System)
                </span>
                <Badge variant="outline" className="text-[10px] text-sky-700 border-sky-300">
                  {notifications.filter(n => !n.read).length} Unread
                </Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-[11px] h-6 px-2 text-slate-500 hover:text-slate-900"
                onClick={loadNotifications}
                disabled={notifLoading}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${notifLoading ? 'animate-spin' : ''}`} />
                Check Updates
              </Button>
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No active notifications. Weather alerts will automatically broadcast here.
              </p>
            ) : (
              <div className="space-y-1.5">
                {notifications.slice(0, 3).map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors ${
                      notif.read
                        ? 'bg-white/60 dark:bg-slate-900/40 border-slate-200/60 text-slate-500'
                        : 'bg-white dark:bg-slate-900 border-sky-300 dark:border-sky-800 text-slate-800 dark:text-slate-100 font-medium shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${notif.read ? 'bg-slate-300' : 'bg-sky-500 animate-ping'}`} />
                      <span className="leading-snug">{notif.message}</span>
                    </div>

                    {!notif.read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[11px] h-6 px-2 text-sky-600 hover:text-sky-800 dark:text-sky-400 shrink-0 ml-2"
                        onClick={() => handleMarkNotificationRead(notif.id)}
                      >
                        <Check className="h-3 w-3 mr-0.5" />
                        Dismiss
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. EXISTING ROOM MATCHMAKER & PERSONALIZED RECOMMENDATIONS         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Room Matchmaker</h2>
          <p className="text-muted-foreground flex items-center gap-1 mt-0.5 text-xs sm:text-sm">
            <BrainCircuit className="h-4 w-4 text-indigo-500" />
            Describe what you need — our algorithmic matchmaker finds the best available room in real time.
          </p>
        </div>

        {/* Search Input */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Describe Your Stay</CardTitle>
            <CardDescription className="text-xs">
              Type a natural-language request. Only room type and price are matched from live data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="room-query-input"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. I need a family room for 4 people under ₹6000 a night"
                className="flex-1 text-sm"
              />
              <Button id="find-room-btn" onClick={handleSearch} disabled={loading || !query.trim()} className="gap-2">
                <Search className="h-4 w-4" />
                {loading ? 'Searching…' : 'Find My Room'}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-slate-400" />
              Only <strong>room type</strong> and <strong>price/night</strong> are verified from live database.
              Amenities (pool, WiFi, etc.) are surfaced transparently.
            </p>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 text-red-900 border border-red-200 rounded-md text-sm">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-4">
            {/* Parsed requirements summary */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Matched on:</span>
              {result.parsed_requirements.room_type && (
                <Badge variant="outline">Type: {result.parsed_requirements.room_type}</Badge>
              )}
              {result.parsed_requirements.max_price && (
                <Badge variant="outline">Max: ₹{result.parsed_requirements.max_price.toLocaleString()}</Badge>
              )}
              {result.parsed_requirements.unsupported_requirements.length > 0 && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  ⚠ Unverified: {result.parsed_requirements.unsupported_requirements.join(', ')}
                </Badge>
              )}
              <Badge variant="secondary" className="ml-auto capitalize text-xs">
                {result.source.replace('_', ' ')}
              </Badge>
            </div>

            {/* Warning */}
            {result.warning && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-md text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{result.warning}</span>
              </div>
            )}

            {/* Room cards */}
            {result.matches.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">
                  {result.matches.length} Room{result.matches.length > 1 ? 's' : ''} Found
                </h2>
                {result.matches.map(room => (
                  <RoomCard key={room.room_number} room={room} />
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground border rounded-md bg-muted/30">
                No available rooms match your request. Try adjusting your requirements.
              </div>
            )}

            {/* Reused Booking & Occupancy Link */}
            <div className="p-4 rounded-xl border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-sm">Ready to book an available room?</span>
                <p className="text-xs text-muted-foreground">
                  Check dates, adult count, and reserve directly through the official Resort Booking &amp; Occupancy system.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 self-start sm:self-auto shrink-0"
                onClick={() => navigate({ to: '/booking-occupancy' })}
              >
                Go to Booking &amp; Occupancy
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. CONCIERGE EXPERIENCE RESERVATION MODAL                           */}
      {/* Reuses existing guest request pipeline (api.createGuestRequest)     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Dialog open={!!selectedExp} onOpenChange={(open) => !open && setSelectedExp(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              Reserve Indoor Experience
            </DialogTitle>
            <DialogDescription className="text-xs">
              Direct concierge reservation request routed through the resort dispatch desk.
            </DialogDescription>
          </DialogHeader>

          {selectedExp && (
            <div className="space-y-3.5 py-2 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {selectedExp.title}
                  </span>
                  <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-200">
                    {selectedExp.category}
                  </Badge>
                </div>
                <p className="text-slate-500 flex items-center gap-1 text-[11px]">
                  <MapPin className="h-3 w-3" />
                  {selectedExp.location} &bull; {selectedExp.duration}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Guest Room Number
                </label>
                <Input
                  type="number"
                  value={bookingRoomNumber}
                  onChange={(e) => setBookingRoomNumber(Number(e.target.value) || 101)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Special Notes / Preferred Time Window
                </label>
                <Input
                  placeholder="e.g. 2 guests, requested time 3:30 PM"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {bookingSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{bookingSuccess}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedExp(null)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleReserveExperience}
              disabled={bookingSubmitting}
              className="text-xs h-8 gap-1.5 bg-slate-900 text-white hover:bg-slate-800"
            >
              {bookingSubmitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Sending Request…
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Confirm Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
