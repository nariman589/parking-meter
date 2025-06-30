import React from 'react';

interface Props {
  letter: string;
  handleClick: (letter: string) => void;
}

function KeyboardButton({ handleClick, letter }: Props) {
  const onClick = () => {
    handleClick(letter);
  };
  return (
    <button onClick={onClick} className="shadow uppercase w-12 h-10">
      {letter}
    </button>
  );
}

export default KeyboardButton;
