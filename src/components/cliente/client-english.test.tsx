import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach, expect, it, vi} from 'vitest';
import {ClientShell} from './client-shell';
import {ShipmentCreator} from './shipment-creator';
import {CloverCheckout} from '@/components/payments/clover-checkout';
import {prepareCloverPayment} from '@/lib/auth/clover-actions';
import {I18nProvider} from '@/lib/i18n/provider';
import {translateMessage} from '@/lib/i18n/translate';
import {clientRecords} from '@/lib/i18n/catalogs/client-pages';
import {serverMessages} from '@/lib/i18n/messages';
import type {Address, Box, Recipient} from '@/lib/types';

vi.mock('next/navigation', () => ({usePathname: () => '/cliente/cajas', useRouter: () => ({refresh: vi.fn(), push: vi.fn()})}));
vi.mock('@/lib/auth/actions', () => ({signOut: vi.fn()}));
vi.mock('@/lib/i18n/actions', () => ({setLocale: vi.fn(async () => ({ok: true}))}));
vi.mock('@/lib/auth/client-actions', () => ({createClientShipment: vi.fn()}));
vi.mock('@/lib/auth/clover-actions', () => ({prepareCloverPayment: vi.fn(), submitCloverPayment: vi.fn(), reconcileCloverPayment: vi.fn()}));
vi.mock('@/components/ui/toast', () => ({useToast: () => ({showToast: vi.fn()})}));
vi.mock('@/components/ui/navigation-pending', () => ({NavigationPending: () => null}));
vi.mock('@/components/marketing/brand-logo', () => ({BrandLogo: () => <span>A&amp;L</span>}));
vi.stubGlobal('React', React);
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

const mounts: Array<{root: ReturnType<typeof createRoot>; node: HTMLElement}> = [];
function mountEnglish(element: React.ReactNode) {
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  mounts.push({root, node});
  act(() => root.render(<I18nProvider locale="en">{element}</I18nProvider>));
  return node;
}
afterEach(() => {
  for (const {root, node} of mounts.splice(0)) {
    act(() => root.unmount());
    node.remove();
  }
  vi.clearAllMocks();
});

const address: Address = {id: 'a', userId: 'u', label: 'Casa', street: 'Hidalgo', exteriorNumber: '20', neighborhood: 'Centro', postalCode: '49540', municipality: 'Valle de Juárez', state: 'Jalisco'};
const recipient: Recipient = {id: 'r', userId: 'u', name: 'Ana López', phone: '+525512345678', addressId: 'a'};
const box: Box = {id: 'b', code: 'BX-TEST', userId: 'u', categoryId: 'small', categoryName: 'Cubo', status: 'en-bodega', dimensions: {length: 10, width: 10, height: 10}, weightLb: 20, customPriceUsd: 45, timeline: []};

it('shows the customer navigation and the language switcher in English, on desktop and mobile', () => {
  const node = mountEnglish(<ClientShell originMode="casillero" userName="Ana López" lockerCode="AL-MX-0095"><p>Content</p></ClientShell>);
  for (const text of ['My boxes', 'My shipments', 'Create shipment', 'Pre-alerts', 'Edit operations', 'Quote calculator', 'Account statement', 'Log out']) expect(node.textContent).toContain(text);
  expect(node.querySelectorAll('[role="group"][aria-label="Language"]')).toHaveLength(2);
  expect(node.querySelector('a[aria-current="page"]')?.textContent).toBe('My boxes');
  expect(node.textContent).not.toContain('Mis cajas');
  expect(node.textContent).not.toContain('Cerrar sesión');
});

it('builds a shipment in English, including delivery options and flow labels', () => {
  const node = mountEnglish(<ShipmentCreator addresses={[address]} boxes={[box]} recipients={[recipient]} excessPolicy="recargo" deliveryMode="ambas" rates={[]} />);
  for (const text of ['1. Choose boxes at the warehouse', '2. Delivery', 'Summary', 'Reference total', 'Confirm shipment', 'Select boxes to see the breakdown by category.', 'My addresses']) expect(node.textContent).toContain(text);
  const options = [...node.querySelectorAll('option')].map((option) => option.textContent);
  expect(options).toEqual(expect.arrayContaining(['Select', 'Pick up at a location', 'Home delivery']));
  expect(node.textContent).not.toMatch(/Elige|Entrega a domicilio|Resumen/);

  const single = mountEnglish(<ShipmentCreator addresses={[address]} boxes={[box]} recipients={[recipient]} excessPolicy="recargo" deliveryMode="domicilio" rates={[]} />);
  expect(single.textContent).toContain('For now, A&L only offers one delivery method: home delivery.');
});

it('translates Clover messages that arrive in Spanish from the server', async () => {
  vi.mocked(prepareCloverPayment).mockResolvedValue({ok: false, error: 'Selecciona entre 1 y 50 facturas.'});
  const node = mountEnglish(<CloverCheckout invoiceIds={['one']} />);
  expect(node.textContent).toContain('Pay with Clover');
  const open = [...node.querySelectorAll('button')].find((button) => button.textContent === 'Open secure payment')!;
  expect(open).toBeTruthy();
  await act(async () => open.click());
  expect(node.querySelector('[role="alert"]')?.textContent).toBe('Select between 1 and 50 invoices.');
});

it('translates stored activity, payment methods, billing details and action messages', () => {
  expect(translateMessage(clientRecords, 'en', 'Dirección Casa actualizada.')).toBe('Address Casa updated.');
  expect(translateMessage(clientRecords, 'en', 'Dirección actualizada.')).toBe('Address updated.');
  expect(translateMessage(clientRecords, 'en', 'transferencia')).toBe('transfer');
  expect(translateMessage(clientRecords, 'en', 'Peso real 12 lb · cobro 12 lb × USD 3.20')).toBe('Actual weight 12 lb · billed 12 lb × USD 3.20');
  expect(translateMessage(clientRecords, 'en', 'Peso real 12 lb · dimensional 9.60 lb · cobro 12 lb × USD 3.20')).toBe('Actual weight 12 lb · dimensional 9.60 lb · billed 12 lb × USD 3.20');
  expect(translateMessage(clientRecords, 'en', 'Volumen · (10 × 16 × 12 in ÷ 1000) × 19 = USD 36.48 · peso real informativo 8 lb')).toBe('Volume · (10 × 16 × 12 in ÷ 1000) × 19 = USD 36.48 · actual weight for reference 8 lb');
  expect(translateMessage(serverMessages, 'en', 'Tu sesión ya no es válida.')).toBe('Your session is no longer valid.');
  expect(translateMessage(serverMessages, 'en', 'Clover no está habilitado: Activa CLOVER_ENABLED=true.')).toBe("Clover isn't enabled: Activa CLOVER_ENABLED=true.");
});
