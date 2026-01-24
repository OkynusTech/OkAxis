import { AppState, ClientProfile, Engagement, ServiceProviderProfile, ReportTemplate, ValidationResult, Application, Engineer, Artifact, ArtifactScope, ArtifactType } from './types';
import { REPORT_TEMPLATES as SYSTEM_TEMPLATES } from './constants';
import { validateTemplateCompleteness } from './template-validation';

const STORAGE_KEY = 'security_report_builder_data';

// Initialize default state
const getDefaultState = (): AppState => ({
    serviceProviders: [],
    clients: [],
    applications: [],
    engineers: [],
    artifacts: [],
    engagements: [],
    templates: [],
});

// Load data from localStorage
export const loadState = (): AppState => {
    try {
        const serialized = localStorage.getItem(STORAGE_KEY);
        if (serialized === null) {
            return getDefaultState();
        }
        const parsed = JSON.parse(serialized);

        // Run migration to V2 if needed
        const migrated = migrateToV2(parsed);

        // Save migrated state if migration occurred
        if (migrated !== parsed) {
            saveState(migrated);
        }

        return migrated;
    } catch (err) {
        console.error('Error loading state from localStorage:', err);
        return getDefaultState();
    }
};

// Save data to localStorage
export const saveState = (state: AppState): void => {
    try {
        const serialized = JSON.stringify(state);
        localStorage.setItem(STORAGE_KEY, serialized);
    } catch (err) {
        console.error('Error saving state to localStorage:', err);
    }
};

