import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  api,
  type CurrentWeatherResponse,
  type DigitalTwinSimulationResponse,
  type GeospatialLocationImpact,
  type PublicSignalsResponse,
} from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CloudRain,
  Sun,
  Wind,
  Droplets,
  Utensils,
  Sparkles,
  Users,
  UserCheck,
  AlertTriangle,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Compass,
  Clock,
  Zap,
  Activity,
  Waves,
  CheckCircle2,
  XCircle,
  ChefHat,
  Coffee,
  BellRing,
  Copy,
  Check,
  Layers,
  Send,
  Megaphone,
  MapPin,
  Briefcase,
  Crosshair,
  Navigation,
  Locate,
  Building2,
  Radio,
  ShieldCheck,
} from 'lucide-react'

export const Route = createFileRoute('/_layout/digital-twin')({
  component: DigitalTwinPage,
})

function formatSignalTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMins = Math.max(1, Math.round((now.getTime() - date.getTime()) / 60000))
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.round(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return isoString
  }
}

function getSignalImpactTypeMeta(type: string) {
  switch (type.toLowerCase()) {
    case 'flooding':
      return {
        label: 'Flooding Alert',
        badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300',
        icon: Waves,
      }
    case 'travel_disruption':
      return {
        label: 'Travel Disruption',
        badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300',
        icon: Clock,
      }
    case 'road_conditions':
      return {
        label: 'Road Conditions',
        badgeClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-300',
        icon: Navigation,
      }
    case 'weather':
      return {
        label: 'Weather Alert',
        badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-300',
        icon: CloudRain,
      }
    case 'traveler_reports':
      return {
        label: 'Traveler Reports',
        badgeClass: 'bg-emerald-500/15 text-teal-700 dark:text-teal-300 border-teal-300',
        icon: Users,
      }
    default:
      return {
        label: type.replace('_', ' '),
        badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300',
        icon: Radio,
      }
  }
}

function AnimatedNumber({
  value,
  precision = 0,
  suffix = '',
}: {
  value: number
  precision?: number
  suffix?: string
}) {
  const [displayValue, setDisplayValue] = useState(value)
  const prevValueRef = useRef(value)

  useEffect(() => {
    const startValue = prevValueRef.current
    const endValue = value
    if (startValue === endValue) return

    const duration = 350
    const startTime = performance.now()

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1.0)
      const ease = -progress * (progress - 2)
      const current = startValue + (endValue - startValue) * ease
      setDisplayValue(current)

      if (progress < 1.0) {
        requestAnimationFrame(step)
      } else {
        setDisplayValue(endValue)
        prevValueRef.current = endValue
      }
    }

    requestAnimationFrame(step)
  }, [value])

  return (
    <span>
      {displayValue.toFixed(precision)}
      {suffix}
    </span>
  )
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

function getSeverityBg(severity: string) {
  const s = severity?.toUpperCase()
  switch (s) {
    case 'EXTREME':
      return 'border-rose-400 bg-rose-50/40 dark:bg-rose-950/20'
    case 'HIGH':
      return 'border-amber-400 bg-amber-50/40 dark:bg-amber-950/20'
    case 'MODERATE':
      return 'border-blue-400 bg-blue-50/40 dark:bg-blue-950/20'
    case 'LOW':
    default:
      return 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20'
  }
}

function getImpactStateBadge(state: string) {
  switch (state?.toUpperCase()) {
    case 'HIGH':
      return (
        <Badge className="bg-rose-500/15 text-rose-700 border-rose-300 font-bold text-xs tracking-wider">
          HIGH IMPACT
        </Badge>
      )
    case 'MODERATE':
      return (
        <Badge className="bg-amber-500/15 text-amber-800 border-amber-300 font-bold text-xs tracking-wider">
          MODERATE IMPACT
        </Badge>
      )
    case 'LOW':
    default:
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 font-bold text-xs tracking-wider">
          LOW IMPACT
        </Badge>
      )
  }
}

function getLocationIcon(category: string) {
  switch (category?.toLowerCase()) {
    case 'resort':
      return <Building2 className="h-4 w-4" />
    case 'pool':
      return <Waves className="h-4 w-4" />
    case 'restaurant':
      return <Utensils className="h-4 w-4" />
    case 'spa':
      return <Sparkles className="h-4 w-4" />
    case 'outdoor activity area':
    default:
      return <Compass className="h-4 w-4" />
  }
}

const DEFAULT_LOCATIONS: GeospatialLocationImpact[] = [
  {
    id: 'resort',
    name: 'Smart Resort 360 (Main Complex & Reception)',
    category: 'resort',
    latitude: 15.2993,
    longitude: 74.1240,
    impact_state: 'LOW',
    status_label: 'Standard Operations',
    weather_condition: 'Calm & Clear',
    operational_action: 'Standard reception operations',
    demand_or_capacity_pct: 75.0,
  },
  {
    id: 'pool',
    name: 'Central Infinity Pool & Sun Deck',
    category: 'pool',
    latitude: 15.2985,
    longitude: 74.1235,
    impact_state: 'LOW',
    status_label: 'Open for Swimming',
    weather_condition: 'Optimal conditions, water 28°C',
    operational_action: 'Standard poolside service',
    demand_or_capacity_pct: 85.0,
  },
  {
    id: 'restaurant',
    name: 'The Spice Pavilion & Dining Terrace',
    category: 'restaurant',
    latitude: 15.2998,
    longitude: 74.1246,
    impact_state: 'LOW',
    status_label: 'Standard Dining Pace',
    weather_condition: 'Terrace open for al fresco dining',
    operational_action: 'Standard table rotation',
    demand_or_capacity_pct: 55.0,
  },
  {
    id: 'spa',
    name: 'Celestial Ayurvedic Spa & Wellness Wing',
    category: 'spa',
    latitude: 15.3002,
    longitude: 74.1232,
    impact_state: 'LOW',
    status_label: 'Standard Walk-In Pace',
    weather_condition: 'Baseline wellness schedule',
    operational_action: 'Standard spa reservations',
    demand_or_capacity_pct: 35.0,
  },
  {
    id: 'outdoor_activity_area',
    name: 'South Beachfront & Outdoor Sports Lawn',
    category: 'outdoor activity area',
    latitude: 15.2978,
    longitude: 74.1228,
    impact_state: 'LOW',
    status_label: 'All Activities Operational',
    weather_condition: 'Sunny & calm lawn',
    operational_action: 'Standard tournament & coaching schedule',
    demand_or_capacity_pct: 90.0,
  },
]

function getMapCoordinatesPercent(lat: number, lon: number) {
  const minLat = 15.2970
  const maxLat = 15.3010
  const minLon = 74.1220
  const maxLon = 74.1255

  const left = Math.max(10, Math.min(88, ((lon - minLon) / (maxLon - minLon)) * 100))
  const top = Math.max(12, Math.min(88, ((maxLat - lat) / (maxLat - minLat)) * 100))

  return { left: `${left}%`, top: `${top}%` }
}

const DEFAULT_WEATHER: CurrentWeatherResponse = {
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
}

