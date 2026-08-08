export const DEFAULT_HERO_IMAGE_URL = "/iphone/iphone.jpg";

export const HERO_IMAGE_POSITIONS = ["center", "top", "bottom", "left", "right"] as const;
export type HeroImagePosition = (typeof HERO_IMAGE_POSITIONS)[number];

export interface HeroBannerContent {
    badge1Label: string;
    badge1Title: string;
    badge1Subtitle: string;
    badge2Eyebrow: string;
    badge2Title: string;
    badge2IconAlt: string;
    heading1: string;
    heading2: string;
    pillText: string;
    subText: string;
    priceMonthly: string;
    priceMonthlyUnit: string;
    priceYearly: string;
    priceYearlyUnit: string;
    heroImageAlt: string;
    heroImagePosition: HeroImagePosition;
}

export interface HeroBannerView extends HeroBannerContent {
    heroImageUrl: string;
    badge2IconUrl: string | null;
    hasCustomHeroImage: boolean;
    hasCustomBadge2Icon: boolean;
}

export const HERO_BANNER_DEFAULTS: HeroBannerContent = {
    badge1Label: "NARAVICH",
    badge1Title: "Mobile Care",
    badge1Subtitle: "บริการดูแลมือถือครบวงจร",
    badge2Eyebrow: "มั่นใจด้วยมาตรฐาน",
    badge2Title: "ระดับโลก",
    badge2IconAlt: "Apple Care",
    heading1: "มั่นใจด้วยมาตรฐาน",
    heading2: "ระดับโลก",
    pillText: "คุ้มครองอุบัติเหตุไม่จำกัดครั้ง คุ้มครองทั้งภายในและภายนอก",
    subText: "รับบริการที่ Apple Store และ Apple Service Provider ทั่วโลก",
    priceMonthly: "179.-",
    priceMonthlyUnit: "/เดือน*",
    priceYearly: "1,990.-",
    priceYearlyUnit: "/ปี*",
    heroImageAlt: "โทรศัพท์มือถือที่ได้รับความคุ้มครองจาก NaravichCare",
    heroImagePosition: "center",
};

export const HERO_BANNER_DEFAULT_VIEW: HeroBannerView = {
    ...HERO_BANNER_DEFAULTS,
    heroImageUrl: DEFAULT_HERO_IMAGE_URL,
    badge2IconUrl: null,
    hasCustomHeroImage: false,
    hasCustomBadge2Icon: false,
};

export const HERO_BANNER_TEXT_FIELDS = [
    "badge1Label",
    "badge1Title",
    "badge1Subtitle",
    "badge2Eyebrow",
    "badge2Title",
    "badge2IconAlt",
    "heading1",
    "heading2",
    "pillText",
    "subText",
    "priceMonthly",
    "priceMonthlyUnit",
    "priceYearly",
    "priceYearlyUnit",
    "heroImageAlt",
] as const satisfies readonly (keyof HeroBannerContent)[];

type StoredAssetView = {
    relativePath?: string;
    version?: string;
};

type HeroBannerSource = Partial<HeroBannerContent> & {
    heroImage?: StoredAssetView | null;
    badge2Icon?: StoredAssetView | null;
};

function assetUrl(kind: "heroImage" | "badge2Icon", asset?: StoredAssetView | null): string | null {
    if (!asset?.relativePath || !asset.version) return kind === "heroImage" ? DEFAULT_HERO_IMAGE_URL : null;
    return `/api/hero-banner/image/${kind}?v=${encodeURIComponent(asset.version)}`;
}

export function serializeHeroBanner(source?: HeroBannerSource | null): HeroBannerView {
    const raw = source || {};
    const content = { ...HERO_BANNER_DEFAULTS };
    for (const field of HERO_BANNER_TEXT_FIELDS) {
        if (typeof raw[field] === "string") Object.assign(content, { [field]: raw[field] });
    }
    if (raw.heroImagePosition && HERO_IMAGE_POSITIONS.includes(raw.heroImagePosition)) {
        content.heroImagePosition = raw.heroImagePosition;
    }
    return {
        ...content,
        heroImageUrl: assetUrl("heroImage", raw.heroImage) || DEFAULT_HERO_IMAGE_URL,
        badge2IconUrl: assetUrl("badge2Icon", raw.badge2Icon),
        hasCustomHeroImage: Boolean(raw.heroImage?.relativePath),
        hasCustomBadge2Icon: Boolean(raw.badge2Icon?.relativePath),
    };
}