// Service Provider CRUD operations
export const createServiceProvider = (provider: Omit<ServiceProviderProfile, 'id' | 'createdAt' | 'updatedAt'>): ServiceProviderProfile => {
    const now = new Date().toISOString();
    const newProvider: ServiceProviderProfile = {
        ...provider,
        id: `sp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
    };

    const state = loadState();
    state.serviceProviders.push(newProvider);
    saveState(state);

    return newProvider;
};

export const updateServiceProvider = (id: string, updates: Partial<ServiceProviderProfile>): ServiceProviderProfile | null => {
    const state = loadState();
    const index = state.serviceProviders.findIndex(sp => sp.id === id);

    if (index === -1) return null;

    state.serviceProviders[index] = {
        ...state.serviceProviders[index],
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date().toISOString(),
    };

    saveState(state);
    return state.serviceProviders[index];
};

export const deleteServiceProvider = (id: string): boolean => {
    const state = loadState();
    const initialLength = state.serviceProviders.length;
    state.serviceProviders = state.serviceProviders.filter(sp => sp.id !== id);

    if (state.serviceProviders.length < initialLength) {
        saveState(state);
        return true;
    }
    return false;
};

export const getServiceProvider = (id: string): ServiceProviderProfile | null => {
    const state = loadState();
    return state.serviceProviders.find(sp => sp.id === id) || null;
};

export const getAllServiceProviders = (): ServiceProviderProfile[] => {
    const state = loadState();
    return state.serviceProviders;
};

// Client CRUD operations
export const createClient = (client: Omit<ClientProfile, 'id' | 'createdAt' | 'updatedAt'>): ClientProfile => {
    const now = new Date().toISOString();
    const newClient: ClientProfile = {
        ...client,
        id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
    };

    const state = loadState();
    state.clients.push(newClient);
    saveState(state);

    return newClient;
};

export const updateClient = (id: string, updates: Partial<ClientProfile>): ClientProfile | null => {
    const state = loadState();
    const index = state.clients.findIndex(c => c.id === id);

    if (index === -1) return null;

    state.clients[index] = {
        ...state.clients[index],
        ...updates,
        id,
        updatedAt: new Date().toISOString(),
    };

    saveState(state);
    return state.clients[index];
};

export const deleteClient = (id: string): boolean => {
    const state = loadState();
    const initialLength = state.clients.length;

    // Remove client
    state.clients = state.clients.filter(c => c.id !== id);

    if (state.clients.length < initialLength) {
        // Cascading delete: Remove applications
        const appsToDelete = state.applications.filter(a => a.clientId === id).map(a => a.id);
        state.applications = state.applications.filter(a => a.clientId !== id);

        // Cascading delete: Remove engagements
        state.engagements = state.engagements.filter(e => e.clientId !== id);

        // Cascading delete: Remove artifacts (client-scoped and application-scoped for deleted apps)
        state.artifacts = state.artifacts.filter(art => {
            if (art.scope === 'client' && art.scopeId === id) return false;
            if (art.scope === 'application' && appsToDelete.includes(art.scopeId)) return false;
            return true;
        });

        saveState(state);
        return true;
    }
    return false;
};

export const getClient = (id: string): ClientProfile | null => {
    const state = loadState();
    return state.clients.find(c => c.id === id) || null;
};

export const getAllClients = (): ClientProfile[] => {
    const state = loadState();
    return state.clients;
};

// ============================================================================
// Data Migration - V1 to V2
// ============================================================================

/**
 * Migrate existing data to V2 schema with new entities
 */
const migrateToV2 = (state: any): AppState => {
    // If already migrated, return as is
    if (state.applications && state.engineers && state.artifacts) {
        return state as AppState;
    }

    console.log('Migrating data to V2 schema...');

    // Initialize new entity arrays
    const applications: Application[] = state.applications || [];
    const engineers: Engineer[] = state.engineers || [];
    const artifacts: Artifact[] = state.artifacts || [];

    // Create default applications for existing engagements
    if (state.engagements && state.engagements.length > 0) {
        const createdApps = new Map<string, string>(); // clientId -> applicationId

        state.engagements.forEach((engagement: any) => {
            // Skip if already has applicationId
            if (engagement.applicationId) return;

            const clientId = engagement.clientId;

            // Create default application if not exists for this client
            if (!createdApps.has(clientId)) {
                const client = state.clients?.find((c: ClientProfile) => c.id === clientId);
                const appId = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const newApp: Application = {
                    id: appId,
                    clientId: clientId,
                    name: client ? `${client.companyName} - Default Application` : 'Default Application',
                    description: 'Auto-created during migration from V1',
                    createdAt: engagement.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                applications.push(newApp);
                createdApps.set(clientId, appId);
            }

            // Link engagement to application
            engagement.applicationId = createdApps.get(clientId);
            engagement.engineerIds = engagement.engineerIds || [];
        });
    }

    return {
        ...state,
        applications,
        engineers,
        artifacts,
    } as AppState;
};

// ============================================================================
// Application CRUD operations
// ============================================================================

export const createApplication = (app: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>): Application => {
    const now = new Date().toISOString();
    const newApp: Application = {
        ...app,
        id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
    };

    const state = loadState();
    if (!state.applications) state.applications = [];
    state.applications.push(newApp);
    saveState(state);

    return newApp;
};

export const updateApplication = (id: string, updates: Partial<Application>): Application | null => {
    const state = loadState();
    if (!state.applications) return null;

    const index = state.applications.findIndex(a => a.id === id);
    if (index === -1) return null;

    state.applications[index] = {
        ...state.applications[index],
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date().toISOString(),
    };

    saveState(state);
    return state.applications[index];
};

export const deleteApplication = (id: string): boolean => {
    const state = loadState();
    if (!state.applications) return false;

    const initialLength = state.applications.length;
    state.applications = state.applications.filter(a => a.id !== id);

    if (state.applications.length < initialLength) {
        saveState(state);
        return true;
    }
    return false;
};

export const getApplication = (id: string): Application | null => {
    const state = loadState();
    if (!state.applications) return null;
    return state.applications.find(a => a.id === id) || null;
};

export const getAllApplications = (): Application[] => {
    const state = loadState();
    return state.applications || [];
};

export const getApplicationsByClient = (clientId: string): Application[] => {
    const state = loadState();
    if (!state.applications) return [];
    return state.applications.filter(a => a.clientId === clientId);
};

// ============================================================================
// Engineer CRUD operations
// ============================================================================

export const createEngineer = (engineer: Omit<Engineer, 'id' | 'createdAt' | 'updatedAt'>): Engineer => {
    const now = new Date().toISOString();
    const newEngineer: Engineer = {
        ...engineer,
        id: `eng_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        exposure: engineer.exposure || {
            vulnerabilityClasses: [],
            applicationTypes: [],
            authModels: [],
            totalEngagements: 0,
        },
        createdAt: now,
        updatedAt: now,
    };

    const state = loadState();
    if (!state.engineers) state.engineers = [];
    state.engineers.push(newEngineer);
    saveState(state);

    return newEngineer;
};

export const updateEngineer = (id: string, updates: Partial<Engineer>): Engineer | null => {
    const state = loadState();
    if (!state.engineers) return null;

    const index = state.engineers.findIndex(e => e.id === id);
    if (index === -1) return null;

    state.engineers[index] = {
        ...state.engineers[index],
        ...updates,
        id,
        updatedAt: new Date().toISOString(),
    };

    saveState(state);
    return state.engineers[index];
};

