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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          auth_number: string | null
          billing_status: string | null
          created_at: string | null
          created_by: string | null
          date: string
          duration: number | null
          guia_number: string | null
          id: string
          insurance_plan_id: string | null
          is_insurance: boolean | null
          is_package_session: boolean | null
          notes: string | null
          organization_id: string | null
          package_id: string | null
          patient_id: string | null
          patient_name: string
          payment_status: string | null
          price: number | null
          status: string | null
          time: string
          type: string
          updated_at: string | null
        }
        Insert: {
          auth_number?: string | null
          billing_status?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          duration?: number | null
          guia_number?: string | null
          id?: string
          insurance_plan_id?: string | null
          is_insurance?: boolean | null
          is_package_session?: boolean | null
          notes?: string | null
          organization_id?: string | null
          package_id?: string | null
          patient_id?: string | null
          patient_name: string
          payment_status?: string | null
          price?: number | null
          status?: string | null
          time: string
          type: string
          updated_at?: string | null
        }
        Update: {
          auth_number?: string | null
          billing_status?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          duration?: number | null
          guia_number?: string | null
          id?: string
          insurance_plan_id?: string | null
          is_insurance?: boolean | null
          is_package_session?: boolean | null
          notes?: string | null
          organization_id?: string | null
          package_id?: string | null
          patient_id?: string | null
          patient_name?: string
          payment_status?: string | null
          price?: number | null
          status?: string | null
          time?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_insurance_plan_id_fkey"
            columns: ["insurance_plan_id"]
            isOneToOne: false
            referencedRelation: "insurance_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "patient_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_batches: {
        Row: {
          competence: string
          created_at: string | null
          created_by: string | null
          id: string
          insurer_id: string | null
          organization_id: string | null
          status: string
          total_paid_value: number | null
          total_presented_value: number | null
          updated_at: string | null
        }
        Insert: {
          competence: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          insurer_id?: string | null
          organization_id?: string | null
          status?: string
          total_paid_value?: number | null
          total_presented_value?: number | null
          updated_at?: string | null
        }
        Update: {
          competence?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          insurer_id?: string | null
          organization_id?: string | null
          status?: string
          total_paid_value?: number | null
          total_presented_value?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_batches_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_glosses: {
        Row: {
          billing_item_id: string | null
          created_at: string | null
          created_by: string | null
          gloss_code: string | null
          id: string
          organization_id: string | null
          reason: string | null
          status: string
          updated_at: string | null
          value: number
        }
        Insert: {
          billing_item_id?: string | null
          created_at?: string | null
          created_by?: string | null
          gloss_code?: string | null
          id?: string
          organization_id?: string | null
          reason?: string | null
          status?: string
          updated_at?: string | null
          value?: number
        }
        Update: {
          billing_item_id?: string | null
          created_at?: string | null
          created_by?: string | null
          gloss_code?: string | null
          id?: string
          organization_id?: string | null
          reason?: string | null
          status?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_glosses_billing_item_id_fkey"
            columns: ["billing_item_id"]
            isOneToOne: false
            referencedRelation: "billing_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_glosses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_items: {
        Row: {
          appointment_id: string | null
          auth_number: string | null
          batch_id: string | null
          competence: string
          created_at: string | null
          created_by: string | null
          guia_number: string | null
          id: string
          insurance_plan_id: string | null
          medical_supply_id: string | null
          notes: string | null
          organization_id: string | null
          patient_id: string | null
          procedure_id: string | null
          professional_id: string | null
          quantity: number | null
          service_date: string
          status: string
          total_glossed_value: number | null
          total_paid_value: number | null
          total_presented_value: number
          unit_value: number
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          auth_number?: string | null
          batch_id?: string | null
          competence: string
          created_at?: string | null
          created_by?: string | null
          guia_number?: string | null
          id?: string
          insurance_plan_id?: string | null
          medical_supply_id?: string | null
          notes?: string | null
          organization_id?: string | null
          patient_id?: string | null
          procedure_id?: string | null
          professional_id?: string | null
          quantity?: number | null
          service_date: string
          status?: string
          total_glossed_value?: number | null
          total_paid_value?: number | null
          total_presented_value?: number
          unit_value?: number
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          auth_number?: string | null
          batch_id?: string | null
          competence?: string
          created_at?: string | null
          created_by?: string | null
          guia_number?: string | null
          id?: string
          insurance_plan_id?: string | null
          medical_supply_id?: string | null
          notes?: string | null
          organization_id?: string | null
          patient_id?: string | null
          procedure_id?: string | null
          professional_id?: string | null
          quantity?: number | null
          service_date?: string
          status?: string
          total_glossed_value?: number | null
          total_paid_value?: number | null
          total_presented_value?: number
          unit_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_items_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "billing_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_items_insurance_plan_id_fkey"
            columns: ["insurance_plan_id"]
            isOneToOne: false
            referencedRelation: "insurance_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_items_medical_supply_id_fkey"
            columns: ["medical_supply_id"]
            isOneToOne: false
            referencedRelation: "medical_supplies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_items_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_items_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_items_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string
          end_time: string | null
          history: string | null
          id: string
          is_unscheduled: boolean | null
          main_complaint: string | null
          materials_used: Json | null
          notes: string | null
          organization_id: string | null
          patient_id: string | null
          points_used: string[] | null
          pulse_diagnosis: string | null
          start_time: string | null
          syndrome_hypothesis: string | null
          tongue_diagnosis: string | null
          treatment_plan: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date: string
          end_time?: string | null
          history?: string | null
          id?: string
          is_unscheduled?: boolean | null
          main_complaint?: string | null
          materials_used?: Json | null
          notes?: string | null
          organization_id?: string | null
          patient_id?: string | null
          points_used?: string[] | null
          pulse_diagnosis?: string | null
          start_time?: string | null
          syndrome_hypothesis?: string | null
          tongue_diagnosis?: string | null
          treatment_plan?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          end_time?: string | null
          history?: string | null
          id?: string
          is_unscheduled?: boolean | null
          main_complaint?: string | null
          materials_used?: Json | null
          notes?: string | null
          organization_id?: string | null
          patient_id?: string | null
          points_used?: string[] | null
          pulse_diagnosis?: string | null
          start_time?: string | null
          syndrome_hypothesis?: string | null
          tongue_diagnosis?: string | null
          treatment_plan?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          created_at: string | null
          created_by: string | null
          data: Json
          date: string
          id: string
          organization_id: string | null
          patient_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data: Json
          date: string
          id?: string
          organization_id?: string | null
          patient_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data?: Json
          date?: string
          id?: string
          organization_id?: string | null
          patient_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          date: string
          description: string
          id: string
          notes: string | null
          organization_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          description: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_plans: {
        Row: {
          created_at: string | null
          created_by: string | null
          external_code: string | null
          id: string
          insurer_id: string | null
          name: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          external_code?: string | null
          id?: string
          insurer_id?: string | null
          name: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          external_code?: string | null
          id?: string
          insurer_id?: string | null
          name?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_plans_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_prices: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          medical_supply_id: string | null
          organization_id: string | null
          plan_id: string | null
          procedure_id: string | null
          unit_price: number
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          medical_supply_id?: string | null
          organization_id?: string | null
          plan_id?: string | null
          procedure_id?: string | null
          unit_price?: number
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          medical_supply_id?: string | null
          organization_id?: string | null
          plan_id?: string | null
          procedure_id?: string | null
          unit_price?: number
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_prices_medical_supply_id_fkey"
            columns: ["medical_supply_id"]
            isOneToOne: false
            referencedRelation: "medical_supplies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_prices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_prices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "insurance_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_prices_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      insurers: {
        Row: {
          ans_registration: string | null
          cnpj: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          ans_registration?: string | null
          cnpj?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ans_registration?: string | null
          cnpj?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          batch: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expiry_date: string | null
          id: string
          manufacturer: string | null
          metadata: Json | null
          min_quantity: number
          name: string
          organization_id: string | null
          quantity: number
          unit: string
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          batch?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          manufacturer?: string | null
          metadata?: Json | null
          min_quantity?: number
          name: string
          organization_id?: string | null
          quantity?: number
          unit?: string
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          batch?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          manufacturer?: string | null
          metadata?: Json | null
          min_quantity?: number
          name?: string
          organization_id?: string | null
          quantity?: number
          unit?: string
          unit_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          financial_id: string | null
          id: string
          is_reversed: boolean | null
          item_id: string | null
          notes: string | null
          organization_id: string | null
          quantity: number
          reversed_at: string | null
          type: string
          unit_price: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          financial_id?: string | null
          id?: string
          is_reversed?: boolean | null
          item_id?: string | null
          notes?: string | null
          organization_id?: string | null
          quantity: number
          reversed_at?: string | null
          type: string
          unit_price?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          financial_id?: string | null
          id?: string
          is_reversed?: boolean | null
          item_id?: string | null
          notes?: string | null
          organization_id?: string | null
          quantity?: number
          reversed_at?: string | null
          type?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_financial_id_fkey"
            columns: ["financial_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_supplies: {
        Row: {
          anvisa_registry: string | null
          batch: string | null
          category: string | null
          code: string
          created_at: string | null
          created_by: string | null
          id: string
          laboratory: string | null
          manufacturer: string | null
          name: string
          organization_id: string | null
          presentation: string | null
          updated_at: string | null
        }
        Insert: {
          anvisa_registry?: string | null
          batch?: string | null
          category?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          laboratory?: string | null
          manufacturer?: string | null
          name: string
          organization_id?: string | null
          presentation?: string | null
          updated_at?: string | null
        }
        Update: {
          anvisa_registry?: string | null
          batch?: string | null
          category?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          laboratory?: string | null
          manufacturer?: string | null
          name?: string
          organization_id?: string | null
          presentation?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_supplies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_feature_overrides: {
        Row: {
          enabled: boolean
          feature_key: string
          organization_id: string
        }
        Insert: {
          enabled?: boolean
          feature_key: string
          organization_id: string
        }
        Update: {
          enabled?: boolean
          feature_key?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_feature_overrides_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "saas_feature_catalog"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "organization_feature_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_limit_overrides: {
        Row: {
          limit_key: string
          organization_id: string
          quota_value: number | null
        }
        Insert: {
          limit_key: string
          organization_id: string
          quota_value?: number | null
        }
        Update: {
          limit_key?: string
          organization_id?: string
          quota_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_limit_overrides_limit_key_fkey"
            columns: ["limit_key"]
            isOneToOne: false
            referencedRelation: "saas_limit_catalog"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "organization_limit_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string
          external_id: string | null
          id: string
          mercado_pago_customer_id: string | null
          mercado_pago_subscription_id: string | null
          next_payment_date: string | null
          organization_id: string | null
          plan_id: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string
          external_id?: string | null
          id?: string
          mercado_pago_customer_id?: string | null
          mercado_pago_subscription_id?: string | null
          next_payment_date?: string | null
          organization_id?: string | null
          plan_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string
          external_id?: string | null
          id?: string
          mercado_pago_customer_id?: string | null
          mercado_pago_subscription_id?: string | null
          next_payment_date?: string | null
          organization_id?: string | null
          plan_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "saas_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          name: string
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name: string
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      patient_insurances: {
        Row: {
          card_number: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          organization_id: string | null
          patient_id: string | null
          plan_id: string | null
          updated_at: string | null
          validity_date: string | null
        }
        Insert: {
          card_number: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          organization_id?: string | null
          patient_id?: string | null
          plan_id?: string | null
          updated_at?: string | null
          validity_date?: string | null
        }
        Update: {
          card_number?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          organization_id?: string | null
          patient_id?: string | null
          plan_id?: string | null
          updated_at?: string | null
          validity_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_insurances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_insurances_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_insurances_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "insurance_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_packages: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          organization_id: string | null
          patient_id: string
          price: number
          status: string
          total_sessions: number
          updated_at: string | null
          used_sessions: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          organization_id?: string | null
          patient_id: string
          price: number
          status?: string
          total_sessions: number
          updated_at?: string | null
          used_sessions?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          organization_id?: string | null
          patient_id?: string
          price?: number
          status?: string
          total_sessions?: number
          updated_at?: string | null
          used_sessions?: number
        }
        Relationships: [
          {
            foreignKeyName: "patient_packages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_packages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          active_insurance_id: string | null
          address: string | null
          age: number | null
          avatar_url: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          gender: string | null
          id: string
          last_visit: string | null
          marital_status: string | null
          metadata: Json | null
          name: string
          organization_id: string | null
          phone: string | null
          profession: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          active_insurance_id?: string | null
          address?: string | null
          age?: number | null
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          last_visit?: string | null
          marital_status?: string | null
          metadata?: Json | null
          name: string
          organization_id?: string | null
          phone?: string | null
          profession?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          active_insurance_id?: string | null
          address?: string | null
          age?: number | null
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          last_visit?: string | null
          marital_status?: string | null
          metadata?: Json | null
          name?: string
          organization_id?: string | null
          phone?: string | null
          profession?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_active_insurance_id_fkey"
            columns: ["active_insurance_id"]
            isOneToOne: false
            referencedRelation: "patient_insurances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      procedures: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          permissions: string[] | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          permissions?: string[] | null
          role: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          permissions?: string[] | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      protocols: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string | null
          points: string[] | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
          points?: string[] | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          points?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocols_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_feature_catalog: {
        Row: {
          description: string | null
          key: string
          module_name: string | null
        }
        Insert: {
          description?: string | null
          key: string
          module_name?: string | null
        }
        Update: {
          description?: string | null
          key?: string
          module_name?: string | null
        }
        Relationships: []
      }
      saas_limit_catalog: {
        Row: {
          description: string | null
          key: string
          unit: string | null
        }
        Insert: {
          description?: string | null
          key: string
          unit?: string | null
        }
        Update: {
          description?: string | null
          key?: string
          unit?: string | null
        }
        Relationships: []
      }
      saas_plan_features: {
        Row: {
          feature_key: string
          plan_id: string
        }
        Insert: {
          feature_key: string
          plan_id: string
        }
        Update: {
          feature_key?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_plan_features_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "saas_feature_catalog"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "saas_plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "saas_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_plan_limits: {
        Row: {
          limit_key: string
          plan_id: string
          quota_value: number | null
        }
        Insert: {
          limit_key: string
          plan_id: string
          quota_value?: number | null
        }
        Update: {
          limit_key?: string
          plan_id?: string
          quota_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_plan_limits_limit_key_fkey"
            columns: ["limit_key"]
            isOneToOne: false
            referencedRelation: "saas_limit_catalog"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "saas_plan_limits_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "saas_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_plans: {
        Row: {
          checkout_url: string | null
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          mercado_pago_plan_id: string | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
        }
        Insert: {
          checkout_url?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          mercado_pago_plan_id?: string | null
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
        }
        Update: {
          checkout_url?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          mercado_pago_plan_id?: string | null
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          audit_enabled: boolean | null
          id: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          audit_enabled?: boolean | null
          id: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          audit_enabled?: boolean | null
          id?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user: { Args: { id_to_delete: string }; Returns: undefined }
      get_current_org_id: { Args: never; Returns: string }
      get_quota_usage: {
        Args: { p_limit_key: string }
        Returns: {
          r_current_usage: number
          r_is_unlimited: boolean
          r_limit_key: string
          r_quota_value: number
        }[]
      }
      handle_subscription_webhook_update: {
        Args: {
          p_mercado_pago_customer_id: string
          p_mercado_pago_plan_id: string
          p_mercado_pago_subscription_id: string
          p_next_payment_date: string
          p_organization_id: string
          p_status: string
        }
        Returns: undefined
      }
      has_feature: { Args: { p_feature_key: string }; Returns: boolean }
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
    Enums: {},
  },
} as const
