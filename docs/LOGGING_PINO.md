# Logging com Pino - Guia Completo

## 📋 Por que Pino?

**Pino** é um logger JSON extremamente rápido para Node.js, ideal para produção.

### Vantagens sobre console.log

| Aspecto | console.log ❌ | Pino ✅ |
|---------|---------------|---------|
| **Performance** | Lento (bloqueante) | Rápido (assíncrono) |
| **Formato** | Texto simples | JSON estruturado |
| **Níveis** | Não tem | trace, debug, info, warn, error, fatal |
| **Contexto** | Manual | Automático |
| **Produção** | Não recomendado | Otimizado |
| **Integração** | Difícil | Fácil (ELK, Grafana, etc.) |

## 🏗️ Implementação

### 1. LoggerService

**Localização**: `src/logging/logger.service.ts`

```typescript
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino, { Logger as PinoLogger } from 'pino';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: PinoLogger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty', // Formatação bonita em dev
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname',
              },
            }
          : undefined, // JSON puro em produção
    });
  }

  log(message: string, context?: string) {
    this.logger.info({ context }, message);
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error({ context, trace }, message);
  }

  warn(message: string, context?: string) {
    this.logger.warn({ context }, message);
  }

  debug(message: string, context?: string) {
    this.logger.debug({ context }, message);
  }
}
```

### 2. LoggingModule

**Localização**: `src/logging/logging.module.ts`

```typescript
import { Module, Global } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Global() // ← Disponível em todo o app
@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggingModule {}
```

### 3. Uso no PrismaService

```typescript
@Injectable()
export class PrismaService extends PrismaClient {
  private readonly context = PrismaService.name;

  constructor(private readonly logger: LoggerService) {
    super({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
    });

    if (process.env.NODE_ENV === 'development') {
      this.$on('query', (e: any) => {
        this.logger.debug(`Query: ${e.query}`, this.context);
        this.logger.debug(`Duration: ${e.duration}ms`, this.context);
      });
    }
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected', this.context);
  }
}
```

## 🎯 Como Usar

### Básico: Log Simples

```typescript
@Injectable()
export class AuthService {
  constructor(private readonly logger: LoggerService) {}

  async login(email: string) {
    this.logger.log(`User attempting login: ${email}`, AuthService.name);
    
    try {
      const user = await this.usersRepo.findByEmail(email);
      this.logger.log(`Login successful for: ${email}`, AuthService.name);
      return user;
    } catch (error) {
      this.logger.error(
        `Login failed: ${error.message}`,
        error.stack,
        AuthService.name,
      );
      throw error;
    }
  }
}
```

### Desenvolvimento: Output Bonito

```bash
[12:34:56] INFO (AuthService): User attempting login: user@example.com
[12:34:57] INFO (AuthService): Login successful for: user@example.com
```

### Produção: JSON Estruturado

```json
{
  "level": 30,
  "time": 1696262096000,
  "pid": 12345,
  "hostname": "server-01",
  "context": "AuthService",
  "msg": "User attempting login: user@example.com"
}
```

## 📝 Níveis de Log

### Hierarquia

```
fatal (60) - Sistema não pode continuar
error (50) - Erro que precisa atenção
warn  (40) - Situação anormal mas não crítica
info  (30) - Informação importante (default)
debug (20) - Informação de debug
trace (10) - Informação muito detalhada
```

### Configuração por Ambiente

**.env**

```bash
# Development
LOG_LEVEL=debug

# Staging
LOG_LEVEL=info

# Production
LOG_LEVEL=warn
```

### Uso por Nível

```typescript
@Injectable()
export class PaymentService {
  constructor(private readonly logger: LoggerService) {}

  async processPayment(amount: number) {
    // TRACE: Detalhes técnicos extremos
    this.logger.verbose(`Processing payment request`, PaymentService.name);

    // DEBUG: Informação útil para debugging
    this.logger.debug(`Payment amount: ${amount}`, PaymentService.name);

    // INFO: Fluxo normal da aplicação
    this.logger.log(`Payment processed successfully`, PaymentService.name);

    // WARN: Algo estranho mas não crítico
    if (amount > 10000) {
      this.logger.warn(`High payment amount: ${amount}`, PaymentService.name);
    }

    try {
      // operação...
    } catch (error) {
      // ERROR: Erro que precisa atenção
      this.logger.error(
        `Payment failed: ${error.message}`,
        error.stack,
        PaymentService.name,
      );
      throw error;
    }
  }
}
```

## 🎨 Log Estruturado

### Metadados Ricos

