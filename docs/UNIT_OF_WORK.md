# Unit of Work Pattern - Guia Completo

## 📋 O que é Unit of Work?

O **Unit of Work** é um padrão que mantém o controle de todas as mudanças feitas durante uma transação de negócio e coordena a escrita dessas mudanças no banco de dados de forma atômica.

### Benefícios

- ✅ **Atomicidade**: Todas as operações succedem ou todas falham
- ✅ **Consistência**: Mantém o banco em estado consistente
- ✅ **Simplicidade**: Gerencia transações automaticamente
- ✅ **Testabilidade**: Fácil mockar e testar

## 🏗️ Implementação

### 1. Unit of Work Service

**Localização**: `src/database/unit-of-work.ts`

```typescript
@Injectable()
export class UnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  // Executa operações em uma transação
  async execute<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(work);
  }

  // Com opções customizadas
  async executeWithOptions<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<T> {
    return this.prisma.$transaction(work, options);
  }

  // Operações em batch (paralelas)
  async batch<T>(operations: T[]): Promise<Results<T>> {
    return this.prisma.$transaction(operations);
  }
}
```

### 2. Repositórios com Suporte a Transações

Todos os repositórios agora aceitam um parâmetro opcional `tx`:

```typescript
export abstract class BaseRepository<T> {
  protected abstract getDelegate(tx?: Prisma.TransactionClient): any;

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<T | null> {
    const delegate = tx ? this.getDelegate(tx) : this.getDelegate();
    return delegate.findUnique({ where: { id } });
  }

  async create(data: any, tx?: Prisma.TransactionClient): Promise<T> {
    const delegate = tx ? this.getDelegate(tx) : this.getDelegate();
    return delegate.create({ data });
  }

  // ... outros métodos
}
```

## 🎯 Casos de Uso

### Exemplo 1: Registro de Usuário com Token

```typescript
@Injectable()
export class AuthService {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly usersRepo: UsersRepository,
    private readonly tokensRepo: RefreshTokenRepository,
  ) {}

  async register(data: RegisterDto) {
    return this.unitOfWork.execute(async (tx) => {
      // 1. Criar usuário
      const user = await this.usersRepo.createUser(
        {
          email: data.email,
          name: data.name,
          password: hashedPassword,
        },
        tx, // ← Passa a transação
      );

      // 2. Criar token de refresh
      const refreshToken = await this.tokensRepo.createToken(
        {
          user: { connect: { id: user.id } },
          token: randomUUID(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        tx, // ← Mesma transação
      );

      // Se algo falhar aqui, TUDO é revertido
      return { user, refreshToken };
    });
  }
}
```

**Vantagens**:
- Se a criação do token falhar, o usuário NÃO é criado
- Garante consistência dos dados
- Não deixa "lixo" no banco

### Exemplo 2: Assinatura com Pagamento

```typescript
@Injectable()
export class SubscriptionService {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly subscriptionsRepo: SubscriptionsRepository,
    private readonly paymentsRepo: PaymentsRepository,
    private readonly usersRepo: UsersRepository,
  ) {}

  async createSubscriptionWithPayment(
    userId: string,
    planId: string,
    paymentData: CreatePaymentDto,
  ) {
    return this.unitOfWork.execute(async (tx) => {
      // 1. Verificar se usuário existe
      const user = await this.usersRepo.findById(userId, tx);
      if (!user) throw new NotFoundException('Usuário não encontrado');

      // 2. Criar assinatura
      const subscription = await this.subscriptionsRepo.create(
        {
          userId,
          planId,
          status: 'ACTIVE',
          startDate: new Date(),
        },
        tx,
      );

      // 3. Criar pagamento
      const payment = await this.paymentsRepo.create(
        {
          subscriptionId: subscription.id,
          amount: paymentData.amount,
          status: 'PENDING',
        },
        tx,
      );

      // 4. Processar pagamento com gateway externo
      const paymentResult = await this.stripeService.charge(paymentData);
      
      if (!paymentResult.success) {
        // Lança erro → rollback automático
        throw new BadRequestException('Pagamento falhou');
      }

      // 5. Atualizar status do pagamento
      await this.paymentsRepo.update(
        payment.id,
        { status: 'PAID' },
        tx,
      );

      return { subscription, payment };
    });
  }
}
```

