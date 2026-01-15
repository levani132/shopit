import { Role } from '@sellit/constants';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { AttributesService } from './attributes.service';
import {
  CreateAttributeDto,
  UpdateAttributeDto,
  AddAttributeValueDto,
  UpdateAttributeValueDto,
  ReorderAttributesDto,
  ReorderAttributeValuesDto,
} from './dto/attribute.dto';

@Controller('attributes')
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  /**
   * Get all attributes for a store (public)
   */
  @Get('store/:storeId')
  async getByStore(@Param('storeId') storeId: string) {
    return this.attributesService.findAllByStore(storeId);
  }

  /**
   * Get all attributes for the current user's store
   */
  @Get('my-store')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  async getMyAttributes(
    @Request() req: { user: { storeId: string } },
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.attributesService.findAllByStore(
      req.user.storeId,
      includeInactive === 'true',
    );
  }

  /**
   * Get a single attribute
   */
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.attributesService.findById(id);
  }

  /**
   * Create a new attribute
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  async create(
    @Request() req: { user: { storeId: string } },
    @Body() dto: CreateAttributeDto,
  ) {
    return this.attributesService.create(req.user.storeId, dto);
  }

  /**
   * Update an attribute
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Request() req: { user: { storeId: string } },
    @Body() dto: UpdateAttributeDto,
  ) {
    return this.attributesService.update(id, req.user.storeId, dto);
  }

  /**
   * Delete an attribute
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  async delete(
    @Param('id') id: string,
    @Request() req: { user: { storeId: string } },
  ) {
    return this.attributesService.delete(id, req.user.storeId);
  }

  /**
   * Reorder attributes
   */
  @Post('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  async reorder(
    @Request() req: { user: { storeId: string } },
    @Body() dto: ReorderAttributesDto,
  ) {
    return this.attributesService.reorder(req.user.storeId, dto.attributeIds);
  }

  // --- Attribute Value endpoints ---

  /**
   * Add a value to an attribute
   */
  @Post(':id/values')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  async addValue(
    @Param('id') id: string,
    @Request() req: { user: { storeId: string } },
    @Body() dto: AddAttributeValueDto,
  ) {
    return this.attributesService.addValue(id, req.user.storeId, dto);
  }

  /**
   * Update a value
   */
  @Patch(':id/values/:valueId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  async updateValue(
    @Param('id') id: string,
    @Param('valueId') valueId: string,
    @Request() req: { user: { storeId: string } },
    @Body() dto: UpdateAttributeValueDto,
  ) {
    return this.attributesService.updateValue(id, valueId, req.user.storeId, dto);
  }

  /**
   * Delete a value
   */
  @Delete(':id/values/:valueId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  async deleteValue(
    @Param('id') id: string,
    @Param('valueId') valueId: string,
    @Request() req: { user: { storeId: string } },
  ) {
    return this.attributesService.deleteValue(id, valueId, req.user.storeId);
  }

  /**
   * Reorder values within an attribute
   */
  @Post(':id/values/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  async reorderValues(
    @Param('id') id: string,
    @Request() req: { user: { storeId: string } },
    @Body() dto: ReorderAttributeValuesDto,
  ) {
    return this.attributesService.reorderValues(id, req.user.storeId, dto.valueIds);
  }
}


