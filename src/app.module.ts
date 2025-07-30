import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from './config/jwt.config';
import appConfig from './config/app.config';
import { validationSchema } from './config/validation.schema';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './module/auth/auth.module';
import { RedisModule } from './module/redis/redis.module';
import { SocketModule } from './module/socket/socket.module';
import { ConversationModule } from './module/conversation/conversation.module';
import { ParticipantModule } from './module/participant/participant.module';
import { JoinRequestModule } from './module/join-request/join-request.module';
import { EmailModule } from './module/email/email.module';
import { MessageModule } from './module/message/message.module';
import { UserModule } from './module/user/user.module';
import { FriendRequestModule } from './module/friend-request/friend-request.module';
import { CloudinaryModule } from './module/cloudinary/cloudinary.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      load: [jwtConfig, appConfig],
      isGlobal: true,
      validationSchema,
      envFilePath: '.env',
    }),
    PrismaModule,
    RedisModule,
    SocketModule,
    EmailModule,
    AuthModule,
    UserModule,
    ConversationModule,
    ParticipantModule,
    JoinRequestModule,
    MessageModule,
    FriendRequestModule,
    JoinRequestModule,
    CloudinaryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
