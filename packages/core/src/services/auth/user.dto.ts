import type { User } from "@devmentor/db";

/** JSON shape of a user in API responses. Whitelist fields; never serialize the entity. */
export interface UserDto {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export function toUserDto(user: User): UserDto {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt.toISOString() };
}
