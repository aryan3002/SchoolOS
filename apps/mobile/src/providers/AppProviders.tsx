/**
 * App Providers Wrapper
 * 
 * Wraps all screens with necessary context providers
 */

import React from 'react';
import { ThemeProvider, lightTheme } from '@/theme';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider value={lightTheme}>
      {children}
    </ThemeProvider>
  );
}
