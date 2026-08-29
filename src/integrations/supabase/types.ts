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
      app_themes: {
        Row: {
          created_at: string
          display_name: string
          id: string
          image_url: string
          is_active: boolean
          sort_order: number
          theme_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          image_url: string
          is_active?: boolean
          sort_order?: number
          theme_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
          theme_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      aviator_rounds: {
        Row: {
          crash_point: number
          created_at: string
          id: string
          started_at: string | null
          status: string
        }
        Insert: {
          crash_point: number
          created_at?: string
          id?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          crash_point?: number
          created_at?: string
          id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      cbfd_bets: {
        Row: {
          amount: number
          bet_type: string | null
          created_at: string
          game_id: string
          id: string
          market_detail: Json | null
          market_type: string
          odd: number
          potential_win: number
          selected_team: string
          status: Database["public"]["Enums"]["cbfd_bet_status"]
          user_id: string
        }
        Insert: {
          amount: number
          bet_type?: string | null
          created_at?: string
          game_id: string
          id?: string
          market_detail?: Json | null
          market_type?: string
          odd: number
          potential_win: number
          selected_team: string
          status?: Database["public"]["Enums"]["cbfd_bet_status"]
          user_id: string
        }
        Update: {
          amount?: number
          bet_type?: string | null
          created_at?: string
          game_id?: string
          id?: string
          market_detail?: Json | null
          market_type?: string
          odd?: number
          potential_win?: number
          selected_team?: string
          status?: Database["public"]["Enums"]["cbfd_bet_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cbfd_bets_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "cbfd_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbfd_bets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cbfd_championships: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      cbfd_game_players: {
        Row: {
          created_at: string
          game_id: string
          id: string
          player_id: string
          team_side: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          player_id: string
          team_side: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          player_id?: string
          team_side?: string
        }
        Relationships: [
          {
            foreignKeyName: "cbfd_game_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "cbfd_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbfd_game_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "cbfd_players"
            referencedColumns: ["id"]
          },
        ]
      }
      cbfd_game_results: {
        Row: {
          created_at: string
          game_id: string
          id: string
          total_corners_a: number
          total_corners_b: number
          total_red_cards_a: number
          total_red_cards_b: number
          total_yellow_cards_a: number
          total_yellow_cards_b: number
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          total_corners_a?: number
          total_corners_b?: number
          total_red_cards_a?: number
          total_red_cards_b?: number
          total_yellow_cards_a?: number
          total_yellow_cards_b?: number
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          total_corners_a?: number
          total_corners_b?: number
          total_red_cards_a?: number
          total_red_cards_b?: number
          total_yellow_cards_a?: number
          total_yellow_cards_b?: number
        }
        Relationships: [
          {
            foreignKeyName: "cbfd_game_results_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "cbfd_games"
            referencedColumns: ["id"]
          },
        ]
      }
      cbfd_game_scorers: {
        Row: {
          created_at: string
          game_id: string
          id: string
          minute: number | null
          player_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          minute?: number | null
          player_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          minute?: number | null
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cbfd_game_scorers_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "cbfd_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbfd_game_scorers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "cbfd_players"
            referencedColumns: ["id"]
          },
        ]
      }
      cbfd_games: {
        Row: {
          championship: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          match_date: string | null
          odd: number
          odd_a: number
          odd_b: number
          odd_draw: number
          score_a: number | null
          score_b: number | null
          settled_at: string | null
          team_a: string
          team_b: string
          winner_team: string | null
        }
        Insert: {
          championship: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          match_date?: string | null
          odd?: number
          odd_a?: number
          odd_b?: number
          odd_draw?: number
          score_a?: number | null
          score_b?: number | null
          settled_at?: string | null
          team_a: string
          team_b: string
          winner_team?: string | null
        }
        Update: {
          championship?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          match_date?: string | null
          odd?: number
          odd_a?: number
          odd_b?: number
          odd_draw?: number
          score_a?: number | null
          score_b?: number | null
          settled_at?: string | null
          team_a?: string
          team_b?: string
          winner_team?: string | null
        }
        Relationships: []
      }
      cbfd_players: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          photo_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          photo_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          photo_url?: string | null
        }
        Relationships: []
      }
      cbfd_teams: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_spin_claims: {
        Row: {
          claimed_at: string
          id: string
          prize_amount: number
          spin_date: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          prize_amount?: number
          spin_date?: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          prize_amount?: number
          spin_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_spin_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_images: {
        Row: {
          created_at: string
          display_name: string
          game_key: string
          id: string
          image_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          game_key: string
          id?: string
          image_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          game_key?: string
          id?: string
          image_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_odds_settings: {
        Row: {
          created_at: string
          display_name: string
          game_key: string
          id: string
          is_active: boolean
          updated_at: string
          win_chance: number
        }
        Insert: {
          created_at?: string
          display_name: string
          game_key: string
          id?: string
          is_active?: boolean
          updated_at?: string
          win_chance?: number
        }
        Update: {
          created_at?: string
          display_name?: string
          game_key?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          win_chance?: number
        }
        Relationships: []
      }
      game_wins: {
        Row: {
          bet_amount: number
          created_at: string
          game_name: string
          id: string
          multiplier: number
          user_id: string
          win_amount: number
        }
        Insert: {
          bet_amount: number
          created_at?: string
          game_name: string
          id?: string
          multiplier: number
          user_id: string
          win_amount: number
        }
        Update: {
          bet_amount?: number
          created_at?: string
          game_name?: string
          id?: string
          multiplier?: number
          user_id?: string
          win_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_wins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          balance: number
          created_at: string
          email: string
          id: string
          is_online: boolean
          last_seen: string
          referral_code: string | null
          referred_by: string | null
          updated_at: string
          username: string
        }
        Insert: {
          balance?: number
          created_at?: string
          email: string
          id: string
          is_online?: boolean
          last_seen?: string
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          balance?: number
          created_at?: string
          email?: string
          id?: string
          is_online?: boolean
          last_seen?: string
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_code_redemptions: {
        Row: {
          code_id: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code_id: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code_id?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          bonus_amount: number
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
        }
        Insert: {
          bonus_amount?: number
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
        }
        Update: {
          bonus_amount?: number
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          bonus_earned: number
          created_at: string
          first_deposit_completed: boolean
          id: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          bonus_earned?: number
          created_at?: string
          first_deposit_completed?: boolean
          id?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          bonus_earned?: number
          created_at?: string
          first_deposit_completed?: boolean
          id?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          is_read: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          is_read?: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          is_read?: boolean
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_admin_id: string | null
          closed_at: string | null
          created_at: string
          id: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_admin_id?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_admin_id?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          payment_method: string
          pix_key: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          payment_method?: string
          pix_key?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          pix_key?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "ceo"
      cbfd_bet_status: "open" | "won" | "lost"
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
      app_role: ["user", "ceo"],
      cbfd_bet_status: ["open", "won", "lost"],
    },
  },
} as const
