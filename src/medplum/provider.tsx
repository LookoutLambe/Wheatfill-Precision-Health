import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { MedplumClient } from '@medplum/core'
import type { Resource } from '@medplum/fhirtypes'
import { createMedplumClient } from './client'

type MedplumContextValue = {
  medplum: MedplumClient
  profile: Resource | null
  loading: boolean
  refreshProfile: () => void
  signOut: () => void
}

const Ctx = createContext<MedplumContextValue | null>(null)

export function MedplumAppProvider({ children }: { children: React.ReactNode }) {
  const medplum = useMemo(() => createMedplumClient(), [])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Resource | null>(null)

  const refreshProfile = () => {
    setLoading(true)
    try {
      const p = medplum.getProfile() as Resource | undefined
      setProfile(p || null)
    } finally {
      setLoading(false)
    }
  }

  const signOut = () => {
    try {
      medplum.signOut()
    } finally {
      setProfile(null)
      setLoading(false)
    }
  }

  useEffect(() => {
    // MedplumClient emits a 'change' event when auth state changes.
    const onChange = () => refreshProfile()
    ;(medplum as any).addEventListener?.('change', onChange)
    refreshProfile()
    return () => {
      ;(medplum as any).removeEventListener?.('change', onChange)
    }
  }, [medplum])

  return <Ctx.Provider value={{ medplum, profile, loading, refreshProfile, signOut }}>{children}</Ctx.Provider>
}

export function useMedplumApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('MedplumAppProvider missing')
  return v
}

