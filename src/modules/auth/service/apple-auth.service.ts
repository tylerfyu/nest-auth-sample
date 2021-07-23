import {
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AppleLoginDto } from '../dto/apple-login.dto';
import { join } from 'path';
import { SECRETS_PATH } from '../../../common/constants/secrets';
import appleSignin from 'apple-signin-auth';
import { authConfig } from '../config/auth.config';
import { SocialUser } from './auth.service';
import { readFileSync } from 'fs';

const auth = authConfig.apple;

const privateKey = readFileSync(join(SECRETS_PATH, 'apple-key.p8'), 'utf-8');

@Injectable()
export class AppleAuthService {
  async getUser({
    name,
    authorizationCode,
  }: AppleLoginDto): Promise<SocialUser> {
    try {
      const clientSecret = appleSignin.getClientSecret({
        privateKey,
        clientID: auth.clientId,
        teamID: auth.teamId,
        keyIdentifier: auth.keyIdentifier,
      });

      const options = {
        clientSecret,
        clientID: auth.clientId,
        redirectUri: auth.redirectUri,
      };

      const response = await appleSignin.getAuthorizationToken(
        authorizationCode,
        options,
      );

      try {
        const json = await appleSignin.verifyIdToken(response.id_token, {
          audience: auth.clientId,
          ignoreExpiration: true,
        });

        return {
          name,
          id: json.sub,
          email: json.email,
        };
      } catch (e) {
        throw new UnauthorizedException(e.message || e);
      }
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      }

      throw new UnauthorizedException(e.message || e);
    }
  }
}
