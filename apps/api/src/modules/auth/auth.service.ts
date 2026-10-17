import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../common/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'kasbareng-super-secret-key-for-dev-2026';
const JWT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds

export const RegisterSchema = z.object({
  fullName: z.string().min(2, 'Nama lengkap minimal 2 karakter').max(100),
  email: z.string().email('Format email tidak valid').toLowerCase(),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
});

export const LoginSchema = z.object({
  email: z.string().email('Format email tidak valid').toLowerCase(),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

export class AuthService {
  static async register(input: RegisterInput) {
    const validated = RegisterSchema.parse(input);

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      throw {
        status: 409,
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Alamat email ini sudah terdaftar.',
      };
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);

    const user = await prisma.user.create({
      data: {
        fullName: validated.fullName,
        email: validated.email,
        passwordHash,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        createdAt: true,
      },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN_SECONDS }
    );

    return { user, token };
  }

  static async login(input: LoginInput) {
    const validated = LoginSchema.parse(input);

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    // Timing-safe-like generic check: do not leak whether user exists
    if (!user) {
      await bcrypt.compare(validated.password, '$2a$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNO');
      throw {
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Email atau kata sandi tidak valid.',
      };
    }

    const isMatch = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isMatch) {
      throw {
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Email atau kata sandi tidak valid.',
      };
    }

    if (user.status !== 'ACTIVE') {
      throw {
        status: 403,
        code: 'ACCOUNT_INACTIVE',
        message: 'Akun Anda dinonaktifkan. Hubungi administrator.',
      };
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN_SECONDS }
    );

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        status: user.status,
      },
      token,
    };
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        createdAt: true,
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            wallet: {
              select: {
                id: true,
                name: true,
                description: true,
                currency: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw {
        status: 404,
        code: 'USER_NOT_FOUND',
        message: 'Data pengguna tidak ditemukan.',
      };
    }

    return user;
  }
}