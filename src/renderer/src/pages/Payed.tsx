import { useHardware } from '../contexts/HardwareContext'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Button } from 'rsuite'

function Payed() {
  const navigate = useNavigate()

  const { plateNumber } = useOutletContext<OutletContextI>()

  const { totalAmount, setTotalAmount } = useHardware()

  const { t } = useTranslation()

  const handleGoToMain = () => {
    navigate('/')
    setTotalAmount(0)
  }

  return (
    <div className="flex gap-2 flex-col items-center">
      <div className="text-xl">{t('payAccepted')}</div>
      <div className="text-xl">
        {t('summ')} {totalAmount}тг. {t('achievedBalance')} {plateNumber}
      </div>
      <Button appearance="primary" size="lg" onClick={handleGoToMain}>
        {t('toMain')}
      </Button>
    </div>
  )
}

export default Payed
