import { BatteryMedium, Bell, Clock, Cloud, Download, Lock, RefreshCw, Shield, Volume2, Wifi } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const CAMOUFLAGE_COMPONENTS: Record<string, LucideIcon> = {
  'battery-medium': BatteryMedium,
  'volume-2': Volume2,
  wifi: Wifi,
  clock: Clock,
  shield: Shield,
  download: Download,
  cloud: Cloud,
  lock: Lock,
  'refresh-cw': RefreshCw,
  bell: Bell,
}
