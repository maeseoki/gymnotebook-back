import { z } from 'zod';

export const MessageResponseSchema = z.object({
  message: z.string(),
});
export type MessageResponse = z.infer<typeof MessageResponseSchema>;

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const NormalizedPaginationQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['startDate', 'endDate', 'id']).default('startDate'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
});
export type NormalizedPaginationQuery = z.infer<typeof NormalizedPaginationQuerySchema>;

export const IanaTimezoneSchema = z.string().refine((value) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, 'Invalid IANA timezone');
export type IanaTimezone = z.infer<typeof IanaTimezoneSchema>;

export const CalendarDateSchema = z.iso.date();

export const IsoInstantStringSchema = z.iso
  .datetime({ offset: true })
  .refine((value) => /(?:Z|[+-]\d{2}:\d{2})$/.test(value), {
    message: 'Timestamp must include a timezone offset or Z',
  });

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    content: z.array(itemSchema),
    totalElements: z.number().int(),
    totalPages: z.number().int(),
    page: z.number().int(),
    size: z.number().int(),
  });

export const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
export type IdParam = z.infer<typeof IdParamSchema>;

export const ErrorResponseSchema = z.object({
  statusCode: z.number().int(),
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
  requestId: z.string().optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
