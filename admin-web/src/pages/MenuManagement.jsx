import React, { useState, useEffect } from 'react';
import {
  Utensils,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Upload,
  Eye,
  History,
  Search,
  Check,
  X,
  TrendingUp,
  Percent,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';

const BASE_CATEGORIES = [
  'Curry',
  'Thali',
  'Biryani',
  'Pizza',
  'Outlet Special',
  'Breads',
  'Rice',
  'Rolls'
];

export default function MenuManagement() {
  const [activeTab, setActiveTab] = useState('CATALOG'); // 'CATALOG' | 'CSV_UPLOAD'
  const [menuItems, setMenuItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterStock, setFilterStock] = useState('ALL'); // 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK'
  const [filterDiet, setFilterDiet] = useState('ALL'); // 'ALL' | 'VEG' | 'NON_VEG'

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [savingItem, setSavingItem] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Curry',
    customer_price: '',
    vendor_cost: '',
    is_veg: true,
    is_outlet_only: false,
    image_url: '',
    description: ''
  });

  // CSV State
  const [csvText, setCsvText] = useState('');
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [audits, setAudits] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Alert Banners
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Dynamically computed categories based on items in database
  const availableCategories = React.useMemo(() => {
    const set = new Set(BASE_CATEGORIES);
    menuItems.forEach(i => {
      if (i.category && typeof i.category === 'string') {
        set.add(i.category.trim());
      }
    });
    return Array.from(set);
  }, [menuItems]);

  const filterCategoryTabs = React.useMemo(() => {
    return ['All', ...availableCategories];
  }, [availableCategories]);

  const showNotification = (msg, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  const fetchMenuItems = async () => {
    try {
      setLoadingItems(true);
      setErrorMsg('');

      // Step 1: Attempt primary admin catalog endpoint
      try {
        const res = await fetch('/api/menu/admin-all', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.items) && data.items.length > 0) {
            setMenuItems(data.items);
            return;
          }
        }
      } catch (adminErr) {
        console.warn('Admin menu endpoint failed, trying fallback...', adminErr);
      }

      // Step 2: Fallback to public endpoints (/api/menu and /api/menu/outlet)
      const [pubRes, outletRes] = await Promise.allSettled([
        fetch('/api/menu', { credentials: 'include' }),
        fetch('/api/menu/outlet', { credentials: 'include' })
      ]);

      let allItems = [];
      if (pubRes.status === 'fulfilled' && pubRes.value.ok) {
        const pubData = await pubRes.value.json();
        if (pubData.success && pubData.menu) {
          if (Array.isArray(pubData.menu.All) && pubData.menu.All.length > 0) {
            allItems.push(...pubData.menu.All);
          } else {
            Object.keys(pubData.menu).forEach(key => {
              if (Array.isArray(pubData.menu[key])) {
                allItems.push(...pubData.menu[key]);
              }
            });
          }
        }
      }

      if (outletRes.status === 'fulfilled' && outletRes.value.ok) {
        const outData = await outletRes.value.json();
        if (outData.success && Array.isArray(outData.items)) {
          allItems.push(...outData.items);
        }
      }

      // Deduplicate items by ID
      const itemMap = new Map();
      allItems.forEach(item => {
        if (!itemMap.has(item.id)) {
          const custPrice = parseFloat(item.customer_price || 0);
          const vendCost = parseFloat(item.vendor_cost !== undefined ? item.vendor_cost : (custPrice * 0.8));
          itemMap.set(item.id, {
            ...item,
            customer_price: custPrice,
            vendor_cost: vendCost,
            margin: parseFloat((custPrice - vendCost).toFixed(2)),
            margin_percent: custPrice > 0 ? parseFloat((((custPrice - vendCost) / custPrice) * 100).toFixed(1)) : 0,
            is_veg: !!item.is_veg,
            is_available: item.is_available !== undefined ? !!item.is_available : true,
            is_outlet_only: !!item.is_outlet_only
          });
        }
      });

      if (itemMap.size > 0) {
        setMenuItems(Array.from(itemMap.values()));
      }
    } catch (e) {
      console.error('Fetch menu items error:', e);
      showNotification('Failed to load menu items: ' + e.message, true);
    } finally {
      setLoadingItems(false);
    }
  };

  const loadAudits = async () => {
    try {
      const res = await fetch('/api/menu/audits', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setAudits(data.audits || []);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchMenuItems();
    loadAudits();
  }, []);

  // 1. Toggle Item Availability Switch
  const handleToggleStock = async (item) => {
    const prevStatus = item.is_available;
    // Optimistic update
    setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: !prevStatus } : i));

    try {
      const res = await fetch(`/api/menu/item/${item.id}/toggle-availability`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update stock status');
      }
      showNotification(`"${item.name}" is now ${data.is_available ? 'IN STOCK' : 'OUT OF STOCK'}`);
    } catch (err) {
      // Revert on error
      setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: prevStatus } : i));
      showNotification(err.message, true);
    }
  };

  // 2. Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      name: '',
      category: 'Curry',
      customer_price: '',
      vendor_cost: '',
      is_veg: true,
      is_outlet_only: false,
      image_url: '',
      description: ''
    });
    setIsAddModalOpen(true);
  };

  // 3. Open Edit Modal
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      customer_price: String(item.customer_price),
      vendor_cost: String(item.vendor_cost),
      is_veg: item.is_veg,
      is_outlet_only: item.is_outlet_only,
      image_url: item.image_url || '',
      description: item.description || ''
    });
  };

  // 4. Submit Create or Update
  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.customer_price || !formData.vendor_cost) {
      showNotification('Please fill in Dish Name, Selling Price, and Vendor Cost.', true);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      customer_price: parseFloat(formData.customer_price),
      vendor_cost: parseFloat(formData.vendor_cost),
      is_veg: formData.is_veg,
      is_outlet_only: formData.is_outlet_only,
      image_url: formData.image_url ? formData.image_url.trim() : null,
      description: formData.description ? formData.description.trim() : null
    };

    try {
      setSavingItem(true);
      let res;
      if (editingItem) {
        res = await fetch(`/api/menu/item/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/menu/item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to save menu item');
      }

      showNotification(data.message || 'Menu item saved successfully!');
      setIsAddModalOpen(false);
      setEditingItem(null);
      await fetchMenuItems();
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setSavingItem(false);
    }
  };

  // 5. Delete Item
  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    try {
      const res = await fetch(`/api/menu/item/${deletingItem.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete dish');
      }
      showNotification(data.message || 'Dish removed from menu');
      setDeletingItem(null);
      await fetchMenuItems();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // CSV Helpers
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        setCsvText(text);
        runLocalValidationPreview(text);
      };
      reader.readAsText(selected);
    }
  };

  const runLocalValidationPreview = (text) => {
    try {
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) return;

      const previewRows = [];
      for (let i = 1; i < Math.min(lines.length, 30); i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        const name = cols[0];
        const vendor = parseFloat(cols[1]);
        const customer = parseFloat(cols[2]);

        if (name && !isNaN(vendor) && !isNaN(customer)) {
          previewRows.push({
            name,
            vendor_cost: vendor,
            customer_price: customer,
            margin: customer - vendor
          });
        }
      }
      setPreviewData({ rows: previewRows, totalLines: lines.length - 1 });
      setErrorMsg('');
    } catch (e) {
      setErrorMsg('Failed to generate preview. Check CSV formatting.');
    }
  };

  const handleUploadSubmit = async () => {
    if (!csvText && !file) {
      showNotification('Please select a CSV file or paste CSV text.', true);
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      } else {
        formData.append('csv_text', csvText);
      }

      const res = await fetch('/api/menu/upload-csv', {
        method: 'POST',
        body: file ? formData : JSON.stringify({ csv_text: csvText }),
        headers: file ? undefined : { 'Content-Type': 'application/json' }
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Menu upload failed.');
      }

      showNotification(data.message);
      setPreviewData(null);
      setFile(null);
      setCsvText('');
      await loadAudits();
      await fetchMenuItems();
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setUploading(false);
    }
  };

  // Filtered menu items
  const filteredItems = menuItems.filter(item => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    if (filterStock === 'IN_STOCK' && !item.is_available) return false;
    if (filterStock === 'OUT_OF_STOCK' && item.is_available) return false;
    if (filterDiet === 'VEG' && !item.is_veg) return false;
    if (filterDiet === 'NON_VEG' && item.is_veg) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalInStock = menuItems.filter(i => i.is_available).length;
  const totalOutOfStock = menuItems.filter(i => !i.is_available).length;
  const avgMargin = menuItems.length > 0
    ? (menuItems.reduce((acc, i) => acc + (i.margin_percent || 0), 0) / menuItems.length).toFixed(1)
    : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Page Title & Tab Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Utensils className="w-6 h-6 text-[#FF5722]" />
            <span>2 Roti Menu & Inventory Central</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time dish price editing, margin optimization, 1-click in-stock toggle, and bulk CSV uploader.
          </p>
        </div>

        {/* Top-Level Tabs */}
        <div className="flex items-center gap-1.5 bg-[#111827] p-1.5 rounded-2xl border border-slate-800 shadow-inner">
          <button
            onClick={() => setActiveTab('CATALOG')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'CATALOG'
                ? 'bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white shadow-[0_4px_12px_rgba(255,87,34,0.35)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Live Catalog ({menuItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('CSV_UPLOAD')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'CSV_UPLOAD'
                ? 'bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white shadow-[0_4px_12px_rgba(255,87,34,0.35)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Bulk CSV / Audits</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-200 flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')}><X className="w-3.5 h-3.5 opacity-60" /></button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800 text-xs text-rose-200 flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-bold">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')}><X className="w-3.5 h-3.5 opacity-60" /></button>
        </div>
      )}

      {/* ──────────────── TAB 1: LIVE CATALOG & STOCK EDITOR ──────────────── */}
      {activeTab === 'CATALOG' && (
        <div className="space-y-5">
          
          {/* Metrics Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Catalog Dishes</div>
              <div className="text-xl font-black text-white mt-1">{menuItems.length}</div>
            </div>
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5">
              <div className="text-[10px] uppercase font-bold text-emerald-400">In Stock (Available)</div>
              <div className="text-xl font-black text-emerald-400 mt-1">{totalInStock}</div>
            </div>
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5">
              <div className="text-[10px] uppercase font-bold text-rose-400">Out of Stock</div>
              <div className="text-xl font-black text-rose-400 mt-1">{totalOutOfStock}</div>
            </div>
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5">
              <div className="text-[10px] uppercase font-bold text-amber-400">Avg Platform Margin</div>
              <div className="text-xl font-black text-amber-400 mt-1">{avgMargin}%</div>
            </div>
          </div>

          {/* Controls Bar: Search, Category Pills, Filters, Add Button */}
          <div className="bg-[#111827] border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dishes, curries, pizzas..."
                  className="w-full bg-[#18202F] border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722] transition-colors"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={fetchMenuItems}
                  className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Refresh Menu"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingItems ? 'animate-spin text-[#FF5722]' : ''}`} />
                </button>

                <button
                  onClick={handleOpenAdd}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_4px_16px_rgba(255,87,34,0.35)] active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Add New Dish</span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {filterCategoryTabs.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#FF5722] text-white shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sub-filters: Stock and Dietary */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Stock:</span>
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'IN_STOCK', label: 'In Stock' },
                  { id: 'OUT_OF_STOCK', label: 'Out of Stock' }
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setFilterStock(s.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                      filterStock === s.id
                        ? 'bg-slate-200 text-slate-900'
                        : 'bg-slate-800/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}

                <span className="text-slate-600 px-1">•</span>

                <span className="text-[11px] font-bold text-slate-400 uppercase">Diet:</span>
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'VEG', label: 'Veg' },
                  { id: 'NON_VEG', label: 'Non-Veg' }
                ].map(d => (
                  <button
                    key={d.id}
                    onClick={() => setFilterDiet(d.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                      filterDiet === d.id
                        ? 'bg-slate-200 text-slate-900'
                        : 'bg-slate-800/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              <span className="text-[11px] text-slate-400">
                Showing <strong>{filteredItems.length}</strong> of {menuItems.length} dishes
              </span>
            </div>
          </div>

          {/* Dishes Table */}
          <div className="bg-[#111827] border border-slate-800 rounded-3xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px] font-black">
                    <th className="py-3 px-4">Dish & Details</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Vendor Cost</th>
                    <th className="py-3 px-3">Selling Price</th>
                    <th className="py-3 px-3">Margin</th>
                    <th className="py-3 px-3 text-center">Live Stock Switch</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {loadingItems ? (
                    <tr>
                      <td colSpan="8" className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <RefreshCw className="w-8 h-8 text-[#FF5722] animate-spin" />
                          <p className="font-bold text-sm text-white">Loading Live Menu & Inventory...</p>
                          <p className="text-xs text-slate-500">Querying SQLite database dishes & pricing</p>
                        </div>
                      </td>
                    </tr>
                  ) : menuItems.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <AlertTriangle className="w-8 h-8 text-amber-500" />
                          <p className="font-bold text-sm text-white">No dishes detected in catalog</p>
                          <p className="text-xs text-slate-500 max-w-sm">
                            Click below to re-fetch dishes from the API server or add a new menu item.
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={fetchMenuItems}
                              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Retry Fetch</span>
                            </button>
                            <button
                              onClick={handleOpenAdd}
                              className="px-4 py-2 rounded-xl bg-[#FF5722] hover:bg-[#E64A19] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add New Dish</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <p>No dishes found matching your current filter criteria.</p>
                          <button
                            onClick={() => {
                              setSelectedCategory('All');
                              setFilterStock('ALL');
                              setFilterDiet('ALL');
                              setSearchQuery('');
                            }}
                            className="text-xs font-bold text-[#FF5722] hover:underline"
                          >
                            Reset filters to view all {menuItems.length} dishes
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => {
                      const isProfitPositive = item.margin >= 0;
                      return (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                          
                          {/* Dish Name & Veg/Non-Veg Tag */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0 bg-slate-800"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                                  <Utensils className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                                  <span>{item.name}</span>
                                  {item.is_outlet_only && (
                                    <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.2 rounded font-bold uppercase">
                                      Outlet Only
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <div className="text-[10px] text-slate-400 truncate max-w-xs">{item.description}</div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-bold text-[10px]">
                              {item.category}
                            </span>
                          </td>

                          {/* Veg / Non-Veg */}
                          <td className="py-3 px-3">
                            {item.is_veg ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-lg">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>Pure Veg</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded-lg">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                <span>Non-Veg</span>
                              </span>
                            )}
                          </td>

                          {/* Vendor Cost */}
                          <td className="py-3 px-3 font-mono text-slate-300 font-semibold">
                            ₹{item.vendor_cost.toFixed(2)}
                          </td>

                          {/* Customer Price */}
                          <td className="py-3 px-3 font-mono text-white font-bold">
                            ₹{item.customer_price.toFixed(2)}
                          </td>

                          {/* Margin */}
                          <td className="py-3 px-3">
                            <div className="font-mono font-bold text-xs flex items-center gap-1">
                              <span className={isProfitPositive ? 'text-emerald-400' : 'text-rose-400'}>
                                {isProfitPositive ? '+' : ''}₹{item.margin.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-500 font-normal">
                                ({item.margin_percent}%)
                              </span>
                            </div>
                          </td>

                          {/* Stock Switch */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleToggleStock(item)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${
                                item.is_available
                                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/80 hover:bg-emerald-900/60'
                                  : 'bg-rose-950/80 text-rose-400 border border-rose-700/80 hover:bg-rose-900/60'
                              }`}
                              title="Click to toggle availability"
                            >
                              <span className={`w-2 h-2 rounded-full ${item.is_available ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                              <span>{item.is_available ? 'In Stock' : 'Out of Stock'}</span>
                            </button>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                                title="Edit Dish Details & Price"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setDeletingItem(item)}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 transition-colors"
                                title="Delete Dish"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ──────────────── TAB 2: BULK CSV UPLOAD & AUDIT TRAIL ──────────────── */}
      {activeTab === 'CSV_UPLOAD' && (
        <div className="space-y-6">
          
          {/* Upload Box */}
          <div className="bg-[#111827] border-2 border-dashed border-slate-700 hover:border-[#FF5722] rounded-3xl p-6 sm:p-8 text-center transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-[#FF5722]/20 text-[#FF5722] flex items-center justify-center mx-auto mb-3 shadow-md">
              <Upload className="w-7 h-7" />
            </div>

            <h3 className="text-sm font-bold text-white">Upload Outlet Menu CSV/XLSX</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Expected format: <code>Items, Deal with Vendor, Customer Price</code>. Prices and categories will be synced.
            </p>

            <label className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#FF5722] hover:bg-[#F4511E] text-white text-xs font-bold cursor-pointer transition-colors shadow-lg">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Choose CSV File</span>
              <input type="file" accept=".csv,.txt" onChange={handleFileChange} className="hidden" />
            </label>

            {file && (
              <div className="mt-3 text-xs text-slate-300 font-semibold">
                Selected: <span className="text-[#FF7043]">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          {/* Live Preview Table */}
          {previewData && (
            <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#FF5722]" />
                  <span>Parsed Preview ({previewData.rows.length} sample items)</span>
                </h3>
                <span className="text-xs text-slate-400">Total lines: {previewData.totalLines}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800 pb-2">
                      <th className="pb-2 font-bold">Item Name</th>
                      <th className="pb-2 font-bold">Vendor Cost (Deal)</th>
                      <th className="pb-2 font-bold">Customer Selling Price</th>
                      <th className="pb-2 font-bold">Platform Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {previewData.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-2 font-bold text-white">{row.name}</td>
                        <td className="py-2 text-slate-300 font-mono">₹{row.vendor_cost.toFixed(2)}</td>
                        <td className="py-2 text-emerald-400 font-mono font-bold">₹{row.customer_price.toFixed(2)}</td>
                        <td className="py-2 text-orange-400 font-mono font-semibold">+₹{row.margin.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleUploadSubmit}
                  disabled={uploading}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{uploading ? 'Validating & Syncing...' : 'Confirm & Commit Changes to DB'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Audit Trail History */}
          <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg">
            <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-[#FF5722]" />
              <span>Upload Audit Logs & Price History</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800 pb-2">
                    <th className="pb-2 font-bold">Audit ID</th>
                    <th className="pb-2 font-bold">Filename</th>
                    <th className="pb-2 font-bold">Added / Updated</th>
                    <th className="pb-2 font-bold">Uploaded By</th>
                    <th className="pb-2 font-bold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {audits.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-slate-500">
                        No menu upload audits recorded yet.
                      </td>
                    </tr>
                  ) : (
                    audits.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 font-bold text-slate-300">#AUDIT-{a.id}</td>
                        <td className="py-2.5 font-mono text-slate-200">{a.filename}</td>
                        <td className="py-2.5">
                          <span className="text-emerald-400 font-bold">+{a.items_added} added</span>,{' '}
                          <span className="text-blue-400 font-bold">{a.items_updated} updated</span>
                        </td>
                        <td className="py-2.5 text-slate-300">{a.uploaded_by || 'Super Admin'}</td>
                        <td className="py-2.5 text-slate-400 text-[11px]">
                          {new Date(a.uploaded_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ──────────────── MODAL: ADD / EDIT DISH ──────────────── */}
      {(isAddModalOpen || editingItem) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161F30] border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingItem(null);
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-lg font-black text-white flex items-center gap-2 mb-1">
              <Utensils className="w-5 h-5 text-[#FF5722]" />
              <span>{editingItem ? 'Edit Dish & Price' : 'Add New Dish to Catalog'}</span>
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Set customer selling price, vendor cost, and category. Margins update live.
            </p>

            <form onSubmit={handleSaveItem} className="space-y-4">
              
              {/* Dish Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Special Paneer Handi"
                  className="w-full bg-[#111827] border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
                />
              </div>

              {/* Category & Diet Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-[#111827] border border-slate-700 rounded-2xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5722]"
                  >
                    {availableCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Dietary Classification</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_veg: true })}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        formData.is_veg
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-600'
                          : 'bg-[#111827] text-slate-400 border-slate-700'
                      }`}
                    >
                      Veg
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_veg: false })}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        !formData.is_veg
                          ? 'bg-rose-950 text-rose-400 border-rose-600'
                          : 'bg-[#111827] text-slate-400 border-slate-700'
                      }`}
                    >
                      Non-Veg
                    </button>
                  </div>
                </div>
              </div>

              {/* Pricing & Margin Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Vendor Cost (Deal ₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.vendor_cost}
                    onChange={(e) => setFormData({ ...formData, vendor_cost: e.target.value })}
                    placeholder="e.g. 70"
                    className="w-full bg-[#111827] border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Customer Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.customer_price}
                    onChange={(e) => setFormData({ ...formData, customer_price: e.target.value })}
                    placeholder="e.g. 100"
                    className="w-full bg-[#111827] border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
                  />
                </div>
              </div>

              {/* Live Margin Calculation Display */}
              {formData.customer_price && formData.vendor_cost && (
                <div className="bg-[#111827] p-3 rounded-2xl border border-slate-700 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Projected Margin:</span>
                  <div className="font-mono font-bold">
                    <span className={parseFloat(formData.customer_price) >= parseFloat(formData.vendor_cost) ? 'text-emerald-400' : 'text-rose-400'}>
                      ₹{(parseFloat(formData.customer_price) - parseFloat(formData.vendor_cost)).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1">
                      ({(((parseFloat(formData.customer_price) - parseFloat(formData.vendor_cost)) / parseFloat(formData.customer_price)) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}

              {/* Outlet-Only Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="outletOnlyCheck"
                  checked={formData.is_outlet_only}
                  onChange={(e) => setFormData({ ...formData, is_outlet_only: e.target.checked })}
                  className="rounded border-slate-700 text-[#FF5722] focus:ring-[#FF5722] bg-[#111827]"
                />
                <label htmlFor="outletOnlyCheck" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  Outlet Exclusive (Pickup only, excluded from campus hostel deliveries)
                </label>
              </div>

              {/* Image URL (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Image URL (Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="/images/food/dish.jpg or https://..."
                  className="w-full bg-[#111827] border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
                />
              </div>

              {/* Description (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Description</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Prepared with authentic spices, slow cooked..."
                  className="w-full bg-[#111827] border border-slate-700 rounded-2xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={savingItem}
                className="w-full mt-4 py-3 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {savingItem ? (
                  <span>Saving to Database...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{editingItem ? 'Save Dish Changes' : 'Confirm & Add to Menu'}</span>
                  </>
                )}
              </button>

            </form>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL: DELETE CONFIRMATION ──────────────── */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161F30] border border-slate-700/80 rounded-3xl max-w-sm w-full p-5 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-white">Delete "{deletingItem.name}"?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to permanently delete this dish from the active catalog?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setDeletingItem(null)}
                className="py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider transition-colors shadow-md"
              >
                Delete Dish
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
