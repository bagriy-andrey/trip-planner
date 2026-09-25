export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          citizenship_country_code: string | null
          created_at: string
          home_airport_code: string | null
          home_city_name: string | null
          home_city_place_id: string | null
          home_currency: string | null
          residence_country_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          citizenship_country_code?: string | null
          created_at?: string
          home_airport_code?: string | null
          home_city_name?: string | null
          home_city_place_id?: string | null
          home_currency?: string | null
          residence_country_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          citizenship_country_code?: string | null
          created_at?: string
          home_airport_code?: string | null
          home_city_name?: string | null
          home_city_place_id?: string | null
          home_currency?: string | null
          residence_country_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_hotels: {
        Row: {
          address: string | null
          booking_ref: string | null
          breakfast: string
          breakfast_days: number | null
          check_in_date: string
          check_in_time: string | null
          check_out_date: string
          check_out_time: string | null
          city_place_id: string
          cost_amount: number | null
          cost_currency: string | null
          created_at: string
          guests: number
          id: string
          maps_url: string | null
          name: string
          notes: string | null
          parking: string
          source: string
          time_zone: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          booking_ref?: string | null
          breakfast?: string
          breakfast_days?: number | null
          check_in_date: string
          check_in_time?: string | null
          check_out_date: string
          check_out_time?: string | null
          city_place_id: string
          cost_amount?: number | null
          cost_currency?: string | null
          created_at?: string
          guests?: number
          id?: string
          maps_url?: string | null
          name: string
          notes?: string | null
          parking?: string
          source?: string
          time_zone: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          booking_ref?: string | null
          breakfast?: string
          breakfast_days?: number | null
          check_in_date?: string
          check_in_time?: string | null
          check_out_date?: string
          check_out_time?: string | null
          city_place_id?: string
          cost_amount?: number | null
          cost_currency?: string | null
          created_at?: string
          guests?: number
          id?: string
          maps_url?: string | null
          name?: string
          notes?: string | null
          parking?: string
          source?: string
          time_zone?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_hotels_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_segments: {
        Row: {
          arrival_at: string | null
          baggage_included: boolean
          carrier_code: string | null
          created_at: string
          departure_at: string
          flight_number: string | null
          from_airport_code: string
          from_time_zone: string
          id: string
          mode: string
          passengers: number
          seat: string | null
          source: string
          ticket_number: string | null
          to_airport_code: string
          to_time_zone: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          arrival_at?: string | null
          baggage_included?: boolean
          carrier_code?: string | null
          created_at?: string
          departure_at: string
          flight_number?: string | null
          from_airport_code: string
          from_time_zone: string
          id?: string
          mode: string
          passengers?: number
          seat?: string | null
          source?: string
          ticket_number?: string | null
          to_airport_code: string
          to_time_zone: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          arrival_at?: string | null
          baggage_included?: boolean
          carrier_code?: string | null
          created_at?: string
          departure_at?: string
          flight_number?: string | null
          from_airport_code?: string
          from_time_zone?: string
          id?: string
          mode?: string
          passengers?: number
          seat?: string | null
          source?: string
          ticket_number?: string | null
          to_airport_code?: string
          to_time_zone?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_segments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          airport_code: string | null
          archived_at: string | null
          country_code: string | null
          created_at: string
          destination: string
          end_date: string | null
          iana_timezone: string | null
          id: string
          place_id: string | null
          place_kind: string
          start_date: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          airport_code?: string | null
          archived_at?: string | null
          country_code?: string | null
          created_at?: string
          destination: string
          end_date?: string | null
          iana_timezone?: string | null
          id?: string
          place_id?: string | null
          place_kind: string
          start_date?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          airport_code?: string | null
          archived_at?: string | null
          country_code?: string | null
          created_at?: string
          destination?: string
          end_date?: string | null
          iana_timezone?: string | null
          id?: string
          place_id?: string | null
          place_kind?: string
          start_date?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

