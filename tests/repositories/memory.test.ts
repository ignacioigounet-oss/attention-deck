import { randomUUID } from "node:crypto";
import { createMemoryRepositories } from "@/data/memory/repositories";
import { runRepositorySuite, type SuiteContext } from "./suite";

const userA = randomUUID();
const userB = randomUUID();
let repos = createMemoryRepositories();

const ctx: SuiteContext = {
  backend: "memory",
  userA,
  userB,
  reposFor: () => repos,
  async reset() {
    repos = createMemoryRepositories();
    repos.users.createForAuth({ id: userA, email: "a@test.local" });
    repos.users.createForAuth({ id: userB, email: "b@test.local" });
  },
};

runRepositorySuite("in-memory", () => ctx);
