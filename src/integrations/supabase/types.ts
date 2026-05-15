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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          is_admin: boolean
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          is_admin?: boolean
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          is_admin?: boolean
        }
        Relationships: []
      }
      account_permissions: {
        Row: {
          account_id: string
          granted_at: string
          granted_by: string | null
          permission_key: string
        }
        Insert: {
          account_id: string
          granted_at?: string
          granted_by?: string | null
          permission_key: string
        }
        Update: {
          account_id?: string
          granted_at?: string
          granted_by?: string | null
          permission_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_permissions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      accounts: {
        Row: {
          banned: boolean
          chat_count: number
          created_at: string
          equipped: Json
          id: string
          inventory: Json
          last_chat_at: string | null
          last_login_at: string | null
          last_streak_date: string | null
          must_set_username: boolean
          muted_until: string | null
          password_hash: string
          points: number
          role: string
          settings: Json
          streak_days: number
          total_earned: number
          updated_at: string
          username: string | null
        }
        Insert: {
          banned?: boolean
          chat_count?: number
          created_at?: string
          equipped?: Json
          id: string
          inventory?: Json
          last_chat_at?: string | null
          last_login_at?: string | null
          last_streak_date?: string | null
          must_set_username?: boolean
          muted_until?: string | null
          password_hash: string
          points?: number
          role?: string
          settings?: Json
          streak_days?: number
          total_earned?: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          banned?: boolean
          chat_count?: number
          created_at?: string
          equipped?: Json
          id?: string
          inventory?: Json
          last_chat_at?: string | null
          last_login_at?: string | null
          last_streak_date?: string | null
          must_set_username?: boolean
          muted_until?: string | null
          password_hash?: string
          points?: number
          role?: string
          settings?: Json
          streak_days?: number
          total_earned?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      active_sessions: {
        Row: {
          account_id: string | null
          code_id: string
          created_at: string
          current_game: string | null
          current_url: string | null
          current_view: string | null
          device_hash: string | null
          id: string
          is_admin: boolean
          last_active: string
          session_token: string
          username: string
        }
        Insert: {
          account_id?: string | null
          code_id: string
          created_at?: string
          current_game?: string | null
          current_url?: string | null
          current_view?: string | null
          device_hash?: string | null
          id?: string
          is_admin?: boolean
          last_active?: string
          session_token: string
          username: string
        }
        Update: {
          account_id?: string | null
          code_id?: string
          created_at?: string
          current_game?: string | null
          current_url?: string | null
          current_view?: string | null
          device_hash?: string | null
          id?: string
          is_admin?: boolean
          last_active?: string
          session_token?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_sessions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_acks: {
        Row: {
          account_id: string
          acked_at: string
          announcement_id: string
        }
        Insert: {
          account_id: string
          acked_at?: string
          announcement_id: string
        }
        Update: {
          account_id?: string
          acked_at?: string
          announcement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_acks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_acks_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          active: boolean
          body: string
          created_at: string
          created_by: string | null
          dismissable: boolean
          id: string
          severity: string
          target: string
          title: string
        }
        Insert: {
          active?: boolean
          body: string
          created_at?: string
          created_by?: string | null
          dismissable?: boolean
          id?: string
          severity?: string
          target?: string
          title: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          created_by?: string | null
          dismissable?: boolean
          id?: string
          severity?: string
          target?: string
          title?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_account_id: string | null
          created_at: string
          id: string
          meta: Json
          target: string | null
        }
        Insert: {
          action: string
          actor_account_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          target?: string | null
        }
        Update: {
          action?: string
          actor_account_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          target?: string | null
        }
        Relationships: []
      }
      banned_devices: {
        Row: {
          created_at: string
          device_hash: string
          id: string
          last_user_agent: string | null
          last_username: string | null
          reason: string | null
        }
        Insert: {
          created_at?: string
          device_hash: string
          id?: string
          last_user_agent?: string | null
          last_username?: string | null
          reason?: string | null
        }
        Update: {
          created_at?: string
          device_hash?: string
          id?: string
          last_user_agent?: string | null
          last_username?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          account_id: string | null
          code_id: string
          created_at: string
          id: string
          image_url: string | null
          is_admin: boolean
          message: string
          username: string
        }
        Insert: {
          account_id?: string | null
          code_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_admin?: boolean
          message: string
          username: string
        }
        Update: {
          account_id?: string | null
          code_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_admin?: boolean
          message?: string
          username?: string
        }
        Relationships: []
      }
      chat_reports: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reason: string | null
          reporter_account_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reason?: string | null
          reporter_account_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reason?: string | null
          reporter_account_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reports_reporter_account_id_fkey"
            columns: ["reporter_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_uploads: {
        Row: {
          account_id: string
          bytes: number
          created_at: string
          id: string
          mime: string
          storage_path: string
        }
        Insert: {
          account_id: string
          bytes: number
          created_at?: string
          id?: string
          mime: string
          storage_path: string
        }
        Update: {
          account_id?: string
          bytes?: number
          created_at?: string
          id?: string
          mime?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_uploads_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      code_favorites: {
        Row: {
          account_id: string | null
          code_id: string
          created_at: string
          game_id: string
          id: string
        }
        Insert: {
          account_id?: string | null
          code_id: string
          created_at?: string
          game_id: string
          id?: string
        }
        Update: {
          account_id?: string | null
          code_id?: string
          created_at?: string
          game_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_favorites_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      code_progress: {
        Row: {
          account_id: string | null
          code_id: string
          data: Json
          id: string
          progress_type: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          code_id: string
          data?: Json
          id?: string
          progress_type: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          code_id?: string
          data?: Json
          id?: string
          progress_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_progress_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
          label: string
          scheduled_for: string | null
          scope: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          label: string
          scheduled_for?: string | null
          scope?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          label?: string
          scheduled_for?: string | null
          scope?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      game_plays: {
        Row: {
          account_id: string | null
          code_id: string
          game_id: string
          game_name: string | null
          id: string
          played_at: string
          username: string
        }
        Insert: {
          account_id?: string | null
          code_id: string
          game_id: string
          game_name?: string | null
          id?: string
          played_at?: string
          username: string
        }
        Update: {
          account_id?: string | null
          code_id?: string
          game_id?: string
          game_name?: string | null
          id?: string
          played_at?: string
          username?: string
        }
        Relationships: []
      }
      login_logs: {
        Row: {
          code_text: string | null
          created_at: string
          device_hash: string | null
          id: string
          ip: string | null
          success: boolean
          user_agent: string | null
          username: string
        }
        Insert: {
          code_text?: string | null
          created_at?: string
          device_hash?: string | null
          id?: string
          ip?: string | null
          success?: boolean
          user_agent?: string | null
          username: string
        }
        Update: {
          code_text?: string | null
          created_at?: string
          device_hash?: string | null
          id?: string
          ip?: string | null
          success?: boolean
          user_agent?: string | null
          username?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          key: string
          label: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          label: string
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          label?: string
        }
        Relationships: []
      }
      point_multipliers: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          multiplier: number
          name: string
          starts_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          multiplier?: number
          name: string
          starts_at: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          multiplier?: number
          name?: string
          starts_at?: string
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          id: string
          meta: Json
          reason: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          id?: string
          meta?: Json
          reason: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          id?: string
          meta?: Json
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          account_id: string | null
          code_id: string
          created_at: string
          id: string
          option_index: number
          poll_id: string
        }
        Insert: {
          account_id?: string | null
          code_id: string
          created_at?: string
          id?: string
          option_index: number
          poll_id: string
        }
        Update: {
          account_id?: string | null
          code_id?: string
          created_at?: string
          id?: string
          option_index?: number
          poll_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          active: boolean
          created_at: string
          ends_at: string | null
          id: string
          options: Json
          question: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          options: Json
          question: string
        }
        Update: {
          active?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          options?: Json
          question?: string
        }
        Relationships: []
      }
      quest_progress: {
        Row: {
          account_id: string
          claimed: boolean
          completed: boolean
          id: string
          period_key: string
          progress: number
          quest_id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          claimed?: boolean
          completed?: boolean
          id?: string
          period_key: string
          progress?: number
          quest_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          claimed?: boolean
          completed?: boolean
          id?: string
          period_key?: string
          progress?: number
          quest_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_progress_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_progress_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          active: boolean
          created_at: string
          description: string
          goal: number
          id: string
          key: string
          metric: string
          quest_type: string
          reward: number
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description: string
          goal?: number
          id?: string
          key: string
          metric: string
          quest_type: string
          reward?: number
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          goal?: number
          id?: string
          key?: string
          metric?: string
          quest_type?: string
          reward?: number
          title?: string
        }
        Relationships: []
      }
      session_screens: {
        Row: {
          account_id: string | null
          code_id: string
          height: number | null
          screenshot: string
          session_token: string
          updated_at: string
          username: string
          width: number | null
        }
        Insert: {
          account_id?: string | null
          code_id: string
          height?: number | null
          screenshot: string
          session_token: string
          updated_at?: string
          username: string
          width?: number | null
        }
        Update: {
          account_id?: string | null
          code_id?: string
          height?: number | null
          screenshot?: string
          session_token?: string
          updated_at?: string
          username?: string
          width?: number | null
        }
        Relationships: []
      }
      update_log_acks: {
        Row: {
          account_id: string
          acked_at: string
          update_log_id: string
        }
        Insert: {
          account_id: string
          acked_at?: string
          update_log_id: string
        }
        Update: {
          account_id?: string
          acked_at?: string
          update_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_log_acks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_log_acks_update_log_id_fkey"
            columns: ["update_log_id"]
            isOneToOne: false
            referencedRelation: "update_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      update_logs: {
        Row: {
          body_md: string
          created_at: string
          highlights: Json
          id: string
          published: boolean
          published_at: string
          published_by: string | null
          require_ack: boolean
          severity: string
          target: string
          title: string
          version: string
        }
        Insert: {
          body_md?: string
          created_at?: string
          highlights?: Json
          id?: string
          published?: boolean
          published_at?: string
          published_by?: string | null
          require_ack?: boolean
          severity?: string
          target?: string
          title: string
          version: string
        }
        Update: {
          body_md?: string
          created_at?: string
          highlights?: Json
          id?: string
          published?: boolean
          published_at?: string
          published_by?: string | null
          require_ack?: boolean
          severity?: string
          target?: string
          title?: string
          version?: string
        }
        Relationships: []
      }
      user_requests: {
        Row: {
          account_id: string | null
          admin_response: string | null
          category: string
          code_id: string
          created_at: string
          id: string
          message: string
          notified: boolean
          responded_at: string | null
          status: string
          username: string
        }
        Insert: {
          account_id?: string | null
          admin_response?: string | null
          category?: string
          code_id: string
          created_at?: string
          id?: string
          message: string
          notified?: boolean
          responded_at?: string | null
          status?: string
          username: string
        }
        Update: {
          account_id?: string | null
          admin_response?: string | null
          category?: string
          code_id?: string
          created_at?: string
          id?: string
          message?: string
          notified?: boolean
          responded_at?: string | null
          status?: string
          username?: string
        }
        Relationships: []
      }
      weekly_poll_templates: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          last_posted_at: string | null
          options: Json
          question: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          last_posted_at?: string | null
          options: Json
          question: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          last_posted_at?: string | null
          options?: Json
          question?: string
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
