/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuraLayout } from './components/AuraLayout';
import { SetupScreen } from './components/SetupScreen';
import { NavigationApp } from './components/NavigationApp';

export default function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('GAODE_MAP_API_KEY') || '');
  const [secCode, setSecCode] = useState(localStorage.getItem('GAODE_MAP_SECURITY_CODE') || '');

  const hasKeys = apiKey && apiKey !== 'YOUR_API_KEY' && secCode && secCode !== 'YOUR_SECURITY_CODE';

  const handleKeysSubmit = (newApiKey: string, newSecCode: string) => {
    localStorage.setItem('GAODE_MAP_API_KEY', newApiKey);
    localStorage.setItem('GAODE_MAP_SECURITY_CODE', newSecCode);
    setApiKey(newApiKey);
    setSecCode(newSecCode);
  };

  return (
    <AuraLayout>
      {hasKeys ? (
        <NavigationApp apiKey={apiKey} securityCode={secCode} />
      ) : (
        <SetupScreen onSubmit={handleKeysSubmit} />
      )}
    </AuraLayout>
  );
}
