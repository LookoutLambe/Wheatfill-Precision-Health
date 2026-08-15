import { useId, useMemo, useState } from 'react'

/**
 * Interactive dose-titration timeline.
 *
 * Visualizes the typical FDA-labeled escalation schedules already described in
 * the education copy on this page (brand examples: Wegovy for semaglutide,
 * Zepbound for tirzepatide) — steps roughly every 4 weeks when tolerated.
 * Education only; the clinician chooses the actual schedule.
 */

type Med = {
  key: string
  label: string
  brandNote: string
  stepsMg: number[]
}

const MEDS: Med[] = [
  {
    key: 'sema',
    label: 'Semaglutide',
    brandNote: 'labeled example: Wegovy',
    stepsMg: [0.25, 0.5, 1.0, 1.7, 2.4],
  },
  {
    key: 'tirz',
    label: 'Tirzepatide',
    brandNote: 'labeled example: Zepbound',
    stepsMg: [2.5, 5, 7.5, 10, 12.5, 15],
  },
]

const STEP_WEEKS = 4

function fmtMg(mg: number) {
  return mg < 1 ? mg.toFixed(2) : String(mg)
}

export default function TitrationTimeline() {
  const [medKey, setMedKey] = useState('sema')
  const med = MEDS.find((m) => m.key === medKey) || MEDS[0]
  const totalWeeks = med.stepsMg.length * STEP_WEEKS
  const [week, setWeek] = useState(1)
  const weekId = useId()

  const clampedWeek = Math.max(1, Math.min(totalWeeks, week))
  const stepIndex = Math.min(Math.floor((clampedWeek - 1) / STEP_WEEKS), med.stepsMg.length - 1)
  const doseMg = med.stepsMg[stepIndex]
  const maxMg = useMemo(() => Math.max(...med.stepsMg), [med])
  const isMaintenance = stepIndex === med.stepsMg.length - 1

  return (
    <div className="glp1conv" role="group" aria-label="Dose titration timeline">
      <div className="glp1convHead">
        <span className="glp1convEyebrow">Titration explorer</span>
        <span className="glp1convLive" aria-hidden="true">
          <span className="glp1convDot" />
          Live
        </span>
      </div>

      <p className="glp1convLead">
        Doses start low and step up about every <strong>4 weeks</strong> as your body adjusts. Drag the week slider to
        see the typical labeled ramp.
      </p>

      <div className="glp1convPresets" role="group" aria-label="Medication">
        {MEDS.map((m) => (
          <button
            key={m.key}
            type="button"
            aria-pressed={medKey === m.key}
            className={`glp1convChip${medKey === m.key ? ' isActive' : ''}`}
            onClick={() => {
              setMedKey(m.key)
              setWeek(1)
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="titrChart" aria-hidden="true">
        {med.stepsMg.map((mg, i) => (
          <div
            key={mg}
            className={`titrStep${i === stepIndex ? ' isActive' : ''}${i < stepIndex ? ' isPassed' : ''}`}
            style={{ height: `${18 + (mg / maxMg) * 82}%` }}
            title={`Weeks ${i * STEP_WEEKS + 1}–${(i + 1) * STEP_WEEKS}: ${fmtMg(mg)} mg weekly`}
          >
            <span className="titrStepMg">{fmtMg(mg)}</span>
            <span className="titrStepWks">
              wk {i * STEP_WEEKS + 1}–{(i + 1) * STEP_WEEKS}
            </span>
          </div>
        ))}
      </div>

      <div className="glp1convDialRow">
        <label className="glp1convFieldLabel" htmlFor={weekId}>
          Week
          <span className="glp1convUnitsValue">{clampedWeek}</span>
        </label>
        <input
          id={weekId}
          type="range"
          className="glp1convSlider"
          min={1}
          max={totalWeeks}
          step={1}
          value={clampedWeek}
          onChange={(e) => setWeek(Number(e.target.value))}
          aria-valuetext={`Week ${clampedWeek}`}
        />
      </div>

      <div className="glp1convResult">
        <div className="glp1convResultMain">
          <span className="glp1convResultMg">{fmtMg(doseMg)}</span>
          <span className="glp1convResultUnit">mg once weekly</span>
        </div>
        <div className="glp1convResultSub">
          <span>
            Week {clampedWeek} · step {stepIndex + 1} of {med.stepsMg.length}
          </span>
          <span className="glp1convArrow" aria-hidden="true">→</span>
          <span>{isMaintenance ? 'typical labeled maximum' : 'steps up if tolerated'}</span>
        </div>
      </div>

      <p className="glp1convNote">
        Simplified view of typical FDA-labeled escalation for weekly brand products ({med.brandNote}) — steps happen
        only <strong>if tolerated</strong>, and many people stay at an intermediate dose. Compounded preparations
        differ. <strong>Your clinician sets your actual schedule.</strong>
      </p>
    </div>
  )
}
