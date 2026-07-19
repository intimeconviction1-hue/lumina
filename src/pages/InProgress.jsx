import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Redirect vers AllWorks filtré — migration douce
export default function InProgress() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/AllWorks?status=En+cours", { replace: true });
  }, []);
  return null;
}