import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { findMissingEnv } from '../config/validateEnv.js';

// tests/setup.js mocks utils/email.js globally; these tests need the real
// transport-selection helpers, not the mocked send functions.
const { buildTransportOptions, getFromAddress } = await vi.importActual('../utils/email.js');

describe('GET /health', () => {
  it('returns 200 with the database up, on both paths', async () => {
    for (const path of ['/health', '/api/v1/health']) {
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
      expect(typeof res.body.uptimeSeconds).toBe('number');
    }
  });

  it('returns 503 when the database connection is down', async () => {
    const spy = vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);
    try {
      const res = await request(app).get('/health');
      expect(res.status).toBe(503);
      expect(res.body).toMatchObject({ status: 'degraded', database: 'down' });
    } finally {
      spy.mockRestore();
    }
  });

  it('is not throttled by the API rate limiter', async () => {
    const results = await Promise.all(Array.from({ length: 30 }, () => request(app).get('/api/v1/health')));
    expect(results.every((r) => r.status === 200)).toBe(true);
  });
});

describe('email transport selection', () => {
  it('uses a generic SMTP relay when SMTP_HOST is set', () => {
    const opts = buildTransportOptions({
      SMTP_HOST: 'smtp-relay.brevo.com',
      SMTP_PORT: '587',
      SMTP_USER: 'login@smtp-brevo.com',
      SMTP_PASS: 'key'
    });
    expect(opts).toEqual({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: { user: 'login@smtp-brevo.com', pass: 'key' }
    });
  });

  it('uses implicit TLS on port 465 and defaults to 587', () => {
    expect(buildTransportOptions({ SMTP_HOST: 'h', SMTP_PORT: '465' }).secure).toBe(true);
    expect(buildTransportOptions({ SMTP_HOST: 'h' }).port).toBe(587);
  });

  it('falls back to Gmail when SMTP_HOST is unset', () => {
    const opts = buildTransportOptions({ EMAIL_USER: 'me@gmail.com', EMAIL_APP_PASS: 'abcd efgh ijkl mnop' });
    expect(opts).toEqual({ service: 'gmail', auth: { user: 'me@gmail.com', pass: 'abcdefghijklmnop' } });
  });

  it('prefers EMAIL_FROM over EMAIL_USER as the sender', () => {
    expect(getFromAddress({ EMAIL_FROM: 'no-reply@edsync.com', EMAIL_USER: 'me@gmail.com' })).toBe(
      'no-reply@edsync.com'
    );
    expect(getFromAddress({ EMAIL_USER: 'me@gmail.com' })).toBe('me@gmail.com');
  });
});

describe('validateEnv', () => {
  const base = { MONGO_URI: 'm', JWT_SECRET: 'j', REDIS_URL: 'r' };

  it('requires the Gmail pair when SMTP_HOST is unset', () => {
    expect(findMissingEnv(base)).toEqual(['EMAIL_USER', 'EMAIL_APP_PASS']);
    expect(findMissingEnv({ ...base, EMAIL_USER: 'u', EMAIL_APP_PASS: 'p' })).toEqual([]);
  });

  it('requires the SMTP set (and not Gmail) when SMTP_HOST is set', () => {
    expect(findMissingEnv({ ...base, SMTP_HOST: 'h' })).toEqual(['SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM']);
    expect(
      findMissingEnv({ ...base, SMTP_HOST: 'h', SMTP_USER: 'u', SMTP_PASS: 'p', EMAIL_FROM: 'f' })
    ).toEqual([]);
  });
});
