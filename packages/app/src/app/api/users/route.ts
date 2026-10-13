import { makeCrudRoute, requireAdmin, toUserDto } from "@devmentor/core";
import { userInputSchema } from "@devmentor/core/validators/auth/user-input.schema";
import { paginationQuerySchema } from "@devmentor/core/validators/pagination.schema";

export const { GET, POST } = makeCrudRoute({
  service: "userService",
  authorize: requireAdmin,
  list: {
    query: paginationQuerySchema,
    run: async (users, query) => {
      const page = await users.list(query);
      return { ...page, items: page.items.map(toUserDto) };
    },
  },
  create: {
    body: userInputSchema,
    run: async (users, input) => toUserDto(await users.create(input)),
  },
});
