export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AppRole = 'admin' | 'volunteer' | 'veterinarian' | 'ngo'

type Table<Row> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: []
}

type LegacyRow = {
  id: string
  legacy_id: string | null
  legacy_data: Json
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<{
        id: string
        legacy_id: string | null
        display_name: string
        role: AppRole
        legacy_data: Json
        created_at: string
        updated_at: string
      }>
      dogs: Table<LegacyRow & {
        sdht_id: string | null
        name: string | null
        sex: string | null
        breed: string | null
        estimated_birth_date: string | null
        color: string | null
        current_location: string | null
        latitude: number | null
        longitude: number | null
        health_status: string | null
        status: string | null
        photo_path: string | null
        created_by: string | null
      }>
      health_records: Table<LegacyRow & {
        dog_id: string | null
        record_type: string | null
        observed_at: string | null
        diagnosis: string | null
        symptoms: string[]
        severity: string | null
        notes: string | null
        created_by: string | null
      }>
      rescue_cases: Table<LegacyRow & {
        dog_id: string | null
        reported_by: string | null
        assigned_volunteer_id: string | null
        ngo_id: string | null
        status: string
        severity: string | null
        title: string | null
        description: string | null
        location: string | null
        latitude: number | null
        longitude: number | null
        resolved_at: string | null
      }>
      vaccinations: Table<LegacyRow & {
        dog_id: string | null
        vaccine_name: string | null
        administered_at: string | null
        due_at: string | null
        veterinarian_id: string | null
        notes: string | null
      }>
      ngos: Table<LegacyRow & {
        name: string | null
        email: string | null
        phone: string | null
        area: string | null
        status: string | null
      }>
      volunteers: Table<LegacyRow & {
        profile_id: string | null
        ngo_id: string | null
        area: string | null
        status: string | null
      }>
      veterinarians: Table<LegacyRow & {
        profile_id: string | null
        license_number: string | null
        specialty: string | null
        clinic_name: string | null
        status: string | null
      }>
      notifications: Table<LegacyRow & {
        recipient_id: string
        title: string
        message: string
        read_at: string | null
        link: string | null
      }>
      health_reports: Table<LegacyRow & {
        dog_id: string | null
        reporter_id: string | null
        category: string | null
        severity: string | null
        description: string | null
        location: string | null
        status: string | null
        photo_path: string | null
      }>
      audit_logs: Table<LegacyRow & {
        actor_id: string | null
        action: string
        entity_type: string | null
        entity_id: string | null
        details: Json
      }>
    }
    Views: Record<string, never>
    Functions: {
      has_role: { Args: { allowed_roles: AppRole[] }; Returns: boolean }
    }
    Enums: { app_role: AppRole }
    CompositeTypes: Record<string, never>
  }
}

export type TableName = keyof Database['public']['Tables']
