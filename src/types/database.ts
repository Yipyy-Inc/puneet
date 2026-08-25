export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17";
  };
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          category: string;
          changes: Json;
          description: string | null;
          entity_id: string | null;
          entity_name: string | null;
          entity_type: string | null;
          facility_id: string | null;
          facility_name: string | null;
          id: string;
          ip_address: unknown;
          occurred_at: string;
          severity: string;
          status: string;
          user_agent: string | null;
          user_id: string | null;
          user_name: string | null;
          user_role: string | null;
        };
        Insert: {
          action: string;
          category: string;
          changes?: Json;
          description?: string | null;
          entity_id?: string | null;
          entity_name?: string | null;
          entity_type?: string | null;
          facility_id?: string | null;
          facility_name?: string | null;
          id?: string;
          ip_address?: unknown;
          occurred_at?: string;
          severity?: string;
          status?: string;
          user_agent?: string | null;
          user_id?: string | null;
          user_name?: string | null;
          user_role?: string | null;
        };
        Update: {
          action?: string;
          category?: string;
          changes?: Json;
          description?: string | null;
          entity_id?: string | null;
          entity_name?: string | null;
          entity_type?: string | null;
          facility_id?: string | null;
          facility_name?: string | null;
          id?: string;
          ip_address?: unknown;
          occurred_at?: string;
          severity?: string;
          status?: string;
          user_agent?: string | null;
          user_id?: string | null;
          user_name?: string | null;
          user_role?: string | null;
        };
        Relationships: [];
      };
      boarding_stays: {
        Row: {
          booking_id: string;
          checked_in_at: string | null;
          checked_out_at: string | null;
          created_at: string;
          facility_id: string;
          occupies: unknown;
          override_reason: string | null;
          released_at: string | null;
          room_id: string;
          status: string | null;
          updated_at: string;
        };
        Insert: {
          booking_id: string;
          checked_in_at?: string | null;
          checked_out_at?: string | null;
          created_at?: string;
          facility_id: string;
          occupies: unknown;
          override_reason?: string | null;
          released_at?: string | null;
          room_id: string;
          status?: string | null;
          updated_at?: string;
        };
        Update: {
          booking_id?: string;
          checked_in_at?: string | null;
          checked_out_at?: string | null;
          created_at?: string;
          facility_id?: string;
          occupies?: unknown;
          override_reason?: string | null;
          released_at?: string | null;
          room_id?: string;
          status?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "boarding_stays_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "booking_presence";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "boarding_stays_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boarding_stays_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boarding_stays_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "facility_rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_line_items: {
        Row: {
          author_name: string;
          booking_id: string;
          created_at: string;
          created_by: string | null;
          facility_id: string;
          id: string;
          kind: string;
          name: string;
          price: number | null;
          quantity: number;
          source_id: string | null;
          unit_price: number;
          updated_at: string;
        };
        Insert: {
          author_name?: string;
          booking_id: string;
          created_at?: string;
          created_by?: string | null;
          facility_id: string;
          id?: string;
          kind: string;
          name: string;
          price?: number | null;
          quantity?: number;
          source_id?: string | null;
          unit_price: number;
          updated_at?: string;
        };
        Update: {
          author_name?: string;
          booking_id?: string;
          created_at?: string;
          created_by?: string | null;
          facility_id?: string;
          id?: string;
          kind?: string;
          name?: string;
          price?: number | null;
          quantity?: number;
          source_id?: string | null;
          unit_price?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_line_items_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "booking_presence";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "booking_line_items_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_line_items_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_pets: {
        Row: {
          booking_id: string;
          pet_id: string;
        };
        Insert: {
          booking_id: string;
          pet_id: string;
        };
        Update: {
          booking_id?: string;
          pet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_pets_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "booking_presence";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "booking_pets_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_pets_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_tip_allocations: {
        Row: {
          amount: number;
          author_name: string | null;
          booking_id: string;
          created_at: string;
          created_by: string | null;
          facility_id: string;
          id: string;
          method: string;
          staff_id: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          author_name?: string | null;
          booking_id: string;
          created_at?: string;
          created_by?: string | null;
          facility_id: string;
          id?: string;
          method: string;
          staff_id: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          author_name?: string | null;
          booking_id?: string;
          created_at?: string;
          created_by?: string | null;
          facility_id?: string;
          id?: string;
          method?: string;
          staff_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_tip_allocations_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "booking_presence";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "booking_tip_allocations_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_tip_allocations_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_tip_allocations_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "booking_tip_allocations_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          amount_due: number | null;
          amount_paid: number;
          assigned_staff_id: string | null;
          assigned_staff_name: string | null;
          base_price: number;
          client_id: string;
          created_at: string;
          details: Json;
          discount: number;
          end_at: string;
          extras_total: number;
          facility_id: string;
          id: string;
          location_id: string | null;
          payment_status: string;
          ref: number;
          service: string;
          service_type: string | null;
          special_requests: string | null;
          start_at: string;
          status: Database["public"]["Enums"]["booking_status"];
          tip_amount: number | null;
          total_cost: number;
          updated_at: string;
        };
        Insert: {
          amount_due?: number | null;
          amount_paid?: number;
          assigned_staff_id?: string | null;
          assigned_staff_name?: string | null;
          base_price?: number;
          client_id: string;
          created_at?: string;
          details?: Json;
          discount?: number;
          end_at: string;
          extras_total?: number;
          facility_id: string;
          id?: string;
          location_id?: string | null;
          payment_status?: string;
          ref?: number;
          service: string;
          service_type?: string | null;
          special_requests?: string | null;
          start_at: string;
          status?: Database["public"]["Enums"]["booking_status"];
          tip_amount?: number | null;
          total_cost?: number;
          updated_at?: string;
        };
        Update: {
          amount_due?: number | null;
          amount_paid?: number;
          assigned_staff_id?: string | null;
          assigned_staff_name?: string | null;
          base_price?: number;
          client_id?: string;
          created_at?: string;
          details?: Json;
          discount?: number;
          end_at?: string;
          extras_total?: number;
          facility_id?: string;
          id?: string;
          location_id?: string | null;
          payment_status?: string;
          ref?: number;
          service?: string;
          service_type?: string | null;
          special_requests?: string | null;
          start_at?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          tip_amount?: number | null;
          total_cost?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_assigned_staff_id_fkey";
            columns: ["assigned_staff_id"];
            isOneToOne: false;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "bookings_assigned_staff_id_fkey";
            columns: ["assigned_staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      care_log_entries: {
        Row: {
          booking_id: string;
          created_at: string;
          details: Json;
          executed_at: string;
          facility_id: string;
          id: string;
          notes: string | null;
          occurred_on: string;
          outcome: string;
          pet_id: string | null;
          recorded_by: string | null;
          recorded_by_name: string | null;
          served_at: string | null;
          task_key: string;
          task_type: string;
          updated_at: string;
        };
        Insert: {
          booking_id: string;
          created_at?: string;
          details?: Json;
          executed_at: string;
          facility_id: string;
          id?: string;
          notes?: string | null;
          occurred_on: string;
          outcome: string;
          pet_id?: string | null;
          recorded_by?: string | null;
          recorded_by_name?: string | null;
          served_at?: string | null;
          task_key: string;
          task_type: string;
          updated_at?: string;
        };
        Update: {
          booking_id?: string;
          created_at?: string;
          details?: Json;
          executed_at?: string;
          facility_id?: string;
          id?: string;
          notes?: string | null;
          occurred_on?: string;
          outcome?: string;
          pet_id?: string | null;
          recorded_by?: string | null;
          recorded_by_name?: string | null;
          served_at?: string | null;
          task_key?: string;
          task_type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "care_log_entries_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "booking_presence";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "care_log_entries_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "care_log_entries_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "care_log_entries_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "care_log_entries_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          address: Json | null;
          blocked_at: string | null;
          blocked_reason: string | null;
          created_at: string;
          details: Json;
          email: string;
          facility_id: string;
          id: string;
          image_url: string | null;
          is_blocked: boolean;
          last_visit_date: string | null;
          name: string;
          no_show_count: number;
          outstanding_balance: number;
          phone: string | null;
          preferred_language: string | null;
          profile_id: string | null;
          ref: number;
          status: string;
          updated_at: string;
        };
        Insert: {
          address?: Json | null;
          blocked_at?: string | null;
          blocked_reason?: string | null;
          created_at?: string;
          details?: Json;
          email: string;
          facility_id: string;
          id?: string;
          image_url?: string | null;
          is_blocked?: boolean;
          last_visit_date?: string | null;
          name: string;
          no_show_count?: number;
          outstanding_balance?: number;
          phone?: string | null;
          preferred_language?: string | null;
          profile_id?: string | null;
          ref?: number;
          status?: string;
          updated_at?: string;
        };
        Update: {
          address?: Json | null;
          blocked_at?: string | null;
          blocked_reason?: string | null;
          created_at?: string;
          details?: Json;
          email?: string;
          facility_id?: string;
          id?: string;
          image_url?: string | null;
          is_blocked?: boolean;
          last_visit_date?: string | null;
          name?: string;
          no_show_count?: number;
          outstanding_balance?: number;
          phone?: string | null;
          preferred_language?: string | null;
          profile_id?: string | null;
          ref?: number;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clients_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clients_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      communication_connections: {
        Row: {
          connected_at: string | null;
          connected_by: string | null;
          created_at: string;
          facility_id: string;
          friendly_name: string | null;
          last_error: string | null;
          last_verified_at: string | null;
          provider: string;
          status: string;
          subaccount_sid: string;
          suspended_at: string | null;
          updated_at: string;
        };
        Insert: {
          connected_at?: string | null;
          connected_by?: string | null;
          created_at?: string;
          facility_id: string;
          friendly_name?: string | null;
          last_error?: string | null;
          last_verified_at?: string | null;
          provider?: string;
          status?: string;
          subaccount_sid: string;
          suspended_at?: string | null;
          updated_at?: string;
        };
        Update: {
          connected_at?: string | null;
          connected_by?: string | null;
          created_at?: string;
          facility_id?: string;
          friendly_name?: string | null;
          last_error?: string | null;
          last_verified_at?: string | null;
          provider?: string;
          status?: string;
          subaccount_sid?: string;
          suspended_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "communication_connections_connected_by_fkey";
            columns: ["connected_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "communication_connections_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      communication_numbers: {
        Row: {
          country: string;
          created_at: string;
          facility_id: string;
          id: string;
          mms_enabled: boolean;
          number_sid: string | null;
          phone_number: string;
          provider: string;
          purpose: string;
          released_at: string | null;
          sms_enabled: boolean;
          updated_at: string;
          voice_enabled: boolean;
        };
        Insert: {
          country?: string;
          created_at?: string;
          facility_id: string;
          id?: string;
          mms_enabled?: boolean;
          number_sid?: string | null;
          phone_number: string;
          provider?: string;
          purpose?: string;
          released_at?: string | null;
          sms_enabled?: boolean;
          updated_at?: string;
          voice_enabled?: boolean;
        };
        Update: {
          country?: string;
          created_at?: string;
          facility_id?: string;
          id?: string;
          mms_enabled?: boolean;
          number_sid?: string | null;
          phone_number?: string;
          provider?: string;
          purpose?: string;
          released_at?: string | null;
          sms_enabled?: boolean;
          updated_at?: string;
          voice_enabled?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "communication_numbers_facility_id_provider_fkey";
            columns: ["facility_id", "provider"];
            isOneToOne: false;
            referencedRelation: "communication_connections";
            referencedColumns: ["facility_id", "provider"];
          },
        ];
      };
      customer_package_lines: {
        Row: {
          customer_package_id: string;
          id: string;
          module: Database["public"]["Enums"]["service_module"];
          passes_total: number;
          service_id: string;
          service_name: string;
        };
        Insert: {
          customer_package_id: string;
          id?: string;
          module: Database["public"]["Enums"]["service_module"];
          passes_total: number;
          service_id: string;
          service_name: string;
        };
        Update: {
          customer_package_id?: string;
          id?: string;
          module?: Database["public"]["Enums"]["service_module"];
          passes_total?: number;
          service_id?: string;
          service_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_package_lines_customer_package_id_fkey";
            columns: ["customer_package_id"];
            isOneToOne: false;
            referencedRelation: "customer_package_pool_status";
            referencedColumns: ["customer_package_id"];
          },
          {
            foreignKeyName: "customer_package_lines_customer_package_id_fkey";
            columns: ["customer_package_id"];
            isOneToOne: false;
            referencedRelation: "customer_package_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_package_lines_customer_package_id_fkey";
            columns: ["customer_package_id"];
            isOneToOne: false;
            referencedRelation: "customer_packages";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_packages: {
        Row: {
          client_id: string;
          created_at: string;
          expires_at: string | null;
          facility_id: string;
          id: string;
          legacy_id: string | null;
          package_id: string | null;
          package_name: string;
          price_paid: number;
          purchased_at: string;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          expires_at?: string | null;
          facility_id: string;
          id?: string;
          legacy_id?: string | null;
          package_id?: string | null;
          package_name: string;
          price_paid: number;
          purchased_at?: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          expires_at?: string | null;
          facility_id?: string;
          id?: string;
          legacy_id?: string | null;
          package_id?: string | null;
          package_name?: string;
          price_paid?: number;
          purchased_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_packages_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_packages_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_packages_package_id_fkey";
            columns: ["package_id"];
            isOneToOne: false;
            referencedRelation: "prepaid_package_pricing";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_packages_package_id_fkey";
            columns: ["package_id"];
            isOneToOne: false;
            referencedRelation: "prepaid_packages";
            referencedColumns: ["id"];
          },
        ];
      };
      daycare_attendance: {
        Row: {
          author_name: string;
          booking_id: string;
          checked_in_at: string | null;
          checked_out_at: string | null;
          created_at: string;
          created_by: string | null;
          facility_id: string;
          notes: string;
          play_group: string | null;
          rate_type: string | null;
          status: string | null;
          updated_at: string;
        };
        Insert: {
          author_name?: string;
          booking_id: string;
          checked_in_at?: string | null;
          checked_out_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          facility_id: string;
          notes?: string;
          play_group?: string | null;
          rate_type?: string | null;
          status?: string | null;
          updated_at?: string;
        };
        Update: {
          author_name?: string;
          booking_id?: string;
          checked_in_at?: string | null;
          checked_out_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          facility_id?: string;
          notes?: string;
          play_group?: string | null;
          rate_type?: string | null;
          status?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daycare_attendance_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "booking_presence";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "daycare_attendance_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daycare_attendance_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      daycare_config: {
        Row: {
          capacity_by_size: Json;
          capacity_total: number;
          facility_id: string;
          updated_at: string;
        };
        Insert: {
          capacity_by_size?: Json;
          capacity_total?: number;
          facility_id: string;
          updated_at?: string;
        };
        Update: {
          capacity_by_size?: Json;
          capacity_total?: number;
          facility_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daycare_config_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: true;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      facilities: {
        Row: {
          address: Json | null;
          allow_customer_signup: boolean;
          business_types: string[];
          created_at: string;
          description: string | null;
          email: string | null;
          id: string;
          legacy_id: string | null;
          logo_url: string | null;
          name: string;
          org_id: string;
          phone: string | null;
          preferences: Json;
          slug: string;
          social_media: Json;
          timezone: string;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          address?: Json | null;
          allow_customer_signup?: boolean;
          business_types?: string[];
          created_at?: string;
          description?: string | null;
          email?: string | null;
          id?: string;
          legacy_id?: string | null;
          logo_url?: string | null;
          name: string;
          org_id: string;
          phone?: string | null;
          preferences?: Json;
          slug: string;
          social_media?: Json;
          timezone?: string;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          address?: Json | null;
          allow_customer_signup?: boolean;
          business_types?: string[];
          created_at?: string;
          description?: string | null;
          email?: string | null;
          id?: string;
          legacy_id?: string | null;
          logo_url?: string | null;
          name?: string;
          org_id?: string;
          phone?: string | null;
          preferences?: Json;
          slug?: string;
          social_media?: Json;
          timezone?: string;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "facilities_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs";
            referencedColumns: ["id"];
          },
        ];
      };
      facility_branding: {
        Row: {
          accent_color: string | null;
          created_at: string;
          facility_id: string;
          logo_url: string | null;
          primary_color: string | null;
          support_email: string | null;
          support_phone: string | null;
          tagline: string | null;
          updated_at: string;
          wordmark_url: string | null;
        };
        Insert: {
          accent_color?: string | null;
          created_at?: string;
          facility_id: string;
          logo_url?: string | null;
          primary_color?: string | null;
          support_email?: string | null;
          support_phone?: string | null;
          tagline?: string | null;
          updated_at?: string;
          wordmark_url?: string | null;
        };
        Update: {
          accent_color?: string | null;
          created_at?: string;
          facility_id?: string;
          logo_url?: string | null;
          primary_color?: string | null;
          support_email?: string | null;
          support_phone?: string | null;
          tagline?: string | null;
          updated_at?: string;
          wordmark_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "facility_branding_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: true;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      facility_custom_role_permissions: {
        Row: {
          custom_role_id: string;
          permission_key: string;
          scope: Database["public"]["Enums"]["access_scope"];
        };
        Insert: {
          custom_role_id: string;
          permission_key: string;
          scope: Database["public"]["Enums"]["access_scope"];
        };
        Update: {
          custom_role_id?: string;
          permission_key?: string;
          scope?: Database["public"]["Enums"]["access_scope"];
        };
        Relationships: [
          {
            foreignKeyName: "facility_custom_role_permissions_custom_role_id_fkey";
            columns: ["custom_role_id"];
            isOneToOne: false;
            referencedRelation: "facility_custom_roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facility_custom_role_permissions_permission_key_fkey";
            columns: ["permission_key"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["key"];
          },
        ];
      };
      facility_custom_roles: {
        Row: {
          accent: string;
          created_at: string;
          description: string;
          facility_id: string;
          icon: string;
          id: string;
          label: string;
          legacy_id: string | null;
          ring: string;
          updated_at: string;
        };
        Insert: {
          accent?: string;
          created_at?: string;
          description?: string;
          facility_id: string;
          icon?: string;
          id?: string;
          label: string;
          legacy_id?: string | null;
          ring?: string;
          updated_at?: string;
        };
        Update: {
          accent?: string;
          created_at?: string;
          description?: string;
          facility_id?: string;
          icon?: string;
          id?: string;
          label?: string;
          legacy_id?: string | null;
          ring?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "facility_custom_roles_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      facility_departments: {
        Row: {
          color: string;
          created_at: string;
          description: string | null;
          facility_id: string;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          description?: string | null;
          facility_id: string;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          description?: string | null;
          facility_id?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "facility_departments_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      facility_membership_grants: {
        Row: {
          access_level: Database["public"]["Enums"]["facility_access_level"];
          claimed_at: string | null;
          claimed_profile_id: string | null;
          created_at: string;
          email: string;
          expires_at: string | null;
          facility_id: string;
          granted_by: string | null;
          id: string;
          role: Database["public"]["Enums"]["facility_staff_role"];
          staff_id: string;
        };
        Insert: {
          access_level?: Database["public"]["Enums"]["facility_access_level"];
          claimed_at?: string | null;
          claimed_profile_id?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string | null;
          facility_id: string;
          granted_by?: string | null;
          id?: string;
          role: Database["public"]["Enums"]["facility_staff_role"];
          staff_id: string;
        };
        Update: {
          access_level?: Database["public"]["Enums"]["facility_access_level"];
          claimed_at?: string | null;
          claimed_profile_id?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string | null;
          facility_id?: string;
          granted_by?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["facility_staff_role"];
          staff_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "facility_membership_grants_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facility_membership_grants_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: true;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "facility_membership_grants_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: true;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      facility_memberships: {
        Row: {
          access_level: Database["public"]["Enums"]["facility_access_level"];
          created_at: string;
          departments: Database["public"]["Enums"]["service_module"][];
          facility_id: string;
          home_location_id: string | null;
          id: string;
          is_active: boolean;
          legacy_id: string | null;
          profile_id: string;
          role: Database["public"]["Enums"]["facility_staff_role"];
          updated_at: string;
        };
        Insert: {
          access_level?: Database["public"]["Enums"]["facility_access_level"];
          created_at?: string;
          departments?: Database["public"]["Enums"]["service_module"][];
          facility_id: string;
          home_location_id?: string | null;
          id?: string;
          is_active?: boolean;
          legacy_id?: string | null;
          profile_id: string;
          role: Database["public"]["Enums"]["facility_staff_role"];
          updated_at?: string;
        };
        Update: {
          access_level?: Database["public"]["Enums"]["facility_access_level"];
          created_at?: string;
          departments?: Database["public"]["Enums"]["service_module"][];
          facility_id?: string;
          home_location_id?: string | null;
          id?: string;
          is_active?: boolean;
          legacy_id?: string | null;
          profile_id?: string;
          role?: Database["public"]["Enums"]["facility_staff_role"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "facility_memberships_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facility_memberships_home_location_id_fkey";
            columns: ["home_location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facility_memberships_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      facility_modules: {
        Row: {
          created_at: string;
          enabled: boolean;
          expires_at: string | null;
          facility_id: string;
          granted_by: string | null;
          module_id: string;
          note: string;
          price_override_cents: number | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          enabled: boolean;
          expires_at?: string | null;
          facility_id: string;
          granted_by?: string | null;
          module_id: string;
          note?: string;
          price_override_cents?: number | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          expires_at?: string | null;
          facility_id?: string;
          granted_by?: string | null;
          module_id?: string;
          note?: string;
          price_override_cents?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "facility_modules_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facility_modules_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facility_modules_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      facility_position_pay: {
        Row: {
          facility_id: string;
          hourly_rate: number | null;
          pay_type: Database["public"]["Enums"]["position_pay_type"];
          position_id: string;
          salary: number | null;
          updated_at: string;
        };
        Insert: {
          facility_id: string;
          hourly_rate?: number | null;
          pay_type: Database["public"]["Enums"]["position_pay_type"];
          position_id: string;
          salary?: number | null;
          updated_at?: string;
        };
        Update: {
          facility_id?: string;
          hourly_rate?: number | null;
          pay_type?: Database["public"]["Enums"]["position_pay_type"];
          position_id?: string;
          salary?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "facility_position_pay_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facility_position_pay_position_id_fkey";
            columns: ["position_id"];
            isOneToOne: true;
            referencedRelation: "facility_positions";
            referencedColumns: ["id"];
          },
        ];
      };
      facility_positions: {
        Row: {
          color: string;
          created_at: string;
          department_id: string;
          description: string | null;
          facility_id: string;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          department_id: string;
          description?: string | null;
          facility_id: string;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          department_id?: string;
          description?: string | null;
          facility_id?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "facility_positions_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "facility_departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facility_positions_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      facility_role_permissions: {
        Row: {
          facility_id: string;
          permission_key: string;
          role: Database["public"]["Enums"]["facility_staff_role"];
          scope: Database["public"]["Enums"]["access_scope"];
        };
        Insert: {
          facility_id: string;
          permission_key: string;
          role: Database["public"]["Enums"]["facility_staff_role"];
          scope: Database["public"]["Enums"]["access_scope"];
        };
        Update: {
          facility_id?: string;
          permission_key?: string;
          role?: Database["public"]["Enums"]["facility_staff_role"];
          scope?: Database["public"]["Enums"]["access_scope"];
        };
        Relationships: [
          {
            foreignKeyName: "facility_role_permissions_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facility_role_permissions_permission_key_fkey";
            columns: ["permission_key"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["key"];
          },
        ];
      };
      facility_rooms: {
        Row: {
          active: boolean;
          capacity: number | null;
          category_id: string;
          color: string | null;
          created_at: string;
          description: string | null;
          facility_id: string;
          id: string;
          image_url: string | null;
          legacy_id: string;
          name: string;
          rules: Json;
          sort_order: number;
          staff_notes: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          capacity?: number | null;
          category_id: string;
          color?: string | null;
          created_at?: string;
          description?: string | null;
          facility_id: string;
          id?: string;
          image_url?: string | null;
          legacy_id: string;
          name: string;
          rules?: Json;
          sort_order?: number;
          staff_notes?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          capacity?: number | null;
          category_id?: string;
          color?: string | null;
          created_at?: string;
          description?: string | null;
          facility_id?: string;
          id?: string;
          image_url?: string | null;
          legacy_id?: string;
          name?: string;
          rules?: Json;
          sort_order?: number;
          staff_notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "facility_rooms_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "room_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facility_rooms_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      facility_settings: {
        Row: {
          domain: string;
          facility_id: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          domain: string;
          facility_id: string;
          updated_at?: string;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          domain?: string;
          facility_id?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "facility_settings_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facility_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      facility_subscriptions: {
        Row: {
          amount_cents: number;
          billing_cycle: string;
          cancelled_at: string | null;
          created_at: string;
          currency: string;
          facility_id: string;
          period_end: string | null;
          period_start: string;
          seats: number | null;
          status: Database["public"]["Enums"]["subscription_status"];
          tier_id: string;
          tier_name: string;
          trial_ends_at: string | null;
          updated_at: string;
        };
        Insert: {
          amount_cents?: number;
          billing_cycle?: string;
          cancelled_at?: string | null;
          created_at?: string;
          currency?: string;
          facility_id: string;
          period_end?: string | null;
          period_start?: string;
          seats?: number | null;
          status?: Database["public"]["Enums"]["subscription_status"];
          tier_id?: string;
          tier_name?: string;
          trial_ends_at?: string | null;
          updated_at?: string;
        };
        Update: {
          amount_cents?: number;
          billing_cycle?: string;
          cancelled_at?: string | null;
          created_at?: string;
          currency?: string;
          facility_id?: string;
          period_end?: string | null;
          period_start?: string;
          seats?: number | null;
          status?: Database["public"]["Enums"]["subscription_status"];
          tier_id?: string;
          tier_name?: string;
          trial_ends_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "facility_subscriptions_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: true;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facility_subscriptions_tier_id_fkey";
            columns: ["tier_id"];
            isOneToOne: false;
            referencedRelation: "subscription_tiers";
            referencedColumns: ["id"];
          },
        ];
      };
      facility_task_definitions: {
        Row: {
          category: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          estimated_minutes: number | null;
          facility_id: string;
          id: string;
          is_active: boolean;
          priority: string;
          requires_photo: boolean;
          requires_signoff: boolean;
          title: string;
          updated_at: string;
        };
        Insert: {
          category?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          estimated_minutes?: number | null;
          facility_id: string;
          id?: string;
          is_active?: boolean;
          priority?: string;
          requires_photo?: boolean;
          requires_signoff?: boolean;
          title: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          estimated_minutes?: number | null;
          facility_id?: string;
          id?: string;
          is_active?: boolean;
          priority?: string;
          requires_photo?: boolean;
          requires_signoff?: boolean;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "facility_task_definitions_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      facility_task_group_items: {
        Row: {
          definition_id: string;
          group_id: string;
          sort_order: number;
        };
        Insert: {
          definition_id: string;
          group_id: string;
          sort_order?: number;
        };
        Update: {
          definition_id?: string;
          group_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "facility_task_group_items_definition_id_fkey";
            columns: ["definition_id"];
            isOneToOne: false;
            referencedRelation: "facility_task_definitions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facility_task_group_items_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "facility_task_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      facility_task_groups: {
        Row: {
          created_at: string;
          created_by: string | null;
          days_of_week: number[];
          department_id: string | null;
          description: string | null;
          facility_id: string;
          id: string;
          is_active: boolean;
          is_recurring: boolean;
          name: string;
          scope: string;
          shift_key: string | null;
          specific_date: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          days_of_week?: number[];
          department_id?: string | null;
          description?: string | null;
          facility_id: string;
          id?: string;
          is_active?: boolean;
          is_recurring?: boolean;
          name: string;
          scope: string;
          shift_key?: string | null;
          specific_date?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          days_of_week?: number[];
          department_id?: string | null;
          description?: string | null;
          facility_id?: string;
          id?: string;
          is_active?: boolean;
          is_recurring?: boolean;
          name?: string;
          scope?: string;
          shift_key?: string | null;
          specific_date?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "facility_task_groups_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "facility_departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facility_task_groups_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      facility_tasks: {
        Row: {
          assigned_to: string | null;
          category: string;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          due_at: string | null;
          estimated_minutes: number | null;
          facility_id: string;
          id: string;
          metadata: Json;
          notes: string | null;
          priority: string;
          requires_photo: boolean;
          requires_signoff: boolean;
          source: string;
          source_ref: string | null;
          status: string;
          template_id: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          category?: string;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          due_at?: string | null;
          estimated_minutes?: number | null;
          facility_id: string;
          id?: string;
          metadata?: Json;
          notes?: string | null;
          priority?: string;
          requires_photo?: boolean;
          requires_signoff?: boolean;
          source?: string;
          source_ref?: string | null;
          status?: string;
          template_id?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          category?: string;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          due_at?: string | null;
          estimated_minutes?: number | null;
          facility_id?: string;
          id?: string;
          metadata?: Json;
          notes?: string | null;
          priority?: string;
          requires_photo?: boolean;
          requires_signoff?: boolean;
          source?: string;
          source_ref?: string | null;
          status?: string;
          template_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "facility_tasks_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "facility_tasks_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facility_tasks_completed_by_fkey";
            columns: ["completed_by"];
            isOneToOne: false;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "facility_tasks_completed_by_fkey";
            columns: ["completed_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facility_tasks_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facility_tasks_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "task_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      facility_terminals: {
        Row: {
          created_at: string;
          facility_id: string;
          id: string;
          is_active: boolean;
          is_default: boolean;
          label: string;
          location_id: string | null;
          serial: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          facility_id: string;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          label: string;
          location_id?: string | null;
          serial: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          facility_id?: string;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          label?: string;
          location_id?: string | null;
          serial?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "facility_terminals_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facility_terminals_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      form_submissions: {
        Row: {
          answers: Json;
          booking_id: string | null;
          client_id: string | null;
          created_at: string;
          facility_id: string;
          form_id: string | null;
          form_version_id: string;
          id: string;
          pet_id: string | null;
          score: number | null;
          score_details: Json | null;
          score_outcome: string | null;
          staff_assistant_id: string | null;
          staff_assisted: boolean;
          status: string;
          submitted_at: string;
          submitted_by: string | null;
          updated_at: string;
        };
        Insert: {
          answers?: Json;
          booking_id?: string | null;
          client_id?: string | null;
          created_at?: string;
          facility_id: string;
          form_id?: string | null;
          form_version_id: string;
          id?: string;
          pet_id?: string | null;
          score?: number | null;
          score_details?: Json | null;
          score_outcome?: string | null;
          staff_assistant_id?: string | null;
          staff_assisted?: boolean;
          status?: string;
          submitted_at?: string;
          submitted_by?: string | null;
          updated_at?: string;
        };
        Update: {
          answers?: Json;
          booking_id?: string | null;
          client_id?: string | null;
          created_at?: string;
          facility_id?: string;
          form_id?: string | null;
          form_version_id?: string;
          id?: string;
          pet_id?: string | null;
          score?: number | null;
          score_details?: Json | null;
          score_outcome?: string | null;
          staff_assistant_id?: string | null;
          staff_assisted?: boolean;
          status?: string;
          submitted_at?: string;
          submitted_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "form_submissions_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "form_submissions_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "form_submissions_form_version_id_fkey";
            columns: ["form_version_id"];
            isOneToOne: false;
            referencedRelation: "form_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      form_versions: {
        Row: {
          created_at: string;
          created_by: string | null;
          facility_id: string;
          form_id: string;
          id: string;
          published_at: string | null;
          schema: Json;
          version_number: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          facility_id: string;
          form_id: string;
          id?: string;
          published_at?: string | null;
          schema?: Json;
          version_number: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          facility_id?: string;
          form_id?: string;
          id?: string;
          published_at?: string | null;
          schema?: Json;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "form_versions_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "form_versions_form_id_fkey";
            columns: ["form_id"];
            isOneToOne: false;
            referencedRelation: "forms";
            referencedColumns: ["id"];
          },
        ];
      };
      forms: {
        Row: {
          applies_to: Json;
          audience: string;
          created_at: string;
          created_by: string | null;
          facility_id: string;
          id: string;
          name: string;
          repeat_per_pet: boolean;
          require_auth: boolean;
          settings: Json;
          slug: string;
          status: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          applies_to?: Json;
          audience?: string;
          created_at?: string;
          created_by?: string | null;
          facility_id: string;
          id?: string;
          name: string;
          repeat_per_pet?: boolean;
          require_auth?: boolean;
          settings?: Json;
          slug: string;
          status?: string;
          type?: string;
          updated_at?: string;
        };
        Update: {
          applies_to?: Json;
          audience?: string;
          created_at?: string;
          created_by?: string | null;
          facility_id?: string;
          id?: string;
          name?: string;
          repeat_per_pet?: boolean;
          require_auth?: boolean;
          settings?: Json;
          slug?: string;
          status?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "forms_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      gift_card_transactions: {
        Row: {
          amount: number;
          balance_after: number;
          booking_id: string | null;
          created_at: string;
          created_by: string | null;
          facility_id: string;
          gift_card_id: string;
          id: string;
          kind: string;
          note: string | null;
        };
        Insert: {
          amount: number;
          balance_after: number;
          booking_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          facility_id: string;
          gift_card_id: string;
          id?: string;
          kind: string;
          note?: string | null;
        };
        Update: {
          amount?: number;
          balance_after?: number;
          booking_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          facility_id?: string;
          gift_card_id?: string;
          id?: string;
          kind?: string;
          note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "gift_card_transactions_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gift_card_transactions_gift_card_id_fkey";
            columns: ["gift_card_id"];
            isOneToOne: false;
            referencedRelation: "gift_cards";
            referencedColumns: ["id"];
          },
        ];
      };
      gift_cards: {
        Row: {
          balance: number;
          code: string;
          created_at: string;
          currency: string;
          expires_at: string | null;
          facility_id: string;
          id: string;
          initial_amount: number;
          issued_at: string;
          issued_by: string | null;
          kind: string;
          last_used_at: string | null;
          message: string | null;
          purchased_by_client_id: string | null;
          recipient_email: string | null;
          recipient_name: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          balance?: number;
          code: string;
          created_at?: string;
          currency?: string;
          expires_at?: string | null;
          facility_id: string;
          id?: string;
          initial_amount: number;
          issued_at?: string;
          issued_by?: string | null;
          kind?: string;
          last_used_at?: string | null;
          message?: string | null;
          purchased_by_client_id?: string | null;
          recipient_email?: string | null;
          recipient_name?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          balance?: number;
          code?: string;
          created_at?: string;
          currency?: string;
          expires_at?: string | null;
          facility_id?: string;
          id?: string;
          initial_amount?: number;
          issued_at?: string;
          issued_by?: string | null;
          kind?: string;
          last_used_at?: string | null;
          message?: string | null;
          purchased_by_client_id?: string | null;
          recipient_email?: string | null;
          recipient_name?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gift_cards_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gift_cards_purchased_by_client_id_fkey";
            columns: ["purchased_by_client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      grooming_add_ons: {
        Row: {
          created_at: string;
          description: string;
          display_order: number;
          duration_min: number;
          facility_id: string;
          id: string;
          is_active: boolean;
          legacy_id: string | null;
          name: string;
          price: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          display_order?: number;
          duration_min?: number;
          facility_id: string;
          id?: string;
          is_active?: boolean;
          legacy_id?: string | null;
          name: string;
          price?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          display_order?: number;
          duration_min?: number;
          facility_id?: string;
          id?: string;
          is_active?: boolean;
          legacy_id?: string | null;
          name?: string;
          price?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grooming_add_ons_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      grooming_alert_notes: {
        Row: {
          applies_to_future: boolean;
          author_name: string;
          body: string;
          booking_id: string;
          created_at: string;
          created_by: string | null;
          facility_id: string;
          id: string;
        };
        Insert: {
          applies_to_future?: boolean;
          author_name?: string;
          body: string;
          booking_id: string;
          created_at?: string;
          created_by?: string | null;
          facility_id: string;
          id?: string;
        };
        Update: {
          applies_to_future?: boolean;
          author_name?: string;
          body?: string;
          booking_id?: string;
          created_at?: string;
          created_by?: string | null;
          facility_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grooming_alert_notes_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "grooming_appointments";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "grooming_alert_notes_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      grooming_appointment_add_ons: {
        Row: {
          add_on_id: string | null;
          auto_attached: boolean;
          booking_id: string;
          created_at: string;
          duration_min: number;
          facility_id: string;
          id: string;
          name: string;
          price: number;
        };
        Insert: {
          add_on_id?: string | null;
          auto_attached?: boolean;
          booking_id: string;
          created_at?: string;
          duration_min?: number;
          facility_id: string;
          id?: string;
          name: string;
          price?: number;
        };
        Update: {
          add_on_id?: string | null;
          auto_attached?: boolean;
          booking_id?: string;
          created_at?: string;
          duration_min?: number;
          facility_id?: string;
          id?: string;
          name?: string;
          price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "grooming_appointment_add_ons_add_on_id_fkey";
            columns: ["add_on_id"];
            isOneToOne: false;
            referencedRelation: "grooming_add_ons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grooming_appointment_add_ons_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "grooming_appointments";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "grooming_appointment_add_ons_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      grooming_appointment_history: {
        Row: {
          after_value: string | null;
          author_name: string;
          before_value: string | null;
          booking_id: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          facility_id: string;
          field: string | null;
          id: string;
          kind: string;
        };
        Insert: {
          after_value?: string | null;
          author_name?: string;
          before_value?: string | null;
          booking_id: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          facility_id: string;
          field?: string | null;
          id?: string;
          kind: string;
        };
        Update: {
          after_value?: string | null;
          author_name?: string;
          before_value?: string | null;
          booking_id?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          facility_id?: string;
          field?: string | null;
          id?: string;
          kind?: string;
        };
        Relationships: [];
      };
      grooming_appointments: {
        Row: {
          booking_id: string;
          check_in_at: string | null;
          check_out_at: string | null;
          created_at: string;
          estimated_ready_at: string | null;
          facility_id: string;
          groomer_notes: string;
          owner_eta_notified_at: string | null;
          service_duration_min: number;
          service_id: string | null;
          service_name: string;
          service_price: number;
          session_progress: Json;
          size_label: string | null;
          station_id: string | null;
          updated_at: string;
        };
        Insert: {
          booking_id: string;
          check_in_at?: string | null;
          check_out_at?: string | null;
          created_at?: string;
          estimated_ready_at?: string | null;
          facility_id: string;
          groomer_notes?: string;
          owner_eta_notified_at?: string | null;
          service_duration_min: number;
          service_id?: string | null;
          service_name: string;
          service_price?: number;
          session_progress?: Json;
          size_label?: string | null;
          station_id?: string | null;
          updated_at?: string;
        };
        Update: {
          booking_id?: string;
          check_in_at?: string | null;
          check_out_at?: string | null;
          created_at?: string;
          estimated_ready_at?: string | null;
          facility_id?: string;
          groomer_notes?: string;
          owner_eta_notified_at?: string | null;
          service_duration_min?: number;
          service_id?: string | null;
          service_name?: string;
          service_price?: number;
          session_progress?: Json;
          size_label?: string | null;
          station_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grooming_appointments_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "booking_presence";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "grooming_appointments_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grooming_appointments_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grooming_appointments_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "grooming_services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grooming_appointments_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "grooming_stations";
            referencedColumns: ["id"];
          },
        ];
      };
      grooming_config: {
        Row: {
          created_at: string;
          facility_id: string;
          offers_mobile: boolean;
          offers_salon: boolean;
          pet_size_tiers: Json;
          progress_checklist_enabled: boolean;
          require_after_photos: boolean;
          require_before_photos: boolean;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          facility_id: string;
          offers_mobile?: boolean;
          offers_salon?: boolean;
          pet_size_tiers?: Json;
          progress_checklist_enabled?: boolean;
          require_after_photos?: boolean;
          require_before_photos?: boolean;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          facility_id?: string;
          offers_mobile?: boolean;
          offers_salon?: boolean;
          pet_size_tiers?: Json;
          progress_checklist_enabled?: boolean;
          require_after_photos?: boolean;
          require_before_photos?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grooming_config_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: true;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      grooming_intake: {
        Row: {
          allergies: string[];
          arrival_behavior: string | null;
          arrival_coat_condition: string | null;
          arrival_health_flags: string[];
          author_name: string;
          behavior_notes: string;
          booking_id: string;
          coat_condition: string;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          drop_off_observations: string | null;
          facility_id: string;
          matting_fee_amount: number | null;
          matting_fee_warning: boolean;
          mood_tags: string[];
          session_notes: string | null;
          session_started_at: string | null;
          special_instructions: string;
          updated_at: string;
        };
        Insert: {
          allergies?: string[];
          arrival_behavior?: string | null;
          arrival_coat_condition?: string | null;
          arrival_health_flags?: string[];
          author_name?: string;
          behavior_notes?: string;
          booking_id: string;
          coat_condition?: string;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          drop_off_observations?: string | null;
          facility_id: string;
          matting_fee_amount?: number | null;
          matting_fee_warning?: boolean;
          mood_tags?: string[];
          session_notes?: string | null;
          session_started_at?: string | null;
          special_instructions?: string;
          updated_at?: string;
        };
        Update: {
          allergies?: string[];
          arrival_behavior?: string | null;
          arrival_coat_condition?: string | null;
          arrival_health_flags?: string[];
          author_name?: string;
          behavior_notes?: string;
          booking_id?: string;
          coat_condition?: string;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          drop_off_observations?: string | null;
          facility_id?: string;
          matting_fee_amount?: number | null;
          matting_fee_warning?: boolean;
          mood_tags?: string[];
          session_notes?: string | null;
          session_started_at?: string | null;
          special_instructions?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grooming_intake_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "grooming_appointments";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "grooming_intake_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      grooming_photos: {
        Row: {
          author_name: string;
          booking_id: string;
          caption: string | null;
          content_type: string;
          created_at: string;
          created_by: string | null;
          facility_id: string;
          id: string;
          kind: string;
          size_bytes: number;
          storage_path: string;
        };
        Insert: {
          author_name?: string;
          booking_id: string;
          caption?: string | null;
          content_type: string;
          created_at?: string;
          created_by?: string | null;
          facility_id: string;
          id?: string;
          kind: string;
          size_bytes: number;
          storage_path: string;
        };
        Update: {
          author_name?: string;
          booking_id?: string;
          caption?: string | null;
          content_type?: string;
          created_at?: string;
          created_by?: string | null;
          facility_id?: string;
          id?: string;
          kind?: string;
          size_bytes?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grooming_photos_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "grooming_appointments";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "grooming_photos_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      grooming_price_adjustments: {
        Row: {
          amount: number;
          booking_id: string;
          created_at: string;
          created_by: string | null;
          custom_reason: string | null;
          customer_notified: boolean;
          facility_id: string;
          id: string;
          note: string;
          notified_at: string | null;
          reason: string;
        };
        Insert: {
          amount: number;
          booking_id: string;
          created_at?: string;
          created_by?: string | null;
          custom_reason?: string | null;
          customer_notified?: boolean;
          facility_id: string;
          id?: string;
          note?: string;
          notified_at?: string | null;
          reason: string;
        };
        Update: {
          amount?: number;
          booking_id?: string;
          created_at?: string;
          created_by?: string | null;
          custom_reason?: string | null;
          customer_notified?: boolean;
          facility_id?: string;
          id?: string;
          note?: string;
          notified_at?: string | null;
          reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grooming_price_adjustments_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "grooming_appointments";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "grooming_price_adjustments_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      grooming_service_default_add_ons: {
        Row: {
          add_on_id: string;
          created_at: string;
          facility_id: string;
          id: string;
          removable: boolean;
          service_id: string;
          when_breeds: string[];
          when_coat_types: string[];
          when_pet_sizes: string[];
        };
        Insert: {
          add_on_id: string;
          created_at?: string;
          facility_id: string;
          id?: string;
          removable?: boolean;
          service_id: string;
          when_breeds?: string[];
          when_coat_types?: string[];
          when_pet_sizes?: string[];
        };
        Update: {
          add_on_id?: string;
          created_at?: string;
          facility_id?: string;
          id?: string;
          removable?: boolean;
          service_id?: string;
          when_breeds?: string[];
          when_coat_types?: string[];
          when_pet_sizes?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "grooming_service_default_add_ons_add_on_id_fkey";
            columns: ["add_on_id"];
            isOneToOne: false;
            referencedRelation: "grooming_add_ons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grooming_service_default_add_ons_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grooming_service_default_add_ons_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "grooming_services";
            referencedColumns: ["id"];
          },
        ];
      };
      grooming_service_size_prices: {
        Row: {
          created_at: string;
          duration_min: number | null;
          facility_id: string;
          id: string;
          location_id: string | null;
          price: number;
          service_id: string;
          size_label: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          duration_min?: number | null;
          facility_id: string;
          id?: string;
          location_id?: string | null;
          price: number;
          service_id: string;
          size_label: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          duration_min?: number | null;
          facility_id?: string;
          id?: string;
          location_id?: string | null;
          price?: number;
          service_id?: string;
          size_label?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grooming_service_size_prices_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grooming_service_size_prices_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grooming_service_size_prices_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "grooming_services";
            referencedColumns: ["id"];
          },
        ];
      };
      grooming_services: {
        Row: {
          base_price: number;
          coat_adjustment_mode: string;
          coat_adjustments: Json;
          color: string | null;
          created_at: string;
          description: string;
          display_order: number;
          duration_min: number;
          eligible_breeds: string[];
          eligible_coat_types: string[];
          eligible_pet_sizes: string[];
          facility_id: string;
          id: string;
          image_url: string | null;
          includes: string[];
          is_active: boolean;
          is_popular: boolean;
          legacy_id: string | null;
          matted_surcharge_default: number;
          max_per_day: number | null;
          min_booking_notice_hours: number | null;
          name: string;
          required_skill_level: string | null;
          updated_at: string;
        };
        Insert: {
          base_price?: number;
          coat_adjustment_mode?: string;
          coat_adjustments?: Json;
          color?: string | null;
          created_at?: string;
          description?: string;
          display_order?: number;
          duration_min: number;
          eligible_breeds?: string[];
          eligible_coat_types?: string[];
          eligible_pet_sizes?: string[];
          facility_id: string;
          id?: string;
          image_url?: string | null;
          includes?: string[];
          is_active?: boolean;
          is_popular?: boolean;
          legacy_id?: string | null;
          matted_surcharge_default?: number;
          max_per_day?: number | null;
          min_booking_notice_hours?: number | null;
          name: string;
          required_skill_level?: string | null;
          updated_at?: string;
        };
        Update: {
          base_price?: number;
          coat_adjustment_mode?: string;
          coat_adjustments?: Json;
          color?: string | null;
          created_at?: string;
          description?: string;
          display_order?: number;
          duration_min?: number;
          eligible_breeds?: string[];
          eligible_coat_types?: string[];
          eligible_pet_sizes?: string[];
          facility_id?: string;
          id?: string;
          image_url?: string | null;
          includes?: string[];
          is_active?: boolean;
          is_popular?: boolean;
          legacy_id?: string | null;
          matted_surcharge_default?: number;
          max_per_day?: number | null;
          min_booking_notice_hours?: number | null;
          name?: string;
          required_skill_level?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grooming_services_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      grooming_stations: {
        Row: {
          active: boolean;
          allowed_pet_sizes: string[];
          created_at: string;
          display_order: number;
          facility_id: string;
          id: string;
          image_url: string | null;
          legacy_id: string | null;
          max_weight_lbs: number | null;
          name: string;
          pet_types: string[];
          staff_notes: string;
          status: string;
          status_changed_at: string | null;
          type: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          allowed_pet_sizes?: string[];
          created_at?: string;
          display_order?: number;
          facility_id: string;
          id?: string;
          image_url?: string | null;
          legacy_id?: string | null;
          max_weight_lbs?: number | null;
          name: string;
          pet_types?: string[];
          staff_notes?: string;
          status?: string;
          status_changed_at?: string | null;
          type: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          allowed_pet_sizes?: string[];
          created_at?: string;
          display_order?: number;
          facility_id?: string;
          id?: string;
          image_url?: string | null;
          legacy_id?: string | null;
          max_weight_lbs?: number | null;
          name?: string;
          pet_types?: string[];
          staff_notes?: string;
          status?: string;
          status_changed_at?: string | null;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grooming_stations_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      grooming_stylist_availability: {
        Row: {
          created_at: string;
          day_of_week: number;
          end_time: string;
          facility_id: string;
          id: string;
          is_available: boolean;
          staff_id: string;
          start_time: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          day_of_week: number;
          end_time: string;
          facility_id: string;
          id?: string;
          is_available?: boolean;
          staff_id: string;
          start_time: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          day_of_week?: number;
          end_time?: string;
          facility_id?: string;
          id?: string;
          is_available?: boolean;
          staff_id?: string;
          start_time?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grooming_stylist_availability_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grooming_stylist_availability_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "grooming_stylist_availability_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      grooming_stylist_profiles: {
        Row: {
          bio: string;
          calendar_color: string | null;
          can_handle_aggressive: boolean;
          can_handle_anxious: boolean;
          can_handle_matted: boolean;
          certifications: string[];
          created_at: string;
          facility_id: string;
          id: string;
          legacy_id: string | null;
          max_concurrent_appointments: number;
          max_daily_appointments: number;
          max_weekly_appointments: number | null;
          notification_prefs: Json | null;
          on_leave: boolean;
          preferred_pet_sizes: string[];
          qualified_service_ids: string[];
          skill_level: string;
          specializations: string[];
          staff_id: string;
          updated_at: string;
          visible_online: boolean;
          years_experience: number;
        };
        Insert: {
          bio?: string;
          calendar_color?: string | null;
          can_handle_aggressive?: boolean;
          can_handle_anxious?: boolean;
          can_handle_matted?: boolean;
          certifications?: string[];
          created_at?: string;
          facility_id: string;
          id?: string;
          legacy_id?: string | null;
          max_concurrent_appointments?: number;
          max_daily_appointments?: number;
          max_weekly_appointments?: number | null;
          notification_prefs?: Json | null;
          on_leave?: boolean;
          preferred_pet_sizes?: string[];
          qualified_service_ids?: string[];
          skill_level?: string;
          specializations?: string[];
          staff_id: string;
          updated_at?: string;
          visible_online?: boolean;
          years_experience?: number;
        };
        Update: {
          bio?: string;
          calendar_color?: string | null;
          can_handle_aggressive?: boolean;
          can_handle_anxious?: boolean;
          can_handle_matted?: boolean;
          certifications?: string[];
          created_at?: string;
          facility_id?: string;
          id?: string;
          legacy_id?: string | null;
          max_concurrent_appointments?: number;
          max_daily_appointments?: number;
          max_weekly_appointments?: number | null;
          notification_prefs?: Json | null;
          on_leave?: boolean;
          preferred_pet_sizes?: string[];
          qualified_service_ids?: string[];
          skill_level?: string;
          specializations?: string[];
          staff_id?: string;
          updated_at?: string;
          visible_online?: boolean;
          years_experience?: number;
        };
        Relationships: [
          {
            foreignKeyName: "grooming_stylist_profiles_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grooming_stylist_profiles_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: true;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "grooming_stylist_profiles_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: true;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      grooming_ticket_comments: {
        Row: {
          author_name: string;
          booking_id: string;
          created_at: string;
          created_by: string | null;
          facility_id: string;
          id: string;
          message: string;
        };
        Insert: {
          author_name?: string;
          booking_id: string;
          created_at?: string;
          created_by?: string | null;
          facility_id: string;
          id?: string;
          message: string;
        };
        Update: {
          author_name?: string;
          booking_id?: string;
          created_at?: string;
          created_by?: string | null;
          facility_id?: string;
          id?: string;
          message?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grooming_ticket_comments_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "grooming_appointments";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "grooming_ticket_comments_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      grooming_waitlist_entries: {
        Row: {
          added_at: string;
          anchor_date: string;
          client_id: string | null;
          comment: string | null;
          created_at: string;
          excluded_dates: string[];
          expected_date: string | null;
          expected_date_kind: string;
          expected_days_of_week: number[] | null;
          expected_end_date: string | null;
          expected_period: string | null;
          expected_start_date: string | null;
          expected_time: string | null;
          expected_time_kind: string;
          facility_id: string;
          id: string;
          legacy_id: string | null;
          offer_window_minutes: number;
          offered_at: string | null;
          offered_slot: string | null;
          offered_until: string | null;
          owner_email: string | null;
          owner_name: string;
          owner_phone: string;
          pet_breed: string;
          pet_id: string | null;
          pet_name: string;
          postal_code: string | null;
          preferred_staff_ids: string[];
          service_id: string | null;
          service_name: string;
          source: string;
          status: string;
          updated_at: string;
          valid_until: string | null;
        };
        Insert: {
          added_at?: string;
          anchor_date?: string;
          client_id?: string | null;
          comment?: string | null;
          created_at?: string;
          excluded_dates?: string[];
          expected_date?: string | null;
          expected_date_kind: string;
          expected_days_of_week?: number[] | null;
          expected_end_date?: string | null;
          expected_period?: string | null;
          expected_start_date?: string | null;
          expected_time?: string | null;
          expected_time_kind?: string;
          facility_id: string;
          id?: string;
          legacy_id?: string | null;
          offer_window_minutes?: number;
          offered_at?: string | null;
          offered_slot?: string | null;
          offered_until?: string | null;
          owner_email?: string | null;
          owner_name: string;
          owner_phone?: string;
          pet_breed?: string;
          pet_id?: string | null;
          pet_name: string;
          postal_code?: string | null;
          preferred_staff_ids?: string[];
          service_id?: string | null;
          service_name: string;
          source?: string;
          status?: string;
          updated_at?: string;
          valid_until?: string | null;
        };
        Update: {
          added_at?: string;
          anchor_date?: string;
          client_id?: string | null;
          comment?: string | null;
          created_at?: string;
          excluded_dates?: string[];
          expected_date?: string | null;
          expected_date_kind?: string;
          expected_days_of_week?: number[] | null;
          expected_end_date?: string | null;
          expected_period?: string | null;
          expected_start_date?: string | null;
          expected_time?: string | null;
          expected_time_kind?: string;
          facility_id?: string;
          id?: string;
          legacy_id?: string | null;
          offer_window_minutes?: number;
          offered_at?: string | null;
          offered_slot?: string | null;
          offered_until?: string | null;
          owner_email?: string | null;
          owner_name?: string;
          owner_phone?: string;
          pet_breed?: string;
          pet_id?: string | null;
          pet_name?: string;
          postal_code?: string | null;
          preferred_staff_ids?: string[];
          service_id?: string | null;
          service_name?: string;
          source?: string;
          status?: string;
          updated_at?: string;
          valid_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "grooming_waitlist_entries_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grooming_waitlist_entries_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grooming_waitlist_entries_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grooming_waitlist_entries_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "grooming_services";
            referencedColumns: ["id"];
          },
        ];
      };
      locations: {
        Row: {
          address: Json | null;
          capacity: Json;
          color: string | null;
          created_at: string;
          email: string | null;
          facility_id: string;
          id: string;
          is_primary: boolean;
          legacy_id: string | null;
          name: string;
          phone: string | null;
          short_code: string | null;
          status: string;
          timezone: string | null;
          updated_at: string;
        };
        Insert: {
          address?: Json | null;
          capacity?: Json;
          color?: string | null;
          created_at?: string;
          email?: string | null;
          facility_id: string;
          id?: string;
          is_primary?: boolean;
          legacy_id?: string | null;
          name: string;
          phone?: string | null;
          short_code?: string | null;
          status?: string;
          timezone?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: Json | null;
          capacity?: Json;
          color?: string | null;
          created_at?: string;
          email?: string | null;
          facility_id?: string;
          id?: string;
          is_primary?: boolean;
          legacy_id?: string | null;
          name?: string;
          phone?: string | null;
          short_code?: string | null;
          status?: string;
          timezone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "locations_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      loyalty_accounts: {
        Row: {
          client_id: string;
          created_at: string;
          credit_balance: number;
          current_tier_id: string | null;
          facility_id: string;
          id: string;
          lifetime_points_earned: number;
          lifetime_points_redeemed: number;
          points_balance: number;
          referral_code: string | null;
          tier_joined_at: string | null;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          credit_balance?: number;
          current_tier_id?: string | null;
          facility_id: string;
          id?: string;
          lifetime_points_earned?: number;
          lifetime_points_redeemed?: number;
          points_balance?: number;
          referral_code?: string | null;
          tier_joined_at?: string | null;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          credit_balance?: number;
          current_tier_id?: string | null;
          facility_id?: string;
          id?: string;
          lifetime_points_earned?: number;
          lifetime_points_redeemed?: number;
          points_balance?: number;
          referral_code?: string | null;
          tier_joined_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "loyalty_accounts_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loyalty_accounts_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      loyalty_badge_awards: {
        Row: {
          account_id: string;
          badge_id: string;
          earned_at: string;
          facility_id: string;
          id: string;
          points_awarded: number;
          voucher_id: string | null;
        };
        Insert: {
          account_id: string;
          badge_id: string;
          earned_at?: string;
          facility_id: string;
          id?: string;
          points_awarded?: number;
          voucher_id?: string | null;
        };
        Update: {
          account_id?: string;
          badge_id?: string;
          earned_at?: string;
          facility_id?: string;
          id?: string;
          points_awarded?: number;
          voucher_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "loyalty_badge_awards_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "loyalty_account_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loyalty_badge_awards_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "loyalty_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loyalty_badge_awards_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loyalty_badge_awards_voucher_id_fkey";
            columns: ["voucher_id"];
            isOneToOne: false;
            referencedRelation: "loyalty_vouchers";
            referencedColumns: ["id"];
          },
        ];
      };
      loyalty_transactions: {
        Row: {
          account_id: string;
          booking_id: string | null;
          created_at: string;
          description: string;
          facility_id: string;
          id: string;
          kind: string;
          points: number;
          reason: string | null;
          source: string;
          source_id: string | null;
          staff_id: string | null;
        };
        Insert: {
          account_id: string;
          booking_id?: string | null;
          created_at?: string;
          description: string;
          facility_id: string;
          id?: string;
          kind: string;
          points: number;
          reason?: string | null;
          source: string;
          source_id?: string | null;
          staff_id?: string | null;
        };
        Update: {
          account_id?: string;
          booking_id?: string | null;
          created_at?: string;
          description?: string;
          facility_id?: string;
          id?: string;
          kind?: string;
          points?: number;
          reason?: string | null;
          source?: string;
          source_id?: string | null;
          staff_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "loyalty_account_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loyalty_transactions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "loyalty_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loyalty_transactions_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "booking_presence";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "loyalty_transactions_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loyalty_transactions_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loyalty_transactions_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "loyalty_transactions_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      loyalty_vouchers: {
        Row: {
          account_id: string;
          applies_to_services: string[] | null;
          expires_at: string | null;
          facility_id: string;
          id: string;
          issued_at: string;
          points_spent: number;
          reward_type: string;
          reward_value: number;
          status: string;
          used_at: string | null;
          used_on_booking_id: string | null;
        };
        Insert: {
          account_id: string;
          applies_to_services?: string[] | null;
          expires_at?: string | null;
          facility_id: string;
          id?: string;
          issued_at?: string;
          points_spent?: number;
          reward_type: string;
          reward_value: number;
          status?: string;
          used_at?: string | null;
          used_on_booking_id?: string | null;
        };
        Update: {
          account_id?: string;
          applies_to_services?: string[] | null;
          expires_at?: string | null;
          facility_id?: string;
          id?: string;
          issued_at?: string;
          points_spent?: number;
          reward_type?: string;
          reward_value?: number;
          status?: string;
          used_at?: string | null;
          used_on_booking_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "loyalty_vouchers_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "loyalty_account_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loyalty_vouchers_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "loyalty_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loyalty_vouchers_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loyalty_vouchers_used_on_booking_id_fkey";
            columns: ["used_on_booking_id"];
            isOneToOne: false;
            referencedRelation: "booking_presence";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "loyalty_vouchers_used_on_booking_id_fkey";
            columns: ["used_on_booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      membership_permissions: {
        Row: {
          membership_id: string;
          permission_key: string;
          scope: Database["public"]["Enums"]["access_scope"];
        };
        Insert: {
          membership_id: string;
          permission_key: string;
          scope: Database["public"]["Enums"]["access_scope"];
        };
        Update: {
          membership_id?: string;
          permission_key?: string;
          scope?: Database["public"]["Enums"]["access_scope"];
        };
        Relationships: [
          {
            foreignKeyName: "membership_permissions_membership_id_fkey";
            columns: ["membership_id"];
            isOneToOne: false;
            referencedRelation: "facility_memberships";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "membership_permissions_permission_key_fkey";
            columns: ["permission_key"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["key"];
          },
        ];
      };
      merchant_application_documents: {
        Row: {
          application_id: string;
          content_type: string;
          created_at: string;
          doc_type: string;
          facility_id: string;
          file_name: string;
          id: string;
          principal_id: string | null;
          purged_at: string | null;
          size_bytes: number;
          storage_path: string;
          uploaded_at: string;
          uploaded_by: string | null;
        };
        Insert: {
          application_id: string;
          content_type: string;
          created_at?: string;
          doc_type: string;
          facility_id: string;
          file_name: string;
          id?: string;
          principal_id?: string | null;
          purged_at?: string | null;
          size_bytes: number;
          storage_path: string;
          uploaded_at?: string;
          uploaded_by?: string | null;
        };
        Update: {
          application_id?: string;
          content_type?: string;
          created_at?: string;
          doc_type?: string;
          facility_id?: string;
          file_name?: string;
          id?: string;
          principal_id?: string | null;
          purged_at?: string | null;
          size_bytes?: number;
          storage_path?: string;
          uploaded_at?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "merchant_application_documents_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "merchant_applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "merchant_application_documents_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "merchant_application_documents_principal_id_fkey";
            columns: ["principal_id"];
            isOneToOne: false;
            referencedRelation: "merchant_application_principals";
            referencedColumns: ["id"];
          },
        ];
      };
      merchant_application_principals: {
        Row: {
          address_line1: string | null;
          address_line2: string | null;
          application_id: string;
          city: string | null;
          country: string | null;
          created_at: string;
          date_of_birth: string | null;
          email: string | null;
          facility_id: string;
          full_name: string;
          id: string;
          is_control_person: boolean;
          national_id_last4: string | null;
          national_id_secret_id: string | null;
          ownership_percent: number | null;
          phone: string | null;
          postal_code: string | null;
          region: string | null;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          address_line1?: string | null;
          address_line2?: string | null;
          application_id: string;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          email?: string | null;
          facility_id: string;
          full_name: string;
          id?: string;
          is_control_person?: boolean;
          national_id_last4?: string | null;
          national_id_secret_id?: string | null;
          ownership_percent?: number | null;
          phone?: string | null;
          postal_code?: string | null;
          region?: string | null;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          address_line1?: string | null;
          address_line2?: string | null;
          application_id?: string;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          email?: string | null;
          facility_id?: string;
          full_name?: string;
          id?: string;
          is_control_person?: boolean;
          national_id_last4?: string | null;
          national_id_secret_id?: string | null;
          ownership_percent?: number | null;
          phone?: string | null;
          postal_code?: string | null;
          region?: string | null;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "merchant_application_principals_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "merchant_applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "merchant_application_principals_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      merchant_applications: {
        Row: {
          address_line1: string | null;
          address_line2: string | null;
          average_ticket_cents: number | null;
          bank_account_name: string | null;
          bank_last4: string | null;
          bank_secret_id: string | null;
          business_email: string | null;
          business_phone: string | null;
          business_structure: string | null;
          card_not_present_percent: number | null;
          city: string | null;
          country: string | null;
          created_at: string;
          created_by: string | null;
          decided_at: string | null;
          estimated_monthly_volume_cents: number | null;
          external_reference: string | null;
          facility_id: string;
          highest_ticket_cents: number | null;
          id: string;
          incorporated_on: string | null;
          legal_name: string | null;
          mcc: string | null;
          postal_code: string | null;
          purged_at: string | null;
          refund_policy: string | null;
          region: string | null;
          signed_at: string | null;
          signed_by: string | null;
          signed_ip: string | null;
          signed_name: string | null;
          signed_terms: string | null;
          signed_title: string | null;
          status: string;
          status_detail: string | null;
          submitted_at: string | null;
          tax_id: string | null;
          trading_name: string | null;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          address_line1?: string | null;
          address_line2?: string | null;
          average_ticket_cents?: number | null;
          bank_account_name?: string | null;
          bank_last4?: string | null;
          bank_secret_id?: string | null;
          business_email?: string | null;
          business_phone?: string | null;
          business_structure?: string | null;
          card_not_present_percent?: number | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          decided_at?: string | null;
          estimated_monthly_volume_cents?: number | null;
          external_reference?: string | null;
          facility_id: string;
          highest_ticket_cents?: number | null;
          id?: string;
          incorporated_on?: string | null;
          legal_name?: string | null;
          mcc?: string | null;
          postal_code?: string | null;
          purged_at?: string | null;
          refund_policy?: string | null;
          region?: string | null;
          signed_at?: string | null;
          signed_by?: string | null;
          signed_ip?: string | null;
          signed_name?: string | null;
          signed_terms?: string | null;
          signed_title?: string | null;
          status?: string;
          status_detail?: string | null;
          submitted_at?: string | null;
          tax_id?: string | null;
          trading_name?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          address_line1?: string | null;
          address_line2?: string | null;
          average_ticket_cents?: number | null;
          bank_account_name?: string | null;
          bank_last4?: string | null;
          bank_secret_id?: string | null;
          business_email?: string | null;
          business_phone?: string | null;
          business_structure?: string | null;
          card_not_present_percent?: number | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          decided_at?: string | null;
          estimated_monthly_volume_cents?: number | null;
          external_reference?: string | null;
          facility_id?: string;
          highest_ticket_cents?: number | null;
          id?: string;
          incorporated_on?: string | null;
          legal_name?: string | null;
          mcc?: string | null;
          postal_code?: string | null;
          purged_at?: string | null;
          refund_policy?: string | null;
          region?: string | null;
          signed_at?: string | null;
          signed_by?: string | null;
          signed_ip?: string | null;
          signed_name?: string | null;
          signed_terms?: string | null;
          signed_title?: string | null;
          status?: string;
          status_detail?: string | null;
          submitted_at?: string | null;
          tax_id?: string | null;
          trading_name?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "merchant_applications_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      module_dependencies: {
        Row: {
          module_id: string;
          requires_module_id: string;
        };
        Insert: {
          module_id: string;
          requires_module_id: string;
        };
        Update: {
          module_id?: string;
          requires_module_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "module_dependencies_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "module_dependencies_requires_module_id_fkey";
            columns: ["requires_module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      modules: {
        Row: {
          category: string;
          created_at: string;
          currency: string;
          description: string;
          icon: string;
          id: string;
          is_active: boolean;
          is_standalone: boolean;
          min_tier_rank: number;
          name: string;
          price_monthly_cents: number;
          price_quarterly_cents: number;
          price_yearly_cents: number;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          currency?: string;
          description?: string;
          icon?: string;
          id: string;
          is_active?: boolean;
          is_standalone?: boolean;
          min_tier_rank?: number;
          name: string;
          price_monthly_cents?: number;
          price_quarterly_cents?: number;
          price_yearly_cents?: number;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          currency?: string;
          description?: string;
          icon?: string;
          id?: string;
          is_active?: boolean;
          is_standalone?: boolean;
          min_tier_rank?: number;
          name?: string;
          price_monthly_cents?: number;
          price_quarterly_cents?: number;
          price_yearly_cents?: number;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      offboarding_instances: {
        Row: {
          complete_notified_at: string | null;
          completed_at: string | null;
          created_at: string;
          due_today_notified_date: string | null;
          facility_id: string;
          id: string;
          last_day: string | null;
          last_reminder_date: string | null;
          reason: string;
          staff_id: string;
          started_at: string;
          template_id: string | null;
          updated_at: string;
        };
        Insert: {
          complete_notified_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          due_today_notified_date?: string | null;
          facility_id: string;
          id?: string;
          last_day?: string | null;
          last_reminder_date?: string | null;
          reason: string;
          staff_id: string;
          started_at?: string;
          template_id?: string | null;
          updated_at?: string;
        };
        Update: {
          complete_notified_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          due_today_notified_date?: string | null;
          facility_id?: string;
          id?: string;
          last_day?: string | null;
          last_reminder_date?: string | null;
          reason?: string;
          staff_id?: string;
          started_at?: string;
          template_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offboarding_instances_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offboarding_instances_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: true;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "offboarding_instances_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: true;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offboarding_instances_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "offboarding_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      offboarding_task_states: {
        Row: {
          assigned_to: string;
          completed_at: string | null;
          completed_by: string | null;
          completion_note: string | null;
          created_at: string;
          description: string;
          due_date: string | null;
          facility_id: string;
          id: string;
          instance_id: string;
          name: string;
          position: number;
          required: boolean;
          task_id: string | null;
          task_key: string;
          updated_at: string;
        };
        Insert: {
          assigned_to?: string;
          completed_at?: string | null;
          completed_by?: string | null;
          completion_note?: string | null;
          created_at?: string;
          description?: string;
          due_date?: string | null;
          facility_id: string;
          id?: string;
          instance_id: string;
          name: string;
          position: number;
          required?: boolean;
          task_id?: string | null;
          task_key: string;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string;
          completed_at?: string | null;
          completed_by?: string | null;
          completion_note?: string | null;
          created_at?: string;
          description?: string;
          due_date?: string | null;
          facility_id?: string;
          id?: string;
          instance_id?: string;
          name?: string;
          position?: number;
          required?: boolean;
          task_id?: string | null;
          task_key?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offboarding_task_states_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offboarding_task_states_instance_id_fkey";
            columns: ["instance_id"];
            isOneToOne: false;
            referencedRelation: "offboarding_instances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offboarding_task_states_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "offboarding_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      offboarding_tasks: {
        Row: {
          assigned_to: string;
          created_at: string;
          days: number | null;
          description: string;
          due: string;
          facility_id: string;
          id: string;
          legacy_id: string | null;
          name: string;
          position: number;
          required: boolean;
          template_id: string;
          updated_at: string;
        };
        Insert: {
          assigned_to?: string;
          created_at?: string;
          days?: number | null;
          description?: string;
          due?: string;
          facility_id: string;
          id?: string;
          legacy_id?: string | null;
          name: string;
          position: number;
          required?: boolean;
          template_id: string;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string;
          created_at?: string;
          days?: number | null;
          description?: string;
          due?: string;
          facility_id?: string;
          id?: string;
          legacy_id?: string | null;
          name?: string;
          position?: number;
          required?: boolean;
          template_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offboarding_tasks_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offboarding_tasks_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "offboarding_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      offboarding_templates: {
        Row: {
          applies_to_reasons: string[];
          created_at: string;
          facility_id: string;
          id: string;
          legacy_id: string | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          applies_to_reasons?: string[];
          created_at?: string;
          facility_id: string;
          id?: string;
          legacy_id?: string | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          applies_to_reasons?: string[];
          created_at?: string;
          facility_id?: string;
          id?: string;
          legacy_id?: string | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offboarding_templates_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      onboarding_change_requests: {
        Row: {
          created_at: string;
          facility_id: string;
          id: string;
          instance_id: string;
          note: string;
          resolved_at: string | null;
          section_type: string;
          task_key: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          facility_id: string;
          id?: string;
          instance_id: string;
          note: string;
          resolved_at?: string | null;
          section_type: string;
          task_key?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          facility_id?: string;
          id?: string;
          instance_id?: string;
          note?: string;
          resolved_at?: string | null;
          section_type?: string;
          task_key?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "onboarding_change_requests_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "onboarding_change_requests_instance_id_fkey";
            columns: ["instance_id"];
            isOneToOne: false;
            referencedRelation: "onboarding_instances";
            referencedColumns: ["id"];
          },
        ];
      };
      onboarding_employee_tasks: {
        Row: {
          config: Json;
          created_at: string;
          description: string | null;
          document_name: string | null;
          document_ref: string | null;
          facility_id: string;
          id: string;
          legacy_id: string | null;
          name: string;
          position: number;
          required: boolean;
          task_type: string;
          template_id: string;
          updated_at: string;
        };
        Insert: {
          config?: Json;
          created_at?: string;
          description?: string | null;
          document_name?: string | null;
          document_ref?: string | null;
          facility_id: string;
          id?: string;
          legacy_id?: string | null;
          name: string;
          position: number;
          required?: boolean;
          task_type: string;
          template_id: string;
          updated_at?: string;
        };
        Update: {
          config?: Json;
          created_at?: string;
          description?: string | null;
          document_name?: string | null;
          document_ref?: string | null;
          facility_id?: string;
          id?: string;
          legacy_id?: string | null;
          name?: string;
          position?: number;
          required?: boolean;
          task_type?: string;
          template_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "onboarding_employee_tasks_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "onboarding_employee_tasks_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "onboarding_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      onboarding_instances: {
        Row: {
          account_password_set_at: string | null;
          created_at: string;
          expiry_notified_at: string | null;
          facility_id: string;
          id: string;
          invited_at: string;
          last_deadline_reminder: string | null;
          reviewed_at: string | null;
          staff_id: string;
          submitted_at: string | null;
          template_id: string | null;
          token_expires_at: string;
          token_hash: string;
          updated_at: string;
        };
        Insert: {
          account_password_set_at?: string | null;
          created_at?: string;
          expiry_notified_at?: string | null;
          facility_id: string;
          id?: string;
          invited_at?: string;
          last_deadline_reminder?: string | null;
          reviewed_at?: string | null;
          staff_id: string;
          submitted_at?: string | null;
          template_id?: string | null;
          token_expires_at: string;
          token_hash: string;
          updated_at?: string;
        };
        Update: {
          account_password_set_at?: string | null;
          created_at?: string;
          expiry_notified_at?: string | null;
          facility_id?: string;
          id?: string;
          invited_at?: string;
          last_deadline_reminder?: string | null;
          reviewed_at?: string | null;
          staff_id?: string;
          submitted_at?: string | null;
          template_id?: string | null;
          token_expires_at?: string;
          token_hash?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "onboarding_instances_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "onboarding_instances_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: true;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "onboarding_instances_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: true;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "onboarding_instances_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "onboarding_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      onboarding_manager_tasks: {
        Row: {
          assigned_to: string;
          created_at: string;
          description: string;
          facility_id: string;
          id: string;
          legacy_id: string | null;
          name: string;
          position: number;
          required: boolean;
          requires_manager: boolean;
          task_type: string;
          template_id: string;
          updated_at: string;
          when_days: number | null;
          when_due: string;
        };
        Insert: {
          assigned_to?: string;
          created_at?: string;
          description?: string;
          facility_id: string;
          id?: string;
          legacy_id?: string | null;
          name: string;
          position: number;
          required?: boolean;
          requires_manager?: boolean;
          task_type: string;
          template_id: string;
          updated_at?: string;
          when_days?: number | null;
          when_due?: string;
        };
        Update: {
          assigned_to?: string;
          created_at?: string;
          description?: string;
          facility_id?: string;
          id?: string;
          legacy_id?: string | null;
          name?: string;
          position?: number;
          required?: boolean;
          requires_manager?: boolean;
          task_type?: string;
          template_id?: string;
          updated_at?: string;
          when_days?: number | null;
          when_due?: string;
        };
        Relationships: [
          {
            foreignKeyName: "onboarding_manager_tasks_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "onboarding_manager_tasks_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "onboarding_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      onboarding_sections: {
        Row: {
          completed_at: string | null;
          created_at: string;
          data: Json;
          facility_id: string;
          id: string;
          instance_id: string;
          section_type: string;
          status: string;
          task_id: string | null;
          task_key: string;
          updated_at: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          data?: Json;
          facility_id: string;
          id?: string;
          instance_id: string;
          section_type: string;
          status?: string;
          task_id?: string | null;
          task_key: string;
          updated_at?: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          data?: Json;
          facility_id?: string;
          id?: string;
          instance_id?: string;
          section_type?: string;
          status?: string;
          task_id?: string | null;
          task_key?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "onboarding_sections_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "onboarding_sections_instance_id_fkey";
            columns: ["instance_id"];
            isOneToOne: false;
            referencedRelation: "onboarding_instances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "onboarding_sections_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "onboarding_employee_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      onboarding_templates: {
        Row: {
          applies_to_roles: string[];
          completion_deadline_days: number;
          created_at: string;
          facility_id: string;
          id: string;
          invite_expiry_days: number;
          legacy_id: string | null;
          name: string;
          status: string;
          updated_at: string;
          welcome_message: string;
        };
        Insert: {
          applies_to_roles?: string[];
          completion_deadline_days?: number;
          created_at?: string;
          facility_id: string;
          id?: string;
          invite_expiry_days?: number;
          legacy_id?: string | null;
          name: string;
          status?: string;
          updated_at?: string;
          welcome_message?: string;
        };
        Update: {
          applies_to_roles?: string[];
          completion_deadline_days?: number;
          created_at?: string;
          facility_id?: string;
          id?: string;
          invite_expiry_days?: number;
          legacy_id?: string | null;
          name?: string;
          status?: string;
          updated_at?: string;
          welcome_message?: string;
        };
        Relationships: [
          {
            foreignKeyName: "onboarding_templates_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      orgs: {
        Row: {
          created_at: string;
          id: string;
          legacy_id: string | null;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          legacy_id?: string | null;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          legacy_id?: string | null;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      package_pass_entries: {
        Row: {
          author_name: string;
          booking_id: string | null;
          created_at: string;
          created_by: string | null;
          customer_package_id: string;
          facility_id: string;
          id: string;
          note: string;
          passes: number;
          pet_id: string | null;
          pet_name: string | null;
          reason: string;
          service_id: string;
          service_label: string;
        };
        Insert: {
          author_name?: string;
          booking_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_package_id: string;
          facility_id: string;
          id?: string;
          note?: string;
          passes: number;
          pet_id?: string | null;
          pet_name?: string | null;
          reason: string;
          service_id: string;
          service_label?: string;
        };
        Update: {
          author_name?: string;
          booking_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_package_id?: string;
          facility_id?: string;
          id?: string;
          note?: string;
          passes?: number;
          pet_id?: string | null;
          pet_name?: string | null;
          reason?: string;
          service_id?: string;
          service_label?: string;
        };
        Relationships: [
          {
            foreignKeyName: "package_pass_entries_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "booking_presence";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "package_pass_entries_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "package_pass_entries_customer_package_id_fkey";
            columns: ["customer_package_id"];
            isOneToOne: false;
            referencedRelation: "customer_package_pool_status";
            referencedColumns: ["customer_package_id"];
          },
          {
            foreignKeyName: "package_pass_entries_customer_package_id_fkey";
            columns: ["customer_package_id"];
            isOneToOne: false;
            referencedRelation: "customer_package_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "package_pass_entries_customer_package_id_fkey";
            columns: ["customer_package_id"];
            isOneToOne: false;
            referencedRelation: "customer_packages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "package_pass_entries_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "package_pass_entries_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_connections: {
        Row: {
          connected_at: string | null;
          connected_by: string | null;
          country: string | null;
          created_at: string;
          currency: string | null;
          environment: string;
          facility_id: string;
          last_error: string | null;
          last_swept_at: string | null;
          last_verified_at: string | null;
          merchant_id: string;
          processor: string;
          public_api_key: string | null;
          revoked_at: string | null;
          scopes: string[];
          status: string;
          updated_at: string;
        };
        Insert: {
          connected_at?: string | null;
          connected_by?: string | null;
          country?: string | null;
          created_at?: string;
          currency?: string | null;
          environment: string;
          facility_id: string;
          last_error?: string | null;
          last_swept_at?: string | null;
          last_verified_at?: string | null;
          merchant_id: string;
          processor?: string;
          public_api_key?: string | null;
          revoked_at?: string | null;
          scopes?: string[];
          status?: string;
          updated_at?: string;
        };
        Update: {
          connected_at?: string | null;
          connected_by?: string | null;
          country?: string | null;
          created_at?: string;
          currency?: string | null;
          environment?: string;
          facility_id?: string;
          last_error?: string | null;
          last_swept_at?: string | null;
          last_verified_at?: string | null;
          merchant_id?: string;
          processor?: string;
          public_api_key?: string | null;
          revoked_at?: string | null;
          scopes?: string[];
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_connections_connected_by_fkey";
            columns: ["connected_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_connections_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_intents: {
        Row: {
          amount_cents: number;
          booking_id: string | null;
          client_id: string | null;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          device_id: string | null;
          environment: string;
          facility_id: string;
          failure_code: string | null;
          failure_message: string | null;
          id: string;
          idempotency_key: string;
          kind: string;
          payment_id: string | null;
          processor: string;
          processor_order_id: string | null;
          processor_payment_id: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          amount_cents: number;
          booking_id?: string | null;
          client_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          device_id?: string | null;
          environment: string;
          facility_id: string;
          failure_code?: string | null;
          failure_message?: string | null;
          id?: string;
          idempotency_key: string;
          kind: string;
          payment_id?: string | null;
          processor?: string;
          processor_order_id?: string | null;
          processor_payment_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          amount_cents?: number;
          booking_id?: string | null;
          client_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          device_id?: string | null;
          environment?: string;
          facility_id?: string;
          failure_code?: string | null;
          failure_message?: string | null;
          id?: string;
          idempotency_key?: string;
          kind?: string;
          payment_id?: string | null;
          processor?: string;
          processor_order_id?: string | null;
          processor_payment_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_intents_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "booking_presence";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "payment_intents_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_intents_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_intents_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_intents_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_intents_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_webhook_events: {
        Row: {
          app_id: string | null;
          change: string | null;
          environment: string;
          facility_id: string | null;
          id: string;
          merchant_id: string | null;
          object_id: string | null;
          object_kind: string;
          occurred_at: string | null;
          outcome: string | null;
          payload: Json;
          processed_at: string | null;
          processor: string;
          received_at: string;
          status: string;
        };
        Insert: {
          app_id?: string | null;
          change?: string | null;
          environment: string;
          facility_id?: string | null;
          id?: string;
          merchant_id?: string | null;
          object_id?: string | null;
          object_kind: string;
          occurred_at?: string | null;
          outcome?: string | null;
          payload: Json;
          processed_at?: string | null;
          processor?: string;
          received_at?: string;
          status?: string;
        };
        Update: {
          app_id?: string | null;
          change?: string | null;
          environment?: string;
          facility_id?: string | null;
          id?: string;
          merchant_id?: string | null;
          object_id?: string | null;
          object_kind?: string;
          occurred_at?: string | null;
          outcome?: string | null;
          payload?: Json;
          processed_at?: string | null;
          processor?: string;
          received_at?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_webhook_events_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_charged: number;
          auth_code: string | null;
          author_name: string;
          booking_id: string | null;
          card_brand: string | null;
          card_last4: string | null;
          cash_received: number | null;
          client_id: string | null;
          created_at: string;
          created_by: string | null;
          entry_method: string | null;
          facility_id: string;
          grand_total: number;
          id: string;
          loyalty_discount_applied: number;
          method: string;
          package_pass_applied: number;
          package_pass_id: string | null;
          processor: string | null;
          processor_device_serial: string | null;
          processor_merchant_id: string | null;
          processor_order_id: string | null;
          processor_payment_id: string | null;
          receipt_channels: string[];
          refund_of_payment_id: string | null;
          saved_card_id: string | null;
          store_credit_applied: number;
          subtotal: number;
          tax: number;
          tip: number;
        };
        Insert: {
          amount_charged: number;
          auth_code?: string | null;
          author_name?: string;
          booking_id?: string | null;
          card_brand?: string | null;
          card_last4?: string | null;
          cash_received?: number | null;
          client_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          entry_method?: string | null;
          facility_id: string;
          grand_total: number;
          id?: string;
          loyalty_discount_applied?: number;
          method: string;
          package_pass_applied?: number;
          package_pass_id?: string | null;
          processor?: string | null;
          processor_device_serial?: string | null;
          processor_merchant_id?: string | null;
          processor_order_id?: string | null;
          processor_payment_id?: string | null;
          receipt_channels?: string[];
          refund_of_payment_id?: string | null;
          saved_card_id?: string | null;
          store_credit_applied?: number;
          subtotal: number;
          tax?: number;
          tip?: number;
        };
        Update: {
          amount_charged?: number;
          auth_code?: string | null;
          author_name?: string;
          booking_id?: string | null;
          card_brand?: string | null;
          card_last4?: string | null;
          cash_received?: number | null;
          client_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          entry_method?: string | null;
          facility_id?: string;
          grand_total?: number;
          id?: string;
          loyalty_discount_applied?: number;
          method?: string;
          package_pass_applied?: number;
          package_pass_id?: string | null;
          processor?: string | null;
          processor_device_serial?: string | null;
          processor_merchant_id?: string | null;
          processor_order_id?: string | null;
          processor_payment_id?: string | null;
          receipt_channels?: string[];
          refund_of_payment_id?: string | null;
          saved_card_id?: string | null;
          store_credit_applied?: number;
          subtotal?: number;
          tax?: number;
          tip?: number;
        };
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "booking_presence";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "payments_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_refund_of_fkey";
            columns: ["refund_of_payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      permissions: {
        Row: {
          category: string;
          description: string | null;
          is_personal: boolean;
          key: string;
        };
        Insert: {
          category: string;
          description?: string | null;
          is_personal?: boolean;
          key: string;
        };
        Update: {
          category?: string;
          description?: string | null;
          is_personal?: boolean;
          key?: string;
        };
        Relationships: [];
      };
      pets: {
        Row: {
          age_years: number | null;
          allergies: string | null;
          breed: string | null;
          client_id: string;
          coat_type: string | null;
          color: string | null;
          created_at: string;
          date_of_birth: string | null;
          details: Json;
          energy_level: string | null;
          facility_id: string;
          id: string;
          image_url: string | null;
          microchip: string | null;
          name: string;
          ref: number;
          sex: string | null;
          spayed_neutered: boolean | null;
          special_needs: string | null;
          species: string;
          status: string;
          updated_at: string;
          weight: number | null;
        };
        Insert: {
          age_years?: number | null;
          allergies?: string | null;
          breed?: string | null;
          client_id: string;
          coat_type?: string | null;
          color?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          details?: Json;
          energy_level?: string | null;
          facility_id: string;
          id?: string;
          image_url?: string | null;
          microchip?: string | null;
          name: string;
          ref?: number;
          sex?: string | null;
          spayed_neutered?: boolean | null;
          special_needs?: string | null;
          species?: string;
          status?: string;
          updated_at?: string;
          weight?: number | null;
        };
        Update: {
          age_years?: number | null;
          allergies?: string | null;
          breed?: string | null;
          client_id?: string;
          coat_type?: string | null;
          color?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          details?: Json;
          energy_level?: string | null;
          facility_id?: string;
          id?: string;
          image_url?: string | null;
          microchip?: string | null;
          name?: string;
          ref?: number;
          sex?: string | null;
          spayed_neutered?: boolean | null;
          special_needs?: string | null;
          species?: string;
          status?: string;
          updated_at?: string;
          weight?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "pets_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pets_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_profile_id: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          full_name: string | null;
          id: string;
          invited_by: string | null;
          role: Database["public"]["Enums"]["platform_role"];
          token_hash: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_profile_id?: string | null;
          created_at?: string;
          email: string;
          expires_at: string;
          full_name?: string | null;
          id?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["platform_role"];
          token_hash: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_profile_id?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          full_name?: string | null;
          id?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["platform_role"];
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "platform_invitations_accepted_profile_id_fkey";
            columns: ["accepted_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "platform_invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_memberships: {
        Row: {
          created_at: string;
          granted_by: string | null;
          profile_id: string;
          role: Database["public"]["Enums"]["platform_role"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          granted_by?: string | null;
          profile_id: string;
          role?: Database["public"]["Enums"]["platform_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          granted_by?: string | null;
          profile_id?: string;
          role?: Database["public"]["Enums"]["platform_role"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "platform_memberships_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "platform_memberships_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      prepaid_package_lines: {
        Row: {
          id: string;
          module: Database["public"]["Enums"]["service_module"];
          package_id: string;
          price_per_session: number;
          quantity: number;
          service_id: string;
          service_name: string;
        };
        Insert: {
          id?: string;
          module: Database["public"]["Enums"]["service_module"];
          package_id: string;
          price_per_session: number;
          quantity: number;
          service_id: string;
          service_name: string;
        };
        Update: {
          id?: string;
          module?: Database["public"]["Enums"]["service_module"];
          package_id?: string;
          price_per_session?: number;
          quantity?: number;
          service_id?: string;
          service_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prepaid_package_lines_package_id_fkey";
            columns: ["package_id"];
            isOneToOne: false;
            referencedRelation: "prepaid_package_pricing";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prepaid_package_lines_package_id_fkey";
            columns: ["package_id"];
            isOneToOne: false;
            referencedRelation: "prepaid_packages";
            referencedColumns: ["id"];
          },
        ];
      };
      prepaid_packages: {
        Row: {
          allow_extension: boolean;
          allow_refund_unused: boolean;
          allow_store_credit_on_cancel: boolean;
          allow_transfer: boolean;
          created_at: string;
          description: string;
          extension_fee: number;
          facility_id: string;
          id: string;
          is_popular: boolean;
          legacy_id: string | null;
          max_extension_days: number;
          name: string;
          package_price: number;
          policy_notes: string | null;
          popularity_rank: number | null;
          refund_per_unused_pass: number | null;
          status: string;
          updated_at: string;
          validity_days: number;
        };
        Insert: {
          allow_extension?: boolean;
          allow_refund_unused?: boolean;
          allow_store_credit_on_cancel?: boolean;
          allow_transfer?: boolean;
          created_at?: string;
          description?: string;
          extension_fee?: number;
          facility_id: string;
          id?: string;
          is_popular?: boolean;
          legacy_id?: string | null;
          max_extension_days?: number;
          name: string;
          package_price: number;
          policy_notes?: string | null;
          popularity_rank?: number | null;
          refund_per_unused_pass?: number | null;
          status?: string;
          updated_at?: string;
          validity_days: number;
        };
        Update: {
          allow_extension?: boolean;
          allow_refund_unused?: boolean;
          allow_store_credit_on_cancel?: boolean;
          allow_transfer?: boolean;
          created_at?: string;
          description?: string;
          extension_fee?: number;
          facility_id?: string;
          id?: string;
          is_popular?: boolean;
          legacy_id?: string | null;
          max_extension_days?: number;
          name?: string;
          package_price?: number;
          policy_notes?: string | null;
          popularity_rank?: number | null;
          refund_per_unused_pass?: number | null;
          status?: string;
          updated_at?: string;
          validity_days?: number;
        };
        Relationships: [
          {
            foreignKeyName: "prepaid_packages_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          is_platform_admin: boolean;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          is_platform_admin?: boolean;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          is_platform_admin?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      provisioning_requests: {
        Row: {
          created_at: string;
          facility_id: string;
          id: string;
          requested_by: string;
          response: Json;
        };
        Insert: {
          created_at?: string;
          facility_id: string;
          id: string;
          requested_by: string;
          response: Json;
        };
        Update: {
          created_at?: string;
          facility_id?: string;
          id?: string;
          requested_by?: string;
          response?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "provisioning_requests_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      report_card_photos: {
        Row: {
          caption: string | null;
          content_type: string;
          created_at: string;
          facility_id: string;
          id: string;
          kind: string;
          report_card_id: string;
          size_bytes: number;
          sort_order: number;
          storage_path: string;
        };
        Insert: {
          caption?: string | null;
          content_type: string;
          created_at?: string;
          facility_id: string;
          id?: string;
          kind?: string;
          report_card_id: string;
          size_bytes: number;
          sort_order?: number;
          storage_path: string;
        };
        Update: {
          caption?: string | null;
          content_type?: string;
          created_at?: string;
          facility_id?: string;
          id?: string;
          kind?: string;
          report_card_id?: string;
          size_bytes?: number;
          sort_order?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_card_photos_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_card_photos_report_card_id_fkey";
            columns: ["report_card_id"];
            isOneToOne: false;
            referencedRelation: "report_cards";
            referencedColumns: ["id"];
          },
        ];
      };
      report_cards: {
        Row: {
          booking_id: string | null;
          client_id: string;
          created_at: string;
          created_by: string | null;
          delivery_status: string;
          facility_id: string;
          favourite: boolean;
          generated: Json;
          id: string;
          input: Json;
          pet_id: string;
          rating_comment: string | null;
          rating_stars: number | null;
          rating_submitted_at: string | null;
          replied_at: string | null;
          reply_message: string | null;
          scheduled_for: string | null;
          sent_at: string | null;
          service_type: string;
          theme: string | null;
          updated_at: string;
          viewed_at: string | null;
          visit_date: string;
        };
        Insert: {
          booking_id?: string | null;
          client_id: string;
          created_at?: string;
          created_by?: string | null;
          delivery_status?: string;
          facility_id: string;
          favourite?: boolean;
          generated?: Json;
          id?: string;
          input?: Json;
          pet_id: string;
          rating_comment?: string | null;
          rating_stars?: number | null;
          rating_submitted_at?: string | null;
          replied_at?: string | null;
          reply_message?: string | null;
          scheduled_for?: string | null;
          sent_at?: string | null;
          service_type: string;
          theme?: string | null;
          updated_at?: string;
          viewed_at?: string | null;
          visit_date: string;
        };
        Update: {
          booking_id?: string | null;
          client_id?: string;
          created_at?: string;
          created_by?: string | null;
          delivery_status?: string;
          facility_id?: string;
          favourite?: boolean;
          generated?: Json;
          id?: string;
          input?: Json;
          pet_id?: string;
          rating_comment?: string | null;
          rating_stars?: number | null;
          rating_submitted_at?: string | null;
          replied_at?: string | null;
          reply_message?: string | null;
          scheduled_for?: string | null;
          sent_at?: string | null;
          service_type?: string;
          theme?: string | null;
          updated_at?: string;
          viewed_at?: string | null;
          visit_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_cards_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "booking_presence";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "report_cards_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_cards_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_cards_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_cards_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_cards_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          },
        ];
      };
      role_preset_permissions: {
        Row: {
          permission_key: string;
          role: Database["public"]["Enums"]["facility_staff_role"];
          scope: Database["public"]["Enums"]["access_scope"];
        };
        Insert: {
          permission_key: string;
          role: Database["public"]["Enums"]["facility_staff_role"];
          scope: Database["public"]["Enums"]["access_scope"];
        };
        Update: {
          permission_key?: string;
          role?: Database["public"]["Enums"]["facility_staff_role"];
          scope?: Database["public"]["Enums"]["access_scope"];
        };
        Relationships: [
          {
            foreignKeyName: "role_preset_permissions_permission_key_fkey";
            columns: ["permission_key"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["key"];
          },
        ];
      };
      room_categories: {
        Row: {
          active: boolean;
          color: string;
          created_at: string;
          default_base_price: number | null;
          default_capacity: number;
          description: string | null;
          facility_id: string;
          id: string;
          image_url: string | null;
          legacy_id: string;
          name: string;
          rules: Json;
          service: Database["public"]["Enums"]["service_module"];
          sort_order: number;
          updated_at: string;
          visible_to_clients: boolean;
        };
        Insert: {
          active?: boolean;
          color?: string;
          created_at?: string;
          default_base_price?: number | null;
          default_capacity?: number;
          description?: string | null;
          facility_id: string;
          id?: string;
          image_url?: string | null;
          legacy_id: string;
          name: string;
          rules?: Json;
          service: Database["public"]["Enums"]["service_module"];
          sort_order?: number;
          updated_at?: string;
          visible_to_clients?: boolean;
        };
        Update: {
          active?: boolean;
          color?: string;
          created_at?: string;
          default_base_price?: number | null;
          default_capacity?: number;
          description?: string | null;
          facility_id?: string;
          id?: string;
          image_url?: string | null;
          legacy_id?: string;
          name?: string;
          rules?: Json;
          service?: Database["public"]["Enums"]["service_module"];
          sort_order?: number;
          updated_at?: string;
          visible_to_clients?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "room_categories_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_template_applications: {
        Row: {
          applied_by: string | null;
          created_at: string;
          facility_id: string;
          id: string;
          template_id: string;
          week_start: string;
        };
        Insert: {
          applied_by?: string | null;
          created_at?: string;
          facility_id: string;
          id?: string;
          template_id: string;
          week_start: string;
        };
        Update: {
          applied_by?: string | null;
          created_at?: string;
          facility_id?: string;
          id?: string;
          template_id?: string;
          week_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_template_applications_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_template_applications_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "schedule_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_template_shifts: {
        Row: {
          break_minutes: number;
          created_at: string;
          day_of_week: number;
          department_id: string;
          end_time: string;
          id: string;
          position_id: string;
          required_skills: string[];
          slots: number;
          sort_order: number;
          staff_id: string | null;
          start_time: string;
          template_id: string;
        };
        Insert: {
          break_minutes?: number;
          created_at?: string;
          day_of_week: number;
          department_id: string;
          end_time: string;
          id?: string;
          position_id: string;
          required_skills?: string[];
          slots?: number;
          sort_order?: number;
          staff_id?: string | null;
          start_time: string;
          template_id: string;
        };
        Update: {
          break_minutes?: number;
          created_at?: string;
          day_of_week?: number;
          department_id?: string;
          end_time?: string;
          id?: string;
          position_id?: string;
          required_skills?: string[];
          slots?: number;
          sort_order?: number;
          staff_id?: string | null;
          start_time?: string;
          template_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_template_shifts_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "facility_departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_template_shifts_position_id_fkey";
            columns: ["position_id"];
            isOneToOne: false;
            referencedRelation: "facility_positions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_template_shifts_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "schedule_template_shifts_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_template_shifts_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "schedule_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_templates: {
        Row: {
          created_at: string;
          created_by: string | null;
          department_id: string | null;
          description: string | null;
          facility_id: string;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          department_id?: string | null;
          description?: string | null;
          facility_id: string;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          department_id?: string | null;
          description?: string | null;
          facility_id?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_templates_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "facility_departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_templates_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      shift_swap_requests: {
        Row: {
          created_at: string;
          facility_id: string;
          id: string;
          reason: string;
          requested_at: string;
          requesting_shift_id: string;
          requesting_staff_id: string;
          review_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["approval_status"];
          target_shift_id: string | null;
          target_staff_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          facility_id: string;
          id?: string;
          reason?: string;
          requested_at?: string;
          requesting_shift_id: string;
          requesting_staff_id: string;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["approval_status"];
          target_shift_id?: string | null;
          target_staff_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          facility_id?: string;
          id?: string;
          reason?: string;
          requested_at?: string;
          requesting_shift_id?: string;
          requesting_staff_id?: string;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["approval_status"];
          target_shift_id?: string | null;
          target_staff_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shift_swap_requests_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shift_swap_requests_requesting_shift_id_fkey";
            columns: ["requesting_shift_id"];
            isOneToOne: false;
            referencedRelation: "staff_shifts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shift_swap_requests_requesting_staff_id_fkey";
            columns: ["requesting_staff_id"];
            isOneToOne: false;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "shift_swap_requests_requesting_staff_id_fkey";
            columns: ["requesting_staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shift_swap_requests_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shift_swap_requests_target_shift_id_fkey";
            columns: ["target_shift_id"];
            isOneToOne: false;
            referencedRelation: "staff_shifts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shift_swap_requests_target_staff_id_fkey";
            columns: ["target_staff_id"];
            isOneToOne: false;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "shift_swap_requests_target_staff_id_fkey";
            columns: ["target_staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      staff: {
        Row: {
          access_level: Database["public"]["Enums"]["facility_access_level"];
          additional_roles: Database["public"]["Enums"]["facility_staff_role"][];
          avatar_url: string | null;
          color_hex: string | null;
          created_at: string;
          details: Json;
          email: string;
          facility_id: string;
          first_name: string;
          id: string;
          job_title: string | null;
          last_active: string | null;
          last_name: string;
          legacy_id: string | null;
          membership_id: string | null;
          phone: string | null;
          primary_role: Database["public"]["Enums"]["facility_staff_role"];
          service_assignments: Database["public"]["Enums"]["service_module"][];
          show_on_calendar: boolean;
          status: string;
          status_changed_at: string | null;
          status_note: string | null;
          status_reason: string | null;
          updated_at: string;
        };
        Insert: {
          access_level?: Database["public"]["Enums"]["facility_access_level"];
          additional_roles?: Database["public"]["Enums"]["facility_staff_role"][];
          avatar_url?: string | null;
          color_hex?: string | null;
          created_at?: string;
          details?: Json;
          email: string;
          facility_id: string;
          first_name: string;
          id?: string;
          job_title?: string | null;
          last_active?: string | null;
          last_name: string;
          legacy_id?: string | null;
          membership_id?: string | null;
          phone?: string | null;
          primary_role: Database["public"]["Enums"]["facility_staff_role"];
          service_assignments?: Database["public"]["Enums"]["service_module"][];
          show_on_calendar?: boolean;
          status?: string;
          status_changed_at?: string | null;
          status_note?: string | null;
          status_reason?: string | null;
          updated_at?: string;
        };
        Update: {
          access_level?: Database["public"]["Enums"]["facility_access_level"];
          additional_roles?: Database["public"]["Enums"]["facility_staff_role"][];
          avatar_url?: string | null;
          color_hex?: string | null;
          created_at?: string;
          details?: Json;
          email?: string;
          facility_id?: string;
          first_name?: string;
          id?: string;
          job_title?: string | null;
          last_active?: string | null;
          last_name?: string;
          legacy_id?: string | null;
          membership_id?: string | null;
          phone?: string | null;
          primary_role?: Database["public"]["Enums"]["facility_staff_role"];
          service_assignments?: Database["public"]["Enums"]["service_module"][];
          show_on_calendar?: boolean;
          status?: string;
          status_changed_at?: string | null;
          status_note?: string | null;
          status_reason?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_membership_id_fkey";
            columns: ["membership_id"];
            isOneToOne: false;
            referencedRelation: "facility_memberships";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_availability: {
        Row: {
          available_from: string | null;
          available_to: string | null;
          day_of_week: number;
          facility_id: string;
          is_available: boolean;
          notes: string | null;
          staff_id: string;
          updated_at: string;
        };
        Insert: {
          available_from?: string | null;
          available_to?: string | null;
          day_of_week: number;
          facility_id: string;
          is_available?: boolean;
          notes?: string | null;
          staff_id: string;
          updated_at?: string;
        };
        Update: {
          available_from?: string | null;
          available_to?: string | null;
          day_of_week?: number;
          facility_id?: string;
          is_available?: boolean;
          notes?: string | null;
          staff_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_availability_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_availability_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "staff_availability_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_availability_requests: {
        Row: {
          created_at: string;
          effective_from: string;
          facility_id: string;
          id: string;
          previous: Json;
          proposed: Json;
          reason: string;
          requested_at: string;
          review_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          staff_id: string;
          status: Database["public"]["Enums"]["approval_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          effective_from: string;
          facility_id: string;
          id?: string;
          previous?: Json;
          proposed: Json;
          reason?: string;
          requested_at?: string;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          staff_id: string;
          status?: Database["public"]["Enums"]["approval_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          effective_from?: string;
          facility_id?: string;
          id?: string;
          previous?: Json;
          proposed?: Json;
          reason?: string;
          requested_at?: string;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          staff_id?: string;
          status?: Database["public"]["Enums"]["approval_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_availability_requests_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_availability_requests_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_availability_requests_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "staff_availability_requests_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_custom_roles: {
        Row: {
          custom_role_id: string;
          staff_id: string;
        };
        Insert: {
          custom_role_id: string;
          staff_id: string;
        };
        Update: {
          custom_role_id?: string;
          staff_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_custom_roles_custom_role_id_fkey";
            columns: ["custom_role_id"];
            isOneToOne: false;
            referencedRelation: "facility_custom_roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_custom_roles_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "staff_custom_roles_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_departments: {
        Row: {
          created_at: string;
          department_id: string;
          facility_id: string;
          staff_id: string;
        };
        Insert: {
          created_at?: string;
          department_id: string;
          facility_id: string;
          staff_id: string;
        };
        Update: {
          created_at?: string;
          department_id?: string;
          facility_id?: string;
          staff_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_departments_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "facility_departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_departments_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_departments_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "staff_departments_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_documents: {
        Row: {
          content_type: string;
          created_at: string;
          doc_type: string;
          facility_id: string;
          file_name: string;
          id: string;
          instance_id: string | null;
          retain_until: string | null;
          size_bytes: number;
          staff_id: string;
          storage_path: string;
          task_key: string | null;
          uploaded_at: string;
          uploaded_by: string | null;
          visible_to_employee: boolean;
        };
        Insert: {
          content_type: string;
          created_at?: string;
          doc_type?: string;
          facility_id: string;
          file_name: string;
          id?: string;
          instance_id?: string | null;
          retain_until?: string | null;
          size_bytes: number;
          staff_id: string;
          storage_path: string;
          task_key?: string | null;
          uploaded_at?: string;
          uploaded_by?: string | null;
          visible_to_employee?: boolean;
        };
        Update: {
          content_type?: string;
          created_at?: string;
          doc_type?: string;
          facility_id?: string;
          file_name?: string;
          id?: string;
          instance_id?: string | null;
          retain_until?: string | null;
          size_bytes?: number;
          staff_id?: string;
          storage_path?: string;
          task_key?: string | null;
          uploaded_at?: string;
          uploaded_by?: string | null;
          visible_to_employee?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "staff_documents_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_documents_instance_id_fkey";
            columns: ["instance_id"];
            isOneToOne: false;
            referencedRelation: "onboarding_instances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_documents_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "staff_documents_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_hr_config: {
        Row: {
          completion_deadline_days: number;
          created_at: string;
          employment_types: string[];
          facility_id: string;
          hr_doc_retention_years: number;
          invite_expiry_days: number;
          notification_triggers: Json;
          register_close_reminder: string;
          require_clock_in_confirm: boolean;
          require_clock_out_confirm: boolean;
          require_register_open_on_login: boolean;
          termination_reasons: string[];
          updated_at: string;
        };
        Insert: {
          completion_deadline_days?: number;
          created_at?: string;
          employment_types?: string[];
          facility_id: string;
          hr_doc_retention_years?: number;
          invite_expiry_days?: number;
          notification_triggers?: Json;
          register_close_reminder?: string;
          require_clock_in_confirm?: boolean;
          require_clock_out_confirm?: boolean;
          require_register_open_on_login?: boolean;
          termination_reasons?: string[];
          updated_at?: string;
        };
        Update: {
          completion_deadline_days?: number;
          created_at?: string;
          employment_types?: string[];
          facility_id?: string;
          hr_doc_retention_years?: number;
          invite_expiry_days?: number;
          notification_triggers?: Json;
          register_close_reminder?: string;
          require_clock_in_confirm?: boolean;
          require_clock_out_confirm?: boolean;
          require_register_open_on_login?: boolean;
          termination_reasons?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_hr_config_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: true;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_permissions: {
        Row: {
          permission_key: string;
          scope: Database["public"]["Enums"]["access_scope"];
          staff_id: string;
          updated_at: string;
        };
        Insert: {
          permission_key: string;
          scope: Database["public"]["Enums"]["access_scope"];
          staff_id: string;
          updated_at?: string;
        };
        Update: {
          permission_key?: string;
          scope?: Database["public"]["Enums"]["access_scope"];
          staff_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_permissions_permission_key_fkey";
            columns: ["permission_key"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "staff_permissions_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "staff_permissions_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_shifts: {
        Row: {
          break_minutes: number;
          created_at: string;
          department_id: string;
          ends_at: string;
          facility_id: string;
          id: string;
          notes: string | null;
          position_id: string;
          recurrence_id: string | null;
          required_skills: string[];
          slots: number;
          staff_id: string | null;
          starts_at: string;
          status: Database["public"]["Enums"]["shift_status"];
          updated_at: string;
          urgent: boolean;
        };
        Insert: {
          break_minutes?: number;
          created_at?: string;
          department_id: string;
          ends_at: string;
          facility_id: string;
          id?: string;
          notes?: string | null;
          position_id: string;
          recurrence_id?: string | null;
          required_skills?: string[];
          slots?: number;
          staff_id?: string | null;
          starts_at: string;
          status?: Database["public"]["Enums"]["shift_status"];
          updated_at?: string;
          urgent?: boolean;
        };
        Update: {
          break_minutes?: number;
          created_at?: string;
          department_id?: string;
          ends_at?: string;
          facility_id?: string;
          id?: string;
          notes?: string | null;
          position_id?: string;
          recurrence_id?: string | null;
          required_skills?: string[];
          slots?: number;
          staff_id?: string | null;
          starts_at?: string;
          status?: Database["public"]["Enums"]["shift_status"];
          updated_at?: string;
          urgent?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "staff_shifts_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "facility_departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_shifts_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_shifts_position_id_fkey";
            columns: ["position_id"];
            isOneToOne: false;
            referencedRelation: "facility_positions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_shifts_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "staff_shifts_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_signatures: {
        Row: {
          agreement_hash: string;
          agreement_key: string;
          agreement_text: string;
          agreement_title: string;
          created_at: string;
          facility_id: string;
          id: string;
          instance_id: string | null;
          ip_address: string | null;
          signature_data: string | null;
          signature_name: string;
          signed_at: string;
          signed_by: string | null;
          staff_id: string;
          task_key: string | null;
          user_agent: string | null;
        };
        Insert: {
          agreement_hash: string;
          agreement_key: string;
          agreement_text: string;
          agreement_title: string;
          created_at?: string;
          facility_id: string;
          id?: string;
          instance_id?: string | null;
          ip_address?: string | null;
          signature_data?: string | null;
          signature_name: string;
          signed_at?: string;
          signed_by?: string | null;
          staff_id: string;
          task_key?: string | null;
          user_agent?: string | null;
        };
        Update: {
          agreement_hash?: string;
          agreement_key?: string;
          agreement_text?: string;
          agreement_title?: string;
          created_at?: string;
          facility_id?: string;
          id?: string;
          instance_id?: string | null;
          ip_address?: string | null;
          signature_data?: string | null;
          signature_name?: string;
          signed_at?: string;
          signed_by?: string | null;
          staff_id?: string;
          task_key?: string | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "staff_signatures_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_signatures_instance_id_fkey";
            columns: ["instance_id"];
            isOneToOne: false;
            referencedRelation: "onboarding_instances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_signatures_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "staff_signatures_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_time_clock_entries: {
        Row: {
          clocked_in_at: string;
          clocked_out_at: string | null;
          created_at: string;
          facility_id: string;
          id: string;
          minutes_worked: number | null;
          notes: string | null;
          shift_id: string | null;
          source: Database["public"]["Enums"]["time_clock_source"];
          staff_id: string;
          updated_at: string;
        };
        Insert: {
          clocked_in_at?: string;
          clocked_out_at?: string | null;
          created_at?: string;
          facility_id: string;
          id?: string;
          minutes_worked?: number | null;
          notes?: string | null;
          shift_id?: string | null;
          source?: Database["public"]["Enums"]["time_clock_source"];
          staff_id: string;
          updated_at?: string;
        };
        Update: {
          clocked_in_at?: string;
          clocked_out_at?: string | null;
          created_at?: string;
          facility_id?: string;
          id?: string;
          minutes_worked?: number | null;
          notes?: string | null;
          shift_id?: string | null;
          source?: Database["public"]["Enums"]["time_clock_source"];
          staff_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_time_clock_entries_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_time_clock_entries_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: false;
            referencedRelation: "staff_shifts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_time_clock_entries_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "staff_time_clock_entries_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_time_off_requests: {
        Row: {
          created_at: string;
          ends_on: string;
          facility_id: string;
          id: string;
          reason: string;
          requested_at: string;
          review_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          staff_id: string;
          starts_on: string;
          status: Database["public"]["Enums"]["approval_status"];
          type: Database["public"]["Enums"]["time_off_type"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          ends_on: string;
          facility_id: string;
          id?: string;
          reason?: string;
          requested_at?: string;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          staff_id: string;
          starts_on: string;
          status?: Database["public"]["Enums"]["approval_status"];
          type: Database["public"]["Enums"]["time_off_type"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          ends_on?: string;
          facility_id?: string;
          id?: string;
          reason?: string;
          requested_at?: string;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          staff_id?: string;
          starts_on?: string;
          status?: Database["public"]["Enums"]["approval_status"];
          type?: Database["public"]["Enums"]["time_off_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_time_off_requests_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_time_off_requests_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_time_off_requests_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "staff_time_off_requests_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      store_credit_entries: {
        Row: {
          amount: number;
          author_name: string;
          booking_id: string | null;
          client_id: string;
          created_at: string;
          created_by: string | null;
          facility_id: string;
          id: string;
          note: string;
          payment_id: string | null;
          reason: string;
        };
        Insert: {
          amount: number;
          author_name?: string;
          booking_id?: string | null;
          client_id: string;
          created_at?: string;
          created_by?: string | null;
          facility_id: string;
          id?: string;
          note?: string;
          payment_id?: string | null;
          reason: string;
        };
        Update: {
          amount?: number;
          author_name?: string;
          booking_id?: string | null;
          client_id?: string;
          created_at?: string;
          created_by?: string | null;
          facility_id?: string;
          id?: string;
          note?: string;
          payment_id?: string | null;
          reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: "store_credit_entries_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "booking_presence";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "store_credit_entries_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "store_credit_entries_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "store_credit_entries_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "store_credit_entries_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_tiers: {
        Row: {
          created_at: string;
          currency: string;
          description: string;
          features: string[];
          id: string;
          is_active: boolean;
          is_customizable: boolean;
          is_public: boolean;
          max_bookings_per_month: number | null;
          max_clients: number | null;
          max_locations: number | null;
          max_users: number | null;
          name: string;
          price_monthly_cents: number;
          price_quarterly_cents: number;
          price_yearly_cents: number;
          rank: number;
          sort_order: number;
          storage_gb: number | null;
          tier_type: string;
          transaction_fee_bps: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          description?: string;
          features?: string[];
          id: string;
          is_active?: boolean;
          is_customizable?: boolean;
          is_public?: boolean;
          max_bookings_per_month?: number | null;
          max_clients?: number | null;
          max_locations?: number | null;
          max_users?: number | null;
          name: string;
          price_monthly_cents?: number;
          price_quarterly_cents?: number;
          price_yearly_cents?: number;
          rank: number;
          sort_order?: number;
          storage_gb?: number | null;
          tier_type: string;
          transaction_fee_bps?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          description?: string;
          features?: string[];
          id?: string;
          is_active?: boolean;
          is_customizable?: boolean;
          is_public?: boolean;
          max_bookings_per_month?: number | null;
          max_clients?: number | null;
          max_locations?: number | null;
          max_users?: number | null;
          name?: string;
          price_monthly_cents?: number;
          price_quarterly_cents?: number;
          price_yearly_cents?: number;
          rank?: number;
          sort_order?: number;
          storage_gb?: number | null;
          tier_type?: string;
          transaction_fee_bps?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_templates: {
        Row: {
          assign_to: string | null;
          auto_create: boolean;
          category: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          duration_minutes: number | null;
          facility_id: string;
          id: string;
          is_required: boolean;
          legacy_id: string | null;
          module_id: string;
          name: string;
          recurring_frequency: string | null;
          recurring_times: string[] | null;
          required_role: string | null;
          sort_order: number;
          timing_custom_time: string | null;
          timing_offset_minutes: number | null;
          timing_type: string;
          updated_at: string;
        };
        Insert: {
          assign_to?: string | null;
          auto_create?: boolean;
          category: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          duration_minutes?: number | null;
          facility_id: string;
          id?: string;
          is_required?: boolean;
          legacy_id?: string | null;
          module_id: string;
          name: string;
          recurring_frequency?: string | null;
          recurring_times?: string[] | null;
          required_role?: string | null;
          sort_order?: number;
          timing_custom_time?: string | null;
          timing_offset_minutes?: number | null;
          timing_type: string;
          updated_at?: string;
        };
        Update: {
          assign_to?: string | null;
          auto_create?: boolean;
          category?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          duration_minutes?: number | null;
          facility_id?: string;
          id?: string;
          is_required?: boolean;
          legacy_id?: string | null;
          module_id?: string;
          name?: string;
          recurring_frequency?: string | null;
          recurring_times?: string[] | null;
          required_role?: string | null;
          sort_order?: number;
          timing_custom_time?: string | null;
          timing_offset_minutes?: number | null;
          timing_type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_templates_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      tier_modules: {
        Row: {
          module_id: string;
          tier_id: string;
        };
        Insert: {
          module_id: string;
          tier_id: string;
        };
        Update: {
          module_id?: string;
          tier_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tier_modules_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tier_modules_tier_id_fkey";
            columns: ["tier_id"];
            isOneToOne: false;
            referencedRelation: "subscription_tiers";
            referencedColumns: ["id"];
          },
        ];
      };
      training_attendance: {
        Row: {
          author_name: string | null;
          booking_id: string;
          checked_in_at: string | null;
          checked_out_at: string | null;
          created_at: string;
          created_by: string | null;
          facility_id: string;
          session_notes: string;
          status: string | null;
          updated_at: string;
        };
        Insert: {
          author_name?: string | null;
          booking_id: string;
          checked_in_at?: string | null;
          checked_out_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          facility_id: string;
          session_notes?: string;
          status?: string | null;
          updated_at?: string;
        };
        Update: {
          author_name?: string | null;
          booking_id?: string;
          checked_in_at?: string | null;
          checked_out_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          facility_id?: string;
          session_notes?: string;
          status?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "training_attendance_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "booking_presence";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "training_attendance_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_attendance_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      training_trainer_profiles: {
        Row: {
          bio: string;
          calendar_color: string | null;
          certifications: string[];
          created_at: string;
          facility_id: string;
          id: string;
          specializations: string[];
          staff_id: string;
          updated_at: string;
          visible_online: boolean;
          years_experience: number | null;
        };
        Insert: {
          bio?: string;
          calendar_color?: string | null;
          certifications?: string[];
          created_at?: string;
          facility_id: string;
          id?: string;
          specializations?: string[];
          staff_id: string;
          updated_at?: string;
          visible_online?: boolean;
          years_experience?: number | null;
        };
        Update: {
          bio?: string;
          calendar_color?: string | null;
          certifications?: string[];
          created_at?: string;
          facility_id?: string;
          id?: string;
          specializations?: string[];
          staff_id?: string;
          updated_at?: string;
          visible_online?: boolean;
          years_experience?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "training_trainer_profiles_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_trainer_profiles_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: true;
            referencedRelation: "grooming_stylist_stats";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "training_trainer_profiles_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: true;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      unattached_payments: {
        Row: {
          amount_cents: number;
          attached_payment_id: string | null;
          card_brand: string | null;
          card_last4: string | null;
          currency: string | null;
          discovered_at: string;
          entry_method: string | null;
          facility_id: string;
          id: string;
          note: string | null;
          payload: Json | null;
          processor: string;
          processor_device_serial: string | null;
          processor_merchant_id: string | null;
          processor_order_id: string | null;
          processor_payment_id: string;
          resolved_at: string | null;
          resolved_by: string | null;
          status: string;
          taken_at: string | null;
          tax_cents: number;
          tip_cents: number;
          updated_at: string;
        };
        Insert: {
          amount_cents: number;
          attached_payment_id?: string | null;
          card_brand?: string | null;
          card_last4?: string | null;
          currency?: string | null;
          discovered_at?: string;
          entry_method?: string | null;
          facility_id: string;
          id?: string;
          note?: string | null;
          payload?: Json | null;
          processor?: string;
          processor_device_serial?: string | null;
          processor_merchant_id?: string | null;
          processor_order_id?: string | null;
          processor_payment_id: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          taken_at?: string | null;
          tax_cents?: number;
          tip_cents?: number;
          updated_at?: string;
        };
        Update: {
          amount_cents?: number;
          attached_payment_id?: string | null;
          card_brand?: string | null;
          card_last4?: string | null;
          currency?: string | null;
          discovered_at?: string;
          entry_method?: string | null;
          facility_id?: string;
          id?: string;
          note?: string | null;
          payload?: Json | null;
          processor?: string;
          processor_device_serial?: string | null;
          processor_merchant_id?: string | null;
          processor_order_id?: string | null;
          processor_payment_id?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          taken_at?: string | null;
          tax_cents?: number;
          tip_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "unattached_payments_attached_payment_id_fkey";
            columns: ["attached_payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unattached_payments_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      user_passkeys: {
        Row: {
          backed_up: boolean;
          counter: number;
          created_at: string;
          credential_id: string;
          last_used_at: string | null;
          nickname: string | null;
          profile_id: string;
          public_key: string;
          transports: string[];
        };
        Insert: {
          backed_up?: boolean;
          counter?: number;
          created_at?: string;
          credential_id: string;
          last_used_at?: string | null;
          nickname?: string | null;
          profile_id: string;
          public_key: string;
          transports?: string[];
        };
        Update: {
          backed_up?: boolean;
          counter?: number;
          created_at?: string;
          credential_id?: string;
          last_used_at?: string | null;
          nickname?: string | null;
          profile_id?: string;
          public_key?: string;
          transports?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "user_passkeys_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      waiver_signatures: {
        Row: {
          client_id: string;
          created_at: string;
          expires_at: string | null;
          facility_id: string;
          id: string;
          ip_address: string | null;
          pet_id: string | null;
          revoked_at: string | null;
          revoked_by: string | null;
          revoked_reason: string | null;
          signature_data: string | null;
          signature_name: string;
          signed_at: string;
          signed_by: string | null;
          user_agent: string | null;
          waiver_hash: string;
          waiver_id: string | null;
          waiver_name: string;
          waiver_text: string;
          waiver_version: string;
          witness_name: string | null;
          witness_signature_data: string | null;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          expires_at?: string | null;
          facility_id: string;
          id?: string;
          ip_address?: string | null;
          pet_id?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          revoked_reason?: string | null;
          signature_data?: string | null;
          signature_name: string;
          signed_at?: string;
          signed_by?: string | null;
          user_agent?: string | null;
          waiver_hash: string;
          waiver_id?: string | null;
          waiver_name: string;
          waiver_text: string;
          waiver_version: string;
          witness_name?: string | null;
          witness_signature_data?: string | null;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          expires_at?: string | null;
          facility_id?: string;
          id?: string;
          ip_address?: string | null;
          pet_id?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          revoked_reason?: string | null;
          signature_data?: string | null;
          signature_name?: string;
          signed_at?: string;
          signed_by?: string | null;
          user_agent?: string | null;
          waiver_hash?: string;
          waiver_id?: string | null;
          waiver_name?: string;
          waiver_text?: string;
          waiver_version?: string;
          witness_name?: string | null;
          witness_signature_data?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "waiver_signatures_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waiver_signatures_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      waivers: {
        Row: {
          active: boolean;
          blocks: Json;
          body: string;
          category: string | null;
          created_at: string;
          created_by: string | null;
          expiry_days: number | null;
          facility_id: string;
          id: string;
          name: string;
          requires_digital_signature: boolean;
          requires_signature: boolean;
          requires_witness: boolean;
          services: string[];
          updated_at: string;
          version: string;
        };
        Insert: {
          active?: boolean;
          blocks?: Json;
          body: string;
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          expiry_days?: number | null;
          facility_id: string;
          id?: string;
          name: string;
          requires_digital_signature?: boolean;
          requires_signature?: boolean;
          requires_witness?: boolean;
          services?: string[];
          updated_at?: string;
          version?: string;
        };
        Update: {
          active?: boolean;
          blocks?: Json;
          body?: string;
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          expiry_days?: number | null;
          facility_id?: string;
          id?: string;
          name?: string;
          requires_digital_signature?: boolean;
          requires_signature?: boolean;
          requires_witness?: boolean;
          services?: string[];
          updated_at?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "waivers_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      booking_presence: {
        Row: {
          arrived_at: string | null;
          booking_id: string | null;
          departed_at: string | null;
          presence: string | null;
          source: string | null;
        };
        Relationships: [];
      };
      client_store_credit: {
        Row: {
          balance: number | null;
          client_id: string | null;
          entry_count: number | null;
          facility_id: string | null;
          last_activity_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "store_credit_entries_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "store_credit_entries_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_package_pool_status: {
        Row: {
          client_id: string | null;
          customer_package_id: string | null;
          facility_id: string | null;
          module: Database["public"]["Enums"]["service_module"] | null;
          passes_remaining: number | null;
          passes_total: number | null;
          service_id: string | null;
          service_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_packages_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_packages_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_package_status: {
        Row: {
          client_id: string | null;
          expires_at: string | null;
          facility_id: string | null;
          id: string | null;
          package_name: string | null;
          passes_remaining: number | null;
          passes_total: number | null;
          passes_used: number | null;
          price_paid: number | null;
          purchased_at: string | null;
          status: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_packages_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_packages_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      grooming_stylist_stats: {
        Row: {
          facility_id: string | null;
          staff_id: string | null;
          total_appointments: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "staff_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      loyalty_account_overview: {
        Row: {
          client_email: string | null;
          client_id: string | null;
          client_name: string | null;
          client_ref: number | null;
          created_at: string | null;
          credit_balance: number | null;
          current_tier_id: string | null;
          facility_id: string | null;
          id: string | null;
          last_activity_at: string | null;
          lifetime_points_earned: number | null;
          lifetime_points_redeemed: number | null;
          points_balance: number | null;
          referral_code: string | null;
          tier_joined_at: string | null;
          total_spend: number | null;
          total_visits: number | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "loyalty_accounts_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loyalty_accounts_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      prepaid_package_pricing: {
        Row: {
          facility_id: string | null;
          id: string | null;
          package_price: number | null;
          purchase_count: number | null;
          regular_price: number | null;
          savings: number | null;
          savings_percentage: number | null;
          total_passes: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "prepaid_packages_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      unreconciled_payments: {
        Row: {
          amount_cents: number | null;
          booking_id: string | null;
          client_id: string | null;
          completed_at: string | null;
          created_at: string | null;
          currency: string | null;
          environment: string | null;
          facility_id: string | null;
          facility_name: string | null;
          intent_id: string | null;
          kind: string | null;
          processor: string | null;
          processor_payment_id: string | null;
          unreconciled_for: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payment_intents_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "booking_presence";
            referencedColumns: ["booking_id"];
          },
          {
            foreignKeyName: "payment_intents_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_intents_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_intents_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      accept_platform_invitation: {
        Args: { p_profile_id: string; p_token_hash: string };
        Returns: Json;
      };
      adjust_gift_card: {
        Args: { p_amount: number; p_gift_card_id: string; p_reason: string };
        Returns: {
          balance: number;
          code: string;
          created_at: string;
          currency: string;
          expires_at: string | null;
          facility_id: string;
          id: string;
          initial_amount: number;
          issued_at: string;
          issued_by: string | null;
          kind: string;
          last_used_at: string | null;
          message: string | null;
          purchased_by_client_id: string | null;
          recipient_email: string | null;
          recipient_name: string | null;
          status: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "gift_cards";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      apply_schedule_template: {
        Args: { p_template_id: string; p_week_start: string };
        Returns: {
          break_minutes: number;
          created_at: string;
          department_id: string;
          ends_at: string;
          facility_id: string;
          id: string;
          notes: string | null;
          position_id: string;
          recurrence_id: string | null;
          required_skills: string[];
          slots: number;
          staff_id: string | null;
          starts_at: string;
          status: Database["public"]["Enums"]["shift_status"];
          updated_at: string;
          urgent: boolean;
        }[];
        SetofOptions: {
          from: "*";
          to: "staff_shifts";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      approve_availability_request: {
        Args: { p_notes?: string; p_request_id: string };
        Returns: {
          available_from: string;
          available_to: string;
          day_of_week: number;
          is_available: boolean;
        }[];
      };
      approve_shift_swap: {
        Args: { p_notes?: string; p_request_id: string };
        Returns: {
          moved_shift_id: string;
          now_assigned: string;
        }[];
      };
      assign_boarding_room: {
        Args: {
          p_booking_ref: number;
          p_override_reason?: string;
          p_room_id?: string;
        };
        Returns: string;
      };
      attach_unattached_payment: {
        Args: {
          p_booking_ref?: number;
          p_client_id?: string;
          p_id: string;
          p_note?: string;
        };
        Returns: string;
      };
      award_loyalty_badge: {
        Args: {
          p_account_id: string;
          p_applies_to?: string[];
          p_badge_id: string;
          p_description?: string;
          p_points?: number;
          p_reward_type?: string;
          p_reward_value?: number;
        };
        Returns: {
          account_id: string;
          badge_id: string;
          earned_at: string;
          facility_id: string;
          id: string;
          points_awarded: number;
          voucher_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "loyalty_badge_awards";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      close_payment_intent: {
        Args: {
          p_failure_code?: string;
          p_failure_message?: string;
          p_intent_id: string;
          p_status: string;
        };
        Returns: undefined;
      };
      close_payment_webhook: {
        Args: { p_event_id: string; p_outcome?: string; p_status: string };
        Returns: undefined;
      };
      communication_auth_token: {
        Args: { p_facility_id: string; p_provider?: string };
        Returns: {
          auth_token: string;
          status: string;
          subaccount_sid: string;
        }[];
      };
      consume_loyalty_voucher: {
        Args: { p_booking_id?: string; p_voucher_id: string };
        Returns: {
          account_id: string;
          applies_to_services: string[] | null;
          expires_at: string | null;
          facility_id: string;
          id: string;
          issued_at: string;
          points_spent: number;
          reward_type: string;
          reward_value: number;
          status: string;
          used_at: string | null;
          used_on_booking_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "loyalty_vouchers";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_booking: {
        Args: {
          p_boarding?: Json;
          p_booking: Json;
          p_grooming?: Json;
          p_pet_ids?: string[];
        };
        Returns: {
          booking_id: string;
          booking_ref: number;
        }[];
      };
      disconnect_payment_connection: {
        Args: { p_facility_id: string; p_processor?: string; p_reason: string };
        Returns: {
          connection_revoked: boolean;
          credentials_removed: boolean;
        }[];
      };
      dismiss_unattached_payment: {
        Args: { p_id: string; p_note: string };
        Returns: boolean;
      };
      facility_branding_by_slug: {
        Args: { p_slug: string };
        Returns: {
          accent_color: string;
          allow_customer_signup: boolean;
          facility_id: string;
          logo_url: string;
          name: string;
          primary_color: string;
          slug: string;
          tagline: string;
          wordmark_url: string;
        }[];
      };
      facility_has_module: {
        Args: { p_facility_id: string; p_module_id: string };
        Returns: boolean;
      };
      facility_module_entitlements: {
        Args: { p_facility_id: string };
        Returns: {
          available_on_plan: boolean;
          category: string;
          description: string;
          enabled: boolean;
          expires_at: string;
          icon: string;
          included_in_plan: boolean;
          is_standalone: boolean;
          list_price_cents: number;
          min_tier_rank: number;
          missing_dependencies: string[];
          module_id: string;
          name: string;
          note: string;
          price_cents: number;
          price_override_cents: number;
          slug: string;
          source: string;
        }[];
      };
      facility_report: {
        Args: { p_facility_id: string; p_months?: number };
        Returns: Json;
      };
      facility_report_dataset: {
        Args: {
          p_facility_id: string;
          p_from: string;
          p_prev_from: string;
          p_prev_to: string;
          p_report: string;
          p_to: string;
        };
        Returns: Json;
      };
      facility_report_kpis: {
        Args: {
          p_facility_id: string;
          p_from: string;
          p_prev_from: string;
          p_prev_to: string;
          p_to: string;
        };
        Returns: Json;
      };
      facility_revenue_trend_by_location: {
        Args: { p_facility_id: string; p_months?: number };
        Returns: Json;
      };
      facility_takings: {
        Args: {
          p_facility_id: string;
          p_from: string;
          p_time_zone?: string;
          p_to: string;
        };
        Returns: Json;
      };
      generate_tasks_from_group: {
        Args: { p_assign_to?: string; p_for_date?: string; p_group_id: string };
        Returns: {
          assigned_to: string | null;
          category: string;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          due_at: string | null;
          estimated_minutes: number | null;
          facility_id: string;
          id: string;
          metadata: Json;
          notes: string | null;
          priority: string;
          requires_photo: boolean;
          requires_signoff: boolean;
          source: string;
          source_ref: string | null;
          status: string;
          template_id: string | null;
          title: string;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "facility_tasks";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      grant_platform_role: {
        Args: {
          p_profile_id: string;
          p_role: Database["public"]["Enums"]["platform_role"];
        };
        Returns: Json;
      };
      invite_facility_owner: {
        Args: { p_expires_at?: string; p_facility_id: string };
        Returns: Json;
      };
      invite_platform_admin: {
        Args: {
          p_email: string;
          p_expires_at: string;
          p_full_name: string;
          p_role: Database["public"]["Enums"]["platform_role"];
          p_token_hash: string;
        };
        Returns: Json;
      };
      issue_gift_card: {
        Args: {
          p_amount: number;
          p_code?: string;
          p_expires_at?: string;
          p_facility_id: string;
          p_kind?: string;
          p_message?: string;
          p_purchased_by_client_id?: string;
          p_recipient_email?: string;
          p_recipient_name?: string;
        };
        Returns: {
          balance: number;
          code: string;
          created_at: string;
          currency: string;
          expires_at: string | null;
          facility_id: string;
          id: string;
          initial_amount: number;
          issued_at: string;
          issued_by: string | null;
          kind: string;
          last_used_at: string | null;
          message: string | null;
          purchased_by_client_id: string | null;
          recipient_email: string | null;
          recipient_name: string | null;
          status: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "gift_cards";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      link_client_record: {
        Args: { p_facility_slug: string };
        Returns: string;
      };
      link_staff_invite: {
        Args: { p_profile_id: string; p_staff_legacy_id: string };
        Returns: Json;
      };
      mark_report_card_viewed: {
        Args: { p_card_id: string };
        Returns: {
          booking_id: string | null;
          client_id: string;
          created_at: string;
          created_by: string | null;
          delivery_status: string;
          facility_id: string;
          favourite: boolean;
          generated: Json;
          id: string;
          input: Json;
          pet_id: string;
          rating_comment: string | null;
          rating_stars: number | null;
          rating_submitted_at: string | null;
          replied_at: string | null;
          reply_message: string | null;
          scheduled_for: string | null;
          sent_at: string | null;
          service_type: string;
          theme: string | null;
          updated_at: string;
          viewed_at: string | null;
          visit_date: string;
        };
        SetofOptions: {
          from: "*";
          to: "report_cards";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      migrate_profile_subject: {
        Args: { p_new_id: string; p_old_id: string };
        Returns: undefined;
      };
      my_client_at: { Args: { p_facility_slug: string }; Returns: string };
      my_permissions: {
        Args: never;
        Returns: {
          permission_key: string;
          scope: Database["public"]["Enums"]["access_scope"];
        }[];
      };
      name_intent_order: {
        Args: { p_intent_id: string; p_order_id: string };
        Returns: undefined;
      };
      offboard_staff: {
        Args: {
          p_last_day?: string;
          p_reason: string;
          p_staff_legacy_id: string;
          p_template_id?: string;
        };
        Returns: Json;
      };
      onboarding_by_token: { Args: { p_token: string }; Returns: Json };
      open_payment_intent: {
        Args: {
          p_amount_cents: number;
          p_booking_id?: string;
          p_client_id?: string;
          p_created_by?: string;
          p_currency: string;
          p_device_id?: string;
          p_facility_id: string;
          p_idempotency_key: string;
          p_kind: string;
        };
        Returns: string;
      };
      payment_access_token: {
        Args: { p_facility_id: string; p_processor?: string };
        Returns: {
          access_token: string;
          access_token_expires_at: string;
          connection_status: string;
          environment: string;
          merchant_id: string;
          refresh_token: string;
          refresh_token_expires_at: string;
        }[];
      };
      payroll_summary: {
        Args: { p_facility_id: string; p_from: string; p_to: string };
        Returns: {
          first_name: string;
          gross: number;
          holiday_minutes: number;
          holiday_premium: number;
          hourly_minutes: number;
          last_name: string;
          open_sessions: number;
          overtime_configured: boolean;
          overtime_minutes: number;
          overtime_pay: number;
          regular_minutes: number;
          salaried_minutes: number;
          sessions: number;
          staff_id: string;
          unpriced_minutes: number;
        }[];
      };
      provision_facility: {
        Args: {
          p_business_types?: string[];
          p_contact_email?: string;
          p_contact_phone?: string;
          p_locations?: Json;
          p_name: string;
          p_owner_email: string;
          p_owner_name: string;
          p_owner_phone?: string;
          p_request_id: string;
          p_slug: string;
          p_timezone: string;
          p_website?: string;
        };
        Returns: Json;
      };
      purchase_package: {
        Args: {
          p_client_id: string;
          p_package_id: string;
          p_price_override?: number;
        };
        Returns: string;
      };
      purge_e2e_bookings: { Args: never; Returns: number };
      purge_e2e_report_cards: { Args: never; Returns: number };
      rate_report_card: {
        Args: { p_card_id: string; p_comment?: string; p_stars: number };
        Returns: {
          booking_id: string | null;
          client_id: string;
          created_at: string;
          created_by: string | null;
          delivery_status: string;
          facility_id: string;
          favourite: boolean;
          generated: Json;
          id: string;
          input: Json;
          pet_id: string;
          rating_comment: string | null;
          rating_stars: number | null;
          rating_submitted_at: string | null;
          replied_at: string | null;
          reply_message: string | null;
          scheduled_for: string | null;
          sent_at: string | null;
          service_type: string;
          theme: string | null;
          updated_at: string;
          viewed_at: string | null;
          visit_date: string;
        };
        SetofOptions: {
          from: "*";
          to: "report_cards";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      read_boarding_secret: {
        Args: {
          p_application_id: string;
          p_kind: string;
          p_principal_id: string;
        };
        Returns: string;
      };
      record_boarding_arrival: {
        Args: { p_action: string; p_booking_ref: number };
        Returns: string;
      };
      record_clover_payment: {
        Args: {
          p_auth_code?: string;
          p_author_name?: string;
          p_card_brand?: string;
          p_card_last4?: string;
          p_entry_method?: string;
          p_intent_id: string;
          p_processor_payment_id: string;
          p_subtotal_cents: number;
          p_tax_cents?: number;
          p_tip_cents?: number;
        };
        Returns: string;
      };
      record_communication_connection_error: {
        Args: { p_error: string; p_facility_id: string; p_provider?: string };
        Returns: undefined;
      };
      record_facility_export: {
        Args: {
          p_datasets: string[];
          p_facility_id: string;
          p_row_count: number;
        };
        Returns: string;
      };
      record_membership_grant: {
        Args: { p_expires_at?: string; p_staff_legacy_id: string };
        Returns: Json;
      };
      record_payment: {
        Args: {
          p_amount_charged: number;
          p_booking_id?: string;
          p_cash_received?: number;
          p_client_id?: string;
          p_credit_note?: string;
          p_customer_package_id?: string;
          p_facility_id: string;
          p_grand_total: number;
          p_loyalty_discount_applied?: number;
          p_method: string;
          p_package_pass_applied?: number;
          p_package_pass_id?: string;
          p_package_service_id?: string;
          p_pet_id?: string;
          p_pet_name?: string;
          p_receipt_channels?: string[];
          p_saved_card_id?: string;
          p_service_label?: string;
          p_store_credit_applied?: number;
          p_subtotal: number;
          p_tax: number;
          p_tip: number;
        };
        Returns: Json;
      };
      record_payment_connection_error: {
        Args: { p_error: string; p_facility_id: string; p_processor?: string };
        Returns: undefined;
      };
      record_payment_webhook: {
        Args: {
          p_app_id: string;
          p_change: string;
          p_environment: string;
          p_merchant_id: string;
          p_object_id: string;
          p_object_kind: string;
          p_occurred_at: string;
          p_payload: Json;
          p_processor: string;
        };
        Returns: {
          event_id: string;
          is_new: boolean;
        }[];
      };
      record_unattached_payment: {
        Args: {
          p_amount_cents: number;
          p_card_brand?: string;
          p_card_last4?: string;
          p_currency?: string;
          p_entry_method?: string;
          p_facility_id: string;
          p_payload?: Json;
          p_processor_device_serial?: string;
          p_processor_merchant_id?: string;
          p_processor_order_id?: string;
          p_processor_payment_id: string;
          p_taken_at?: string;
          p_tax_cents?: number;
          p_tip_cents?: number;
        };
        Returns: string;
      };
      redeem_gift_card: {
        Args: {
          p_amount: number;
          p_booking_id?: string;
          p_code: string;
          p_note?: string;
        };
        Returns: {
          balance: number;
          code: string;
          created_at: string;
          currency: string;
          expires_at: string | null;
          facility_id: string;
          id: string;
          initial_amount: number;
          issued_at: string;
          issued_by: string | null;
          kind: string;
          last_used_at: string | null;
          message: string | null;
          purchased_by_client_id: string | null;
          recipient_email: string | null;
          recipient_name: string | null;
          status: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "gift_cards";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      redeem_gift_card_to_credit: {
        Args: {
          p_amount: number;
          p_client_ref: number;
          p_code: string;
          p_note?: string;
        };
        Returns: number;
      };
      redeem_loyalty_points: {
        Args: {
          p_account_id: string;
          p_applies_to?: string[];
          p_description?: string;
          p_expires_at?: string;
          p_points: number;
          p_reward_type: string;
          p_reward_value: number;
        };
        Returns: {
          account_id: string;
          applies_to_services: string[] | null;
          expires_at: string | null;
          facility_id: string;
          id: string;
          issued_at: string;
          points_spent: number;
          reward_type: string;
          reward_value: number;
          status: string;
          used_at: string | null;
          used_on_booking_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "loyalty_vouchers";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      redeem_package_pass: {
        Args: {
          p_booking_id?: string;
          p_customer_package_id: string;
          p_pet_id?: string;
          p_pet_name?: string;
          p_service_id: string;
          p_service_label?: string;
        };
        Returns: number;
      };
      register_client: {
        Args: { p_facility_slug: string; p_name: string; p_phone?: string };
        Returns: string;
      };
      release_loyalty_voucher: {
        Args: { p_voucher_id: string };
        Returns: {
          account_id: string;
          applies_to_services: string[] | null;
          expires_at: string | null;
          facility_id: string;
          id: string;
          issued_at: string;
          points_spent: number;
          reward_type: string;
          reward_value: number;
          status: string;
          used_at: string | null;
          used_on_booking_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "loyalty_vouchers";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      reply_to_report_card: {
        Args: { p_card_id: string; p_message: string };
        Returns: {
          booking_id: string | null;
          client_id: string;
          created_at: string;
          created_by: string | null;
          delivery_status: string;
          facility_id: string;
          favourite: boolean;
          generated: Json;
          id: string;
          input: Json;
          pet_id: string;
          rating_comment: string | null;
          rating_stars: number | null;
          rating_submitted_at: string | null;
          replied_at: string | null;
          reply_message: string | null;
          scheduled_for: string | null;
          sent_at: string | null;
          service_type: string;
          theme: string | null;
          updated_at: string;
          viewed_at: string | null;
          visit_date: string;
        };
        SetofOptions: {
          from: "*";
          to: "report_cards";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      reset_facility_modules: {
        Args: { p_facility_id: string };
        Returns: number;
      };
      revoke_facility_owner_invite: {
        Args: { p_facility_id: string };
        Returns: Json;
      };
      revoke_payment_connection: {
        Args: { p_facility_id: string; p_processor?: string; p_reason: string };
        Returns: boolean;
      };
      revoke_platform_invitation: {
        Args: { p_invitation_id: string };
        Returns: Json;
      };
      revoke_platform_role: { Args: { p_profile_id: string }; Returns: Json };
      save_onboarding_section: {
        Args: {
          p_data: Json;
          p_section_type: string;
          p_status?: string;
          p_task_key: string;
          p_token: string;
        };
        Returns: boolean;
      };
      set_booking_tip_split: {
        Args: { p_allocations: Json; p_booking_ref: number; p_method: string };
        Returns: number;
      };
      set_customer_signup: {
        Args: { p_enabled: boolean; p_facility_id: string };
        Returns: boolean;
      };
      set_default_terminal: {
        Args: { p_terminal_id: string };
        Returns: undefined;
      };
      set_facility_module: {
        Args: {
          p_enabled: boolean;
          p_expires_at?: string;
          p_facility_id: string;
          p_module_id: string;
          p_note?: string;
          p_price_override_cents?: number;
        };
        Returns: undefined;
      };
      set_facility_owner_email: {
        Args: { p_email: string; p_facility_id: string };
        Returns: Json;
      };
      set_onboarding_account_complete: {
        Args: { p_token: string };
        Returns: boolean;
      };
      set_report_card_favourite: {
        Args: { p_card_id: string; p_favourite: boolean };
        Returns: {
          booking_id: string | null;
          client_id: string;
          created_at: string;
          created_by: string | null;
          delivery_status: string;
          facility_id: string;
          favourite: boolean;
          generated: Json;
          id: string;
          input: Json;
          pet_id: string;
          rating_comment: string | null;
          rating_stars: number | null;
          rating_submitted_at: string | null;
          replied_at: string | null;
          reply_message: string | null;
          scheduled_for: string | null;
          sent_at: string | null;
          service_type: string;
          theme: string | null;
          updated_at: string;
          viewed_at: string | null;
          visit_date: string;
        };
        SetofOptions: {
          from: "*";
          to: "report_cards";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_subscription_status: {
        Args: {
          p_facility_id: string;
          p_status: Database["public"]["Enums"]["subscription_status"];
        };
        Returns: Json;
      };
      settle_bookings: {
        Args: {
          p_booking_ids: string[];
          p_facility_id: string;
          p_method: string;
          p_receipt_channels?: string[];
        };
        Returns: Json;
      };
      store_boarding_secret: {
        Args: {
          p_application_id: string;
          p_kind: string;
          p_last4: string;
          p_principal_id: string;
          p_value: string;
        };
        Returns: undefined;
      };
      store_communication_credentials: {
        Args: {
          p_auth_token: string;
          p_connected_by?: string;
          p_facility_id: string;
          p_friendly_name?: string;
          p_provider?: string;
          p_subaccount_sid: string;
        };
        Returns: undefined;
      };
      store_payment_credentials: {
        Args: {
          p_access_expires?: string;
          p_access_token: string;
          p_connected_by?: string;
          p_country?: string;
          p_currency?: string;
          p_environment: string;
          p_facility_id: string;
          p_merchant_id: string;
          p_processor?: string;
          p_public_api_key?: string;
          p_refresh_expires?: string;
          p_refresh_token?: string;
          p_scopes?: string[];
        };
        Returns: undefined;
      };
      submit_onboarding: { Args: { p_token: string }; Returns: boolean };
      time_off_shift_conflicts: {
        Args: { p_request_id: string };
        Returns: {
          ends_at: string;
          shift_id: string;
          starts_at: string;
        }[];
      };
    };
    Enums: {
      access_scope: "anytime" | "operating_hours" | "assigned_shifts" | "none";
      approval_status: "pending" | "approved" | "denied" | "cancelled";
      booking_status:
        | "pending"
        | "estimate_sent"
        | "request_submitted"
        | "waitlisted"
        | "confirmed"
        | "checked_in"
        | "in_progress"
        | "ready"
        | "completed"
        | "no_show"
        | "cancelled"
        | "declined";
      facility_access_level: "admin" | "staff";
      facility_staff_role:
        | "owner"
        | "admin"
        | "manager"
        | "supervisor"
        | "reception"
        | "groomer"
        | "trainer"
        | "caretaker"
        | "daycare_attendant"
        | "boarding_attendant"
        | "retail"
        | "accountant"
        | "sanitation";
      platform_role: "superadmin" | "support" | "billing" | "readonly";
      position_pay_type: "hourly" | "salary";
      service_module:
        | "grooming"
        | "training"
        | "daycare"
        | "boarding"
        | "reception"
        | "retail"
        | "sanitation"
        | "transport";
      shift_status:
        | "draft"
        | "published"
        | "confirmed"
        | "completed"
        | "cancelled";
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "suspended"
        | "cancelled";
      time_clock_source: "self" | "manager";
      time_off_type:
        | "vacation"
        | "sick_leave"
        | "personal"
        | "bereavement"
        | "parental"
        | "unpaid"
        | "other";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      access_scope: ["anytime", "operating_hours", "assigned_shifts", "none"],
      approval_status: ["pending", "approved", "denied", "cancelled"],
      booking_status: [
        "pending",
        "estimate_sent",
        "request_submitted",
        "waitlisted",
        "confirmed",
        "checked_in",
        "in_progress",
        "ready",
        "completed",
        "no_show",
        "cancelled",
        "declined",
      ],
      facility_access_level: ["admin", "staff"],
      facility_staff_role: [
        "owner",
        "admin",
        "manager",
        "supervisor",
        "reception",
        "groomer",
        "trainer",
        "caretaker",
        "daycare_attendant",
        "boarding_attendant",
        "retail",
        "accountant",
        "sanitation",
      ],
      platform_role: ["superadmin", "support", "billing", "readonly"],
      position_pay_type: ["hourly", "salary"],
      service_module: [
        "grooming",
        "training",
        "daycare",
        "boarding",
        "reception",
        "retail",
        "sanitation",
        "transport",
      ],
      shift_status: [
        "draft",
        "published",
        "confirmed",
        "completed",
        "cancelled",
      ],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "suspended",
        "cancelled",
      ],
      time_clock_source: ["self", "manager"],
      time_off_type: [
        "vacation",
        "sick_leave",
        "personal",
        "bereavement",
        "parental",
        "unpaid",
        "other",
      ],
    },
  },
} as const;
