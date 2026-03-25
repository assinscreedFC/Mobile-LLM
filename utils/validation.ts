/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string()
    .min(1, 'emailRequired')
    .email('invalidEmail'),
  password: z.string()
    .min(6, 'passwordTooShort'),
});

export const signUpSchema = z.object({
  name: z.string()
    .min(1, 'nameRequired')
    .min(2, 'nameTooShort'),
  email: z.string()
    .min(1, 'emailRequired')
    .email('invalidEmail'),
  password: z.string()
    .min(6, 'passwordTooShort')
    .regex(/[A-Z]/, 'passwordNeedsUppercase')
    .regex(/[0-9]/, 'passwordNeedsNumber'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
}

export class ValidationError extends Error {
  code = 'VALIDATION_ERROR' as const;
  field: string;
  constructor(message: string, field: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0]?.toString() ?? 'unknown';
    if (!(field in errors)) {
      errors[field] = issue.message;
    }
  }
  return { success: false, errors };
}
