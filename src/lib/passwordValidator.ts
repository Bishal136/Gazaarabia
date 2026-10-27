/**
 * Password Validation & Security
 * Enforces strong yet user-friendly password requirements
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  REQUIRE_LETTER: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_UPPERCASE: false,
  REQUIRE_LOWERCASE: false,
  REQUIRE_SPECIAL_CHARS: false,
};

const LETTER_REGEX = /[a-zA-Z]/;
const NUMBERS_REGEX = /[0-9]/;

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one letter (a-z, A-Z)
 * - At least one number (0-9)
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Check minimum length
  if (!password || password.length < PASSWORD_REQUIREMENTS.MIN_LENGTH) {
    errors.push(
      `Password must be at least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters long`
    );
  }

  // Check for letters
  if (PASSWORD_REQUIREMENTS.REQUIRE_LETTER && !LETTER_REGEX.test(password)) {
    errors.push("Password must contain at least one letter");
  }

  // Check for numbers
  if (PASSWORD_REQUIREMENTS.REQUIRE_NUMBERS && !NUMBERS_REGEX.test(password)) {
    errors.push("Password must contain at least one number (0-9)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get human-readable password requirements message
 */
export function getPasswordRequirementsMessage(): string {
  return "At least 8 characters with a mix of letters and numbers";
}

/**
 * Example passwords
 */
export const PASSWORD_EXAMPLES = {
  valid: [
    "SecurePass123!",
    "MyP@ssw0rd2024",
    "Password123",
    "Bishal2026",
    "StrongPwd2024",
  ],
  invalid: [
    "weak", // Too short
    "onlyletters", // Missing numbers
    "12345678", // Missing letters
  ],
};
