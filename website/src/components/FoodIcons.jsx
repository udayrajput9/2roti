import React from 'react';

// 1. Modern Luxury Curry Icon (Aromatic Handi with Spices & Steam)
export function CurryIcon({ className = "w-7 h-7" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="curryGrad" x1="12" y1="26" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF7043" />
          <stop offset="50%" stopColor="#F4511E" />
          <stop offset="100%" stopColor="#C62828" />
        </linearGradient>
        <linearGradient id="goldRim" x1="10" y1="24" x2="54" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE082" />
          <stop offset="50%" stopColor="#FFA000" />
          <stop offset="100%" stopColor="#FF6F00" />
        </linearGradient>
        <linearGradient id="steamGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFB74D" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FF7043" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      
      {/* Delicate Steam Curves */}
      <path d="M26 14C24 10 28 6 26 2" stroke="url(#steamGrad)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M34 16C32 11 36 7 34 3" stroke="url(#steamGrad)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M42 14C40 10 44 6 42 2" stroke="url(#steamGrad)" strokeWidth="2.5" strokeLinecap="round" />

      {/* Handi Bowl Body */}
      <path
        d="M14 28C14 43 22 53 32 53C42 53 50 43 50 28H14Z"
        fill="url(#curryGrad)"
      />
      <ellipse cx="32" cy="27" rx="18" ry="5" fill="#BF360C" />
      <ellipse cx="32" cy="26" rx="16" ry="4" fill="#FF8A65" opacity="0.8" />

      {/* Handi Base Stand */}
      <path d="M24 53C24 56 40 56 40 53H24Z" fill="#8D6E63" />

      {/* Brass Handi Rim */}
      <path
        d="M12 25C12 23 21 22 32 22C43 22 52 23 52 25C52 27 43 28 32 28C21 28 12 27 12 25Z"
        fill="url(#goldRim)"
      />

      {/* Side Handles */}
      <path d="M12 28C8 28 7 35 12 37" stroke="url(#goldRim)" strokeWidth="3" strokeLinecap="round" />
      <path d="M52 28C56 28 57 35 52 37" stroke="url(#goldRim)" strokeWidth="3" strokeLinecap="round" />

      {/* Garnish Leaf & Cream Swirl */}
      <path d="M30 25C31 23 34 24 35 26" stroke="#FFE082" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="26" r="2" fill="#4CAF50" />
    </svg>
  );
}

// 2. Modern Royal Thali Icon (Indian Platter with Rotis, Katoris & Bowls)
export function ThaliIcon({ className = "w-7 h-7" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="plateGrad" cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="#263238" />
          <stop offset="85%" stopColor="#37474F" />
          <stop offset="100%" stopColor="#CFD8DC" />
        </radialGradient>
        <radialGradient id="rotiGrad2" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFF9C4" />
          <stop offset="60%" stopColor="#FFE082" />
          <stop offset="100%" stopColor="#FFA000" />
        </radialGradient>
      </defs>

      {/* Outer Plate Shadow & Metallic Rim */}
      <circle cx="32" cy="32" r="28" fill="url(#plateGrad)" stroke="#FFB74D" strokeWidth="2" />
      <circle cx="32" cy="32" r="25" fill="#1E293B" stroke="#475569" strokeWidth="1" />

      {/* Small Katoris */}
      <circle cx="21" cy="21" r="7" fill="#FFB300" stroke="#ECEFF1" strokeWidth="1.5" />
      <circle cx="21" cy="21" r="4.5" fill="#FFA000" />

      <circle cx="32" cy="15" r="7" fill="#E53935" stroke="#ECEFF1" strokeWidth="1.5" />
      <circle cx="32" cy="15" r="4.5" fill="#C62828" />
      <circle cx="32" cy="15" r="1.5" fill="#FFF9C4" />

      <circle cx="43" cy="21" r="7" fill="#F8FAFC" stroke="#ECEFF1" strokeWidth="1.5" />
      <circle cx="43" cy="21" r="4.5" fill="#E2E8F0" />
      <circle cx="43" cy="20" r="1" fill="#4CAF50" />

      {/* Center: 2 Golden Puffed Rotis Layered */}
      <g filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))">
        <circle cx="28" cy="38" r="10" fill="url(#rotiGrad2)" stroke="#FF8F00" strokeWidth="1.2" />
        <circle cx="36" cy="38" r="9.5" fill="url(#rotiGrad2)" stroke="#FF8F00" strokeWidth="1.2" />
        <circle cx="36" cy="36" r="1" fill="#B26A00" />
        <circle cx="28" cy="39" r="1.2" fill="#B26A00" />
      </g>
    </svg>
  );
}

