import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  // Only send events when DSN is configured
  enabled: !!process.env.SENTRY_DSN,
});
