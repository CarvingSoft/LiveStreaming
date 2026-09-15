/** True for RFC1918 / loopback — not reachable from EC2 or off-LAN clients. */
export function isPrivateRtspHost(host: string): boolean {
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

export function publicRtspHostError(host: string): string | null {
  if (!isPrivateRtspHost(host)) {
    return null;
  }

  return (
    `Use the DVR public IP and forwarded RTSP port (e.g. 59.96.60.54:11554 or :10554). ` +
    `Private LAN addresses like ${host.trim()} are not allowed.`
  );
}
