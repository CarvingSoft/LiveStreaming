import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { User } from '../models/api.models';
import { getApiBaseUrl } from './api-base';

interface LoginResponse {
  token: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenKey = 'cctv_admin_token';

  private readonly tokenSignal = signal<string | null>(this.readStoredToken());
  private readonly userSignal = signal<User | null>(null);

  readonly token = this.tokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.tokenSignal()));

  login(email: string, password: string) {
    return this.http.post<LoginResponse>(`${getApiBaseUrl()}/auth/login`, { email, password }).pipe(
      tap((response) => {
        this.tokenSignal.set(response.token);
        this.userSignal.set(response.user);
        sessionStorage.setItem(this.tokenKey, response.token);
      }),
    );
  }

  loadCurrentUser() {
    return this.http.get<User>(`${getApiBaseUrl()}/auth/me`).pipe(
      tap((user) => this.userSignal.set(user)),
    );
  }

  logout(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    sessionStorage.removeItem(this.tokenKey);
    void this.router.navigate(['/login']);
  }

  getAuthorizationHeader(): string | null {
    const token = this.tokenSignal();
    return token ? `Bearer ${token}` : null;
  }

  private readStoredToken(): string | null {
    return sessionStorage.getItem(this.tokenKey);
  }
}
