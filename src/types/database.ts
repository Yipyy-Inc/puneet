// ============================================================================
// GENERATED FILE — do not edit by hand.
//
// Regenerate after any schema change with the Supabase MCP
// (`generate_typescript_types`) or the CLI:
//   supabase gen types typescript --project-id nwvhjeqhhdcjhicnvypz > src/types/database.ts
//
// The Enums below are the database's copy of unions that also live in
// src/types/facility-staff.ts (AccessScope, FacilityStaffRole, ServiceModule).
// They are currently identical. If they ever diverge, the migration in
// supabase/migrations/ is the source of truth and the TS union is stale.
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
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
      bookings: {
        Row: {
          assigned_staff_id: string | null;
          assigned_staff_name: string | null;
          base_price: number;
          client_id: string;
          created_at: string;
          details: Json;
          discount: number;
          end_at: string;
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
          assigned_staff_id?: string | null;
          assigned_staff_name?: string | null;
          base_price?: number;
          client_id: string;
          created_at?: string;
          details?: Json;
          discount?: number;
          end_at: string;
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
          assigned_staff_id?: string | null;
          assigned_staff_name?: string | null;
          base_price?: number;
          client_id?: string;
          created_at?: string;
          details?: Json;
          discount?: number;
          end_at?: string;
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
            referencedRelation: "staff";
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
      staff_documents: {
        Row: {
          content_type: string;
          created_at: string;
          doc_type: string;
          facility_id: string;
          file_name: string;
          id: string;
          instance_id: string | null;
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
            referencedRelation: "staff";
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
            referencedRelation: "staff";
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      onboarding_by_token: { Args: { p_token: string }; Returns: Json };
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
      submit_onboarding: { Args: { p_token: string }; Returns: boolean };
      link_client_record: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      link_staff_invite: {
        Args: { p_email: string; p_staff_legacy_id: string; p_user_id: string };
        Returns: Json;
      };
      my_permissions: {
        Args: Record<PropertyKey, never>;
        Returns: {
          permission_key: string;
          scope: Database["public"]["Enums"]["access_scope"];
        }[];
      };
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
