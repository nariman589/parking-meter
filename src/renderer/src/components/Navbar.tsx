import React, { useEffect, useState } from 'react';
import moment from 'moment';
import { languages } from '../locale';
import i18n from '../locale/i18n';

interface Props {
  config: any;
}

function NavBar({ config }: Props) {
  const [time, setTime] = useState(moment().format('hh:mm:ss'));
  const [date, setDate] = useState(moment().format('dd:mm:yyyy'));

  useEffect(() => {
    const updateDateTime = () => {
      setTime(moment().format('HH:mm:ss'));
      setDate(moment().format('DD.MM.YYYY'));
    };

    const intervalId = setInterval(updateDateTime, 1000);

    // Очистка интервала при размонтировании компонента
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="navbar flex justify-between">
        <div className="flex flex-col">
          <div>{config.Parkomat}</div>
          <div>{config.objectName}</div>
        </div>
        <div className="flex flex-col">
          <div>{time}</div>
          <div>{date}</div>
        </div>
        <div>
          {languages.map((lang) => (
            <div
              key={lang.locale}
              onClick={() => {
                i18n.changeLanguage(lang.locale);
                localStorage.setItem('language', lang.locale);
              }}
            >
              {lang.icon}
            </div>
          ))}
        </div>
      </div>
      <div className="text-center text-2xl text-red-600">
        ВНИМАНИЕ ! ТЕРМИНАЛ СДАЧИ НЕ ВЫДАЕТ !
      </div>
    </div>
  );
}

export default NavBar;