### Exemplo 3: Cancelamento de Assinatura

```typescript
async cancelSubscription(subscriptionId: string) {
  return this.unitOfWork.execute(async (tx) => {
    // 1. Cancelar assinatura
    const subscription = await this.subscriptionsRepo.update(
      subscriptionId,
      { 
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
      tx,
    );

    // 2. Cancelar pagamentos recorrentes
    await this.paymentsRepo.cancelRecurring(subscriptionId, tx);

    // 3. Enviar notificação (não precisa de tx pois é operação externa)
    await this.notificationService.send({
      userId: subscription.userId,
      message: 'Sua assinatura foi cancelada',
    });

    return subscription;
  });
}
```

### Exemplo 4: Operações em Batch (Independentes)

```typescript
async getDashboardData() {
  // Executa queries em paralelo dentro de uma transação
  const [users, academies, subscriptions, payments] = await this.unitOfWork.batch([
    this.prisma.user.count(),
    this.prisma.academy.count(),
    this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    this.prisma.payment.aggregate({ _sum: { amount: true } }),
  ]);

  return { users, academies, subscriptions, totalRevenue: payments._sum.amount };
}
```

## ⚙️ Opções de Transação

### Timeout e Max Wait

```typescript
async createWithTimeout(data: any) {
  return this.unitOfWork.executeWithOptions(
    async (tx) => {
      return this.usersRepo.createUser(data, tx);
    },
    {
      maxWait: 5000,  // Máx 5s esperando para adquirir conexão
      timeout: 10000, // Máx 10s para completar a transação
    },
  );
}
```

### Isolation Level

```typescript
async criticalOperation() {
  return this.unitOfWork.executeWithOptions(
    async (tx) => {
      // Operações críticas aqui
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}
```

Níveis de isolamento disponíveis:
- `ReadUncommitted`
- `ReadCommitted` (padrão)
- `RepeatableRead`
- `Serializable`

## 🧪 Testando com Unit of Work

### Mock do UnitOfWork

```typescript
describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let unitOfWork: UnitOfWork;

  beforeEach(async () => {
    const mockUnitOfWork = {
      execute: jest.fn((work) => work(mockTx)),
      executeWithOptions: jest.fn(),
      batch: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: UnitOfWork, useValue: mockUnitOfWork },
        // ... outros providers mockados
      ],
    }).compile();

    service = module.get(SubscriptionService);
    unitOfWork = module.get(UnitOfWork);
  });

  it('should create subscription in transaction', async () => {
    const mockTx = {} as any; // Mock do transaction client
    
    jest.spyOn(unitOfWork, 'execute').mockImplementation((work) => {
      return work(mockTx);
    });

    await service.createSubscription(mockData);

    expect(unitOfWork.execute).toHaveBeenCalled();
  });
});
```

## 🚨 Boas Práticas

### ✅ DO: Use transações para operações relacionadas

```typescript
// ✅ CORRETO: Garante atomicidade
await this.unitOfWork.execute(async (tx) => {
  const user = await this.usersRepo.create(userData, tx);
  await this.subscriptionRepo.create({ userId: user.id }, tx);
});
```

### ❌ DON'T: Não use para operações independentes

```typescript
// ❌ ERRADO: Essas operações não são relacionadas
await this.unitOfWork.execute(async (tx) => {
  await this.usersRepo.create(userData, tx);
  await this.academiesRepo.create(academyData, tx); // Sem relação
});

// ✅ CORRETO: Executar separadamente
await this.usersRepo.create(userData);
await this.academiesRepo.create(academyData);
```

### ✅ DO: Capture erros e faça rollback

