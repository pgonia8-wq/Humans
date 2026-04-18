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
        relative px-6 py-3 font-semibold text-white rounded-2xl
        overflow-hidden transition-all duration-200
        active:scale-95 hover:scale-[1.03]
        ${className}
      `}
      style={{
        background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
        boxShadow: "0 4px 20px rgba(99,102,241,0.40)",
      }}
    >
      <span className="relative z-10 tracking-wide">{text}</span>
    </button>
  );
};

export default ActionButton;