// 3. Modern Dum Biryani Icon (Clay Handi with Saffron Rice & Garnish)
export function BiryaniIcon({ className = "w-7 h-7" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="potGrad" x1="16" y1="28" x2="48" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A0522D" />
          <stop offset="60%" stopColor="#8B4513" />
          <stop offset="100%" stopColor="#5C2E0B" />
        </linearGradient>
        <radialGradient id="riceGrad" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#FFFDE7" />
          <stop offset="40%" stopColor="#FFE082" />
          <stop offset="80%" stopColor="#FFB300" />
          <stop offset="100%" stopColor="#FF8F00" />
        </radialGradient>
      </defs>

      <path d="M16 34C16 47 23 54 32 54C41 54 48 47 48 34H16Z" fill="url(#potGrad)" />
      <path d="M14 31C14 29 22 28 32 28C42 28 50 29 50 31C50 33 42 34 32 34C22 34 14 33 14 31Z" fill="#D27D2D" />

      <path d="M18 31C18 19 25 15 32 15C39 15 46 19 46 31H18Z" fill="url(#riceGrad)" />

      <ellipse cx="30" cy="22" rx="2.5" ry="1" fill="#FFFFFF" transform="rotate(-15 30 22)" />
      <ellipse cx="36" cy="23" rx="2.5" ry="1" fill="#FFF8E1" transform="rotate(20 36 23)" />
      <ellipse cx="27" cy="27" rx="3" ry="1.2" fill="#FFFFFF" transform="rotate(10 27 27)" />
      <ellipse cx="35" cy="28" rx="2.8" ry="1" fill="#FFE082" transform="rotate(-25 35 28)" />

      <path d="M29 18C31 16 33 16 35 18" stroke="#6D4C41" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 14C34 12 36 14 34 17C32 15 31 14 32 14Z" fill="#43A047" />
      <path d="M14 30C18 32 46 32 50 30" stroke="#FFE0B2" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// 4. Modern Artisan Pizza Icon (Stone-Baked Slice with Toppings)
export function PizzaIcon({ className = "w-7 h-7" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="crustGrad" x1="12" y1="12" x2="52" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D78A2A" />
          <stop offset="50%" stopColor="#C4731A" />
          <stop offset="100%" stopColor="#9E560B" />
        </linearGradient>
        <linearGradient id="cheeseGrad" x1="32" y1="16" x2="32" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF176" />
          <stop offset="40%" stopColor="#FFD54F" />
          <stop offset="100%" stopColor="#FFB300" />
        </linearGradient>
      </defs>

      <path d="M12 16L32 55L52 16C40 13 24 13 12 16Z" fill="url(#cheeseGrad)" stroke="#E65100" strokeWidth="1.5" />
      <path d="M10 15C22 11 42 11 54 15C55 17 53 20 50 20C40 16 24 16 14 20C11 20 9 17 10 15Z" fill="url(#crustGrad)" />

      <rect x="28" y="24" width="7" height="6" rx="1.5" fill="#FFFDE7" stroke="#FFB300" strokeWidth="1" />
      <rect x="22" y="34" width="6" height="5" rx="1.5" fill="#FFFDE7" stroke="#FFB300" strokeWidth="1" />
      <rect x="34" y="36" width="6" height="5" rx="1.5" fill="#FFFDE7" stroke="#FFB300" strokeWidth="1" />

      <path d="M22 23C24 20 27 22 26 25" stroke="#BA68C8" strokeWidth="2" strokeLinecap="round" />
      <path d="M38 26C41 24 43 27 41 30" stroke="#BA68C8" strokeWidth="2" strokeLinecap="round" />

      <circle cx="26" cy="30" r="1.2" fill="#43A047" />
      <circle cx="36" cy="32" r="1.2" fill="#43A047" />
      <circle cx="32" cy="56" r="2.5" fill="#FFD54F" />
    </svg>
  );
}

// 5. Authentic Indian Veg & Non-Veg Certification Badges
export function FoodClassBadge({ isVeg, size = "md" }) {
  const dim = size === "sm" ? "w-3.5 h-3.5 p-0.5" : "w-4 h-4 p-0.5";
  return (
    <div
      className={`${dim} rounded-md border flex items-center justify-center ${
        isVeg
          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
          : 'border-rose-500 bg-rose-950/40 text-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.2)]'
      }`}
      title={isVeg ? "100% Pure Vegetarian" : "Non-Vegetarian"}
    >
      {isVeg ? (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10B981]" />
      ) : (
        <span className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[6px] border-b-rose-500 shadow-[0_0_6px_#F43F5E]" />
      )}
    </div>
  );
}

// 6. Luxury Roti / Indian Bread Icon (Golden Stack of Tandoori Roti with Butter & Steam)
export function RotiBreadIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rotiStackGrad" x1="8" y1="16" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF9C4" />
          <stop offset="45%" stopColor="#FFD54F" />
          <stop offset="85%" stopColor="#FFB300" />
          <stop offset="100%" stopColor="#E65100" />
        </linearGradient>
        <linearGradient id="butterGlow" x1="20" y1="20" x2="30" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#FFF59D" />
          <stop offset="100%" stopColor="#FFD54F" />
        </linearGradient>
      </defs>

      {/* Steam lines */}
      <path d="M18 10C17 7 20 5 19 2" stroke="#FFB74D" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
      <path d="M24 11C23 8 26 6 25 3" stroke="#FFB74D" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
      <path d="M30 10C29 7 32 5 31 2" stroke="#FFB74D" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />

      {/* Bottom Roti 3 */}
      <ellipse cx="24" cy="36" rx="16" ry="6" fill="#C67100" opacity="0.9" />
      <ellipse cx="24" cy="35" rx="16" ry="5.5" fill="#E65100" />

      {/* Middle Roti 2 */}
      <ellipse cx="24" cy="30" rx="17" ry="6.5" fill="#D78A2A" />
      <ellipse cx="24" cy="29" rx="17" ry="6" fill="#FFA000" />

      {/* Top Roti 1 */}
      <ellipse cx="24" cy="23" rx="17" ry="7" fill="url(#rotiStackGrad)" stroke="#FFA000" strokeWidth="1" />

      {/* Golden Toast Char Marks */}
      <circle cx="16" cy="22" r="1.4" fill="#8D4004" />
      <circle cx="21" cy="25" r="1.1" fill="#8D4004" />
      <circle cx="32" cy="21" r="1.3" fill="#8D4004" />
      <circle cx="28" cy="26" r="1" fill="#8D4004" />

      {/* Melted Butter Pat & Gloss */}
      <ellipse cx="24" cy="21" rx="4" ry="2.2" fill="url(#butterGlow)" />
      <ellipse cx="23.5" cy="20.5" rx="1.5" ry="0.8" fill="#FFFFFF" opacity="0.9" />
    </svg>
  );
}

