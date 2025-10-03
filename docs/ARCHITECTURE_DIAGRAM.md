# 🏗️ Arquitetura - Repository Pattern

## 📊 Diagrama de Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                      CONTROLLERS                             │
│                  (HTTP Request Handlers)                     │
│                                                              │
│   AuthController  │  AcademiesController  │  UsersController │
└──────────────────┬───────────────────────┬──────────────────┘
                   │                       │
                   ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                        SERVICES                              │
│                   (Business Logic)                           │
│                                                              │
│    AuthService    │  AcademiesService   │   UsersService    │
│                                                              │
│    - register()   │   - createAcademy() │   - getProfile()  │
│    - login()      │   - listAcademies() │   - updateUser()  │
│    - refresh()    │   - searchNearby()  │   - deleteUser()  │
└──────────────────┬───────────────────────┬──────────────────┘
                   │                       │
                   ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     REPOSITORIES                             │
│                  (Data Access Layer)                         │
│                                                              │
│  UsersRepository  │ AcademiesRepository │ RefreshTokenRepo  │
│                                                              │
│  - findByEmail()  │  - findBySlug()     │ - findValidToken()│
│  - createUser()   │  - searchLocation() │ - revokeToken()   │
│  - findById()     │  - findActive()     │ - cleanExpired()  │
└──────────────────┬───────────────────────┬──────────────────┘
                   │                       │
                   └───────────┬───────────┘
                               ▼
                   ┌───────────────────────┐
                   │    PrismaService      │
                   │   (Database Client)   │
                   │                       │
                   │   - $connect()        │
                   │   - $disconnect()     │
                   │   - cleanDatabase()   │
                   └───────────┬───────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │   PostgreSQL          │
                   │   (Database)          │
                   └───────────────────────┘
```

## 🔄 Fluxo de Dados

### Exemplo: Login de Usuário

```
1. HTTP POST /auth/login
         │
         ▼
2. AuthController.login()
         │
         ▼
3. AuthService.login(email, password)
         │
         ├─► UsersRepository.findByEmail(email)
         │         │
         │         ▼
         │   PrismaService.user.findUnique()
         │         │
         │         ▼
         │   PostgreSQL Query
         │
         ├─► bcrypt.compare(password, hash)
         │
         └─► RefreshTokenRepository.createToken(data)
                   │
                   ▼
             PrismaService.userRefreshToken.create()
                   │
                   ▼
             PostgreSQL Insert
                   │
                   ▼
         Response: { accessToken, refreshToken, user }
```

## 🎯 Injeção de Dependências

```
┌────────────────────────────────────────────────┐
│              NestJS DI Container                │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │         PrismaModule (@Global)           │  │
│  │                                          │  │
│  │    providers: [PrismaService]           │  │
│  │    exports: [PrismaService]             │  │
│  └──────────────┬───────────────────────────┘  │
│                 │                               │
│                 ▼                               │
│  ┌──────────────────────────────────────────┐  │
│  │         RepositoriesModule               │  │
│  │                                          │  │
│  │    imports: [PrismaModule]              │  │
│  │    providers: [                         │  │
│  │      UsersRepository,                   │  │
│  │      RefreshTokenRepository,            │  │
│  │      AcademiesRepository,               │  │
│  │      PlansRepository                    │  │
│  │    ]                                    │  │
│  │    exports: [all repositories]          │  │
│  └──────────────┬───────────────────────────┘  │
│                 │                               │
│                 ▼                               │
│  ┌──────────────────────────────────────────┐  │
│  │            AuthModule                    │  │
│  │                                          │  │
│  │    imports: [                           │  │
│  │      RepositoriesModule,                │  │
│  │      JwtModule                          │  │
│  │    ]                                    │  │
│  │    providers: [AuthService]             │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

## 🧩 Estrutura de Arquivos

```
src/
├── database/
│   ├── prisma.module.ts          ← Global module
│   └── prisma.service.ts         ← Singleton database client
│
├── repositories/
│   ├── base.repository.ts        ← Abstract CRUD operations
│   ├── repositories.module.ts    ← Exports all repositories
│   ├── users.repository.ts       ← User-specific queries
│   ├── refresh-token.repository.ts
│   ├── academies.repository.ts
│   └── plans.repository.ts
│
├── auth/
│   ├── auth.module.ts            ← Imports RepositoriesModule
│   ├── services/
│   │   └── auth.service.ts       ← Injects repositories
│   ├── controllers/
│   └── strategies/
│
└── modules/
    ├── academies/
    ├── subscriptions/
    └── analytics/
```

