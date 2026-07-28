'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { fetchScheduled, fetchSent } from '@/lib/api';

interface Job {
  id: string;
  recipientEmail: string;
  subject: string;
  status: string;
  scheduledFor: string;
  updatedAt: string;
  sender?: { email: string; name?: string };
  sendLog?: { etherealUrl?: string; sentAt?: string; messageId?: string } | null;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    queued: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    sending: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    sent: 'bg-green-500/10 text-green-400 border-green-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${colors[status] || 'bg-gray-500/10 text-gray-400'}`}>
      {status}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-4xl mb-3">📭</div>
      <p className="text-slate-400">{message}</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-4 py-3"><div className="h-4 bg-white/5 rounded w-48" /></td>
          <td className="px-4 py-3"><div className="h-4 bg-white/5 rounded w-64" /></td>
          <td className="px-4 py-3"><div className="h-4 bg-white/5 rounded w-20" /></td>
          <td className="px-4 py-3"><div className="h-4 bg-white/5 rounded w-32" /></td>
        </tr>
      ))}
    </>
  );
}

export default function JobTable({ tab, refreshKey }: { tab: 'scheduled' | 'sent'; refreshKey?: number }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const fetcher = tab === 'scheduled' ? fetchScheduled : fetchSent;
    fetcher()
      .then((data) => {
        setJobs(data.jobs);
        setTotal(data.total);
      })
      .catch((err) => {
        setError('Could not load jobs — is the backend running?');
        toast.error(err.message || 'Failed to fetch jobs');
      })
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-400">
          {loading ? 'Loading...' : error ? '' : `${total} job${total !== 1 ? 's' : ''}`}
        </p>
        <button
          onClick={load}
          disabled={loading}
          className="text-sm text-primary-400 hover:text-primary-300 transition-colors disabled:opacity-50"
        >
          ↻ Refresh
        </button>
      </div>

      {error && !loading ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={load} className="mt-3 text-xs text-primary-400 hover:text-primary-300 underline">
            Try again
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-slate-400">
                <th className="px-4 py-3 font-medium">Recipient</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">{tab === 'scheduled' ? 'Scheduled For' : 'Sent At'}</th>
                {tab === 'sent' && <th className="px-4 py-3 font-medium">Preview</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <LoadingRows />
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={tab === 'sent' ? 5 : 4}>
                    <EmptyState message={tab === 'scheduled' ? 'No scheduled jobs yet' : 'No emails sent yet'} />
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-slate-200">{job.recipientEmail}</td>
                    <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{job.subject}</td>
                    <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(tab === 'sent' && job.sendLog?.sentAt ? job.sendLog.sentAt : job.scheduledFor).toLocaleString()}
                    </td>
                    {tab === 'sent' && (
                      <td className="px-4 py-3">
                        {job.sendLog?.etherealUrl ? (
                          <a
                            href={job.sendLog.etherealUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-400 hover:text-primary-300 text-xs underline"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
