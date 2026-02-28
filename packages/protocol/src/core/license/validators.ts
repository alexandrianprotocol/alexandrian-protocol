import { License, LicenseTerms, ValidationResult } from './types.js';
import { LICENSE_PRESETS } from './constants.js';

export class LicenseValidator {
  /**
   * Check if license terms are internally consistent
   */
  static validateTerms(terms: LicenseTerms): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Rule 1: ShareAlike requires derivatives to be allowed
    if (terms.shareAlike && !terms.derivatives) {
      errors.push('ShareAlike requires derivatives to be allowed');
    }

    // Rule 2: Non-commercial + commercial can't both be set (sanity)
    // (they're the same field in our model, so this is just a check)

    // Rule 3: Commercial use without attribution is unusual
    if (terms.commercialUse && !terms.attribution) {
      warnings.push('Commercial use without attribution may cause legal issues');
    }

    // Rule 4: No derivatives + shareAlike doesn't make sense
    if (!terms.derivatives && terms.shareAlike) {
      errors.push('ShareAlike requires derivatives to be allowed');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Validate a complete license object
   */
  static validateLicense(license: License): ValidationResult {
    const errors: string[] = [];

    if (license.type !== 'PROPRIETARY' && LICENSE_PRESETS[license.type]) {
      const preset = LICENSE_PRESETS[license.type];
      const mismatches: string[] = [];

      if (preset.commercialUse !== license.terms.commercialUse) {
        mismatches.push('commercialUse');
      }
      if (preset.attribution !== license.terms.attribution) {
        mismatches.push('attribution');
      }
      if (preset.shareAlike !== license.terms.shareAlike) {
        mismatches.push('shareAlike');
      }
      if (preset.derivatives !== license.terms.derivatives) {
        mismatches.push('derivatives');
      }

      if (mismatches.length > 0) {
        errors.push(`License terms deviate from ${license.type} standard: ${mismatches.join(', ')}`);
      }
    }

    const termsValidation = this.validateTerms(license.terms);
    errors.push(...termsValidation.errors);

    if (license.terms.commercialUse) {
      const payout = license.metadata?.payout;
      const hasPayoutAddress = Boolean(payout?.address);
      const hasPrice = typeof payout?.price === 'number' && payout.price >= 0;
      if (!hasPayoutAddress && !hasPrice) {
        errors.push('Commercial use requires a payout address or price');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: termsValidation.warnings
    };
  }

  /**
   * Validate optional license input
   */
  static validateMaybeLicense(license?: License): ValidationResult {
    if (!license) {
      return {
        valid: false,
        errors: ['License is required']
      };
    }
    return this.validateLicense(license);
  }

  /**
   * Check if two licenses are compatible
   */
  static areCompatible(source: License, target: License): boolean {
    // You can't impose stricter terms than the source allows
    if (target.terms.derivatives && !source.terms.derivatives) return false;
    if (target.terms.commercialUse && !source.terms.commercialUse) return false;

    // ShareAlike requires target to also be ShareAlike
    if (source.terms.shareAlike && !target.terms.shareAlike) return false;

    // Attribution must be preserved if required
    if (source.terms.attribution && !target.terms.attribution) return false;

    return true;
  }

  /**
   * Get the strictest license from a set (for combined works)
   */
  static getStrictestLicense(licenses: License[]): License {
    const combinedTerms: LicenseTerms = {
      commercialUse: true,
      attribution: false,
      shareAlike: false,
      derivatives: true
    };
    const attributionTexts: string[] = [];

    for (const license of licenses) {
      if (!license.terms.commercialUse) {
        combinedTerms.commercialUse = false;
      }

      if (license.terms.attribution) {
        combinedTerms.attribution = true;
      }

      if (license.terms.shareAlike) {
        combinedTerms.shareAlike = true;
      }

      if (!license.terms.derivatives) {
        combinedTerms.derivatives = false;
      }

      if (license.metadata?.attributionText) {
        attributionTexts.push(license.metadata.attributionText);
      }
    }

    return {
      type: 'PROPRIETARY',
      terms: combinedTerms,
      metadata: {
        derivedFrom: licenses.map(l => l.type),
        attributionTexts: attributionTexts.length > 0 ? attributionTexts : undefined
      }
    };
  }
}