## 🎭 Padrões Aplicados

### 1. Repository Pattern
```
Service ─(usa)─> Repository ─(usa)─> PrismaService ─(usa)─> Database
```

**Benefícios**:
- ✅ Abstração do acesso a dados
- ✅ Queries reutilizáveis
- ✅ Fácil substituir implementação
- ✅ Testável com mocks

### 2. Dependency Injection
```typescript
// ❌ Tight coupling
class AuthService {
  private prisma = new PrismaClient();
}

// ✅ Loose coupling
class AuthService {
  constructor(
    private readonly usersRepo: UsersRepository,
  ) {}
}
```

### 3. Single Responsibility
```
Controller    → Handle HTTP
Service       → Business Logic
Repository    → Data Access
PrismaService → Database Connection
```

### 4. Separation of Concerns
```
┌─────────────┐
│ Controller  │ ← HTTP/REST concerns
├─────────────┤
│  Service    │ ← Business logic
├─────────────┤
│ Repository  │ ← Data access
├─────────────┤
│   Prisma    │ ← Database client
└─────────────┘
```

## 📦 Módulos e Escopo

```
┌────────────────────────────────────────────┐
│          AppModule (Root)                  │
│                                            │
│  imports: [                                │
│    ConfigModule.forRoot({                  │
│      isGlobal: true ← Available everywhere │
│    }),                                     │
│    PrismaModule ← @Global                 │
│    RepositoriesModule,                     │
│    AuthModule,                             │
│    AcademiesModule,                        │
│    SubscriptionsModule,                    │
│  ]                                         │
└────────────────────────────────────────────┘

Every module can inject:
  - ConfigService (Global)
  - PrismaService (Global)
  
Modules that import RepositoriesModule can inject:
  - UsersRepository
  - RefreshTokenRepository
  - AcademiesRepository
  - PlansRepository
```

## 🔐 Exemplo Completo: Fluxo de Autenticação

```typescript
// 1. Controller recebe request
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}

// 2. Service executa lógica de negócio
@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly tokensRepo: RefreshTokenRepository,
  ) {}
  
  async login(dto: LoginDto) {
    // 2.1 Busca usuário
    const user = await this.usersRepo.findByEmail(dto.email);
    
    // 2.2 Valida senha
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException();
    
    // 2.3 Cria tokens
    const tokens = await this.makeTokens(user);
    
    return tokens;
  }
}

// 3. Repository executa query
@Injectable()
export class UsersRepository extends BaseRepository<User> {
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }
}

// 4. PrismaService executa no banco
@Injectable()
export class PrismaService extends PrismaClient {
  // Singleton gerenciado pelo NestJS
}
```

## 🧪 Testando a Arquitetura

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let usersRepo: MockType<UsersRepository>;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersRepository,
          useFactory: () => ({
            findByEmail: jest.fn(),
            createUser: jest.fn(),
          }),
        },
      ],
    }).compile();
    
    service = module.get(AuthService);
    usersRepo = module.get(UsersRepository);
  });
  
  it('should login successfully', async () => {
    usersRepo.findByEmail.mockResolvedValue(mockUser);
    
    const result = await service.login(mockDto);
    
    expect(result).toHaveProperty('accessToken');
  });
});
```

## 🚀 Escalabilidade

### Adicionar Nova Entidade

```typescript
// 1. Criar repository
@Injectable()
export class AttendanceRepository extends BaseRepository<Attendance> {
  protected getDelegate() {
    return this.prisma.attendance;
  }
  
  async findByUserAndDate(userId: string, date: Date) {
    // custom query
  }
}

// 2. Registrar no RepositoriesModule
@Module({
  providers: [..., AttendanceRepository],
  exports: [..., AttendanceRepository],
})

// 3. Injetar onde necessário
@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepo: AttendanceRepository,
  ) {}
}
```

## ✨ Conclusão

A arquitetura implementada segue os princípios **SOLID** e as melhores práticas do **NestJS**:

- **S**ingle Responsibility: Cada camada tem uma responsabilidade
- **O**pen/Closed: Fácil estender sem modificar
- **L**iskov Substitution: Repositórios podem ser substituídos
- **I**nterface Segregation: Interfaces específicas por necessidade
- **D**ependency Inversion: Depende de abstrações (DI)

🎯 **Resultado**: Código limpo, testável, manutenível e escalável!
