import React, { useState, ChangeEvent, SetStateAction, Dispatch } from 'react'
import { AutoComplete, Button } from 'rsuite'
import 'rsuite/AutoComplete/styles/index.css'
import Keyboard from '../components/common/Keyboard'
import BackspaceButton from '../components/common/BackspaceButton'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface Props {
  plateNumberState: {
    plateNumber: string
    setPlateNumber: Dispatch<SetStateAction<string>>
  }
}

function MainForm({ plateNumberState }: Props) {
  const { plateNumber, setPlateNumber } = plateNumberState
  const navigate = useNavigate()

  const handleClick = (letter: string) => {
    setPlateNumber((v) => v + letter)
  }

  const handleBackspace = () => {
    setPlateNumber((v) => v.slice(0, -1))
  }

  const handleSubmit = () => {
    navigate('payment')
  }

  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3 justify-center">
      <div className="flex gap-3 justify-center">
        <AutoComplete
          disabled
          value={plateNumber}
          data={[]}
          className="h-10 w-96 text-base"
          size="lg"
        />
        <BackspaceButton handleClick={handleBackspace} />
      </div>
      <Keyboard handleClick={handleClick} />
      <Button appearance="primary" onClick={handleSubmit} size="lg">
        {t('next')}
      </Button>
    </div>
  )
}

export default MainForm
