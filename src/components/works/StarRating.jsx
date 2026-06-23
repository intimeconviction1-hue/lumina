import React, { useState } from "react";

/**
 * Notation avec demi-étoiles (0 à 5, pas de 0.5)
 * Props:
 *   value: number — note actuelle
 *   onChange: (v: number) => void — si omis, lecture seule
 *   size: "sm" | "md" | "lg"
 *   showLabel: boolean (défaut true)
 */

const SIZES = { sm: 16, md: 24, lg: 30 };

let _uidCounter = 0;
function StarIcon({ fill = "empty", size, color = "#D4AF37", emptyColor = "#CBD5E0" }) {
  const uid = `star-half-${++_uidCounter}`;
  if (fill === "full") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
          fill={color} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (fill === "half") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <defs>
          <linearGradient id={uid} x1="0" x2="1" y1="0" y2="0">
            <stop offset="50%" stopColor={color} />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
          fill={`url(#${uid})`} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill="transparent" stroke={emptyColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function StarRating({ value = 0, onChange, size = "md", showLabel = true }) {
  const px = SIZES[size] || SIZES.md;
  const readonly = !onChange;
  const [hover, setHover] = useState(null);
  const displayed = hover !== null ? hover : value;

  const getFill = (i) => {
    if (displayed >= i) return "full";
    if (displayed >= i - 0.5) return "half";
    return "empty";
  };

  const handleClick = (e, i) => {
    if (readonly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeft = (e.clientX - rect.left) < rect.width / 2;
    const newVal = isLeft ? i - 0.5 : i;
    onChange(newVal === value ? 0 : newVal);
  };

  const handleMove = (e, i) => {
    if (readonly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeft = (e.clientX - rect.left) < rect.width / 2;
    setHover(isLeft ? i - 0.5 : i);
  };

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => !readonly && setHover(null)}
    >
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={readonly}
          className={readonly ? "cursor-default" : "cursor-pointer transition-transform hover:scale-110"}
          style={{ lineHeight: 0, padding: 0, background: "none", border: "none" }}
          onClick={e => handleClick(e, i)}
          onMouseMove={e => handleMove(e, i)}
        >
          <StarIcon fill={getFill(i)} size={px} />
        </button>
      ))}
      {showLabel && value > 0 && (
        <span className="text-[12px] font-semibold ml-1.5" style={{ color: "#D4AF37" }}>
          {Number.isInteger(value) ? value : value.toFixed(1)}/5
        </span>
      )}
    </div>
  );
}