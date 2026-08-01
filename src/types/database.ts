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
            referencedRelation: "facility_memberships";
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
      [_ in never]: never;
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
