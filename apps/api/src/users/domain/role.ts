import type { ERole } from '@gymnotebook/contracts'

export type { ERole }

export interface Role {
  id: number
  name: ERole
}

export const elevatedRoles = ['ROLE_MODERATOR', 'ROLE_ADMIN'] as const satisfies readonly ERole[]
export type ElevatedRole = (typeof elevatedRoles)[number]

export function isElevatedRole(role: ERole): role is ElevatedRole {
  return role === 'ROLE_MODERATOR' || role === 'ROLE_ADMIN'
}
