import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateQuery } from 'mongoose';
import { Socket } from 'socket.io';
import { remove } from '../../../shared/utils/remove';
import { User } from '../../user/schema/user.schema';
import { UserService } from '../../user/service/user.service';
import { RoomDto } from '../dto/room.dto';
import { RoomGateway } from '../gateway/room.gateway';
import { Room } from '../schema/room.schema';

@Injectable()
export class RoomService {
  constructor(
    @InjectModel(Room.name) private roomModel: Model<Room>,
    private roomGateway: RoomGateway,
    private userService: UserService,
  ) {}

  async create(room: RoomDto, user: User) {
    const object = await new this.roomModel({
      ...room,
      owner: user._id,
    }).save();

    return object.populate('owner', '-password -sessionToken').execPopulate();
  }

  deleteUserRooms(user: User) {
    return this.roomModel.deleteMany({ owner: user._id }).exec();
  }

  async update(roomId: string, room: UpdateQuery<Room>, user: User) {
    await this.roomModel
      .updateOne({ _id: roomId, owner: user._id }, room)
      .exec();

    this.handleUpdateRoom(user, room as Room);

    return room;
  }

  handleUpdateRoom(user: User, room: Room) {
    this.sendMessage(room, 'room:update', room);
  }

  delete(roomId: string, user: User) {
    this.roomGateway.server.in(roomId).emit('');

    return this.roomModel.deleteOne({ _id: roomId, owner: user._id }).exec();
  }

  getRoom(roomId: string) {
    return this.roomModel
      .findOne({ _id: roomId })
      .populate('members', '-password -sessionToken')
      .populate('owner', '-password -sessionToken')
      .exec();
  }

  getUserCurrentRooms(user: User) {
    const filter = {
      members: {
        $in: user._id,
      },
    };

    return this.roomModel.find(filter).exec();
  }

  getPublicRooms() {
    return this.roomModel
      .find({ isPublic: true })
      .populate('owner', '-password -sessionToken')
      .exec();
  }

  getUserRooms(user: User) {
    return this.roomModel.find({ owner: user._id }).exec();
  }

  subscribeSocket(socket: Socket, room: Room) {
    return socket.join(`room_${room._id}`);
  }

  sendMessage<T>(room: Room, event: string, message: T) {
    return this.roomGateway.server.to(`room_${room._id}`).emit(event, message);
  }

  sendMessageExclude<T>(
    exclude: Socket,
    room: Room,
    event: string,
    message: T,
  ) {
    return exclude.broadcast.to(`room_${room._id}`).emit(event, message);
  }

  async join(roomId: string, user: User) {
    const room = await this.getRoom(roomId);

    if (!room) {
      return undefined;
    }

    if (room.members.findIndex(member => user.id === member.id) === -1) {
      room.members.push(user._id);

      this.handleJoinRoom(user, room);

      return room.save();
    }

    return room;
  }

  handleJoinRoom(user: User, room: Room) {
    this.sendMessage(room, 'room:join', this.userService.filterUser(user));
  }

  async leave(user: User) {
    const rooms = await this.getUserCurrentRooms(user);

    for (const room of rooms) {
      remove(room.members, member => member === user._id);

      this.handleLeaveRoom(user, room);

      room.save();
    }
  }

  handleLeaveRoom(user: User, room: Room) {
    this.sendMessage(room, 'room:leave', this.userService.filterUser(user));
  }
}
