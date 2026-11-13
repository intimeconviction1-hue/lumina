import { useQuery } from "@tanstack/react-query";
import { worksApi } from "@/api/works";
export const WORKS_KEY = ["works"];
export function useWorks() {
  return useQuery({ queryKey: WORKS_KEY, queryFn: ({ signal }) => worksApi.list("-created_date", 5000, { view: "catalogue", signal }) });
}