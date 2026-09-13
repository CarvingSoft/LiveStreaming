import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="login-page">
      <form class="card" [formGroup]="form" (ngSubmit)="submit()">
        <h1>Admin Login</h1>
        <p>Carvingsoft CCTV Live Streaming Platform</p>

        <label>
          Email
          <input type="email" formControlName="email" autocomplete="username" />
        </label>

        <label>
          Password
          <input type="password" formControlName="password" autocomplete="current-password" />
        </label>

        @if (error()) {
          <div class="error">{{ error() }}</div>
        }

        <button type="submit" [disabled]="form.invalid || loading()">Sign in</button>
      </form>
    </div>
  `,
  styles: `
    .login-page {
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #0f172a, #1d4ed8);
      padding: 1rem;
    }

    .card {
      width: min(420px, 100%);
      background: white;
      border-radius: 16px;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      box-shadow: 0 20px 45px rgba(15, 23, 42, 0.25);
    }

    h1 {
      margin: 0;
      font-size: 1.6rem;
    }

    p {
      margin: 0;
      color: #64748b;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.9rem;
      font-weight: 600;
      color: #334155;
    }

    input {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 0.7rem 0.8rem;
      font: inherit;
    }

    button {
      border: 0;
      border-radius: 8px;
      padding: 0.8rem;
      background: #2563eb;
      color: white;
      font-weight: 700;
      cursor: pointer;
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .error {
      color: #b91c1c;
      background: #fee2e2;
      border-radius: 8px;
      padding: 0.65rem 0.75rem;
      font-size: 0.9rem;
    }
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate(['/admin']);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Invalid email or password');
      },
    });
  }
}
