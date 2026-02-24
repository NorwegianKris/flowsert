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
      audit_logs: {
        Row: {
          action_type: string
          actor_role: string | null
          actor_user_id: string | null
          business_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
        }
        Insert: {
          action_type: string
          actor_role?: string | null
          actor_user_id?: string | null
          business_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
        }
        Update: {
          action_type?: string
          actor_role?: string | null
          actor_user_id?: string | null
          business_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      availability: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          personnel_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          personnel_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          personnel_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      business_documents: {
        Row: {
          business_id: string
          created_at: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          name: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          name: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          name?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          company_code: string
          created_at: string
          custom_domain: string | null
          description: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          org_number: string | null
          phone: string | null
          postal_address: string | null
          postal_code: string | null
          required_ack_version: string
          updated_at: string
          use_canonical_certificates: boolean
          website: string | null
        }
        Insert: {
          address?: string | null
          company_code?: string
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          org_number?: string | null
          phone?: string | null
          postal_address?: string | null
          postal_code?: string | null
          required_ack_version?: string
          updated_at?: string
          use_canonical_certificates?: boolean
          website?: string | null
        }
        Update: {
          address?: string | null
          company_code?: string
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          org_number?: string | null
          phone?: string | null
          postal_address?: string | null
          postal_code?: string | null
          required_ack_version?: string
          updated_at?: string
          use_canonical_certificates?: boolean
          website?: string | null
        }
        Relationships: []
      }
      certificate_aliases: {
        Row: {
          alias_normalized: string
          alias_raw_example: string | null
          business_id: string
          certificate_type_id: string
          confidence: number
          created_at: string
          created_by: string
          id: string
          last_seen_at: string
        }
        Insert: {
          alias_normalized: string
          alias_raw_example?: string | null
          business_id: string
          certificate_type_id: string
          confidence?: number
          created_at?: string
          created_by: string
          id?: string
          last_seen_at?: string
        }
        Update: {
          alias_normalized?: string
          alias_raw_example?: string | null
          business_id?: string
          certificate_type_id?: string
          confidence?: number
          created_at?: string
          created_by?: string
          id?: string
          last_seen_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_aliases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_aliases_certificate_type_id_fkey"
            columns: ["certificate_type_id"]
            isOneToOne: false
            referencedRelation: "certificate_types"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_categories: {
        Row: {
          business_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_types: {
        Row: {
          business_id: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_types_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "certificate_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          category_id: string | null
          certificate_type_id: string | null
          created_at: string
          date_of_issue: string
          document_url: string | null
          expiry_date: string | null
          expiry_notification_sent: boolean
          id: string
          issuer_type_id: string | null
          issuing_authority: string | null
          name: string
          needs_review: boolean
          personnel_id: string
          place_of_issue: string
          title_normalized: string | null
          title_raw: string | null
          unmapped_at: string | null
          unmapped_by: string | null
          unmapped_reason: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          certificate_type_id?: string | null
          created_at?: string
          date_of_issue: string
          document_url?: string | null
          expiry_date?: string | null
          expiry_notification_sent?: boolean
          id?: string
          issuer_type_id?: string | null
          issuing_authority?: string | null
          name: string
          needs_review?: boolean
          personnel_id: string
          place_of_issue: string
          title_normalized?: string | null
          title_raw?: string | null
          unmapped_at?: string | null
          unmapped_by?: string | null
          unmapped_reason?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          certificate_type_id?: string | null
          created_at?: string
          date_of_issue?: string
          document_url?: string | null
          expiry_date?: string | null
          expiry_notification_sent?: boolean
          id?: string
          issuer_type_id?: string | null
          issuing_authority?: string | null
          name?: string
          needs_review?: boolean
          personnel_id?: string
          place_of_issue?: string
          title_normalized?: string | null
          title_raw?: string | null
          unmapped_at?: string | null
          unmapped_by?: string | null
          unmapped_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "certificate_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_certificate_type_id_fkey"
            columns: ["certificate_type_id"]
            isOneToOne: false
            referencedRelation: "certificate_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_issuer_type_id_fkey"
            columns: ["issuer_type_id"]
            isOneToOne: false
            referencedRelation: "issuer_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      data_processing_acknowledgements: {
        Row: {
          acknowledged_at: string
          acknowledgement_type: string
          acknowledgement_version: string
          business_id: string
          created_at: string
          id: string
          personnel_id: string
        }
        Insert: {
          acknowledged_at: string
          acknowledgement_type: string
          acknowledgement_version: string
          business_id: string
          created_at?: string
          id?: string
          personnel_id: string
        }
        Update: {
          acknowledged_at?: string
          acknowledgement_type?: string
          acknowledgement_version?: string
          business_id?: string
          created_at?: string
          id?: string
          personnel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_processing_acknowledgements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_processing_acknowledgements_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          business_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          personnel_id: string
          read_at: string | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          personnel_id: string
          read_at?: string | null
          sender_id: string
          sender_role: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          personnel_id?: string
          read_at?: string | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: []
      }
      document_categories: {
        Row: {
          business_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          business_id: string
          is_active: boolean
          is_unlimited: boolean
          profile_cap: number
          tier: string
          updated_at: string
        }
        Insert: {
          business_id: string
          is_active?: boolean
          is_unlimited?: boolean
          profile_cap?: number
          tier?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          is_active?: boolean
          is_unlimited?: boolean
          profile_cap?: number
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      error_events: {
        Row: {
          actor_user_id: string | null
          business_id: string | null
          created_at: string
          event_type: string
          id: string
          message: string | null
          metadata: Json
          severity: string
          source: string
        }
        Insert: {
          actor_user_id?: string | null
          business_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          message?: string | null
          metadata?: Json
          severity?: string
          source: string
        }
        Update: {
          actor_user_id?: string | null
          business_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          message?: string | null
          metadata?: Json
          severity?: string
          source?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          business_id: string
          category: string
          created_at: string
          id: string
          message: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          category: string
          created_at?: string
          id?: string
          message: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          category?: string
          created_at?: string
          id?: string
          message?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_invitations: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          token: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          token?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          business_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          personnel_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }
        Insert: {
          business_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          personnel_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          personnel_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      issuer_aliases: {
        Row: {
          alias_normalized: string
          alias_raw_example: string | null
          business_id: string
          confidence: number
          created_at: string
          created_by: string
          id: string
          issuer_type_id: string
          last_seen_at: string
        }
        Insert: {
          alias_normalized: string
          alias_raw_example?: string | null
          business_id: string
          confidence?: number
          created_at?: string
          created_by: string
          id?: string
          issuer_type_id: string
          last_seen_at?: string
        }
        Update: {
          alias_normalized?: string
          alias_raw_example?: string | null
          business_id?: string
          confidence?: number
          created_at?: string
          created_by?: string
          id?: string
          issuer_type_id?: string
          last_seen_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issuer_aliases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issuer_aliases_issuer_type_id_fkey"
            columns: ["issuer_type_id"]
            isOneToOne: false
            referencedRelation: "issuer_types"
            referencedColumns: ["id"]
          },
        ]
      }
      issuer_types: {
        Row: {
          business_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issuer_types_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_recipients: {
        Row: {
          created_at: string
          id: string
          notification_id: string
          personnel_id: string
          read_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notification_id: string
          personnel_id: string
          read_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notification_id?: string
          personnel_id?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_recipients_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          message: string
          subject: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          subject: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel: {
        Row: {
          activated: boolean
          address: string | null
          avatar_url: string | null
          bio: string | null
          business_id: string | null
          category: string | null
          certificate_expiry_notifications: boolean
          city: string | null
          country: string | null
          created_at: string
          department: string | null
          email: string
          gender: string | null
          id: string
          is_freelancer: boolean
          language: string | null
          last_login_at: string | null
          location: string
          name: string
          national_id: string | null
          nationality: string | null
          next_of_kin_name: string | null
          next_of_kin_phone: string | null
          next_of_kin_relation: string | null
          phone: string
          postal_address: string | null
          postal_code: string | null
          profile_code: string
          role: string
          salary_account_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activated?: boolean
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          business_id?: string | null
          category?: string | null
          certificate_expiry_notifications?: boolean
          city?: string | null
          country?: string | null
          created_at?: string
          department?: string | null
          email: string
          gender?: string | null
          id?: string
          is_freelancer?: boolean
          language?: string | null
          last_login_at?: string | null
          location?: string
          name: string
          national_id?: string | null
          nationality?: string | null
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          next_of_kin_relation?: string | null
          phone: string
          postal_address?: string | null
          postal_code?: string | null
          profile_code?: string
          role: string
          salary_account_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activated?: boolean
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          business_id?: string | null
          category?: string | null
          certificate_expiry_notifications?: boolean
          city?: string | null
          country?: string | null
          created_at?: string
          department?: string | null
          email?: string
          gender?: string | null
          id?: string
          is_freelancer?: boolean
          language?: string | null
          last_login_at?: string | null
          location?: string
          name?: string
          national_id?: string | null
          nationality?: string | null
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          next_of_kin_relation?: string | null
          phone?: string
          postal_address?: string | null
          postal_code?: string | null
          profile_code?: string
          role?: string
          salary_account_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personnel_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel_document_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          personnel_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          personnel_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          personnel_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personnel_document_categories_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel_documents: {
        Row: {
          category_id: string | null
          created_at: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          name: string
          personnel_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          name: string
          personnel_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          name?: string
          personnel_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personnel_documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_documents_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel_worker_groups: {
        Row: {
          created_at: string
          personnel_id: string
          worker_group_id: string
        }
        Insert: {
          created_at?: string
          personnel_id: string
          worker_group_id: string
        }
        Update: {
          created_at?: string
          personnel_id?: string
          worker_group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personnel_worker_groups_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_worker_groups_worker_group_id_fkey"
            columns: ["worker_group_id"]
            isOneToOne: false
            referencedRelation: "worker_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          privacy_version: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          privacy_version?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          privacy_version?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      project_applications: {
        Row: {
          accepted_at: string | null
          business_id: string
          created_at: string
          id: string
          initial_message: string
          personnel_id: string
          project_id: string
          rejected_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          business_id: string
          created_at?: string
          id?: string
          initial_message: string
          personnel_id: string
          project_id: string
          rejected_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          business_id?: string
          created_at?: string
          id?: string
          initial_message?: string
          personnel_id?: string
          project_id?: string
          rejected_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_applications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_applications_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_calendar_items: {
        Row: {
          created_at: string
          date: string
          description: string
          id: string
          is_milestone: boolean
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          description: string
          id?: string
          is_milestone?: boolean
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string
          id?: string
          is_milestone?: boolean
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_calendar_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_document_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_document_categories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          category_id: string | null
          created_at: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          name: string
          project_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          name: string
          project_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          name?: string
          project_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "project_document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_invitations: {
        Row: {
          created_at: string
          id: string
          invited_at: string
          invited_by: string | null
          personnel_id: string
          project_id: string
          responded_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          personnel_id: string
          project_id: string
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          personnel_id?: string
          project_id?: string
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_invitations_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          project_id: string
          sender_id: string
          sender_name: string
          sender_role: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          project_id: string
          sender_id: string
          sender_name: string
          sender_role: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          sender_id?: string
          sender_name?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_phases: {
        Row: {
          color: string | null
          created_at: string
          end_date: string
          id: string
          name: string
          project_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          end_date: string
          id?: string
          name: string
          project_id: string
          start_date: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          project_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          assigned_personnel: string[] | null
          business_id: string
          created_at: string
          customer: string | null
          description: string
          end_date: string | null
          exclude_countries: string[] | null
          id: string
          image_url: string | null
          include_countries: string[] | null
          is_posted: boolean
          location: string | null
          name: string
          project_country: string | null
          project_location_label: string | null
          project_manager: string | null
          project_number: string | null
          start_date: string
          status: string
          updated_at: string
          visibility_mode: string
          work_category: string | null
        }
        Insert: {
          assigned_personnel?: string[] | null
          business_id: string
          created_at?: string
          customer?: string | null
          description: string
          end_date?: string | null
          exclude_countries?: string[] | null
          id?: string
          image_url?: string | null
          include_countries?: string[] | null
          is_posted?: boolean
          location?: string | null
          name: string
          project_country?: string | null
          project_location_label?: string | null
          project_manager?: string | null
          project_number?: string | null
          start_date: string
          status?: string
          updated_at?: string
          visibility_mode?: string
          work_category?: string | null
        }
        Update: {
          assigned_personnel?: string[] | null
          business_id?: string
          created_at?: string
          customer?: string | null
          description?: string
          end_date?: string | null
          exclude_countries?: string[] | null
          id?: string
          image_url?: string | null
          include_countries?: string[] | null
          is_posted?: boolean
          location?: string | null
          name?: string
          project_country?: string | null
          project_location_label?: string | null
          project_manager?: string | null
          project_number?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          visibility_mode?: string
          work_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count: number
          key: string
          window_start: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      worker_categories: {
        Row: {
          business_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_groups: {
        Row: {
          business_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_groups_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_personnel: {
        Args: { p_category?: string; p_personnel_id: string }
        Returns: Json
      }
      add_personnel_to_project: {
        Args: { _personnel_id: string; _project_id: string }
        Returns: boolean
      }
      can_access_notification: {
        Args: { _notification_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_personnel: {
        Args: { _personnel_id: string; _user_id: string }
        Returns: boolean
      }
      can_assign_personnel_to_project: {
        Args: { _personnel_id: string }
        Returns: boolean
      }
      can_insert_notification: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      can_worker_access_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      can_worker_see_posted_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      deactivate_personnel: { Args: { p_personnel_id: string }; Returns: Json }
      enforce_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: undefined
      }
      get_business_entitlement: {
        Args: { p_business_id: string }
        Returns: {
          is_active: boolean
          is_unlimited: boolean
          profile_cap: number
          tier: string
        }[]
      }
      get_freelancer_invitation_by_token: {
        Args: { lookup_token: string }
        Returns: {
          business_id: string
          id: string
          is_active: boolean
          name: string
        }[]
      }
      get_freelancer_registration_by_code: {
        Args: { lookup_code: string }
        Returns: {
          business_id: string
          business_name: string
          token: string
        }[]
      }
      get_invitation_by_token: {
        Args: { lookup_token: string }
        Returns: {
          business_id: string
          business_name: string
          email: string
          expires_at: string
          id: string
          personnel_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }[]
      }
      get_user_business_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_worker_categories_for_freelancer_token: {
        Args: { lookup_token: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_freelancer_personnel: {
        Args: { _personnel_id: string }
        Returns: boolean
      }
      is_personnel_activated: {
        Args: { _personnel_id: string }
        Returns: boolean
      }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
      remove_personnel_from_project: {
        Args: { _personnel_id: string; _project_id: string }
        Returns: boolean
      }
      validate_invitation_token_access: {
        Args: { invitation_token: string; lookup_token: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "worker" | "manager"
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
      app_role: ["admin", "worker", "manager"],
    },
  },
} as const
