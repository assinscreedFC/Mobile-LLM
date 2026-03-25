import { validate, loginSchema, signUpSchema, ValidationError } from '../../utils/validation';

describe('validation', () => {
  describe('loginSchema', () => {
    it('accepts valid email and password', () => {
      const result = validate(loginSchema, { email: 'user@test.com', password: 'abcdef' });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ email: 'user@test.com', password: 'abcdef' });
    });

    it('rejects empty email', () => {
      const result = validate(loginSchema, { email: '', password: 'abcdef' });
      expect(result.success).toBe(false);
      expect(result.errors?.email).toBe('emailRequired');
    });

    it('rejects invalid email format', () => {
      const result = validate(loginSchema, { email: 'not-an-email', password: 'abcdef' });
      expect(result.success).toBe(false);
      expect(result.errors?.email).toBe('invalidEmail');
    });

    it('rejects password shorter than 6 characters', () => {
      const result = validate(loginSchema, { email: 'user@test.com', password: 'abc' });
      expect(result.success).toBe(false);
      expect(result.errors?.password).toBe('passwordTooShort');
    });
  });

  describe('signUpSchema', () => {
    it('accepts valid name, email and password', () => {
      const result = validate(signUpSchema, {
        name: 'Alice',
        email: 'alice@test.com',
        password: 'Abcdef1',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
      const result = validate(signUpSchema, {
        name: '',
        email: 'a@b.com',
        password: 'Abcdef1',
      });
      expect(result.success).toBe(false);
      expect(result.errors?.name).toBe('nameRequired');
    });

    it('rejects single-char name', () => {
      const result = validate(signUpSchema, {
        name: 'A',
        email: 'a@b.com',
        password: 'Abcdef1',
      });
      expect(result.success).toBe(false);
      expect(result.errors?.name).toBe('nameTooShort');
    });

    it('rejects password without uppercase', () => {
      const result = validate(signUpSchema, {
        name: 'Alice',
        email: 'a@b.com',
        password: 'abcdef1',
      });
      expect(result.success).toBe(false);
      expect(result.errors?.password).toBe('passwordNeedsUppercase');
    });

    it('rejects password without number', () => {
      const result = validate(signUpSchema, {
        name: 'Alice',
        email: 'a@b.com',
        password: 'Abcdefg',
      });
      expect(result.success).toBe(false);
      expect(result.errors?.password).toBe('passwordNeedsNumber');
    });
  });

  describe('ValidationError', () => {
    it('has correct properties', () => {
      const err = new ValidationError('emailRequired', 'email');
      expect(err.message).toBe('emailRequired');
      expect(err.field).toBe('email');
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.name).toBe('ValidationError');
      expect(err).toBeInstanceOf(Error);
    });
  });
});
