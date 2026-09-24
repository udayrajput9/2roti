import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  CheckCircle2,
  Clock,
  Download,
  Lock,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  X,
  CreditCard,
  Building,
  RefreshCw,
  Search,
  Check,
  RotateCcw,
  Receipt,
  Printer,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Info,
  DollarSign,
  Eye,
  FileText,
  Utensils,
  Layers
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function VendorSettlements() {
  const { staff, isVendor, isSuperAdmin } = useAdminAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyReports, setDailyReports] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [summary, setSummary] = useState(null);

  // Filters
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH'
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'PAID'
  const [searchQuery, setSearchQuery] = useState('');

  // Detailed Report Modal State
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailedReportData, setDetailedReportData] = useState(null);
  const [detailActiveTab, setDetailActiveTab] = useState('ORDERS'); // 'ORDERS' | 'DISH_TALLY'

  // Manual Payout Modal State
  const [payoutModalReport, setPayoutModalReport] = useState(null);
  const [utrReference, setUtrReference] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI'); // UPI, IMPS, NEFT, RTGS, CASH, CHEQUE
  const [adjustments, setAdjustments] = useState(0);
  const [payoutNote, setPayoutNote] = useState('');
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [modalError, setModalError] = useState('');

  // Revert Modal / State
  const [revertingReport, setRevertingReport] = useState(null);
  const [submittingRevert, setSubmittingRevert] = useState(false);

  // Voucher / Receipt Modal State
  const [viewingVoucherReport, setViewingVoucherReport] = useState(null);

  // Notification Banners
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const showNotification = (msg, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Concurrency Optimization: Parallel network requests via Promise.all
      const [reportsRes, sumRes] = await Promise.all([
        fetch('/api/vendor/daily-reports', { credentials: 'include' }),
        fetch('/api/vendor/summary', { credentials: 'include' })
      ]);

      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        if (reportsData.success) {
          setDailyReports(reportsData.reports || []);
          if (Array.isArray(reportsData.vendors)) {
            setVendorsList(reportsData.vendors);
          }
        }
      }

      if (sumRes.ok) {
        const sumData = await sumRes.json();
        if (sumData.success) {
          setSummary(sumData.summary);
        }
      }
    } catch (e) {
      console.error('Failed to load vendor settlement data:', e);
      showNotification('Failed to load financial records: ' + e.message, true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  // Open Deep-Dive Detail Report
  const handleOpenDetailReport = async (report) => {
    setShowDetailModal(true);
    setLoadingDetail(true);
    setDetailActiveTab('ORDERS');
    setDetailedReportData(null);

    try {
      const res = await fetch(`/api/vendor/daily-reports/detail?date=${report.date}&vendor_id=${report.vendor_id}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.report) {
          setDetailedReportData(data.report);
        } else {
          throw new Error(data.message || 'Failed to retrieve detailed day audit');
        }
      } else {
        throw new Error('Server returned error ' + res.status);
      }
    } catch (e) {
      console.error('Failed to load detailed report:', e);
      showNotification('Could not load detailed day breakdown: ' + e.message, true);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Open Manual Payout Modal
  const handleOpenPayoutModal = (report) => {
    setPayoutModalReport(report);
    setUtrReference('');
    setPaymentMode('UPI');
    setAdjustments(0);
    setPayoutNote(`Manual payout for ${report.date} (${report.delivered_orders_count} orders)`);
    setModalError('');
  };

  // Submit Manual Payout
  const handleConfirmManualPayout = async (e) => {
    e.preventDefault();
    if (!utrReference.trim()) {
      setModalError('Bank UTR / Transaction Reference ID is mandatory for audit records.');
      return;
    }

    try {
      setSubmittingPayout(true);
      setModalError('');

      const res = await fetch('/api/vendor/daily-reports/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          vendor_id: payoutModalReport.vendor_id,
          date: payoutModalReport.date,
          utr_reference: utrReference.trim(),
          payment_mode: paymentMode,
          adjustments: parseFloat(adjustments) || 0,
          note: payoutNote.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to record manual payout');
      }

      showNotification(`Payment marked as DONE for ${payoutModalReport.vendor_name} on ${payoutModalReport.date}!`);
      setPayoutModalReport(null);
      await loadData();

      // If detailed report was open, refresh it as well
      if (showDetailModal && detailedReportData && detailedReportData.date === payoutModalReport.date) {
        handleOpenDetailReport(payoutModalReport);
      }
    } catch (err) {
      setModalError(err.message || 'Error recording payout');
    } finally {
      setSubmittingPayout(false);
    }
  };

  // Revert Settlement to Pending
  const handleConfirmRevertPending = async () => {
    if (!revertingReport) return;

    try {
      setSubmittingRevert(true);
      const res = await fetch('/api/vendor/daily-reports/revert-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          vendor_id: revertingReport.vendor_id,
          date: revertingReport.date,
          settlement_id: revertingReport.settlement?.id
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to revert settlement');
      }

      showNotification(`Settlement for ${revertingReport.date} reverted to PENDING successfully.`);
      setRevertingReport(null);
      await loadData();

      // If detailed report was open, refresh it as well
      if (showDetailModal && detailedReportData && detailedReportData.date === revertingReport.date) {
        handleOpenDetailReport(revertingReport);
      }
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setSubmittingRevert(false);
    }
  };

  // Filtered Reports Calculation
  const filteredReports = useMemo(() => {
    const todayStr = new Date().toISOString().substring(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().substring(0, 10);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysStr = sevenDaysAgo.toISOString().substring(0, 10);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysStr = thirtyDaysAgo.toISOString().substring(0, 10);

    return dailyReports.filter(report => {
      // Date Filter
      if (dateFilter === 'TODAY' && report.date !== todayStr) return false;
      if (dateFilter === 'YESTERDAY' && report.date !== yesterdayStr) return false;
      if (dateFilter === 'WEEK' && report.date < sevenDaysStr) return false;
      if (dateFilter === 'MONTH' && report.date < thirtyDaysStr) return false;

      // Vendor Filter
      if (vendorFilter !== 'ALL' && String(report.vendor_id) !== String(vendorFilter)) return false;

      // Status Filter
      if (statusFilter !== 'ALL' && report.status !== statusFilter) return false;

      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDate = report.date.toLowerCase().includes(q);
        const matchesVendor = report.vendor_name.toLowerCase().includes(q);
        const matchesLocation = report.location_name && report.location_name.toLowerCase().includes(q);
        const matchesUtr = report.settlement?.utr_reference && report.settlement.utr_reference.toLowerCase().includes(q);
        if (!matchesDate && !matchesVendor && !matchesLocation && !matchesUtr) return false;
      }

      return true;
    });
  }, [dailyReports, dateFilter, vendorFilter, statusFilter, searchQuery]);

  // Aggregate Stats across reports
  const stats = useMemo(() => {
    let totalPendingPayable = 0;
    let totalPaidDisbursed = 0;
    let totalDeliveredOrders = 0;
    let totalCancelledOrders = 0;
    let totalGrossRevenue = 0;
    let totalPlatformMargin = 0;

    dailyReports.forEach(r => {
      totalDeliveredOrders += r.delivered_orders_count || 0;
      totalCancelledOrders += r.cancelled_orders_count || 0;
      totalGrossRevenue += r.gross_customer_amount || 0;
      totalPlatformMargin += r.platform_margin || 0;

      if (r.status === 'PAID') {
        totalPaidDisbursed += (r.settlement?.final_payable || r.vendor_payable_amount || 0);
      } else {
        totalPendingPayable += (r.vendor_payable_amount || 0);
      }
    });

    return {
      totalPendingPayable,
      totalPaidDisbursed,
      totalDeliveredOrders,
      totalCancelledOrders,
      totalGrossRevenue,
      totalPlatformMargin
    };
  }, [dailyReports]);

  // CSV Export of Day-End Report
  const handleExportCsv = () => {
    if (filteredReports.length === 0) {
      alert('No daily settlement records found to export.');
      return;
    }

    const headers = [
      'Settlement Date',
      'Vendor Name',
      'Outlet Location',
      'Delivered Orders',
      'Cancelled / Refunded (0 Cost)',
      ...(!isVendor ? ['Customer Gross Total (INR)', 'Platform Margin (INR)'] : []),
      'Vendor Payable Amount (INR)',
      'Payment Status',
      'Payment Mode',
      'Bank UTR / Reference ID',
      'Paid Timestamp',
      'Marked By',
      'Notes'
    ];

    const rows = filteredReports.map(r => [
      r.date,
      `"${r.vendor_name}"`,
      `"${r.location_name}"`,
      r.delivered_orders_count,
      r.cancelled_orders_count,
      ...(!isVendor ? [((r.gross_customer_amount || 0)).toFixed(2), ((r.platform_margin || 0)).toFixed(2)] : []),
      r.vendor_payable_amount.toFixed(2),
      r.status,
      r.settlement?.payment_mode || 'N/A',
      r.settlement?.utr_reference ? `"${r.settlement.utr_reference}"` : 'Pending',
      r.settlement?.paid_at ? `"${new Date(r.settlement.paid_at).toLocaleString()}"` : 'Unpaid',
      r.settlement?.marked_paid_by || 'N/A',
      `"${r.settlement?.note || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `2roti_day_end_vendor_settlements_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Export for Individual Day Detailed Orders
  const handleExportDayOrdersCsv = () => {
    if (!detailedReportData || !detailedReportData.orders || detailedReportData.orders.length === 0) {
      alert('No order details found to export for this day.');
      return;
    }

    const headers = [
      'Date',
      'Order Token',
      'Time Placed',
      'Customer Name',
      'Customer Phone',
      'Dishes Ordered',
      'Order Status',
      'Payment Status',
      'Payment Source',
      ...(!isVendor ? ['Customer Total (INR)'] : []),
      'Vendor Cost (INR)',
      ...(!isVendor ? ['Platform Margin (INR)'] : []),
      'Added to Vendor Payout'
    ];

    const rows = detailedReportData.orders.map(o => [
      detailedReportData.date,
      o.order_token,
      o.time,
      `"${o.customer_name}"`,
      `"${o.customer_phone}"`,
      `"${(o.items || []).map(i => `${i.name} x${i.quantity}`).join(' | ')}"`,
      o.order_status,
      o.payment_status,
      o.payment_source,
      ...(!isVendor ? [((o.total_customer_price || 0)).toFixed(2)] : []),
      o.total_vendor_cost.toFixed(2),
      ...(!isVendor ? [((o.platform_margin || 0)).toFixed(2)] : []),
      o.is_payable ? `YES (₹${o.total_vendor_cost.toFixed(2)})` : 'NO (₹0.00 - Cancelled/Refunded)'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `2roti_orders_audit_${detailedReportData.date}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* Alert Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-700/80 text-emerald-200 text-xs flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/90 border border-rose-700/80 text-rose-200 text-xs flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="font-bold">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-gradient-to-br from-[#FF5722] to-[#E64A19] text-white shadow-md">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>{isVendor ? 'Vendor Wallet & Day-End Ledger' : 'Vendor Settlements & Wallets'}</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Audit Protected
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Day-wise order cost accumulation, zero-cost cancellation isolation, and manual bank payout tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#FF5722]' : ''}`} />
          </button>

          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 rounded-2xl bg-[#1F2937] hover:bg-slate-700 border border-slate-700 text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Day-End CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isVendor ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-4`}>
        
        {/* Card 1: Pending Payable */}
        <div className="bg-[#111827] border-2 border-amber-500/40 rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Vendor Payout</span>
            </span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2 font-mono">
            ₹{stats.totalPendingPayable.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Manual transfer due across pending day batches
          </p>
        </div>

        {/* Card 2: Total Settled / Paid */}
        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Total Paid & Disbursed</span>
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2 font-mono">
            ₹{stats.totalPaidDisbursed.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Verified manual payouts with logged bank UTRs
          </p>
        </div>

        {/* Card 3: Orders Count & Cancellation Isolation */}
        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-blue-400" />
              <span>Orders Audited</span>
            </span>
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2 font-mono">
            {stats.totalDeliveredOrders} <span className="text-xs text-slate-400 font-sans font-normal">Delivered</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px]">
            <span className="text-rose-400 font-bold bg-rose-950/60 border border-rose-800/60 px-1.5 py-0.2 rounded">
              {stats.totalCancelledOrders} Cancelled/Refunded
            </span>
            <span className="text-slate-400">→ ₹0.00 added (100% Isolated)</span>
          </div>
        </div>

        {/* Card 4: Platform Margin vs Vendor Cost - Only for Admin */}
        {!isVendor && (
          <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#FF5722]" />
                <span>Platform Margin Retained</span>
              </span>
              <div className="p-2 rounded-xl bg-[#FF5722]/20 text-[#FF5722]">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-2 font-mono">
              ₹{stats.totalPlatformMargin.toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Out of ₹{stats.totalGrossRevenue.toFixed(2)} gross food sales
            </p>
          </div>
        )}

      </div>

      {/* Strict Financial Rule Banner */}
      <div className="p-3.5 rounded-2xl bg-[#111827] border border-slate-800/80 flex items-start sm:items-center gap-3 text-xs text-slate-300">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
        <div className="flex-1">
          <span className="font-bold text-white">Manual Payout & Cancellation Protection Protocol:</span>{' '}
          Each order’s vendor cost is dynamically accumulated per delivered order. Cancelled and refunded orders have{' '}
          <span className="text-amber-400 font-bold">₹0.00 vendor payout added</span>. Click{' '}
          <span className="text-[#FF5722] font-bold">"Detail Report"</span> on any day to see order-by-order breakdown and dishes prepared tally.
        </div>
      </div>

      {/* Interactive Controls & Filters */}
      <div className="bg-[#111827] border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-4">
        
        {/* Top Controls Row */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by date (YYYY-MM-DD), vendor name, outlet, or UTR..."
              className="w-full bg-[#18202F] border border-slate-700 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
            />
          </div>

          {/* Vendor Dropdown (For Super Admin) */}
          {!isVendor && vendorsList.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Vendor:</span>
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="bg-[#18202F] border border-slate-700 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5722]"
              >
                <option value="ALL">All Campus Vendors</option>
                {vendorsList.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#18202F] p-1 rounded-2xl border border-slate-800">
            {[
              { id: 'ALL', label: 'All Status' },
              { id: 'PENDING', label: 'Pending Payout' },
              { id: 'PAID', label: 'Payment Done (Paid)' }
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === s.id
                    ? 'bg-[#FF5722] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Time Range:</span>
          </span>
          {[
            { id: 'ALL', label: 'All Days' },
            { id: 'TODAY', label: "Today's Live Report" },
            { id: 'YESTERDAY', label: 'Yesterday' },
            { id: 'WEEK', label: 'Last 7 Days' },
            { id: 'MONTH', label: 'Last 30 Days' }
          ].map(df => (
            <button
              key={df.id}
              onClick={() => setDateFilter(df.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                dateFilter === df.id
                  ? 'bg-slate-200 text-slate-900 shadow-sm'
                  : 'bg-[#18202F] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {df.label}
            </button>
          ))}
        </div>

      </div>

      {/* Main Day-End Report Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#FF5722]" />
              <span>Day-End Vendor Settlement Ledger ({filteredReports.length} Days)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Each date aggregates delivered order vendor costs. View detailed reports, execute manual payouts, and manage payment status.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 pb-3">
                <th className="pb-3 px-3 font-bold">Settlement Date</th>
                <th className="pb-3 px-3 font-bold">Vendor & Outlet</th>
                <th className="pb-3 px-3 text-center font-bold">Delivered Orders</th>
                <th className="pb-3 px-3 text-center font-bold">Cancelled (Excluded)</th>
                {!isVendor && <th className="pb-3 px-3 font-bold">Gross Total</th>}
                {!isVendor && <th className="pb-3 px-3 font-bold">Platform Margin</th>}
                <th className="pb-3 px-3 font-bold text-emerald-400">Vendor Payable</th>
                <th className="pb-3 px-3 text-center font-bold">Payment Status</th>
                <th className="pb-3 px-3 text-right font-bold">Detail View & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={isVendor ? 7 : 9} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-8 h-8 text-[#FF5722] animate-spin" />
                      <p className="font-bold text-sm text-white">Aggregating Day-Wise Vendor Ledgers...</p>
                      <p className="text-xs text-slate-500">Querying SQLite order vendor costs and settlement records</p>
                    </div>
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={isVendor ? 7 : 9} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p>No day-wise settlement records found matching your filters.</p>
                      <button
                        onClick={() => {
                          setDateFilter('ALL');
                          setVendorFilter('ALL');
                          setStatusFilter('ALL');
                          setSearchQuery('');
                        }}
                        className="text-xs font-bold text-[#FF5722] hover:underline"
                      >
                        Reset filters to view all settlement records
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReports.map(report => {
                  const isPaid = report.status === 'PAID';
                  return (
                    <tr key={report.id} className="hover:bg-slate-800/30 transition-colors">
                      
                      {/* Date */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-white font-mono">{report.date}</span>
                          {report.is_today && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-orange-950 text-orange-400 border border-orange-800">
                              Today Live
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Vendor & Location */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{report.vendor_name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-500" />
                          <span>{report.location_name}</span>
                        </div>
                      </td>

                      {/* Delivered Orders */}
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 font-mono font-bold text-white">
                          {report.delivered_orders_count} orders
                        </span>
                      </td>

                      {/* Cancelled / Refunded (Isolated 0 cost) */}
                      <td className="py-3 px-3 text-center">
                        {report.cancelled_orders_count > 0 ? (
                          <span className="px-2 py-0.5 rounded-lg bg-rose-950/70 border border-rose-800/80 text-rose-300 font-bold text-[10px]" title="Zero cost added for cancelled/refunded orders">
                            {report.cancelled_orders_count} (₹0 added)
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">0</span>
                        )}
                      </td>

                      {/* Gross Customer Total - Admin Only */}
                      {!isVendor && (
                        <td className="py-3 px-3 font-mono text-slate-300">
                          ₹{((report.gross_customer_amount || 0)).toFixed(2)}
                        </td>
                      )}

                      {/* Platform Margin - Admin Only */}
                      {!isVendor && (
                        <td className="py-3 px-3 font-mono text-slate-400">
                          ₹{((report.platform_margin || 0)).toFixed(2)}
                        </td>
                      )}

                      {/* Total Vendor Payable Amount */}
                      <td className="py-3 px-3 font-mono font-black text-base text-emerald-400">
                        ₹{report.vendor_payable_amount.toFixed(2)}
                      </td>

                      {/* Payment Status Badge */}
                      <td className="py-3 px-3 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2.5 py-1 rounded-xl shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>PAID (DONE)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-400 bg-amber-950/80 border border-amber-800 px-2.5 py-1 rounded-xl shadow-sm">
                            <Clock className="w-3.5 h-3.5" />
                            <span>PENDING</span>
                          </span>
                        )}
                      </td>

                      {/* Action Area: View Detail Report + Payout Buttons */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          
                          {/* DETAIL REPORT BUTTON */}
                          <button
                            onClick={() => handleOpenDetailReport(report)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                            title="View Detailed Day Audit Report"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#FF5722]" />
                            <span>Detail Report</span>
                          </button>

                          {/* PENDING ACTIONS */}
                          {!isPaid ? (
                            isSuperAdmin ? (
                              <button
                                onClick={() => handleOpenPayoutModal(report)}
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-[0_4px_12px_rgba(16,185,129,0.3)] transition-all active:scale-95"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mark Paid</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800">
                                Due
                              </span>
                            )
                          ) : (
                            /* PAID ACTIONS */
                            <div className="flex items-center gap-1">
                              {/* UTR Reference Pill */}
                              <div className="px-2 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[10px] font-mono text-orange-300 truncate max-w-[110px]" title={report.settlement?.utr_reference}>
                                {report.settlement?.utr_reference || 'PAID'}
                              </div>

                              {/* View Voucher / Receipt */}
                              <button
                                onClick={() => setViewingVoucherReport(report)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                title="View Settlement Voucher"
                              >
                                <Receipt className="w-3.5 h-3.5 text-blue-400" />
                              </button>

                              {/* Super Admin: Revert to Pending Action */}
                              {isSuperAdmin && (
                                <button
                                  onClick={() => setRevertingReport(report)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-700 transition-colors"
                                  title="Revert to Pending"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}

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

      {/* MODAL 0: DAY-END DETAILED REPORT MODAL (Full Breakdown) */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-[#111827] border border-slate-700 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl relative my-auto animate-scale-up max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#FF5722] to-[#E64A19] text-white shadow-md">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>Day-End Settlement Audit Report</span>
                    {detailedReportData && (
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        detailedReportData.status === 'PAID'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}>
                        {detailedReportData.status === 'PAID' ? 'PAID & SETTLED' : 'PAYMENT PENDING'}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {detailedReportData?.vendor_name} • {detailedReportData?.location_name} • Date: <strong className="text-white font-mono">{detailedReportData?.date}</strong>
                  </p>
                </div>
              </div>

              {/* Close & Print Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Print Report"
                >
                  <Printer className="w-4 h-4" />
                </button>

                <button
                  onClick={handleExportDayOrdersCsv}
                  className="px-3 py-2 rounded-xl bg-[#1F2937] hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white flex items-center gap-1.5 transition-colors"
                  title="Export Day's Orders CSV"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Export Day CSV</span>
                </button>

                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {loadingDetail ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
                <RefreshCw className="w-8 h-8 text-[#FF5722] animate-spin" />
                <span>Loading day's order items and portions tally...</span>
              </div>
            ) : detailedReportData ? (
              <div className="flex-1 overflow-y-auto space-y-4 pt-4 pr-1 scrollbar-thin">
                
                {/* Day Summary KPI Row */}
                <div className={`grid grid-cols-2 ${isVendor ? 'sm:grid-cols-2' : 'sm:grid-cols-4'} gap-3`}>
                  {!isVendor && (
                    <>
                      <div className="bg-[#18202F] p-3 rounded-2xl border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Customer Sales</span>
                        <div className="text-lg font-black text-white font-mono mt-1">
                          ₹{(detailedReportData.summary.gross_customer_amount || 0).toFixed(2)}
                        </div>
                      </div>

                      <div className="bg-[#18202F] p-3 rounded-2xl border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2 Roti Commission</span>
                        <div className="text-lg font-black text-slate-300 font-mono mt-1">
                          ₹{(detailedReportData.summary.platform_margin || 0).toFixed(2)}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="bg-emerald-950/40 p-3 rounded-2xl border border-emerald-800/80">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Net Vendor Payable</span>
                    <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                      ₹{detailedReportData.summary.vendor_payable_amount.toFixed(2)}
                    </div>
                  </div>

                  <div className="bg-[#18202F] p-3 rounded-2xl border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Orders Audited</span>
                    <div className="text-lg font-black text-white font-mono mt-1">
                      {detailedReportData.summary.delivered_orders_count} Delivered
                    </div>
                    {detailedReportData.summary.cancelled_orders_count > 0 && (
                      <span className="text-[10px] text-rose-400 font-bold block mt-0.5">
                        {detailedReportData.summary.cancelled_orders_count} Cancelled (₹0 Added)
                      </span>
                    )}
                  </div>
                </div>

                {/* Settlement Info if Paid */}
                {detailedReportData.settlement && (
                  <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 text-xs text-emerald-200 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Paid via <strong>{detailedReportData.settlement.payment_mode}</strong> • UTR: <strong className="font-mono text-orange-300">{detailedReportData.settlement.utr_reference}</strong>
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Disbursed: {new Date(detailedReportData.settlement.paid_at).toLocaleString()} by {detailedReportData.settlement.marked_paid_by}
                    </div>
                  </div>
                )}

                {/* Detailed Tabs: Orders vs Dishes Tally */}
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <button
                    onClick={() => setDetailActiveTab('ORDERS')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                      detailActiveTab === 'ORDERS'
                        ? 'bg-[#FF5722] text-white shadow-md'
                        : 'bg-[#18202F] text-slate-400 hover:text-white'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>All Day Orders ({detailedReportData.orders.length})</span>
                  </button>

                  <button
                    onClick={() => setDetailActiveTab('DISH_TALLY')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                      detailActiveTab === 'DISH_TALLY'
                        ? 'bg-[#FF5722] text-white shadow-md'
                        : 'bg-[#18202F] text-slate-400 hover:text-white'
                    }`}
                  >
                    <Utensils className="w-3.5 h-3.5" />
                    <span>Dishes Prepared & Sold Tally ({detailedReportData.dishes_tally.length})</span>
                  </button>
                </div>

                {/* TAB 1: Itemized Orders Breakdown */}
                {detailActiveTab === 'ORDERS' && (
                  <div className="bg-[#18202F] rounded-2xl border border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-800 bg-slate-900/60">
                            <th className="py-2.5 px-3 font-bold">Order Token</th>
                            <th className="py-2.5 px-3 font-bold">Time</th>
                            <th className="py-2.5 px-3 font-bold">Customer</th>
                            <th className="py-2.5 px-3 font-bold">Dishes & Portions</th>
                            {!isVendor && <th className="py-2.5 px-3 font-bold">Bill (INR)</th>}
                            <th className="py-2.5 px-3 font-bold">Vendor Cost</th>
                            {!isVendor && <th className="py-2.5 px-3 font-bold">Margin</th>}
                            <th className="py-2.5 px-3 font-bold">Payment</th>
                            <th className="py-2.5 px-3 text-right font-bold">Payout Impact</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-medium">
                          {detailedReportData.orders.map(o => (
                            <tr key={o.id} className="hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 font-mono font-bold text-white">{o.order_token}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{o.time}</td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-200">{o.customer_name}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{o.customer_phone}</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="space-y-0.5">
                                  {o.items.map((it, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                      <span className="font-bold text-slate-200">{it.name}</span>
                                      <span className="text-slate-400">×{it.quantity}</span>
                                      <span className="text-[10px] font-mono text-slate-500">(₹{it.vendor_cost} each)</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              {!isVendor && <td className="py-2.5 px-3 font-mono text-slate-300">₹{(o.total_customer_price || 0).toFixed(2)}</td>}
                              <td className="py-2.5 px-3 font-mono font-bold text-white">₹{o.total_vendor_cost.toFixed(2)}</td>
                              {!isVendor && <td className="py-2.5 px-3 font-mono text-slate-400">₹{(o.platform_margin || 0).toFixed(2)}</td>}
                              <td className="py-2.5 px-3">
                                <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                  {o.payment_source}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold">
                                {o.is_payable ? (
                                  <span className="text-emerald-400">
                                    +₹{o.total_vendor_cost.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px]" title="Cancelled or refunded orders do not add to vendor payout">
                                    ₹0.00 (Cancelled)
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 2: Dishes Prepared & Sold Tally */}
                {detailActiveTab === 'DISH_TALLY' && (
                  <div className="bg-[#18202F] rounded-2xl border border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-800 bg-slate-900/60">
                            <th className="py-2.5 px-3 font-bold">Dish / Menu Item</th>
                            <th className="py-2.5 px-3 text-center font-bold">Delivered Portions</th>
                            <th className="py-2.5 px-3 text-center font-bold">Cancelled Portions</th>
                            {!isVendor && <th className="py-2.5 px-3 font-bold">Selling Price (INR)</th>}
                            <th className="py-2.5 px-3 font-bold">Vendor Cost / Portion</th>
                            <th className="py-2.5 px-3 text-right font-bold text-emerald-400">Total Vendor Payout</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-medium">
                          {detailedReportData.dishes_tally.map((d, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                                <Utensils className="w-3.5 h-3.5 text-[#FF5722]" />
                                <span>{d.item_name}</span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-400">
                                {d.quantity_delivered} portions
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                                {d.quantity_cancelled}
                              </td>
                              {!isVendor && (
                                <td className="py-2.5 px-3 font-mono text-slate-300">
                                  ₹{(d.customer_price || 0).toFixed(2)}
                                </td>
                              )}
                              <td className="py-2.5 px-3 font-mono text-slate-300">
                                ₹{d.vendor_cost.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-400 text-sm">
                                ₹{d.total_vendor_cost.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Bottom Footer Actions */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs text-slate-400">
                    Total day payable due: <strong className="text-emerald-400 font-mono text-sm">₹{detailedReportData.summary.vendor_payable_amount.toFixed(2)}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    {detailedReportData.status === 'PENDING' && isSuperAdmin && (
                      <button
                        onClick={() => {
                          const matchingReport = dailyReports.find(r => r.date === detailedReportData.date && r.vendor_id === detailedReportData.vendor_id);
                          if (matchingReport) {
                            handleOpenPayoutModal(matchingReport);
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Pay This Day (Mark Paid)</span>
                      </button>
                    )}

                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
                    >
                      Close Report
                    </button>
                  </div>
                </div>

              </div>
            ) : null}

          </div>
        </div>
      )}

      {/* MODAL 1: Manual Payout Execution Modal (Super Admin) */}
      {payoutModalReport && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-scale-up">
            
            <button
              onClick={() => setPayoutModalReport(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800/60"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-2xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Confirm Manual Vendor Payout</h3>
                <p className="text-xs text-slate-400">
                  Update settlement status to PAID and log the manual transaction reference.
                </p>
              </div>
            </div>

            {/* Day Settlement Snapshot Box */}
            <div className="bg-[#18202F] border border-slate-800 rounded-2xl p-4 my-4 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>Settlement Date:</span>
                <span className="font-mono font-bold text-white">{payoutModalReport.date}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Vendor / Outlet:</span>
                <span className="font-bold text-white">{payoutModalReport.vendor_name} ({payoutModalReport.location_name})</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Completed Orders Count:</span>
                <span className="font-bold text-white">{payoutModalReport.delivered_orders_count} orders</span>
              </div>
              {payoutModalReport.cancelled_orders_count > 0 && (
                <div className="flex justify-between items-center text-rose-400">
                  <span>Cancelled Orders Excluded:</span>
                  <span className="font-bold">{payoutModalReport.cancelled_orders_count} (₹0.00 Added)</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-700/80 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-200">Total Vendor Cost Due:</span>
                <span className="font-mono font-black text-emerald-400 text-base">
                  ₹{payoutModalReport.vendor_payable_amount.toFixed(2)}
                </span>
              </div>
            </div>

            {modalError && (
              <div className="mb-3 p-3 rounded-2xl bg-rose-950/80 border border-rose-800 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Manual Payout Form */}
            <form onSubmit={handleConfirmManualPayout} className="space-y-3.5 text-xs">
              
              {/* Payment Mode Selector */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Manual Payment Mode <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'UPI', label: 'UPI / PhonePe' },
                    { id: 'IMPS', label: 'Bank IMPS' },
                    { id: 'NEFT', label: 'NEFT / RTGS' },
                    { id: 'CASH', label: 'Cash at Outlet' },
                    { id: 'CHEQUE', label: 'Cheque' },
                    { id: 'OTHER', label: 'Other Transfer' }
                  ].map(pm => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMode(pm.id)}
                      className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-colors ${
                        paymentMode === pm.id
                          ? 'bg-[#FF5722] text-white border-[#FF5722] shadow-sm'
                          : 'bg-[#18202F] text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* UTR / Transaction Reference Number */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Bank UTR / Transaction Reference ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={utrReference}
                  onChange={(e) => setUtrReference(e.target.value)}
                  placeholder="e.g. UTR2026092300192 or UPI/626923/HDFC"
                  className="w-full bg-[#18202F] border border-slate-700 rounded-2xl px-3.5 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Enter the confirmation reference from your bank app or UPI receipt.
                </p>
              </div>

              {/* Adjustments (+ / -) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Adjustments (+/- ₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={adjustments}
                    onChange={(e) => setAdjustments(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#18202F] border border-slate-700 rounded-2xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
                  />
                  <p className="text-[9px] text-slate-500 mt-0.5">Deduction or bonus adjustment</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Net Disbursed Amount</label>
                  <div className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-emerald-400 font-mono font-bold text-sm">
                    ₹{(parseFloat(payoutModalReport.vendor_payable_amount) + (parseFloat(adjustments) || 0)).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Payout Notes */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">Payout Notes / Remarks</label>
                <input
                  type="text"
                  value={payoutNote}
                  onChange={(e) => setPayoutNote(e.target.value)}
                  placeholder="e.g. Transferred via HDFC Current A/C to Jhungiya Vendor"
                  className="w-full bg-[#18202F] border border-slate-700 rounded-2xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
                />
              </div>

              <div className="p-3 bg-slate-900 rounded-2xl text-[11px] text-slate-400 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Submitting will permanently lock {payoutModalReport.delivered_orders_count} orders under this settlement batch.</span>
              </div>

              <button
                type="submit"
                disabled={submittingPayout}
                className="w-full mt-3 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submittingPayout ? 'Recording & Locking Orders...' : 'Confirm Manual Payment Done'}</span>
              </button>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: Revert to Pending Confirmation Modal (Super Admin) */}
      {revertingReport && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setRevertingReport(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-amber-400 mb-3">
              <RotateCcw className="w-6 h-6" />
              <h3 className="text-base font-black text-white">Revert Settlement to PENDING?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Are you sure you want to revert the settlement for <strong className="text-white">{revertingReport.vendor_name}</strong> on <strong className="text-white font-mono">{revertingReport.date}</strong>?
              <br /><br />
              This will remove the Bank UTR record ({revertingReport.settlement?.utr_reference}), switch the day's payment status back to <strong className="text-amber-400">PENDING</strong>, and unlock the orders.
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setRevertingReport(null)}
                className="flex-1 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevertPending}
                disabled={submittingRevert}
                className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-black uppercase tracking-wider shadow-lg active:scale-95 disabled:opacity-50 transition-all"
              >
                {submittingRevert ? 'Reverting...' : 'Yes, Revert to Pending'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Settlement Receipt / Voucher Modal */}
      {viewingVoucherReport && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-scale-up">
            
            <button
              onClick={() => setViewingVoucherReport(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800/60"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Voucher Header */}
            <div className="border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#FF5722]" />
                    <span>2 Roti Settlement Voucher</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Official Campus Vendor Disbursement Receipt</p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono text-[10px] font-black uppercase">
                    PAID & VERIFIED
                  </span>
                </div>
              </div>
            </div>

            {/* Voucher Body */}
            <div className="space-y-3 text-xs bg-[#18202F] p-4 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-center text-slate-400">
                <span>Voucher ID:</span>
                <span className="font-mono font-bold text-white">#SETTLE-{viewingVoucherReport.settlement?.id || 'MANUAL'}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Settlement Date:</span>
                <span className="font-mono font-bold text-white">{viewingVoucherReport.date}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Vendor:</span>
                <span className="font-bold text-white">{viewingVoucherReport.vendor_name}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Outlet Location:</span>
                <span className="font-bold text-white">{viewingVoucherReport.location_name}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Delivered Orders Count:</span>
                <span className="font-bold text-white">{viewingVoucherReport.delivered_orders_count} orders</span>
              </div>
              {!isVendor && (
                <>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Customer Gross Bill:</span>
                    <span className="font-mono text-slate-300">₹{(viewingVoucherReport.gross_customer_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Platform Margin Retained:</span>
                    <span className="font-mono text-slate-300">₹{(viewingVoucherReport.platform_margin || 0).toFixed(2)}</span>
                  </div>
                </>
              )}
              
              <div className="pt-2 border-t border-slate-700/80 flex justify-between items-center text-sm font-bold">
                <span className="text-white">Net Disbursed Vendor Amount:</span>
                <span className="font-mono font-black text-emerald-400 text-lg">
                  ₹{(viewingVoucherReport.settlement?.final_payable || viewingVoucherReport.vendor_payable_amount).toFixed(2)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-700/80 space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-300">
                  <span className="font-bold">Payment Mode:</span>
                  <span className="font-mono">{viewingVoucherReport.settlement?.payment_mode || 'BANK_TRANSFER'}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="font-bold">Bank UTR / IMPS Number:</span>
                  <span className="font-mono text-orange-400 font-bold">{viewingVoucherReport.settlement?.utr_reference || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Disbursed Timestamp:</span>
                  <span className="font-mono">{viewingVoucherReport.settlement?.paid_at ? new Date(viewingVoucherReport.settlement.paid_at).toLocaleString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Authorized By:</span>
                  <span>{viewingVoucherReport.settlement?.marked_paid_by || 'Super Admin'}</span>
                </div>
                {viewingVoucherReport.settlement?.note && (
                  <div className="flex justify-between text-slate-400 pt-1">
                    <span>Notes:</span>
                    <span className="italic">{viewingVoucherReport.settlement.note}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Voucher</span>
              </button>
              <button
                onClick={() => setViewingVoucherReport(null)}
                className="px-5 py-2 rounded-xl bg-[#FF5722] hover:bg-[#E64A19] text-white font-bold text-xs transition-colors shadow-md"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
