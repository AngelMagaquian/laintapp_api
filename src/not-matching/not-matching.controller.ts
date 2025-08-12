import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { NotMatchingService } from './not-matching.service';
import { JwtPermissionsGuard } from 'src/auth/jwt-permissions.guard';
import { PermissionAction } from 'src/schemas/permission.schema';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require_permission.decorator';

@Controller('not-matching')
export class NotMatchingController {
    constructor(private readonly notMatchingService: NotMatchingService) {}

    @Get('get-not-matching-total')
    @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
    @RequirePermission('matching', PermissionAction.READ)
    async getNotMatchingTotal(): Promise<any> {
        return this.notMatchingService.getNotMatchingTotal();
    }

    @Get('get-not-matching-total-by-dates')
    @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
    @RequirePermission('matching', PermissionAction.READ)
    async getNotMatchingTotalByDates(): Promise<any> {
        return this.notMatchingService.getNotMatchingTotalByDates();
    }
}
