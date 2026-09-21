import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import {PackageLabel} from './package-label';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import JsBarcode from 'jsbarcode';
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
it('prints sender and recipient contacts separately and explicitly marks missing dimensions',()=>{
 const markup=renderToStaticMarkup(<PackageLabel code="BX-260015-01" receptionCode="BX-260015" position="1/3" dimensions={{length:0,width:0,height:0}} weightLb={50} lockerCode="AL-MX-0008" sender={{name:'Agustín Orozco',phone:'2036900651'}} recipient={{name:'Karla Ponce',phone:'6785437790'}}/>);
 const container=document.createElement('div');container.innerHTML=markup;
 expect(container.querySelectorAll('.label-contact')[0].textContent).toContain('Envía:Agustín Orozco2036900651');
 expect(container.querySelectorAll('.label-contact')[1].textContent).toContain('Recibe:Karla Ponce6785437790');
 expect(markup).toContain('No registradas');expect(markup).not.toContain('0 × 0');
 if(process.env.LABEL_QA==='1'){
  const labels=renderToStaticMarkup(<>{[1,2,3].map(i=><PackageLabel key={i} code={`BX-260015-0${i}`} receptionCode="BX-260015" position={`${i}/3`} controls={i===1} dimensions={i===3?{length:0,width:0,height:0}:{length:16,width:26,height:15}} weightLb={50} lockerCode="AL-MX-0008" sender={{name:'Agustín Orozco',phone:'2036900651'}} recipient={{name:'Karla Ponce',phone:'6785437790'}}/>)}</>);
  const doc=document.createElement('div');doc.innerHTML=labels;
  doc.querySelectorAll('svg').forEach((svg,i)=>JsBarcode(svg,`BX-260015-0${i+1}`,{format:'CODE128',width:2,height:85,margin:20,displayValue:false}));
  doc.querySelectorAll('article').forEach(article=>{const img=document.createElement('img');img.className='label-logo';img.alt='A&L';img.src='data:image/png;base64,'+readFileSync('public/brand/logoayl.png').toString('base64');article.prepend(img);});
  mkdirSync('tmp/pdfs',{recursive:true});writeFileSync('tmp/pdfs/label-qa.html','<!doctype html><html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0}p,h1,dl,dd{margin:0}</style><body>'+doc.innerHTML+'</body></html>');
 }
});
it('prints one reception number with an unambiguous barcode identity per unit',()=>{
 const container=document.createElement('div');
 container.innerHTML=renderToStaticMarkup(<>{[1,2].map(i=><PackageLabel key={i} code={`BX-260001-0${i}`} receptionCode="BX-260001" dimensions={{length:10,width:10,height:10}} weightLb={20} lockerCode="AL-MX-0001" position={`${i}/2`}/>)}</>);
 expect(Array.from(container.querySelectorAll('h1'),n=>n.textContent)).toEqual(['BX-260001','BX-260001']);
 expect(Array.from(container.querySelectorAll('svg'),n=>n.getAttribute('aria-label'))).toEqual(['Código de barras BX-260001-01','Código de barras BX-260001-02']);
});
