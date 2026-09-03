export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activations: {
        Row: {
          completed_at: string | null
          id: string
          project_id: string | null
          rationale: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["activation_status"]
          strategy: Database["public"]["Enums"]["activation_strategy"]
          suggested_at: string
          task_id: string | null
          timer_minutes: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          project_id?: string | null
          rationale?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["activation_status"]
          strategy: Database["public"]["Enums"]["activation_strategy"]
          suggested_at?: string
          task_id?: string | null
          timer_minutes?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          project_id?: string | null
          rationale?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["activation_status"]
          strategy?: Database["public"]["Enums"]["activation_strategy"]
          suggested_at?: string
          task_id?: string | null
          timer_minutes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          budget_category: Database["public"]["Enums"]["budget_category"] | null
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          position: number
          status: Database["public"]["Enums"]["area_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_category?:
            | Database["public"]["Enums"]["budget_category"]
            | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          position?: number
          status?: Database["public"]["Enums"]["area_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_category?:
            | Database["public"]["Enums"]["budget_category"]
            | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          position?: number
          status?: Database["public"]["Enums"]["area_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      attention_items: {
        Row: {
          detected_at: string
          entity_id: string | null
          entity_type: string | null
          evidence: string | null
          id: string
          interpretation: string | null
          kind: Database["public"]["Enums"]["attention_kind"]
          recommended_action: string | null
          resolved_at: string | null
          severity: number
          status: Database["public"]["Enums"]["attention_status"]
          title: string
          user_id: string
        }
        Insert: {
          detected_at?: string
          entity_id?: string | null
          entity_type?: string | null
          evidence?: string | null
          id?: string
          interpretation?: string | null
          kind: Database["public"]["Enums"]["attention_kind"]
          recommended_action?: string | null
          resolved_at?: string | null
          severity?: number
          status?: Database["public"]["Enums"]["attention_status"]
          title: string
          user_id: string
        }
        Update: {
          detected_at?: string
          entity_id?: string | null
          entity_type?: string | null
          evidence?: string | null
          id?: string
          interpretation?: string | null
          kind?: Database["public"]["Enums"]["attention_kind"]
          recommended_action?: string | null
          resolved_at?: string | null
          severity?: number
          status?: Database["public"]["Enums"]["attention_status"]
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attention_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      attention_snapshots: {
        Row: {
          attention_budget: NonNullable<Json>
          available_hours: number | null
          committed_hours: number | null
          created_at: string
          id: string
          load_status: Database["public"]["Enums"]["load_status"] | null
          planned_hours: number | null
          primary_focus: string | null
          snapshot_date: string
          user_id: string
        }
        Insert: {
          attention_budget?: NonNullable<Json>
          available_hours?: number | null
          committed_hours?: number | null
          created_at?: string
          id?: string
          load_status?: Database["public"]["Enums"]["load_status"] | null
          planned_hours?: number | null
          primary_focus?: string | null
          snapshot_date: string
          user_id: string
        }
        Update: {
          attention_budget?: NonNullable<Json>
          available_hours?: number | null
          committed_hours?: number | null
          created_at?: string
          id?: string
          load_status?: Database["public"]["Enums"]["load_status"] | null
          planned_hours?: number | null
          primary_focus?: string | null
          snapshot_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attention_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action_type: string
          actor: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          input_summary: string | null
          result_summary: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          actor: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          input_summary?: string | null
          result_summary?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          actor?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          input_summary?: string | null
          result_summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_observations: {
        Row: {
          activation_id: string | null
          confidence: number | null
          context: string | null
          context_json: Json | null
          entity_id: string | null
          entity_type: string | null
          friction_type: Database["public"]["Enums"]["friction_type"]
          helpful: boolean | null
          id: string
          observed_at: string
          outcome: string | null
          source: string
          strategy: Database["public"]["Enums"]["activation_strategy"] | null
          user_id: string
        }
        Insert: {
          activation_id?: string | null
          confidence?: number | null
          context?: string | null
          context_json?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          friction_type: Database["public"]["Enums"]["friction_type"]
          helpful?: boolean | null
          id?: string
          observed_at?: string
          outcome?: string | null
          source?: string
          strategy?: Database["public"]["Enums"]["activation_strategy"] | null
          user_id: string
        }
        Update: {
          activation_id?: string | null
          confidence?: number | null
          context?: string | null
          context_json?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          friction_type?: Database["public"]["Enums"]["friction_type"]
          helpful?: boolean | null
          id?: string
          observed_at?: string
          outcome?: string | null
          source?: string
          strategy?: Database["public"]["Enums"]["activation_strategy"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_observations_activation_id_fkey"
            columns: ["activation_id"]
            isOneToOne: false
            referencedRelation: "activations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_observations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_connections: {
        Row: {
          access_token_encrypted: string | null
          created_at: string
          id: string
          provider: Database["public"]["Enums"]["calendar_provider"]
          provider_account_email: string | null
          refresh_token_encrypted: string | null
          scopes: string[]
          selected_calendar_ids: string[]
          status: string
          sync_tokens: NonNullable<Json>
          token_expires_at: string | null
          updated_at: string
          user_id: string
          write_calendar_id: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string
          id?: string
          provider: Database["public"]["Enums"]["calendar_provider"]
          provider_account_email?: string | null
          refresh_token_encrypted?: string | null
          scopes?: string[]
          selected_calendar_ids?: string[]
          status?: string
          sync_tokens?: NonNullable<Json>
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          write_calendar_id?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string
          id?: string
          provider?: Database["public"]["Enums"]["calendar_provider"]
          provider_account_email?: string | null
          refresh_token_encrypted?: string | null
          scopes?: string[]
          selected_calendar_ids?: string[]
          status?: string
          sync_tokens?: NonNullable<Json>
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          write_calendar_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events_cache: {
        Row: {
          all_day: boolean
          calendar_id: string | null
          calendar_name: string | null
          description: string | null
          end_at: string
          external_id: string
          habit_id: string | null
          has_attendees: boolean
          id: string
          last_synced_at: string
          project_id: string | null
          provider: Database["public"]["Enums"]["calendar_provider"]
          source: string
          start_at: string
          status: string
          task_id: string | null
          title: string
          transparency: string
          updated_at_remote: string | null
          user_id: string
        }
        Insert: {
          all_day?: boolean
          calendar_id?: string | null
          calendar_name?: string | null
          description?: string | null
          end_at: string
          external_id: string
          habit_id?: string | null
          has_attendees?: boolean
          id?: string
          last_synced_at?: string
          project_id?: string | null
          provider: Database["public"]["Enums"]["calendar_provider"]
          source?: string
          start_at: string
          status?: string
          task_id?: string | null
          title: string
          transparency?: string
          updated_at_remote?: string | null
          user_id: string
        }
        Update: {
          all_day?: boolean
          calendar_id?: string | null
          calendar_name?: string | null
          description?: string | null
          end_at?: string
          external_id?: string
          habit_id?: string | null
          has_attendees?: boolean
          id?: string
          last_synced_at?: string
          project_id?: string | null
          provider?: Database["public"]["Enums"]["calendar_provider"]
          source?: string
          start_at?: string
          status?: string
          task_id?: string | null
          title?: string
          transparency?: string
          updated_at_remote?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_cache_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_cache_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_cache_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          accomplishments: NonNullable<Json>
          checkin_date: string
          created_at: string
          id: string
          raw_summary: string | null
          tomorrow: NonNullable<Json>
          unfinished: NonNullable<Json>
          user_id: string
        }
        Insert: {
          accomplishments?: NonNullable<Json>
          checkin_date: string
          created_at?: string
          id?: string
          raw_summary?: string | null
          tomorrow?: NonNullable<Json>
          unfinished?: NonNullable<Json>
          user_id: string
        }
        Update: {
          accomplishments?: NonNullable<Json>
          checkin_date?: string
          created_at?: string
          id?: string
          raw_summary?: string | null
          tomorrow?: NonNullable<Json>
          unfinished?: NonNullable<Json>
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      commitment_logs: {
        Row: {
          commitment_id: string
          created_at: string
          id: string
          log_date: string
          note: string | null
          source: string | null
          status: Database["public"]["Enums"]["habit_log_status"]
          user_id: string
          value: number | null
        }
        Insert: {
          commitment_id: string
          created_at?: string
          id?: string
          log_date: string
          note?: string | null
          source?: string | null
          status: Database["public"]["Enums"]["habit_log_status"]
          user_id: string
          value?: number | null
        }
        Update: {
          commitment_id?: string
          created_at?: string
          id?: string
          log_date?: string
          note?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["habit_log_status"]
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commitment_logs_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      commitments: {
        Row: {
          created_at: string
          current_streak: number
          description: string
          end_date: string | null
          frequency: string
          frequency_json: NonNullable<Json>
          id: string
          last_checked_at: string | null
          project_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["commitment_status"]
          target_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          description: string
          end_date?: string | null
          frequency: string
          frequency_json: NonNullable<Json>
          id?: string
          last_checked_at?: string | null
          project_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["commitment_status"]
          target_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          description?: string
          end_date?: string | null
          frequency?: string
          frequency_json?: NonNullable<Json>
          id?: string
          last_checked_at?: string | null
          project_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["commitment_status"]
          target_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          ended_at: string | null
          id: string
          session_id: string
          started_at: string
          summary: string | null
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          session_id: string
          started_at?: string
          summary?: string | null
          user_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          session_id?: string
          started_at?: string
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          created_at: string
          decision: string
          id: string
          reason: string | null
          review_date: string | null
          scope: string | null
          scope_json: NonNullable<Json>
          search_vector: unknown
          status: Database["public"]["Enums"]["memory_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decision: string
          id?: string
          reason?: string | null
          review_date?: string | null
          scope?: string | null
          scope_json?: NonNullable<Json>
          search_vector?: never
          status?: Database["public"]["Enums"]["memory_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decision?: string
          id?: string
          reason?: string | null
          review_date?: string | null
          scope?: string | null
          scope_json?: NonNullable<Json>
          search_vector?: never
          status?: Database["public"]["Enums"]["memory_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          created_at: string
          habit_id: string
          id: string
          log_date: string
          note: string | null
          source: string | null
          status: Database["public"]["Enums"]["habit_log_status"]
          user_id: string
          value: number | null
        }
        Insert: {
          created_at?: string
          habit_id: string
          id?: string
          log_date: string
          note?: string | null
          source?: string | null
          status: Database["public"]["Enums"]["habit_log_status"]
          user_id: string
          value?: number | null
        }
        Update: {
          created_at?: string
          habit_id?: string
          id?: string
          log_date?: string
          note?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["habit_log_status"]
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          active: boolean
          area_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          frequency: string
          frequency_json: NonNullable<Json>
          id: string
          kind: Database["public"]["Enums"]["habit_kind"]
          name: string
          project_id: string | null
          start_date: string
          target_count: number | null
          target_minutes: number | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          area_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          frequency: string
          frequency_json: NonNullable<Json>
          id?: string
          kind: Database["public"]["Enums"]["habit_kind"]
          name: string
          project_id?: string | null
          start_date?: string
          target_count?: number | null
          target_minutes?: number | null
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          area_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          frequency?: string
          frequency_json?: NonNullable<Json>
          id?: string
          kind?: Database["public"]["Enums"]["habit_kind"]
          name?: string
          project_id?: string | null
          start_date?: string
          target_count?: number | null
          target_minutes?: number | null
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habits_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          area_id: string | null
          created_at: string
          description: string | null
          id: string
          review_at: string | null
          source: string | null
          status: Database["public"]["Enums"]["idea_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          review_at?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["idea_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          review_at?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["idea_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ideas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_events: {
        Row: {
          area_id: string | null
          created_at: string
          description: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          importance: number
          occurred_at: string
          project_id: string | null
          search_vector: unknown
          source: string | null
          user_id: string
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          description: string
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          importance?: number
          occurred_at?: string
          project_id?: string | null
          search_vector?: never
          source?: string | null
          user_id: string
        }
        Update: {
          area_id?: string | null
          created_at?: string
          description?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          importance?: number
          occurred_at?: string
          project_id?: string | null
          search_vector?: never
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_events_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      observations: {
        Row: {
          confidence: number | null
          created_at: string
          evidence_count: number
          first_observed_at: string
          id: string
          last_observed_at: string
          search_vector: unknown
          statement: string
          status: Database["public"]["Enums"]["memory_status"]
          type: Database["public"]["Enums"]["memory_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          evidence_count?: number
          first_observed_at?: string
          id?: string
          last_observed_at?: string
          search_vector?: never
          statement: string
          status?: Database["public"]["Enums"]["memory_status"]
          type: Database["public"]["Enums"]["memory_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          evidence_count?: number
          first_observed_at?: string
          id?: string
          last_observed_at?: string
          search_vector?: never
          statement?: string
          status?: Database["public"]["Enums"]["memory_status"]
          type?: Database["public"]["Enums"]["memory_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "observations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          area_id: string | null
          completed_at: string | null
          created_at: string
          current_blocker: string | null
          description: string | null
          desired_frequency: string | null
          energy_required: number | null
          goal: string | null
          id: string
          is_primary: boolean
          last_activity_at: string | null
          name: string
          next_action: string | null
          next_review_at: string | null
          priority: number
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          success_criteria: string | null
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_blocker?: string | null
          description?: string | null
          desired_frequency?: string | null
          energy_required?: number | null
          goal?: string | null
          id?: string
          is_primary?: boolean
          last_activity_at?: string | null
          name: string
          next_action?: string | null
          next_review_at?: string | null
          priority?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          success_criteria?: string | null
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_blocker?: string | null
          description?: string | null
          desired_frequency?: string | null
          energy_required?: number | null
          goal?: string | null
          id?: string
          is_primary?: boolean
          last_activity_at?: string | null
          name?: string
          next_action?: string | null
          next_review_at?: string | null
          priority?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          success_criteria?: string | null
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string
          id: string
          payload: NonNullable<Json>
          period_end: string
          period_start: string
          review_type: string
          summary: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: NonNullable<Json>
          period_end: string
          period_start: string
          review_type: string
          summary?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: NonNullable<Json>
          period_end?: string
          period_start?: string
          review_type?: string
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          energy_level: number | null
          estimated_minutes: number | null
          id: string
          priority: number
          project_id: string | null
          reschedule_count: number
          scheduled_for: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          energy_level?: number | null
          estimated_minutes?: number | null
          id?: string
          priority?: number
          project_id?: string | null
          reschedule_count?: number
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          energy_level?: number | null
          estimated_minutes?: number | null
          id?: string
          priority?: number
          project_id?: string | null
          reschedule_count?: number
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          attention_budget_targets: NonNullable<Json>
          created_at: string
          day_end: string
          day_start: string
          display_name: string
          email: string
          id: string
          timezone: string
          updated_at: string
          weekly_available_hours: number
        }
        Insert: {
          attention_budget_targets?: NonNullable<Json>
          created_at?: string
          day_end?: string
          day_start?: string
          display_name?: string
          email: string
          id: string
          timezone?: string
          updated_at?: string
          weekly_available_hours?: number
        }
        Update: {
          attention_budget_targets?: NonNullable<Json>
          created_at?: string
          day_end?: string
          day_start?: string
          display_name?: string
          email?: string
          id?: string
          timezone?: string
          updated_at?: string
          weekly_available_hours?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_defaults: { Args: { p_user_id: string }; Returns: undefined }
      dearmor: { Args: { "": string }; Returns: string }
      gen_random_uuid: { Args: Record<PropertyKey, never>; Returns: string }
      gen_salt: { Args: { "": string }; Returns: string }
      is_valid_budget_targets: { Args: { t: Json }; Returns: boolean }
      is_valid_frequency: { Args: { f: Json }; Returns: boolean }
      is_valid_scope: { Args: { s: Json }; Returns: boolean }
      memory_tsquery: { Args: { p_query: string }; Returns: unknown }
      pgp_armor_headers: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      search_decisions: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          created_at: string
          decision: string
          id: string
          reason: string | null
          review_date: string | null
          scope: string | null
          scope_json: NonNullable<Json>
          search_vector: unknown
          status: Database["public"]["Enums"]["memory_status"]
          title: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "decisions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_memory_events: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          area_id: string | null
          created_at: string
          description: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          importance: number
          occurred_at: string
          project_id: string | null
          search_vector: unknown
          source: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "memory_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_observations: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          confidence: number | null
          created_at: string
          evidence_count: number
          first_observed_at: string
          id: string
          last_observed_at: string
          search_vector: unknown
          statement: string
          status: Database["public"]["Enums"]["memory_status"]
          type: Database["public"]["Enums"]["memory_type"]
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "observations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_primary_project: {
        Args: { p_project_id: string }
        Returns: {
          area_id: string | null
          completed_at: string | null
          created_at: string
          current_blocker: string | null
          description: string | null
          desired_frequency: string | null
          energy_required: number | null
          goal: string | null
          id: string
          is_primary: boolean
          last_activity_at: string | null
          name: string
          next_action: string | null
          next_review_at: string | null
          priority: number
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          success_criteria: string | null
          target_date: string | null
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "projects"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      activation_status: "suggested" | "started" | "completed" | "dismissed"
      activation_strategy:
        | "reduce_scope"
        | "make_concrete"
        | "lower_quality_bar"
        | "implementation_intention"
        | "externalize_commitment"
        | "remove_choices"
        | "close_loop"
        | "physical_activation"
        | "other"
      area_status: "active" | "archived"
      attention_kind:
        | "stagnation"
        | "overload"
        | "repetition"
        | "contradiction"
        | "decision_conflict"
        | "deadline"
        | "opportunity"
      attention_status: "active" | "resolved" | "dismissed"
      budget_category:
        | "work"
        | "primary_projects"
        | "body"
        | "learning"
        | "admin"
      calendar_provider: "google"
      commitment_status: "active" | "paused" | "completed" | "cancelled"
      event_type:
        | "project_progress"
        | "task_completed"
        | "commitment_completed"
        | "commitment_missed"
        | "decision_made"
        | "project_blocked"
        | "project_completed"
        | "habit_logged"
        | "calendar_action"
        | "checkin"
      friction_type:
        | "ambiguity"
        | "task_too_large"
        | "perfectionism"
        | "evaluation_fear"
        | "boredom"
        | "low_energy"
        | "distraction"
        | "environment"
        | "no_external_structure"
        | "reward_too_distant"
        | "too_many_options"
        | "no_time"
      habit_kind: "binary" | "frequency" | "duration" | "streak"
      habit_log_status: "done" | "not_done" | "partial" | "skipped"
      idea_status: "idea" | "considering" | "promoted" | "archived"
      load_status: "LOW" | "HEALTHY" | "HIGH" | "OVERLOADED"
      memory_status: "active" | "superseded" | "archived"
      memory_type: "fact" | "pattern" | "risk" | "preference"
      project_status: "active" | "paused" | "blocked" | "completed" | "archived"
      task_status: "todo" | "in_progress" | "done" | "cancelled"
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
      activation_status: ["suggested", "started", "completed", "dismissed"],
      activation_strategy: [
        "reduce_scope",
        "make_concrete",
        "lower_quality_bar",
        "implementation_intention",
        "externalize_commitment",
        "remove_choices",
        "close_loop",
        "physical_activation",
        "other",
      ],
      area_status: ["active", "archived"],
      attention_kind: [
        "stagnation",
        "overload",
        "repetition",
        "contradiction",
        "decision_conflict",
        "deadline",
        "opportunity",
      ],
      attention_status: ["active", "resolved", "dismissed"],
      budget_category: [
        "work",
        "primary_projects",
        "body",
        "learning",
        "admin",
      ],
      calendar_provider: ["google"],
      commitment_status: ["active", "paused", "completed", "cancelled"],
      event_type: [
        "project_progress",
        "task_completed",
        "commitment_completed",
        "commitment_missed",
        "decision_made",
        "project_blocked",
        "project_completed",
        "habit_logged",
        "calendar_action",
        "checkin",
      ],
      friction_type: [
        "ambiguity",
        "task_too_large",
        "perfectionism",
        "evaluation_fear",
        "boredom",
        "low_energy",
        "distraction",
        "environment",
        "no_external_structure",
        "reward_too_distant",
        "too_many_options",
        "no_time",
      ],
      habit_kind: ["binary", "frequency", "duration", "streak"],
      habit_log_status: ["done", "not_done", "partial", "skipped"],
      idea_status: ["idea", "considering", "promoted", "archived"],
      load_status: ["LOW", "HEALTHY", "HIGH", "OVERLOADED"],
      memory_status: ["active", "superseded", "archived"],
      memory_type: ["fact", "pattern", "risk", "preference"],
      project_status: ["active", "paused", "blocked", "completed", "archived"],
      task_status: ["todo", "in_progress", "done", "cancelled"],
    },
  },
} as const
