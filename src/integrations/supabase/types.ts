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
      bids: {
        Row: {
          annual_fee: number
          cover_letter: string | null
          estimated_hours: number | null
          firm_id: string
          id: string
          proposed_timeline: string | null
          qualifications: string | null
          references_text: string | null
          rfp_id: string
          status: Database["public"]["Enums"]["bid_status"]
          submitted_at: string
          updated_at: string
        }
        Insert: {
          annual_fee: number
          cover_letter?: string | null
          estimated_hours?: number | null
          firm_id: string
          id?: string
          proposed_timeline?: string | null
          qualifications?: string | null
          references_text?: string | null
          rfp_id: string
          status?: Database["public"]["Enums"]["bid_status"]
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          annual_fee?: number
          cover_letter?: string | null
          estimated_hours?: number | null
          firm_id?: string
          id?: string
          proposed_timeline?: string | null
          qualifications?: string | null
          references_text?: string | null
          rfp_id?: string
          status?: Database["public"]["Enums"]["bid_status"]
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          annual_fee_cents: number
          bid_id: string
          contract_term_years: number
          created_at: string
          deliverable_deadline: string | null
          docuseal_submission_id: string | null
          effective_date: string | null
          entity_id: string
          expiration_date: string | null
          firm_id: string
          firm_signed_at: string | null
          firm_signer_ip: string | null
          firm_signer_name: string | null
          fiscal_year_end: string | null
          fiscal_years: string[] | null
          fully_executed_at: string | null
          govt_signed_at: string | null
          govt_signer_ip: string | null
          govt_signer_name: string | null
          id: string
          platform_fee_cents: number
          platform_fee_pct: number
          renewal_option_years: number | null
          rfp_id: string
          scope_of_work: string | null
          signed_pdf_url: string | null
          special_requirements: string | null
          status: Database["public"]["Enums"]["contract_status"]
          total_value_cents: number
          updated_at: string
        }
        Insert: {
          annual_fee_cents: number
          bid_id: string
          contract_term_years: number
          created_at?: string
          deliverable_deadline?: string | null
          docuseal_submission_id?: string | null
          effective_date?: string | null
          entity_id: string
          expiration_date?: string | null
          firm_id: string
          firm_signed_at?: string | null
          firm_signer_ip?: string | null
          firm_signer_name?: string | null
          fiscal_year_end?: string | null
          fiscal_years?: string[] | null
          fully_executed_at?: string | null
          govt_signed_at?: string | null
          govt_signer_ip?: string | null
          govt_signer_name?: string | null
          id?: string
          platform_fee_cents: number
          platform_fee_pct?: number
          renewal_option_years?: number | null
          rfp_id: string
          scope_of_work?: string | null
          signed_pdf_url?: string | null
          special_requirements?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          total_value_cents: number
          updated_at?: string
        }
        Update: {
          annual_fee_cents?: number
          bid_id?: string
          contract_term_years?: number
          created_at?: string
          deliverable_deadline?: string | null
          docuseal_submission_id?: string | null
          effective_date?: string | null
          entity_id?: string
          expiration_date?: string | null
          firm_id?: string
          firm_signed_at?: string | null
          firm_signer_ip?: string | null
          firm_signer_name?: string | null
          fiscal_year_end?: string | null
          fiscal_years?: string[] | null
          fully_executed_at?: string | null
          govt_signed_at?: string | null
          govt_signer_ip?: string | null
          govt_signer_name?: string | null
          id?: string
          platform_fee_cents?: number
          platform_fee_pct?: number
          renewal_option_years?: number | null
          rfp_id?: string
          scope_of_work?: string | null
          signed_pdf_url?: string | null
          special_requirements?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          total_value_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          address: string | null
          annual_expenditures: number | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_title: string | null
          created_at: string
          ein: string | null
          entity_type: Database["public"]["Enums"]["entity_type"]
          federal_expenditures: number | null
          fiscal_year_end: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string | null
          phone: string | null
          receives_federal: boolean
          state: string
          updated_at: string
          verified: boolean
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          annual_expenditures?: number | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_title?: string | null
          created_at?: string
          ein?: string | null
          entity_type: Database["public"]["Enums"]["entity_type"]
          federal_expenditures?: number | null
          fiscal_year_end?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          receives_federal?: boolean
          state: string
          updated_at?: string
          verified?: boolean
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          annual_expenditures?: number | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_title?: string | null
          created_at?: string
          ein?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"]
          federal_expenditures?: number | null
          fiscal_year_end?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          receives_federal?: boolean
          state?: string
          updated_at?: string
          verified?: boolean
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_audit_types: {
        Row: {
          audit_type: Database["public"]["Enums"]["audit_type"]
          firm_id: string
        }
        Insert: {
          audit_type: Database["public"]["Enums"]["audit_type"]
          firm_id: string
        }
        Update: {
          audit_type?: Database["public"]["Enums"]["audit_type"]
          firm_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_audit_types_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_entity_types: {
        Row: {
          entity_type: Database["public"]["Enums"]["entity_type"]
          firm_id: string
        }
        Insert: {
          entity_type: Database["public"]["Enums"]["entity_type"]
          firm_id: string
        }
        Update: {
          entity_type?: Database["public"]["Enums"]["entity_type"]
          firm_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_entity_types_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_licenses: {
        Row: {
          created_at: string
          expires_at: string | null
          firm_id: string
          id: string
          license_num: string
          state: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          firm_id: string
          id?: string
          license_num: string
          state: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          firm_id?: string
          id?: string
          license_num?: string
          state?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "firm_licenses_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          address: string | null
          aicpa_gaqc_member: boolean
          bio: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_title: string | null
          created_at: string
          ein: string | null
          founded_year: number | null
          id: string
          name: string
          owner_id: string | null
          phone: string | null
          staff_count: number | null
          state: string | null
          stripe_customer_id: string | null
          suspended: boolean
          updated_at: string
          verified: boolean
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          aicpa_gaqc_member?: boolean
          bio?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_title?: string | null
          created_at?: string
          ein?: string | null
          founded_year?: number | null
          id?: string
          name: string
          owner_id?: string | null
          phone?: string | null
          staff_count?: number | null
          state?: string | null
          stripe_customer_id?: string | null
          suspended?: boolean
          updated_at?: string
          verified?: boolean
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          aicpa_gaqc_member?: boolean
          bio?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_title?: string | null
          created_at?: string
          ein?: string | null
          founded_year?: number | null
          id?: string
          name?: string
          owner_id?: string | null
          phone?: string | null
          staff_count?: number | null
          state?: string | null
          stripe_customer_id?: string | null
          suspended?: boolean
          updated_at?: string
          verified?: boolean
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firms_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_cents: number
          contract_id: string
          created_at: string
          due_date: string | null
          firm_id: string
          id: string
          paid_at: string | null
          paid_by: string | null
          pdf_url: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          stripe_invoice_id: string | null
          stripe_payment_intent: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          contract_id: string
          created_at?: string
          due_date?: string | null
          firm_id: string
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_invoice_id?: string | null
          stripe_payment_intent?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          contract_id?: string
          created_at?: string
          due_date?: string | null
          firm_id?: string
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_invoice_id?: string | null
          stripe_payment_intent?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: true
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rfps: {
        Row: {
          audit_type: Database["public"]["Enums"]["audit_type"]
          awarded_bid_id: string | null
          bid_deadline: string | null
          budget_max: number | null
          budget_min: number | null
          contract_term_years: number
          created_at: string
          description: string | null
          entity_id: string
          fiscal_year_end: string | null
          fiscal_years: string[]
          id: string
          renewal_option_years: number | null
          requires_single_audit: boolean
          special_requirements: string | null
          state: string
          status: Database["public"]["Enums"]["rfp_status"]
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          audit_type: Database["public"]["Enums"]["audit_type"]
          awarded_bid_id?: string | null
          bid_deadline?: string | null
          budget_max?: number | null
          budget_min?: number | null
          contract_term_years?: number
          created_at?: string
          description?: string | null
          entity_id: string
          fiscal_year_end?: string | null
          fiscal_years?: string[]
          id?: string
          renewal_option_years?: number | null
          requires_single_audit?: boolean
          special_requirements?: string | null
          state: string
          status?: Database["public"]["Enums"]["rfp_status"]
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          audit_type?: Database["public"]["Enums"]["audit_type"]
          awarded_bid_id?: string | null
          bid_deadline?: string | null
          budget_max?: number | null
          budget_min?: number | null
          contract_term_years?: number
          created_at?: string
          description?: string | null
          entity_id?: string
          fiscal_year_end?: string | null
          fiscal_years?: string[]
          id?: string
          renewal_option_years?: number | null
          requires_single_audit?: boolean
          special_requirements?: string | null
          state?: string
          status?: Database["public"]["Enums"]["rfp_status"]
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "rfps_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      audit_type:
        | "yellow_book"
        | "single_audit"
        | "financial_statement"
        | "agreed_upon_procedures"
        | "performance"
        | "forensic"
      bid_status:
        | "submitted"
        | "under_review"
        | "shortlisted"
        | "awarded"
        | "rejected"
        | "withdrawn"
      contract_status:
        | "draft"
        | "pending_govt_sig"
        | "pending_firm_sig"
        | "fully_executed"
        | "active"
        | "expired"
        | "terminated"
        | "completed"
        | "pending_signature"
      entity_type:
        | "local_government"
        | "nonprofit"
        | "school_district"
        | "charter_school"
        | "community_college"
        | "housing_authority"
        | "transit_authority"
        | "other"
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "void" | "pending"
      rfp_status:
        | "draft"
        | "open"
        | "closing_soon"
        | "under_review"
        | "awarded"
        | "cancelled"
      user_role: "admin" | "entity_user" | "firm_user"
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
      audit_type: [
        "yellow_book",
        "single_audit",
        "financial_statement",
        "agreed_upon_procedures",
        "performance",
        "forensic",
      ],
      bid_status: [
        "submitted",
        "under_review",
        "shortlisted",
        "awarded",
        "rejected",
        "withdrawn",
      ],
      contract_status: [
        "draft",
        "pending_govt_sig",
        "pending_firm_sig",
        "fully_executed",
        "active",
        "expired",
        "terminated",
        "completed",
        "pending_signature",
      ],
      entity_type: [
        "local_government",
        "nonprofit",
        "school_district",
        "charter_school",
        "community_college",
        "housing_authority",
        "transit_authority",
        "other",
      ],
      invoice_status: ["draft", "sent", "paid", "overdue", "void", "pending"],
      rfp_status: [
        "draft",
        "open",
        "closing_soon",
        "under_review",
        "awarded",
        "cancelled",
      ],
      user_role: ["admin", "entity_user", "firm_user"],
    },
  },
} as const