export const updateEngineerExposure = (
    engineerId: string,
    newExposure: {
        vulnerabilityClass?: string;
        applicationType?: string;
        authModel?: string;
    }
): Engineer | null => {
    const engineer = getEngineer(engineerId);
    if (!engineer) return null;

    const exposure = { ...engineer.exposure };

    if (newExposure.vulnerabilityClass && !exposure.vulnerabilityClasses.includes(newExposure.vulnerabilityClass)) {
        exposure.vulnerabilityClasses.push(newExposure.vulnerabilityClass);
    }
    if (newExposure.applicationType && !exposure.applicationTypes.includes(newExposure.applicationType)) {
        exposure.applicationTypes.push(newExposure.applicationType);
    }
    if (newExposure.authModel && !exposure.authModels.includes(newExposure.authModel)) {
        exposure.authModels.push(newExposure.authModel);
    }

    return updateEngineer(engineerId, { exposure });
};

export const deleteEngineer = (id: string): boolean => {
    const state = loadState();
    if (!state.engineers) return false;

    const initialLength = state.engineers.length;
    state.engineers = state.engineers.filter(e => e.id !== id);

    if (state.engineers.length < initialLength) {
        saveState(state);
        return true;
    }
    return false;
};

export const getEngineer = (id: string): Engineer | null => {
    const state = loadState();
    if (!state.engineers) return null;
    return state.engineers.find(e => e.id === id) || null;
};

export const getAllEngineers = (): Engineer[] => {
    const state = loadState();
    return state.engineers || [];
};

// ============================================================================
// Artifact CRUD operations
// ============================================================================

export const createArtifact = (artifact: Omit<Artifact, 'id' | 'uploadedAt' | 'updatedAt'>): Artifact => {
    const now = new Date().toISOString();
    const newArtifact: Artifact = {
        ...artifact,
        id: `art_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        uploadedAt: now,
        updatedAt: now,
    };

    const state = loadState();
    if (!state.artifacts) state.artifacts = [];
    state.artifacts.push(newArtifact);
    saveState(state);

    // NEW: Queue for embedding in background
    if (typeof window !== 'undefined') {
        import('./embedding-worker').then(({ queueArtifactForEmbedding }) => {
            queueArtifactForEmbedding(newArtifact).catch(err => {
                console.error('Failed to queue artifact for embedding:', err);
            });
        });
    }

    return newArtifact;
};

export const updateArtifact = (id: string, updates: Partial<Artifact>): Artifact | null => {
    const state = loadState();
    if (!state.artifacts) return null;

    const index = state.artifacts.findIndex(a => a.id === id);
    if (index === -1) return null;

    state.artifacts[index] = {
        ...state.artifacts[index],
        ...updates,
        id,
        updatedAt: new Date().toISOString(),
    };

    saveState(state);

    // NEW: Queue for re-embedding if content changed
    const updated = state.artifacts[index];
    if (typeof window !== 'undefined' && updates.content !== undefined) {
        import('./embedding-worker').then(({ queueArtifactForEmbedding }) => {
            queueArtifactForEmbedding(updated).catch(err => {
                console.error('Failed to queue artifact for embedding:', err);
            });
        });
    }

    return updated;
};

export const deleteArtifact = (id: string): boolean => {
    const state = loadState();
    if (!state.artifacts) return false;

    const initialLength = state.artifacts.length;
    state.artifacts = state.artifacts.filter(a => a.id !== id);

    if (state.artifacts.length < initialLength) {
        saveState(state);

        // NEW: Remove from vector store
        if (typeof window !== 'undefined') {
            import('./vector-store').then(({ getVectorStore }) => {
                getVectorStore().then(store => {
                    store.remove(id);
                    store.persist().catch(err => {
                        console.error('Failed to persist vector store after deletion:', err);
                    });
                });
            }).catch(err => {
                console.error('Failed to remove artifact from vector store:', err);
            });
        }

        return true;
    }
    return false;
};

export const getArtifact = (id: string): Artifact | null => {
    const state = loadState();
    if (!state.artifacts) return null;
    return state.artifacts.find(a => a.id === id) || null;
};

export const getAllArtifacts = (): Artifact[] => {
    const state = loadState();
    return state.artifacts || [];
};

export const getArtifactsByScope = (scope: ArtifactScope, scopeId: string): Artifact[] => {
    const state = loadState();
    if (!state.artifacts) return [];
    return state.artifacts.filter(a => a.scope === scope && a.scopeId === scopeId);
};

export const getArtifactsByType = (type: ArtifactType): Artifact[] => {
    const state = loadState();
    if (!state.artifacts) return [];
    return state.artifacts.filter(a => a.type === type);
};

// ============================================================================
// Engagement CRUD operations
// ============================================================================

export const createEngagement = (engagement: Omit<Engagement, 'id' | 'createdAt' | 'updatedAt'>): Engagement => {
    const now = new Date().toISOString();
    const newEngagement: Engagement = {
        ...engagement,
        id: `eng_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
    };

    const state = loadState();
    state.engagements.push(newEngagement);
    saveState(state);

    return newEngagement;
};

