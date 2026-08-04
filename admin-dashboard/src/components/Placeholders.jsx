import React from 'react';
import { ShoppingBag, Users } from 'lucide-react';

export function OrdersPlaceholder() {
  return (
    <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center space-y-4 max-w-2xl mx-auto my-8">
      <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-100">
        <ShoppingBag className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-extrabold text-[#0b1c30]">Platform Orders Management</h2>
      <p className="text-sm font-semibold text-slate-500 max-w-md mx-auto">
        Order management will be added later.
      </p>
      <div className="pt-2">
        <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold">
          Phase 4 Feature
        </span>
      </div>
    </div>
  );
}

export function UsersPlaceholder() {
  return (
    <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center space-y-4 max-w-2xl mx-auto my-8">
      <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
        <Users className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-extrabold text-[#0b1c30]">User Management</h2>
      <p className="text-sm font-semibold text-slate-500 max-w-md mx-auto">
        User management will be added later.
      </p>
      <div className="pt-2">
        <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-bold">
          Phase 4 Feature
        </span>
      </div>
    </div>
  );
}
