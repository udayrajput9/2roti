import React, { useState, useEffect } from 'react';
import {
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
  ChevronRight,
  ArrowLeft,
  Printer
} from 'lucide-react';
import { POLICY_DATA } from '../components/PolicyModal';

export default function LegalPolicyPage({ initialTab = 'terms', onBackToHome }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab && POLICY_DATA[initialTab]) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const policy = POLICY_DATA[activeTab] || POLICY_DATA.terms;
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
    <div className="pb-24 pt-4 px-3 sm:px-6 max-w-4xl mx-auto space-y-6">
      
      {/* Back button & top branding */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-[#FF5722]" />
          <span>Back to Menu</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl transition-all"
            title="Print this document"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print Document</span>
          </button>
        </div>
      </div>

      {/* Main Header Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#161616] to-[#111111] border border-neutral-800 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#1C1410] border border-[#FF5722]/40 flex items-center justify-center text-[#FF5722] shrink-0 shadow-[0_0_20px_rgba(255,87,34,0.25)]">
            <PolicyIcon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {policy.title}
              </h1>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FF5722]/20 text-[#FF7043] border border-[#FF5722]/30">
                {policy.badge}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              {policy.subtitle}
            </p>
            <div className="text-[11px] text-neutral-500 font-mono mt-2">
              Official Revision Date: {policy.lastUpdated} • 2 Roti Technologies
            </div>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-1.5 mt-6 pt-4 border-t border-neutral-800/80 overflow-x-auto scrollbar-none">
          {tabList.map((t) => {
            const active = activeTab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id);
                  if (typeof window !== 'undefined' && window.history) {
                    const url = new URL(window.location.href);
                    url.searchParams.set('tab', t.id);
                    window.history.replaceState({}, '', url.toString());
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  active
                    ? 'bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white shadow-[0_4px_16px_rgba(255,87,34,0.35)]'
                    : 'bg-neutral-900/90 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Regulatory Compliance Badge */}
      <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-neutral-300 font-medium">
            Published in strict accordance with RBI Payment Aggregator Guidelines (Razorpay / Cashfree KYC norms) &amp; Consumer Protection Act.
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-neutral-500">
          <span>Gorakhpur Jurisdiction</span>
        </div>
      </div>

      {/* Policy Sections Body */}
      <div className="space-y-4">
        {policy.sections.map((sec, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-[#121212] border border-neutral-800/90 hover:border-neutral-700/80 transition-all shadow-md"
          >
            <h2 className="text-white text-sm sm:text-base font-black mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF5722]" />
              <span>{sec.heading}</span>
            </h2>
            <div className="text-neutral-300 text-xs sm:text-sm whitespace-pre-line leading-relaxed font-normal">
              {sec.content}
            </div>
          </div>
        ))}
      </div>

      {/* Dedicated Contact Card */}
      <div className="p-6 rounded-3xl bg-[#141414] border border-[#FF5722]/40 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#FF5722]" />
            <h3 className="text-sm font-black text-white">Merchant Contact &amp; Grievance Redressal</h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
            Verified Support
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
            <span className="block text-neutral-500 text-[10px] uppercase font-bold">Official Support &amp; Grievance Email</span>
            <a
              href="mailto:doroti.connect@gmail.com"
              className="text-white font-bold text-sm hover:text-[#FF7043] transition-colors break-all mt-0.5 block"
            >
              doroti.connect@gmail.com
            </a>
          </div>

          <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
            <span className="block text-neutral-500 text-[10px] uppercase font-bold">Customer Helpline</span>
            <span className="text-white font-bold text-sm block mt-0.5">+91-9876543210</span>
          </div>

          <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 sm:col-span-2">
            <span className="block text-neutral-500 text-[10px] uppercase font-bold">Registered Cloud Kitchen Address</span>
            <span className="text-neutral-300 font-medium block mt-0.5">
              2 Roti Technologies, Jhungiya Chauraha, Near Engineering College Campus, Gorakhpur, Uttar Pradesh – 273013, India
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
