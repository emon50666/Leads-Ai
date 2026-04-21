import React, { createContext, useContext, useState, ReactNode } from 'react';
import { extractLeadsFromUrl, ExtractedLead } from '../services/leadExtractor';
import { v4 as uuidv4 } from 'uuid';

interface SearchContextType {
  isSearching: boolean;
  searchError: string;
  extractedLeads: ExtractedLead[];
  searchQuery: string;
  searchId: string;
  startSearch: (url: string) => Promise<void>;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [extractedLeads, setExtractedLeads] = useState<ExtractedLead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchId, setSearchId] = useState('');

  const startSearch = async (url: string) => {
    setIsSearching(true);
    setSearchError('');
    setExtractedLeads([]);
    setSearchQuery('');
    setSearchId('');

    try {
      const { leads, query } = await extractLeadsFromUrl(url, 200, (partialLeads) => {
        setExtractedLeads(current => {
          // ensure no duplicates by ID
          const existingIds = new Set(current.map(l => l.id));
          const newLeads = partialLeads.filter(l => !existingIds.has(l.id));
          return [...current, ...newLeads];
        });
      });
      setSearchQuery(query);
      setSearchId(uuidv4());
    } catch (err: any) {
      setSearchError(err.message || 'An error occurred during extraction.');
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setExtractedLeads([]);
    setSearchQuery('');
    setSearchId('');
    setSearchError('');
  };

  return (
    <SearchContext.Provider value={{ isSearching, searchError, extractedLeads, searchQuery, searchId, startSearch, clearSearch }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
