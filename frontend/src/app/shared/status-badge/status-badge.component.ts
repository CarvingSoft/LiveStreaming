import { Component, Input } from '@angular/core';
import { StreamStatus } from '../../core/models/api.models';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span class="badge" [class]="status">{{ label }}</span>
  `,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.65rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .online {
      background: #dcfce7;
      color: #166534;
    }

    .offline,
    .disabled {
      background: #fee2e2;
      color: #991b1b;
    }

    .connecting {
      background: #fef9c3;
      color: #854d0e;
    }

    .error {
      background: #ffedd5;
      color: #9a3412;
    }
  `,
})
export class StatusBadgeComponent {
  @Input({ required: true }) status: StreamStatus = 'offline';

  get label(): string {
    switch (this.status) {
      case 'online':
        return 'Live';
      case 'connecting':
        return 'Connecting';
      case 'disabled':
        return 'Disabled';
      case 'error':
        return 'Error';
      default:
        return 'Offline';
    }
  }
}
