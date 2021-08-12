import { IsMongoId, IsString, MaxLength } from 'class-validator';

export class RoomMessageDto {
  @IsString()
  @MaxLength(2)
  message: string;

  @IsMongoId()
  roomId: string;
}
