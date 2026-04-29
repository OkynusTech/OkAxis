import { Finding } from './types';

// Validation errors structure
export interface ValidationError {
    field: string;
    message: string;
}

// Validate finding based on its type
export function validateFinding(finding: Partial<Finding>): ValidationError[] {
    const errors: ValidationError[] = [];

    // Simplify validation: only title is required
    if (!finding.title?.trim()) {
        errors.push({ field: 'title', message: 'Title is required' });
    }

    return errors;
}

function validatePenetrationFinding(finding: Partial<Finding>, errors: ValidationError[]): void {
    // Intentionally empty: removed strict validation
}

function validateInfrastructureFinding(finding: Partial<Finding>, errors: ValidationError[]): void {
    // Intentionally empty: removed strict validation
}

function validateThreatModelingFinding(finding: Partial<Finding>, errors: ValidationError[]): void {
     // Intentionally empty: removed strict validation
}

function validateArchitectureFinding(finding: Partial<Finding>, errors: ValidationError[]): void {
     // Intentionally empty: removed strict validation
}

// Helper to check if a finding is valid
export function isValidFinding(finding: Partial<Finding>): boolean {
    return validateFinding(finding).length === 0;
}

// Get required fields for a specific finding type
export function getRequiredFields(findingType: Finding['findingType']): string[] {
    return ['title'];
}

// Get relevant fields for a specific finding type (includes optional fields)
export function getRelevantFields(findingType: Finding['findingType']): string[] {
    const requiredFields = getRequiredFields(findingType);

    switch (findingType) {
        case 'penetration':
            return [...requiredFields, 'cvss', 'attackSurface', 'proofOfConcept', 'evidenceReferences', 'cweIds', 'owaspCategories'];
        case 'infrastructure':
            return [...requiredFields, 'cvss', 'attackSurface', 'proofOfConcept', 'evidenceReferences', 'cweIds', 'owaspCategories', 'assetType', 'cloudProvider', 'misconfigurationDetails', 'exploitabilityContext', 'blastRadius', 'privilegeLevelRequired'];
        case 'threat-model':
            return [...requiredFields, 'residualRisk'];
        case 'architecture':
            return requiredFields; // All fields are already included
        default:
            return requiredFields;
    }
}

// Clean finding object by removing irrelevant fields
export function cleanFindingForType(finding: Partial<Finding>): Partial<Finding> {
    if (!finding.findingType) return finding;

    const relevantFields = getRelevantFields(finding.findingType);
    const cleaned: Partial<Finding> = {
        findingType: finding.findingType,
    };

    // Copy only relevant fields
    relevantFields.forEach((field) => {
        if (finding[field as keyof Finding] !== undefined) {
            (cleaned as any)[field] = finding[field as keyof Finding];
        }
    });

    // Always include timestamps
    if (finding.discoveryDate) cleaned.discoveryDate = finding.discoveryDate;
    if (finding.createdAt) cleaned.createdAt = finding.createdAt;
    if (finding.updatedAt) cleaned.updatedAt = finding.updatedAt;
    if (finding.id) cleaned.id = finding.id;

    return cleaned;
}
