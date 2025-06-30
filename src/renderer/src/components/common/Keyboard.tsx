import React from 'react';
import KeyboardButton from './KeyboardButton';

interface Props {
  handleClick: (letter: string) => void;
}

const keyRows = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

function Keyboard({ handleClick }: Props) {
  return (
    <div className="flex gap-3 flex-col">
      {keyRows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-3 justify-center">
          {row.map((key) => (
            <KeyboardButton handleClick={handleClick} key={key} letter={key} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default Keyboard;