export const updateEngagement = (id: string, updates: Partial<Engagement>): Engagement | null => {
    const state = loadState();
    const index = state.engagements.findIndex(e => e.id === id);

    if (index === -1) return null;

    state.engagements[index] = {
        ...state.engagements[index],
        ...updates,
        id,
        updatedAt: new Date().toISOString(),
    };

    saveState(state);
    return state.engagements[index];
};

export const deleteEngagement = (id: string): boolean => {
    const state = loadState();
    const initialLength = state.engagements.length;
    state.engagements = state.engagements.filter(e => e.id !== id);

    if (state.engagements.length < initialLength) {
        saveState(state);
        return true;
    }
    return false;
};

export const getEngagement = (id: string): Engagement | null => {
    const state = loadState();
    return state.engagements.find(e => e.id === id) || null;
};

export const getAllEngagements = (): Engagement[] => {
    const state = loadState();
    return state.engagements;
};

// Template CRUD operations
export const createTemplate = (template: Omit<ReportTemplate, 'id'>): ReportTemplate | ValidationResult => {
    // Validate template before creation
    const validation = validateTemplateCompleteness(template as ReportTemplate);

    // Block save on critical or error severity
    if (validation.severity === 'critical' || validation.severity === 'error') {
        return validation; // Return validation result instead of template
    }

    // Generate a custom ID
    const newTemplate: ReportTemplate = {
        ...template,
        id: `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    const state = loadState();
    // Ensure templates array exists (migration)
    if (!state.templates) state.templates = [];

    state.templates.push(newTemplate);
    saveState(state);

    return newTemplate;
};

export const updateTemplate = (id: string, updates: Partial<ReportTemplate>): ReportTemplate | ValidationResult | null => {
    // Cannot update system templates
    if (SYSTEM_TEMPLATES[id]) {
        console.warn("Cannot update system template directly. Clone it first.");
        return null;
    }

    const state = loadState();
    if (!state.templates) return null;

    const index = state.templates.findIndex(t => t.id === id);
    if (index === -1) return null;

    const updatedTemplate = {
        ...state.templates[index],
        ...updates,
        id, // Ensure ID doesn't change
    };

    // Validate before saving
    const validation = validateTemplateCompleteness(updatedTemplate);

    // Block save on critical or error severity
    if (validation.severity === 'critical' || validation.severity === 'error') {
        return validation; // Return validation result instead of template
    }

    state.templates[index] = updatedTemplate;
    saveState(state);
    return state.templates[index];
};

export const deleteTemplate = (id: string): boolean => {
    if (SYSTEM_TEMPLATES[id]) return false; // Cannot delete system templates

    const state = loadState();
    if (!state.templates) return false;

    const initialLength = state.templates.length;
    state.templates = state.templates.filter(t => t.id !== id);

    if (state.templates.length < initialLength) {
        saveState(state);
        return true;
    }
    return false;
};

export const getTemplate = (id: string): ReportTemplate | undefined => {
    // Check system templates first
    if (SYSTEM_TEMPLATES[id]) return SYSTEM_TEMPLATES[id];

    // Check user templates
    const state = loadState();
    return state.templates?.find(t => t.id === id);
};

export const getAllTemplates = (): ReportTemplate[] => {
    const state = loadState();
    const userTemplates = state.templates || [];
    const systemTemplates = Object.values(SYSTEM_TEMPLATES);
    return [...systemTemplates, ...userTemplates];
};

// Export/Import functionality
export const exportData = (): string => {
    const state = loadState();
    return JSON.stringify(state, null, 2);
};

export const importData = (jsonData: string): boolean => {
    try {
        const data = JSON.parse(jsonData) as AppState;

        // Basic validation
        if (!data.serviceProviders || !data.clients || !data.engagements) {
            throw new Error('Invalid data structure');
        }

        saveState(data);
        return true;
    } catch (err) {
        console.error('Error importing data:', err);
        return false;
    }
};

// Clear all data
export const clearAllData = (): void => {
    localStorage.removeItem(STORAGE_KEY);
};
