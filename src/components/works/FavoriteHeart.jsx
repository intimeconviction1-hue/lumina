import { useEffect, useRef } from "react";
import { Heart } from "lucide-react";

export default function FavoriteHeart({ favorite, className }) {
  const icon = useRef(null);
  const previous = useRef(Boolean(favorite));

  useEffect(() => {
    const active = Boolean(favorite);
    if (previous.current === active) return;
    previous.current = active;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const animation = icon.current?.animate([
      { transform: "scale(1)" },
      { transform: active ? "scale(1.35)" : "scale(0.84)" },
      { transform: "scale(1)" },
    ], { duration: 260, easing: "ease-out" });
    return () => animation?.cancel();
  }, [favorite]);

  return (
    <Heart
      ref={icon}
      aria-hidden="true"
      className={`${className} ${favorite ? "fill-[#EC4899] text-[#EC4899]" : "text-white"}`}
    />
  );
}
