/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AuraLayout } from './components/AuraLayout';
import { SetupScreen } from './components/SetupScreen';
import { NavigationApp } from './components/NavigationApp';
import { FloorPlanLayout } from './components/FloorPlanLayout';
import { safeGetStorage, safeSetStorage } from './utils/storage';

export default function App() {
  const [apiKey, setApiKey] = useState(safeGetStorage('GAODE_MAP_API_KEY') || '');
  const [secCode, setSecCode] = useState(safeGetStorage('GAODE_MAP_SECURITY_CODE') || '');
  const [appMode, setAppMode] = useState<'hunt' | 'layout'>('hunt');

  const [isHuntMounted, setIsHuntMounted] = useState(appMode === 'hunt');
  const [isLayoutMounted, setIsLayoutMounted] = useState(appMode === 'layout');

  const huntTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const layoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

    if (appMode === 'hunt') {
      setIsHuntMounted(true);
      if (huntTimeoutRef.current) {
        clearTimeout(huntTimeoutRef.current);
        huntTimeoutRef.current = null;
      }
      
      layoutTimeoutRef.current = setTimeout(() => {
        setIsLayoutMounted(false);
      }, TIMEOUT_MS);
    } else if (appMode === 'layout') {
      setIsLayoutMounted(true);
      if (layoutTimeoutRef.current) {
        clearTimeout(layoutTimeoutRef.current);
        layoutTimeoutRef.current = null;
      }
      
      huntTimeoutRef.current = setTimeout(() => {
        setIsHuntMounted(false);
      }, TIMEOUT_MS);
    }
  }, [appMode]);

  const hasKeys = apiKey && apiKey !== 'YOUR_API_KEY' && secCode && secCode !== 'YOUR_SECURITY_CODE';

  const handleKeysSubmit = (newApiKey: string, newSecCode: string) => {
    safeSetStorage('GAODE_MAP_API_KEY', newApiKey);
    safeSetStorage('GAODE_MAP_SECURITY_CODE', newSecCode);
    setApiKey(newApiKey);
    setSecCode(newSecCode);
  };

  return (
    <AuraLayout>
      {/* 智慧找房 (NavigationApp / SetupScreen) */}
      {isHuntMounted && (
        <div 
          className="w-full h-full flex-1 relative flex flex-col"
          style={{ display: appMode === 'hunt' ? 'flex' : 'none' }}
        >
          {hasKeys ? (
            <NavigationApp 
              apiKey={apiKey} 
              securityCode={secCode} 
              onSwitchApp={() => setAppMode('layout')} 
            />
          ) : (
            <SetupScreen 
              onSubmit={handleKeysSubmit} 
              onSwitchApp={() => setAppMode('layout')}
            />
          )}
        </div>
      )}

      {/* 户型安排 (FloorPlanLayout) */}
      {isLayoutMounted && (
        <div 
          className="w-full h-full flex-1 relative flex flex-col"
          style={{ display: appMode === 'layout' ? 'flex' : 'none' }}
        >
          <FloorPlanLayout 
            onSwitchApp={() => setAppMode('hunt')} 
          />
        </div>
      )}
    </AuraLayout>
  );
}
