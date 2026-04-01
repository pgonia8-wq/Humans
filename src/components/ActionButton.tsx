import React, { useContext } from "react";
import { LanguageContext } from "../LanguageContext";

interface Props {
  labelKey?: string;
  label?: string;
  onClick: () => void;
  className?: string;
}

const ActionButton: React.FC<Props> = ({ labelKey, label, onClick, className = "" }) => {
  const context = useContext(LanguageContext);

  const t = context?.t || ((key: string) => key);

  const text = label !== undefined ? label : labelKey ? t(labelKey) : "";

  return (
    <button
      onClick={onClick}
      className={`
        px-6 py-2.5 font-semibold text-white rounded-full 
        bg-gradient-to-r from-gray-800 to-gray-700 
        hover:from-gray-700 hover:to-gray-600 
        shadow-lg shadow-black/40 transition-all duration-300 
        active:scale-95 border border-gray-700/50 
        ${className}
      `}
    >
      {text}
    </button>
  );
};

export default ActionButton;
