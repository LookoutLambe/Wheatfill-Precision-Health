/**
 * Wheatfill Precision Health — peptide price list for patient-facing education (/peptides).
 * Edit dollar amounts here only; copy references PRACTICE_PUBLIC_NAME from provider config.
 * Consult visit fees are on the Pricing page unless noted below.
 */

import { PRACTICE_PUBLIC_NAME } from '../config/provider'

const WPH = PRACTICE_PUBLIC_NAME

/** Keys align with PeptideId in peptideEducation.ts */
export type WheatfillPeptidePriceId =
  | 'bpc157'
  | 'tb500'
  | 'ghkcu'
  | 'cjcipa'
  | 'semax'
  | 'motsc'
  | 'aod'
  | 'ta1'
  | 'kpv'

/**
 * Competitive Wheatfill cash-pay list (typical month or course; prescription and pharmacy rules apply).
 * Not a final quote—your clinician confirms medication, dose, and total at the time of care.
 */
export const WHEATFILL_PEPTIDE_PRICE_LIST: Record<WheatfillPeptidePriceId, string> = {
  bpc157: `**${WPH}** — **BPC-157** supervised protocol (when prescribed): **from $189/month** for a standard 4-week supply window, including care coordination and fulfillment through our pharmacy partners where lawfully available. New-patient and follow-up visit fees apply as on our **Pricing** page; labs when ordered are additional.`,
  tb500: `**${WPH}** — **TB-500** supervised protocol (when prescribed): **from $209/month** for a comparable 4-week supply window. **BPC-157 + TB-500** combination (when both prescribed): **from $339/month** bundled in the same care period—competitively priced for recovery-focused plans.`,
  ghkcu: `**${WPH}** — **GHK-Cu** programs focus on **topical** regimens in our model: **from $89** for a 30-day physician-directed cosmeceutical supply when appropriate. Injectable options, if ever clinically and lawfully offered, are quoted individually at consultation.`,
  cjcipa: `**${WPH}** — **CJC-1295 / ipamorelin** growth-hormone–axis protocol (when prescribed): **from $449/month** including medication coordination and follow-up messaging in a typical titration plan; competitive for full medical oversight. Visit fees and optional labs are per our **Pricing** page and your plan.`,
  semax: `**${WPH}** — **Semax / Selank**-class protocols (when product form and legality support care): **from $169 per 4-week course** under supervision, or **$149/month** on a maintenance-style plan when prescribed. Product identity and route are determined in visit—not all forms are available in every season of regulation.`,
  motsc: `**${WPH}** — **MOTS-c** metabolic / longevity-adjacent protocol (when prescribed): **from $299/month** in a structured plan with check-ins, competitive for bundled peptide–lifestyle programs. Excludes add-on labs unless listed in your care agreement.`,
  aod: `**${WPH}** — **AOD-9604** recomposition protocol (when prescribed): **from $179 per 4-week block** of supervised care and medication coordination. For primary weight pharmacotherapy, our **GLP-1** options and **Pricing** page usually drive total cost; we will align the right tool in visit.`,
  ta1: `**${WPH}** — **Thymosin Alpha-1** immune-support protocol (when clinically appropriate and lawfully available): **from $429 per 6-week course** with prescriber oversight, or pro-rated monthly equivalent on longer plans—reflects premium compounding and monitoring.`,
  kpv: `**${WPH}** — **KPV** micro-peptide protocol (when prescribed): **from $159/month** for a standard supervised supply period—competitive entry pricing for barrier / inflammation–focused plans. Final total depends on strength and duration your clinician orders.`,
}
