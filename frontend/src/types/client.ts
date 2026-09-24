export interface Client {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  email: string;
  industry?: string | null;
  website?: string | null;
  phone?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientInput {
  name: string;
  email: string;
  password: string;
  industry?: string;
  website?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  notes?: string;
}

// backend omits password + makes everything optional for update
export type UpdateClientInput = Partial<Omit<CreateClientInput, 'password'>>;

export interface CreateClientResult {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  client: Client;
}