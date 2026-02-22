import { User, Venue, Plan } from '../types';

export const api = {
  async getMe(): Promise<User | null> {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    return res.json();
  },

  async login(credentials: any): Promise<User> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  },

  async signup(data: any): Promise<User> {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Signup failed');
    return res.json();
  },

  async logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
  },

  async createPlan(prompt: string, location?: { latitude: number; longitude: number }): Promise<{ venues: Venue[] }> {
    const res = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, location }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create plan');
    }
    return res.json();
  },

  async getHistory(): Promise<Plan[]> {
    const res = await fetch('/api/history');
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  },
};
