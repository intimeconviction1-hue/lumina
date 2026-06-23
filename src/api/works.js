import { base44 } from "@/api/base44Client";
const Works = base44.entities.Works;
export const worksApi = {
  list: (sort = "-created_date", limit = 5000) => Works.list(sort, limit),
  get: (id) => Works.get(id),
  create: (data) => Works.create(data),
  update: (id, patch) => Works.update(id, patch),
  remove: (id) => Works.delete(id),
};