# Repository Pattern - Arquitetura de Acesso a Dados

## 📋 Visão Geral

O projeto agora utiliza o **Repository Pattern** para abstrair o acesso ao banco de dados, trazendo os seguintes benefícios:

- ✅ **Injeção de Dependência**: Segue os princípios do NestJS
- ✅ **Testabilidade**: Fácil mockar repositórios em testes
- ✅ **Manutenibilidade**: Lógica de dados centralizada
- ✅ **Reutilização**: Métodos comuns compartilhados
- ✅ **Separação de Responsabilidades**: Services não conhecem o Prisma diretamente

## 🏗️ Estrutura

```
src/
├── database/
│   ├── prisma.module.ts      # Módulo global do Prisma
│   └── prisma.service.ts     # Serviço Prisma (singleton gerenciado)
│
└── repositories/
    ├── base.repository.ts            # Repositório base com CRUD
    ├── repositories.module.ts        # Módulo de repositórios
    ├── users.repository.ts           # Repositório de usuários
    ├── refresh-token.repository.ts   # Repositório de tokens
    ├── academies.repository.ts       # Repositório de academias
    └── plans.repository.ts           # Repositório de planos
```

## 🔧 Componentes

### 1. PrismaService

**Localização**: `src/database/prisma.service.ts`

Gerencia a conexão única com o banco de dados:

```typescript
@Injectable()
export class PrismaService extends PrismaClient 
  implements OnModuleInit, OnModuleDestroy {
  
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

**Características**:
- ✅ Singleton gerenciado pelo container do NestJS
- ✅ Logs de queries em desenvolvimento
- ✅ Conexão e desconexão automática no ciclo de vida do módulo
- ✅ Método `cleanDatabase()` para testes

### 2. BaseRepository

**Localização**: `src/repositories/base.repository.ts`

Repositório abstrato com operações CRUD comuns:

```typescript
export abstract class BaseRepository<T> {
  protected abstract getDelegate(): any;

  async findById(id: string): Promise<T | null>
  async findMany(where?, options?): Promise<T[]>
  async create(data: any): Promise<T>
  async update(id: string, data: any): Promise<T>
  async delete(id: string): Promise<T>
  async softDelete(id: string): Promise<T>
  async count(where?): Promise<number>
  async exists(where): Promise<boolean>
}
```

### 3. Repositórios Específicos

#### UsersRepository

```typescript
@Injectable()
export class UsersRepository extends BaseRepository<User> {
  async findByEmail(email: string): Promise<User | null>
  async findActiveByEmail(email: string): Promise<User | null>
  async createUser(data: Prisma.UserCreateInput): Promise<User>
  async findByAcademyRole(academyId: string, role?: string): Promise<User[]>
}
```

#### RefreshTokenRepository

```typescript
@Injectable()
export class RefreshTokenRepository extends BaseRepository<UserRefreshToken> {
  async findValidToken(token: string): Promise<RefreshTokenWithUser | null>
  async createToken(data): Promise<UserRefreshToken>
  async revokeToken(id: string): Promise<UserRefreshToken>
  async revokeUserTokens(userId: string, token?: string): Promise<number>
  async cleanExpiredTokens(): Promise<number>
}
```

## 🎯 Uso nos Services

### Antes (❌ Anti-pattern)

```typescript
@Injectable()
export class AuthService {
  private prisma = new PrismaClient(); // ❌ Instanciação direta
  
  async register(data) {
    const user = await this.prisma.user.findUnique(...);
    // ...
  }
}
```

**Problemas**:
- ❌ Múltiplas instâncias do PrismaClient
- ❌ Difícil de testar (não pode mockar)
- ❌ Não usa DI do NestJS
- ❌ Gerenciamento manual de conexões

### Depois (✅ Correto)

```typescript
@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}
  
  async register(data) {
    const emailExists = await this.usersRepository.findByEmail(data.email);
    if (emailExists) throw new ConflictException('Email já cadastrado');
    
    const user = await this.usersRepository.createUser({
      email: data.email,
      name: data.name,
      password: hashedPassword,
    });
    
    return this.makeTokens(user);
  }
}
```

**Vantagens**:
- ✅ Injeção de Dependência
- ✅ Fácil de testar com mocks
- ✅ Única instância do Prisma
- ✅ Métodos específicos e semânticos

## 📦 Módulos

### PrismaModule (Global)

```typescript
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### RepositoriesModule

