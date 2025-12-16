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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cadastro_alunos: {
        Row: {
          cpf: string | null
          created_at: string
          email: string | null
          fone: string | null
          formacao: string | null
          id: string
          inicio: string | null
          nascimento: string | null
          nome: string
          profissao: string | null
          turma: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          fone?: string | null
          formacao?: string | null
          id?: string
          inicio?: string | null
          nascimento?: string | null
          nome: string
          profissao?: string | null
          turma?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          fone?: string | null
          formacao?: string | null
          id?: string
          inicio?: string | null
          nascimento?: string | null
          nome?: string
          profissao?: string | null
          turma?: string | null
        }
        Relationships: []
      }
      cadastro_associados: {
        Row: {
          created_at: string
          id: string
          nome: string
          observacoes: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          observacoes?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          observacoes?: string | null
          status?: string | null
        }
        Relationships: []
      }
      cadastro_outros: {
        Row: {
          cpf_cnpj: string | null
          created_at: string
          id: string
          nome: string
          observacoes: string | null
          tipo: string
        }
        Insert: {
          cpf_cnpj?: string | null
          created_at?: string
          id?: string
          nome: string
          observacoes?: string | null
          tipo: string
        }
        Update: {
          cpf_cnpj?: string | null
          created_at?: string
          id?: string
          nome?: string
          observacoes?: string | null
          tipo?: string
        }
        Relationships: []
      }
      historico_identificacao: {
        Row: {
          cadastro_id: string
          cadastro_nome: string
          created_at: string
          documento: string
          historico: string
          id: string
          tipo_cadastro: string
        }
        Insert: {
          cadastro_id: string
          cadastro_nome: string
          created_at?: string
          documento: string
          historico: string
          id?: string
          tipo_cadastro: string
        }
        Update: {
          cadastro_id?: string
          cadastro_nome?: string
          created_at?: string
          documento?: string
          historico?: string
          id?: string
          tipo_cadastro?: string
        }
        Relationships: []
      }
      log_extratos: {
        Row: {
          ag_origem: string | null
          created_at: string
          documento: string | null
          dt_balancete: string
          dt_movimento: string
          extrato_origem: string
          historico: string | null
          id: string
          identificado_id: string | null
          identificado_nome: string | null
          identificado_tipo: string | null
          lote: string | null
          saldo: string | null
          valor: string | null
        }
        Insert: {
          ag_origem?: string | null
          created_at?: string
          documento?: string | null
          dt_balancete: string
          dt_movimento: string
          extrato_origem: string
          historico?: string | null
          id?: string
          identificado_id?: string | null
          identificado_nome?: string | null
          identificado_tipo?: string | null
          lote?: string | null
          saldo?: string | null
          valor?: string | null
        }
        Update: {
          ag_origem?: string | null
          created_at?: string
          documento?: string | null
          dt_balancete?: string
          dt_movimento?: string
          extrato_origem?: string
          historico?: string | null
          id?: string
          identificado_id?: string | null
          identificado_nome?: string | null
          identificado_tipo?: string | null
          lote?: string | null
          saldo?: string | null
          valor?: string | null
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
