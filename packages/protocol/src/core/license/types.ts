export type LicenseType =
  | 'CC-BY-4.0'
  | 'CC-BY-SA-4.0'
  | 'CC-BY-NC-4.0'
  | 'CC0-1.0'
  | 'MIT'
  | 'GPL-3.0'
  | 'PROPRIETARY';

export interface LicenseTerms {
  commercialUse: boolean;
  attribution: boolean;
  shareAlike: boolean;
  derivatives: boolean;
  jurisdiction?: string;
  expiry?: Date;
}

export interface LicensePayout {
  address?: string;
  price?: number;
  currency?: string;
}

export interface LicenseMetadata {
  derivedFrom?: LicenseType[];
  payout?: LicensePayout;
  attributionText?: string;
  attributionTexts?: string[];
  [key: string]: unknown;
}

export interface License {
  type: LicenseType;
  terms: LicenseTerms;
  metadata?: LicenseMetadata;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}
