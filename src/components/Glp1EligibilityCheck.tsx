import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

/**
 * Interactive GLP-1 eligibility pre-check (BMI screen).
 *
 * BMI (US units) = 703 × weight (lb) / height (in)²
 * Common prescribing thresholds for GLP-1 weight-management therapy:
 *   BMI ≥ 30, or BMI ≥ 27 with a weight-related condition.
 *
 * Screening education only — the provider makes the actual determination.
 * Everything runs in the browser; nothing entered here is saved or sent.
 */

const CONDITIONS = [
  { key: 'bp', label: 'High blood pressure' },
  { key: 'sugar', label: 'Prediabetes / type 2 diabetes' },
  { key: 'chol', label: 'High cholesterol' },
  { key: 'apnea', label: 'Sleep apnea' },
] as const

type Verdict = {
  tone: 'strong' | 'likely' | 'maybe' | 'info'
  headline: string
  detail: string
}

export default function Glp1EligibilityCheck() {
  const [feet, setFeet] = useState('5')
  const [inches, setInches] = useState('6')
  const [pounds, setPounds] = useState('')
  const [conds, setConds] = useState<Record<string, boolean>>({})
  const feetId = useId()
  const inchesId = useId()
  const poundsId = useId()

  const hasCondition = CONDITIONS.some((c) => conds[c.key])

  const bmi = useMemo(() => {
    const ft = Number(feet)
    const inch = Number(inches)
    const lb = Number(String(pounds).replace(/[^0-9.]/g, ''))
    const totalIn = ft * 12 + inch
    if (!Number.isFinite(ft) || !Number.isFinite(inch) || !Number.isFinite(lb)) return null
    if (totalIn < 36 || totalIn > 96 || lb < 60 || lb > 800) return null
    return (703 * lb) / (totalIn * totalIn)
  }, [feet, inches, pounds])

  const verdict: Verdict | null = useMemo(() => {
    if (bmi == null) return null
    if (bmi >= 30) {
      return {
        tone: 'strong',
        headline: 'You may be a candidate for GLP-1 therapy.',
        detail:
          'A BMI of 30 or higher is a range where GLP-1 weight-management therapy is commonly considered. A consultation confirms whether it fits your full health picture.',
      }
    }
    if (bmi >= 27 && hasCondition) {
      return {
        tone: 'likely',
        headline: 'You may be a candidate for GLP-1 therapy.',
        detail:
          'A BMI of 27+ together with a weight-related condition is a range where GLP-1 therapy is commonly considered. A consultation confirms whether it fits your full health picture.',
      }
    }
    if (bmi >= 27) {
      return {
        tone: 'maybe',
        headline: 'A consult can tell you for sure.',
        detail:
          'In the 27–29.9 range, GLP-1 therapy is typically considered when a weight-related condition is also present. Your full health picture — including things this quick check does not ask about — is what actually decides it.',
      }
    }
    return {
      tone: 'info',
      headline: 'GLP-1 therapy may not be the first fit — but there are other paths.',
      detail:
        'GLP-1 weight-management therapy is generally prescribed at BMI 27 and above. A consultation can still help with metabolic health, labs, and wellness goals.',
    }
  }, [bmi, hasCondition])

  return (
    <div className="glp1conv" role="group" aria-label="GLP-1 eligibility pre-check">
      <div className="glp1convHead">
        <span className="glp1convEyebrow">Quick check</span>
        <span className="glp1convLive" aria-hidden="true">
          <span className="glp1convDot" />
          Private
        </span>
      </div>

      <p className="glp1convLead">
        Wondering if you would qualify for <strong>GLP-1 therapy</strong>? Enter your height and weight — get an instant,
        private read. Nothing is saved or sent.
      </p>

      <div className="eligInputsRow">
        <label htmlFor={feetId}>
          <span className="glp1convFieldLabel">Height (ft)</span>
          <select id={feetId} className="select" value={feet} onChange={(e) => setFeet(e.target.value)}>
            {['4', '5', '6', '7'].map((f) => (
              <option key={f} value={f}>
                {f} ft
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={inchesId}>
          <span className="glp1convFieldLabel">Height (in)</span>
          <select id={inchesId} className="select" value={inches} onChange={(e) => setInches(e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => String(i)).map((i) => (
              <option key={i} value={i}>
                {i} in
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={poundsId}>
          <span className="glp1convFieldLabel">Weight (lb)</span>
          <input
            id={poundsId}
            className="input"
            inputMode="decimal"
            placeholder="e.g. 210"
            value={pounds}
            onChange={(e) => setPounds(e.target.value)}
          />
        </label>
      </div>

      <div className="eligCondBlock">
        <span className="glp1convFieldLabel">Any of these apply? (optional)</span>
        <div className="glp1convPresets" role="group" aria-label="Weight-related conditions">
          {CONDITIONS.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-pressed={Boolean(conds[c.key])}
              className={`glp1convChip${conds[c.key] ? ' isActive' : ''}`}
              onClick={() => setConds((p) => ({ ...p, [c.key]: !p[c.key] }))}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {bmi != null && verdict ? (
        <div className="glp1convResult">
          <div className="glp1convResultMain">
            <span className="glp1convResultMg">{bmi.toFixed(1)}</span>
            <span className="glp1convResultUnit">your BMI</span>
          </div>
          <div className={`eligVerdict eligVerdict--${verdict.tone}`}>
            <strong>{verdict.headline}</strong>
            <span>{verdict.detail}</span>
            <Link to="/book" className="btn btnPrimary eligVerdictCta" style={{ textDecoration: 'none' }}>
              Book a consultation
            </Link>
          </div>
        </div>
      ) : (
        <p className="glp1convNote" style={{ marginTop: 14 }}>
          Enter your height and weight above to see where you stand.
        </p>
      )}

      <p className="glp1convNote">
        Screening estimate only, based on common BMI thresholds — <strong>not</strong> a medical determination. Your
        provider reviews your full history and decides what is appropriate. Nothing you enter here is stored.
      </p>
    </div>
  )
}
