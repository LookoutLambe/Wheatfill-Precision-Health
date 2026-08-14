import { useId, useMemo, useState } from 'react'

/**
 * Interactive GLP-1 units → milligrams converter.
 *
 * Standard insulin syringes are U-100: 100 units = 1 mL. So for a vial at C mg/mL:
 *   volume (mL) = units / 100
 *   dose  (mg)  = volume × C = (units / 100) × C
 *
 * Education only — this is not a prescription and does not replace your provider's dosing.
 */

type Preset = { key: string; label: string; mgPerMl: number | null }

const PRESETS: Preset[] = [
  { key: 'sema25', label: 'Semaglutide · 2.5 mg/mL', mgPerMl: 2.5 },
  { key: 'sema5', label: 'Semaglutide · 5 mg/mL', mgPerMl: 5 },
  { key: 'tirz10', label: 'Tirzepatide · 10 mg/mL', mgPerMl: 10 },
  { key: 'tirz20', label: 'Tirzepatide · 20 mg/mL', mgPerMl: 20 },
  { key: 'custom', label: 'Custom', mgPerMl: null },
]

const MAX_UNITS = 100

function fmtMg(mg: number): string {
  const r = Math.round(mg * 100) / 100
  if (r >= 10) return r.toFixed(1)
  return (Math.round(mg * 100) / 100).toFixed(2)
}

export default function Glp1UnitConverter() {
  const [presetKey, setPresetKey] = useState('sema25')
  const [customMgPerMl, setCustomMgPerMl] = useState('3')
  const [units, setUnits] = useState(20)
  const unitsId = useId()
  const customId = useId()

  const isCustom = presetKey === 'custom'
  const mgPerMl = useMemo(() => {
    if (isCustom) {
      const n = Number(String(customMgPerMl).replace(/[^0-9.]/g, ''))
      return Number.isFinite(n) && n > 0 ? n : 0
    }
    return PRESETS.find((p) => p.key === presetKey)?.mgPerMl ?? 0
  }, [isCustom, customMgPerMl, presetKey])

  const clampedUnits = Math.max(0, Math.min(MAX_UNITS, units))
  const ml = clampedUnits / 100
  const mg = ml * mgPerMl
  const fillPct = (clampedUnits / MAX_UNITS) * 100

  return (
    <div className="glp1conv" role="group" aria-label="GLP-1 units to milligrams converter">
      <div className="glp1convHead">
        <span className="glp1convEyebrow">Interactive tool</span>
        <span className="glp1convLive" aria-hidden="true">
          <span className="glp1convDot" />
          Live
        </span>
      </div>

      <p className="glp1convLead">
        Know your <strong>units</strong> but not your <strong>milligrams</strong>? Pick your vial strength and dial your
        syringe units — see the real dose instantly.
      </p>

      {/* Concentration presets */}
      <div className="glp1convPresets" role="tablist" aria-label="Vial strength">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={presetKey === p.key}
            className={`glp1convChip${presetKey === p.key ? ' isActive' : ''}`}
            onClick={() => setPresetKey(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isCustom ? (
        <label className="glp1convCustom" htmlFor={customId}>
          <span className="glp1convFieldLabel">Concentration (mg/mL)</span>
          <input
            id={customId}
            className="input glp1convCustomInput"
            value={customMgPerMl}
            inputMode="decimal"
            onChange={(e) => setCustomMgPerMl(e.target.value)}
            placeholder="e.g. 3"
          />
        </label>
      ) : null}

      {/* Units slider + syringe */}
      <div className="glp1convDialRow">
        <label className="glp1convFieldLabel" htmlFor={unitsId}>
          Syringe units
          <span className="glp1convUnitsValue">{clampedUnits}</span>
        </label>
        <input
          id={unitsId}
          type="range"
          className="glp1convSlider"
          min={0}
          max={MAX_UNITS}
          step={1}
          value={clampedUnits}
          onChange={(e) => setUnits(Number(e.target.value))}
          aria-valuetext={`${clampedUnits} units`}
        />
        <div className="glp1convSyringe" aria-hidden="true">
          <span className="glp1convSyringeBarrel">
            <span className="glp1convSyringeFill" style={{ width: `${fillPct}%` }} />
            {[0, 20, 40, 60, 80, 100].map((t) => (
              <span key={t} className="glp1convTick" style={{ left: `${t}%` }} />
            ))}
          </span>
          <span className="glp1convSyringeTip" />
        </div>
      </div>

      {/* Result */}
      <div className="glp1convResult">
        <div className="glp1convResultMain">
          <span className="glp1convResultMg">{mgPerMl > 0 ? fmtMg(mg) : '—'}</span>
          <span className="glp1convResultUnit">mg per dose</span>
        </div>
        <div className="glp1convResultSub">
          <span>{clampedUnits} units</span>
          <span className="glp1convArrow" aria-hidden="true">→</span>
          <span>{ml.toFixed(2)} mL</span>
          <span className="glp1convArrow" aria-hidden="true">→</span>
          <span>{mgPerMl > 0 ? `${fmtMg(mg)} mg` : 'set strength'}</span>
        </div>
      </div>

      <p className="glp1convNote">
        Assumes a standard <strong>U-100</strong> insulin syringe (100 units = 1 mL). Educational only — not a
        prescription. Always confirm your dose with your provider.
      </p>
    </div>
  )
}
