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
      accessories: {
        Row: {
          created_at: string
          org_id: string
          relative_x: number
          relative_y: number
          scale: number
          selected_accessory: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          org_id: string
          relative_x?: number
          relative_y?: number
          scale?: number
          selected_accessory?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          relative_x?: number
          relative_y?: number
          scale?: number
          selected_accessory?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accessories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      admin: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          org_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          org_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          org_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      candy_voucher: {
        Row: {
          claim_token_id: string | null
          code: string
          game_id: string
          id: string
          issued_at: string
          org_id: string
          owner_id: string
          redeemed_at: string | null
          round: Json
          round_id: string
          status: Database["public"]["Enums"]["candy_voucher_status"]
          won_on: string
        }
        Insert: {
          claim_token_id?: string | null
          code: string
          game_id: string
          id?: string
          issued_at?: string
          org_id: string
          owner_id: string
          redeemed_at?: string | null
          round: Json
          round_id: string
          status?: Database["public"]["Enums"]["candy_voucher_status"]
          won_on: string
        }
        Update: {
          claim_token_id?: string | null
          code?: string
          game_id?: string
          id?: string
          issued_at?: string
          org_id?: string
          owner_id?: string
          redeemed_at?: string | null
          round?: Json
          round_id?: string
          status?: Database["public"]["Enums"]["candy_voucher_status"]
          won_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "candy_voucher_claim_token_id_fkey"
            columns: ["claim_token_id"]
            isOneToOne: true
            referencedRelation: "claim_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candy_voucher_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candy_voucher_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candy_voucher_owner_id_org_id_fkey"
            columns: ["owner_id", "org_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id", "org_id"]
          },
        ]
      }
      claim_tokens: {
        Row: {
          claimed_by: string | null
          created_at: string
          expires_at: string
          id: string
          org_id: string
          payload: Json
          status: Database["public"]["Enums"]["claim_status"]
        }
        Insert: {
          claimed_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          org_id: string
          payload: Json
          status?: Database["public"]["Enums"]["claim_status"]
        }
        Update: {
          claimed_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          org_id?: string
          payload?: Json
          status?: Database["public"]["Enums"]["claim_status"]
        }
        Relationships: [
          {
            foreignKeyName: "claim_tokens_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      cropped_image: {
        Row: {
          centroid_point: unknown
          chin_bottom_point: unknown
          created_at: string
          forehead_top_point: unknown
          id: string
          is_public: boolean
          left_eye_point: unknown
          mouth_center_point: unknown
          nose_tip_point: unknown
          org_id: string
          owner_id: string
          right_eye_point: unknown
          storage_path: string
          updated_at: string
        }
        Insert: {
          centroid_point?: unknown
          chin_bottom_point?: unknown
          created_at?: string
          forehead_top_point?: unknown
          id?: string
          is_public?: boolean
          left_eye_point?: unknown
          mouth_center_point?: unknown
          nose_tip_point?: unknown
          org_id: string
          owner_id: string
          right_eye_point?: unknown
          storage_path: string
          updated_at?: string
        }
        Update: {
          centroid_point?: unknown
          chin_bottom_point?: unknown
          created_at?: string
          forehead_top_point?: unknown
          id?: string
          is_public?: boolean
          left_eye_point?: unknown
          mouth_center_point?: unknown
          nose_tip_point?: unknown
          org_id?: string
          owner_id?: string
          right_eye_point?: unknown
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cropped_image_org_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cropped_image_owner_user_fk"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      drawings: {
        Row: {
          created_at: string
          id: string
          image_path: string
          org_id: string
          owner_id: string
          prompt: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_path: string
          org_id: string
          owner_id: string
          prompt?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_path?: string
          org_id?: string
          owner_id?: string
          prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drawings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_owner_id_org_id_fkey"
            columns: ["owner_id", "org_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id", "org_id"]
          },
        ]
      }
      game_score: {
        Row: {
          created_at: string
          game_id: string
          id: string
          metadata: Json | null
          org_id: string
          owner_id: string
          score: number
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          metadata?: Json | null
          org_id: string
          owner_id: string
          score: number
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          metadata?: Json | null
          org_id?: string
          owner_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_score_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_score_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_score_owner_id_org_id_fkey"
            columns: ["owner_id", "org_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id", "org_id"]
          },
        ]
      }
      gesture_image: {
        Row: {
          category: string
          created_at: string
          id: string
          is_public: boolean
          org_id: string
          owner_id: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_public?: boolean
          org_id: string
          owner_id: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_public?: boolean
          org_id?: string
          owner_id?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gesture_image_org_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gesture_image_owner_user_fk"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      kiosk: {
        Row: {
          created_at: string
          id: string
          name: string | null
          org_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          org_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          org_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kiosk_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          from_user_id: string
          id: string
          org_id: string
          to_user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          from_user_id: string
          id?: string
          org_id: string
          to_user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          from_user_id?: string
          id?: string
          org_id?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_from_user_id_org_id_fkey"
            columns: ["from_user_id", "org_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_to_user_id_org_id_fkey"
            columns: ["to_user_id", "org_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id", "org_id"]
          },
        ]
      }
      organization: {
        Row: {
          date_created: string | null
          id: string
          name: string
        }
        Insert: {
          date_created?: string | null
          id?: string
          name: string
        }
        Update: {
          date_created?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      reward_config: {
        Row: {
          daily_cap_per_user: number
          enabled: boolean
          max_broccoli_hits: number
          min_slices: number
          org_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          daily_cap_per_user?: number
          enabled?: boolean
          max_broccoli_hits?: number
          min_slices?: number
          org_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          daily_cap_per_user?: number
          enabled?: boolean
          max_broccoli_hits?: number
          min_slices?: number
          org_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_config_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      user: {
        Row: {
          accessory: string | null
          created_at: string | null
          id: string
          interests: string[] | null
          major: string | null
          name: string
          onboarding_complete: boolean | null
          org_id: string | null
          pronouns: string | null
          status: string | null
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          accessory?: string | null
          created_at?: string | null
          id: string
          interests?: string[] | null
          major?: string | null
          name: string
          onboarding_complete?: boolean | null
          org_id?: string | null
          pronouns?: string | null
          status?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          accessory?: string | null
          created_at?: string | null
          id?: string
          interests?: string[] | null
          major?: string | null
          name?: string
          onboarding_complete?: boolean | null
          org_id?: string | null
          pronouns?: string | null
          status?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      candy_desk_vouchers: {
        Args: { p_org_id: string }
        Returns: {
          code: string
          issued_at: string
          player_email: string
          player_name: string
          redeemed_at: string
          status: Database["public"]["Enums"]["candy_voucher_status"]
          voucher_id: string
        }[]
      }
      get_user_org_id: { Args: never; Returns: string }
      issue_candy_voucher: {
        Args: { p_token_id: string; p_user_id: string }
        Returns: Json
      }
      set_candy_voucher_redeemed: {
        Args: { p_org_id: string; p_redeemed: boolean; p_voucher_id: string }
        Returns: Json
      }
    }
    Enums: {
      candy_voucher_status: "issued" | "redeemed" | "void"
      claim_status: "pending" | "claimed" | "expired"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      candy_voucher_status: ["issued", "redeemed", "void"],
      claim_status: ["pending", "claimed", "expired"],
    },
  },
} as const