function buildDeterministicSimulation(
  rain: number,
  temp: number,
  duration: number,
  wind: number = 13.3,
  humidity: number = 64.0
): DigitalTwinSimulationResponse {
  const safeRain = isNaN(rain) ? 0.0 : Math.max(0, rain)
  const safeTemp = isNaN(temp) ? 25.0 : temp
  const safeDur = isNaN(duration) ? 3.0 : Math.max(0.1, duration)
  const safeWind = isNaN(wind) ? 12.0 : Math.max(0, wind)
  const safeHum = isNaN(humidity) ? 65.0 : Math.min(100, Math.max(0, humidity))

  const isExtreme = safeRain >= 35.0 || safeWind >= 60.0
  const isHeavy = safeRain >= 15.0 || safeWind >= 40.0
  const isModerate = safeRain >= 3.0 || safeWind >= 25.0
  const severity = isExtreme ? 'EXTREME' : isHeavy ? 'HIGH' : isModerate ? 'MODERATE' : 'LOW'

  const rainPen = Math.min(78, safeRain * 2.3)
  const tempPen = safeTemp >= 38 ? (safeTemp - 38) * 3 : safeTemp <= 12 ? (12 - safeTemp) * 2 : 0
  const outdoor = Math.max(5.0, Number((85.0 - rainPen - tempPen).toFixed(1)))
  const dining = Math.min(98.0, Number((55.0 + Math.min(36, safeRain * 1.5) + Math.min(10, safeDur * 1.4)).toFixed(1)))
  const spa = Math.min(95.0, Number((35.0 + Math.min(48, safeRain * 1.9) + Math.min(12, safeDur * 1.8)).toFixed(1)))
  const requests = Math.max(3, Math.round(4 + (safeRain * 0.7) + (safeDur * 1.2)))
  const extraStaff = isExtreme ? 6 : isHeavy ? 4 : isModerate ? 2 : 0

  const geoLocations: GeospatialLocationImpact[] = [
    {
      id: 'resort',
      name: 'Smart Resort 360 (Main Complex & Reception)',
      category: 'resort',
      latitude: 15.2993,
      longitude: 74.1240,
      impact_state: isHeavy ? 'MODERATE' : 'LOW',
      status_label: isHeavy ? 'Heavy Weather Protocol Active' : 'Standard Operations',
      weather_condition: isHeavy ? `${safeRain.toFixed(1)}mm rain, concierge triage active` : 'Calm & Clear',
      operational_action: isHeavy ? 'Deploy umbrella stands & lobby slip mats' : 'Standard reception operations',
      demand_or_capacity_pct: Number((75.0 + (isHeavy ? 15 : 0)).toFixed(1)),
    },
    {
      id: 'pool',
      name: 'Central Infinity Pool & Sun Deck',
      category: 'pool',
      latitude: 15.2985,
      longitude: 74.1235,
      impact_state: isHeavy ? 'HIGH' : isModerate ? 'MODERATE' : 'LOW',
      status_label: isHeavy ? 'Deck Suspended (Slip Hazard)' : isModerate ? 'Precautionary Cover' : 'Open for Swimming',
      weather_condition: isHeavy ? 'Active rain / thunder safety' : isModerate ? 'Light precipitation' : 'Optimal conditions, water 28°C',
      operational_action: isHeavy ? 'Close cabanas and secure poolside furnishings' : isModerate ? 'Monitor pool drainage' : 'Standard poolside service',
      demand_or_capacity_pct: isHeavy ? 0.0 : isModerate ? 35.0 : 85.0,
    },
    {
      id: 'restaurant',
      name: 'The Spice Pavilion & Dining Terrace',
      category: 'restaurant',
      latitude: 15.2998,
      longitude: 74.1246,
      impact_state: isHeavy ? 'HIGH' : isModerate ? 'MODERATE' : 'LOW',
      status_label: isHeavy ? 'Surge Load / Indoor Full' : isModerate ? 'Terrace Covered' : 'Standard Dining Pace',
      weather_condition: isHeavy ? 'Terrace closed, indoor surge' : isModerate ? 'Patio partially shielded' : 'Terrace open for al fresco dining',
      operational_action: isHeavy ? 'Activate buffet backup & assign 2 extra food runners' : isModerate ? 'Shield exterior tables' : 'Standard table rotation',
      demand_or_capacity_pct: dining,
    },
    {
      id: 'spa',
      name: 'Celestial Ayurvedic Spa & Wellness Wing',
      category: 'spa',
      latitude: 15.3002,
      longitude: 74.1232,
      impact_state: isHeavy ? 'HIGH' : isModerate ? 'MODERATE' : 'LOW',
      status_label: isHeavy ? 'High Walk-In Surge' : isModerate ? 'Increased Bookings' : 'Standard Walk-In Pace',
      weather_condition: isHeavy ? 'Indoor wellness substitution' : isModerate ? 'Showers encourage indoor relaxation' : 'Baseline wellness schedule',
      operational_action: isHeavy ? 'Open thermal suites for walk-in waiting guests' : isModerate ? 'Notify on-call therapists' : 'Standard spa reservations',
      demand_or_capacity_pct: spa,
    },
    {
      id: 'outdoor_activity_area',
      name: 'South Beachfront & Outdoor Sports Lawn',
      category: 'outdoor activity area',
      latitude: 15.2978,
      longitude: 74.1228,
      impact_state: isHeavy ? 'HIGH' : isModerate ? 'MODERATE' : 'LOW',
      status_label: isHeavy ? 'All Outdoor Activities Suspended' : isModerate ? 'Lawn Wet Warning' : 'All Activities Operational',
      weather_condition: isHeavy ? `${safeRain.toFixed(1)}mm rain & choppy sea` : isModerate ? 'Damp turf' : 'Sunny & calm lawn',
      operational_action: isHeavy ? 'Relocate guests to covered sports pavilion' : isModerate ? 'Monitor court traction' : 'Standard tournament & coaching schedule',
      demand_or_capacity_pct: outdoor,
    },
  ]

  return {
    outdoor_activity_demand: outdoor,
    dining_demand: dining,
    spa_demand: spa,
    guest_request_volume: requests,
    additional_staff_requirement: extraStaff,
    impact_severity: severity,
    occupancy: 75.0,
    explanation: {
      occupancy: 'Resort operating at 75.0% baseline occupancy; estimated 27 on-property guests.',
      outdoor_activity_demand: isHeavy
        ? `Outdoor recreation suppressed to ${outdoor}% due to ${safeRain.toFixed(1)}mm rainfall over ${safeDur.toFixed(1)}h.`
        : `Optimal conditions support full outdoor recreation at ${outdoor}%.`,
      dining_demand: isHeavy
        ? `Dining surge to ${dining}% as guests retreat indoors for meal service and hot refreshments.`
        : `Normal dining pacing at ${dining}%.`,
      spa_demand: isHeavy
        ? `Spa & hydrotherapy demand elevated to ${spa}% as indoor alternative activity.`
        : `Standard wellness bookings at ${spa}%.`,
      guest_request_volume: `Projected ${requests} service requests covering umbrellas, towels, and in-room dining.`,
      additional_staff_requirement: extraStaff > 0
        ? `+${extraStaff} additional staff recommended to handle dining runners and facility drainage.`
        : 'Current on-duty staff roster is fully optimal.',
      impact_severity: `${severity}: ${isHeavy ? `High precipitation (${safeRain.toFixed(1)}mm) and sustained duration (${safeDur.toFixed(1)}h)` : 'Weather within normal operational tolerances'}.`,
    },
    simulation_metadata: {
      model: 'DigitalTwin-SmartResort360-v1',
      rainfall: safeRain,
      temperature: safeTemp,
      duration_hours: safeDur,
      wind: safeWind,
      humidity: safeHum,
    },
    integrations: {
      is_heavy_weather: isHeavy,
      weather_severity: severity,
      activities: {
        affected_outdoor_activities: isHeavy ? [
          { name: 'Sunset Beach Volleyball & Lawn Games', venue: 'South Beachfront', status: 'Suspended', reason: `${safeRain.toFixed(1)}mm rainfall waterlogged sand`, impact_level: 'High' },
          { name: 'Infinity Pool & Open-Air Cabanas', venue: 'Central Pool Deck', status: 'Suspended', reason: 'Precipitation hazard & wet deck', impact_level: 'High' },
          { name: 'Coastal Kayaking & Snorkeling', venue: 'Resort Marina', status: 'Suspended', reason: 'Choppy surf and low visibility', impact_level: 'High' },
        ] : [
          { name: 'All Outdoor Facilities & Pools', venue: 'Beach & Pools', status: 'Operational', reason: 'Optimal conditions', impact_level: 'Low' }
        ],
        suggested_indoor_alternatives: [
          { name: 'Covered Heated Hydrotherapy Pool', venue: 'Wellness Wing', suitable_for: 'All Resident Guests', status: 'Open Walk-In', highlights: 'Heated vitality pool at 34°C with hydro-massage jets' },
          { name: 'Indoor Squash & Badminton Arena', venue: 'Sports Pavilion', suitable_for: 'Active Guests', status: 'Open', highlights: 'Air-conditioned hardwood courts' },
          { name: 'Celestial Cinema Screening Lounge', venue: 'Clubhouse Suite B', suitable_for: 'Families & Kids', status: 'Continuous Screening', highlights: 'Curated movies & fresh popcorn' },
        ],
        summary: isHeavy ? `3 outdoor activities suspended due to ${safeRain.toFixed(1)}mm rain. 3 indoor climate-controlled alternatives activated.` : 'All outdoor and indoor resort amenities operating on standard schedules.',
      },
      dining: {
        baseline_demand_pct: 55.0,
        simulated_demand_pct: dining,
        predicted_increase_pct: Number((dining - 55.0).toFixed(1)),
        in_room_dining_surge: isHeavy,
        estimated_covers: Math.round(dining * 1.2),
        impacted_venues: isHeavy ? ['The Spice Pavilion Terrace (Closed)', 'In-Room Dining (High Surge)', 'The Palm Lounge (Peak Load)'] : ['The Spice Pavilion (Normal)'],
        operational_recommendation: isHeavy ? 'Pre-prep in-room dining carts and stage extra hot beverage warmers.' : 'Standard restaurant service rotation.',
      },
      staffing: {
        total_current_available: 8,
        total_additional_required: extraStaff,
        departments: [
          { department: 'F&B Service', current_available: 3, additional_required: isHeavy ? 2 : 0, primary_task: 'In-room delivery & covered dining support' },
          { department: 'Housekeeping', current_available: 3, additional_required: isHeavy ? 1 : 0, primary_task: 'Umbrella distribution & towel refresh' },
          { department: 'Maintenance & Engineering', current_available: 2, additional_required: isHeavy ? 1 : 0, primary_task: 'Balcony drainage & mat placement' },
        ],
        recommendation: extraStaff > 0 ? `Call in ${extraStaff} on-standby staff members for ${safeDur.toFixed(1)}h storm coverage.` : 'Current staffing levels are optimal.',
      },
      guest_experience: {
        experiences: [
          { title: 'Ayurvedic Abhyanga Herbal Massage', category: 'Spa & Wellness', location: 'Wellness Wing Level 2', availability_status: 'Available', duration: '60 mins', description: 'Warm herbal oil full-body therapy designed to balance and restore vitality during cool rainy weather.' },
          { title: 'Goan Spice Culinary Masterclass', category: 'Culinary Experience', location: 'Chef Heritage Kitchen', availability_status: 'Available', duration: '90 mins', description: 'Hands-on interactive cooking session with Executive Chef learning authentic Goan seafood curries.' },
          { title: 'Artisanal Tea & Single-Origin Coffee Tasting', category: 'Culinary Experience', location: 'The Spice Pavilion Lounge', availability_status: 'Available', duration: '45 mins', description: 'Guided pairing of rare Indian monsoon teas, artisanal chocolates, and vintage Goan port wines.' },
        ],
        curation_rationale: isHeavy ? 'Curated cozy indoor culinary and wellness activities during rain.' : 'Complete wellness and culinary experiences available.',
      },
      notification: {
        title: isHeavy ? 'Inclement Weather Alert: Indoor Activities Active' : 'Resort Weather Advisory',
        target_audience: 'All In-House Guests',
        channel: 'Guest Portal In-App Notification & SMS',
        preview_message: isHeavy ? `Dear Guest, showers are projected for the next ${safeDur.toFixed(1)} hours. The indoor hydrotherapy pool, cinema lounge, and chef masterclass are now open for your comfort.` : 'Optimal sunny weather across the resort. All beach and pool facilities are open.',
        urgency: isHeavy ? 'Advisory' : 'Informational',
        dispatch_advice: 'Broadcast via guest portal push notification.',
        is_simulation_only: true,
      },
      geospatial_locations: geoLocations,
    },
  }
}

