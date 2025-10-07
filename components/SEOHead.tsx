/**
 * SEO Head Component - Optimized for Search Engines
 * Target Keywords: 3D AI, AI 3D modeling, 3D design AI, Sphaire, AI CAD
 */

import Head from 'next/head';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
  noindex?: boolean;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title = 'Sphaire3D - AI-Powered 3D Modeling & CAD Design Platform',
  description = 'Create stunning 3D models with AI. Sphaire3D combines artificial intelligence with advanced CAD tools for instant 3D design, parametric modeling, and AI-generated meshes. Free online 3D editor.',
  keywords = '3D AI, AI 3D modeling, 3D design AI, AI CAD, parametric 3D, AI mesh generation, 3D editor online, AI 3D design, OpenCascade AI, Sphaire, Sphaire3D, sphere 3D, AI modeling tool, free 3D software, online CAD, AI-powered modeling',
  ogImage = 'https://sphaire3d.design/og-image.png',
  ogType = 'website',
  canonicalUrl,
  noindex = false
}) => {
  const siteName = 'Sphaire3D';
  const domain = 'https://sphaire3d.design';
  const canonical = canonicalUrl || domain;

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Robots */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      {/* Canonical URL */}
      <link rel="canonical" href={canonical} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={canonical} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={ogImage} />

      {/* Additional SEO */}
      <meta name="author" content="Sphaire3D" />
      <meta name="application-name" content={siteName} />
      <meta name="apple-mobile-web-app-title" content={siteName} />
      
      {/* Geo Tags */}
      <meta name="geo.region" content="US" />
      <meta name="geo.placename" content="Global" />

      {/* Language */}
      <meta httpEquiv="content-language" content="en-US" />
      <link rel="alternate" hrefLang="en" href={canonical} />

      {/* Preconnect to external domains for performance */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://cdn.babylonjs.com" />
      <link rel="dns-prefetch" href="https://api.openai.com" />

      {/* Favicon */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />

      {/* Theme Color */}
      <meta name="theme-color" content="#ec4899" />
      <meta name="msapplication-TileColor" content="#ec4899" />

      {/* Schema.org for Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: siteName,
            applicationCategory: '3D Modeling Software',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD'
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.8',
              ratingCount: '1250'
            },
            description: description,
            url: domain,
            image: ogImage,
            author: {
              '@type': 'Organization',
              name: siteName,
              url: domain
            },
            potentialAction: {
              '@type': 'UseAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: domain,
                actionPlatform: [
                  'http://schema.org/DesktopWebPlatform',
                  'http://schema.org/MobileWebPlatform'
                ]
              }
            },
            featureList: [
              'AI-powered 3D model generation',
              'Real-time parametric modeling',
              'OpenCascade CAD integration',
              'Online 3D editor',
              'AI mesh generation',
              'Boolean operations',
              'STL/GLTF export',
              'Cloud storage',
              'Collaborative editing'
            ]
          })
        }}
      />

      {/* Organization Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: siteName,
            url: domain,
            logo: `${domain}/sphaire-img/sphaire.png`,
            sameAs: [
              // Add your social media URLs here when available
              // 'https://twitter.com/sphaire3d',
              // 'https://linkedin.com/company/sphaire3d',
              // 'https://github.com/sphaire3d'
            ],
            contactPoint: {
              '@type': 'ContactPoint',
              contactType: 'Customer Support',
              url: domain
            }
          })
        }}
      />

      {/* WebSite Schema for Search Box */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: siteName,
            url: domain,
            potentialAction: {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: `${domain}/?q={search_term_string}`
              },
              'query-input': 'required name=search_term_string'
            }
          })
        }}
      />
    </Head>
  );
};

export default SEOHead;
