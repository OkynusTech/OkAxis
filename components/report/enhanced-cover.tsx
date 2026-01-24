
interface EnhancedCoverProps {
    assessmentType: string;
    clientName: string;
    engagementName: string;
    dateRange: string;
    providerName: string;
    providerContact?: string;
    providerWebsite?: string;
    clientLogoUrl?: string;
    providerLogoUrl?: string;
}

/**
 * Enhanced cover page with logo support
 * Minimal, professional, consulting-grade
 * No decorative elements - institutional feel
 */
export function EnhancedCover({
    assessmentType,
    clientName,
    engagementName,
    dateRange,
    providerName,
    providerContact,
    providerWebsite,
    clientLogoUrl,
    providerLogoUrl,
}: EnhancedCoverProps) {
    return (
        <div className="page-break-after mb-20 text-center flex flex-col justify-between min-h-[800px]">
            {/* Client Logo - Primary Position */}
            {clientLogoUrl && (
                <div className="mt-16 mb-12 flex justify-center">
                    <img
                        src={clientLogoUrl}
                        alt={`${clientName} logo`}
                        className="max-h-20 max-w-xs object-contain"
                    />
                </div>
            )}

            {/* Main Content - Centered */}
            <div className="flex-1 flex flex-col justify-center">
                <div className="mb-12">
                    <h1 className="mb-6 text-3xl font-semibold text-gray-900">{assessmentType}</h1>
                    <h2 className="text-2xl font-medium text-gray-700">{clientName}</h2>
                </div>

                <div className="mb-12">
                    <p className="text-lg font-medium text-gray-800">{engagementName}</p>
                    <p className="mt-3 text-sm text-gray-600">{dateRange}</p>
                </div>
            </div>

            {/* Provider Info - Bottom */}
            <div className="mb-16">
                {/* Horizontal divider */}
                <div className="mb-8 mx-auto w-32 border-t border-gray-300" />

                {/* Provider logo if available */}
                {providerLogoUrl && (
                    <div className="mb-6 flex justify-center">
                        <img
                            src={providerLogoUrl}
                            alt={`${providerName} logo`}
                            className="max-h-12 max-w-48 object-contain opacity-90"
                        />
                    </div>
                )}

                {/* Provider text info */}
                <p className="text-xl font-medium text-gray-900">{providerName}</p>
                {providerContact && (
                    <p className="mt-2 text-sm text-gray-600">{providerContact}</p>
                )}
                {providerWebsite && (
                    <p className="text-sm text-gray-600">{providerWebsite}</p>
                )}
            </div>
        </div>
    );
}