// 7. Modern Kathi Roll / Frankie Wrap Icon (Crispy Paratha Roll with Fillings)
export function RollIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rollCrust" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE082" />
          <stop offset="50%" stopColor="#FFB300" />
          <stop offset="100%" stopColor="#E65100" />
        </linearGradient>
        <linearGradient id="foilGrad" x1="8" y1="24" x2="32" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ECEFF1" />
          <stop offset="50%" stopColor="#B0BEC5" />
          <stop offset="100%" stopColor="#78909C" />
        </linearGradient>
      </defs>

      {/* Slanted Roll Body */}
      <g transform="rotate(-30 24 24)">
        {/* Roll cylinder */}
        <rect x="16" y="8" width="16" height="32" rx="8" fill="url(#rollCrust)" stroke="#FF8F00" strokeWidth="1.2" />
        
        {/* Silver foil wrapper on bottom half */}
        <path d="M16 22H32V36C32 40.4183 28.4183 44 24 44C19.5817 44 16 40.4183 16 36V22Z" fill="url(#foilGrad)" />
        <path d="M16 26L32 24M16 32L32 30" stroke="#CFD8DC" strokeWidth="1" strokeDasharray="2 2" />

        {/* Top Open Filling */}
        <ellipse cx="24" cy="8" rx="8" ry="4" fill="#C62828" />
        <circle cx="21" cy="7.5" r="1.5" fill="#4CAF50" />
        <circle cx="25" cy="8.5" r="1.8" fill="#FFF" />
        <circle cx="27" cy="7" r="1.2" fill="#FFA000" />

        {/* Toast grill stripes */}
        <path d="M19 14L29 14M18 18L30 18" stroke="#BF360C" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// 8. Modern Rice Bowl / Biryani Combos Icon (Steaming Basmati Bowl)
