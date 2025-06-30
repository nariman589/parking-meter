import moment from 'moment'
import React, { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useHardware } from '../contexts/HardwareContext'
import { Button } from 'rsuite'
import HttpService from '../services/HttpService'
import { generateTransactionId } from '../utils/generateTransactionId'
import { useTranslation } from 'react-i18next'

function Card() {
  const { billingData, plateNumber, setErrorMessage, setShowErrorModal, config } =
    useOutletContext<OutletContextI>()
  const {
    cardReaderPayedStatus,
    error,
    initializeCardReader,
    startCardSale,
    cardReaderLastError,
    setTotalAmount,
    setCardReaderPayedStatus,
    clearErrors
  } = useHardware()

  const [paymentStatus, setPaymentStatus] = useState<string>('')

  const { t } = useTranslation()

  const navigate = useNavigate()

  useEffect(() => {
    const initReader = async () => {
      try {
        await initializeCardReader()
        handleCardPayment()
      } catch (err) {
        console.error('Ошибка при инициализации кардридера:', err)
      }
    }

    initReader()
    return clearErrors
  }, [])

  useEffect(() => {
    checkIsPayed()
  }, [cardReaderPayedStatus])

  useEffect(() => {
    if (cardReaderLastError) {
      setErrorMessage(cardReaderLastError)
      setShowErrorModal(true)
    }
  }, [cardReaderLastError])

  const checkIsPayed = async () => {
    switch (cardReaderPayedStatus) {
      case 'payed': {
        setPaymentStatus(t('paymentSuccess'))
        await HttpService.doPay({
          account: plateNumber,
          command: 'pay',
          txn_id: generateTransactionId(),
          parkomat: config.Parkomat || '',
          sum: billingData.sum.toString(),
          change: '0',
          ikkmOnline: 'false',
          payment_details: '',
          rrn: '',
          type: 'card'
        })
        setTotalAmount(billingData.sum)
        setCardReaderPayedStatus('waiting')
        navigate('/payed')
        break
      }
      case 'not payed': {
        setErrorMessage(error || '')
        setShowErrorModal(true)
        setCardReaderPayedStatus('waiting')
        break
      }
      default: {
      }
    }
  }

  const handleCardPayment = async () => {
    setPaymentStatus(t('cardReader.paymentWait'))
    try {
      startCardSale(billingData?.sum)
    } catch (err) {
      console.error(t('cardReader.paymentError'), err)
      setPaymentStatus(t('paymentError'))
    }
  }

  return (
    <div className="flex flex-col gap-2 items-center">
      <h4 className="text-center">{t('cardReader.enterCard')}</h4>
      <div>{t('plateNumber')}:</div>
      <div className="text-lg font-semibold">{plateNumber}</div>
      <div>{t('leaveTime')}:</div>
      <div className="text-lg font-semibold">
        {moment(billingData?.in_date).format('HH:mm, DD.MM.YYYY')}
      </div>
      <div>{t('payAmount')}:</div>
      <div className="text-lg font-semibold">{billingData?.sum}</div>

      {cardReaderLastError && (
        <div className="text-red-500">
          <strong>{t('cardReader.error')}:</strong> {cardReaderLastError}
        </div>
      )}
      <div className="text-lg font-semibold">{paymentStatus}</div>
    </div>
  )
}

export default Card
