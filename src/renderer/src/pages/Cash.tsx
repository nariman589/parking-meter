import React, { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import moment from 'moment'
import { useHardware } from '../contexts/HardwareContext'
import { CoinAcceptorError, BillAcceptorError } from '../interfaces/electron'
import { Button, Loader } from 'rsuite'
import HttpService from '../services/HttpService'
import { generateTransactionId } from '../utils/generateTransactionId'
import { useTranslation } from 'react-i18next'

function Cash() {
  const { billingData, plateNumber, config } = useOutletContext<OutletContextI>()
  const {
    hardwareStatus,
    error,
    totalAmount,
    initAndActivateHardware,
    deactivateHardware,
    disposeAll,
    clearErrors
  } = useHardware()

  const { t } = useTranslation()

  const [log, setLog] = useState<string[]>([])

  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    const setupHardware = async () => {
      try {
        await initAndActivateHardware()
      } catch (err) {
        console.error('Ошибка при активации оборудования:', err)
        setLog((prevLog) => [
          ...prevLog,
          `Ошибка при активации оборудования: ${err instanceof Error ? err.message : String(err)}`
        ])
      }
    }

    setupHardware()

    const handleCoinAcceptorError = (
      _event: Electron.IpcRendererEvent,
      error: CoinAcceptorError
    ) => {
      setLog((prevLog) => [...prevLog, `Ошибка монетоприемника: ${error.errorMessage}`])
    }

    const handleBillAcceptorError = (
      _event: Electron.IpcRendererEvent,
      error: BillAcceptorError
    ) => {
      setLog((prevLog) => [...prevLog, `Ошибка купюроприемника: ${error.errorMessage}`])
    }

    window.electronAPI.onCoinAcceptorError(handleCoinAcceptorError)
    window.electronAPI.onBillAcceptorError(handleBillAcceptorError)

    return () => {
      disposeAll().catch(console.error)
      deactivateHardware().catch(console.error)
      window.electronAPI.removeAllListeners('coin-acceptor-error')
      window.electronAPI.removeAllListeners('bill-acceptor-error')
      clearErrors()
    }
  }, [])

  const handlePayment = async () => {
    setLoading(true)
    HttpService.doPay({
      account: plateNumber,
      command: 'pay',
      txn_id: generateTransactionId(),
      parkomat: config.Parkomat || '',
      sum: totalAmount.toString(),
      change: '0',
      ikkmOnline: 'false',
      payment_details: '',
      rrn: '',
      type: 'default'
    }).then(() => {
      setLoading(false)
      navigate('/payed')
    })
  }

  if (hardwareStatus !== 'active') return <Loader />

  return (
    <div className="flex flex-col gap-2 items-center">
      <div>{t('plateNumber')}:</div>
      <div className="text-lg font-semibold">{plateNumber}</div>
      <div>{t('leaveTime')}:</div>
      <div className="text-lg font-semibold">
        {moment(billingData?.in_date).format('HH:mm, DD.MM.YYYY')}
      </div>
      <div>{t('payAmount')}:</div>
      <div className="text-lg font-semibold">{billingData?.sum}</div>
      <div>{t('receivedSum')}:</div>
      <div className="text-lg font-semibold">{totalAmount}</div>

      {error && (
        <div className="text-red-500">
          <strong>{t('error')}:</strong> {error}
        </div>
      )}
      <Button
        disabled={loading}
        startIcon={loading && <Loader />}
        appearance="primary"
        size="lg"
        onClick={handlePayment}
      >
        {t('pay')}
      </Button>
      <div className="mt-4">
        <ul className="list-disc pl-5">
          {log.map((entry, index) => (
            <li key={index}>{entry}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default Cash
