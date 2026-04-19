import * as React from "react"

export type OptionsPageFooterConfig = {
  description?: React.ReactNode
  actions: React.ReactNode
}

const OptionsPageFooterContext = React.createContext<
  ((config: OptionsPageFooterConfig | null) => void) | null
>(null)

type OptionsPageFooterProviderProps = {
  children: React.ReactNode
  setFooter: (config: OptionsPageFooterConfig | null) => void
}

export function OptionsPageFooterProvider({
  children,
  setFooter
}: OptionsPageFooterProviderProps) {
  return (
    <OptionsPageFooterContext.Provider value={setFooter}>
      {children}
    </OptionsPageFooterContext.Provider>
  )
}

export function useOptionsPageFooter(config: OptionsPageFooterConfig | null) {
  const setFooter = React.useContext(OptionsPageFooterContext)

  if (!setFooter) {
    throw new Error("useOptionsPageFooter must be used within OptionsPageFooterProvider")
  }

  React.useLayoutEffect(() => {
    setFooter(config)

    return () => {
      setFooter(null)
    }
  }, [config, setFooter])
}
