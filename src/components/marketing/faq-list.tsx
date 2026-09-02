import { ChevronDown } from "lucide-react";
import { faqs } from "@/lib/data/faqs";

export function FaqList() {
  return <div className="divide-y divide-stone-200 border-y border-stone-200">{faqs.map((faq) => <details key={faq.question} className="group py-2"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-3 text-left font-display text-base font-bold text-navy-950 sm:text-lg">{faq.question}<ChevronDown className="size-5 shrink-0 text-orange-500 transition group-open:rotate-180" /></summary><p className="max-w-3xl pb-5 pr-10 text-sm leading-7 text-navy-500 sm:text-base">{faq.answer}</p></details>)}</div>;
}
