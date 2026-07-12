/**
 * Organization (multi-tenancy) types.
 */

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
}
