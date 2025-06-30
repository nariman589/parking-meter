interface OutletContextI {
  plateNumber: string
  billingData: BillingDataResponseI
  setBillingData: React.Dispatch<React.SetStateAction<BillingDataResponseI>>
  setErrorMessage: React.Dispatch<React.SetStateAction<string>>
  setShowErrorModal: React.Dispatch<React.SetStateAction<boolean>>
  config: ConfigI
}

interface ConfigI {
  Parkomat: string
  PARKOMAT_URL: string
  objectName: string
  address: string
  companyName: string
}

declare module '*.svg?react' {
  import React = require('react')
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>
  const src: string
  export default src
}
