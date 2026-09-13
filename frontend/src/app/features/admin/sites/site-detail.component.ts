import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Camera, RtspSourceForm, Site } from '../../../core/models/api.models';
import { StatusBadgeComponent } from '../../../shared/status-badge/status-badge.component';

@Component({
  selector: 'app-site-detail',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, FormsModule, StatusBadgeComponent],
  template: `
    <section class="page">
      @if (site()) {
        <header class="toolbar">
          <div>
            <h1>{{ site()!.name }}</h1>
            <p>
              Public URL:
              <a [href]="'/' + site()!.slug" target="_blank" rel="noopener">/{{ site()!.slug }}</a>
            </p>
          </div>
          <a [routerLink]="['/admin/sites', site()!.id, 'edit']" class="btn secondary">Edit Site</a>
        </header>

        <div class="grid">
          <section class="card">
            <h2>Cameras</h2>
            <div class="camera-list">
              @for (camera of cameras(); track camera.id) {
                <article class="camera-item">
                  <div>
                    <strong>{{ camera.name }}</strong>
                    <div class="meta">
                      <code>{{ camera.cameraKey }}</code>
                      <app-status-badge [status]="camera.lastKnownStatus" />
                    </div>
                  </div>
                  <div class="actions">
                    <button type="button" class="link" (click)="editCamera(camera)">Edit</button>
                    <button type="button" class="danger" (click)="deleteCamera(camera.id)">Delete</button>
                  </div>
                </article>
              } @empty {
                <p>No cameras configured yet.</p>
              }
            </div>
          </section>

          <section class="card">
            <h2>{{ editingCameraId() ? 'Edit Camera' : 'Add Camera' }}</h2>

            @if (loadingCameraConfig()) {
              <p class="hint">Loading camera settings...</p>
            }

            <form
              [formGroup]="cameraForm"
              (ngSubmit)="saveCamera()"
              autocomplete="off"
              [class.loading]="loadingCameraConfig()"
            >
              <label>
                Camera Name
                <input formControlName="name" autocomplete="off" />
              </label>

              @if (editingCameraId()) {
                <label>
                  Camera Key
                  <input [value]="editingCameraKey()" disabled />
                  <small>Camera key cannot be changed after creation.</small>
                </label>
              } @else {
                <label>
                  Camera Key (optional)
                  <input formControlName="cameraKey" placeholder="main-entrance" autocomplete="off" />
                </label>
              }

              @if (editingCameraId()) {
                @if (editRtspDraft(); as rtsp) {
                  <div class="row">
                    <label>
                      DVR Host / IP
                      <input
                        [ngModel]="rtsp.host"
                        (ngModelChange)="updateEditRtsp('host', $event)"
                        [ngModelOptions]="{ standalone: true }"
                        [attr.name]="'rtsp-host-' + editFieldNonce()"
                        autocomplete="off"
                        placeholder="192.168.0.50"
                      />
                    </label>
                    <label>
                      RTSP Port
                      <input
                        type="number"
                        [ngModel]="rtsp.port"
                        (ngModelChange)="updateEditRtsp('port', $event)"
                        [ngModelOptions]="{ standalone: true }"
                        [attr.name]="'rtsp-port-' + editFieldNonce()"
                        autocomplete="off"
                      />
                      <small>CP Plus DVRs usually use port 554.</small>
                    </label>
                  </div>

                  <div class="row">
                    <label>
                      Username
                      <input
                        [ngModel]="rtsp.username"
                        (ngModelChange)="updateEditRtsp('username', $event)"
                        [ngModelOptions]="{ standalone: true }"
                        [attr.name]="'rtsp-user-' + editFieldNonce()"
                        autocomplete="off"
                      />
                    </label>
                    <label>
                      Password
                      <input
                        type="password"
                        [ngModel]="rtsp.password"
                        (ngModelChange)="updateEditRtsp('password', $event)"
                        [ngModelOptions]="{ standalone: true }"
                        [attr.name]="'rtsp-pass-' + editFieldNonce()"
                        autocomplete="new-password"
                      />
                      <small>Leave blank to keep existing password.</small>
                    </label>
                  </div>

                  <div class="row">
                    <label>
                      Channel
                      <input
                        type="number"
                        min="1"
                        [ngModel]="rtsp.channel"
                        (ngModelChange)="updateEditRtsp('channel', $event)"
                        [ngModelOptions]="{ standalone: true }"
                        autocomplete="off"
                      />
                    </label>
                    <label>
                      Stream Type
                      <select
                        [ngModel]="rtsp.subtype"
                        (ngModelChange)="updateEditRtsp('subtype', $event)"
                        [ngModelOptions]="{ standalone: true }"
                      >
                        <option [ngValue]="0">Main stream</option>
                        <option [ngValue]="1">Sub stream</option>
                      </select>
                    </label>
                  </div>

                  <label>
                    Custom RTSP Path Override (optional)
                    <input
                      [ngModel]="rtsp.customPath"
                      (ngModelChange)="updateEditRtsp('customPath', $event)"
                      [ngModelOptions]="{ standalone: true }"
                      placeholder="/cam/realmonitor?channel=1&subtype=0"
                      autocomplete="off"
                    />
                    <small>CP Plus paths vary by model. Use override if default template does not work.</small>
                  </label>
                }
              } @else {
                <div class="row">
                  <label>
                    DVR Host / IP
                    <input formControlName="host" placeholder="192.168.0.50" autocomplete="off" />
                  </label>
                  <label>
                    RTSP Port
                    <input type="number" formControlName="port" autocomplete="off" />
                    <small>CP Plus DVRs usually use port 554.</small>
                  </label>
                </div>

                <div class="row">
                  <label>
                    Username
                    <input formControlName="username" autocomplete="off" />
                  </label>
                  <label>
                    Password
                    <input type="password" formControlName="password" autocomplete="new-password" />
                  </label>
                </div>

                <div class="row">
                  <label>
                    Channel
                    <input type="number" formControlName="channel" min="1" autocomplete="off" />
                  </label>
                  <label>
                    Stream Type
                    <select formControlName="subtype">
                      <option [ngValue]="0">Main stream</option>
                      <option [ngValue]="1">Sub stream</option>
                    </select>
                  </label>
                </div>

                <label>
                  Custom RTSP Path Override (optional)
                  <input
                    formControlName="customPath"
                    placeholder="/cam/realmonitor?channel=1&subtype=0"
                    autocomplete="off"
                  />
                  <small>CP Plus paths vary by model. Use override if default template does not work.</small>
                </label>
              }

              <label class="checkbox">
                <input type="checkbox" formControlName="isActive" />
                Camera is active
              </label>

              @if (cameraError()) {
                <div class="error">{{ cameraError() }}</div>
              }

              <div class="actions">
                @if (editingCameraId()) {
                  <button type="button" class="btn secondary" (click)="resetCameraForm()">Cancel Edit</button>
                }
                <button
                  type="submit"
                  class="btn"
                  [disabled]="!canSaveCamera() || savingCamera() || loadingCameraConfig()"
                >
                  {{ editingCameraId() ? 'Update Camera' : 'Add Camera' }}
                </button>
              </div>
            </form>
          </section>
        </div>
      }
    </section>
  `,
  styles: `
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    h1 {
      margin: 0 0 0.35rem;
    }

    p {
      margin: 0;
      color: #64748b;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1rem;
    }

    .camera-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .camera-item {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.85rem;
      border: 1px solid #f1f5f9;
      border-radius: 10px;
    }

    .meta {
      display: flex;
      gap: 0.65rem;
      align-items: center;
      margin-top: 0.35rem;
      color: #64748b;
      font-size: 0.85rem;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-weight: 600;
      color: #334155;
    }

    input,
    select,
    textarea {
      font: inherit;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 0.65rem 0.75rem;
    }

    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .checkbox {
      flex-direction: row;
      align-items: center;
      font-weight: 500;
    }

    small {
      color: #64748b;
      font-weight: 400;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .btn {
      border: 0;
      border-radius: 8px;
      padding: 0.65rem 0.95rem;
      background: #2563eb;
      color: white;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
    }

    .btn.secondary,
    button.secondary {
      background: #e2e8f0;
      color: #0f172a;
    }

    .link {
      border: 0;
      background: transparent;
      color: #2563eb;
      cursor: pointer;
      font-weight: 600;
    }

    .danger {
      border: 0;
      background: transparent;
      color: #b91c1c;
      cursor: pointer;
      font-weight: 600;
    }

    .error {
      color: #b91c1c;
      background: #fee2e2;
      padding: 0.65rem 0.75rem;
      border-radius: 8px;
    }

    .hint {
      margin: 0 0 0.75rem;
      color: #64748b;
    }

    form.loading {
      opacity: 0.6;
      pointer-events: none;
    }

    @media (max-width: 1100px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class SiteDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly site = signal<Site | null>(null);
  readonly cameras = signal<Camera[]>([]);
  readonly editingCameraId = signal<string | null>(null);
  readonly editingCameraKey = signal('');
  readonly editFieldNonce = signal(0);
  readonly editRtspDraft = signal<RtspSourceForm | null>(null);
  readonly loadingCameraConfig = signal(false);
  readonly savingCamera = signal(false);
  readonly cameraError = signal<string | null>(null);

  readonly cameraForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    cameraKey: [''],
    host: ['', Validators.required],
    port: [554, [Validators.required, Validators.min(1), Validators.max(65535)]],
    username: ['', Validators.required],
    password: ['', Validators.required],
    channel: [1, [Validators.required, Validators.min(1)]],
    subtype: [0 as 0 | 1, Validators.required],
    customPath: [''],
    isActive: [true],
  });

  constructor() {
    const siteId = this.route.snapshot.paramMap.get('id')!;
    this.api.getSite(siteId).subscribe({ next: (site) => this.site.set(site) });
    this.loadCameras(siteId);
  }

  editCamera(camera: Camera): void {
    this.editingCameraId.set(camera.id);
    this.editingCameraKey.set(camera.cameraKey);
    this.editFieldNonce.update((value) => value + 1);
    this.editRtspDraft.set(null);
    this.cameraError.set(null);
    this.loadingCameraConfig.set(true);

    this.cameraForm.patchValue({
      name: camera.name,
      isActive: camera.isActive,
    });

    this.api.getCamera(camera.id).subscribe({
      next: (details) => {
        const config = details.sourceConfig;
        this.editRtspDraft.set({
          host: config?.host ?? '',
          port: Number(config?.port ?? 554),
          username: config?.username ?? '',
          password: '',
          channel: Number(config?.channel ?? details.channelNumber ?? 1),
          subtype: Number(config?.subtype) === 1 ? 1 : 0,
          customPath: config?.customPath ?? '',
        });
        this.cameraForm.patchValue({
          name: details.name,
          isActive: details.isActive,
        });
        this.loadingCameraConfig.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingCameraConfig.set(false);
        this.cameraError.set('Unable to load camera settings for editing.');
        this.resetCameraForm();
      },
    });
  }

  updateEditRtsp(field: keyof RtspSourceForm, value: string | number): void {
    this.editRtspDraft.update((draft) => {
      if (!draft) return draft;

      if (field === 'port' || field === 'channel') {
        return { ...draft, [field]: Number(value) };
      }

      if (field === 'subtype') {
        return { ...draft, subtype: Number(value) === 1 ? 1 : 0 };
      }

      return { ...draft, [field]: String(value) };
    });
  }

  canSaveCamera(): boolean {
    if (!this.cameraForm.controls.name.valid) {
      return false;
    }

    if (this.editingCameraId()) {
      const rtsp = this.editRtspDraft();
      return Boolean(rtsp?.host.trim() && rtsp.username.trim());
    }

    return this.cameraForm.valid;
  }

  resetCameraForm(): void {
    this.editingCameraId.set(null);
    this.editingCameraKey.set('');
    this.editRtspDraft.set(null);
    this.loadingCameraConfig.set(false);
    this.cameraForm.reset({
      name: '',
      cameraKey: '',
      host: '',
      port: 554,
      username: '',
      password: '',
      channel: 1,
      subtype: 0,
      customPath: '',
      isActive: true,
    });
  }

  saveCamera(): void {
    const site = this.site();
    if (!site || !this.canSaveCamera()) return;

    this.savingCamera.set(true);
    this.cameraError.set(null);

    const raw = this.cameraForm.getRawValue();
    const editingId = this.editingCameraId();

    if (editingId) {
      const rtsp = this.editRtspDraft();
      if (!rtsp) {
        this.savingCamera.set(false);
        return;
      }

      const sourceConfig: Partial<RtspSourceForm> = {
        host: rtsp.host.trim(),
        port: Number(rtsp.port),
        username: rtsp.username.trim(),
        channel: Number(rtsp.channel),
        subtype: Number(rtsp.subtype) === 1 ? 1 : 0,
      };

      const customPath = rtsp.customPath?.trim();
      if (customPath) {
        sourceConfig.customPath = customPath;
      }

      if (rtsp.password) {
        sourceConfig.password = rtsp.password;
      }

      this.api
        .updateCamera(editingId, {
          name: raw.name.trim(),
          isActive: raw.isActive,
          sourceType: 'rtsp',
          sourceConfig,
        })
        .subscribe({
          next: () => {
            this.savingCamera.set(false);
            this.resetCameraForm();
            this.loadCameras(site.id);
          },
          error: (err) => this.handleSaveError(err),
        });
      return;
    }

    const subtype = Number(raw.subtype) === 1 ? 1 : 0;
    const cameraKey = raw.cameraKey?.trim()
      ? raw.cameraKey
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      : undefined;

    this.api
      .createCamera(site.id, {
        name: raw.name.trim(),
        cameraKey,
        isActive: raw.isActive,
        sourceType: 'rtsp',
        sourceConfig: {
          host: raw.host.trim(),
          port: Number(raw.port),
          username: raw.username.trim(),
          password: raw.password,
          channel: Number(raw.channel),
          subtype: subtype as 0 | 1,
          customPath: raw.customPath?.trim() || undefined,
        },
      })
      .subscribe({
        next: () => {
          this.savingCamera.set(false);
          this.resetCameraForm();
          this.loadCameras(site.id);
        },
        error: (err) => this.handleSaveError(err),
      });
  }

  private handleSaveError(err: { error?: { message?: string; details?: { fieldErrors?: Record<string, string[]> } } }): void {
    this.savingCamera.set(false);
    const details = err.error?.details?.fieldErrors;
    const fieldMessages = details
      ? Object.entries(details)
          .flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`))
          .join(' ')
      : '';
    this.cameraError.set(
      fieldMessages
        ? `${err.error?.message ?? 'Validation failed'} — ${fieldMessages}`
        : (err.error?.message ?? 'Unable to save camera.'),
    );
  }

  deleteCamera(cameraId: string): void {
    const site = this.site();
    if (!site) return;

    if (!confirm('Delete this camera?')) return;

    this.api.deleteCamera(cameraId).subscribe({
      next: () => this.loadCameras(site.id),
    });
  }

  private loadCameras(siteId: string): void {
    this.api.getCameras(siteId).subscribe({
      next: (cameras) => this.cameras.set(cameras),
    });
  }
}