export function RiceBowlIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bowlGrad" x1="10" y1="20" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#37474F" />
          <stop offset="100%" stopColor="#212121" />
        </linearGradient>
        <linearGradient id="riceMound" x1="12" y1="12" x2="36" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#FFF9C4" />
          <stop offset="100%" stopColor="#FFE082" />
        </linearGradient>
      </defs>

      {/* Steam lines */}
      <path d="M20 8C19 5 22 3 21 1" stroke="#FFB74D" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M28 9C27 6 30 4 29 2" stroke="#FFB74D" strokeWidth="1.5" strokeLinecap="round" />

      {/* Mound of Basmati Rice */}
      <path d="M12 22C12 14 18 10 24 10C30 10 36 14 36 22H12Z" fill="url(#riceMound)" />

      {/* Individual Grains & Peas */}
      <ellipse cx="20" cy="16" rx="2" ry="0.8" fill="#4CAF50" transform="rotate(-15 20 16)" />
      <ellipse cx="28" cy="15" rx="2.2" ry="0.9" fill="#FFA000" transform="rotate(20 28 15)" />
      <ellipse cx="24" cy="18" rx="2" ry="0.8" fill="#4CAF50" />
      <ellipse cx="17" cy="19" rx="2.5" ry="1" fill="#FFFFFF" transform="rotate(30 17 19)" />

      {/* Ceramic Bowl */}
      <path d="M8 22C8 34 16 42 24 42C32 42 40 34 40 22H8Z" fill="url(#bowlGrad)" stroke="#FF7043" strokeWidth="1.5" />
      <ellipse cx="24" cy="22" rx="16" ry="3.5" fill="#263238" />

      {/* Chopsticks / Spoon */}
      <line x1="12" y1="6" x2="34" y2="28" stroke="#FFA000" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 9. Luxury Cloche Platter Icon ("All Dishes" Tab in Search)
export function AllDishesIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="clocheGrad" x1="4" y1="6" x2="20" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFA726" />
          <stop offset="60%" stopColor="#FF7043" />
          <stop offset="100%" stopColor="#D84315" />
        </linearGradient>
      </defs>
      {/* Knob */}
      <circle cx="12" cy="5" r="1.5" fill="#FFE082" />
      {/* Dome */}
      <path d="M4 16C4 10.5 7.5 6.5 12 6.5C16.5 6.5 20 10.5 20 16H4Z" fill="url(#clocheGrad)" />
      {/* Platter Rim */}
      <rect x="2" y="16" width="20" height="2" rx="1" fill="#FFE082" />
      <path d="M7 19H17" stroke="#FF7043" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// 10. Luxury Botanical Leaf Icon ("Pure Veg" Tab in Search & Filters)
