import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach, expect, it, vi} from 'vitest';
import {QuoteCalculator} from './quote-calculator';
import {BOX_CATEGORIES} from '@/lib/config/box-categories';
import {DEFAULT_WEIGHT_PRICING} from '@/lib/utils/billing';

vi.stubGlobal('React', React);
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
const mounts: Array<{root: ReturnType<typeof createRoot>; node: HTMLElement}> = [];
function mount(pricing = DEFAULT_WEIGHT_PRICING) {
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  mounts.push({root, node});
  act(() => root.render(<QuoteCalculator rates={[...BOX_CATEGORIES]} weightPricing={pricing}/>));
  return node;
}
function fill(node: HTMLElement, index: number, value: string) {
  const input = node.querySelectorAll<HTMLInputElement>('input[type="number"]')[index];
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', {bubbles: true}));
  });
}
function mode(node: HTMLElement, label: string) {
  const target = [...node.querySelectorAll('fieldset label')].find(item => item.textContent === label)!;
  act(() => target.querySelector<HTMLInputElement>('input')!.click());
}
afterEach(() => {
  for (const {root, node} of mounts.splice(0)) {
    act(() => root.unmount());
    node.remove();
  }
});
it('quotes volume from dimensions without requiring or charging real weight', () => {
  const node = mount();
  ['10','16','12'].forEach((value, index) => fill(node, index, value));
  expect(node.textContent).toContain('$36.48');
  fill(node, 3, '200');
  expect(node.textContent).toContain('$36.48');
  expect(node.textContent).not.toContain('$80.00');
});
it('uses current dimensional settings, independently of the pound tariff', () => {
  const node = mount({pricePerLbUsd: 99, dimensionalBase: 1000, dimensionalFactor: 20});
  ['10','16','12'].forEach((value, index) => fill(node, index, value));
  expect(node.textContent).toContain('$38.40');
});
it('quotes actual pounds only, without dimensions, rounding up once', () => {
  const node = mount();
  mode(node, 'Por peso');
  expect(node.querySelectorAll('input[type="number"]')).toHaveLength(1);
  fill(node, 0, '50.2');
  expect(node.textContent).toContain('$163.20');
});
it('preserves separately configured fixed category prices', () => {
  const node = mount();
  mode(node, 'Precio fijo');
  ['10','16','12','40'].forEach((value, index) => fill(node, index, value));
  expect(node.textContent).toContain('$80.00');
  expect(BOX_CATEGORIES[0].priceUsd).toBe(80);
});
