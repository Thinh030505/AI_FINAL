import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

export interface SanitizedUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(userData: {
    username: string;
    email: string;
    passwordHash: string;
    displayName: string;
    avatarUrl?: string;
    role?: string;
  }): Promise<UserDocument> {
    const newUser = new this.userModel(userData);
    return newUser.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username: username.trim() }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  sanitizeUser(user: UserDocument | any): SanitizedUser {
    const userObj = typeof user.toObject === 'function' ? user.toObject() : user;
    return {
      id: userObj._id.toString(),
      username: userObj.username,
      email: userObj.email,
      displayName: userObj.displayName,
      avatarUrl: userObj.avatarUrl || '',
      role: userObj.role || 'user',
      createdAt: userObj.createdAt,
      updatedAt: userObj.updatedAt,
    };
  }
}
