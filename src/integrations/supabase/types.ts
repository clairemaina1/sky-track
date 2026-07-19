export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      aircraft: {
        Row: {
          airline: string
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          base_airport: string
          category: Database["public"]["Enums"]["skytrack_category"] | null
          created_by: string | null
          current_airport: string | null
          current_fuel_kg: number | null
          flight_hours_total: number
          fuel_capacity_kg: number | null
          health_score: number
          id: string
          last_updated: string
          metadata: Json | null
          model: string
          next_maintenance_due: string | null
          org_id: string
          status: Database["public"]["Enums"]["aircraft_status"]
          tail_number: string
        }
        Insert: {
          airline: string
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          base_airport: string
          category?: Database["public"]["Enums"]["skytrack_category"] | null
          created_by?: string | null
          current_airport?: string | null
          current_fuel_kg?: number | null
          flight_hours_total?: number
          fuel_capacity_kg?: number | null
          health_score?: number
          id?: string
          last_updated?: string
          metadata?: Json | null
          model: string
          next_maintenance_due?: string | null
          org_id: string
          status?: Database["public"]["Enums"]["aircraft_status"]
          tail_number: string
        }
        Update: {
          airline?: string
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          base_airport?: string
          category?: Database["public"]["Enums"]["skytrack_category"] | null
          created_by?: string | null
          current_airport?: string | null
          current_fuel_kg?: number | null
          flight_hours_total?: number
          fuel_capacity_kg?: number | null
          health_score?: number
          id?: string
          last_updated?: string
          metadata?: Json | null
          model?: string
          next_maintenance_due?: string | null
          org_id?: string
          status?: Database["public"]["Enums"]["aircraft_status"]
          tail_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "aircraft_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_by: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          body: string
          category: Database["public"]["Enums"]["skytrack_category"] | null
          created_at: string
          created_by: string | null
          id: string
          org_id: string
          severity: string
          source_id: string
          source_table: string
          title: string
          type: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_by?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          body: string
          category?: Database["public"]["Enums"]["skytrack_category"] | null
          created_at?: string
          created_by?: string | null
          id?: string
          org_id: string
          severity?: string
          source_id: string
          source_table: string
          title: string
          type: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_by?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          body?: string
          category?: Database["public"]["Enums"]["skytrack_category"] | null
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          severity?: string
          source_id?: string
          source_table?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cargo: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          awb_number: string
          category: Database["public"]["Enums"]["skytrack_category"] | null
          commodity_type: string | null
          consignee: string
          created_by: string | null
          delay_notified: boolean
          destination_icao: string
          flight_id: string | null
          id: string
          last_updated: string
          org_id: string
          origin_icao: string
          shipper: string
          special_handling: string[]
          status: Database["public"]["Enums"]["cargo_status"]
          weight_kg: number
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          awb_number: string
          category?: Database["public"]["Enums"]["skytrack_category"] | null
          commodity_type?: string | null
          consignee: string
          created_by?: string | null
          delay_notified?: boolean
          destination_icao: string
          flight_id?: string | null
          id?: string
          last_updated?: string
          org_id: string
          origin_icao: string
          shipper: string
          special_handling?: string[]
          status?: Database["public"]["Enums"]["cargo_status"]
          weight_kg: number
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          awb_number?: string
          category?: Database["public"]["Enums"]["skytrack_category"] | null
          commodity_type?: string | null
          consignee?: string
          created_by?: string | null
          delay_notified?: boolean
          destination_icao?: string
          flight_id?: string | null
          id?: string
          last_updated?: string
          org_id?: string
          origin_icao?: string
          shipper?: string
          special_handling?: string[]
          status?: Database["public"]["Enums"]["cargo_status"]
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "cargo_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "flights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargo_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crew: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          base_airport: string
          category: Database["public"]["Enums"]["skytrack_category"] | null
          certifications: string[]
          created_by: string | null
          current_assignment: string | null
          duty_time_remaining_hrs: number
          employee_id: string
          full_name: string
          id: string
          last_updated: string
          org_id: string
          rest_period_end: string | null
          role: string
          status: Database["public"]["Enums"]["crew_status"]
          total_flight_hours: number
          user_id: string | null
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          base_airport: string
          category?: Database["public"]["Enums"]["skytrack_category"] | null
          certifications?: string[]
          created_by?: string | null
          current_assignment?: string | null
          duty_time_remaining_hrs?: number
          employee_id: string
          full_name: string
          id?: string
          last_updated?: string
          org_id: string
          rest_period_end?: string | null
          role: string
          status?: Database["public"]["Enums"]["crew_status"]
          total_flight_hours?: number
          user_id?: string | null
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          base_airport?: string
          category?: Database["public"]["Enums"]["skytrack_category"] | null
          certifications?: string[]
          created_by?: string | null
          current_assignment?: string | null
          duty_time_remaining_hrs?: number
          employee_id?: string
          full_name?: string
          id?: string
          last_updated?: string
          org_id?: string
          rest_period_end?: string | null
          role?: string
          status?: Database["public"]["Enums"]["crew_status"]
          total_flight_hours?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crew_current_assignment_fkey"
            columns: ["current_assignment"]
            isOneToOne: false
            referencedRelation: "flights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_assignments: {
        Row: {
          created_at: string
          crew_id: string
          expires_at: string | null
          flight_id: string
          id: string
          layer: Database["public"]["Enums"]["crew_layer"]
          offered_at: string | null
          org_id: string
          rank: number
          reason: string | null
          responded_at: string | null
          status: Database["public"]["Enums"]["assignment_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          crew_id: string
          expires_at?: string | null
          flight_id: string
          id?: string
          layer: Database["public"]["Enums"]["crew_layer"]
          offered_at?: string | null
          org_id: string
          rank?: number
          reason?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          crew_id?: string
          expires_at?: string | null
          flight_id?: string
          id?: string
          layer?: Database["public"]["Enums"]["crew_layer"]
          offered_at?: string | null
          org_id?: string
          rank?: number
          reason?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_assignments_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crew"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_assignments_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "flights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_credentials: {
        Row: {
          created_at: string
          credential_type: string
          crew_id: string
          expires_on: string
          id: string
          issued_on: string | null
          issuing_authority: string | null
          notes: string | null
          org_id: string
          reference: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credential_type: string
          crew_id: string
          expires_on: string
          id?: string
          issued_on?: string | null
          issuing_authority?: string | null
          notes?: string | null
          org_id: string
          reference?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credential_type?: string
          crew_id?: string
          expires_on?: string
          id?: string
          issued_on?: string | null
          issuing_authority?: string | null
          notes?: string | null
          org_id?: string
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_credentials_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crew"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_credentials_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      flights: {
        Row: {
          actual_arrival: string | null
          actual_departure: string | null
          aircraft_id: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          category: Database["public"]["Enums"]["skytrack_category"] | null
          created_at: string
          created_by: string | null
          delay_reason: string | null
          destination_icao: string
          flight_number: string
          fuel_actual_kg: number | null
          fuel_planned_kg: number | null
          id: string
          org_id: string
          origin_icao: string
          progress_pct: number | null
          route_waypoints: Json | null
          scheduled_arrival: string
          scheduled_departure: string
          status: string
        }
        Insert: {
          actual_arrival?: string | null
          actual_departure?: string | null
          aircraft_id?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          category?: Database["public"]["Enums"]["skytrack_category"] | null
          created_at?: string
          created_by?: string | null
          delay_reason?: string | null
          destination_icao: string
          flight_number: string
          fuel_actual_kg?: number | null
          fuel_planned_kg?: number | null
          id?: string
          org_id: string
          origin_icao: string
          progress_pct?: number | null
          route_waypoints?: Json | null
          scheduled_arrival: string
          scheduled_departure: string
          status?: string
        }
        Update: {
          actual_arrival?: string | null
          actual_departure?: string | null
          aircraft_id?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          category?: Database["public"]["Enums"]["skytrack_category"] | null
          created_at?: string
          created_by?: string | null
          delay_reason?: string | null
          destination_icao?: string
          flight_number?: string
          fuel_actual_kg?: number | null
          fuel_planned_kg?: number | null
          id?: string
          org_id?: string
          origin_icao?: string
          progress_pct?: number | null
          route_waypoints?: Json | null
          scheduled_arrival?: string
          scheduled_departure?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "flights_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flights_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json
          created_at: string
          id: string
          last_error: string | null
          last_sync_at: string | null
          org_id: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          org_id: string
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          org_id?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          org_id: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance: {
        Row: {
          actual_hours: number | null
          aircraft_id: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          assigned_team: string | null
          category: Database["public"]["Enums"]["skytrack_category"] | null
          completed_at: string | null
          created_by: string | null
          description: string | null
          estimated_hours: number | null
          id: string
          notes: string | null
          opened_at: string
          org_id: string
          parts_required: Json | null
          priority: string
          status: Database["public"]["Enums"]["work_order_status"]
          title: string
          triggered_by: string
          work_order_number: string
        }
        Insert: {
          actual_hours?: number | null
          aircraft_id?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          assigned_team?: string | null
          category?: Database["public"]["Enums"]["skytrack_category"] | null
          completed_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          org_id: string
          parts_required?: Json | null
          priority?: string
          status?: Database["public"]["Enums"]["work_order_status"]
          title: string
          triggered_by?: string
          work_order_number: string
        }
        Update: {
          actual_hours?: number | null
          aircraft_id?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          assigned_team?: string | null
          category?: Database["public"]["Enums"]["skytrack_category"] | null
          completed_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          org_id?: string
          parts_required?: Json | null
          priority?: string
          status?: Database["public"]["Enums"]["work_order_status"]
          title?: string
          triggered_by?: string
          work_order_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          category: string
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json
          org_id: string
          priority: Database["public"]["Enums"]["notification_priority"]
          read_at: string | null
          target_role: Database["public"]["Enums"]["app_role"] | null
          title: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          category?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          org_id: string
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          title: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          body?: string | null
          category?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          org_id?: string
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_categories: {
        Row: {
          brand_label: string
          category: Database["public"]["Enums"]["skytrack_category"]
          created_at: string
          id: string
          org_id: string
        }
        Insert: {
          brand_label: string
          category: Database["public"]["Enums"]["skytrack_category"]
          created_at?: string
          id?: string
          org_id: string
        }
        Update: {
          brand_label?: string
          category?: Database["public"]["Enums"]["skytrack_category"]
          created_at?: string
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_categories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          org_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          tier: Database["public"]["Enums"]["org_tier"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          tier?: Database["public"]["Enums"]["org_tier"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          tier?: Database["public"]["Enums"]["org_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      pending_users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          notes: string | null
          requested_org: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          notes?: string | null
          requested_org?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          notes?: string | null
          requested_org?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      pilot_logbook_entries: {
        Row: {
          aircraft_id: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          arrival_icao: string | null
          created_at: string
          created_by: string | null
          departure_icao: string | null
          flight_date: string
          id: string
          ifr_time_min: number
          instructor_user_id: string | null
          landings_day: number
          landings_night: number
          night_time_min: number
          org_id: string
          pic_name: string | null
          pic_time_min: number
          pilot_user_id: string
          remarks: string | null
          route: string | null
          sic_name: string | null
          sic_time_min: number
          sim_time_min: number
          total_time_min: number
          updated_at: string
        }
        Insert: {
          aircraft_id?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          arrival_icao?: string | null
          created_at?: string
          created_by?: string | null
          departure_icao?: string | null
          flight_date: string
          id?: string
          ifr_time_min?: number
          instructor_user_id?: string | null
          landings_day?: number
          landings_night?: number
          night_time_min?: number
          org_id: string
          pic_name?: string | null
          pic_time_min?: number
          pilot_user_id: string
          remarks?: string | null
          route?: string | null
          sic_name?: string | null
          sic_time_min?: number
          sim_time_min?: number
          total_time_min?: number
          updated_at?: string
        }
        Update: {
          aircraft_id?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          arrival_icao?: string | null
          created_at?: string
          created_by?: string | null
          departure_icao?: string | null
          flight_date?: string
          id?: string
          ifr_time_min?: number
          instructor_user_id?: string | null
          landings_day?: number
          landings_night?: number
          night_time_min?: number
          org_id?: string
          pic_name?: string | null
          pic_time_min?: number
          pilot_user_id?: string
          remarks?: string | null
          route?: string | null
          sic_name?: string | null
          sic_time_min?: number
          sim_time_min?: number
          total_time_min?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_logbook_entries_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_logbook_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_category_access: {
        Row: {
          category: Database["public"]["Enums"]["skytrack_category"]
          created_at: string
          id: string
          org_id: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["skytrack_category"]
          created_at?: string
          id?: string
          org_id: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["skytrack_category"]
          created_at?: string
          id?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_category_access_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_pending_user: {
        Args: {
          _categories: Database["public"]["Enums"]["skytrack_category"][]
          _org_id: string
          _pending_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
      create_organization_with_admin: {
        Args: { _name: string; _tier: string }
        Returns: string
      }
      crew_is_clear: {
        Args: { _crew_id: string; _days?: number }
        Returns: boolean
      }
      emit_notification: {
        Args: {
          _action_url: string
          _body: string
          _category: string
          _metadata?: Json
          _org_id: string
          _priority: Database["public"]["Enums"]["notification_priority"]
          _target_role: Database["public"]["Enums"]["app_role"]
          _title: string
          _user_id: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invitation_matches_user: {
        Args: { _email: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _uid: string }; Returns: boolean }
      org_admin_count: { Args: { _org_id: string }; Returns: number }
      realtime_topic_org_id: { Args: { _topic: string }; Returns: string }
      user_has_category: {
        Args: {
          _cat: Database["public"]["Enums"]["skytrack_category"]
          _org: string
          _uid: string
        }
        Returns: boolean
      }
      user_has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_in_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      user_is_provisioned: { Args: { _uid: string }; Returns: boolean }
    }
    Enums: {
      aircraft_status:
        | "In-Flight"
        | "On-Ground"
        | "AOG"
        | "Maintenance"
        | "Delayed"
        | "Standby"
      app_role: "admin" | "dispatcher" | "crew" | "maintenance" | "super_admin"
      assignment_status:
        | "offered"
        | "accepted"
        | "declined"
        | "expired"
        | "cascaded"
        | "locked"
        | "auto_assigned"
      cargo_status:
        | "Loaded"
        | "In-Transit"
        | "Delayed"
        | "Offloaded"
        | "Held-Customs"
      crew_layer: "cabin" | "pilot"
      crew_status:
        | "On-Duty"
        | "Off-Duty"
        | "On-Leave"
        | "Fatigue-Hold"
        | "In-Flight"
      notification_priority: "critical" | "high" | "normal" | "low"
      org_tier: "commercial" | "flight_school"
      skytrack_category: "flight_school" | "icao" | "airline" | "cargo"
      work_order_status:
        | "Open"
        | "In-Progress"
        | "Pending-Parts"
        | "Completed"
        | "Escalated"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      aircraft_status: [
        "In-Flight",
        "On-Ground",
        "AOG",
        "Maintenance",
        "Delayed",
        "Standby",
      ],
      app_role: ["admin", "dispatcher", "crew", "maintenance", "super_admin"],
      assignment_status: [
        "offered",
        "accepted",
        "declined",
        "expired",
        "cascaded",
        "locked",
        "auto_assigned",
      ],
      cargo_status: [
        "Loaded",
        "In-Transit",
        "Delayed",
        "Offloaded",
        "Held-Customs",
      ],
      crew_layer: ["cabin", "pilot"],
      crew_status: [
        "On-Duty",
        "Off-Duty",
        "On-Leave",
        "Fatigue-Hold",
        "In-Flight",
      ],
      notification_priority: ["critical", "high", "normal", "low"],
      org_tier: ["commercial", "flight_school"],
      skytrack_category: ["flight_school", "icao", "airline", "cargo"],
      work_order_status: [
        "Open",
        "In-Progress",
        "Pending-Parts",
        "Completed",
        "Escalated",
      ],
    },
  },
} as const
