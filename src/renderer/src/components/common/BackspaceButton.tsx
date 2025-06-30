import React from 'react';

interface Props {
  handleClick: () => void;
}

function BackspaceButton({ handleClick }: Props) {
  return (
    <button onClick={handleClick} className="shadow w-12 h-10 text-3xl">
      ←
    </button>
  );
}

export default BackspaceButton;
