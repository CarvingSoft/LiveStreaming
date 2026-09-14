/** True for RFC1918 / loopback hosts that EC2 cannot reach over the internet. */
export function isPrivateHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  if (
    normalized === 'localhost' ||
    normalized.startsWith('192.168.') ||
    normalized.startsWith('10.') ||
    normalized.startsWith('127.')
  ) {
    return true;
  }
  if (normalized.startsWith('172.')) {
    const second = Number(normalized.split('.')[1]);
    return second >= 16 && second <= 31;
  }
  return false;
}

export function productionRtspHostError(host: string): string | null {
  if (!isPrivateHost(host)) {
    return null;
  }

  return (
    `RTSP host "${host}" is a private LAN address. On production (EC2), use the DVR public IP ` +
    'and forwarded port (e.g. 59.96.60.54:11554). Private IPs only work on local dev on the same network.'
  );
}
