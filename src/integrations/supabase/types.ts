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
          base_airport: string
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
          base_airport: string
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
          base_airport?: string
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
          body: string
          created_at: string
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
          body: string
          created_at?: string
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
          body?: string
          created_at?: string
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
          awb_number: string
          commodity_type: string | null
          consignee: string
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
          awb_number: string
          commodity_type?: string | null
          consignee: string
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
          awb_number?: string
          commodity_type?: string | null
          consignee?: string
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
          base_airport: string
          certifications: string[]
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
        }
        Insert: {
          base_airport: string
          certifications?: string[]
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
        }
        Update: {
          base_airport?: string
          certifications?: string[]
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
      flights: {
        Row: {
          actual_arrival: string | null
          actual_departure: string | null
          aircraft_id: string | null
          created_at: string
          delay_reason: string | null
          destination_icao: string
          flight_number: string
          fuel_actual_kg: number | null
          fuel_planned_kg: number | null
          id: string
          org_id: string
          origin_icao: string
          route_waypoints: Json | null
          scheduled_arrival: string
          scheduled_departure: string
          status: string
        }
        Insert: {
          actual_arrival?: string | null
          actual_departure?: string | null
          aircraft_id?: string | null
          created_at?: string
          delay_reason?: string | null
          destination_icao: string
          flight_number: string
          fuel_actual_kg?: number | null
          fuel_planned_kg?: number | null
          id?: string
          org_id: string
          origin_icao: string
          route_waypoints?: Json | null
          scheduled_arrival: string
          scheduled_departure: string
          status?: string
        }
        Update: {
          actual_arrival?: string | null
          actual_departure?: string | null
          aircraft_id?: string | null
          created_at?: string
          delay_reason?: string | null
          destination_icao?: string
          flight_number?: string
          fuel_actual_kg?: number | null
          fuel_planned_kg?: number | null
          id?: string
          org_id?: string
          origin_icao?: string
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
          assigned_team: string | null
          completed_at: string | null
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
          assigned_team?: string | null
          completed_at?: string | null
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
          assigned_team?: string | null
          completed_at?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
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
    }
    Enums: {
      aircraft_status:
        | "In-Flight"
        | "On-Ground"
        | "AOG"
        | "Maintenance"
        | "Delayed"
        | "Standby"
      app_role: "admin" | "dispatcher" | "crew" | "maintenance"
      cargo_status:
        | "Loaded"
        | "In-Transit"
        | "Delayed"
        | "Offloaded"
        | "Held-Customs"
      crew_status:
        | "On-Duty"
        | "Off-Duty"
        | "On-Leave"
        | "Fatigue-Hold"
        | "In-Flight"
      org_tier: "commercial" | "flight_school"
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
      app_role: ["admin", "dispatcher", "crew", "maintenance"],
      cargo_status: [
        "Loaded",
        "In-Transit",
        "Delayed",
        "Offloaded",
        "Held-Customs",
      ],
      crew_status: [
        "On-Duty",
        "Off-Duty",
        "On-Leave",
        "Fatigue-Hold",
        "In-Flight",
      ],
      org_tier: ["commercial", "flight_school"],
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
