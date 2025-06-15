import { SetMetadata } from '@nestjs/common';
import { PermissionAction } from '../../schemas/permission.schema';

export const RequirePermission = (module: string, action: PermissionAction) =>
  SetMetadata('permissions', { module, action });