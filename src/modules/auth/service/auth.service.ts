import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { GlobalConfig } from 'src/common/types/global-config';
import { User } from '../../user/schema/user.schema';
import { UserService } from '../../user/service/user.service';
import { Token } from '../guard/jwt-auth.guard';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService<GlobalConfig>,
  ) {}

  async validate(username: string, password: string) {
    const user = await this.userService.getUser(username);

    if (!user) {
      throw new UnauthorizedException('User does not exist');
    }

    if (!(await user.validatePassword(password))) {
      throw new UnauthorizedException('Incorrect password');
    }

    return user;
  }

  async login(user: User): Promise<TokenResponse> {
    const payload: Token = {
      sub: user.id,
      username: user.username,
    };

    let refresh_token: string;

    if (this.configService.get('ACCESS_TOKEN_EXPIRATION')) {
      refresh_token = await this.jwtService.signAsync(
        payload,
        this.getRefreshTokenOptions(user),
      );
    }

    return {
      access_token: await this.jwtService.signAsync(
        payload,
        this.getAccessTokenOptions(user),
      ),
      refresh_token,
    };
  }

  getRefreshTokenOptions(user: User): JwtSignOptions {
    return this.getTokenOptions('REFRESH_TOKEN', user);
  }

  getAccessTokenOptions(user: User): JwtSignOptions {
    return this.getTokenOptions('ACCESS_TOKEN', user);
  }

  private getTokenOptions(type: 'ACCESS_TOKEN' | 'REFRESH_TOKEN', user: User) {
    const configService: ConfigService = this.configService;

    const options: JwtSignOptions = {
      secret: configService.get(`${type}_SECRET`) + user.sessionToken,
    };

    const expiration = configService.get(`${type}_EXPIRATION`);

    if (expiration) {
      options.expiresIn = expiration;
    }

    return options;
  }
}