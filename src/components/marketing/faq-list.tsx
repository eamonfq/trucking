import { faqs } from "@/lib/data/faqs";

export function FaqList() {
  return (
    <div className="grid gap-3">
      {faqs.map((faq) => (
        <details key={faq.question} className="group rounded-lg border border-line-300 bg-cream-50 px-6 open:bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-base font-semibold text-navy-900">
            {faq.question}
            <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-cream-100 font-display text-lg leading-none text-brand-700 transition group-open:rotate-45">+</span>
          </summary>
          <p className="max-w-2xl pb-6 pr-10 text-base leading-7 text-ink-700">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
