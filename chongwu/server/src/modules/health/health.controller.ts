import { Controller, Get, Post, Body, Param, UseGuards, Req, Put, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HealthService } from './health.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { CreateHealthRecordDto } from './dto/create-health-record.dto';

@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Post('pets')
  @UseGuards(AuthGuard('jwt'))
  async createPet(@Body() dto: CreatePetDto, @Req() req) {
    return this.healthService.createPet(req.user.userId, dto);
  }

  @Get('pets')
  @UseGuards(AuthGuard('jwt'))
  async getMyPets(@Req() req) {
    return this.healthService.getMyPets(req.user.userId);
  }

  @Get('pets/:id')
  @UseGuards(AuthGuard('jwt'))
  async getPetDetail(@Param('id') id: string) {
    return this.healthService.getPetDetail(Number(id));
  }

  @Post('records')
  @UseGuards(AuthGuard('jwt'))
  async createRecord(@Body() dto: CreateHealthRecordDto, @Req() req) {
    return this.healthService.createRecord(req.user.userId, dto);
  }

  @Get('records/:petId')
  @UseGuards(AuthGuard('jwt'))
  async getPetRecords(@Param('petId') petId: string) {
    return this.healthService.getPetRecords(Number(petId));
  }

  @Get('reminders')
  @UseGuards(AuthGuard('jwt'))
  async getReminders(@Req() req) {
    return this.healthService.getReminders(req.user.userId);
  }
}
