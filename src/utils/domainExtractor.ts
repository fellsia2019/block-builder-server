import { Request } from 'express';

export function extractDomainFromRequest(req: Request): string | null {
  let domain: string | null = null;
  
  // Сначала проверяем Origin - это заголовок, который показывает домен клиента
  // (откуда пришел запрос), а не домен сервера (куда пришел запрос)
  const origin = req.headers.origin;
  if (origin && typeof origin === 'string') {
    try {
      const url = new URL(origin);
      domain = url.hostname;
    } catch {
      domain = removePort(origin);
    }
  }

  // Если Origin не найден, проверяем Referer
  if (!domain) {
    const referer = req.headers.referer || req.headers['referrer'];
    if (referer && typeof referer === 'string') {
      try {
        const url = new URL(referer);
        domain = url.hostname;
      } catch {
        // Пропускаем некорректный Referer
      }
    }
  }

  // X-Forwarded-Host используется прокси-серверами и может содержать оригинальный хост
  if (!domain) {
    const forwardedHost = req.headers['x-forwarded-host'];
    if (forwardedHost) {
      const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
      if (host && typeof host === 'string') {
        domain = removePort(host);
      }
    }
  }

  // Host - это домен сервера, используем только если ничего другого не найдено
  // (например, для прямых запросов без Origin/Referer)
  if (!domain) {
    const host = req.headers.host;
    if (host && typeof host === 'string') {
      domain = removePort(host);
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
