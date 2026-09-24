import React from 'react';
import {
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Clock,
  ExternalLink,
  Lock,
  Truck,
  RotateCcw,
  FileText,
  HelpCircle,
  ChefHat
} from 'lucide-react';

export default function Footer({ onOpenPolicy, onChangeTab }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="hidden md:block bg-[#0B0B0B] border-t border-neutral-800 text-neutral-400 mt-16 pt-12 pb-8">
      <div className="max-w-6xl mx-auto px-6">
        
        {/* Top 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-neutral-800/80 text-xs">
          
          {/* Column 1: Brand & Kitchen Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <img
                src="/logos/app_icon_light.webp"
                alt="2 Roti Logo"
                className="w-8 h-8 rounded-lg object-contain shadow-[0_0_12px_rgba(255,87,34,0.3)]"
                loading="lazy"
              />
              <span className="text-lg font-black text-white tracking-tight">
                2 <span className="text-[#FF5722]">Roti</span>
              </span>
            </div>
            
            <p className="text-neutral-400 leading-relaxed text-[11px]">
              Authentic North Indian campus cloud kitchen serving fresh royal Thalis, rich slow-simmered Curries, aromatic Dum Biryani, and hot Tandoori Rotis delivered straight to college hostels.
            </p>

            <div className="flex items-center gap-2 text-[11px] text-neutral-300 bg-neutral-900/90 border border-neutral-800 px-3 py-1.5 rounded-xl">
              <ChefHat className="w-4 h-4 text-[#FF5722] shrink-0" />
              <span>FSSAI Compliant • Daily Fresh Ingredients</span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <span>Campus Ordering</span>
            </h4>
            <ul className="space-y-2 text-[12px]">
              <li>
                <button
                  onClick={() => onChangeTab('home')}
                  className="hover:text-[#FF7043] transition-colors"
                >
                  Daily Food Menu
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onChangeTab('search');
                  }}
                  className="hover:text-[#FF7043] transition-colors"
                >
                  Special Thalis & Combos
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onChangeTab('search');
                  }}
                  className="hover:text-[#FF7043] transition-colors"
                >
                  Dum Biryani & Curries
                </button>
              </li>
              <li>
                <button
                  onClick={() => onChangeTab('outlet')}
                  className="hover:text-[#FF7043] transition-colors flex items-center gap-1"
                >
                  <span>Jhungiya Live Outlet</span>
                  <span className="text-[9px] bg-[#FF5722]/20 text-[#FF7043] px-1.5 py-0.2 rounded font-bold">
                    Counter
                  </span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onChangeTab('search')}
                  className="hover:text-[#FF7043] transition-colors"
                >
                  Deep Dish Search
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Payment Compliance (Razorpay & Cashfree Norms) */}
          <div className="space-y-3">
            <h4 className="text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FF5722]" />
              <span>Legal & Policies</span>
            </h4>
            <ul className="space-y-2 text-[12px]">
              <li>
                <button
                  onClick={() => onOpenPolicy('terms')}
                  className="hover:text-[#FF7043] transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Terms &amp; Conditions</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('privacy')}
                  className="hover:text-[#FF7043] transition-colors flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Privacy Policy</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('refund')}
                  className="hover:text-[#FF7043] transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Refund &amp; Cancellation Policy</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('shipping')}
                  className="hover:text-[#FF7043] transition-colors flex items-center gap-1.5"
                >
                  <Truck className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Shipping &amp; Delivery Policy</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('about')}
                  className="hover:text-[#FF7043] transition-colors flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-neutral-500" />
                  <span>About Us &amp; Kitchen Story</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Grievance (Mandatory for Payment Gateways) */}
          <div className="space-y-3">
            <h4 className="text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#FF5722]" />
              <span>Contact Us</span>
            </h4>
            <ul className="space-y-2.5 text-[11px]">
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-[#FF7043] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-neutral-500 text-[10px] font-bold">Official Support &amp; Grievance Email</span>
                  <a
                    href="mailto:doroti.connect@gmail.com"
                    className="text-white font-medium hover:text-[#FF7043] transition-colors break-all"
                  >
                    doroti.connect@gmail.com
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-[#FF7043] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-neutral-500 text-[10px] font-bold">Helpline &amp; Orders</span>
                  <span className="text-white font-medium">+91-9876543210</span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#FF7043] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-neutral-500 text-[10px] font-bold">Operating Address</span>
                  <span className="text-neutral-300 leading-snug">
                    Jhungiya Chauraha, Near Engineering College Campus, Gorakhpur, Uttar Pradesh – 273013, India
                  </span>
                </div>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-neutral-400">Hours: 09:00 AM – 11:00 PM (All 7 Days)</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Payment Partners & Security Badges Row */}
        <div className="py-6 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-neutral-800/80">
          
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Secure Payments Powered By:</span>
            </span>
            <div className="flex items-center gap-2 flex-wrap text-[11px] font-black">
              <span className="bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-lg text-blue-400">
                Razorpay
              </span>
              <span className="bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-lg text-emerald-400">
                Cashfree
              </span>
              <span className="bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-lg text-amber-300">
                UPI / QR
              </span>
              <span className="bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-lg text-purple-400">
                RuPay
              </span>
              <span className="bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-lg text-sky-400">
                Cards / NetBanking
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>256-Bit SSL Encrypted &amp; PCI-DSS Level 1 Compliant</span>
          </div>

        </div>

        {/* Bottom Copyright & Campus Locations Bar */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-neutral-500">
          <div>
            © {currentYear} 2 Roti Technologies. All rights reserved. Authentic Campus Dining &amp; Cloud Kitchen Ecosystem.
          </div>
          
          <div className="flex items-center gap-2 flex-wrap text-neutral-400">
            <span className="font-bold text-neutral-500">Serving:</span>
            <span>Jhungiya Hostels</span>
            <span>•</span>
            <span>Buddha PG College</span>
            <span>•</span>
            <span>KIPM Campus</span>
            <span>•</span>
            <span>ITM Campus</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
