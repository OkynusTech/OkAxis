import {
    ReportTemplate,
    ValidationResult,
    ValidationSeverity,
    BrandingConfig,
    ReportSection,
    FindingsPresentationConfig,
    VisualStyleConfig
} from './types';
import { BRAND_COLOR_PALETTE, APPROVED_FONTS } from './constants';

/**
 * Template Validation and Guardrails Engine
 * 
 * Enforcement Rules:
 * - critical → block save
 * - error → block save
 * - warning → allow save but surface clearly
 * - none → allow save silently
 */

// Validate that a color ID exists in the approved palette
export const validateColorId = (colorId: string | undefined): boolean => {
    if (!colorId) return true; // Optional field

    const paletteValues = Object.values(BRAND_COLOR_PALETTE);
    return paletteValues.some(color => color.id === colorId);
};

// Validate that font ID exists in approved fonts
export const validateFontId = (fontId: string | undefined): boolean => {
    if (!fontId) return true; // Optional field

    return APPROVED_FONTS.some(font => font.id === fontId);
};

// Validate branding configuration
export const validateBrandingConfig = (branding?: BrandingConfig): { errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!branding) return { errors, warnings };

    // Phase 1 Constraint: Only palette colors allowed (no arbitrary hex)
    if (branding.primaryColor && !validateColorId(branding.primaryColor)) {
        errors.push(`Primary color must be from approved palette. Got: ${branding.primaryColor}`);
    }

    if (branding.secondaryColor && !validateColorId(branding.secondaryColor)) {
        errors.push(`Secondary color must be from approved palette. Got: ${branding.secondaryColor}`);
    }

    if (branding.accentColor && !validateColorId(branding.accentColor)) {
        errors.push(`Accent color must be from approved palette. Got: ${branding.accentColor}`);
    }

    // Validate logo URLs (basic check)
    if (branding.clientLogoUrl && !branding.clientLogoUrl.match(/\.(png|jpg|jpeg|svg)$/i)) {
        warnings.push('Client logo should be PNG, JPG, or SVG format');
    }

    if (branding.providerLogoUrl && !branding.providerLogoUrl.match(/\.(png|jpg|jpeg|svg)$/i)) {
        warnings.push('Provider logo should be PNG, JPG, or SVG format');
    }

    // Validate text lengths to prevent layout breaking
    if (branding.headerText && branding.headerText.length > 100) {
        warnings.push('Header text exceeds 100 characters and may cause layout issues');
    }

    if (branding.footerText && branding.footerText.length > 100) {
        warnings.push('Footer text exceeds 100 characters and may cause layout issues');
    }

    return { errors, warnings };
};

// Validate section configuration
export const validateSectionOrder = (sections: ReportSection[]): { errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!sections || sections.length === 0) {
        errors.push('Template must have at least one section');
        return { errors, warnings };
    }

    // Guardrail: Minimum 3 visible sections required
    const visibleSections = sections.filter(s => s.isVisible);
    if (visibleSections.length < 3) {
        errors.push('Template must have at least 3 visible sections');
    }

    // Guardrail: Cover page must be first if present and visible
    const coverPage = sections.find(s => s.id === 'coverPage');
    if (coverPage && coverPage.isVisible && sections[0].id !== 'coverPage') {
        errors.push('Cover page must be the first section when visible');
    }

    // Guardrail: Cover page must be locked if present
    if (coverPage && !coverPage.isLocked) {
        warnings.push('Cover page should be locked to prevent accidental removal');
    }

    // Guardrail: Must show findings somehow
    const hasFindingsSection = sections.some(s =>
        (s.id === 'detailedFindings' || s.id === 'findingsSummaryTable') && s.isVisible
    );
    if (!hasFindingsSection) {
        errors.push('Template must include at least one visible findings section');
    }

    return { errors, warnings };
};

// Validate visual style configuration (flexible mode only)
export const validateVisualStyle = (visualStyle?: VisualStyleConfig): { errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!visualStyle) return { errors, warnings };

    // Validate font family
    if (!validateFontId(visualStyle.fontFamily)) {
        errors.push(`Font family must be from approved list. Got: ${visualStyle.fontFamily}`);
    }

    // Warn about compact spacing for readability
    if (visualStyle.spacingDensity === 'compact') {
        warnings.push('Compact spacing may reduce readability in long reports');
    }

    if (visualStyle.headingScale === 'compact') {
        warnings.push('Compact heading scale may impact visual hierarchy');
    }

    return { errors, warnings };
};