export function PureVegTabIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vegLeafGrad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="60%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>
      <path
        d="M20.5 3.5C20.5 3.5 13 4 8.5 8.5C4 13 3.5 20.5 3.5 20.5C3.5 20.5 11 20 15.5 15.5C20 11 20.5 3.5 20.5 3.5Z"
        fill="url(#vegLeafGrad)"
      />
      <path
        d="M8.5 15.5L14 10"
        stroke="#ECFDF5"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="9" stroke="#10B981" strokeWidth="1.2" strokeOpacity="0.4" />
    </svg>
  );
}

// 11. Luxury Flame Drumstick Icon ("Non-Veg" Tab in Search & Filters)
export function NonVegTabIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="meatGrad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="50%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#BE123C" />
        </linearGradient>
      </defs>
      {/* Chicken Drumstick */}
      <path
        d="M17.5 4.5C15 2 10.5 3 8.5 5.5C7.2 7.1 7.2 9.2 8 11L6 13C4.8 14.2 4.8 16.2 6 17.4C7.2 18.6 9.2 18.6 10.4 17.4L12.4 15.4C14.2 16.2 16.3 16.2 17.9 14.9C20.4 12.9 21.4 8.4 18.9 5.9L17.5 4.5Z"
        fill="url(#meatGrad)"
      />
      {/* Bone */}
      <circle cx="5" cy="18.5" r="1.5" fill="#FFE4E6" />
      <circle cx="6.5" cy="20" r="1.5" fill="#FFE4E6" />
      {/* Flame Sparkle */}
      <path d="M15 7C14 8.5 14 10 15 11" stroke="#FFF1F2" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// 12. Luxury Gold Coin Cashback Icon (₹3 Wallet Rewards)
export function CashbackCoinIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="coinGrad" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#FFF9C4" />
          <stop offset="40%" stopColor="#FFD54F" />
          <stop offset="85%" stopColor="#FFA000" />
          <stop offset="100%" stopColor="#FF6F00" />
        </radialGradient>
      </defs>
      {/* Outer Coin Ring */}
      <circle cx="16" cy="16" r="14" fill="url(#coinGrad)" stroke="#FFA000" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="11.5" stroke="#FFE082" strokeWidth="1" strokeDasharray="2 2" />
      {/* Rupee Symbol ₹ */}
      <path
        d="M13 10H19M13 13.5H18M13 10V18C14.5 18 16.5 17.5 16.5 15C16.5 12.5 14.5 12.5 13 12.5M15.5 18L19 22"
        stroke="#5D3400"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 13. Express Campus Delivery Icon (Lightning Fast Runner)
export function ExpressDeliveryIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="boltGrad" x1="8" y1="4" x2="24" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFB74D" />
          <stop offset="50%" stopColor="#FF7043" />
          <stop offset="100%" stopColor="#E64A19" />
        </linearGradient>
      </defs>
      {/* Speed lines */}
      <path d="M4 12H9M2 16H8M4 20H10" stroke="#FF7043" strokeWidth="2" strokeLinecap="round" />
      {/* Lightning Bolt */}
      <path
        d="M19 3L11 16H18L14 29L26 14H18L21 3H19Z"
        fill="url(#boltGrad)"
        stroke="#FFB74D"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 14. Master Chef Hat & Laurel Icon (100% Homestyle Quality)
export function MasterChefIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hatGrad" x1="8" y1="6" x2="24" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#F5F5F5" />
          <stop offset="100%" stopColor="#E0E0E0" />
        </linearGradient>
      </defs>
      {/* Puffed Chef Hat */}
      <path
        d="M10 16C8 16 6 14 6 11.5C6 9 8 7 10 7.5C11 5 13.5 3 16 3C18.5 3 21 5 22 7.5C24 7 26 9 26 11.5C26 14 24 16 22 16H10Z"
        fill="url(#hatGrad)"
        stroke="#FFA000"
        strokeWidth="1.2"
      />
      {/* Hat Base Band */}
      <rect x="9" y="16" width="14" height="6" rx="1.5" fill="#FF7043" />
      <path d="M12 18H20" stroke="#FFE082" strokeWidth="1" strokeLinecap="round" />
      {/* Gold Laurels */}
      <path d="M6 26C8 28 13 29 16 29C19 29 24 28 26 26" stroke="#FFA000" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 15. Luxury Storefront / Outlet Kiosk Icon (Jhungiya Outlet Counter)
