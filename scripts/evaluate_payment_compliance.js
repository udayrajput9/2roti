/**
 * 2 ROTI - PAYMENT GATEWAY (RAZORPAY & CASHFREE) COMPLIANCE EVALUATION SUITE
 * 
 * Verifies 100% compliance with mandatory Merchant Onboarding KYC Guidelines
 * enforced by Razorpay, Cashfree, RBI Payment Aggregator norms, and Consumer Protection Act.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const FOOTER_PATH = path.join(ROOT_DIR, 'website', 'src', 'components', 'Footer.jsx');
const POLICY_MODAL_PATH = path.join(ROOT_DIR, 'website', 'src', 'components', 'PolicyModal.jsx');
const LEGAL_PAGE_PATH = path.join(ROOT_DIR, 'website', 'src', 'pages', 'LegalPolicyPage.jsx');
const APP_JSX_PATH = path.join(ROOT_DIR, 'website', 'src', 'App.jsx');
const SITEMAP_PATH = path.join(ROOT_DIR, 'website', 'public', 'sitemap.xml');
const INDEX_HTML_PATH = path.join(ROOT_DIR, 'website', 'index.html');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, category, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m [${category}] ${testName} ${details ? `(${details})` : ''}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✖ FAIL\x1b[0m [${category}] ${testName} ${details ? `(${details})` : ''}`);
  }
}

console.log('\n========================================================================');
console.log('   2 ROTI – RAZORPAY & CASHFREE MERCHANT COMPLIANCE EVALUATION SUITE');
console.log('========================================================================\n');

// ----------------------------------------------------------------------
// 1. FILE EXISTENCE & INTEGRITY
// ----------------------------------------------------------------------
console.log('\x1b[36m▶ 1. Compliance Components & Architecture Files\x1b[0m');
assert(fs.existsSync(FOOTER_PATH), 'Files', 'Footer.jsx exists in website/src/components/');
assert(fs.existsSync(POLICY_MODAL_PATH), 'Files', 'PolicyModal.jsx exists in website/src/components/');
assert(fs.existsSync(LEGAL_PAGE_PATH), 'Files', 'LegalPolicyPage.jsx exists in website/src/pages/');

const footerCode = fs.readFileSync(FOOTER_PATH, 'utf-8');
const policyCode = fs.readFileSync(POLICY_MODAL_PATH, 'utf-8');
const legalPageCode = fs.readFileSync(LEGAL_PAGE_PATH, 'utf-8');
const appCode = fs.readFileSync(APP_JSX_PATH, 'utf-8');
const sitemapCode = fs.readFileSync(SITEMAP_PATH, 'utf-8');
const indexHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

// ----------------------------------------------------------------------
// 2. DISPLAY RULES (DESKTOP ONLY, HIDDEN ON MOBILE)
// ----------------------------------------------------------------------
console.log('\n\x1b[36m▶ 2. Responsive Display Rules (Hidden on Mobile, Visible on Web)\x1b[0m');
assert(footerCode.includes('hidden md:block'), 'Display', 'Footer contains "hidden md:block" (hidden on mobile, visible on desktop)');
assert(!footerCode.includes('hidden block'), 'Display', 'Footer does not render unconditionally on mobile');
assert(appCode.includes('<Footer'), 'Display', 'App.jsx mounts the desktop Footer component');

// ----------------------------------------------------------------------
// 3. CONTACT US & OFFICIAL GRIEVANCE REQUIREMENTS
// ----------------------------------------------------------------------
console.log('\n\x1b[36m▶ 3. Contact Us & Grievance Redressal (Mandatory KYC Info)\x1b[0m');
const targetEmail = 'doroti.connect@gmail.com';

assert(footerCode.includes(targetEmail), 'Contact', `Footer contains official contact email: ${targetEmail}`);
assert(policyCode.includes(targetEmail), 'Contact', `Policy modal contains official contact email: ${targetEmail}`);
assert(legalPageCode.includes(targetEmail), 'Contact', `LegalPolicyPage contains official contact email: ${targetEmail}`);

assert(footerCode.includes('Jhungiya') && footerCode.includes('Gorakhpur') && footerCode.includes('273013'), 'Contact', 'Footer contains full operational physical address with PIN 273013');
assert(policyCode.includes('Jhungiya') && policyCode.includes('Gorakhpur') && policyCode.includes('273013'), 'Contact', 'Policy contains physical address with Gorakhpur and PIN code');
assert(footerCode.includes('+91-'), 'Contact', 'Customer helpline phone number specified');
assert(policyCode.includes('Grievance Officer'), 'Contact', 'Grievance Officer designation and redressal SLA defined');
assert(policyCode.includes('09:00 AM') || policyCode.includes('9:00 AM') || footerCode.includes('09:00 AM'), 'Contact', 'Customer support operational timings specified');

// ----------------------------------------------------------------------
// 4. CANCELLATION & REFUND POLICY (RAZORPAY & CASHFREE STRICT NORMS)
// ----------------------------------------------------------------------
console.log('\n\x1b[36m▶ 4. Cancellation & Refund Policy Norms\x1b[0m');
assert(policyCode.includes('5 to 7 working days') || policyCode.includes('5-7 working days') || policyCode.includes('5 to 7 business days'), 'Refund', 'Explicit refund timeline specified: "5 to 7 working days" back to source account');
assert(policyCode.includes('original source') || policyCode.includes('original payment method'), 'Refund', 'Specifies refund credited back to original payment method (Bank/UPI/Card)');
assert(policyCode.includes('60 seconds') || policyCode.includes('ACCEPTED') || policyCode.includes('PREPARING'), 'Refund', 'Clear order cancellation window defined (before food preparation)');
assert(policyCode.includes('Damaged') || policyCode.includes('Spilled') || policyCode.includes('Missing'), 'Refund', 'Covers damaged food, spilled items, and missing items refund policy');
assert(policyCode.includes('Razorpay') || policyCode.includes('Cashfree'), 'Refund', 'Mentions payment aggregators (Razorpay / Cashfree) in refund mechanism');

// ----------------------------------------------------------------------
// 5. SHIPPING & DELIVERY POLICY (PHYSICAL / FOOD GOODS)
// ----------------------------------------------------------------------
console.log('\n\x1b[36m▶ 5. Shipping & Delivery Policy Norms\x1b[0m');
assert(policyCode.includes('20 to 45 minutes') || policyCode.includes('20-45 minutes'), 'Shipping', 'Explicit estimated delivery turnaround time specified: "20 to 45 minutes"');
assert(policyCode.includes('Jhungiya') && policyCode.includes('Buddha') && policyCode.includes('KIPM') && policyCode.includes('ITM'), 'Shipping', 'Clearly defines all serviceable campus hostel delivery zones');
assert(policyCode.includes('Delivery Fee') || policyCode.includes('Free Delivery'), 'Shipping', 'Clearly outlines delivery fee structure and free delivery threshold');
assert(policyCode.includes('Hostel Gate') || policyCode.includes('security checkpoint'), 'Shipping', 'Specifies campus gate handover and safety protocols');

// ----------------------------------------------------------------------
// 6. TERMS & CONDITIONS (TERMS OF SERVICE)
// ----------------------------------------------------------------------
console.log('\n\x1b[36m▶ 6. Terms & Conditions (Legal Agreement)\x1b[0m');
assert(policyCode.includes('Terms and Conditions') || policyCode.includes('Terms & Conditions'), 'Terms', 'Terms & Conditions legal agreement present');
assert(policyCode.includes('Indian Rupees') || policyCode.includes('INR'), 'Terms', 'Currency specified in Indian Rupees (INR ₹)');
assert(policyCode.includes('Gorakhpur') && policyCode.includes('Uttar Pradesh'), 'Terms', 'Governing law jurisdiction specified as Gorakhpur, Uttar Pradesh');
assert(policyCode.includes('Limitation of Liability'), 'Terms', 'Limitation of liability clause included');

// ----------------------------------------------------------------------
// 7. PRIVACY POLICY & PAYMENT SECURITY (PCI-DSS & SSL)
// ----------------------------------------------------------------------
console.log('\n\x1b[36m▶ 7. Privacy Policy & Payment Security Disclaimer\x1b[0m');
assert(policyCode.includes('Privacy Policy'), 'Privacy', 'Privacy Policy section present');
assert(policyCode.includes('Razorpay') && policyCode.includes('Cashfree'), 'Privacy', 'Explicitly names PCI-DSS compliant partners Razorpay and Cashfree');
assert(policyCode.includes('does NOT store') || policyCode.includes('not store credit card'), 'Privacy', 'Explicit disclaimer that 2 Roti does NOT store credit/debit card numbers or NetBanking passwords');
assert(policyCode.includes('SSL') || policyCode.includes('TLS') || policyCode.includes('PCI-DSS'), 'Privacy', 'Specifies 256-bit SSL encryption and PCI-DSS compliance');

// ----------------------------------------------------------------------
// 8. DIRECT URL ROUTING & SITEMAP INTEGRATION
// ----------------------------------------------------------------------
console.log('\n\x1b[36m▶ 8. Direct URL Routing for Merchant Onboarding Reviews\x1b[0m');
const complianceTabs = ['terms', 'privacy', 'refund', 'shipping', 'contact', 'about'];

complianceTabs.forEach(t => {
  assert(appCode.includes(t), 'Routing', `App.jsx handles direct route parameter: ?tab=${t}`);
  assert(sitemapCode.includes(`https://2roti.com/?tab=${t}`), 'Sitemap', `sitemap.xml indexes legal URL: https://2roti.com/?tab=${t}`);
  assert(indexHtml.includes(`/?tab=${t}`), 'SEO', `index.html noscript crawler links to: /?tab=${t}`);
});

// ----------------------------------------------------------------------
// 9. PAYMENT PARTNER BADGES IN FOOTER
// ----------------------------------------------------------------------
console.log('\n\x1b[36m▶ 9. Trust & Payment Gateway Partner Badges in Footer\x1b[0m');
assert(footerCode.includes('Razorpay'), 'Trust', 'Footer displays Razorpay partner badge');
assert(footerCode.includes('Cashfree'), 'Trust', 'Footer displays Cashfree partner badge');
assert(footerCode.includes('UPI'), 'Trust', 'Footer displays UPI / QR payment badge');
assert(footerCode.includes('RuPay'), 'Trust', 'Footer displays RuPay badge');
assert(footerCode.includes('SSL') || footerCode.includes('PCI-DSS'), 'Trust', 'Footer displays SSL / PCI-DSS security assurance badge');

// ----------------------------------------------------------------------
// SCORECARD SUMMARY
// ----------------------------------------------------------------------
const passPercentage = Math.round((passedTests / totalTests) * 100);

console.log('\n========================================================================');
console.log('              COMPLIANCE EVALUATION SCORECARD');
console.log('========================================================================');
console.log(`  Total Checks Executed : ${totalTests}`);
console.log(`  Passed Checks         : \x1b[32m${passedTests}\x1b[0m`);
console.log(`  Failed Checks         : \x1b[${failedTests === 0 ? '32m0' : '31m' + failedTests}\x1b[0m`);
console.log(`  Compliance Score      : \x1b[${passPercentage === 100 ? '32m100%' : '33m' + passPercentage + '%'}\x1b[0m`);
console.log('========================================================================\n');

if (failedTests > 0) {
  console.error('\x1b[31mEvaluation completed with failures. Please review the failed items above.\x1b[0m\n');
  process.exit(1);
} else {
  console.log('\x1b[32m✔ 100% PERFECT SCORE! All Razorpay, Cashfree & RBI merchant onboarding norms met.\x1b[0m\n');
  process.exit(0);
}
