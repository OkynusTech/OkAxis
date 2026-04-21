/**
 * Sample Data Generator for Template Previews
 * 
 * Generates realistic security report data for template previews.
 * This ensures previews look like real consulting deliverables.
 * 
 * IMPORTANT: This is for PREVIEW ONLY. Never use in production reports.
 */

import {
    Engagement,
    ClientProfile,
    ServiceProviderProfile,
    Finding,
    AssessmentType,
    SeverityLevel,
    EvidenceFile
} from './types';
import { DEFAULT_LEGAL_DISCLAIMER } from './constants';

export interface SampleDataOptions {
    assessmentType: AssessmentType;
    clientName?: string;
    applicationName?: string;
    findingsCount?: number;
    includeSeverities?: SeverityLevel[];
}

/**
 * Generate a complete sample engagement with realistic data
 */
export function generateSampleEngagement(options: SampleDataOptions): {
    engagement: Engagement;
    client: ClientProfile;
    provider: ServiceProviderProfile;
} {
    const client = generateSampleClient(options.clientName);
    const provider = generateSampleProvider();
    const engagement = generateSampleEngagementData(options, client.id, provider.id);

    return { engagement, client, provider };
}

function generateSampleClient(name?: string): ClientProfile {
    return {
        id: 'sample-client-' + Date.now(),
        companyName: name || 'Acme Corporation',
        industry: 'Technology',
        techStack: 'React, Node.js, PostgreSQL',
        description: 'Leading SaaS provider specializing in business automation',
        riskTolerance: 'Medium',
        preferredReportDepth: 'Detailed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

function generateSampleProvider(): ServiceProviderProfile {
    return {
        id: 'sample-provider-' + Date.now(),
        companyName: 'OkynusTech Security',
        contactEmail: 'security@okynus.tech',
        contactPhone: '+1 (555) 123-4567',
        website: 'https://okynus.tech',
        address: '123 Security Boulevard, Cyber City, CC 12345',
        legalDisclaimer: DEFAULT_LEGAL_DISCLAIMER,
        defaultSeverityModel: 'CVSS',
        defaultRemediationTone: 'Balanced',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

function generateSampleEngagementData(
    options: SampleDataOptions,
    clientId: string,
    providerId: string
): Engagement {
    const count = options.findingsCount || 3;
    const findings = generateSampleFindings(options.assessmentType, count, options.includeSeverities);

    return {
        id: 'sample-engagement-' + Date.now(),
        serviceProviderId: providerId,
        clientId: clientId,
        applicationId: 'sample-app-' + Date.now(),
        engineerIds: [],
        metadata: {
            engagementName: options.applicationName || 'Web Application Security Assessment',
            assessmentType: options.assessmentType,
            startDate: '2025-01-15',
            endDate: '2025-01-25',
            testingMethodology: 'OWASP Testing Guide v4.2',
            scope: [
                'Web Application (https://app.example.com)',
                'API Endpoints (/api/v1/*)',
                'Authentication and Authorization Mechanisms',
                'Data Storage and Encryption'
            ],
            outOfScope: [
                'Mobile Applications',
                'Internal Network Infrastructure',
                'Third-party Integrations',
                'Physical Security'
            ],
            assumptions: [
                'Test credentials provided for all user roles',
                'Testing performed in staging environment',
                'Source code access not required'
            ],
            limitations: [
                'Production systems excluded from testing',
                'Denial of Service testing not performed',
                'Social engineering testing not in scope'
            ]
        },
        findings: findings,
        reportConfig: {
            // sections: undefined - Let ReportRenderer use template sections
            teamMembers: [
                {
                    name: 'Alex Rivera',
                    role: 'Lead Security Engineer',
                    email: 'alex.rivera@okynus.tech',
                    qualifications: 'OSCP, CISSP'
                },
                {
                    name: 'Sarah Chen',
                    role: 'Penetration Tester',
                    email: 'sarah.chen@okynus.tech',
                    qualifications: 'CEH, GWAPT'
                }
            ]
        } as any,
        templateId: 'enterprise',
        status: 'Completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

/**
 * Generate realistic sample findings based on assessment type
 */
function generateSampleFindings(
    type: AssessmentType,
    count: number,
    includeSeverities?: SeverityLevel[]
): Finding[] {
    const generators: Record<string, () => Finding[]> = {
        'Penetration Testing': generatePenetrationFindings,
        'Threat Modeling': generateThreatModelingFindings,
        'Architecture Review': generateArchitectureFindings,
        'Security Review': generatePenetrationFindings, // Similar to pentest
        'Cloud Security Assessment': generateCloudFindings,
        'Network Security Assessment': generateNetworkFindings,
        'Mobile Security Assessment': generatePenetrationFindings
    };

    const generator = generators[type] || generatePenetrationFindings;
    const allFindings = generator();

    // Filter by severity if specified
    let filtered = includeSeverities
        ? allFindings.filter((f: Finding) => includeSeverities.includes(f.severity))
        : allFindings;

    // Take requested count
    return filtered.slice(0, count);
}

function generatePenetrationFindings(): Finding[] {
    return [
        {
            id: 'finding-1',
            findingType: 'penetration',
            title: 'SQL Injection in User Search Functionality',
            severity: 'High',
            category: 'Injection',
            description: 'The user search endpoint at /api/users/search does not properly sanitize user input, allowing SQL injection attacks. An attacker can manipulate the search parameter to execute arbitrary SQL commands against the backend database.',
            impact: 'An attacker could extract sensitive data from the database, including user credentials, personal information, and financial records. In severe cases, the attacker could modify or delete database contents, leading to data integrity issues.',
            remediation: 'Implement parameterized queries or prepared statements for all database interactions. Use an ORM framework that handles SQL escaping automatically. Add input validation to reject special characters in search queries. Implement least-privilege database access controls.',
            status: 'Open',
            cvss: {
                version: '3.1',
                vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
                baseScore: 9.1
            },
            affectedAssets: ['/api/users/search', 'User Database'],
            attackSurface: 'Web',
            authenticationRequired: false,
            stepsToReproduce: `1. Navigate to the user search page
2. Enter the following payload in the search field: ' OR '1'='1
3. Observe that all users are returned regardless of search criteria
4. Use UNION-based injection to extract data: ' UNION SELECT username, password FROM users--`,
            proofOfConcept: `GET /api/users/search?q=' UNION SELECT username,password,email FROM users--
Response: Returns all usernames and password hashes from the database`,
            cweIds: ['CWE-89'],
            owaspCategories: ['A03:2021 - Injection'],
            discoveryDate: '2025-01-20',
            createdAt: '2025-01-20T10:00:00Z',
            updatedAt: '2025-01-20T10:00:00Z'
        },
        {
            id: 'finding-2',
            findingType: 'penetration',
            title: 'Broken Access Control in Project Management API',
            severity: 'High',
            category: 'Broken Access Control',
            description: 'The project management API endpoints do not properly validate user permissions before allowing access to project data. Users can access and modify projects they are not authorized to view by manipulating project IDs in API requests.',
            impact: 'Unauthorized users can view sensitive project information, including confidential business data, financial projections, and intellectual property. Attackers could also modify or delete projects, causing business disruption.',
            remediation: 'Implement server-side authorization checks for all API endpoints. Verify that the authenticated user has the appropriate permissions before returning project data. Use object-level authorization middleware. Implement attribute-based access control (ABAC) for fine-grained permissions.',
            status: 'Open',
            cvss: {
                version: '3.1',
                vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N',
                baseScore: 8.1
            },
            affectedAssets: ['/api/projects/{id}', '/api/projects/{id}/update'],
            attackSurface: 'API',
            authenticationRequired: true,
            stepsToReproduce: `1. Log in as a standard user (user1@example.com)
2. Note your authorized project IDs (e.g., project-123)
3. Send GET request to /api/projects/project-456 (belonging to another user)
4. Observe that project data is returned without authorization check
5. Send PUT request to modify the unauthorized project`,
            proofOfConcept: `# As user1 (only authorized for project-123)
GET /api/projects/project-456
Authorization: Bearer <user1_token>

# Successfully returns project-456 data despite lack of authorization`,
            cweIds: ['CWE-862'],
            owaspCategories: ['A01:2021 - Broken Access Control'],
            discoveryDate: '2025-01-21',
            createdAt: '2025-01-21T11:00:00Z',
            updatedAt: '2025-01-21T11:00:00Z'
        },
        {
            id: 'finding-3',
            findingType: 'penetration',
            title: 'Insecure File Upload Allows Arbitrary File Execution',
            severity: 'Medium',
            category: 'File Upload',
            description: 'The document upload feature does not adequately validate file types and content. While basic extension filtering is in place, it can be bypassed by manipulating the MIME type or using double extensions.',
            impact: 'An attacker could upload malicious files (e.g., web shells, executable scripts) that could be executed on the server or delivered to other users. This could lead to remote code execution, stored XSS, or malware distribution.',
            remediation: 'Implement strict allow-list based file type validation using both extension and content (magic bytes) checking. Store uploaded files outside the web root. Generate random filenames to prevent direct access. Scan files with antivirus software before storage. Set appropriate Content-Type headers when serving files.',
            status: 'Open',
            cvss: {
                version: '3.1',
                vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:U/C:L/I:L/A:L',
                baseScore: 6.5
            },
            affectedAssets: ['/api/documents/upload'],
            attackSurface: 'Web',
            authenticationRequired: true,
            stepsToReproduce: `1. Log in as a standard user
2. Navigate to document upload page
3. Create a file named malicious.php.jpg with PHP code
4. Upload the file
5. Access the file directly at /uploads/malicious.php.jpg
6. Observe PHP code execution`,
            cweIds: ['CWE-434'],
            owaspCategories: ['A04:2021 - Insecure Design'],
            discoveryDate: '2025-01-22',
            createdAt: '2025-01-22T14:00:00Z',
            updatedAt: '2025-01-22T14:00:00Z'
        }
    ];
}

function generateThreatModelingFindings(): Finding[] {
    return [
        {
            id: 'finding-tm-1',
            findingType: 'threat-model',
            title: 'Insufficient Authentication for Admin API',
            severity: 'High',
            threatCategory: 'Spoofing',
            affectedComponent: 'Admin API Gateway',
            description: 'The administrative API endpoints rely solely on session cookies without additional verification mechanisms such as MFA or IP whitelisting.',
            impact: 'If an attacker compromises a session cookie (e.g., via XSS or session hijacking), they could gain administrative access to the entire system.',
            attackScenario: 'An attacker uses a stolen session cookie to access admin endpoints, bypassing authentication and gaining elevated privileges.',
            likelihood: 'Medium',
            riskRating: 'High',
            existingControls: ['HTTPS encryption', 'Session timeout after 30 minutes'],
            recommendedMitigations: ['Implement MFA for admin access', 'Add IP whitelisting', 'Implement admin session binding to user-agent and IP'],
            remediation: 'Add multi-factor authentication for all administrative functions. Implement IP whitelisting for admin access. Bind admin sessions to client IP and user-agent strings.',
            residualRisk: 'Medium (with MFA and IP whitelisting)',
            status: 'Open',
            discoveryDate: '2025-01-20',
            createdAt: '2025-01-20T10:00:00Z',
            updatedAt: '2025-01-20T10:00:00Z'
        },
        {
            id: 'finding-tm-2',
            findingType: 'threat-model',
            title: 'Data Tampering Risk in Payment Processing',
            severity: 'Critical',
            threatCategory: 'Tampering',
            affectedComponent: 'Payment Processing Service',
            description: 'Payment amount and recipient data are transmitted from client to server without cryptographic signing or integrity checks.',
            impact: 'Attackers could modify payment amounts or redirect funds to unauthorized accounts.',
            attackScenario: 'An attacker intercepts a payment request and modifies the amount field from $10 to $0.01 before it reaches the server.',
            likelihood: 'Low',
            riskRating: 'Critical',
            existingControls: ['TLS encryption in transit'],
            recommendedMitigations: ['Implement HMAC signatures for payment data', 'Server-side amount calculation', 'Two-factor transaction approval'],
            remediation: 'Implement cryptographic signatures (HMAC) for all payment-related data. Perform amount calculations server-side. Require two-factor approval for transactions above threshold.',
            residualRisk: 'Low (with HMAC and server-side validation)',
            status: 'Open',
            discoveryDate: '2025-01-21',
            createdAt: '2025-01-21T11:00:00Z',
            updatedAt: '2025-01-21T11:00:00Z'
        }
    ];
}

function generateArchitectureFindings(): Finding[] {
    return [
        {
            id: 'finding-arch-1',
            findingType: 'architecture',
            title: 'Monolithic Database Design Limits Scalability',
            severity: 'Medium',
            concernCategory: 'Scalability',
            designComponent: 'Database Architecture',
            description: 'The application uses a single monolithic database for all services, creating a scalability bottleneck and single point of failure.',
            currentDesign: 'All microservices connect to a single PostgreSQL database with shared schemas.',
            riskAssessment: 'As the application scales, database connections will become saturated. A database failure would bring down all services simultaneously.',
            recommendedDesignChanges: 'Implement database-per-service pattern. Use read replicas for query-heavy services. Consider event sourcing for audit trails.',
            impact: 'System cannot scale beyond current database capacity. High risk of cascading failures.',
            remediation: 'Migrate to database-per-service architecture. Implement read replicas. Use connection pooling and caching to reduce database load.',
            implementationPriority: 'High',
            status: 'Open',
            discoveryDate: '2025-01-20',
            createdAt: '2025-01-20T10:00:00Z',
            updatedAt: '2025-01-20T10:00:00Z'
        }
    ];
}

function generateCloudFindings(): Finding[] {
    return [
        {
            id: 'finding-cloud-1',
            findingType: 'infrastructure',
            title: 'S3 Bucket Lacks Encryption at Rest',
            severity: 'High',
            assetType: 'Storage',
            cloudProvider: 'AWS',
            category: 'Data Protection',
            description: 'The S3 bucket storing customer documents does not have server-side encryption enabled, exposing sensitive data at rest.',
            impact: 'If AWS infrastructure is compromised or improperly configured backups are exposed, customer data could be accessed in plaintext.',
            misconfigurationDetails: 'Bucket policy allows public read access. No default encryption configured. Versioning disabled.',
            remediation: 'Enable S3 default encryption (SSE-S3 or SSE-KMS). Remove public access. Enable versioning and MFA delete. Implement bucket policies restricting access.',
            exploitabilityContext: 'Requires AWS account compromise or misconfigured IAM policies',
            blastRadius: 'All customer documents across multiple tenants',
            privilegeLevelRequired: 'AWS account read access',
            status: 'Open',
            discoveryDate: '2025-01-22',
            createdAt: '2025-01-22T10:00:00Z',
            updatedAt: '2025-01-22T10:00:00Z'
        }
    ];
}

function generateNetworkFindings(): Finding[] {
    return generateCloudFindings(); // Similar structure
}

/**
 * Generate a realistic sample evidence file (placeholder)
 */
export function generateSampleEvidence(): EvidenceFile {
    return {
        id: 'evidence-1',
        name: 'Screenshot_2026-01-15_202818.png',
        type: 'image/png',
        size: 45678,
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // 1x1 placeholder
        uploadedAt: '2025-01-22T15:30:00Z'
    };
}
