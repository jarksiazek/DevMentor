import { makeCrudItemRoute, requireAdmin, toUserDto } from "@devmentor/core";
import { userInputSchema } from "@devmentor/core/validators/auth/user-input.schema";

export const { GET, PUT, DELETE } = makeCrudItemRoute({
  service: "userService",
  authorize: requireAdmin,
  read: { run: async (users, id) => toUserDto(await users.get(id)) },
  update: {
    body: userInputSchema,
    run: async (users, id, input) => toUserDto(await users.update(id, input)),
  },
  remove: { run: (users, id) => users.delete(id) },
});
