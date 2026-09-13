export interface WhepPlayerOptions {
  whepUrl: string;
  videoElement: HTMLVideoElement;
  onStatusChange?: (status: 'connecting' | 'online' | 'error') => void;
}

export class WhepPlayer {
  private pc: RTCPeerConnection | null = null;
  private closed = false;

  constructor(private readonly options: WhepPlayerOptions) {}

  async start(): Promise<void> {
    this.options.onStatusChange?.('connecting');

    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    this.pc.addTransceiver('video', { direction: 'recvonly' });
    this.pc.addTransceiver('audio', { direction: 'recvonly' });

    this.pc.ontrack = (event) => {
      this.options.videoElement.srcObject = event.streams[0] ?? null;
      this.options.onStatusChange?.('online');
    };

    this.pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      if (this.pc.connectionState === 'failed') {
        this.options.onStatusChange?.('error');
      }
    };

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    const response = await fetch(this.options.whepUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        Accept: 'application/sdp',
      },
      body: offer.sdp ?? '',
    });

    if (!response.ok) {
      this.options.onStatusChange?.('error');
      throw new Error(`WHEP negotiation failed (${response.status})`);
    }

    const answerSdp = await response.text();
    await this.pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    this.options.videoElement.srcObject = null;
  }
}
