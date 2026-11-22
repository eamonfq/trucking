import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach, expect, it, vi} from 'vitest';
import {AdminShell} from './admin-shell';
import {StaffManager} from './staff-manager';
import {SupportDesk, type DeskTicket} from './support-desk';
import {OperationEditor} from './operation-editor';
import {I18nProvider} from '@/lib/i18n/provider';
import {translateMessage} from '@/lib/i18n/translate';
import {serverMessages} from '@/lib/i18n/messages';
import type {EditableRecord} from '@/lib/types/editing';

vi.mock('next/navigation', () => ({usePathname: () => '/admin/usuarios', useRouter: () => ({refresh: vi.fn(), push: vi.fn()})}));
vi.mock('@/lib/auth/actions', () => ({signOut: vi.fn()}));
vi.mock('@/lib/i18n/actions', () => ({setLocale: vi.fn(async () => ({ok: true}))}));
vi.mock('@/lib/auth/staff-actions', () => ({saveAdministrativeStaff: vi.fn(), inviteAdministrativeStaff: vi.fn()}));
vi.mock('@/lib/auth/operations-actions', () => ({manageSupportTicket: vi.fn()}));
vi.mock('@/lib/auth/edit-actions', () => ({editOperation: vi.fn()}));
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

it('shows the admin navigation in English with the language switcher on desktop and mobile', () => {
  const node = mountEnglish(<AdminShell user={{role: 'admin'}}><p>content</p></AdminShell>);
  for (const label of ['Overview', 'To-do', 'Receiving', 'Destination receiving', 'Trucks', 'Invoices', 'Users and permissions', 'Settings', 'Menu', 'Log out', 'A&L Operations']) expect(node.textContent).toContain(label);
  expect(node.textContent).not.toContain('Configuración');
  expect(node.querySelectorAll('[role="group"][aria-label="Language"]')).toHaveLength(2);
  expect(node.querySelector('a[aria-current="page"]')?.textContent).toBe('Users and permissions');
});

it('translates staff permissions at display time and keeps the section ids', () => {
  const staff = [{id: '1', firstName: 'Rayza', paternalLastName: 'Morales', email: 'r@example.invalid', phone: '', active: true, fullAccess: false, permissions: ['recepcion', 'facturas'] as ('recepcion' | 'facturas')[]}];
  const node = mountEnglish(<StaffManager staff={staff} actorId="owner"/>);
  expect(node.textContent).toContain('1 active user');
  expect(node.textContent).toContain('Receiving · Invoices and charges');
  expect(node.textContent).toContain('Create user');
  expect(node.textContent).toContain('1 user · Page 1 of 1');
});

it('translates code-generated support messages but keeps what people typed', () => {
  const ticket: DeskTicket = {id: 't1', code: 'TK-1', userId: 'u1', subject: 'Mi caja', status: 'en-revision', createdAt: '2026-11-01T10:00:00Z', updatedAt: '2026-11-02T10:00:00Z', customerName: 'Ana', lockerCode: 'AL-MX-0001', messages: [
    {id: 'm1', author: 'cliente', authorName: 'Ana', body: '¿Dónde está mi caja?', at: '2026-11-01T10:00:00Z'},
    {id: 'm2', author: 'soporte', authorName: 'Rayza', body: 'Aclaración administrativa: se corrigió el asunto', at: '2026-11-02T10:00:00Z'},
  ]} as DeskTicket;
  const node = mountEnglish(<SupportDesk tickets={[ticket]}/>);
  expect(node.textContent).toContain('Administrative clarification: se corrigió el asunto');
  expect(node.textContent).toContain('¿Dónde está mi caja?');
  expect(node.textContent).toContain('A&L team');
  expect(node.textContent).toContain('Customer');
  expect(node.textContent).toContain('Not closed');
});

it('translates the editor and the field labels sent by the server', () => {
  const records: EditableRecord[] = [{kind: 'payment', id: 'i1', label: 'AL-26-0001 · reporte pago-reportado', expected: 'x'.repeat(64), locked: false, fields: [{key: 'method', label: 'Método de pago', value: 'zelle', type: 'text'}]}];
  const node = mountEnglish(<OperationEditor records={records}/>);
  expect(node.textContent).toContain('Edit with traceability');
  expect([...node.querySelectorAll('option')].map(option => option.textContent)).toContain('Payment reports · AL-26-0001 · report pago-reportado');
});

it('translates admin action messages, including templates', () => {
  const en = (text: string) => translateMessage(serverMessages, 'en', text);
  expect(en('La carga superaría el límite de peso real de 500 lb.')).toBe('The load would exceed the actual weight limit of 500 lb.');
  expect(en('La caja BX-260001 no puede pasar de en-bodega a entregada.')).toBe("Box BX-260001 can't move from en-bodega to entregada.");
  expect(en('Permisos guardados. Las sesiones anteriores del usuario fueron cerradas.')).toBe("Permissions saved. The user's previous sessions were closed.");
  expect(en('Los registros cambiaron. Consulta nuevamente la vista previa antes de eliminar.')).toBe('The records changed. Check the preview again before deleting.');
});
