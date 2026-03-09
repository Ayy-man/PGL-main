export type ListMemberStatus = "new" | "contacted" | "responded" | "not_interested";

export interface List {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface ListMember {
  id: string;
  list_id: string;
  prospect_id: string;
  status: ListMemberStatus;
  notes: string | null;
  added_at: string;
  updated_at: string;
  prospect: {
    id: string;
    name: string;
    title: string | null;
    company: string | null;
    location: string | null;
    email: string | null;
    email_status: string | null;
    phone: string | null;
    linkedin_url: string | null;
  };
}

export interface CreateListInput {
  name: string;
  description?: string;
}
