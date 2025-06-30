import RuIcon from '../assets/icons/ru.svg?react'
import EnIcon from '../assets/icons/en.svg?react'
import KzIcon from '../assets/icons/kz.svg?react'

import { en } from './languages/en'
import { ru } from './languages/ru'
import { kz } from './languages/kz'

const languages = [
  {
    locale: 'en',
    icon: <EnIcon />
  },
  {
    locale: 'ru',
    icon: <RuIcon />
  },
  {
    locale: 'kz',
    icon: <KzIcon />
  }
]

export { ru, en, kz, languages }
