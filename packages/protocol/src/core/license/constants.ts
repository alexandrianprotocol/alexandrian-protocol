import { LicenseTerms, LicenseType } from './types.js';

export const LICENSE_PRESETS: Record<LicenseType, LicenseTerms> = {
  'CC-BY-4.0': {
    commercialUse: true,
    attribution: true,
    shareAlike: false,
    derivatives: true
  },
  'CC-BY-SA-4.0': {
    commercialUse: true,
    attribution: true,
    shareAlike: true,
    derivatives: true
  },
  'CC-BY-NC-4.0': {
    commercialUse: false,
    attribution: true,
    shareAlike: false,
    derivatives: true
  },
  'CC0-1.0': {
    commercialUse: true,
    attribution: false,
    shareAlike: false,
    derivatives: true
  },
  MIT: {
    commercialUse: true,
    attribution: true,
    shareAlike: false,
    derivatives: true
  },
  'GPL-3.0': {
    commercialUse: true,
    attribution: true,
    shareAlike: true,
    derivatives: true
  },
  PROPRIETARY: {
    commercialUse: false,
    attribution: false,
    shareAlike: false,
    derivatives: false
  }
};

export const LICENSE_COMPATIBILITY_MATRIX: Record<string, string[]> = {
  'CC-BY-4.0': ['CC-BY-4.0', 'CC-BY-SA-4.0', 'CC-BY-NC-4.0', 'MIT'],
  'CC-BY-SA-4.0': ['CC-BY-SA-4.0'],
  MIT: ['MIT', 'GPL-3.0'],
  'GPL-3.0': ['GPL-3.0']
};
