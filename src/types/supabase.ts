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
      bank_accounts: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      card_bills: {
        Row: {
          bank_account_id: string | null
          card_id: string
          category_id: string | null
          created_at: string
          id: string
          month: string
          paid: boolean
          paid_at: string | null
          payment_date: string | null
          user_id: string
          value: number
          detalhes?: string | null
        }
        Insert: {
          bank_account_id?: string | null
          card_id: string
          category_id?: string | null
          created_at?: string
          id?: string
          month: string
          paid?: boolean
          paid_at?: string | null
          payment_date?: string | null
          user_id: string
          value?: number
          detalhes?: string | null
        }
        Update: {
          bank_account_id?: string | null
          card_id?: string
          category_id?: string | null
          created_at?: string
          id?: string
          month?: string
          paid?: boolean
          paid_at?: string | null
          payment_date?: string | null
          user_id?: string
          value?: number
          detalhes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_bills_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_bills_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_bills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          created_at: string
          due_day: number
          end_month: string | null
          id: string
          name: string
          start_month: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_day?: number
          end_month?: string | null
          id?: string
          name: string
          start_month: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_day?: number
          end_month?: string | null
          id?: string
          name?: string
          start_month?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      entradas: {
        Row: {
          criado_em: string | null
          data_registro: string
          descricao: string
          id: string
          valor: number
        }
        Insert: {
          criado_em?: string | null
          data_registro: string
          descricao: string
          id?: string
          valor: number
        }
        Update: {
          criado_em?: string | null
          data_registro?: string
          descricao?: string
          id?: string
          valor?: number
        }
        Relationships: []
      }
      expenses: {
        Row: {
          category_id: string | null
          created_at: string
          due_day: number | null
          id: string
          month: string
          name: string
          paid: boolean
          user_id: string
          value: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          due_day?: number | null
          id?: string
          month: string
          name: string
          paid?: boolean
          user_id: string
          value?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          due_day?: number | null
          id?: string
          month?: string
          name?: string
          paid?: boolean
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      extra_incomes: {
        Row: {
          bank_account_id: string | null
          created_at: string
          description: string | null
          id: string
          month: string
          received_at: string | null
          user_id: string
          value: number
        }
        Insert: {
          bank_account_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          month: string
          received_at?: string | null
          user_id: string
          value?: number
        }
        Update: {
          bank_account_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          month?: string
          received_at?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "extra_incomes_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      extraordinary_expenses: {
        Row: {
          bank_account_id: string | null
          category_id: string | null
          created_at: string
          id: string
          month: string
          name: string
          paid: boolean
          paid_at: string | null
          payment_method: string
          user_id: string
          value: number
        }
        Insert: {
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          month: string
          name: string
          paid?: boolean
          paid_at?: string | null
          payment_method?: string
          user_id: string
          value?: number
        }
        Update: {
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          month?: string
          name?: string
          paid?: boolean
          paid_at?: string | null
          payment_method?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "extraordinary_expenses_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extraordinary_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          id: string
          name: string
          purchased: boolean
          target_value: number
          user_id: string
          actual_paid_value: number | null
          payment_date: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          purchased?: boolean
          target_value: number
          user_id: string
          actual_paid_value?: number | null
          payment_date?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          purchased?: boolean
          target_value?: number
          user_id?: string
          actual_paid_value?: number | null
          payment_date?: string | null
        }
        Relationships: []
      }
      income_entries: {
        Row: {
          bank_account_id: string | null
          created_at: string
          id: string
          income_date: string | null
          month: string
          received_at: string | null
          user_id: string
          value: number
        }
        Insert: {
          bank_account_id?: string | null
          created_at?: string
          id?: string
          income_date?: string | null
          month: string
          received_at?: string | null
          user_id: string
          value?: number
        }
        Update: {
          bank_account_id?: string | null
          created_at?: string
          id?: string
          income_date?: string | null
          month?: string
          received_at?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "income_entries_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_items: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string
          id: string
          installment_purchase_id: string
          month: string
          paid: boolean
          paid_at: string | null
          sequence_number: number
          user_id: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          created_at?: string
          id?: string
          installment_purchase_id: string
          month: string
          paid?: boolean
          paid_at?: string | null
          sequence_number: number
          user_id: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string
          id?: string
          installment_purchase_id?: string
          month?: string
          paid?: boolean
          paid_at?: string | null
          sequence_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_items_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_items_installment_purchase_id_fkey"
            columns: ["installment_purchase_id"]
            isOneToOne: false
            referencedRelation: "installment_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_purchases: {
        Row: {
          card_id: string | null
          category_id: string | null
          created_at: string
          due_day: number
          id: string
          monthly_value: number
          name: string
          payment_method: string
          start_month: string
          total_months: number
          user_id: string
        }
        Insert: {
          card_id?: string | null
          category_id?: string | null
          created_at?: string
          due_day?: number
          id?: string
          monthly_value: number
          name: string
          payment_method?: string
          start_month: string
          total_months: number
          user_id: string
        }
        Update: {
          card_id?: string | null
          category_id?: string | null
          created_at?: string
          due_day?: number
          id?: string
          monthly_value?: number
          name?: string
          payment_method?: string
          start_month?: string
          total_months?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_purchases_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_purchases_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          month: string
          occurred_on: string
          type: string
          user_id: string
          value: number
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          month: string
          occurred_on: string
          type: string
          user_id: string
          value: number
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          month?: string
          occurred_on?: string
          type?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      ledger_cloud: {
        Row: {
          dados: Json
          id: number
        }
        Insert: {
          dados: Json
          id: number
        }
        Update: {
          dados?: Json
          id?: number
        }
        Relationships: []
      }
      manual_transactions: {
        Row: {
          bank_account_id: string | null
          category_id: string | null
          created_at: string
          date: string
          description: string
          direction: string
          id: string
          month: string
          occurred_at: string | null
          payment_method: string
          user_id: string
          value: number
          observacao: string | null
          pago_por_terceiros: boolean | null
        }
        Insert: {
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string
          date: string
          description: string
          direction: string
          id?: string
          month: string
          occurred_at?: string | null
          payment_method?: string
          user_id: string
          value: number
          observacao?: string | null
          pago_por_terceiros?: boolean | null
        }
        Update: {
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string
          direction?: string
          id?: string
          month?: string
          occurred_at?: string | null
          payment_method?: string
          user_id?: string
          value?: number
          observacao?: string | null
          pago_por_terceiros?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_expense_months: {
        Row: {
          bank_account_id: string | null
          created_at: string
          date_override: string | null
          id: string
          is_active: boolean
          month: string
          paid: boolean
          paid_at: string | null
          recurring_expense_id: string
          user_id: string
          value_override: number | null
        }
        Insert: {
          bank_account_id?: string | null
          created_at?: string
          date_override?: string | null
          id?: string
          is_active?: boolean
          month: string
          paid?: boolean
          paid_at?: string | null
          recurring_expense_id: string
          user_id: string
          value_override?: number | null
        }
        Update: {
          bank_account_id?: string | null
          created_at?: string
          date_override?: string | null
          id?: string
          is_active?: boolean
          month?: string
          paid?: boolean
          paid_at?: string | null
          recurring_expense_id?: string
          user_id?: string
          value_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expense_months_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expense_months_recurring_expense_id_fkey"
            columns: ["recurring_expense_id"]
            isOneToOne: false
            referencedRelation: "recurring_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_expenses: {
        Row: {
          card_id: string | null
          category_id: string | null
          created_at: string
          due_day: number
          end_month: string | null
          id: string
          name: string
          payment_method: string
          start_month: string
          user_id: string
          value: number
        }
        Insert: {
          card_id?: string | null
          category_id?: string | null
          created_at?: string
          due_day?: number
          end_month?: string | null
          id?: string
          name: string
          payment_method?: string
          start_month: string
          user_id: string
          value?: number
        }
        Update: {
          card_id?: string | null
          category_id?: string | null
          created_at?: string
          due_day?: number
          end_month?: string | null
          id?: string
          name?: string
          payment_method?: string
          start_month?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      saidas: {
        Row: {
          criado_em: string | null
          data_registro: string
          descricao: string
          id: string
          valor: number
        }
        Insert: {
          criado_em?: string | null
          data_registro: string
          descricao: string
          id?: string
          valor: number
        }
        Update: {
          criado_em?: string | null
          data_registro?: string
          descricao?: string
          id?: string
          valor?: number
        }
        Relationships: []
      }
      subscription_months: {
        Row: {
          bank_account_id: string | null
          created_at: string
          date_override: string | null
          id: string
          is_active: boolean
          month: string
          paid: boolean
          paid_at: string | null
          subscription_id: string
          user_id: string
          value_override: number | null
        }
        Insert: {
          bank_account_id?: string | null
          created_at?: string
          date_override?: string | null
          id?: string
          is_active?: boolean
          month: string
          paid?: boolean
          paid_at?: string | null
          subscription_id: string
          user_id: string
          value_override?: number | null
        }
        Update: {
          bank_account_id?: string | null
          created_at?: string
          date_override?: string | null
          id?: string
          is_active?: boolean
          month?: string
          paid?: boolean
          paid_at?: string | null
          subscription_id?: string
          user_id?: string
          value_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_months_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_months_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          card_id: string | null
          category_id: string | null
          created_at: string
          due_day: number
          end_month: string | null
          id: string
          name: string
          payment_method: string
          start_month: string
          user_id: string
          value: number
        }
        Insert: {
          card_id?: string | null
          category_id?: string | null
          created_at?: string
          due_day?: number
          end_month?: string | null
          id?: string
          name: string
          payment_method?: string
          start_month: string
          user_id: string
          value?: number
        }
        Update: {
          card_id?: string | null
          category_id?: string | null
          created_at?: string
          due_day?: number
          end_month?: string | null
          id?: string
          name?: string
          payment_method?: string
          start_month?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ledger: {
        Row: {
          dados: Json
          user_id: string
        }
        Insert: {
          dados?: Json
          user_id: string
        }
        Update: {
          dados?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_ledger_backup_20260816: {
        Row: {
          dados: Json | null
          user_id: string | null
        }
        Insert: {
          dados?: Json | null
          user_id?: string | null
        }
        Update: {
          dados?: Json | null
          user_id?: string | null
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
