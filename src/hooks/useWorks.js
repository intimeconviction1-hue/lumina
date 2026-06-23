import { useQuery } from "@tanstack/react-query";
import { worksApi } from "@/api/works";
export const WORKS_KEY = ["works"];
export function useWorks() {
  return useQuery({ queryKey: WORKS_KEY, queryFn: () => worksApi.list("-created_date", 5000) });
}