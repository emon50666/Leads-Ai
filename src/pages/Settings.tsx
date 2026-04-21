import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Save, Loader2, CheckCircle2 } from 'lucide-react';

export function Settings() {
  const { user } = useAuth();
  const [sheetUrl, setSheetUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      try {
        const docRef = doc(db, 'users', user.uid, 'settings', 'integration');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().googleSheetUrl) {
          setSheetUrl(docSnap.data().googleSheetUrl);
        } else {
          setSheetUrl('https://script.google.com/macros/s/AKfycbzXfjISVkOEfY49jnFhcVGx7hxPinIqP6XTDWs1PGqRavy6rlUyx3rqjGGfIG7bk2AbYQ/exec');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}/settings/integration`);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      const docRef = doc(db, 'users', user.uid, 'settings', 'integration');
      await setDoc(docRef, {
        googleSheetUrl: sheetUrl,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/settings/integration`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Configure your integrations and preferences.</p>
      </div>

      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-800/50 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Google Sheets Integration</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Connect a Google Sheet Webhook URL to automatically append new leads when they are saved.
          (Note: You need to set up a Google Apps Script Webhook to receive POST requests).
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="sheetUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Webhook URL
            </label>
            <input
              type="url"
              id="sheetUrl"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saveSuccess ? 'Saved!' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
