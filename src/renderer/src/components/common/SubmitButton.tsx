import React from 'react';

interface Props
  extends React.DetailedHTMLProps<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  > {}

function SubmitButton(props: Props) {
  return (
    <button
      className="m-auto bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 border border-blue-700 rounded w-1/2"
      {...props}
    >
      {props.children}
    </button>
  );
}

export default SubmitButton;
