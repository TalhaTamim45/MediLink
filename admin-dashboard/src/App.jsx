import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './config/firebase';

import AdminLogin from './components/AdminLogin';
import AdminSidebar from './components/AdminSidebar';
import DashboardOverview from './components/DashboardOverview';
import PharmacyApprovals from './components/PharmacyApprovals';
import { OrdersPlaceholder, UsersPlaceholder } from './components/Placeholders';
import { Loader2, Menu } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'approvals' | 'orders' | 'users'
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthChecking(true);
      if (user) {
        try {
          const userDocSnap = await getDoc(doc(db, 'users', user.uid));
          if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
            setCurrentUser(user);
            setAdminProfile(userDocSnap.data());
          } else {
            // Non-admin user signed in: sign out
            await signOut(auth);
            setCurrentUser(null);
            setAdminProfile(null);
          }
        } catch (err) {
          console.log('Error verifying admin status:', err);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
        setAdminProfile(null);
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.log('Logout error:', err);
    }
    setCurrentUser(null);
    setAdminProfile(null);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#006b32]" />
        <p className="text-xs font-bold text-[#0b1c30]">Verifying Admin Credentials...</p>
      </div>
    );
  }

  // Unauthenticated / Non-Admin -> Render Admin Login
  if (!currentUser) {
    return (
      <AdminLogin
        onLoginSuccess={(userData) => {
          setCurrentUser(auth.currentUser);
          setAdminProfile(userData);
        }}
      />
    );
  }

  // Authenticated Admin Dashboard Layout
  return (
    <div className="min-h-screen bg-[#f8f9ff] flex">
      {/* Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLogout={handleLogout}
        adminEmail={currentUser.email}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:text-[#0b1c30] hover:bg-slate-100 cursor-pointer"
              title="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-[#0b1c30] capitalize truncate">
                {activeTab === 'overview' && 'Dashboard Overview'}
                {activeTab === 'approvals' && 'Pharmacy Approvals'}
                {activeTab === 'orders' && 'Orders Management'}
                {activeTab === 'users' && 'User Management'}
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
                MediLink Admin Portal • Live Session
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] font-bold text-[#006b32]">System Active</span>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <div className="p-4 sm:p-8 flex-1">
          {activeTab === 'overview' && (
            <DashboardOverview onNavigateToApprovals={() => setActiveTab('approvals')} />
          )}

          {activeTab === 'approvals' && <PharmacyApprovals />}

          {activeTab === 'orders' && <OrdersPlaceholder />}

          {activeTab === 'users' && <UsersPlaceholder />}
        </div>
      </main>
    </div>
  );
}
