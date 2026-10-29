import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { schoolService } from '../services/schoolService';

const SchoolModulesContext = createContext(null);

// Fetches the Super-Admin-controlled module on/off switches for the logged-in Admin's own
// school. A module is treated as enabled until the toggles finish loading, and if the request
// fails, so a slow/broken network never locks an admin out of a module that's actually allowed
// (same fail-open convention as useFeatureToggles). Only ADMIN users have a school to scope by.
export const SchoolModulesProvider = ({ children }) => {
  const { isAdmin } = useAuth();
  const [modules, setModules] = useState(null);
  const [loading, setLoading] = useState(isAdmin);

  useEffect(() => {
    if (!isAdmin) {
      setModules(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    schoolService.getOwnModules()
      .then((res) => {
        if (!cancelled && res.success && res.data) setModules(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isAdmin]);

  const isModuleEnabled = useCallback((moduleKey) => {
    if (!isAdmin || !modules) return true;
    const entry = modules.find((m) => m.moduleKey === moduleKey);
    return entry ? entry.enabled : true;
  }, [isAdmin, modules]);

  return (
    <SchoolModulesContext.Provider value={{ modules, loading, isModuleEnabled }}>
      {children}
    </SchoolModulesContext.Provider>
  );
};

export const useSchoolModules = () => {
  const ctx = useContext(SchoolModulesContext);
  if (!ctx) {
    throw new Error('useSchoolModules must be used within a SchoolModulesProvider');
  }
  return ctx;
};
