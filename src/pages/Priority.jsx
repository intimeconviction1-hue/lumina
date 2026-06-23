import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Redirect vers AllWorks filtré — migration douce
export default function Priority() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/AllWorks?status=En+veille", { replace: true });
  }, []);
  return null;
}