
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
    // Brand theming
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    coverTextColor?: string;
    // Cover imagery
    coverBackgroundImageUrl?: string;
    coverGraphicUrl?: string;
    coverGraphicPosition?: 'top' | 'center' | 'bottom' | 'background';
    // Cover text overrides
    coverTitle?: string;
    coverSubtitle?: string;
    coverFooterText?: string;
}

/**
 * Enhanced cover page with full brand theming
 * Supports: background images, cover graphics, brand colors, logo placement
 * Professional, consulting-grade output for print and PDF
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
    primaryColor,
    secondaryColor,
    accentColor,
    coverTextColor,
    coverBackgroundImageUrl,
    coverGraphicUrl,
    coverGraphicPosition = 'center',
    coverTitle,
    coverSubtitle,
    coverFooterText,
}: EnhancedCoverProps) {
    const hasBgImage = !!coverBackgroundImageUrl;
    const hasGraphic = !!coverGraphicUrl;

    // Determine text colors — if there's a dark background image, default to white
    const textPrimary = coverTextColor || (hasBgImage ? '#ffffff' : '#111827');
    const textSecondary = coverTextColor
        ? `${coverTextColor}cc` // slightly transparent
        : (hasBgImage ? '#ffffffcc' : '#4B5563');
    const textMuted = coverTextColor
        ? `${coverTextColor}99`
        : (hasBgImage ? '#ffffff99' : '#6B7280');

    // Accent line color
    const dividerColor = accentColor || primaryColor || (hasBgImage ? '#ffffff40' : '#D1D5DB');

    return (
        <div
            className="page-break-after mb-20 text-center flex flex-col justify-between min-h-[800px] relative overflow-hidden"
            style={{
                backgroundColor: hasBgImage ? undefined : (primaryColor ? `${primaryColor}08` : undefined),
            }}
        >
            {/* Background Image Layer */}
            {hasBgImage && (
                <div className="absolute inset-0 z-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={coverBackgroundImageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                    />
                    {/* Dark overlay for text readability */}
                    <div className="absolute inset-0 bg-black/50" />
                </div>
            )}

            {/* Cover Graphic — background position */}
            {hasGraphic && coverGraphicPosition === 'background' && (
                <div className="absolute inset-0 z-0 flex items-center justify-center opacity-10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={coverGraphicUrl}
                        alt=""
                        className="max-w-[80%] max-h-[80%] object-contain"
                    />
                </div>
            )}

            {/* Content Layer */}
            <div className="relative z-10 flex flex-col justify-between min-h-[800px]">
                {/* Top Section: Client Logo + Top Graphic */}
                <div className="mt-16">
                    {clientLogoUrl && (
                        <div className="mb-8 flex justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={clientLogoUrl}
                                alt={`${clientName} logo`}
                                className="max-h-20 max-w-xs object-contain"
                            />
                        </div>
                    )}

                    {/* Cover Graphic — top position */}
                    {hasGraphic && coverGraphicPosition === 'top' && (
                        <div className="mb-8 flex justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={coverGraphicUrl}
                                alt=""
                                className="max-h-40 max-w-md object-contain"
                            />
                        </div>
                    )}

                    {/* Accent top bar */}
                    {primaryColor && !hasBgImage && (
                        <div
                            className="mx-auto mb-8 h-1 w-24 rounded-full"
                            style={{ backgroundColor: primaryColor }}
                        />
                    )}
                </div>

                {/* Center Section: Main Content + Center Graphic */}
                <div className="flex-1 flex flex-col justify-center px-8">
                    {/* Cover Graphic — center position (above title) */}
                    {hasGraphic && coverGraphicPosition === 'center' && (
                        <div className="mb-10 flex justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={coverGraphicUrl}
                                alt=""
                                className="max-h-48 max-w-lg object-contain"
                            />
                        </div>
                    )}

                    <div className="mb-12">
                        <h1
                            className="mb-6 text-3xl font-semibold"
                            style={{ color: textPrimary }}
                        >
                            {coverTitle || assessmentType}
                        </h1>
                        <h2
                            className="text-2xl font-medium"
                            style={{ color: textSecondary }}
                        >
                            {coverSubtitle || clientName}
                        </h2>
                    </div>

                    <div className="mb-12">
                        <p className="text-lg font-medium" style={{ color: textPrimary }}>
                            {engagementName}
                        </p>
                        <p className="mt-3 text-sm" style={{ color: textMuted }}>
                            {dateRange}
                        </p>
                    </div>
                </div>

                {/* Bottom Section: Provider Info + Bottom Graphic */}
                <div className="mb-16">
                    {/* Cover Graphic — bottom position */}
                    {hasGraphic && coverGraphicPosition === 'bottom' && (
                        <div className="mb-8 flex justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={coverGraphicUrl}
                                alt=""
                                className="max-h-32 max-w-sm object-contain"
                            />
                        </div>
                    )}

                    {/* Divider */}
                    <div
                        className="mb-8 mx-auto w-32 border-t"
                        style={{ borderColor: dividerColor }}
                    />

                    {/* Provider logo */}
                    {providerLogoUrl && (
                        <div className="mb-6 flex justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={providerLogoUrl}
                                alt={`${providerName} logo`}
                                className="max-h-12 max-w-48 object-contain"
                                style={{ opacity: hasBgImage ? 1 : 0.9 }}
                            />
                        </div>
                    )}

                    <p className="text-xl font-medium" style={{ color: textPrimary }}>
                        {providerName}
                    </p>
                    {providerContact && (
                        <p className="mt-2 text-sm" style={{ color: textMuted }}>
                            {providerContact}
                        </p>
                    )}
                    {providerWebsite && (
                        <p className="text-sm" style={{ color: textMuted }}>
                            {providerWebsite}
                        </p>
                    )}
                    {coverFooterText && (
                        <p className="mt-8 text-xs" style={{ color: textMuted }}>
                            {coverFooterText}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
