import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Redirect vers AllWorks filtré sur les œuvres marquées "urgent".
export default function Priority() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/AllWorks?priority=urgent", { replace: true });
  }, []);
  return null;
}