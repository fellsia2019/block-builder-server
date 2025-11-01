import { Request } from 'express';

export function extractDomainFromRequest(req: Request): string | null {
  let domain: string | null = null;
  
  const forwardedHost = req.headers['x-forwarded-host'];
  if (forwardedHost) {
    const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
    if (host && typeof host === 'string') {
      domain = removePort(host);
    }
  }

  if (!domain) {
    const host = req.headers.host;
    if (host && typeof host === 'string') {
      domain = removePort(host);
    }
  }

  if (!domain) {
    const origin = req.headers.origin;
    if (origin && typeof origin === 'string') {
      try {
        const url = new URL(origin);
        domain = url.hostname;
      } catch {
        domain = removePort(origin);
      }
    }
  }

  if (!domain) {
    const referer = req.headers.referer || req.headers['referrer'];
    if (referer && typeof referer === 'string') {
      try {
        const url = new URL(referer);
        domain = url.hostname;
      } catch {
        return null;
      }
    }
  }

  return domain ? normalizeDomain(domain) : null;
}

function removePort(host: string): string {
  const colonIndex = host.indexOf(':');
  if (colonIndex !== -1) {
    return host.substring(0, colonIndex);
  }
  return host;
}

export function normalizeDomain(domain: string): string {
  if (!domain) return domain;
  
  let normalized = domain.trim().toLowerCase();
  
  if (normalized.startsWith('www.')) {
    normalized = normalized.substring(4);
  }
  
  return normalized;
}
