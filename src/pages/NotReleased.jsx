import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function NotReleased() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/AllWorks?status=Pas+sorti", { replace: true });
  }, []);
  return null;
}