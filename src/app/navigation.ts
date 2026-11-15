import {
  Activity,
  Bell,
  Building2,
  ClipboardList,
  FileBarChart,
  HeartPulse,
  LayoutDashboard,
  PawPrint,
  ScanHeart,
  ScrollText,
  Settings,
  ShieldCheck,
  Stethoscope,
  Syringe,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '../auth/AuthProvider'
import type { TableName } from '../lib/database.types'

export type AppModule = {
  path: string
  label: string
  description: string
  icon: LucideIcon
  roles: UserRole[]
  collection?: TableName
  adminOnly?: boolean
}

export const appModules: AppModule[] = [
  {
    path: 'dashboard',
    label: 'Dashboard',
    description: 'Live overview of records available to your role.',
    icon: LayoutDashboard,
    roles: ['admin', 'volunteer', 'veterinarian', 'ngo'],
  },
  {
    path: 'dogs',
    label: 'Dog Profiles',
    description: 'Registered dogs and their current profile details.',
    icon: PawPrint,
    roles: ['admin', 'volunteer', 'veterinarian', 'ngo'],
    collection: 'dogs',
  },
  {
    path: 'scanner',
    label: 'AI Health Scanner',
    description: 'Connect the configured clinical image-analysis service.',
    icon: ScanHeart,
    roles: ['admin', 'volunteer', 'veterinarian'],
  },
  {
    path: 'health-records',
    label: 'Health Records',
    description: 'Clinical notes and care history stored in the SDHT database.',
    icon: HeartPulse,
    roles: ['admin', 'veterinarian'],
    collection: 'health_records',
  },
  {
    path: 'rescues',
    label: 'Rescue Management',
    description: 'Active and completed rescue cases.',
    icon: Activity,
    roles: ['admin', 'volunteer', 'ngo'],
    collection: 'rescue_cases',
  },
  {
    path: 'vaccinations',
    label: 'Vaccinations',
    description: 'Vaccination records and coverage data.',
    icon: Syringe,
    roles: ['admin', 'veterinarian'],
    collection: 'vaccinations',
  },
  {
    path: 'ngos',
    label: 'NGOs',
    description: 'Partner organizations with access to this workspace.',
    icon: Building2,
    roles: ['admin', 'volunteer', 'ngo'],
    collection: 'ngos',
  },
  {
    path: 'volunteers',
    label: 'Volunteers',
    description: 'Volunteer accounts and their stored profile data.',
    icon: Users,
    roles: ['admin', 'ngo'],
    collection: 'volunteers',
  },
  {
    path: 'veterinarians',
    label: 'Veterinarians',
    description: 'Veterinary accounts authorized for clinical workflows.',
    icon: Stethoscope,
    roles: ['admin', 'veterinarian'],
    collection: 'veterinarians',
  },
  {
    path: 'notifications',
    label: 'Notifications',
    description: 'Notifications addressed to your account.',
    icon: Bell,
    roles: ['admin', 'volunteer', 'veterinarian', 'ngo'],
    collection: 'notifications',
  },
  {
    path: 'reports',
    label: 'Reports',
    description: 'Health reports submitted by authorized team members.',
    icon: FileBarChart,
    roles: ['admin', 'volunteer', 'veterinarian', 'ngo'],
    collection: 'health_reports',
  },
  {
    path: 'settings',
    label: 'Settings',
    description: 'Your signed-in account and access level.',
    icon: Settings,
    roles: ['admin', 'volunteer', 'veterinarian', 'ngo'],
  },
  {
    path: 'user-management',
    label: 'User Management',
    description: 'Account profiles and assigned workspace roles.',
    icon: UserCog,
    roles: ['admin'],
    collection: 'profiles',
    adminOnly: true,
  },
  {
    path: 'audit-logs',
    label: 'Audit Logs',
    description: 'Read-only audit events recorded by trusted services.',
    icon: ScrollText,
    roles: ['admin'],
    collection: 'audit_logs',
    adminOnly: true,
  },
  {
    path: 'system-settings',
    label: 'System Settings',
    description: 'Administrative settings and service configuration status.',
    icon: ShieldCheck,
    roles: ['admin'],
    adminOnly: true,
  },
  {
    path: 'account-activity',
    label: 'Account Activity',
    description: 'Your account security and current session status.',
    icon: ClipboardList,
    roles: ['admin', 'volunteer', 'veterinarian', 'ngo'],
  },
]
