/**
 * 2 ROTI - ENTERPRISE SEO EVALUATION SUITE
 * 
 * Validates 100% compliance with Google Webmaster, Schema.org, Open Graph,
 * Twitter Cards, Sitelinks, XML Sitemaps, and Robots Exclusion Protocol.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const INDEX_HTML_PATH = path.join(ROOT_DIR, 'website', 'index.html');
const ROBOTS_PATH = path.join(ROOT_DIR, 'website', 'public', 'robots.txt');
const SITEMAP_PATH = path.join(ROOT_DIR, 'website', 'public', 'sitemap.xml');
const WEBSITE_PUBLIC_DIR = path.join(ROOT_DIR, 'website', 'public');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const results = [];

function assert(condition, category, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    results.push({ status: 'PASS', category, testName, details });
    console.log(`  \x1b[32m✔ PASS\x1b[0m [${category}] ${testName} ${details ? `(${details})` : ''}`);
  } else {
    failedTests++;
    results.push({ status: 'FAIL', category, testName, details });
    console.error(`  \x1b[31m✖ FAIL\x1b[0m [${category}] ${testName} ${details ? `(${details})` : ''}`);
  }
}

console.log('\n========================================================================');
console.log('        2 ROTI – ENTERPRISE SEO & SITELINKS EVALUATION SUITE');
console.log('========================================================================\n');

// ----------------------------------------------------------------------
// 1. EVALUATE WEBSITE/INDEX.HTML
// ----------------------------------------------------------------------
console.log('\x1b[36m▶ 1. HTML Document Structure & Technical Standards\x1b[0m');
assert(fs.existsSync(INDEX_HTML_PATH), 'HTML', 'index.html exists');
const html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

assert(/<!DOCTYPE\s+html>/i.test(html), 'HTML', 'Valid HTML5 DOCTYPE declared');
assert(/<html[^>]*lang=["']en["']/i.test(html), 'HTML', 'HTML language attribute is set to "en"');
assert(/<meta[^>]*charset=["']UTF-8["']/i.test(html), 'HTML', 'Charset UTF-8 meta tag present');
assert(/<meta[^>]*name=["']viewport["'][^>]*content=["'][^"']*width=device-width/i.test(html), 'HTML', 'Mobile responsive viewport tag present');

// ----------------------------------------------------------------------
// 2. PRIMARY SEO METADATA
// ----------------------------------------------------------------------
console.log('\n\x1b[36m▶ 2. Primary SEO Meta Tags & Snippet Optimization\x1b[0m');

// Title Tag
const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
assert(Boolean(titleMatch), 'Meta', '<title> tag exists');
if (titleMatch) {
  const title = titleMatch[1].replace(/&amp;/g, '&');
  const titleLen = title.length;
  assert(titleLen >= 30 && titleLen <= 75, 'Meta', 'Title length optimal for SERP (30-75 chars)', `Length: ${titleLen} chars: "${title}"`);
  assert(/2\s*Roti/i.test(title), 'Meta', 'Title contains brand name "2 Roti"');
  assert(/Food Delivery/i.test(title), 'Meta', 'Title contains primary keyword "Food Delivery"');
}

// Meta Description
const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
assert(Boolean(descMatch), 'Meta', '<meta name="description"> exists');
if (descMatch) {
  const desc = descMatch[1].replace(/&amp;/g, '&');
  const descLen = desc.length;
  assert(descLen >= 120 && descLen <= 170, 'Meta', 'Meta description optimal snippet length (120-170 chars)', `Length: ${descLen} chars`);
  assert(/Thalis|Biryani|Roti|Campus/i.test(desc), 'Meta', 'Description includes high-converting food keywords');
}

// Meta Keywords & Author
const kwMatch = html.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']*)["']/i);
assert(Boolean(kwMatch), 'Meta', '<meta name="keywords"> tag exists');
assert(/<meta\s+name=["']author["']/i.test(html), 'Meta', '<meta name="author"> tag present');

// Robots Directives
const robotsMetaMatch = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']*)["']/i);
assert(Boolean(robotsMetaMatch), 'Meta', '<meta name="robots"> tag exists');
if (robotsMetaMatch) {
  const robots = robotsMetaMatch[1];
  assert(robots.includes('index') && robots.includes('follow'), 'Meta', 'Robots directive allows index and follow');
  assert(robots.includes('max-image-preview:large'), 'Meta', 'Robots directive specifies max-image-preview:large for rich snippets');
}

// Canonical Tag
const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i);
assert(Boolean(canonicalMatch), 'Meta', 'Canonical tag <link rel="canonical"> present');
if (canonicalMatch) {
  assert(canonicalMatch[1] === 'https://2roti.com/', 'Meta', 'Canonical URL points to exact apex domain', canonicalMatch[1]);
}

// ----------------------------------------------------------------------
// 3. OPEN GRAPH (FACEBOOK / WHATSAPP / LINKEDIN)
// ----------------------------------------------------------------------
console.log('\n\x1b[36m▶ 3. Social Media Sharing & Open Graph Protocol\x1b[0m');
const ogTypeMatch = html.match(/<meta\s+property=["']og:type["']\s+content=["']([^"']*)["']/i);
const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i);
const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i);
const ogUrlMatch = html.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']*)["']/i);
const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i);
const ogWidthMatch = html.match(/<meta\s+property=["']og:image:width["']\s+content=["']([^"']*)["']/i);
const ogHeightMatch = html.match(/<meta\s+property=["']og:image:height["']\s+content=["']([^"']*)["']/i);
const ogSiteNameMatch = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']*)["']/i);
const ogLocaleMatch = html.match(/<meta\s+property=["']og:locale["']\s+content=["']([^"']*)["']/i);

assert(Boolean(ogTypeMatch), 'OG', 'og:type defined', ogTypeMatch?.[1]);
assert(Boolean(ogTitleMatch), 'OG', 'og:title defined', ogTitleMatch?.[1]);
assert(Boolean(ogDescMatch), 'OG', 'og:description defined');
assert(ogUrlMatch?.[1] === 'https://2roti.com/', 'OG', 'og:url points to canonical domain');
assert(Boolean(ogImageMatch), 'OG', 'og:image defined', ogImageMatch?.[1]);
assert(ogWidthMatch?.[1] === '1200' && ogHeightMatch?.[1] === '800', 'OG', 'og:image dimensions defined as 1200x800 for HD social cards');
assert(Boolean(ogSiteNameMatch), 'OG', 'og:site_name defined', ogSiteNameMatch?.[1]);
assert(ogLocaleMatch?.[1] === 'en_IN', 'OG', 'og:locale set to en_IN for Indian audience');

// Verify that OG image actually exists in website/public/
if (ogImageMatch) {
  const ogImgUrl = ogImageMatch[1];
  const ogImgRelativePath = ogImgUrl.replace('https://2roti.com/', '');
  const localImgPath = path.join(WEBSITE_PUBLIC_DIR, ogImgRelativePath);
  assert(fs.existsSync(localImgPath), 'OG', 'OG image exists locally in website/public/', localImgPath);
}

// ----------------------------------------------------------------------
// 4. TWITTER CARDS
// ----------------------------------------------------------------------
console.log('\n\x1b[36m▶ 4. Twitter (X) Rich Card Directives\x1b[0m');
const twitterCardMatch = html.match(/<meta\s+name=["']twitter:card["']\s+content=["']([^"']*)["']/i);
const twitterTitleMatch = html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']*)["']/i);
const twitterDescMatch = html.match(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']*)["']/i);
const twitterImageMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']*)["']/i);

assert(twitterCardMatch?.[1] === 'summary_large_image', 'Twitter', 'twitter:card is summary_large_image');
assert(Boolean(twitterTitleMatch), 'Twitter', 'twitter:title defined');
assert(Boolean(twitterDescMatch), 'Twitter', 'twitter:description defined');
assert(Boolean(twitterImageMatch), 'Twitter', 'twitter:image defined');

// ----------------------------------------------------------------------
// 5. LOCAL & GEOGRAPHIC TARGETING
// ----------------------------------------------------------------------
console.log('\n\x1b[36m▶ 5. Local Search & Geo-Targeting Metadata\x1b[0m');
const geoRegion = html.match(/<meta\s+name=["']geo.region["']\s+content=["']([^"']*)["']/i);
const geoPlace = html.match(/<meta\s+name=["']geo.placename["']\s+content=["']([^"']*)["']/i);
const geoPosition = html.match(/<meta\s+name=["']geo.position["']\s+content=["']([^"']*)["']/i);
const icbm = html.match(/<meta\s+name=["']ICBM["']\s+content=["']([^"']*)["']/i);

assert(geoRegion?.[1] === 'IN-UP', 'Geo', 'geo.region matches IN-UP (Uttar Pradesh)');
assert(/Gorakhpur/i.test(geoPlace?.[1] || ''), 'Geo', 'geo.placename targets Gorakhpur, UP');
assert(Boolean(geoPosition?.[1]), 'Geo', 'geo.position coordinates set', geoPosition?.[1]);
assert(Boolean(icbm?.[1]), 'Geo', 'ICBM coordinates set', icbm?.[1]);

// ----------------------------------------------------------------------
// 6. BRANDING & PWA ICONS
// ----------------------------------------------------------------------
console.log('\n\x1b[36m▶ 6. Mobile Web Branding & Favicon Assets\x1b[0m');
const iconMatch = html.match(/<link\s+rel=["']icon["'][^>]*href=["']([^"']*)["']/i);
const appleIconMatch = html.match(/<link\s+rel=["']apple-touch-icon["'][^>]*href=["']([^"']*)["']/i);
const themeColorMatch = html.match(/<meta\s+name=["']theme-color["']\s+content=["']([^"']*)["']/i);

assert(Boolean(iconMatch), 'PWA', 'Favicon <link rel="icon"> specified');
assert(Boolean(appleIconMatch), 'PWA', '<link rel="apple-touch-icon"> specified');
assert(themeColorMatch?.[1] === '#FF5722', 'PWA', 'theme-color matches 2 Roti brand orange (#FF5722)');

if (iconMatch) {
  const iconRel = iconMatch[1].replace(/^\//, '');
  const localIcon = path.join(WEBSITE_PUBLIC_DIR, iconRel);
  assert(fs.existsSync(localIcon), 'PWA', 'Favicon file exists on disk', localIcon);
}

// ----------------------------------------------------------------------
// 7. STRUCTURED DATA / JSON-LD SCHEMAS
// ----------------------------------------------------------------------
console.log('\n\x1b[36m▶ 7. Google Rich Snippets & Schema.org Structured Data\x1b[0m');

const jsonLdRegex = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi;
const jsonLdBlocks = [];
let m;
while ((m = jsonLdRegex.exec(html)) !== null) {
  try {
    const parsed = JSON.parse(m[1].trim());
    jsonLdBlocks.push(parsed);
  } catch (err) {
    assert(false, 'Schema', 'JSON-LD block failed to parse as valid JSON', err.message);
  }
}

assert(jsonLdBlocks.length >= 4, 'Schema', `Found ${jsonLdBlocks.length} valid JSON-LD schemas (minimum 4 expected)`);

// 7.1 WebSite + SearchAction (Google Sitelinks Searchbox)
const websiteSchema = jsonLdBlocks.find(b => b['@type'] === 'WebSite');
assert(Boolean(websiteSchema), 'Schema', 'Schema.org WebSite exists');
if (websiteSchema) {
  assert(websiteSchema.url === 'https://2roti.com/', 'Schema', 'WebSite url is canonical');
  const action = websiteSchema.potentialAction;
  assert(Boolean(action), 'Schema', 'potentialAction declared for Sitelinks Searchbox');
  if (action) {
    const isSearchAction = action['@type'] === 'SearchAction';
    assert(isSearchAction, 'Schema', 'potentialAction @type is SearchAction');
    const targetUrl = typeof action.target === 'object' ? action.target.urlTemplate : action.target;
    assert(Boolean(targetUrl) && targetUrl.includes('search_term_string'), 'Schema', 'SearchAction includes dynamic urlTemplate with search_term_string', targetUrl);
    assert(action['query-input'] === 'required name=search_term_string', 'Schema', 'query-input correctly specifies search_term_string');
  }
}

// 7.2 FastFoodRestaurant (Cloud Kitchen / Restaurant Rich Snippet)
const restaurantSchema = jsonLdBlocks.find(b => b['@type'] === 'FastFoodRestaurant' || b['@type'] === 'Restaurant');
assert(Boolean(restaurantSchema), 'Schema', 'FastFoodRestaurant schema exists');
if (restaurantSchema) {
  assert(restaurantSchema.name === '2 Roti', 'Schema', 'Restaurant name is "2 Roti"');
  assert(Boolean(restaurantSchema.address), 'Schema', 'Restaurant address declared');
  assert(Boolean(restaurantSchema.geo), 'Schema', 'Restaurant geo coordinates declared');
  assert(Boolean(restaurantSchema.priceRange), 'Schema', 'priceRange declared (e.g. ₹40 - ₹170)', restaurantSchema.priceRange);
  assert(Array.isArray(restaurantSchema.servesCuisine) && restaurantSchema.servesCuisine.length > 0, 'Schema', 'servesCuisine declared with cuisine tags');
  assert(Array.isArray(restaurantSchema.openingHoursSpecification), 'Schema', 'openingHoursSpecification declared');
  assert(Boolean(restaurantSchema.hasMenu), 'Schema', 'hasMenu section declared');
  if (restaurantSchema.hasMenu) {
    assert(Array.isArray(restaurantSchema.hasMenu.hasMenuSection) && restaurantSchema.hasMenu.hasMenuSection.length >= 4, 'Schema', 'Menu has at least 4 categorized food sections (Thalis, Curries, Biryanis, Outlet)');
  }
}

// 7.3 SiteNavigationElement (Internal Sitelinks Schema)
const navSchema = jsonLdBlocks.find(b => b['@type'] === 'ItemList' && b.itemListElement?.some(el => el['@type'] === 'SiteNavigationElement'));
assert(Boolean(navSchema), 'Schema', 'SiteNavigationElement Sitelinks schema exists');
if (navSchema) {
  const sitelinks = navSchema.itemListElement.filter(el => el['@type'] === 'SiteNavigationElement');
  assert(sitelinks.length >= 6, 'Schema', `Sitelinks ItemList has ${sitelinks.length} internal links (minimum 6 required)`);
  
  const sitelinkNames = sitelinks.map(s => s.name);
  console.log(`    \x1b[90m↳ Defined Sitelinks: ${sitelinkNames.join(' | ')}\x1b[0m`);
  
  // Verify all sitelink URLs are HTTPS canonical
  const allCanonical = sitelinks.every(s => s.url.startsWith('https://2roti.com/'));
  assert(allCanonical, 'Schema', 'All sitelink URLs are under canonical https://2roti.com/ domain');
}

// 7.4 BreadcrumbList Schema
const breadcrumbSchema = jsonLdBlocks.find(b => b['@type'] === 'BreadcrumbList');
assert(Boolean(breadcrumbSchema), 'Schema', 'BreadcrumbList schema exists for Google Search trails');
if (breadcrumbSchema) {
  assert(Array.isArray(breadcrumbSchema.itemListElement) && breadcrumbSchema.itemListElement.length >= 3, 'Schema', 'BreadcrumbList contains multiple breadcrumb hierarchy levels');
}

// 7.5 Non-JS Crawler Navigation (<noscript>)
assert(/<noscript>[\s\S]*?<nav[^>]*>[\s\S]*?<\/nav>[\s\S]*?<\/noscript>/i.test(html), 'Crawlability', '<noscript> semantic navigation block exists for non-JS bots');

// ----------------------------------------------------------------------
// 8. ROBOTS EXCLUSION PROTOCOL (ROBOTS.TXT)
// ----------------------------------------------------------------------
console.log('\n\x1b[36m▶ 8. Robots Exclusion Protocol (robots.txt)\x1b[0m');
assert(fs.existsSync(ROBOTS_PATH), 'Robots', 'robots.txt exists in website/public/');
const robotsTxt = fs.readFileSync(ROBOTS_PATH, 'utf-8');

assert(/User-agent:\s*\*/i.test(robotsTxt), 'Robots', 'User-agent: * defined');
assert(/Allow:\s*\//i.test(robotsTxt), 'Robots', 'Public root Allow: / defined');
assert(/Allow:\s*\/images\//i.test(robotsTxt), 'Robots', 'Image folder Allow: /images/ defined for Google Image Search');
assert(/Allow:\s*\/logos\//i.test(robotsTxt), 'Robots', 'Logo folder Allow: /logos/ defined');
assert(/Disallow:\s*\/api\//i.test(robotsTxt), 'Robots', 'Private API Disallow: /api/ defined');
assert(/Disallow:\s*\/admin\//i.test(robotsTxt), 'Robots', 'Admin dashboard Disallow: /admin/ defined');
assert(/Sitemap:\s*https:\/\/(?:www\.)?(?:doroti\.shop|2roti\.com)\/sitemap\.xml/i.test(robotsTxt), 'Robots', 'Sitemap directive configured');

// ----------------------------------------------------------------------
// 9. XML SITEMAP (SITEMAP.XML)
// ----------------------------------------------------------------------
console.log('\n\x1b[36m▶ 9. Google XML Sitemap & Image Indexing (sitemap.xml)\x1b[0m');
assert(fs.existsSync(SITEMAP_PATH), 'Sitemap', 'sitemap.xml exists in website/public/');
const sitemapXml = fs.readFileSync(SITEMAP_PATH, 'utf-8');

// XML declaration and namespaces
assert(/<\?xml\s+version=["']1.0["']\s+encoding=["']UTF-8["']\?>/i.test(sitemapXml), 'Sitemap', 'Valid XML 1.0 declaration present');
assert(/xmlns=["']http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9["']/i.test(sitemapXml), 'Sitemap', 'Standard sitemaps.org namespace declared');
assert(/xmlns:image=["']http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1["']/i.test(sitemapXml), 'Sitemap', 'Google Image Sitemap namespace declared');

// Extract URLs
const locRegex = /<loc>(https:\/\/(?:www\.)?(?:doroti\.shop|2roti\.com)\/[^<]*)<\/loc>/g;
const sitemapUrls = [];
let locMatch;
while ((locMatch = locRegex.exec(sitemapXml)) !== null) {
  sitemapUrls.push(locMatch[1]);
}

assert(sitemapUrls.length >= 10, 'Sitemap', `Sitemap contains ${sitemapUrls.length} indexed URLs (minimum 10 required)`);

// Check required deep URLs (by path suffix)
const requiredPaths = [
  '/',
  '/?tab=home',
  '/?tab=search',
  '/?tab=outlet',
  '/?category=thali',
  '/?category=curry',
  '/?category=biryani',
  '/?category=pizza',
  '/?location=jhungiya',
  '/?location=buddha'
];

requiredPaths.forEach(reqPath => {
  const found = sitemapUrls.some(u => u.endsWith(reqPath) || u.replace(/https:\/\/[^/]+/, '') === reqPath);
  assert(found, 'Sitemap', `Sitemap indexes deep path: ${reqPath}`);
});

// Check Google Images in sitemap
const imageLocRegex = /<image:loc>(https:\/\/(?:www\.)?(?:doroti\.shop|2roti\.com)\/[^<]*)<\/image:loc>/g;
const sitemapImages = [];
let imgMatch;
while ((imgMatch = imageLocRegex.exec(sitemapXml)) !== null) {
  sitemapImages.push(imgMatch[1]);
}

assert(sitemapImages.length >= 3, 'Sitemap', `Sitemap contains ${sitemapImages.length} Google Image tags`);

// Verify that all images listed in sitemap exist locally
sitemapImages.forEach(imgUrl => {
  const relPath = imgUrl.replace(/^https:\/\/(?:www\.)?(?:doroti\.shop|2roti\.com)\//, '');
  const localFile = path.join(WEBSITE_PUBLIC_DIR, relPath);
  assert(fs.existsSync(localFile), 'Sitemap', `Sitemap image exists on filesystem: ${relPath}`);
});

// ----------------------------------------------------------------------
// 10. SPA ROUTE & PARAMETER HANDLING VERIFICATION
// ----------------------------------------------------------------------
console.log('\n\x1b[36m▶ 10. SPA Deep Link & Parameter Handling in Client Code\x1b[0m');
const appJsxPath = path.join(ROOT_DIR, 'website', 'src', 'App.jsx');
const appJsx = fs.readFileSync(appJsxPath, 'utf-8');

assert(appJsx.includes('URLSearchParams'), 'SPA', 'App.jsx reads URL search parameters on mount');
assert(appJsx.includes('initialCategory'), 'SPA', 'App.jsx passes initialCategory to pages');
assert(appJsx.includes('initialSearchQuery'), 'SPA', 'App.jsx passes initialSearchQuery to deep search engine');
assert(appJsx.includes('window.history.replaceState'), 'SPA', 'App.jsx syncs active tab state with browser URL');

const searchJsxPath = path.join(ROOT_DIR, 'website', 'src', 'pages', 'Search.jsx');
const searchJsx = fs.readFileSync(searchJsxPath, 'utf-8');
assert(searchJsx.includes('initialQuery') && searchJsx.includes('initialCategory'), 'SPA', 'Search.jsx supports deep search sitelink entry');

const homeJsxPath = path.join(ROOT_DIR, 'website', 'src', 'pages', 'Home.jsx');
const homeJsx = fs.readFileSync(homeJsxPath, 'utf-8');
assert(homeJsx.includes('initialCategory'), 'SPA', 'Home.jsx supports direct category landing');

// ----------------------------------------------------------------------
// SUMMARY EVALUATION REPORT
// ----------------------------------------------------------------------
const passPercentage = Math.round((passedTests / totalTests) * 100);

console.log('\n========================================================================');
console.log('                   SEO EVALUATION SCORECARD');
console.log('========================================================================');
console.log(`  Total Checks Executed : ${totalTests}`);
console.log(`  Passed Checks         : \x1b[32m${passedTests}\x1b[0m`);
console.log(`  Failed Checks         : \x1b[${failedTests === 0 ? '32m0' : '31m' + failedTests}\x1b[0m`);
console.log(`  Overall SEO Score     : \x1b[${passPercentage === 100 ? '32m100%' : '33m' + passPercentage + '%'}\x1b[0m`);
console.log('========================================================================\n');

if (failedTests > 0) {
  console.error('\x1b[31mEvaluation completed with failures. Please review the failed items above.\x1b[0m\n');
  process.exit(1);
} else {
  console.log('\x1b[32m✔ 100% PERFECT SCORE! All Enterprise SEO & Sitelinks parameters validated successfully.\x1b[0m\n');
  process.exit(0);
}
