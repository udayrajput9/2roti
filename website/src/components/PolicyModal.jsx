import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Lock,
  RotateCcw,
  Truck,
  Mail,
  HelpCircle,
  ShieldCheck,
  Building,
  Phone,
  Clock,
  MapPin,
  CheckCircle2,
  Printer,
  ChevronRight
} from 'lucide-react';

export const POLICY_DATA = {
  terms: {
    id: 'terms',
    title: 'Terms & Conditions',
    subtitle: 'Customer Agreement, Ordering Rules & Service Usage',
    badge: 'Legal Agreement',
    icon: FileText,
    lastUpdated: 'September 24, 2026',
    sections: [
      {
        heading: '1. Introduction & Acceptance of Terms',
        content: `Welcome to 2 Roti ("we", "our", "us", or "Platform"). These Terms and Conditions govern your access to and use of our food delivery website, mobile web platform, and related services operated by 2 Roti Technologies. By placing an order, accessing, or browsing our website, you agree to be bound by these Terms and our Privacy Policy. If you do not agree with any part of these terms, please do not use our services.`
      },
      {
        heading: '2. Eligibility & User Accounts',
        content: `You must be at least 18 years of age, or possess legal parental/guardian consent if a student, to place food orders. You agree to provide accurate, current, and complete contact details (name, delivery hostel/block, mobile number) during registration and checkout. You are solely responsible for all activities that occur under your session or account.`
      },
      {
        heading: '3. Menu Pricing, Taxes & Availability',
        content: `All prices displayed on the 2 Roti platform are in Indian Rupees (INR ₹) and are inclusive of applicable taxes unless stated otherwise. Menu item availability, daily specials, and prices are subject to change without prior notice. While we strive for 100% menu accuracy, in the rare event of an ingredient or dish stockout after order placement, we will promptly notify you and initiate a full refund or suitable alternative.`
      },
      {
        heading: '4. Order Placement, Verification & Acceptance',
        content: `An order is considered placed once you complete the checkout process and authorize payment (via Razorpay, Cashfree, UPI, Cards, 2 Roti Wallet, or Cash on Delivery). 2 Roti reserves the right to accept or decline any order based on kitchen capacity, delivery location accessibility, or adverse weather conditions.`
      },
      {
        heading: '5. Online Payments & Security',
        content: `All digital payment transactions are processed securely through RBI-licensed payment aggregators (Razorpay Software Pvt. Ltd. and Cashfree Payments India Pvt. Ltd.). 2 Roti does NOT capture, collect, or store your sensitive credit/debit card numbers, CVVs, or NetBanking credentials. All electronic payments comply with PCI-DSS Level 1 security standards and 256-bit SSL encryption.`
      },
      {
        heading: '6. Loyalty Wallet & Cashback Credits',
        content: `Cashback credits earned per order (e.g., ₹3 flat cashback) are credited to your 2 Roti Wallet once the order is marked DELIVERED. Wallet balances can be redeemed towards future orders once the minimum redemption threshold (₹50) is reached. Wallet balances are non-transferable and non-encashable to external bank accounts.`
      },
      {
        heading: '7. Prohibited Uses',
        content: `Users agree not to misuse promotional coupon codes, place fraudulent or frivolous orders, impersonate any individual, or engage in abusive or disrespectful behavior toward our kitchen team or campus delivery partners.`
      },
      {
        heading: '8. Limitation of Liability & Force Majeure',
        content: `2 Roti shall not be liable for delivery delays or failures arising from circumstances beyond our reasonable control (force majeure), including extreme weather, road blockades, university campus gate closures, or technical interruptions. In all circumstances, 2 Roti's maximum liability to you for any claim arising out of an order is strictly limited to the total monetary amount paid for that specific order.`
      },
      {
        heading: '9. Governing Law & Dispute Jurisdiction',
        content: `These Terms and Conditions are governed by and construed in accordance with the laws of the Republic of India. Any legal dispute, controversy, or claim arising out of or relating to these terms shall be subject to the exclusive jurisdiction of the competent courts in Gorakhpur, Uttar Pradesh, India.`
      }
    ]
  },

  privacy: {
    id: 'privacy',
    title: 'Privacy Policy',
    subtitle: 'Data Protection, Security & User Confidentiality',
    badge: 'Data Security',
    icon: Lock,
    lastUpdated: 'September 24, 2026',
    sections: [
      {
        heading: '1. Commitment to Privacy',
        content: `At 2 Roti Technologies, we value your trust and are committed to protecting your personal privacy. This Privacy Policy details how we collect, store, process, and safeguard the information you provide when using our platform.`
      },
      {
        heading: '2. Information We Collect',
        content: `We collect minimal, necessary personal information to fulfill your campus food orders, including:\n• Contact Details: Your full name, mobile phone number, and verified email address.\n• Delivery Information: College name, campus hostel, block/floor, and room number.\n• Order & Preference History: Items ordered, payment mode, delivery instructions, and feedback.\n• Technical Metadata: Device type, browser user-agent, and IP address for session security and anti-fraud monitoring.`
      },
      {
        heading: '3. Payment Processing & Non-Storage of Card Data',
        content: `We prioritize payment safety above all else. 2 Roti does NOT store credit card numbers, debit card details, CVVs, or NetBanking passwords on our servers. All financial transactions are redirected to and securely executed by PCI-DSS Level 1 Certified payment partners (Razorpay Software Pvt. Ltd. and Cashfree Payments India Pvt. Ltd.) using end-to-end encrypted tunnels.`
      },
      {
        heading: '4. How We Use Your Information',
        content: `Your data is utilized strictly for:\n• Preparing, dispatching, and delivering your food orders to the correct campus hostel gate.\n• Sending real-time SMS/WhatsApp order confirmations, dispatch updates, and digital receipts.\n• Managing loyalty cashback balances in your 2 Roti Wallet.\n• Enhancing our culinary catalog, app performance, and customer support service.`
      },
      {
        heading: '5. Sharing & Disclosure of Information',
        content: `We never sell, rent, or trade your personal data with third-party advertisers. Your information is shared strictly with:\n• Authorized Campus Delivery Partners: Name, phone number, and hostel room for real-time delivery dispatch.\n• Payment Gateways (Razorpay/Cashfree): For payment tokenization and fraud prevention.\n• Law Enforcement: Only when required under applicable statutory laws or judicial orders.`
      },
      {
        heading: '6. Cookies & Session Storage',
        content: `We use minimal, secure local storage and essential session cookies to remember your active delivery location, manage cart items, and maintain authentication tokens across browser sessions. You can clear cookies at any time via your browser settings.`
      },
      {
        heading: '7. Data Retention & User Rights',
        content: `We retain order transaction records for accounting and statutory compliance purposes. You have the right to inspect, update, or request deletion of your account information at any time by sending a written request to our official grievance desk at doroti.connect@gmail.com.`
      }
    ]
  },

  refund: {
    id: 'refund',
    title: 'Refund & Cancellation Policy',
    subtitle: 'Transparent Return Timelines, Cancellation Windows & Dispute Resolution',
    badge: 'Razorpay & Cashfree Compliant',
    icon: RotateCcw,
    lastUpdated: 'September 24, 2026',
    sections: [
      {
        heading: '1. Order Cancellation by Customer',
        content: `• Free Cancellation Window: You can cancel your order free of charge within 60 seconds of placement, or before the cloud kitchen marks the order status as "ACCEPTED" / "PREPARING".\n• Once Kitchen Preparation Starts: Because food is freshly cooked to order, cancellations cannot be accepted once preparation or packaging has commenced, in order to avoid food wastage.\n• How to Cancel: To cancel an eligible order, navigate to your Profile > Orders tab and select "Cancel Order", or contact our customer support team immediately at doroti.connect@gmail.com or +91-9876543210.`
      },
      {
        heading: '2. Order Cancellation by 2 Roti',
        content: `Under rare circumstances, 2 Roti reserves the right to cancel an order due to:\n• Unavailability of specific fresh ingredients or sudden kitchen technical shutdown.\n• Inaccessibility of delivery address or college campus security lockouts.\n• Unforeseen severe weather conditions preventing safe courier transit.\nIn all cases of cancellation initiated by 2 Roti, a 100% full refund is automatically initiated immediately.`
      },
      {
        heading: '3. Refund Eligibility Criteria',
        content: `You are eligible for a partial or full refund under the following verified conditions:\n• Damaged / Spilled Food: Food container seal broken, spilled in transit, or packaging compromised.\n• Missing or Incorrect Items: Items delivered differ from what was ordered, or an item is missing.\n• Undelivered Order: Order marked delivered but never received, verified with delivery tracking logs.\n• Quality Concerns: Unfit food quality reported within 2 hours of delivery receipt.\nTo request a refund, please email doroti.connect@gmail.com within 2 hours of delivery with your Order ID, contact number, and clear photos of the food package.`
      },
      {
        heading: '4. Refund Processing Timelines (Mandatory SLA)',
        content: `• Digital Payments (UPI / Credit Card / Debit Card / NetBanking via Razorpay or Cashfree): Refunds are processed through the respective payment gateway back to your original source payment method. Funds typically reflect in your bank account or credit card within 5 to 7 working days (subject to your issuing bank's settlement cycle).\n• 2 Roti Loyalty Wallet: Refunds credited to your 2 Roti Wallet are instantaneous (within 5 minutes) and can be used immediately for future orders.\n• Cash on Delivery (COD) Orders: Refund will be credited either directly to your 2 Roti Wallet or transferred to your verified UPI VPA within 24 to 48 business hours upon customer request.`
      },
      {
        heading: '5. Non-Refundable Scenarios',
        content: `Refunds will not be issued in cases where:\n• Customer provides an inaccurate or incomplete delivery address or unreachable phone number, resulting in delivery partner arriving at gate but unable to contact recipient.\n• Customer refuses to accept the delivery without a valid, verifiable reason after food arrives hot and on time.\n• Quality issues reported more than 3 hours after successful delivery.`
      }
    ]
  },

  shipping: {
    id: 'shipping',
    title: 'Shipping & Delivery Policy',
    subtitle: 'Campus Delivery Zones, SLAs, Packaging & Order Dispatch',
    badge: 'Campus Express SLA',
    icon: Truck,
    lastUpdated: 'September 24, 2026',
    sections: [
      {
        heading: '1. Serviceable Campus Delivery Locations',
        content: `2 Roti specializes in rapid, hot campus food delivery. We currently serve college hostels, faculty residences, and campus gates across Gorakhpur, Uttar Pradesh:\n1. Jhungiya Chauraha & Surrounding Student Hostels\n2. Buddha PG College Campus & Hostels\n3. KIPM College of Engineering & Technology Campus\n4. ITM (Institute of Technology & Management) Campus & Hostels\nWe are actively expanding delivery radius to neighboring academic zones.`
      },
      {
        heading: '2. Estimated Delivery Timelines (SLA)',
        content: `• Standard Delivery Orders (Thalis, Biryanis, Curries): Estimated delivery time is 20 to 45 minutes from the moment your order is accepted and confirmed by the kitchen.\n• Live Outlet Counter Snacks (Hot Rolls, Parathas, Tea/Beverages): Estimated delivery time is 15 to 25 minutes.\n• Peak Hours Notice: During campus dinner peak hours (08:00 PM – 10:00 PM) or adverse weather conditions (heavy monsoon rains), delivery times may extend by 10–15 minutes. Customers can track real-time order status via the Profile > Orders tab.`
      },
      {
        heading: '3. Delivery Fee Structure',
        content: `• Free Delivery: Orders meeting or exceeding the minimum basket size of ₹149 qualify for 100% Free Campus Gate Delivery.\n• Nominal Delivery Fee: Orders below ₹149 may incur a nominal campus courier fee of ₹15 – ₹25 depending on the specific campus hostel distance from our central kitchen hub.\nAll applicable delivery fees are transparently shown on the Checkout screen prior to payment authorization.`
      },
      {
        heading: '4. Hygienic Packaging & Thermal Protection',
        content: `All meals are sealed in food-grade, leak-proof, BPA-free containers and transported inside insulated thermal delivery bags to ensure that rotis remain soft, curries stay piping hot, and biryanis retain their authentic dum aroma during transit.`
      },
      {
        heading: '5. Handover & Delivery Verification Protocol',
        content: `For campus security compliance, our delivery executives deliver orders to the respective Hostel Gate, Reception Desk, or Academic Block security checkpoint. Our rider will contact you via phone 3 to 5 minutes prior to arrival so you can collect your steaming hot order without delay.`
      }
    ]
  },

  contact: {
    id: 'contact',
    title: 'Contact Us & Grievance Redressal',
    subtitle: 'Official Customer Support, Registered Headquarters & Grievance Desk',
    badge: 'Support 7 Days a Week',
    icon: Mail,
    lastUpdated: 'September 24, 2026',
    sections: [
      {
        heading: '1. Customer Support & Inquiry Channels',
        content: `We are here to assist you with order status inquiries, custom meal plans, corporate/event catering, or feedback:\n• Official Email: doroti.connect@gmail.com\n• Helpline & WhatsApp Support: +91-9876543210 / +91-9123456789\n• Operating Hours: 09:00 AM – 11:00 PM IST (Monday through Sunday, All 7 Days)`
      },
      {
        heading: '2. Registered & Operational Head Office',
        content: `2 Roti Technologies\nOperating Cloud Kitchen Hub:\nJhungiya Chauraha, Near Engineering College Campus,\nGorakhpur, Uttar Pradesh – 273013, India.\nLandmark: Adjacent to Engineering College Hostels.`
      },
      {
        heading: '3. Grievance Officer Details',
        content: `In accordance with the Information Technology Act, 2000 and the Consumer Protection (E-Commerce) Rules, 2020, the contact details of the Grievance Officer for 2 Roti are:\n• Designation: Nodal Grievance Officer, Customer Experience\n• Department: Legal & Consumer Redressal\n• Email: doroti.connect@gmail.com\n• Subject Line: "Grievance Redressal - Order #[Your-Order-ID]"\n• Response SLA: Grievance acknowledgment within 24 hours; complete resolution within 48 to 72 business hours.`
      },
      {
        heading: '4. Commercial & Catering Inquiries',
        content: `For campus fest catering, hostel mess bulk bookings, or food partnerships, please contact us with subject "Bulk Catering" at doroti.connect@gmail.com.`
      }
    ]
  },

  about: {
    id: 'about',
    title: 'About 2 Roti',
    subtitle: 'Our Culinary Story, Mission & Food Safety Commitment',
    badge: 'Campus Cloud Kitchen',
    icon: HelpCircle,
    lastUpdated: 'September 24, 2026',
    sections: [
      {
        heading: '1. The 2 Roti Story',
        content: `2 Roti was born out of a simple, essential observation: college hostel students crave clean, hearty, homestyle food that doesn\'t burn a hole in their pocket. Tired of oily, repetitive mess food and overpriced commercial restaurants, we built 2 Roti as a modern cloud kitchen dedicated to serving authentic North Indian meals directly to student doors.`
      },
      {
        heading: '2. Our Culinary Philosophy',
        content: `• Pure Homestyle Cooking: Freshly kneaded whole wheat rotis, slow-simmered rich curries, fragrant dum biryanis, and wholesome vegetarian and chicken thalis cooked with pure desi spices.\n• Zero Compromise on Hygiene: Fresh ingredients sourced daily from local farmers; no artificial preservatives, zero stale food recycling.\n• Student-Friendly Pricing: Complete royal thalis and hearty curries starting at affordable rates without compromising on portion size or ingredient quality.`
      },
      {
        heading: '3. Food Safety & FSSAI Standards',
        content: `Our central cloud kitchen operates under strict hygiene protocols compliant with Food Safety and Standards Authority of India (FSSAI) guidelines. Kitchen staff undergo mandatory health checks, wear hairnets, gloves, and aprons, and use sanitized stainless steel cookware.`
      }
    ]
  }
};

