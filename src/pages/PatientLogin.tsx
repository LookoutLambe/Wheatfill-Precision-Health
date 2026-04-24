import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  createPatientAccount,
  isPatientAuthed,
  loginPatient,
} from '../patient/patientAuth'

export default function PatientLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = useMemo(() => {
    const raw = new URLSearchParams(location.search).get('next')
    return raw && raw.startsWith('/patient') ? raw : '/patient'
  }, [location.search])

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [city, setCity] = useState('')
  const [stateProv, setStateProv] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isPatientAuthed()) navigate(redirectTo, { replace: true })
  }, [navigate, redirectTo])

  return (
    <div className="page">
      <div className="pageHeaderRow">
        <div>
          <h1 style={{ margin: 0 }}>Patient Portal</h1>
          <p className="muted pageSubtitle">
            Sign in to view and submit your requests.
          </p>
        </div>
        <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
          Home
        </Link>
      </div>

      <section className="card cardAccentNavy" style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>
        <div className="cardTitle">
          <h2 style={{ margin: 0 }}>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
          <span className="pill">Patient</span>
        </div>
        <div className="divider" />

        <div className="formRow">
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Username
            </div>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Example: jordan"
              autoComplete="username"
            />
          </label>

          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Password
            </div>
            <input
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>
        </div>

        {mode === 'signup' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            <div className="formRow">
              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  First name
                </div>
                <input
                  className="input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </label>
              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  Last name
                </div>
                <input
                  className="input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </label>
            </div>

            <div className="formRow">
              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  Birthdate
                </div>
                <input
                  className="input"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  type="date"
                  autoComplete="bday"
                />
              </label>
              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  Email
                </div>
                <input
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="you@email.com"
                />
              </label>
            </div>

            <div className="formRow">
              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  Phone
                </div>
                <input
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  placeholder="(555) 555-5555"
                />
              </label>
              <div />
            </div>

            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Address line 1
              </div>
              <input
                className="input"
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                autoComplete="address-line1"
                placeholder="Street address"
              />
            </label>

            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Address line 2 (optional)
              </div>
              <input
                className="input"
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
                autoComplete="address-line2"
                placeholder="Apt, suite, unit"
              />
            </label>

            <div className="formRow">
              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  City
                </div>
                <input
                  className="input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  autoComplete="address-level2"
                />
              </label>
              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  State
                </div>
                <input
                  className="input"
                  value={stateProv}
                  onChange={(e) => setStateProv(e.target.value)}
                  autoComplete="address-level1"
                  placeholder="TX"
                />
              </label>
            </div>

            <div className="formRow">
              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  ZIP
                </div>
                <input
                  className="input"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  autoComplete="postal-code"
                />
              </label>
              <div />
            </div>
          </div>
        ) : null}

        {error ? (
          <div style={{ marginTop: 10, color: '#7a0f1c', fontSize: 12, fontWeight: 800 }}>
            {error}
          </div>
        ) : null}

        <div className="btnRow" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btnPrimary"
            disabled={
              !username.trim() ||
              !password ||
              (mode === 'signup' &&
                (!firstName.trim() ||
                  !lastName.trim() ||
                  !birthdate ||
                  !email.trim() ||
                  !phone.trim() ||
                  !address1.trim() ||
                  !city.trim() ||
                  !stateProv.trim() ||
                  !postalCode.trim()))
            }
            style={{
              opacity:
                !username.trim() ||
                !password ||
                (mode === 'signup' &&
                  (!firstName.trim() ||
                    !lastName.trim() ||
                    !birthdate ||
                    !email.trim() ||
                    !phone.trim() ||
                    !address1.trim() ||
                    !city.trim() ||
                    !stateProv.trim() ||
                    !postalCode.trim()))
                  ? 0.6
                  : 1,
            }}
            onClick={() => {
              setError(null)
              if (mode === 'login') {
                const res = loginPatient({ username, password })
                if (!res.ok) return setError(res.reason)
                navigate(redirectTo, { replace: true })
                return
              }
              const res = createPatientAccount({
                username,
                password,
                firstName,
                lastName,
                birthdate,
                email,
                phone,
                address1,
                address2,
                city,
                state: stateProv,
                postalCode,
                country: 'US',
              })
              if (!res.ok) return setError(res.reason)
              navigate(redirectTo, { replace: true })
            }}
          >
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => {
              setMode((m) => (m === 'login' ? 'signup' : 'login'))
              setError(null)
              setFirstName('')
              setLastName('')
              setBirthdate('')
              setEmail('')
              setPhone('')
              setAddress1('')
              setAddress2('')
              setCity('')
              setStateProv('')
              setPostalCode('')
            }}
          >
            {mode === 'login' ? 'Need an account?' : 'Have an account?'}
          </button>
        </div>

        <div className="divider" />
        <p className="muted" style={{ margin: 0 }}>
          Prototype only. Accounts are stored locally in your browser.
        </p>
      </section>
    </div>
  )
}