// Check print/PDF stability
export const checkPrintStability = (template: ReportTemplate): { errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Flexible templates with many customizations need extra checks
    if (template.strictnessLevel === 'flexible') {
        warnings.push('Flexible template: Review print preview carefully before finalizing');

        // Check for risky combinations
        if (template.visualStyle?.spacingDensity === 'compact' &&
            template.visualStyle?.headingScale === 'compact') {
            warnings.push('Compact spacing + compact headings may impact print readability');
        }

        if (template.findingsPresentation?.layout === 'narrative' &&
            template.sections.filter(s => s.isVisible).length > 10) {
            warnings.push('Narrative layout with many sections may cause pagination issues');
        }
    }

    // Check for excessive custom sections
    const customSections = template.sections.filter(s => s.type === 'custom');
    if (customSections.length > 5) {
        warnings.push('More than 5 custom sections may impact report flow and pagination');
    }

    // Check for very long custom content
    customSections.forEach(section => {
        if (section.content && section.content.length > 5000) {
            warnings.push(`Custom section "${section.title}" is very long and may cause layout issues`);
        }
    });

    return { errors, warnings };
};

// Check professional output quality
export const checkProfessionalQuality = (template: ReportTemplate): { errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for missing key components
    if (!template.name || template.name.trim() === '') {
        errors.push('Template must have a name');
    }

    if (!template.description || template.description.trim() === '') {
        warnings.push('Template should have a description for clarity');
    }

    // Check for executive summary in business-focused templates
    if (template.businessLanguageLevel === 'High') {
        const hasExecSummary = template.sections.some(s =>
            s.id === 'executiveSummary' && s.isVisible
        );
        if (!hasExecSummary) {
            warnings.push('High business language templates should include Executive Summary');
        }
    }

    // Check for technical sections in technical templates
    if (template.technicalVerbosity === 'High') {
        const hasMethodology = template.sections.some(s =>
            s.id === 'scopeAndMethodology' && s.isVisible
        );
        if (!hasMethodology) {
            warnings.push('High technical verbosity templates should include Scope and Methodology');
        }
    }

    return { errors, warnings };
};

// Strictness-aware validation
export const validateStrictnessConstraints = (template: ReportTemplate): { errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (template.strictnessLevel === 'standard') {
        // Standard mode should not have advanced configurations
        if (template.findingsPresentation) {
            errors.push('Findings presentation settings are only available in flexible mode');
        }

        if (template.visualStyle) {
            errors.push('Visual style settings are only available in flexible mode');
        }

        if (template.contentControl?.customBlocksAllowed) {
            warnings.push('Custom blocks in standard mode may impact consistency');
        }
    }

    if (template.strictnessLevel === 'flexible') {
        // Flexible mode: ensure user understands implications
        warnings.push('Using flexible mode: Advanced changes may affect layout stability');
    }

    return { errors, warnings };
};

// Comprehensive template validation
export const validateTemplateCompleteness = (template: ReportTemplate): ValidationResult => {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    // Validate branding
    const brandingValidation = validateBrandingConfig(template.branding);
    allErrors.push(...brandingValidation.errors);
    allWarnings.push(...brandingValidation.warnings);

    // Validate sections
    const sectionValidation = validateSectionOrder(template.sections);
    allErrors.push(...sectionValidation.errors);
    allWarnings.push(...sectionValidation.warnings);

    // Validate visual style (if present)
    const visualValidation = validateVisualStyle(template.visualStyle);
    allErrors.push(...visualValidation.errors);
    allWarnings.push(...visualValidation.warnings);

    // Check print stability
    const printValidation = checkPrintStability(template);
    allErrors.push(...printValidation.errors);
    allWarnings.push(...printValidation.warnings);

    // Check professional quality
    const qualityValidation = checkProfessionalQuality(template);
    allErrors.push(...qualityValidation.errors);
    allWarnings.push(...qualityValidation.warnings);

    // Check strictness constraints
    const strictnessValidation = validateStrictnessConstraints(template);
    allErrors.push(...strictnessValidation.errors);
    allWarnings.push(...strictnessValidation.warnings);

    // Determine severity
    let severity: ValidationSeverity = 'none';
    if (allErrors.length > 0) {
        // Any error is blocking
        severity = 'critical';
    } else if (allWarnings.length > 0) {
        severity = 'warning';
    }

    return {
        valid: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings,
        severity
    };
};

// Helper to get color hex from palette ID
export const getColorHex = (colorId: string | undefined): string => {
    if (!colorId) return '#1F2937'; // Default fallback

    const paletteValues = Object.values(BRAND_COLOR_PALETTE);
    const color = paletteValues.find(c => c.id === colorId);
    return color?.hex || '#1F2937';
};

// Helper to get font fallback string
export const getFontFallback = (fontId: string | undefined): string => {
    if (!fontId) return APPROVED_FONTS[0].fallback;

    const font = APPROVED_FONTS.find(f => f.id === fontId);
    return font?.fallback || APPROVED_FONTS[0].fallback;
};
