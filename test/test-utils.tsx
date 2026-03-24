import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { DialogProvider } from '@/contexts/DialogContext';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  route?: string;
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    return (
      <I18nextProvider i18n={i18n}>
        <DialogProvider>
          <SettingsProvider>
            {children}
          </SettingsProvider>
        </DialogProvider>
      </I18nextProvider>
    );
  }

  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

export * from '@testing-library/react';
