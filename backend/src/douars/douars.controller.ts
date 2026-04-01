import { Controller, Get, Param } from '@nestjs/common';
import { DouarsService } from './douars.service';

@Controller('douars')
export class DouarsController {
  constructor(private readonly service: DouarsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
