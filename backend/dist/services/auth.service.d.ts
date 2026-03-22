import { IUser, UserRole } from '../models/User.model';
interface RegisterInput {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
}
interface LoginInput {
    email: string;
    password: string;
}
interface TokenPair {
    accessToken: string;
    refreshToken: string;
}
interface AuthResponse {
    user: Omit<IUser, 'password'>;
    tokens: TokenPair;
}
export declare const authService: {
    register: (input: RegisterInput) => Promise<AuthResponse>;
    login: (input: LoginInput) => Promise<AuthResponse>;
    refreshToken: (refreshToken: string) => Promise<TokenPair>;
    changePassword: (userId: string, currentPassword: string, newPassword: string) => Promise<void>;
    forgotPassword: (email: string) => Promise<void>;
    resetPassword: (token: string, newPassword: string) => Promise<void>;
    getProfile: (userId: string) => Promise<IUser>;
    updateProfile: (userId: string, updates: Partial<Pick<IUser, "name" | "avatar" | "language" | "theme" | "linkedInUrl">>) => Promise<IUser>;
};
export {};
//# sourceMappingURL=auth.service.d.ts.map