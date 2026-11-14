import { requestJson } from './requestJson';

type User = { id: number; email: string };
type Session = { user: User | null };

export function getSession(signal: AbortSignal) {
  return requestJson<Session>('/api/auth/me', { signal });
}

function post<T>(path: string, body: object) {
  return requestJson<T>(`/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function register(email: string, password: string) {
  return post<{ user: User }>('register', { email, password });
}

export function logIn(email: string, password: string) {
  return post<{ user: User }>('login', { email, password });
}

export function logOut() {
  return post<Session>('logout', {});
}
