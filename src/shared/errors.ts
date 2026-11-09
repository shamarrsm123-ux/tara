// Typed errors with machine codes (09 §9, 06 §9). Messages are for developers and never contain content
// (stress values, names, numbers); the UI maps codes to voiced plain-language messages.

export const ERROR_CODES = [
  'BLE_UNAVAILABLE',
  'BLE_PERMISSION_DENIED',
  'BLE_NOT_FOUND',
  'BLE_INSECURE_LINK',
  'BLE_DISCONNECTED',
  'BLE_PROTOCOL_VERSION',
  'PACKET_INVALID',
  'CALIBRATION_INCOMPLETE',
  'COOLING_LOCKED_BATTERY',
  'COOLING_LOCKED_REST',
  'STORE_LOCKED',
  'STORE_CORRUPT',
  'WIPING',
  'CONTACT_LIMIT',
  'VALIDATION_ERROR',
  'SMS_UNAVAILABLE',
  'APP_LOCK_UNAVAILABLE',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class TaraError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string = code) {
    super(message);
    this.name = 'TaraError';
    this.code = code;
  }
}

export function isTaraError(value: unknown, code?: ErrorCode): value is TaraError {
  return value instanceof TaraError && (code === undefined || value.code === code);
}