export default function PolicyModal({ isOpen, onClose, activePolicy = 'terms', onSelectPolicy }) {
  const [currentTab, setCurrentTab] = useState(activePolicy);

  useEffect(() => {
    if (activePolicy && POLICY_DATA[activePolicy]) {
      setCurrentTab(activePolicy);
    }
  }, [activePolicy]);

  if (!isOpen) return null;

  const policy = POLICY_DATA[currentTab] || POLICY_DATA.terms;
  const PolicyIcon = policy.icon;

  const tabList = [
    { id: 'terms', label: 'Terms & Conditions', icon: FileText },
    { id: 'privacy', label: 'Privacy Policy', icon: Lock },
    { id: 'refund', label: 'Refund & Cancellation', icon: RotateCcw },
    { id: 'shipping', label: 'Shipping & Delivery', icon: Truck },
    { id: 'contact', label: 'Contact Us', icon: Mail },
    { id: 'about', label: 'About Us', icon: HelpCircle }
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#121212] border border-neutral-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#161616]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1C1410] border border-[#FF5722]/30 flex items-center justify-center text-[#FF5722]">
              <PolicyIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">{policy.title}</h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FF5722]/20 text-[#FF7043] border border-[#FF5722]/30">
                  {policy.badge}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">{policy.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors hidden sm:flex items-center gap-1.5 text-xs font-bold"
              title="Print Policy"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector Bar */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 bg-[#141414] border-b border-neutral-800/80 overflow-x-auto scrollbar-none">
          {tabList.map((t) => {
            const active = currentTab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setCurrentTab(t.id);
                  if (onSelectPolicy) onSelectPolicy(t.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  active
                    ? 'bg-[#FF5722] text-white shadow-[0_2px_12px_rgba(255,87,34,0.35)]'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-neutral-300 text-xs sm:text-sm leading-relaxed scrollbar-thin scrollbar-thumb-neutral-800">
          
          {/* Compliance Banner for Payment Gateways */}
          <div className="p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-neutral-300 font-medium">
                Published in compliance with IT Act 2000, Consumer Protection Act, &amp; RBI Payment Aggregator Guidelines (Razorpay &amp; Cashfree).
              </span>
            </div>
            <span className="text-[11px] text-neutral-500 font-mono">
              Last Updated: {policy.lastUpdated}
            </span>
          </div>

          {/* Sections List */}
          <div className="space-y-5">
            {policy.sections.map((sec, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#141414] border border-neutral-800/70 hover:border-neutral-700/80 transition-colors"
              >
                <h4 className="text-white text-sm font-black mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5722]" />
                  <span>{sec.heading}</span>
                </h4>
                <div className="text-neutral-400 text-xs whitespace-pre-line leading-relaxed">
                  {sec.content}
                </div>
              </div>
            ))}
          </div>

          {/* Contact Verification Box inside Policy */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1A120E] to-[#141414] border border-[#FF5722]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h5 className="text-white text-xs font-black">Questions or Grievance Regarding This Policy?</h5>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Our support desk reviews all payment, refund, and service disputes with high priority.
              </p>
            </div>
            <a
              href="mailto:doroti.connect@gmail.com"
              className="px-4 py-2 rounded-xl bg-[#FF5722] hover:bg-[#F4511E] text-white text-xs font-black shrink-0 transition-colors flex items-center gap-1.5 justify-center shadow-[0_2px_12px_rgba(255,87,34,0.35)]"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>doroti.connect@gmail.com</span>
            </a>
          </div>

        </div>

        {/* Footer Action */}
        <div className="px-6 py-3.5 border-t border-neutral-800 bg-[#161616] flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="text-[11px]">2 Roti Technologies • Gorakhpur, UP – 273013</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold transition-colors"
          >
            Close
          </button>
        </div>

      </div>

    </div>
  );
}
