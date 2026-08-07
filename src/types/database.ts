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
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      facility_rooms: {
        Row: {
          active: boolean;
          capacity: number | null;
          category_id: string;
          created_at: string;
          facility_id: string;
          id: string;
          image_url: string | null;
          legacy_id: string;
          name: string;
          sort_order: number;
          staff_notes: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          capacity?: number | null;
          category_id: string;
          created_at?: string;
          facility_id: string;
          id?: string;
          image_url?: string | null;
          legacy_id: string;
          name: string;
          sort_order?: number;
          staff_notes?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          capacity?: number | null;
          category_id?: string;
          created_at?: string;
          facility_id?: string;
          id?: string;
          image_url?: string | null;
          legacy_id?: string;
          name?: string;
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
        ];
      };
      room_categories: {
        Row: {
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
        Relationships: [];
      };
      boarding_stays: {
        Row: {
          booking_id: string;
          checked_in_at: string | null;
          checked_out_at: string | null;
          created_at: string;
          facility_id: string;
          occupies: string;
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
          occupies: string;
          override_reason?: string | null;
          released_at?: string | null;
          room_id: string;
          status?: never;
          updated_at?: string;
        };
        Update: {
          booking_id?: string;
          checked_in_at?: string | null;
          checked_out_at?: string | null;
          created_at?: string;
          facility_id?: string;
          occupies?: string;
          override_reason?: string | null;
          released_at?: string | null;
          room_id?: string;
          status?: never;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "boarding_stays_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
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
            referencedRelation: "bookings";
            referencedColumns: ["id"];
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
            foreignKeyName: "training_trainer_profiles_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: true;
            referencedRelation: "staff";
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
          status?: never;
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
          status?: never;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "training_attendance_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
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
          status: string;
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
          updated_at?: string;
        };
        Relationships: [];
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
        Relationships: [];
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
          price: number;
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
          quantity?: number;
          source_id?: string | null;
          unit_price?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          amount_due: number;
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
      facilities: {
        Row: {
          created_at: string;
          id: string;
          legacy_id: string | null;
          name: string;
          org_id: string;
          slug: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          legacy_id?: string | null;
          name: string;
          org_id: string;
          slug: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          legacy_id?: string | null;
          name?: string;
          org_id?: string;
          slug?: string;
          timezone?: string;
          updated_at?: string;
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
      facility_membership_grants: {
        Row: {
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
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      facility_memberships: {
        Row: {
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
          created_at: string;
          facility_id: string;
          id: string;
          is_primary: boolean;
          legacy_id: string | null;
          name: string;
          timezone: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          facility_id: string;
          id?: string;
          is_primary?: boolean;
          legacy_id?: string | null;
          name: string;
          timezone?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          facility_id?: string;
          id?: string;
          is_primary?: boolean;
          legacy_id?: string | null;
          name?: string;
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
        ];
      };
      payments: {
        Row: {
          amount_charged: number;
          author_name: string;
          booking_id: string | null;
          cash_received: number | null;
          client_id: string | null;
          created_at: string;
          created_by: string | null;
          facility_id: string;
          grand_total: number;
          id: string;
          loyalty_discount_applied: number;
          method: string;
          package_pass_applied: number;
          package_pass_id: string | null;
          receipt_channels: string[];
          saved_card_id: string | null;
          store_credit_applied: number;
          subtotal: number;
          tax: number;
          tip: number;
        };
        Insert: {
          amount_charged: number;
          author_name?: string;
          booking_id?: string | null;
          cash_received?: number | null;
          client_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          facility_id: string;
          grand_total: number;
          id?: string;
          loyalty_discount_applied?: number;
          method: string;
          package_pass_applied?: number;
          package_pass_id?: string | null;
          receipt_channels?: string[];
          saved_card_id?: string | null;
          store_credit_applied?: number;
          subtotal: number;
          tax?: number;
          tip?: number;
        };
        Update: {
          amount_charged?: number;
          author_name?: string;
          booking_id?: string | null;
          cash_received?: number | null;
          client_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          facility_id?: string;
          grand_total?: number;
          id?: string;
          loyalty_discount_applied?: number;
          method?: string;
          package_pass_applied?: number;
          package_pass_id?: string | null;
          receipt_channels?: string[];
          saved_card_id?: string | null;
          store_credit_applied?: number;
          subtotal?: number;
          tax?: number;
          tip?: number;
        };
        Relationships: [];
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
      staff: {
        Row: {
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
        Relationships: [];
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
        Relationships: [];
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
    };
    Functions: {
      assign_boarding_room: {
        Args: {
          p_booking_ref: number;
          p_override_reason?: string | null;
          p_room_id?: string | null;
        };
        Returns: string | null;
      };
      set_booking_tip_split: {
        Args: {
          p_booking_ref: number;
          p_method: string;
          p_allocations: Json;
        };
        Returns: number;
      };
      record_boarding_arrival: {
        Args: {
          p_booking_ref: number;
          p_action: string;
        };
        Returns: string;
      };
      create_booking: {
        Args: {
          p_booking: Json;
          p_boarding?: Json;
          p_grooming?: Json;
          p_pet_ids?: string[];
        };
        Returns: { booking_id: string; booking_ref: number }[];
      };
      link_client_record: { Args: never; Returns: string };
      link_staff_invite: {
        Args: { p_profile_id: string; p_staff_legacy_id: string };
        Returns: Json;
      };
      record_membership_grant: {
        Args: { p_expires_at?: string | null; p_staff_legacy_id: string };
        Returns: Json;
      };
      facility_branding_by_slug: {
        Args: { p_slug: string };
        Returns: {
          facility_id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          wordmark_url: string | null;
          primary_color: string | null;
          accent_color: string | null;
          tagline: string | null;
        }[];
      };
      invite_facility_owner: {
        Args: { p_expires_at?: string | null; p_facility_id: string };
        Returns: Json;
      };
      revoke_facility_owner_invite: {
        Args: { p_facility_id: string };
        Returns: Json;
      };
      provision_facility: {
        Args: {
          p_contact_email?: string | null;
          p_contact_phone?: string | null;
          p_locations?: Json;
          p_name: string;
          p_owner_email: string;
          p_owner_name: string;
          p_owner_phone?: string | null;
          p_request_id: string;
          p_slug: string;
          p_timezone: string;
          p_website?: string | null;
        };
        Returns: Json;
      };
      my_permissions: {
        Args: never;
        Returns: {
          permission_key: string;
          scope: Database["public"]["Enums"]["access_scope"];
        }[];
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
      purchase_package: {
        Args: {
          p_client_id: string;
          p_package_id: string;
          p_price_override?: number;
        };
        Returns: string;
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
      set_onboarding_account_complete: {
        Args: { p_token: string };
        Returns: boolean;
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
      submit_onboarding: { Args: { p_token: string }; Returns: boolean };
    };
    Enums: {
      access_scope: "anytime" | "operating_hours" | "assigned_shifts" | "none";
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
      service_module:
        | "grooming"
        | "training"
        | "daycare"
        | "boarding"
        | "reception"
        | "retail"
        | "sanitation"
        | "transport";
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
    },
  },
} as const;
