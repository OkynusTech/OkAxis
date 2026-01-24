import { Finding } from './types';

// Validation errors structure
export interface ValidationError {
    field: string;
    message: string;
}

// Validate finding based on its type
export function validateFinding(finding: Partial<Finding>): ValidationError[] {
    const errors: ValidationError[] = [];

    // Common required fields for all finding types
    if (!finding.title?.trim()) {
        errors.push({ field: 'title', message: 'Title is required' });
    }
    if (!finding.severity) {
        errors.push({ field: 'severity', message: 'Severity is required' });
    }
    if (!finding.description?.trim()) {
        errors.push({ field: 'description', message: 'Description is required' });
    }
    if (!finding.impact?.trim()) {
        errors.push({ field: 'impact', message: 'Impact is required' });
    }
    if (!finding.remediation?.trim()) {
        errors.push({ field: 'remediation', message: 'Remediation is required' });
    }
    if (!finding.status) {
        errors.push({ field: 'status', message: 'Status is required' });
    }
    if (!finding.findingType) {
        errors.push({ field: 'findingType', message: 'Finding type is required' });
        return errors; // Can't validate type-specific fields without knowing the type
    }

    // Type-specific validation
    switch (finding.findingType) {
        case 'penetration':
            validatePenetrationFinding(finding, errors);
            break;
        case 'infrastructure':
            validateInfrastructureFinding(finding, errors);
            break;
        case 'threat-model':
            validateThreatModelingFinding(finding, errors);
            break;
        case 'architecture':
            validateArchitectureFinding(finding, errors);
            break;
    }

    return errors;
}

function validatePenetrationFinding(finding: Partial<Finding>, errors: ValidationError[]): void {
    if (!finding.category?.trim()) {
        errors.push({ field: 'category', message: 'Category is required for penetration testing findings' });
    }
    if (!finding.affectedAssets || finding.affectedAssets.length === 0) {
        errors.push({ field: 'affectedAssets', message: 'At least one affected asset is required' });
    }
    if (finding.authenticationRequired === undefined) {
        errors.push({ field: 'authenticationRequired', message: 'Authentication requirement must be specified' });
    }
    if (!finding.stepsToReproduce?.trim()) {
        errors.push({ field: 'stepsToReproduce', message: 'Steps to reproduce are required' });
    }
}

function validateInfrastructureFinding(finding: Partial<Finding>, errors: ValidationError[]): void {
    // Infrastructure findings have all penetration testing requirements
    validatePenetrationFinding(finding, errors);

    // Additional infrastructure-specific validations (optional fields, so no hard requirements)
    // But we can add warnings or recommendations if needed
}

function validateThreatModelingFinding(finding: Partial<Finding>, errors: ValidationError[]): void {
    if (!finding.threatCategory) {
        errors.push({ field: 'threatCategory', message: 'STRIDE threat category is required' });
    }
    if (!finding.affectedComponent?.trim()) {
        errors.push({ field: 'affectedComponent', message: 'Affected component is required' });
    }
    if (!finding.attackScenario?.trim()) {
        errors.push({ field: 'attackScenario', message: 'Attack scenario is required' });
    }
    if (!finding.likelihood) {
        errors.push({ field: 'likelihood', message: 'Likelihood assessment is required' });
    }
    if (!finding.riskRating?.trim()) {
        errors.push({ field: 'riskRating', message: 'Risk rating is required' });
    }
    if (!finding.existingControls || finding.existingControls.length === 0) {
        errors.push({ field: 'existingControls', message: 'Existing controls must be documented (use "None" if applicable)' });
    }
    if (!finding.recommendedMitigations || finding.recommendedMitigations.length === 0) {
        errors.push({ field: 'recommendedMitigations', message: 'At least one recommended mitigation is required' });
    }
}

function validateArchitectureFinding(finding: Partial<Finding>, errors: ValidationError[]): void {
    if (!finding.designComponent?.trim()) {
        errors.push({ field: 'designComponent', message: 'Design component is required' });
    }
    if (!finding.concernCategory) {
        errors.push({ field: 'concernCategory', message: 'Architecture concern category is required' });
    }
    if (!finding.currentDesign?.trim()) {
        errors.push({ field: 'currentDesign', message: 'Current design description is required' });
    }
    if (!finding.riskAssessment?.trim()) {
        errors.push({ field: 'riskAssessment', message: 'Risk assessment is required' });
    }
    if (!finding.recommendedDesignChanges?.trim()) {
        errors.push({ field: 'recommendedDesignChanges', message: 'Recommended design changes are required' });
    }
    if (!finding.implementationPriority) {
        errors.push({ field: 'implementationPriority', message: 'Implementation priority is required' });
    }
}

// Helper to check if a finding is valid
export function isValidFinding(finding: Partial<Finding>): boolean {
    return validateFinding(finding).length === 0;
}

// Get required fields for a specific finding type
export function getRequiredFields(findingType: Finding['findingType']): string[] {
    const commonFields = ['title', 'severity', 'description', 'impact', 'remediation', 'status'];

    switch (findingType) {
        case 'penetration':
            return [...commonFields, 'category', 'affectedAssets', 'authenticationRequired', 'stepsToReproduce'];
        case 'infrastructure':
            return [...commonFields, 'category', 'affectedAssets', 'authenticationRequired', 'stepsToReproduce'];
        case 'threat-model':
            return [...commonFields, 'threatCategory', 'affectedComponent', 'attackScenario', 'likelihood', 'riskRating', 'existingControls', 'recommendedMitigations'];
        case 'architecture':
            return [...commonFields, 'designComponent', 'concernCategory', 'currentDesign', 'riskAssessment', 'recommendedDesignChanges', 'implementationPriority'];
        default:
            return commonFields;
    }
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
