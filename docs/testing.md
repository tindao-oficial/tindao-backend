# Tindão — Guia de Testes

Este guia explica como executar, entender e escrever testes no projeto.

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Como rodar os testes](#2-como-rodar-os-testes)
3. [Estrutura dos testes](#3-estrutura-dos-testes)
4. [Cobertura de código](#4-cobertura-de-código)
5. [Como escrever novos testes](#5-como-escrever-novos-testes)
6. [O que está coberto](#6-o-que-está-coberto)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Visão geral

O projeto usa **testes unitários** com Jest + SWC (compilação rápida, sem `ts-jest`).

| Tipo | Abordagem | Banco de dados |
|------|-----------|---------------|
| Unitário | Mocks de todos os serviços externos | Não usa — tudo mockado |

Todos os testes ficam em `test/` e seguem a mesma estrutura de `src/`.

**Estado atual:** 16 suites, ~308 testes. Alguns métodos novos ainda precisam de cobertura (ver seção 6).

---

## 2. Como rodar os testes

### Rodar todos os testes (com cobertura)

```bash
yarn test
```

> Se o servidor de desenvolvimento (`yarn dev`) estiver rodando, o comando `yarn test` pode falhar porque o Prisma tenta regenerar o client e o arquivo `.dll` está bloqueado.
>
> Nesse caso, **pare o servidor antes** ou use o comando alternativo abaixo.

### Rodar sem regenerar o Prisma (recomendado durante desenvolvimento)

```bash
npx jest --config test/jest.json --runInBand --passWithNoTests --forceExit
```

### Rodar um arquivo específico

```bash
npx jest --config test/jest.json --runInBand --forceExit test/modules/event.service.spec.ts
```

### Rodar apenas testes que correspondam a um padrão de nome

```bash
npx jest --config test/jest.json --runInBand --forceExit -t "createSubEvent"
```

### Rodar sem cobertura (mais rápido)

```bash
npx jest --config test/jest.json --runInBand --forceExit --no-coverage
```

### Watch mode (rerun ao salvar)

```bash
npx jest --config test/jest.json --watch
```

---

## 3. Estrutura dos testes

```
test/
├── jest.json                          # Configuração do Jest
├── mocks/
│   ├── faker.mock.ts                  # Mock do @faker-js/faker (evita valores aleatórios)
│   ├── ws.mock.ts                     # Mock de WebSocket
│   ├── grpc.mock.ts                   # Mock de gRPC
│   └── proto-loader.mock.ts           # Mock de proto-loader
├── common/
│   ├── auth.service.spec.ts           # Testes de AuthService
│   ├── aws.s3.service.spec.ts         # Testes de AwsS3Service
│   ├── aws.ses.service.spec.ts        # Testes de AwsSesService
│   ├── cache.service.spec.ts          # Testes de CacheService
│   ├── database.service.spec.ts       # Testes de DatabaseService
│   ├── file.service.spec.ts           # Testes de FileService
│   ├── helper.email.service.spec.ts   # Testes de HelperEmailService
│   ├── helper.encryption.service.spec.ts
│   ├── helper.pagination.service.spec.ts
│   ├── helper.query.builder.service.spec.ts
│   ├── helper.query.service.spec.ts
│   └── message.service.spec.ts
├── modules/
│   ├── event.service.spec.ts          # Testes de EventService
│   ├── event-attendance.service.spec.ts
│   └── user.service.spec.ts
└── workers/
    └── email.processor.service.spec.ts
```

### Convenção de nomes

- Arquivos de teste: `<nome-do-serviço>.spec.ts`
- Localização: espelha `src/` dentro de `test/`
- Um arquivo de teste por serviço

---

## 4. Cobertura de código

### Visualizar o relatório HTML

Após rodar `yarn test` (com cobertura), abra no browser:

```
coverage/index.html
```

### Thresholds configurados

O projeto exige **90% de cobertura** em todas as métricas:

| Métrica | Threshold |
|---------|-----------|
| Branches | 90% |
| Functions | 90% |
| Lines | 90% |
| Statements | 90% |

Se a cobertura cair abaixo, o CI falha. Para ver onde está a cobertura baixa:

```bash
npx jest --config test/jest.json --runInBand --forceExit --coverage 2>&1 | grep -A5 "Uncovered"
```

### O que está excluído da cobertura

Por configuração em `test/jest.json`, estes arquivos são ignorados:

- `src/common/database/services/database.service.ts` — wrapper do Prisma, testado implicitamente
- `src/common/logger/services/logger.service.ts` — wrapper de Pino
- `src/workers/schedulers/midnight.scheduler.ts` — cron job

---

## 5. Como escrever novos testes

### Padrão usado no projeto

```typescript
import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { DatabaseService } from 'src/common/database/services/database.service';
import { MeuService } from 'src/modules/meu-modulo/services/meu.service';

// Mock do banco — um objeto por model do Prisma que o serviço usa
const mockDb = {
    minhaEntidade: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
    },
};

describe('MeuService', () => {
    let service: MeuService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MeuService,
                { provide: DatabaseService, useValue: mockDb },
                // Adicione outros providers mockados aqui
            ],
        }).compile();

        service = module.get<MeuService>(MeuService);
        jest.clearAllMocks(); // Limpa chamadas entre testes
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('meuMetodo', () => {
        it('should throw 404 if entity not found', async () => {
            mockDb.minhaEntidade.findUnique.mockResolvedValue(null);

            await expect(service.meuMetodo('id-inexistente'))
                .rejects.toThrow(HttpException);
        });

        it('should return entity on success', async () => {
            mockDb.minhaEntidade.findUnique.mockResolvedValue({ id: '123' });

            const result = await service.meuMetodo('123');

            expect(result).toEqual({ id: '123' });
        });
    });
});
```

### Checklist ao criar um novo teste

- [ ] Um `describe` por método do serviço
- [ ] Testar o caminho feliz (success)
- [ ] Testar cada erro possível (404, 403, 400, 422...)
- [ ] Usar `jest.clearAllMocks()` no `beforeEach`
- [ ] Verificar que mocks externos são chamados com os parâmetros certos (`toHaveBeenCalledWith`)
- [ ] Verificar que ações **não** acontecem quando não devem (`not.toHaveBeenCalled`)

### Mockando bibliotecas externas

Para bibliotecas como `qrcode`, use `jest.mock()` no topo do arquivo:

```typescript
jest.mock('qrcode', () => ({
    toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock'),
}));
```

### Mockando ConfigService

```typescript
const mockConfig = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
};

// No module:
{ provide: ConfigService, useValue: mockConfig }
```

---

## 6. O que está coberto

### EventService (`test/modules/event.service.spec.ts`)

| Método | Cenários testados |
|--------|------------------|
| `createMainEvent` | Usuário não encontrado, datas inválidas, sucesso com inviteUrl, `isOfficial` ignorado para não-organizador, `isOfficial` aplicado para organizador |
| `createSubEvent` | Tipo MAIN rejeitado, parent não encontrado, parent não é MAIN, evento cancelado, DISABLED, ORGANIZER_ONLY sem permissão, ATTENDEES_ALLOWED sem elegibilidade, datas inválidas, PENDING para participantes, APPROVED para organizador |
| `listEvents` | Lista com inviteUrl, nextCursor, filtro APPROVED para sub-eventos, sem filtro para MAIN |
| `getEventById` | Não encontrado, retorno com contagens e sub-eventos agrupados |
| `updateEvent` | Não encontrado, não é organizador, admin pode atualizar, datas inválidas, sucesso |
| `cancelEvent` | Não encontrado, não é organizador, admin pode cancelar, cascata de sub-eventos |
| `publishEvent` | Não encontrado, não é organizador, admin pode publicar, não é DRAFT, sucesso |
| `deleteEvent` | Não encontrado, não é dono, admin pode deletar, cascata de sub-eventos, sucesso |
| `deleteSubEvent` | Não encontrado (parent/sub), criador pode deletar, organizador do pai pode deletar, admin pode deletar, 403 para terceiros |
| `listPendingSubEvents` | Não encontrado, não é organizador, lista de pendentes |
| `approveSubEvent` | Não encontrado (parent/sub), não é organizador, não PENDING, sucesso |
| `rejectSubEvent` | Não PENDING, sucesso |
| `getInviteInfo` | Não encontrado, retorno com QR code |
| `getMyOrganizedEvents` | Contagens corretas, zeros quando sem presença, nextCursor |

### EventAttendanceService (`test/modules/event-attendance.service.spec.ts`)

| Método | Cenários testados |
|--------|------------------|
| `markInterested` | Evento não encontrado, evento cancelado, cria INTERESTED, não rebaixa de GOING, promove de CANCELLED |
| `markGoing` | Evento cancelado, cria GOING, promove de INTERESTED, não rebaixa de CHECKED_IN, não rebaixa de ATTENDED |
| `cancelAttendance` | Sem registro retorna null, cancela de GOING, cancela de ATTENDED |
| `listEventAttendees` | Statuses padrão, filtro por status, nextCursor |
| `getMyAttendanceForEvent` | Sem registro (exists: false), com registro (exists: true, status, source) |
| `isEligibleAttendee` | Sem registro: false, INTERESTED: false, CANCELLED: false, GOING: true, CHECKED_IN: true, ATTENDED: true |
| `listMyEvents` | Retorno correto, filtro upcoming, filtro past, nextCursor |

### UserService (`test/modules/user.service.spec.ts`)

| Método | Cenários testados |
|--------|------------------|
| `updateUser` | Não encontrado, sucesso |
| `deleteUser` | Não encontrado, soft delete com mensagem |
| `getProfile` | Não encontrado, sucesso |
| `updateRole` | Não encontrado, atualiza role corretamente |
| `updateOrganizer` | Não encontrado, concede privilégio, revoga privilégio |
| `listUsers` | Sem filtros, filtro por role, filtro por isOrganizer, busca por search, nextCursor |

---

## 7. Troubleshooting

### "EPERM: operation not permitted" ao rodar `yarn test`

O servidor de desenvolvimento está rodando e bloqueando o arquivo do Prisma. Solução:

```bash
# Opção 1: Pare o servidor e rode normalmente
# Ctrl+C no terminal do servidor, depois:
yarn test

# Opção 2: Use o Jest diretamente (sem regenerar o Prisma)
npx jest --config test/jest.json --runInBand --passWithNoTests --forceExit
```

### Testes passam mas cobertura falha

Significa que existe um `service.ts` sem testes suficientes. Veja o relatório em `coverage/index.html` para identificar qual arquivo e quais branches estão descobertos.

### "Cannot find module 'src/...'"

O `modulePaths` em `test/jest.json` está configurado para `["."]` (raiz do projeto), então imports como `src/common/...` funcionam direto. Se estiver rodando Jest fora da raiz, use sempre o `--config test/jest.json`.

### Mock não está sendo limpo entre testes

Certifique-se de ter `jest.clearAllMocks()` no `beforeEach`. Sem isso, os `mockResolvedValue` acumulam entre testes.

### Teste de serviço com dependência circular

Se o serviço A importa o serviço B e vice-versa, use `jest.fn()` para ambos e injete manualmente via `useValue`. Não tente montar o módulo real com dependências circulares em testes unitários.