```typescript
this.logger.info('User registered', {
  context: 'AuthService',
  userId: user.id,
  email: user.email,
  timestamp: new Date().toISOString(),
  ip: request.ip,
});
```

**Output (produção)**:
```json
{
  "level": 30,
  "time": 1696262096000,
  "context": "AuthService",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "timestamp": "2025-10-02T12:34:56.000Z",
  "ip": "192.168.1.1",
  "msg": "User registered"
}
```

### Child Logger (Contexto Persistente)

```typescript
@Injectable()
export class OrderService {
  private readonly logger: PinoLogger;

  constructor(loggerService: LoggerService) {
    // Cria um logger filho com contexto fixo
    this.logger = loggerService.child({
      service: 'OrderService',
      version: '1.0.0',
    });
  }

  async createOrder(data: CreateOrderDto) {
    // Todos os logs terão service e version automaticamente
    this.logger.info({ orderId: data.id }, 'Creating order');
    this.logger.info({ orderId: data.id }, 'Order created');
  }
}
```

## 🔍 Log de Requisições HTTP

### Middleware com Pino-HTTP

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from './logger.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { method, originalUrl, ip } = req;
      const { statusCode } = res;

      const message = `${method} ${originalUrl} ${statusCode} - ${duration}ms`;

      if (statusCode >= 500) {
        this.logger.error(message, '', 'HTTP');
      } else if (statusCode >= 400) {
        this.logger.warn(message, 'HTTP');
      } else {
        this.logger.log(message, 'HTTP');
      }
    });

    next();
  }
}
```

**Output**:
```
[12:34:56] INFO (HTTP): GET /api/users 200 - 45ms
[12:34:57] WARN (HTTP): POST /api/login 401 - 123ms
[12:34:58] ERROR (HTTP): GET /api/orders 500 - 234ms
```

## 🧪 Testes

### Mockando o Logger

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let logger: LoggerService;

  beforeEach(async () => {
    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get(AuthService);
    logger = module.get(LoggerService);
  });

  it('should log on successful login', async () => {
    await service.login('user@example.com', 'password');

    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('Login successful'),
      'AuthService',
    );
  });

  it('should log error on failed login', async () => {
    await expect(service.login('invalid', 'wrong')).rejects.toThrow();

    expect(logger.error).toHaveBeenCalled();
  });
});
```

## 📊 Integração com Ferramentas

### ELK Stack (Elasticsearch, Logstash, Kibana)

```typescript
// Produção: enviar logs para Logstash
const logger = pino({
  level: 'info',
  // Sem transport = JSON puro no stdout
});

// Docker Compose captura stdout e envia para Logstash
```

### Grafana Loki

```typescript
// Logs em JSON são automaticamente parseados pelo Loki
const logger = pino({
  level: 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});
```

## 🚨 Boas Práticas

### ✅ DO: Sempre passe o contexto

```typescript
// ✅ CORRETO
this.logger.log('User created', 'AuthService');

// ❌ ERRADO: Sem contexto
this.logger.log('User created');
```

### ✅ DO: Use o nível correto

```typescript
// ✅ CORRETO: Info para fluxo normal
this.logger.log('Order processed', 'OrderService');

// ❌ ERRADO: Debug para tudo
this.logger.debug('Order processed', 'OrderService');
```

### ✅ DO: Log dados estruturados

```typescript
// ✅ CORRETO: Dados estruturados
this.logger.info('Payment processed', {
  amount: 100,
  currency: 'USD',
  userId: '123',
});

// ❌ ERRADO: String concatenada
this.logger.info(`Payment of 100 USD for user 123`);
```

### ❌ DON'T: Não logue dados sensíveis

```typescript
// ❌ ERRADO: Password no log!
this.logger.log(`User registered: ${email} with password ${password}`);

// ✅ CORRETO: Sem dados sensíveis
this.logger.log(`User registered: ${email}`);
```

### ❌ DON'T: Não logue objetos grandes

```typescript
// ❌ ERRADO: Objeto gigante
this.logger.log(JSON.stringify(hugeObject));

// ✅ CORRETO: Apenas o necessário
this.logger.log(`Processed ${hugeObject.length} items`);
```

## 🎯 Resumo

| Feature | Implementado |
|---------|--------------|
| Pino configurado | ✅ |
| Pretty print em dev | ✅ |
| JSON em produção | ✅ |
| Níveis de log | ✅ |
| Contexto automático | ✅ |
| Log de queries Prisma | ✅ |
| Global module | ✅ |
| Testável | ✅ |

Agora você tem um sistema de logging **profissional**, **rápido** e **pronto para produção**! 🚀
