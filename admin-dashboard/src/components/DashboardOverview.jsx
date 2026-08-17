import React, { useState, useEffect } from 'react';
import odooApi from '../config/odooApi';
import {
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  ShoppingBag,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function DashboardOverview({ onNavigateToApprovals }) {
  const [stats, setStats] = useState({
    totalPharmacies: 0,
    pendingPharmacies: 0,
    approvedPharmacies: 0,
    rejectedPharmacies: 0,
    totalCustomers: 0,
    totalOrders: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      // 1. Fetch pharmacies stats
      const pharmaciesResult = await odooApi.searchRead(
        'res.partner',
        [['is_pharmacy', '=', true], '|', ['active', '=', true], ['active', '=', false]],
        ['active']
      );

      const totalPh = pharmaciesResult.records ? pharmaciesResult.records.length : 0;
      const pendingPh = pharmaciesResult.records ? pharmaciesResult.records.filter((p) => !p.active).length : 0;
      const approvedPh = pharmaciesResult.records ? pharmaciesResult.records.filter((p) => p.active).length : 0;

      // 2. Fetch customers stats
      const customersResult = await odooApi.searchRead(
        'res.partner',
        [['is_pharmacy', '=', false], ['name', '!=', 'Talha Tamim'], ['name', '!=', 'Administrator']],
        ['id']
      );
      const totalCust = customersResult.records ? customersResult.records.length : 0;

      // 3. Fetch orders count
      const ordersResult = await odooApi.searchRead(
        'sale.order',
        [],
        ['id']
      );
      const totalOrd = ordersResult.records ? ordersResult.records.length : 0;

      setStats({
        totalPharmacies: totalPh,
        pendingPharmacies: pendingPh,
        approvedPharmacies: approvedPh,
        rejectedPharmacies: 0,
        totalCustomers: totalCust,
        totalOrders: totalOrd,
      });
    } catch (err) {
      console.log('Error fetching stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchStats();

    const interval = setInterval(fetchStats, 4000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    {
      title: 'Total Pharmacies',
      value: stats.totalPharmacies,
      subtext: 'Registered partner pharmacies',
      icon: Building2,
      color: 'bg-blue-50 text-blue-600 border-blue-200',
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingPharmacies,
      subtext: 'Requires admin action',
      icon: Clock,
      color: 'bg-amber-50 text-amber-600 border-amber-200',
      badgeColor: 'bg-amber-100 text-amber-800',
      highlight: stats.pendingPharmacies > 0,
    },
    {
      title: 'Approved Pharmacies',
      value: stats.approvedPharmacies,
      subtext: 'Active operational partners',
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      title: 'Rejected Pharmacies',
      value: stats.rejectedPharmacies,
      subtext: 'Suspended or rejected',
      icon: XCircle,
      color: 'bg-red-50 text-red-600 border-red-200',
      badgeColor: 'bg-red-100 text-red-800',
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      subtext: 'Registered patient accounts',
      icon: Users,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      badgeColor: 'bg-indigo-100 text-indigo-800',
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      subtext: 'Platform transactions',
      icon: ShoppingBag,
      color: 'bg-purple-50 text-purple-600 border-purple-200',
      badgeColor: 'bg-purple-100 text-purple-800',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#006b32] to-[#008740] p-6 rounded-2xl text-white shadow-md">
        <div>
          <h2 className="text-xl font-extrabold">MediLink Platform Overview</h2>
          <p className="text-xs font-medium text-emerald-100 mt-1">
            Real-time infrastructure performance and partner management telemetry.
          </p>
        </div>

        {stats.pendingPharmacies > 0 && (
          <button
            onClick={onNavigateToApprovals}
            className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-amber-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer self-start sm:self-auto shrink-0"
          >
            <span>Review {stats.pendingPharmacies} Pending Approvals</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className={`bg-white rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md ${
                card.highlight ? 'border-amber-300 ring-2 ring-amber-200/50' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </span>
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border ${card.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-[#0b1c30]">
                  {isLoading ? '...' : card.value}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${card.badgeColor}`}>
                  Live
                </span>
              </div>

              <p className="text-xs font-medium text-slate-400 mt-2">{card.subtext}</p>
            </div>
          );
        })}
      </div>

      {/* Action Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#006b32] flex items-center justify-center shrink-0 border border-emerald-100">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0b1c30]">Pharmacy Verification Queue</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review trade licenses, contact numbers, and verify store credentials to onboard new partner pharmacies.
            </p>
          </div>
        </div>

        <button
          onClick={onNavigateToApprovals}
          className="px-5 py-2.5 bg-[#006b32] hover:bg-[#005225] text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer whitespace-nowrap"
        >
          Go to Pharmacy Approvals
        </button>
      </div>
    </div>
  );
}
