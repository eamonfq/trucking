import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import {PackageLabel} from './package-label';
vi.stubGlobal('React',React);
vi.mock('next/image',()=>({default:()=>null}));
it('numbers each label and breaks only before subsequent labels, even with trailing siblings',()=>{
 const markup=renderToStaticMarkup(<>{[1,2,3,4,5].map(i=><PackageLabel key={i} code={'BX-'+i} dimensions={{length:16,width:26,height:15}} weightLb={50+i} lockerCode="AL-MX-0001" position={i+'/5'} controls={i===1}/>)}<div aria-live="polite"/></>);
 const container=document.createElement('div');container.innerHTML=markup;
 expect(container.querySelectorAll('.package-label')).toHaveLength(5);
 expect(container.querySelectorAll('.label-controls')).toHaveLength(1);
 expect(container.querySelectorAll('.label-caption')[4].textContent).toContain('5/5');
 expect(container.querySelector('style')!.textContent).toContain('.label-screen~.label-screen{break-before:page;page-break-before:always}');
 expect(markup).not.toContain('break-after:page');
 expect(markup).not.toContain('.label-screen:last-child');
});
it('prints one reception number with an unambiguous barcode identity per unit',()=>{
 const container=document.createElement('div');
 container.innerHTML=renderToStaticMarkup(<>{[1,2].map(i=><PackageLabel key={i} code={`BX-260001-0${i}`} receptionCode="BX-260001" dimensions={{length:10,width:10,height:10}} weightLb={20} lockerCode="AL-MX-0001" position={`${i}/2`}/>)}</>);
 expect(Array.from(container.querySelectorAll('h1'),n=>n.textContent)).toEqual(['BX-260001','BX-260001']);
 expect(Array.from(container.querySelectorAll('svg'),n=>n.getAttribute('aria-label'))).toEqual(['Código de barras BX-260001-01','Código de barras BX-260001-02']);
});
