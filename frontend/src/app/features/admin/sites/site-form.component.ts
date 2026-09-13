import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-site-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="page">
      <header>
        <h1>{{ isEdit() ? 'Edit Site' : 'Create Site' }}</h1>
      </header>

      <form class="card" [formGroup]="form" (ngSubmit)="submit()">
        <label>
          Site Name
          <input formControlName="name" />
        </label>

        <label>
          Slug
          <input formControlName="slug" placeholder="kuttippuram-rto" (blur)="normalizeSlug()" />
          <small>Lowercase letters, numbers, and hyphens only. Auto-filled from site name.</small>
        </label>

        <label>
          Organization
          <input formControlName="organizationName" />
        </label>

        <label>
          Location
          <input formControlName="location" />
        </label>

        <label>
          Description
          <textarea rows="3" formControlName="description"></textarea>
        </label>

        <label class="checkbox">
          <input type="checkbox" formControlName="isActive" />
          Site is active
        </label>

        <label class="checkbox">
          <input type="checkbox" formControlName="isPublic" />
          Public live page
        </label>

        @if (error()) {
          <div class="error">{{ error() }}</div>
        }

        <div class="actions">
          <a routerLink="/admin/sites">Cancel</a>
          <button type="submit" [disabled]="form.invalid || saving()">Save Site</button>
        </div>
      </form>
    </section>
  `,
  styles: `
    .card {
      max-width: 720px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-weight: 600;
      color: #334155;
    }

    input,
    textarea {
      font: inherit;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 0.7rem 0.8rem;
    }

    .checkbox {
      flex-direction: row;
      align-items: center;
      font-weight: 500;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      align-items: center;
    }

    .actions a {
      color: #64748b;
      text-decoration: none;
    }

    button {
      border: 0;
      border-radius: 8px;
      padding: 0.7rem 1rem;
      background: #2563eb;
      color: white;
      font-weight: 700;
      cursor: pointer;
    }

    .error {
      color: #b91c1c;
      background: #fee2e2;
      padding: 0.65rem 0.75rem;
      border-radius: 8px;
    }
  `,
})
export class SiteFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isEdit = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    organizationName: [''],
    location: [''],
    description: [''],
    isActive: [true],
    isPublic: [true],
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.api.getSite(id).subscribe({
        next: (site) => {
          this.form.patchValue(site);
        },
      });
    } else {
      this.form.controls.name.valueChanges.subscribe(() => {
        if (!this.form.controls.slug.dirty) {
          this.form.controls.slug.setValue(this.slugify(this.form.controls.name.value));
        }
      });
    }
  }

  normalizeSlug(): void {
    this.form.controls.slug.setValue(this.slugify(this.form.controls.slug.value));
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  submit(): void {
    if (this.form.invalid) return;

    this.saving.set(true);
    this.error.set(null);

    this.normalizeSlug();
    const payload = this.form.getRawValue();
    const id = this.route.snapshot.paramMap.get('id');

    const request$ = id ? this.api.updateSite(id, payload) : this.api.createSite(payload);

    request$.subscribe({
      next: (site) => {
        this.saving.set(false);
        void this.router.navigate(['/admin/sites', site.id]);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.message ?? 'Unable to save site. Check slug uniqueness and form values.');
      },
    });
  }
}
