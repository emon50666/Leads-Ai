import React, { useState, useEffect } from 'react';
import { Search, Loader2, CheckCircle2, AlertCircle, Globe, MessageCircle, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSearch } from '../contexts/SearchContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

export function LeadSearch() {
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const { user } = useAuth();
  const { isSearching, searchError, extractedLeads: leads, searchQuery, searchId, startSearch } = useSearch();

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      try {
        const docRef = doc(db, 'users', user.uid, 'settings', 'integration');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().googleSheetUrl) {
          setWebhookUrl(docSnap.data().googleSheetUrl);
        } else {
          setWebhookUrl('https://script.google.com/macros/s/AKfycbzXfjISVkOEfY49jnFhcVGx7hxPinIqP6XTDWs1PGqRavy6rlUyx3rqjGGfIG7bk2AbYQ/exec');
        }
      } catch (error) {
        console.error("Failed to load settings", error);
      }
    }
    loadSettings();
  }, [user]);

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setSaveSuccess(false);
    setCurrentPage(1);
    await startSearch(url);
  };

  const saveLeads = async () => {
    if (!user || leads.length === 0) return;
    setSaving(true);
    try {
      const leadsRef = collection(db, 'users', user.uid, 'leads');
      
      // Save each lead to Firestore
      for (const lead of leads) {
        await addDoc(leadsRef, {
          userId: user.uid,
          businessName: lead.businessName,
          category: lead.category,
          address: lead.address,
          phone: lead.phone,
          email: lead.email,
          website: lead.website,
          rating: lead.rating,
          profileLink: lead.profileLink,
          facebook: lead.facebook || '',
          instagram: lead.instagram || '',
          linkedin: lead.linkedin || '',
          searchQuery,
          searchId,
          createdAt: serverTimestamp()
        });
      }

      // Send to Google Sheets Webhook if configured
      if (webhookUrl) {
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            mode: 'no-cors', // Often needed for simple Google Apps Script webhooks
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(leads),
          });
        } catch (webhookErr) {
          console.error("Webhook failed:", webhookErr);
          // We don't fail the whole operation if webhook fails
        }
      }
      
      setSaveSuccess(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/leads`);
      setError('Failed to save leads to database.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lead Search</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Extract business leads from Google Maps URLs.</p>
      </div>

      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-800/50 p-6">
        <form onSubmit={handleExtract} className="flex gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste Google Maps search URL here..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Extracting...
              </>
            ) : (
              'Extract Leads'
            )}
          </button>
        </form>

        {searchError && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{searchError}</p>
          </div>
        )}
      </div>

      {leads.length > 0 && (
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-800/50 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Extracted {leads.length} Leads
            </h3>
            <button
              onClick={saveLeads}
              disabled={saving || saveSuccess}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saveSuccess ? 'Saved to Database' : 'Save All Leads'}
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Business</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Social</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rating</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {leads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{lead.businessName}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{lead.category}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate max-w-xs">{lead.address}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">{lead.phone || '-'}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {lead.email ? lead.email : <span className="italic text-gray-400">No Email</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {lead.facebook || lead.instagram || lead.linkedin ? (
                          <>
                            {lead.facebook && <a href={lead.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">FB</a>}
                            {lead.instagram && <a href={lead.instagram} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:text-pink-800">IG</a>}
                            {lead.linkedin && <a href={lead.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-900">IN</a>}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Not found social media</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-2">
                      {lead.website ? (
                        <a
                          href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors cursor-pointer"
                        >
                          <Globe className="w-3.5 h-3.5" /> Website Found
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                          <Globe className="w-3.5 h-3.5" /> No Website
                        </span>
                      )}
                      {lead.phone && (
                        <a
                          href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {lead.rating ? `⭐ ${lead.rating}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {leads.length > itemsPerPage && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, leads.length)} of {leads.length} leads
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(leads.length / itemsPerPage), p + 1))}
                  disabled={currentPage === Math.ceil(leads.length / itemsPerPage)}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
