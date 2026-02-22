export interface Venue {
  name: string;
  rating: number;
  description: string;
  address: string;
  website?: string;
  mapsUri?: string;
  photoUrl?: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Plan {
  id: number;
  prompt: string;
  venues: Venue[];
  created_at: string;
}
