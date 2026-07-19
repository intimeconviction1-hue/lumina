import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Redirect vers AllWorks filtré — migration douce
export default function Watched() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/AllWorks?status=Visionn%C3%A9", { replace: true });
  }, []);
  return null;
}