function DigitalTwinPage() {
  // Live weather and resort baseline — initialized with fallback immediately so never blank
  const [currentWeather, setCurrentWeather] = useState<CurrentWeatherResponse>(DEFAULT_WEATHER)
  const [weatherLoading, setWeatherLoading] = useState(false)

  // Simulation controls state
  const [rainfall, setRainfall] = useState<number>(12.0)
  const [temperature, setTemperature] = useState<number>(25.0)
  const [durationHours, setDurationHours] = useState<number>(3.0)

  // Baseline state vs. Simulated state — initialized immediately so page never renders empty cards
  const [baselineState, setBaselineState] = useState<DigitalTwinSimulationResponse>(() =>
    buildDeterministicSimulation(0.0, 30.1, 2.0, 13.3, 64.0)
  )
  const [simulatedState, setSimulatedState] = useState<DigitalTwinSimulationResponse>(() =>
    buildDeterministicSimulation(12.0, 25.0, 3.0, 13.3, 64.0)
  )
  const [simulating, setSimulating] = useState(false)
  const [copiedNotif, setCopiedNotif] = useState(false)

  // Real-World Public Signals state
  const [publicSignals, setPublicSignals] = useState<PublicSignalsResponse | null>(null)
  const [signalTypeFilter, setSignalTypeFilter] = useState<string>('all')

  // Sync public signals from simulation response
  useEffect(() => {
    if (simulatedState?.public_signals) {
      setPublicSignals(simulatedState.public_signals)
    }
  }, [simulatedState])

  // Geospatial Map state
  const [selectedLocationId, setSelectedLocationId] = useState<string>('pool')
  const [mapMode, setMapMode] = useState<'simulated' | 'baseline'>('simulated')

  const handleCopyNotif = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedNotif(true)
    setTimeout(() => setCopiedNotif(false), 2200)
  }

  // Stable ref to currentWeather
  const currentWeatherRef = useRef<CurrentWeatherResponse>(DEFAULT_WEATHER)
  useEffect(() => {
    currentWeatherRef.current = currentWeather
  }, [currentWeather])

  // Fetch current live weather and initial public signals on mount
  useEffect(() => {
    api.getPublicSignals().then(setPublicSignals).catch(console.error)

    api.getCurrentWeather()
      .then((weather) => {
        if (weather) {
          setCurrentWeather(weather)
          // Run baseline simulation with current weather telemetry
          api.simulateDigitalTwin({
            rainfall: weather.rainfall || 0.0,
            temperature: weather.temperature || 25.0,
            duration_hours: 2.0,
            humidity: weather.humidity,
            wind: weather.wind_speed,
          })
            .then(setBaselineState)
            .catch(() => {
              setBaselineState(
                buildDeterministicSimulation(
                  weather.rainfall || 0.0,
                  weather.temperature || 25.0,
                  2.0,
                  weather.wind_speed,
                  weather.humidity
                )
              )
            })
        }
      })
      .catch((err) => {
        console.warn('Weather fetch fallback active:', err)
      })
      .finally(() => setWeatherLoading(false))
  }, [])

  // Dynamic simulation execution:
  // 1. Instantly computes deterministic simulation for zero-latency reactive UI
  // 2. Debounces backend API sync to reconcile with server DB & ML models
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerSimulation = useCallback(
    (simRain: number, simTemp: number, simDuration: number) => {
      const liveWeather = currentWeatherRef.current
      const windSpeed = liveWeather?.wind_speed ?? 13.3
      const humidityVal = liveWeather?.humidity ?? 64.0

      // INSTANT client-side reactive state update — guaranteed instant UI response
      const instantRes = buildDeterministicSimulation(simRain, simTemp, simDuration, windSpeed, humidityVal)
      setSimulatedState(instantRes)

      setSimulating(true)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(() => {
        api.simulateDigitalTwin({
          rainfall: simRain,
          temperature: simTemp,
          duration_hours: simDuration,
          wind: windSpeed,
          humidity: humidityVal,
        })
          .then((res) => {
            if (res) setSimulatedState(res)
          })
          .catch((err) => {
            console.warn('Server simulation sync notice:', err)
          })
          .finally(() => setSimulating(false))
      }, 150)
    },
    []
  )

  // Run simulation whenever slider controls change
  useEffect(() => {
    triggerSimulation(rainfall, temperature, durationHours)
  }, [rainfall, temperature, durationHours, triggerSimulation])

  // Preset scenarios
  const applyPreset = (rainVal: number, durationVal: number, tempVal?: number) => {
    setRainfall(rainVal)
    setDurationHours(durationVal)
    const newTemp = tempVal !== undefined ? tempVal : temperature
    if (tempVal !== undefined) setTemperature(tempVal)
    triggerSimulation(rainVal, newTemp, durationVal)
  }

  // Delta calculation helpers
  const calcDelta = (simVal: number, baseVal: number) => simVal - baseVal

  return (
    <div className="p-4 md:p-8 space-y-6 bg-muted/20 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 border border-sky-500/20">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Weather Digital Twin</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Real-time What-If operational simulation &amp; resort demand forecasting
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {simulating && (
            <Badge variant="outline" className="animate-pulse bg-sky-50 text-sky-700 border-sky-200 flex items-center gap-1.5">
              <RefreshCw className="h-3 w-3 animate-spin" /> Simulating…
            </Badge>
          )}
          <Badge className="bg-slate-900 text-slate-100 hover:bg-slate-800 text-xs py-1 px-2.5">
            Engine: v1.0 Deterministic
          </Badge>
        </div>
      </div>


      {/* Top Row: Current Weather & What-If Controls */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* 1. Current Live Weather Card */}
        <Card className="md:col-span-4 border-sky-200/80 shadow-xs flex flex-col justify-between overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-sky-50/70 to-indigo-50/40 border-b border-sky-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Live Resort Weather
                </CardTitle>
                {currentWeather && getSeverityBadge(currentWeather.severity)}
              </div>
              <Compass className="h-4 w-4 text-sky-500" />
            </div>
            <CardDescription className="text-xs text-slate-500">
              {currentWeather?.location || 'Smart Resort 360, South Goa'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {weatherLoading ? (
              <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">
                Fetching live telemetry…
              </div>
            ) : currentWeather ? (
              <>
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-3xl font-extrabold tracking-tight text-slate-900">
                      {currentWeather.temperature}°C
                    </div>
                    <div className="text-xs font-semibold text-slate-600 capitalize mt-0.5">
                      {currentWeather.condition}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold uppercase text-slate-400">Current Rainfall</span>
                    <div className="text-xl font-bold text-sky-600">
                      {currentWeather.rainfall} <span className="text-xs font-medium">mm</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1 font-medium">
                      <Wind className="h-3.5 w-3.5 text-teal-500" /> Wind
                    </span>
                    <span className="font-bold text-slate-800">{currentWeather.wind_speed} km/h</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1 font-medium">
                      <Droplets className="h-3.5 w-3.5 text-blue-500" /> Humidity
                    </span>
                    <span className="font-bold text-slate-800">{currentWeather.humidity}%</span>
                  </div>
                </div>

                <div className="pt-1 text-xs text-slate-500 flex items-center justify-between">
                  <span>Occupancy Baseline:</span>
                  <span className="font-semibold text-slate-700">
                    {baselineState?.occupancy ?? 75.0}% active
                  </span>
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground py-4 text-center">
                Telemetry temporarily offline
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Interactive What-If Scenario Controls Card */}
        <Card className="md:col-span-8 shadow-xs border-indigo-200/80 bg-card">
          <CardHeader className="pb-3 border-b bg-gradient-to-r from-indigo-50/40 to-sky-50/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold text-slate-800">
                  What-If Simulation Controls
                </CardTitle>
                <CardDescription className="text-xs">
                  Adjust rainfall intensity and storm duration to simulate operational impact in real-time
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant={rainfall === 0 ? 'default' : 'outline'}
                  onClick={() => applyPreset(0.0, 2.0)}
                  className="text-xs h-7 px-2.5"
                >
                  <Sun className="h-3 w-3 mr-1 text-amber-500" /> Clear (0mm)
                </Button>
                <Button
                  size="sm"
                  variant={rainfall === 3.5 ? 'default' : 'outline'}
                  onClick={() => applyPreset(3.5, 3.0)}
                  className="text-xs h-7 px-2.5"
                >
                  <CloudRain className="h-3 w-3 mr-1 text-sky-500" /> Light (3.5mm)
                </Button>
                <Button
                  size="sm"
                  variant={rainfall === 12.0 ? 'default' : 'outline'}
                  onClick={() => applyPreset(12.0, 4.0)}
                  className="text-xs h-7 px-2.5"
                >
                  <CloudRain className="h-3 w-3 mr-1 text-blue-500" /> Mod (12mm)
                </Button>
                <Button
                  size="sm"
                  variant={rainfall === 26.0 ? 'default' : 'outline'}
                  onClick={() => applyPreset(26.0, 5.0)}
                  className="text-xs h-7 px-2.5"
                >
                  <Zap className="h-3 w-3 mr-1 text-rose-500" /> Heavy (26mm)
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-5 space-y-6">
            {/* Slider 1: Rainfall Intensity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <CloudRain className="h-4 w-4 text-sky-600" />
                  Rainfall Intensity:
                </span>
                <span className="font-extrabold text-base text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-lg border border-sky-200">
                  {rainfall.toFixed(1)} mm
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="0.5"
                value={rainfall}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  const safeVal = isNaN(val) ? 0 : val
                  setRainfall(safeVal)
                  triggerSimulation(safeVal, temperature, durationHours)
                }}
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600 transition-all duration-150"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-medium px-0.5">
                <span>0 mm (Clear)</span>
                <span>5 mm (Moderate)</span>
                <span>15 mm (Heavy)</span>
                <span>35 mm (Torrential)</span>
                <span>50 mm (Extreme)</span>
              </div>
            </div>

            {/* Slider 2: Event Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-indigo-500" />
                    Storm Duration:
                  </span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-xs">
                    {durationHours.toFixed(1)} hrs
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="12"
                  step="0.5"
                  value={durationHours}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    const safeVal = isNaN(val) ? 1.0 : val
                    setDurationHours(safeVal)
                    triggerSimulation(rainfall, temperature, safeVal)
                  }}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0.5h (Flash)</span>
                  <span>4h (Afternoon)</span>
                  <span>12h (Prolonged)</span>
                </div>
              </div>

              {/* Slider 3: Ambient Temperature */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Sun className="h-4 w-4 text-amber-500" />
                    Ambient Temperature:
                  </span>
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs">
                    {temperature.toFixed(1)}°C
                  </span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="45"
                  step="0.5"
                  value={temperature}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    const safeVal = isNaN(val) ? 25.0 : val
                    setTemperature(safeVal)
                    triggerSimulation(rainfall, safeVal, durationHours)
                  }}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>15°C (Chilly)</span>
                  <span>28°C (Optimal)</span>
                  <span>45°C (Heatwave)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Before/After Impact Comparison Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Operational Impact Comparison
            </h2>
            <p className="text-xs text-muted-foreground">
              Direct comparison between Current State and Simulated State under {rainfall.toFixed(1)} mm rainfall
            </p>
          </div>
          {simulatedState && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Projected Impact Severity:</span>
              {getSeverityBadge(simulatedState.impact_severity)}
            </div>
          )}
        </div>

        {/* 5 Core Metrics Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Metric 1: Outdoor Activity Demand */}
          {(() => {
            const current = baselineState?.outdoor_activity_demand ?? 85.0
            const simulated = simulatedState?.outdoor_activity_demand ?? 85.0
            const delta = calcDelta(simulated, current)
            return (
              <Card className="shadow-xs border transition-all duration-300 hover:shadow-md">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Outdoor Activity
                  </CardTitle>
                  <Waves className="h-4 w-4 text-sky-500" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-2xl font-black tracking-tight text-slate-900">
                        <AnimatedNumber value={simulated} precision={1} suffix="%" />
                      </div>
                      <div className="text-[11px] text-slate-400">Simulated Demand</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-bold flex items-center justify-end ${delta < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {delta < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : delta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <Minus className="h-3 w-3" />}
                        {Math.abs(delta).toFixed(1)}%
                      </div>
                      <div className="text-[11px] text-slate-400">vs Current ({current.toFixed(1)}%)</div>
                    </div>
                  </div>
                  {/* Visual Bar Comparison */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-sky-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, simulated))}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2">
                      Beach, pool &amp; water sports participation
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })()}

          {/* Metric 2: Indoor Dining Demand */}
          {(() => {
            const current = baselineState?.dining_demand ?? 55.0
            const simulated = simulatedState?.dining_demand ?? 55.0
            const delta = calcDelta(simulated, current)
            return (
              <Card className="shadow-xs border transition-all duration-300 hover:shadow-md">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Indoor Dining
                  </CardTitle>
                  <Utensils className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-2xl font-black tracking-tight text-slate-900">
                        <AnimatedNumber value={simulated} precision={1} suffix="%" />
                      </div>
                      <div className="text-[11px] text-slate-400">Simulated Demand</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-bold flex items-center justify-end ${delta > 0 ? 'text-amber-600' : delta < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {delta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : delta < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3 w-3" />}
                        {delta > 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
                      </div>
                      <div className="text-[11px] text-slate-400">vs Current ({current.toFixed(1)}%)</div>
                    </div>
                  </div>
                  {/* Visual Bar Comparison */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, simulated))}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2">
                      Main restaurant &amp; in-room dining surge
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })()}

          {/* Metric 3: Spa Demand */}
          {(() => {
            const current = baselineState?.spa_demand ?? 35.0
            const simulated = simulatedState?.spa_demand ?? 35.0
            const delta = calcDelta(simulated, current)
            return (
              <Card className="shadow-xs border transition-all duration-300 hover:shadow-md">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Spa Demand
                  </CardTitle>
                  <Sparkles className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-2xl font-black tracking-tight text-slate-900">
                        <AnimatedNumber value={simulated} precision={1} suffix="%" />
                      </div>
                      <div className="text-[11px] text-slate-400">Simulated Demand</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-bold flex items-center justify-end ${delta > 0 ? 'text-purple-600' : 'text-slate-500'}`}>
                        {delta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <Minus className="h-3 w-3" />}
                        {delta > 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
                      </div>
                      <div className="text-[11px] text-slate-400">vs Current ({current.toFixed(1)}%)</div>
                    </div>
                  </div>
                  {/* Visual Bar Comparison */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, simulated))}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2">
                      Indoor wellness &amp; therapy substitution
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })()}

          {/* Metric 4: Guest Request Volume */}
          {(() => {
            const current = baselineState?.guest_request_volume ?? 4
            const simulated = simulatedState?.guest_request_volume ?? 4
            const delta = calcDelta(simulated, current)
            return (
              <Card className="shadow-xs border transition-all duration-300 hover:shadow-md">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Guest Requests
                  </CardTitle>
                  <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-2xl font-black tracking-tight text-slate-900">
                        <AnimatedNumber value={simulated} precision={0} />
                      </div>
                      <div className="text-[11px] text-slate-400">Total Calls/Requests</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-bold flex items-center justify-end ${delta > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                        {delta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <Minus className="h-3 w-3" />}
                        {delta > 0 ? `+${delta}` : `${delta}`}
                      </div>
                      <div className="text-[11px] text-slate-400">vs Current ({current})</div>
                    </div>
                  </div>
                  {/* Visual Bar Comparison */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(5, (simulated / 30) * 100))}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2">
                      Umbrellas, towels, maintenance &amp; room calls
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })()}

          {/* Metric 5: Additional Staff Requirement */}
          {(() => {
            const current = baselineState?.additional_staff_requirement ?? 0
            const simulated = simulatedState?.additional_staff_requirement ?? 0
            const delta = calcDelta(simulated, current)
            return (
              <Card className="shadow-xs border transition-all duration-300 hover:shadow-md bg-gradient-to-b from-card to-slate-50/50">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Extra Staff Needed
                  </CardTitle>
                  <UserCheck className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className={`text-2xl font-black tracking-tight ${simulated > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        <AnimatedNumber value={simulated} precision={0} suffix=" staff" />
                      </div>
                      <div className="text-[11px] text-slate-400">Above Current Roster</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-bold flex items-center justify-end ${delta > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {delta > 0 ? `+${delta}` : 'Optimal'}
                      </div>
                      <div className="text-[11px] text-slate-400">vs Current ({current})</div>
                    </div>
                  </div>
                  {/* Visual Bar Comparison */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${simulated >= 4 ? 'bg-rose-500' : simulated >= 2 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, Math.max(0, (simulated / 6) * 100))}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2">
                      F&amp;B runners &amp; maintenance staff
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })()}
        </div>
      </div>

      {/* 4. Mandatory Geospatial Map Visualization */}
      {(() => {
        const activeLocations =
          mapMode === 'simulated'
            ? simulatedState?.integrations?.geospatial_locations || DEFAULT_LOCATIONS
            : baselineState?.integrations?.geospatial_locations || DEFAULT_LOCATIONS

        const selectedLoc =
          activeLocations.find((loc) => loc.id === selectedLocationId) ||
          activeLocations[0]

        const lowCount = activeLocations.filter((l) => l.impact_state === 'LOW').length
        const modCount = activeLocations.filter((l) => l.impact_state === 'MODERATE').length
        const highCount = activeLocations.filter((l) => l.impact_state === 'HIGH').length

        return (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-300 font-semibold text-xs tracking-wider">
                    GEOSPATIAL MAP VISUALIZATION
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                    <Locate className="h-3 w-3 text-sky-600" />
                    15.2993° N, 74.1240° E (South Goa Campus)
                  </span>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
                  Resort Campus Weather Impact Map
                </h3>
                <p className="text-xs text-muted-foreground">
                  Interactive spatial telemetry tracking weather impact states across the 5 core resort zones.
                </p>
              </div>

              {/* Map Mode Selector & Impact Summary Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border text-xs">
                  <button
                    type="button"
                    onClick={() => setMapMode('simulated')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      mapMode === 'simulated'
                        ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Simulated Impact ({rainfall}mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapMode('baseline')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      mapMode === 'baseline'
                        ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Current Baseline
                  </button>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-semibold">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 border border-emerald-300">
                    {lowCount} LOW
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 border border-amber-300">
                    {modCount} MOD
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-700 border border-rose-300">
                    {highCount} HIGH
                  </span>
                </div>
              </div>
            </div>

            {/* Main Map Layout: 2 Columns (7 cols Map Canvas, 5 cols Selected Zone Detail) */}
            <div className="grid gap-4 lg:grid-cols-12">
              {/* Map Canvas */}
              <Card className="lg:col-span-7 overflow-hidden border-slate-200 dark:border-slate-800 shadow-xs bg-slate-950 text-white relative">
                <div className="p-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Crosshair className="h-4 w-4 text-sky-400" />
                    <span className="font-semibold text-slate-200">Resort Geospatial Grid</span>
                    <span className="text-[11px] text-slate-400">Scale: 1:2500 (Campus)</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                    <span>Active Markers: 5/5</span>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                </div>

                {/* Interactive SVG / Styled GIS Surface */}
                <div className="relative w-full aspect-[16/11] bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 overflow-hidden select-none">
                  {/* Subtle Grid Lines & Geographic Lat/Lon Graticule */}
                  <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-400" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid-pattern)" />
                    {/* Arabian Sea Coastline path */}
                    <path
                      d="M 0,220 Q 80,180 120,260 T 160,420 L 0,420 Z"
                      fill="#0284c7"
                      fillOpacity="0.25"
                    />
                    {/* Tropical Resort Gardens & Footpaths */}
                    <path
                      d="M 120,260 Q 240,240 340,220 T 560,180"
                      fill="none"
                      stroke="#059669"
                      strokeWidth="3"
                      strokeDasharray="4 4"
                      strokeOpacity="0.4"
                    />
                    <path
                      d="M 220,120 Q 300,180 340,300 T 400,420"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      strokeDasharray="3 3"
                      strokeOpacity="0.3"
                    />
                  </svg>

                  {/* Coastline / Sea Water Label */}
                  <div className="absolute bottom-4 left-4 text-[10px] uppercase tracking-widest text-sky-400/60 font-mono pointer-events-none flex items-center gap-1">
                    <Waves className="h-3 w-3" /> Arabian Sea Shoreline
                  </div>

                  {/* Lat/Lon Corner Coordinate Stamps */}
                  <div className="absolute top-2 left-2 text-[9px] font-mono text-slate-500 pointer-events-none">
                    15.3010°N, 74.1220°E
                  </div>
                  <div className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-500 pointer-events-none">
                    15.2970°N, 74.1255°E
                  </div>

                  {/* Simulated Rain/Precipitation Visual Overlay on Map */}
                  {rainfall > 0 && (
                    <div
                      className="absolute inset-0 pointer-events-none opacity-25"
                      style={{
                        backgroundImage: `repeating-linear-gradient(105deg, transparent, transparent 5px, rgba(56, 189, 248, 0.4) 5px, rgba(56, 189, 248, 0.4) 7px)`,
                        backgroundSize: '20px 40px',
                      }}
                    />
                  )}

                  {/* The 5 Location Markers */}
                  {activeLocations.map((loc) => {
                    const pos = getMapCoordinatesPercent(loc.latitude, loc.longitude)
                    const isSelected = loc.id === selectedLoc.id
                    const isHigh = loc.impact_state === 'HIGH'
                    const isMod = loc.impact_state === 'MODERATE'

                    const stateColor = isHigh
                      ? 'bg-rose-500 text-white border-rose-300 ring-rose-400'
                      : isMod
                      ? 'bg-amber-500 text-white border-amber-300 ring-amber-400'
                      : 'bg-emerald-500 text-white border-emerald-300 ring-emerald-400'

                    const radarColor = isHigh
                      ? 'bg-rose-500/40'
                      : isMod
                      ? 'bg-amber-500/30'
                      : 'bg-emerald-500/20'

                    return (
                      <div
                        key={loc.id}
                        onClick={() => setSelectedLocationId(loc.id)}
                        style={{ left: pos.left, top: pos.top }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 group z-20"
                      >
                        {/* Radar Pulse Ring */}
                        {(isHigh || isMod || isSelected) && (
                          <div
                            className={`absolute inset-0 -m-3 rounded-full ${radarColor} animate-ping pointer-events-none`}
                            style={{ animationDuration: isHigh ? '1.2s' : '2.4s' }}
                          />
                        )}

                        {/* Selected Crosshair Halo */}
                        {isSelected && (
                          <div className="absolute inset-0 -m-2 rounded-full border-2 border-sky-400 border-dashed animate-spin pointer-events-none" style={{ animationDuration: '6s' }} />
                        )}

                        {/* Interactive Marker Disc */}
                        <div
                          className={`relative flex items-center justify-center h-9 w-9 rounded-full shadow-lg border-2 ${stateColor} transition-transform group-hover:scale-110 ${
                            isSelected ? 'scale-110 ring-4 ring-sky-400/60' : ''
                          }`}
                        >
                          {getLocationIcon(loc.category)}
                        </div>

                        {/* Marker Floating Label & State Badge */}
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap flex flex-col items-center pointer-events-none">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs border ${
                            isSelected
                              ? 'bg-slate-900 text-sky-300 border-sky-400'
                              : 'bg-slate-900/90 text-slate-200 border-slate-700'
                          }`}>
                            {loc.name.split('(')[0].trim()}
                          </span>
                          <span
                            className={`text-[8px] font-bold uppercase tracking-wider px-1 py-0.2 rounded mt-0.5 ${
                              isHigh
                                ? 'bg-rose-600 text-white'
                                : isMod
                                ? 'bg-amber-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {loc.impact_state}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Map Bottom Legend Strip */}
                <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-300 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-medium">Impact Legend:</span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      LOW: Normal
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      MODERATE: Caution
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      HIGH: Critical
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Click any marker to inspect zone
                  </span>
                </div>
              </Card>

              {/* Selected Location Telemetry & Operational Action Card */}
              <Card className="lg:col-span-5 flex flex-col justify-between shadow-xs border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                          {selectedLoc.category}
                        </Badge>
                        {getImpactStateBadge(selectedLoc.impact_state)}
                      </div>
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {selectedLoc.name}
                      </CardTitle>
                    </div>
                    <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 border border-sky-200 shrink-0">
                      {getLocationIcon(selectedLoc.category)}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4 flex-1">
                  {/* Geographic GPS Coordinates Monospace Banner */}
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1 font-medium">
                      <Navigation className="h-3.5 w-3.5 text-sky-600" /> GPS Coordinates:
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {selectedLoc.latitude.toFixed(4)}° N, {selectedLoc.longitude.toFixed(4)}° E
                    </span>
                  </div>

                  {/* Live Status and Weather Condition */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg border bg-white dark:bg-slate-950/40">
                      <span className="text-[11px] text-muted-foreground block">Operational Status</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
                        {selectedLoc.status_label}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-white dark:bg-slate-950/40">
                      <span className="text-[11px] text-muted-foreground block">Weather Condition</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
                        {selectedLoc.weather_condition}
                      </span>
                    </div>
                  </div>

                  {/* Demand or Load Gauge */}
                  <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Simulated Load / Activity Pace:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {selectedLoc.demand_or_capacity_pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          selectedLoc.impact_state === 'HIGH'
                            ? 'bg-rose-500'
                            : selectedLoc.impact_state === 'MODERATE'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, selectedLoc.demand_or_capacity_pct))}%` }}
                      />
                    </div>
                  </div>

                  {/* Actionable Operational Directive */}
                  <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 text-xs space-y-1">
                    <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      Actionable Operational Directive:
                    </span>
                    <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed text-[11px]">
                      {selectedLoc.operational_action}
                    </p>
                  </div>
                </CardContent>

                {/* Quick Zone Switcher Buttons */}
                <div className="p-3 border-t bg-slate-50/50 dark:bg-slate-900/30">
                  <span className="text-[11px] text-muted-foreground block mb-2 font-medium">
                    Quick Zone Focus:
                  </span>
                  <div className="grid grid-cols-5 gap-1">
                    {activeLocations.map((loc) => {
                      const isSel = loc.id === selectedLoc.id
                      return (
                        <Button
                          key={loc.id}
                          size="sm"
                          variant={isSel ? 'default' : 'outline'}
                          onClick={() => setSelectedLocationId(loc.id)}
                          className="text-[10px] h-7 px-1 truncate capitalize"
                          title={loc.name}
                        >
                          {loc.category.replace('outdoor activity area', 'sports')}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )
      })()}

      {/* 5. Explainable Rationale Callout Card */}
      {simulatedState?.explanation && (
        <Card className={`shadow-xs border ${getSeverityBg(simulatedState.impact_severity)}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-sm font-bold text-slate-800">
                  Digital Twin Model Explanations &amp; Operational Rationale
                </CardTitle>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Duration: {durationHours}h | Rain: {rainfall}mm
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid gap-3 sm:grid-cols-2 text-xs text-slate-700">
              <div className="p-2.5 rounded-lg bg-white/70 border border-slate-200/60 space-y-1">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Waves className="h-3.5 w-3.5 text-sky-600" /> Outdoor Recreation Impact:
                </span>
                <p className="text-slate-600 leading-relaxed">
                  {simulatedState.explanation.outdoor_activity_demand}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white/70 border border-slate-200/60 space-y-1">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Utensils className="h-3.5 w-3.5 text-amber-600" /> Dining &amp; Room Service Shift:
                </span>
                <p className="text-slate-600 leading-relaxed">
                  {simulatedState.explanation.dining_demand}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white/70 border border-slate-200/60 space-y-1">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-600" /> Wellness &amp; Spa Substitution:
                </span>
                <p className="text-slate-600 leading-relaxed">
                  {simulatedState.explanation.spa_demand}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white/70 border border-slate-200/60 space-y-1">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-emerald-600" /> Department Staffing Recommendation:
                </span>
                <p className="text-slate-600 leading-relaxed">
                  {simulatedState.explanation.additional_staff_requirement}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. Real-World Signals Card */}
      {(() => {
        const activeSignals = (simulatedState?.public_signals?.signals || publicSignals?.signals || [])
        const filteredSignals = signalTypeFilter === 'all'
          ? activeSignals
          : activeSignals.filter((s) => s.impact_type.toLowerCase() === signalTypeFilter.toLowerCase())
        const totalCount = simulatedState?.public_signals?.total_signals ?? publicSignals?.total_signals ?? activeSignals.length
        const primarySource = simulatedState?.public_signals?.primary_source || publicSignals?.primary_source || 'IMD Goa & South Goa Public Transit Advisory Feeds'
        const contextAdvice = simulatedState?.public_signals?.context_advice || publicSignals?.context_advice || 'Public signals provide verified external validation for simulated demand shifts and transit friction.'

        return (
          <Card className="shadow-xs border-amber-200/90 dark:border-amber-900/60 bg-gradient-to-br from-white via-amber-50/20 to-sky-50/20 dark:from-slate-950 dark:via-amber-950/10 dark:to-sky-950/10">
            <CardHeader className="pb-3 border-b border-amber-100 dark:border-amber-900/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <Radio className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Real-World Signals
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-300 border-amber-300 bg-amber-50/60 dark:bg-amber-950/40">
                        Public Feeds &amp; Telemetry
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Normalized public reports on weather, travel disruptions, flooding, and road conditions contextualizing the Digital Twin
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-md border">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                    {totalCount} signals active
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 gap-1 border-slate-200 hover:bg-slate-50"
                    onClick={() => {
                      api.getPublicSignals({ rainfall, temperature }).then(setPublicSignals).catch(console.error)
                    }}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Digital Twin Context Advisory */}
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Digital Twin Contextual Interpretation</span>
                </div>
                <p className="text-[11px] leading-relaxed pl-6 text-slate-700 dark:text-slate-300">
                  {contextAdvice}
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-muted-foreground mr-1">Filter by Impact:</span>
                {[
                  { key: 'all', label: 'All Signals' },
                  { key: 'flooding', label: 'Flooding' },
                  { key: 'travel_disruption', label: 'Travel Disruption' },
                  { key: 'road_conditions', label: 'Road Conditions' },
                  { key: 'weather', label: 'Weather Alerts' },
                  { key: 'traveler_reports', label: 'Traveler Reports' },
                ].map((item) => {
                  const isActive = signalTypeFilter === item.key
                  return (
                    <button
                      key={item.key}
                      onClick={() => setSignalTypeFilter(item.key)}
                      className={`text-xs px-2.5 py-1 rounded-md transition-colors font-medium border ${
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>

              {/* Normalized Signals List */}
              <div className="space-y-2.5">
                {filteredSignals.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground border rounded-lg border-dashed">
                    No signals found matching this filter category.
                  </div>
                ) : (
                  filteredSignals.map((signal) => {
                    const impactMeta = getSignalImpactTypeMeta(signal.impact_type)
                    const ImpactIcon = impactMeta.icon
                    const isHighRelevance = signal.relevance.toUpperCase() === 'HIGH'

                    return (
                      <div
                        key={signal.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isHighRelevance
                            ? 'bg-white dark:bg-slate-900/90 border-rose-200 dark:border-rose-900/50 shadow-xs ring-1 ring-rose-500/10'
                            : 'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                              <ImpactIcon className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge className={`text-[10px] font-semibold ${impactMeta.badgeClass}`}>
                                  {impactMeta.label}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] uppercase font-bold tracking-wider ${
                                    signal.relevance === 'HIGH'
                                      ? 'text-rose-700 dark:text-rose-300 border-rose-300 bg-rose-50/50 dark:bg-rose-950/30'
                                      : signal.relevance === 'MEDIUM'
                                      ? 'text-amber-700 dark:text-amber-300 border-amber-300 bg-amber-50/50 dark:bg-amber-950/30'
                                      : 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                                  }`}
                                >
                                  {signal.relevance} RELEVANCE
                                </Badge>
                                {signal.verified && (
                                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                    <ShieldCheck className="h-3 w-3" /> Verified Source
                                  </span>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug pt-0.5">
                                {signal.summary}
                              </p>
                              {signal.location_reference && (
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-slate-400" />
                                  <span>{signal.location_reference}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0 sm:self-start">
                            <span className="text-[11px] text-muted-foreground block font-mono">
                              {formatSignalTime(signal.timestamp)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            Source: {signal.source}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {signal.id} &bull; Type: {signal.impact_type}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Source Attribution & Non-social disclaimer */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-muted-foreground border-t border-slate-100 dark:border-slate-900">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Integrated Primary Source: <strong>{primarySource}</strong></span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Reliable broadcast telemetry for Digital Twin context only &bull; Social features omitted by design
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* 7. Connected Smart Resort 360 Modules (Operational Recommendations) */}
      {simulatedState?.integrations && (
        <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-sky-50/50 dark:from-slate-900/60 dark:to-sky-950/20 p-4 rounded-xl border border-sky-100 dark:border-sky-900/40">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-sky-600/15 text-sky-700 dark:text-sky-300 border-sky-300 font-semibold text-xs tracking-wider">
                  CONNECTED RESORT MODULES
                </Badge>
                {simulatedState.integrations.is_heavy_weather ? (
                  <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 font-semibold text-xs animate-pulse">
                    ⚡ Heavy Weather Active
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 font-semibold text-xs">
                    Normal Operations
                  </Badge>
                )}
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
                Operational Recommendations Across Smart Resort 360
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dynamic simulation recommendations connected across Activities, Dining, Staffing, Guest Experience, and Guest Notifications.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-200 bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300/80 px-3.5 py-2 rounded-lg shrink-0">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Simulation recommendations only — real operational data is unchanged.</span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* MODULE 1: Activities Module */}
            <Card className="shadow-xs border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 border border-teal-200">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Activities: Weather Contingency</CardTitle>
                      <CardDescription className="text-xs">
                        Affected outdoor venues and suggested indoor leisure alternatives
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {simulatedState.integrations.activities.affected_outdoor_activities.length} Tracked
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/80 leading-relaxed font-medium">
                  {simulatedState.integrations.activities.summary}
                </p>

                {/* Affected Outdoor Activities */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <XCircle className="h-3.5 w-3.5 text-rose-500" />
                      Affected Outdoor Activities
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">Weather Status</span>
                  </div>

                  <div className="space-y-1.5">
                    {simulatedState.integrations.activities.affected_outdoor_activities.map((act, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{act.name}</span>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {act.venue} · {act.reason}
                          </div>
                        </div>
                        <Badge
                          className={
                            act.status === 'Suspended'
                              ? 'bg-rose-500/15 text-rose-700 border-rose-300 shrink-0 font-medium'
                              : act.status === 'Relocated'
                              ? 'bg-amber-500/15 text-amber-800 border-amber-300 shrink-0 font-medium'
                              : 'bg-emerald-500/15 text-emerald-700 border-emerald-300 shrink-0 font-medium'
                          }
                        >
                          {act.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested Indoor Alternatives */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Suggested Indoor Alternatives
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">Active Substitutes</span>
                  </div>

                  <div className="space-y-2">
                    {simulatedState.integrations.activities.suggested_indoor_alternatives.map((alt, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{alt.name}</span>
                          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 text-[10px]">
                            {alt.status}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-emerald-800 dark:text-emerald-300">
                          {alt.highlights}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {alt.venue}
                          </span>
                          <span className="font-medium text-slate-600 dark:text-slate-400">
                            Suitable for: {alt.suitable_for}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* MODULE 2: Dining Module */}
            <Card className="shadow-xs border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200">
                      <Utensils className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Dining: Predicted Demand Surge</CardTitle>
                      <CardDescription className="text-xs">
                        Indoor dining & in-room meal service load projection
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-amber-500/15 text-amber-800 border-amber-300 font-semibold text-xs">
                    +{simulatedState.integrations.dining.predicted_increase_pct}% Surge
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                {/* Demand Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border text-center">
                    <span className="text-[11px] text-muted-foreground block">Baseline Demand</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {simulatedState.integrations.dining.baseline_demand_pct}%
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 text-center">
                    <span className="text-[11px] text-amber-800 dark:text-amber-300 block font-medium">Simulated Demand</span>
                    <span className="text-sm font-bold text-amber-800 dark:text-amber-200">
                      {simulatedState.integrations.dining.simulated_demand_pct}%
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 text-center">
                    <span className="text-[11px] text-rose-800 dark:text-rose-300 block font-medium">Demand Increase</span>
                    <span className="text-sm font-bold text-rose-700">
                      +{simulatedState.integrations.dining.predicted_increase_pct}%
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 text-center">
                    <span className="text-[11px] text-blue-800 dark:text-blue-300 block font-medium">Projected Covers</span>
                    <span className="text-sm font-bold text-blue-700">
                      {simulatedState.integrations.dining.estimated_covers} Covers
                    </span>
                  </div>
                </div>

                {/* In-Room Dining Surge Banner */}
                {simulatedState.integrations.dining.in_room_dining_surge && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-300 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                    <BellRing className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
                    <div className="space-y-0.5">
                      <span className="font-bold">In-Room Dining Volume Spike Projected</span>
                      <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed text-[11px]">
                        Rain confinement forces on-property guests to order via room service rather than traveling off-resort.
                      </p>
                    </div>
                  </div>
                )}

                {/* Impacted Venues */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <ChefHat className="h-3.5 w-3.5 text-amber-600" />
                    Impacted F&amp;B Venues
                  </span>
                  <div className="space-y-1">
                    {simulatedState.integrations.dining.impacted_venues.map((venue, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-md bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span>{venue}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Operational Recommendation */}
                <div className="p-3 rounded-lg bg-slate-100/80 dark:bg-slate-900/60 border text-xs space-y-1">
                  <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    <Coffee className="h-3.5 w-3.5 text-amber-700" /> F&amp;B Manager Action Directive:
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                    {simulatedState.integrations.dining.operational_recommendation}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* MODULE 3: Staffing Module */}
            <Card className="shadow-xs border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border border-indigo-200">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Staffing: Department Surge Requirement</CardTitle>
                      <CardDescription className="text-xs">
                        Weather-driven additional staffing requirement above active roster
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-indigo-500/15 text-indigo-700 border-indigo-300 font-semibold text-xs">
                    +{simulatedState.integrations.staffing.total_additional_required} Staff Required
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/70 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Active Available Staff</span>
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {simulatedState.integrations.staffing.total_current_available} On Roster
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[11px]">Storm Deficit</span>
                    <span className="text-base font-bold text-rose-600">
                      +{simulatedState.integrations.staffing.total_additional_required} Staff
                    </span>
                  </div>
                </div>

                {/* Department Breakdown Table */}
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-indigo-600" />
                      Departmental Deployment Breakdown
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">Active vs Required</span>
                  </div>

                  <div className="space-y-2">
                    {simulatedState.integrations.staffing.departments.map((dept, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border bg-white dark:bg-slate-950/40 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{dept.department}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-500">{dept.current_available} Active</span>
                            {dept.additional_required > 0 ? (
                              <Badge className="bg-rose-500/15 text-rose-700 border-rose-300 text-[10px] px-1.5 py-0 font-bold">
                                +{dept.additional_required} Needed
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 px-1.5 py-0">
                                Adequate
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Briefcase className="h-3 w-3 text-slate-400" />
                          <span>Task: {dept.primary_task}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-100/70 dark:bg-slate-900/60 border text-xs flex items-center justify-between gap-3">
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    {simulatedState.integrations.staffing.recommendation}
                  </p>
                  <Link to="/staff" className="shrink-0">
                    <Button variant="outline" size="sm" className="text-xs h-7 px-2">
                      Roster →
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* MODULE 4: Guest Experience Module */}
            <Card className="shadow-xs border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 border border-purple-200">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Guest Experience: Indoor Programs</CardTitle>
                      <CardDescription className="text-xs">
                        Indoor leisure experiences matched to current resort availability
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-purple-500/15 text-purple-700 border-purple-300 font-semibold text-xs">
                    {simulatedState.integrations.guest_experience.experiences.length} Active Options
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {simulatedState.integrations.guest_experience.curation_rationale}
                </p>

                <div className="space-y-2">
                  {simulatedState.integrations.guest_experience.experiences.map((exp, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-purple-50/30 dark:bg-purple-950/20 border border-purple-200/60 text-xs space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{exp.title}</span>
                          <span className="text-[10px] text-purple-700 dark:text-purple-300 font-medium ml-2">
                            [{exp.category}]
                          </span>
                        </div>
                        <Badge className="bg-purple-500/15 text-purple-700 border-purple-300 text-[10px] shrink-0 font-medium">
                          {exp.availability_status}
                        </Badge>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {exp.description}
                      </p>

                      <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-purple-500" />
                          {exp.location}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-400">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {exp.duration}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* MODULE 5: Weather Guest Notification Generator (Full Width) */}
          <Card className="shadow-xs border-sky-200 dark:border-sky-900 bg-gradient-to-br from-white to-sky-50/30 dark:from-slate-950 dark:to-sky-950/20">
            <CardHeader className="pb-3 border-b border-sky-100 dark:border-sky-900/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-sky-100 text-sky-700 border border-sky-200">
                    <Megaphone className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      Notifications: Weather Guest Advisory Generator
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Simulation-generated guest communication ready for Guest Portal &amp; in-room displays
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="bg-sky-500/15 text-sky-700 border-sky-300 text-xs">
                    {simulatedState.integrations.notification.urgency}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyNotif(simulatedState.integrations!.notification.preview_message)}
                    className="text-xs h-8 gap-1.5 border-sky-200 hover:bg-sky-50 dark:hover:bg-sky-950/30"
                  >
                    {copiedNotif ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-sky-600" />
                        Copy Text
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              <div className="grid gap-2 sm:grid-cols-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border">
                  <span className="text-slate-400 block text-[11px]">Target Audience</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {simulatedState.integrations.notification.target_audience}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border">
                  <span className="text-slate-400 block text-[11px]">Delivery Channels</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {simulatedState.integrations.notification.channel}
                  </span>
                </div>
              </div>

              {/* Guest Device Mockup Container */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5 text-sky-600" />
                  Live Notification Preview (Guest View)
                </span>

                <div className="p-4 rounded-xl bg-slate-900 text-white shadow-md border border-slate-700/60 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs text-slate-300 border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[10px]">
                        SR
                      </div>
                      <span className="font-semibold text-white">Smart Resort 360 Concierge</span>
                    </div>
                    <span className="text-[11px] text-slate-400">Just Now</span>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-sky-300">
                      {simulatedState.integrations.notification.title}
                    </h4>
                    <p className="text-xs text-slate-200 leading-relaxed font-normal">
                      {simulatedState.integrations.notification.preview_message}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                    <span>In-Room Extension: Dial 0</span>
                    <Badge variant="outline" className="text-[10px] text-sky-400 border-sky-400/40">
                      Guest Mobile App
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  {simulatedState.integrations.notification.dispatch_advice} Real operational data and notification logs remain untouched.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
