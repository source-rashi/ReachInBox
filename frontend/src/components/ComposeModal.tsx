'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { uploadCsv, scheduleEmails } from '@/lib/api';

interface Lead {
  email: string;
  name?: string;
}

export default function ComposeModal({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);

  const [inputMode, setInputMode] = useState<'csv' | 'manual'>('manual');
  const [manualText, setManualText] = useState('test1@example.com, Alice\ntest2@example.com, Bob');
  const [subject, setSubject] = useState('Welcome to ReachInBox!');
  const [body, setBody] = useState('<p>Hi {{name}},</p>\n<p>Thank you for joining ReachInBox!</p>');
  
  // Default scheduledFor to current date/time in YYYY-MM-THH:mm format
  const nowStr = new Date(Date.now() + 60000).toISOString().slice(0, 16);
  const [scheduledFor, setScheduledFor] = useState(nowStr);
  
  const [delayMs, setDelayMs] = useState(2000);
  const [maxPerHour, setMaxPerHour] = useState(100);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadCsv(file);
      setLeads(result.leads);
      toast.success(`Loaded ${result.valid} leads (${result.invalid} invalid)`);
    } catch (err: any) {
      toast.error(err.message || 'CSV upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getEffectiveLeads = (): Lead[] => {
    if (inputMode === 'csv') return leads;
    
    // Parse manual text (lines formatted as email, name or email)
    return manualText
      .split('\n')
      .map((line) => {
        const parts = line.split(',').map((p) => p.trim());
        const email = parts[0];
        const name = parts[1] || undefined;
        return { email, name };
      })
      .filter((lead) => lead.email && lead.email.includes('@'));
  };

  const effectiveLeads = getEffectiveLeads();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (effectiveLeads.length === 0) {
      toast.error('Please enter at least one valid recipient email');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and body are required');
      return;
    }
    if (!scheduledFor) {
      toast.error('Pick a start time');
      return;
    }

    setSubmitting(true);
    try {
      const result = await scheduleEmails({
        senderEmail: session?.user?.email || 'sender@reachinbox.com',
        senderName: session?.user?.name || 'ReachInBox User',
        recipients: effectiveLeads,
        subject,
        body,
        scheduledFor: new Date(scheduledFor).toISOString(),
        delayBetweenMs: delayMs,
        maxPerHour,
      });

      toast.success(`Scheduled ${result.scheduled} emails`);
      if (result.skipped?.length > 0) {
        toast(`${result.skipped.length} duplicates skipped`, { icon: '⚠️' });
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to schedule');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 bg-[#1a1a3e] border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">New Campaign</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors text-xl leading-none"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Input Mode Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-300">Recipients</label>
                <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setInputMode('manual')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      inputMode === 'manual' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Type Manually
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('csv')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      inputMode === 'csv' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Upload CSV
                  </button>
                </div>
              </div>

              {inputMode === 'csv' ? (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500/50 transition-colors bg-white/5"
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {uploading ? (
                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                  ) : leads.length > 0 ? (
                    <div>
                      <span className="text-green-400 font-medium">{leads.length} leads loaded from CSV</span>
                      <p className="text-slate-500 text-xs mt-1">Click to re-upload</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-slate-300 text-sm">Drop a CSV file or click to upload</p>
                      <p className="text-slate-500 text-xs mt-1">Must have an &quot;email&quot; column</p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <textarea
                    rows={3}
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="email, name (one per line)"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono text-sm resize-none"
                  />
                  <p className="text-slate-400 text-xs mt-1">
                    Format: <code className="text-blue-300">email, Name</code> (One recipient per line). Loaded:{' '}
                    <span className="text-green-400 font-medium">{effectiveLeads.length} valid</span>
                  </p>
                </div>
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Your email subject"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Body (HTML)</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="<p>Hello {{name}},</p>"
                rows={4}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none font-mono text-sm"
              />
            </div>

            {/* Schedule Time */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Start Time</label>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors [color-scheme:dark]"
              />
            </div>

            {/* Delay + Rate Limit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Delay between sends (ms)
                </label>
                <input
                  type="number"
                  value={delayMs}
                  onChange={(e) => setDelayMs(parseInt(e.target.value) || 0)}
                  min={0}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Max per hour
                </label>
                <input
                  type="number"
                  value={maxPerHour}
                  onChange={(e) => setMaxPerHour(parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || effectiveLeads.length === 0}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 active:scale-[0.99]"
            >
              {submitting
                ? 'Scheduling...'
                : `Schedule ${effectiveLeads.length} Email${effectiveLeads.length !== 1 ? 's' : ''}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
