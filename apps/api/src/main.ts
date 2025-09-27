import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { Logger } from "nestjs-pino";
import cookieParser from "cookie-parser";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { SnsService } from "./notifications/sns.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  app.use(cookieParser());
  app.enableCors({
    origin: process.env.WEB_ORIGIN?.split(",") || ["http://localhost:3000"],
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const snsService = app.get(SnsService);
  app.useGlobalFilters(new AllExceptionsFilter(snsService));

  const port = process.env.PORT || 4000;
  await app.listen(port);
  app.get(Logger).log(`API listening on ${port}`);
}

bootstrap();
