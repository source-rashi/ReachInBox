'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState } from 'react';
import Header from '@/components/Header';
import JobTable from '@/components/JobTable';
import ComposeModal from '@/components/ComposeModal';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [showCompose, setShowCompose] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    redirect('/login');
  }

  const handleComposeClose = () => {
    setShowCompose(false);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Dashboard</h2>
            <p className="text-slate-400 text-sm mt-1">Manage your email campaigns</p>
          </div>
          <button
            onClick={() => setShowCompose(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl font-medium transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/25 active:scale-[0.98]"
          >
            + New Campaign
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/5 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'scheduled'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Scheduled
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'sent'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Sent
          </button>
        </div>

        <JobTable tab={activeTab} refreshKey={refreshKey} />
      </main>

      {showCompose && <ComposeModal onClose={handleComposeClose} />}
    </div>
  );
}