```typescript
try {
  await this.unitOfWork.execute(async (tx) => {
    // operações...
    if (someCondition) {
      throw new Error('Rollback!');
    }
  });
} catch (error) {
  this.logger.error('Transaction failed', error);
  throw error;
}
```

### ❌ DON'T: Não faça operações externas dentro da transação

```typescript
// ❌ ERRADO: Chamadas HTTP/externas dentro da transação
await this.unitOfWork.execute(async (tx) => {
  const user = await this.usersRepo.create(userData, tx);
  await this.emailService.send(user.email); // ❌ Operação externa
});

// ✅ CORRETO: Operações externas FORA da transação
const user = await this.unitOfWork.execute(async (tx) => {
  return this.usersRepo.create(userData, tx);
});
await this.emailService.send(user.email); // ✅ Depois da transação
```

### ✅ DO: Mantenha transações curtas

```typescript
// ✅ CORRETO: Rápido e focado
await this.unitOfWork.execute(async (tx) => {
  const user = await this.usersRepo.create(userData, tx);
  await this.tokensRepo.create(tokenData, tx);
  return user;
});

// ❌ ERRADO: Transação longa demais
await this.unitOfWork.execute(async (tx) => {
  const user = await this.usersRepo.create(userData, tx);
  await this.sleep(5000); // ❌ Travando conexão
  await this.processLargeFile(); // ❌ Operação lenta
  return user;
});
```

## 📊 Comparação: Antes vs Depois

| Aspecto | Sem UoW ❌ | Com UoW ✅ |
|---------|-----------|-----------|
| **Atomicidade** | Manual | Automática |
| **Rollback** | Complexo | Automático |
| **Código** | Verboso | Limpo |
| **Erros** | Propenso | Seguro |
| **Manutenção** | Difícil | Fácil |

### Antes (sem UoW)

```typescript
async register(data: RegisterDto) {
  let user;
  try {
    user = await this.usersRepo.create(userData);
    
    try {
      const token = await this.tokensRepo.create(tokenData);
      return { user, token };
    } catch (error) {
      // Precisa reverter o usuário manualmente!
      await this.usersRepo.delete(user.id);
      throw error;
    }
  } catch (error) {
    throw error;
  }
}
```

### Depois (com UoW)

```typescript
async register(data: RegisterDto) {
  return this.unitOfWork.execute(async (tx) => {
    const user = await this.usersRepo.create(userData, tx);
    const token = await this.tokensRepo.create(tokenData, tx);
    return { user, token };
    // Rollback automático em caso de erro!
  });
}
```

## 🎯 Quando Usar

### ✅ Use Unit of Work quando:
- Criar múltiplas entidades relacionadas
- Atualizar dados que dependem uns dos outros
- Garantir consistência entre tabelas
- Operações de negócio que devem ser atômicas

### ❌ Não use quando:
- Operações simples de leitura
- Operações independentes sem relação
- Queries de relatórios
- Operações que fazem chamadas externas (APIs, emails, etc.)

## 🚀 Performance

### Dicas de Otimização

1. **Mantenha transações curtas**: Conexões travadas afetam performance
2. **Use batch para independentes**: Múltiplas queries paralelas
3. **Evite N+1**: Faça joins ao invés de múltiplas queries
4. **Configure timeouts**: Evite travar o banco indefinidamente

```typescript
// ✅ BOM: Batch para queries independentes
const [users, plans] = await this.unitOfWork.batch([
  this.prisma.user.findMany(),
  this.prisma.plan.findMany(),
]);

// ❌ RUIM: Transação para queries independentes
await this.unitOfWork.execute(async (tx) => {
  const users = await tx.user.findMany();
  const plans = await tx.plan.findMany();
  return { users, plans };
});
```

## 📚 Referências

- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [Unit of Work Pattern](https://martinfowler.com/eaaCatalog/unitOfWork.html)
- [ACID Properties](https://en.wikipedia.org/wiki/ACID)
