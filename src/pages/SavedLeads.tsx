import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Download, Globe, MessageCircle, Loader2, ChevronLeft, ChevronRight, Database, FolderOpen, Trash2, Mail } from 'lucide-react';
import Papa from 'papaparse';
import { EmailModal } from '../components/EmailModal';

export function SavedLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [websiteFilter, setWebsiteFilter] = useState<'all' | 'found' | 'not_found'>('all');
  const [emailModalLead, setEmailModalLead] = useState<any | null>(null);
  const itemsPerPage = 50;

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'leads'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLeads(leadsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/leads`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const groupedLeads = useMemo(() => {
    const groups: Record<string, { id: string, query: string, date: Date, leads: any[] }> = {};
    leads.forEach(lead => {
      const id = lead.searchId || 'unknown';
      if (!groups[id]) {
        groups[id] = {
          id,
          query: lead.searchQuery || 'Unknown Search',
          date: lead.createdAt?.toDate ? lead.createdAt.toDate() : new Date(),
          leads: []
        };
      }
      groups[id].leads.push(lead);
    });
    return Object.values(groups).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [leads]);

  const activeGroupInfo = useMemo(() => {
    if (!selectedGroupId) return null;
    return groupedLeads.find(g => g.id === selectedGroupId) || null;
  }, [selectedGroupId, groupedLeads]);

  const displayLeads = activeGroupInfo ? activeGroupInfo.leads : leads;

  const filteredLeads = useMemo(() => {
    return displayLeads.filter(lead => {
      if (websiteFilter === 'found') return !!lead.website;
      if (websiteFilter === 'not_found') return !lead.website;
      return true;
    });
  }, [displayLeads, websiteFilter]);

  const handleDelete = async (leadId: string) => {
    if (!user) return;
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'leads', leadId));
      } catch (error: any) {
        console.error("Error deleting lead", error);
        alert(`Failed to delete lead: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const downloadCSV = () => {
    const csvData = filteredLeads.map((lead: any) => ({
      'Business Name': lead.businessName,
      'Category': lead.category,
      'Address': lead.address,
      'Phone': lead.phone,
      'Email': lead.email,
      'Website': lead.website,
      'Rating': lead.rating,
      'Profile Link': lead.profileLink,
      'Facebook': lead.facebook || '',
      'Instagram': lead.instagram || '',
      'LinkedIn': lead.linkedin || '',
      'Added On': lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString() : ''
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'pipilika_leads.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {activeGroupInfo ? activeGroupInfo.query : 'Saved Leads'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {activeGroupInfo ? `Viewing ${activeGroupInfo.leads.length} leads` : 'Manage and export your collected leads.'}
          </p>
        </div>
        <button
          onClick={downloadCSV}
          disabled={filteredLeads.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {!activeGroupInfo ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groupedLeads.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-800/50">
              <p className="text-gray-500 dark:text-gray-400">No leads saved yet. Go to Lead Search to extract some!</p>
            </div>
          ) : (
            groupedLeads.map(group => (
              <div 
                key={group.id} 
                onClick={() => { setSelectedGroupId(group.id); setCurrentPage(1); setWebsiteFilter('all'); }} 
                className="cursor-pointer bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-800/50 p-6 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                    <FolderOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                    {group.date.toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">{group.query}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{group.leads.length} leads collected</p>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <button 
              onClick={() => { setSelectedGroupId(null); setWebsiteFilter('all'); }} 
              className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to all searches
            </button>
            
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button
                onClick={() => { setWebsiteFilter('all'); setCurrentPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${websiteFilter === 'all' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              >
                All
              </button>
              <button
                onClick={() => { setWebsiteFilter('found'); setCurrentPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${websiteFilter === 'found' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              >
                Website Found
              </button>
              <button
                onClick={() => { setWebsiteFilter('not_found'); setCurrentPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${websiteFilter === 'not_found' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              >
                No Website
              </button>
            </div>

            <button
              onClick={async () => {
                if (window.confirm('Are you sure you want to delete all leads in this search group?')) {
                  try {
                    const promises = displayLeads.map((lead: any) => deleteDoc(doc(db, 'users', user!.uid, 'leads', lead.id)));
                    await Promise.all(promises);
                    setSelectedGroupId(null);
                  } catch (error: any) {
                    console.error("Error deleting group", error);
                    alert(`Failed to delete group: ${error.message || 'Unknown error'}`);
                  }
                }
              }}
              className="flex items-center text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-1" /> Delete Search Group
            </button>
          </div>
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-800/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Business</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Social</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Added</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        No leads found in this group matching the filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((lead: any) => (
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
                          {lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => setEmailModalLead(lead)}
                            className="inline-flex items-center p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                            title="Write Email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(lead.id)}
                            className="inline-flex items-center p-1.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {filteredLeads.length > itemsPerPage && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length} leads
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
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredLeads.length / itemsPerPage), p + 1))}
                    disabled={currentPage === Math.ceil(filteredLeads.length / itemsPerPage)}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {emailModalLead && (
        <EmailModal lead={emailModalLead} onClose={() => setEmailModalLead(null)} />
      )}
    </div>
  );
}
