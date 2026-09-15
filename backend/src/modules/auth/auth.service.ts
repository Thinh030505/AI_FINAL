import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { username, email, password, displayName, avatarUrl } = registerDto;

    // Check duplicate email
    const existingEmail = await this.usersService.findByEmail(email);
    if (existingEmail) {
      throw new ConflictException('Email is already registered');
    }

    // Check duplicate username
    const existingUsername = await this.usersService.findByUsername(username);
    if (existingUsername) {
      throw new ConflictException('Username is already taken');
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user in database
    const createdUser = await this.usersService.create({
      username,
      email,
      passwordHash,
      displayName,
      avatarUrl: avatarUrl || '',
      role: 'user',
    });

    const sanitizedUser = this.usersService.sanitizeUser(createdUser);

    return {
      success: true,
      message: 'Registration successful',
      data: {
        user: sanitizedUser,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user._id.toString(),
      username: user.username,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const sanitizedUser = this.usersService.sanitizeUser(user);

    return {
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        user: sanitizedUser,
      },
    };
  }
}