```typescript
@Module({
  imports: [PrismaModule],
  providers: [
    UsersRepository,
    RefreshTokenRepository,
    AcademiesRepository,
    PlansRepository,
  ],
  exports: [/* todos os repositórios */],
})
export class RepositoriesModule {}
```

### AuthModule (Exemplo de uso)

```typescript
@Module({
  imports: [
    RepositoriesModule, // Importa os repositórios
    JwtModule.registerAsync({...}),
  ],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
```

## 🧪 Testando com Repositórios

### Mock de Repository

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let usersRepo: UsersRepository;
  let tokenRepo: RefreshTokenRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersRepository,
          useValue: {
            findByEmail: jest.fn(),
            createUser: jest.fn(),
          },
        },
        {
          provide: RefreshTokenRepository,
          useValue: {
            createToken: jest.fn(),
            findValidToken: jest.fn(),
          },
        },
        // ... outros providers
      ],
    }).compile();

    service = module.get(AuthService);
    usersRepo = module.get(UsersRepository);
  });

  it('should register user', async () => {
    jest.spyOn(usersRepo, 'findByEmail').mockResolvedValue(null);
    jest.spyOn(usersRepo, 'createUser').mockResolvedValue(mockUser);
    
    const result = await service.register(mockData);
    
    expect(result).toHaveProperty('accessToken');
  });
});
```

## 🎨 Padrões e Boas Práticas

### 1. Nomenclatura

- Repositórios sempre terminam com `Repository`
- Métodos descritivos: `findActiveByEmail`, `revokeUserTokens`
- Use tipos do Prisma: `Prisma.UserCreateInput`

### 2. Responsabilidades

**Repository**:
- ✅ Queries e mutations no banco
- ✅ Transformações simples de dados
- ✅ Métodos específicos do domínio

**Service**:
- ✅ Lógica de negócio
- ✅ Orquestração de repositórios
- ✅ Validações
- ✅ Publicação de eventos

### 3. Quando criar um novo Repository

Crie quando:
- ✅ Nova entidade do Prisma
- ✅ Necessidade de queries complexas reutilizáveis
- ✅ Lógica de acesso específica ao domínio

Não crie quando:
- ❌ Query única usada uma vez só (use inline no service)
- ❌ Apenas para seguir "padrão" sem necessidade

### 4. Extensibilidade

Para adicionar novo repository:

```typescript
// 1. Criar o repository
@Injectable()
export class AttendanceRepository extends BaseRepository<Attendance> {
  protected getDelegate() {
    return this.prisma.attendance;
  }
  
  async findByUserAndDate(userId: string, date: Date) {
    return this.prisma.attendance.findFirst({
      where: { userId, checkInAt: { gte: date } }
    });
  }
}

// 2. Adicionar no RepositoriesModule
@Module({
  providers: [
    // ...
    AttendanceRepository, // adicionar aqui
  ],
  exports: [
    // ...
    AttendanceRepository, // e aqui
  ],
})
export class RepositoriesModule {}

// 3. Injetar onde necessário
@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepo: AttendanceRepository,
  ) {}
}
```

## 🔄 Migração de Código Existente

Para migrar código que usa Prisma diretamente:

1. **Identifique o uso direto do Prisma**
   ```typescript
   await this.prisma.user.findUnique(...)
   ```

2. **Crie/use o repository apropriado**
   ```typescript
   await this.usersRepository.findByEmail(...)
   ```

3. **Injete o repository no constructor**
   ```typescript
   constructor(
     private readonly usersRepository: UsersRepository,
   ) {}
   ```

4. **Importe o RepositoriesModule**
   ```typescript
   @Module({
     imports: [RepositoriesModule],
     // ...
   })
   ```

## 📊 Comparação: Antes vs Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Instanciação | `new PrismaClient()` | DI Container |
| Conexões | Múltiplas | Única (singleton) |
| Testabilidade | Difícil | Fácil (mockável) |
| Reutilização | Baixa | Alta |
| Manutenção | Espalhado | Centralizado |
| Consistência | Variável | Padronizada |

## 🚀 Próximos Passos

- [ ] Adicionar cache em queries frequentes
- [ ] Implementar Unit of Work para transações complexas
- [ ] Criar repositórios para entidades restantes
- [ ] Adicionar métricas de performance
- [ ] Implementar query builder para filtros dinâmicos

## 📚 Referências

- [NestJS Database](https://docs.nestjs.com/techniques/database)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