export function StorefrontIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="awningOrange" x1="8" y1="12" x2="40" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF7043" />
          <stop offset="100%" stopColor="#E64A19" />
        </linearGradient>
      </defs>
      {/* Awning Stripes */}
      <path d="M6 14L10 24H38L42 14H6Z" fill="url(#awningOrange)" />
      <path d="M14 14L16 24M22 14L23 24M30 14L30 24M36 14L34 24" stroke="#FFF" strokeWidth="1.5" opacity="0.6" />
      {/* Scalloped edge */}
      <path d="M6 24C8 26 12 26 14 24C16 26 20 26 22 24C24 26 28 26 30 24C32 26 36 26 38 24" stroke="#FFA000" strokeWidth="2" />
      {/* Counter Body */}
      <rect x="10" y="24" width="28" height="18" rx="2" fill="#1E1E1E" stroke="#FF7043" strokeWidth="1.5" />
      {/* Window / Counter Glass */}
      <rect x="14" y="27" width="20" height="9" rx="1.5" fill="#FFB74D" fillOpacity="0.2" stroke="#FF9800" strokeWidth="1" />
      {/* Serving Shelf */}
      <line x1="12" y1="36" x2="36" y2="36" stroke="#FFE082" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 16. Luxury Modern Nav Icons (Home, Search, Outlet, Profile)
export function NavHomeIcon({ className = "w-5 h-5", active = false }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H15V15C15 14.4477 14.5523 14 14 14H10C9.44772 14 9 14.4477 9 15V21H4C3.44772 21 3 20.5523 3 20V10.5Z"
        fill={active ? "url(#navHomeGrad)" : "none"}
        stroke={active ? "#FF5722" : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="navHomeGrad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF7043" />
          <stop offset="100%" stopColor="#C62828" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function NavSearchIcon({ className = "w-5 h-5", active = false }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="11"
        cy="11"
        r="7.5"
        fill={active ? "#FF5722" : "none"}
        fillOpacity={active ? "0.2" : "0"}
        stroke={active ? "#FF5722" : "currentColor"}
        strokeWidth="2.2"
      />
      <path
        d="M20 20L16.5 16.5"
        stroke={active ? "#FF5722" : "currentColor"}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {active && <circle cx="11" cy="11" r="2.5" fill="#FF5722" />}
    </svg>
  );
}

export function NavOutletIcon({ className = "w-5 h-5", active = false }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 8L5 4H19L21 8V19C21 19.5523 20.5523 20 20 20H4C3.44772 20 3 19.5523 3 19V8Z"
        fill={active ? "url(#navOutletGrad)" : "none"}
        stroke={active ? "#FF5722" : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 8H21"
        stroke={active ? "#FFE082" : "currentColor"}
        strokeWidth="2"
      />
      <path
        d="M9 13H15"
        stroke={active ? "#FFF" : "currentColor"}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="navOutletGrad" x1="3" y1="4" x2="21" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF7043" />
          <stop offset="100%" stopColor="#C62828" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function NavProfileIcon({ className = "w-5 h-5", active = false }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="12"
        cy="7.5"
        r="4"
        fill={active ? "#FF5722" : "none"}
        fillOpacity={active ? "0.25" : "0"}
        stroke={active ? "#FF5722" : "currentColor"}
        strokeWidth="2"
      />
      <path
        d="M4.5 20C4.5 16.5 8 14.5 12 14.5C16 14.5 19.5 16.5 19.5 20"
        fill={active ? "url(#navProfGrad)" : "none"}
        stroke={active ? "#FF5722" : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="navProfGrad" x1="4.5" y1="14.5" x2="19.5" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF7043" />
          <stop offset="100%" stopColor="#C62828" />
        </linearGradient>
      </defs>
    </svg>
  );
}
