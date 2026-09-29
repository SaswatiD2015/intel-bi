import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma, logger } from '../index';
import { verify } from 'argon2';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(server: FastifyInstance) {
  server.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email, password } = LoginSchema.parse(request.body);

      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          userRoles: true,
          userRegionAccess: { include: { region: true } }
        }
      });

      if (!user) {
        return reply.code(401).send({ success: false, error: 'Invalid credentials' });
      }

      const isValid = await verify(user.passwordHash, password);
      
      if (!isValid) {
        return reply.code(401).send({ success: false, error: 'Invalid credentials' });
      }

      const token = server.jwt.sign({
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.userRoles.map(r => r.role),
        regions: user.userRegionAccess.map(r => ({ id: r.region.id, name: r.region.name }))
      }, { expiresIn: '24h' });

      return reply.send({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.userRoles.map(r => r.role)
        }
      });

    } catch (error) {
      logger.error(error);
      return reply.code(400).send({ success: false, error: 'Bad Request' });
    }
  });

  server.get('/session', { preValidation: [server.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
     // The user payload is stored in request.user by the JWT plugin
     return reply.send({ success: true, user: request.user });
  });
}
