import { z } from 'zod';

export const telemetryPayloadSchema = z
  .object({
    deviceId: z
      .string({ required_error: 'deviceId is required' })
      .trim()
      .min(1, 'deviceId cannot be empty')
      .max(64, 'deviceId must not exceed 64 characters'),
    latitude: z.coerce
      .number({ required_error: 'latitude is required' })
      .refine((lat) => !isNaN(lat) && lat >= -90 && lat <= 90, {
        message: 'Latitude must be a valid number between -90 and 90 degrees',
      }),
    longitude: z.coerce
      .number({ required_error: 'longitude is required' })
      .refine((lon) => !isNaN(lon) && lon >= -180 && lon <= 180, {
        message: 'Longitude must be a valid number between -180 and 180 degrees',
      }),
    altitude: z.coerce.number().optional().nullable(),
    speed: z.coerce
      .number()
      .min(0, 'Speed must be greater than or equal to 0')
      .optional()
      .nullable(),
    heading: z.coerce
      .number()
      .min(0, 'Heading must be between 0 and 360 degrees')
      .max(360, 'Heading must be between 0 and 360 degrees')
      .optional()
      .nullable(),
    satellites: z.coerce
      .number()
      .int('Satellites count must be an integer')
      .min(0, 'Satellites count cannot be negative')
      .optional()
      .nullable(),
    hdop: z.coerce
      .number()
      .min(0, 'HDOP must be greater than or equal to 0')
      .optional()
      .nullable(),
    gpsTimestamp: z.union([
      z.string().datetime(),
      z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: 'gpsTimestamp must be a parseable ISO date string',
      }),
      z.coerce.date(),
    ]).transform((val) => (val instanceof Date ? val : new Date(val))),
  })
  .refine(
    (data) => !(Math.abs(data.latitude) < 0.000001 && Math.abs(data.longitude) < 0.000001),
    {
      message: 'Coordinates (0, 0) indicate no GPS fix and are rejected',
      path: ['latitude'],
    }
  );

export type TelemetryPayload = z.infer<typeof telemetryPayloadSchema>;

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  page: z.coerce.number().int().min(1).default(1),
  from: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid "from" timestamp format',
    }),
  to: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid "to" timestamp format',
    }),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type HistoryQuery = z.infer<typeof historyQuerySchema>;
