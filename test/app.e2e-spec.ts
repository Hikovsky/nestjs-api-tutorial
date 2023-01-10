import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import * as pactum from 'pactum';
import { AuthDto } from 'src/auth/dto';
import { EditUserDto } from 'src/user/dto';
import { CreateBookmarkDto, EditBookmarkDto } from 'src/bookmark/dto';

describe('App e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
      }),
    );

    await app.init();
    await app.listen(4000);

    prisma = app.get(PrismaService);
    await prisma.cleanDb();

    pactum.request.setBaseUrl('http://localhost:4000');
  });

  afterAll(() => {
    app.close();
  });

  describe('Auth', () => {
    const dto: AuthDto = {
      email: 'test@gmail.com',
      password: 'testPassword',
    };
    describe('Signup', () => {
      it('should throw an error if body not provided', () => {
        return pactum.spec().post('/auth/signup').expectStatus(400);
      });
      it('should throw an error if email is empty', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({ password: dto.password })
          .expectStatus(400);
      });
      it('should throw an error if password is empty', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({ email: dto.email })
          .expectStatus(400);
      });
      it('should signup', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody(dto)
          .expectStatus(201);
      });
      it('should throw an error if email already in use', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody(dto)
          .expectStatus(403);
      });
    });
    describe('Signin', () => {
      it('should throw an error if body not provided', () => {
        return pactum.spec().post('/auth/signin').expectStatus(400);
      });
      it('should throw an error if email is empty', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody({ password: dto.password })
          .expectStatus(400);
      });
      it('should throw an error if password is empty', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody({ email: dto.email })
          .expectStatus(400);
      });
      it('should throw an error if user does not exist', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody({ email: 'user@not.exist', password: dto.password })
          .expectStatus(404);
      });
      it('should signin', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody(dto)
          .expectStatus(200)
          .stores('token', 'access_token');
      });
    });
  });
  describe('User', () => {
    describe('Get me', () => {
      it('should throw an error if token not provided', () => {
        return pactum.spec().get('/users/me').expectStatus(401);
      });
      it('should get me', () => {
        return pactum
          .spec()
          .get('/users/me')
          .withHeaders({ Authorization: 'Bearer $S{token}' })
          .expectStatus(200);
      });
    });
    describe('Edit user', () => {
      const dto: EditUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'johndoe@gmail.com',
      };
      it('should edit user', () => {
        return pactum
          .spec()
          .patch('/users')
          .withHeaders({ Authorization: 'Bearer $S{token}' })
          .withBody(dto)
          .expectStatus(200)
          .expectBodyContains(dto.email)
          .expectBodyContains(dto.firstName)
          .expectBodyContains(dto.lastName);
      });
    });
  });
  describe('Bookmarks', () => {
    const dtoCreate: CreateBookmarkDto = {
      title: 'Create',
      description: 'Create Description',
      link: 'https://create.description.com',
    };
    const dtoEdit: EditBookmarkDto = {
      title: 'Edit',
      description: 'Edit Description',
      link: 'https://edit.description.com',
    };
    describe('Create bookmark', () => {
      it('should throw an error if body not provided', () => {
        return pactum
          .spec()
          .post('/bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{token}' })
          .expectStatus(400);
      });

      it('should throw an error if title not provided', () => {
        return pactum
          .spec()
          .post('/bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{token}' })
          .withBody({ ...dtoCreate, title: undefined })
          .expectStatus(400);
      });

      it('should throw an error if link not provided', () => {
        return pactum
          .spec()
          .post('/bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{token}' })
          .withBody({ ...dtoCreate, link: undefined })
          .expectStatus(400);
      });

      it('should create bookmark', () => {
        return pactum
          .spec()
          .post('/bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{token}' })
          .withBody(dtoCreate)
          .expectStatus(201)
          .expectBodyContains(dtoCreate.title)
          .expectBodyContains(dtoCreate.description)
          .expectBodyContains(dtoCreate.link)
          .expectBodyContains('id')
          .stores('id', 'id');
      });
    });
    describe('Get bookmarks', () => {
      it('should get all user bookmarks', () => {
        return pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{token}' })
          .expectStatus(200)
          .expectJsonLength(1);
      });
    });
    describe('Get bookmark by id', () => {
      it('should get bookmark by id', () => {
        return pactum
          .spec()
          .get('/bookmarks/$S{id}')
          .withHeaders({ Authorization: 'Bearer $S{token}' })
          .expectStatus(200)
          .expectBodyContains(dtoCreate.title)
          .expectBodyContains(dtoCreate.description)
          .expectBodyContains(dtoCreate.link)
          .expectBodyContains('id');
      });
    });
    describe('Edit bookmark by id', () => {
      it('should edit bookmark by id', () => {
        return pactum
          .spec()
          .patch('/bookmarks/$S{id}')
          .withHeaders({ Authorization: 'Bearer $S{token}' })
          .withBody(dtoEdit)
          .expectStatus(200)
          .expectBodyContains(dtoEdit.title)
          .expectBodyContains(dtoEdit.description)
          .expectBodyContains(dtoEdit.link)
          .expectBodyContains('userId');
      });
    });
    describe('Delete bookmark by id', () => {
      it('should delete bookmark by id', () => {
        return pactum
          .spec()
          .delete('/bookmarks/$S{id}')
          .withHeaders({ Authorization: 'Bearer $S{token}' })
          .expectStatus(204);
      });

      it('should get empty bookmarks', () => {
        return pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{token}' })
          .expectStatus(200)
          .expectJsonLength(0);
      });
    });
  });
});
