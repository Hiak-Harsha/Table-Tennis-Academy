import { z } from 'zod'
import { sanitizeText, sanitizeOptionalText } from './sanitize'

/**
 * Standard 10-digit Indian mobile phone validation
 */
export const PhoneSchema = z
  .string()
  .trim()
  .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits.')

/**
 * Password validation: minimum 8 characters, maximum 100 characters
 */
export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(100, 'Password cannot exceed 100 characters.')

/**
 * Student Registration Schema
 */
export const StudentRegistrationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters.')
    .max(100, 'Full name cannot exceed 100 characters.')
    .transform(sanitizeText),
  batch: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], {
    message: 'Invalid batch type. Must be BEGINNER, INTERMEDIATE, or ADVANCED.',
  }),
  age: z.preprocess(
    (v) => (v === '' ? undefined : Number(v)),
    z
      .number({ message: 'Valid age is required.' })
      .int('Age must be an integer.')
      .min(5, 'Age must be at least 5 years.')
      .max(75, 'Age cannot exceed 75 years.')
  ),
  phone: PhoneSchema,
  password: PasswordSchema,
  coachName: z.string().optional().transform(sanitizeOptionalText),
  contactDetails: z.string().optional().transform(sanitizeOptionalText),
})

/**
 * Tournament Creation Schema
 */
export const TournamentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Tournament name must be at least 3 characters.')
    .max(150, 'Tournament name cannot exceed 150 characters.')
    .transform(sanitizeText),
  venue: z
    .string()
    .trim()
    .min(3, 'Venue must be at least 3 characters.')
    .max(150, 'Venue cannot exceed 150 characters.')
    .transform(sanitizeText),
  level: z
    .string()
    .trim()
    .min(2, 'Level required.')
    .max(50)
    .transform(sanitizeText),
  entryFee: z.preprocess(
    (v) => Number(v),
    z.number().min(0, 'Entry fee cannot be negative.')
  ),
  date: z.string().transform((v) => new Date(v)),
  eligibility: z.string().optional().transform(sanitizeOptionalText),
  maxPlayers: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number().int().min(2, 'Capacity must be at least 2 players.').optional()
  ),
  registrationDeadline: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
})

/**
 * Academy Fee Schema
 */
export const FeeSchema = z.object({
  studentId: z.string().uuid('Invalid Student ID format.'),
  amount: z.preprocess(
    (v) => Number(v),
    z.number().min(1, 'Amount must be a positive number.')
  ),
  dueDate: z.string().transform((v) => new Date(v)),
  interval: z
    .enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME'])
    .default('MONTHLY'),
})

/**
 * Chat Message Schema
 */
export const ChatMessageSchema = z.object({
  content: z
    .string()
    .max(1000, 'Message cannot exceed 1000 characters.')
    .optional()
    .transform(sanitizeOptionalText),
  category: z.enum(['GLOBAL', 'BATCH', 'PRIVATE']),
  batchType: z.string().optional().transform(sanitizeOptionalText),
  recipientId: z.string().optional().transform(sanitizeOptionalText),
})

/**
 * Broadcast Notification Schema
 */
export const BroadcastSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters.')
    .max(120, 'Title cannot exceed 120 characters.')
    .transform(sanitizeText),
  message: z
    .string()
    .trim()
    .min(2, 'Message must be at least 2 characters.')
    .max(2000, 'Message cannot exceed 2000 characters.')
    .transform(sanitizeText),
  category: z
    .enum(['GENERAL', 'TOURNAMENT', 'HOLIDAY', 'URGENT'])
    .default('GENERAL'),
})
