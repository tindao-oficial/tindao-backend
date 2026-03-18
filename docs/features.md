# Tindão — Guia de Features e Fluxos de Uso

Este documento descreve todas as funcionalidades disponíveis na API do Tindão, explicando as regras de negócio e os fluxos de uso do ponto de vista do produto e do frontend.

---

## Sumário

1. [Autenticação](#1-autenticação)
2. [Perfil do Usuário](#2-perfil-do-usuário)
3. [Administração de Usuários](#3-administração-de-usuários)
4. [Eventos Principais](#4-eventos-principais)
5. [Sub-eventos (Pre-party / After-party)](#5-sub-eventos-pre-party--after-party)
6. [Presença](#6-presença)
7. [Favoritos](#7-favoritos)
8. [Convites e QR Code](#8-convites-e-qr-code)
9. [Fluxo de Aprovação de Sub-eventos](#9-fluxo-de-aprovação-de-sub-eventos)
10. [Visão do Organizador](#10-visão-do-organizador)
11. [Listagens Públicas](#11-listagens-públicas)
12. [Regras de Status de Presença](#12-regras-de-status-de-presença)
13. [Permissões Resumidas](#13-permissões-resumidas)
14. [Categorias de Evento](#14-categorias-de-evento)
15. [O que vem a seguir (roadmap)](#15-o-que-vem-a-seguir-roadmap)

---

## 1. Autenticação

### Cadastro

```
POST /v1/auth/signup
```

Qualquer pessoa pode criar uma conta. Campos obrigatórios: `email`, `password`.

### Login

```
POST /v1/auth/login
```

Retorna três valores principais:
- **`accessToken`** — válido por 1 dia. Deve ser enviado no header `Authorization: Bearer <token>` em todas as rotas autenticadas.
- **`refreshToken`** — válido por 7 dias. Usado para renovar o access token sem novo login.
- **`expiresAt`** — timestamp em milissegundos (epoch) indicando quando o access token expira. O app usa esse campo para agendar o refresh automático.

### Login via Google

```
POST /v1/auth/google
```

Rota pública. Recebe o `idToken` obtido pelo Google Sign-In no app:

```json
{ "idToken": "eyJhbGciOiJSUzI1NiIs..." }
```

O backend valida o token com `google-auth-library` usando o `AUTH_GOOGLE_CLIENT_ID` configurado. Se o usuário não existe, cria uma nova conta com os dados do perfil Google (nome, foto, email). Se já existe (por email ou googleId), atualiza dados faltantes e retorna o perfil.

Retorna o mesmo formato de login/signup: `accessToken`, `refreshToken`, `expiresAt`, `user`.

> **Nota:** Usuários criados exclusivamente via Google não possuem senha. Se tentarem login por email/senha, recebem `400` com `auth.error.useGoogleLogin`.

### Renovar o token

```
GET /v1/auth/refresh-token
```

Envie o `refreshToken` no header `Authorization: Bearer <refreshToken>`. Retorna novos `accessToken`, `refreshToken` e `expiresAt`.

### Logout

```
POST /v1/auth/logout
```

Invalida a sessão atual.

---

## 2. Perfil do Usuário

### Ver perfil

```
GET /v1/user/profile
```

Retorna todos os dados do usuário logado, incluindo campos estendidos:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `bio` | string | Texto livre de apresentação |
| `birthDate` | date | Data de nascimento |
| `gender` | string | Gênero |
| `profilePhoto` | string | Chave S3 da foto de perfil |
| `interests` | string[] | Lista de interesses/tags |
| `latitude` / `longitude` | float | Localização do usuário |
| `isOrganizer` | boolean | Se o usuário pode criar eventos oficiais |

### Atualizar perfil

```
PUT /v1/user
```

Todos os campos são opcionais. O campo `isOrganizer` **não** pode ser alterado por esta rota — ele só pode ser ativado por um administrador via `PATCH /v1/admin/user/:id/organizer`.

---

## 3. Administração de Usuários

Todos os endpoints abaixo requerem `role = ADMIN`.

### Listar usuários

```
GET /v1/admin/user
```

Retorna lista paginada de usuários com filtros opcionais:

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `role` | enum | `USER`, `ADMIN`, `DEVELOPER` |
| `isOrganizer` | boolean | Filtrar por status de organizador |
| `search` | string | Busca por nome, username ou email |
| `limit` | number | Máximo de itens (padrão: 20) |
| `cursor` | string | Cursor de paginação |

### Atualizar role

```
PATCH /v1/admin/user/:id/role
```

Altera a role do usuário (`USER`, `ADMIN`, `DEVELOPER`).

```json
{ "role": "ADMIN" }
```

### Promover/revogar organizador

```
PATCH /v1/admin/user/:id/organizer
```

Concede ou revoga privilégios de organizador (criação de eventos oficiais).

```json
{ "isOrganizer": true }
```

### Deletar usuário

```
DELETE /v1/admin/user/:id
```

Soft delete do usuário. Cancela automaticamente todos os seus eventos `DRAFT` e `PUBLISHED`.

---

## 4. Eventos Principais

### O que é um evento principal?

Um evento principal (`type = MAIN`) é o evento raiz. É a "festa" em si. Pre-parties e after-parties são vinculados a ele como sub-eventos.

Existem dois tipos de evento principal:

| Tipo | Descrição |
|------|-----------|
| **Oficial** (`isOfficial = true`) | Criado por um organizador verificado. Usado para eventos de grande porte (baladas, shows, etc.) |
| **Casual** (`isOfficial = false`) | Criado por qualquer usuário. Usado para reuniões informais, churrasco, encontros de amigos, etc. |

### Criar um evento

```
POST /v1/events
```

**Requer:** qualquer usuário autenticado.

Campos obrigatórios:

| Campo | Tipo | Exemplo |
|-------|------|---------|
| `title` | string | "Balada do Mês" |
| `description` | string | "A maior festa do semestre" |
| `category` | enum | `NIGHTLIFE`, `MUSIC`, `TECH`, `SPORTS`, `ARTS`, `FOOD`, `NETWORKING`, `OTHER` |
| `city` | string | "São Paulo" |
| `venueName` | string | "Clube X" |
| `address` | string | "Rua das Flores, 123" |
| `startAt` | datetime (ISO) | "2026-04-15T22:00:00Z" |
| `endAt` | datetime (ISO) | "2026-04-16T05:00:00Z" |

Campos opcionais:

| Campo | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `coverImage` | string | null | Chave S3 da capa do evento |
| `latitude` / `longitude` | float | null | Coordenadas para mapa |
| `isPrivate` | boolean | false | Evento privado (não aparece em listagens públicas) |
| `isOfficial` | boolean | false | Marca como evento oficial. **Ignorado silenciosamente se o criador não for organizador.** |
| `prePartyPermissionMode` | enum | `ORGANIZER_ONLY` | Quem pode criar pre-parties |
| `afterPartyPermissionMode` | enum | `ORGANIZER_ONLY` | Quem pode criar after-parties |

Valores de `*PermissionMode`:
- `DISABLED` — ninguém pode criar sub-eventos deste tipo
- `ORGANIZER_ONLY` — apenas o organizador
- `ATTENDEES_ALLOWED` — organizador + participantes confirmados

Ao criar, o evento começa com `status = DRAFT` e **não aparece** nas listagens públicas.

### Publicar um evento

```
PATCH /v1/events/:id/publish
```

Move o evento de `DRAFT` para `PUBLISHED`, tornando-o visível na listagem pública. Apenas o criador do evento ou um admin pode publicar. Eventos já publicados, cancelados ou finalizados não podem usar esta rota.

### Atualizar um evento

```
PUT /v1/events/:id
```

Todos os campos são opcionais. Permitido para o criador do evento ou admin. Sub-eventos não podem ter seus `*PermissionMode` alterados por esta rota.

### Cancelar um evento

```
PATCH /v1/events/:id/cancel
```

Permitido para o criador do evento ou admin. O cancelamento é em cascata: todos os sub-eventos também são cancelados automaticamente. Os registros de presença são preservados.

### Deletar um evento

```
DELETE /v1/events/:id
```

Soft delete permanente. Permitido para o criador do evento ou admin. O delete é em cascata: todos os sub-eventos também são deletados.

> **Nota:** se o organizador excluir sua conta, todos os seus eventos `DRAFT` e `PUBLISHED` também são cancelados automaticamente.

---

## 5. Sub-eventos (Pre-party / After-party)

### O que são sub-eventos?

Sub-eventos são eventos vinculados a um evento principal. Existem dois tipos:
- **`PRE_PARTY`** — evento que acontece antes da festa principal
- **`AFTER_PARTY`** — evento que acontece após a festa principal

Cada sub-evento tem seu próprio local, horário, convite e QR code independentes. O detalhe de cada sub-evento inclui os **dados do organizador** (quem criou).

### Criar um sub-evento

```
POST /v1/events/:eventId/sub-events
```

**Quem pode criar** depende do `permissionMode` configurado no evento principal:

| Modo | Quem pode criar |
|------|----------------|
| `DISABLED` | Ninguém |
| `ORGANIZER_ONLY` | Apenas o organizador do evento principal |
| `ATTENDEES_ALLOWED` | Organizador + usuários com presença confirmada (GOING, CHECKED_IN ou ATTENDED) |

> Usuários com status apenas `INTERESTED` **não** podem criar sub-eventos no modo `ATTENDEES_ALLOWED`. É necessário confirmar presença.

### Campos do sub-evento

Mesmos campos de um evento principal, com a adição obrigatória de:

| Campo | Tipo | Valores |
|-------|------|---------|
| `type` | enum | `PRE_PARTY` ou `AFTER_PARTY` |

### Restrições de data

- **PRE_PARTY**: o sub-evento deve **terminar antes** do início do evento principal
- **AFTER_PARTY**: o sub-evento deve **começar após** o término do evento principal

### Prevenção de duplicatas

Um usuário só pode ter **um** sub-evento `PENDING` ou `APPROVED` por tipo por evento principal. Tentar criar um segundo resulta em erro `409 Conflict`.

### Visibilidade após criação

| Quem criou | `approvalStatus` | `status` | Visível publicamente? |
|------------|-----------------|----------|----------------------|
| Organizador | `APPROVED` | `PUBLISHED` | Sim, imediatamente |
| Participante | `PENDING` | `DRAFT` | Não — aguarda aprovação do organizador |

### Atualizar um sub-evento

```
PUT /v1/events/:id
```

Mesmo endpoint de eventos principais. Permitido para o criador do sub-evento ou admin.

### Deletar um sub-evento

```
DELETE /v1/events/:eventId/sub-events/:subEventId
```

Soft delete. Permitido para:
- Criador do sub-evento
- Organizador do evento pai
- Admin

---

## 6. Presença

### Confirmar presença

```
POST /v1/events/:eventId/going
```

Confirma que o usuário vai ao evento. Status: `GOING`. Esta ação concede o direito de criar sub-eventos quando o modo `ATTENDEES_ALLOWED` está ativo.

### Cancelar participação

```
POST /v1/events/:eventId/cancel-attendance
```

Cancela qualquer status de presença ativo. Se não houver registro, a operação é ignorada sem erro.

### Ver meu status em um evento

```
GET /v1/events/:eventId/my-attendance
```

Retorna o status atual do usuário logado naquele evento:

```json
{
  "exists": true,
  "status": "GOING",
  "source": "MANUAL"
}
```

Se o usuário nunca interagiu com o evento: `exists: false`, `status: null`.

### Meu histórico de eventos

```
GET /v1/users/me/events
```

Retorna todos os eventos em que o usuário logado tem algum registro de presença. Suporta filtros via query:

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `status` | enum | Filtrar por status de presença |
| `type` | enum | Filtrar por tipo de evento (MAIN, PRE_PARTY, AFTER_PARTY) |
| `upcoming` | boolean | Apenas eventos futuros |
| `past` | boolean | Apenas eventos passados |
| `limit` | number | Máximo de itens por página (padrão: 20) |
| `cursor` | string | Cursor para próxima página |

---

## 7. Favoritos

Favoritar é uma ação independente do status de presença — análoga ao "salvar" do Instagram ou o "curtir" do Spotify. Um usuário pode ser `GOING` em um evento e tê-lo favoritado ao mesmo tempo, sem conflito.

> **Importante:** Favoritos **não afetam** `attendanceStatus` em hipótese alguma. São sistemas completamente separados.

### Favoritar um evento

```
POST /v1/events/:eventId/favorite
```

**Requer:** usuário autenticado. O evento deve existir e estar `PUBLISHED`. Retorna 409 se já favoritado.

```json
{ "isFavorited": true }
```

### Desfavoritar um evento

```
DELETE /v1/events/:eventId/favorite
```

**Requer:** usuário autenticado. Retorna 404 se o evento não estava favoritado.

```json
{ "isFavorited": false }
```

### Listar eventos favoritados

```
GET /v1/events/favorites
```

**Requer:** usuário autenticado. Retorna os eventos favoritados pelo usuário logado, no mesmo formato paginado de `GET /v1/events` (cursor-based).

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `limit` | number | Máximo de itens (padrão: 20, máximo: 100) |
| `cursor` | string | Cursor para próxima página (ID do registro de favorito) |

Os itens retornam `isFavorited: true` sempre (são todos favoritados por definição).

### Campo `isFavorited` nas respostas de evento

O campo `isFavorited` aparece em todos os responses de evento:

| Endpoint | Valor de `isFavorited` |
|----------|----------------------|
| `GET /v1/events` (público) | `null` — sem contexto de usuário |
| `GET /v1/events/:id` (público) | `null` — sem contexto de usuário |
| `GET /v1/events/invite/:code` (público) | `null` — sem contexto de usuário |
| `GET /v1/events/:id/my-context` | `true` ou `false` — valor real do usuário autenticado |
| `GET /v1/events/favorites` | `true` — sempre (são os favoritos) |

---

## 8. Convites e QR Code

### Como funcionam os convites

Cada evento recebe automaticamente um `inviteCode` único no momento da criação. Esse código gera um link de convite no formato:

```
https://tindao.app/events/<inviteCode>
```

O link é público — qualquer pessoa que receber o link pode acessar os detalhes do evento sem autenticação.

### Obter o link e QR code do evento

```
GET /v1/events/:id/invite
```

**Requer autenticação.** Retorna:

```json
{
  "inviteCode": "a1b2c3d4e5f6g7h8",
  "inviteUrl": "https://tindao.app/events/a1b2c3d4e5f6g7h8",
  "qrCodeDataUrl": "data:image/png;base64,iVBOR..."
}
```

O `qrCodeDataUrl` pode ser exibido diretamente como `<img src="...">` no frontend.

### Acessar evento pelo invite code

```
GET /v1/events/invite/:inviteCode
```

Rota pública. Retorna os detalhes completos do evento — útil para o fluxo de escanear QR code.

---

## 9. Fluxo de Aprovação de Sub-eventos

Quando o modo `ATTENDEES_ALLOWED` está ativo, participantes podem propor sub-eventos, mas eles precisam ser aprovados pelo organizador antes de aparecerem publicamente.

### Fluxo completo

```
Participante cria sub-evento
        ↓
Status: PENDING (invisível no app)
        ↓
Organizador revisa em /events/:id/sub-events/pending
        ↓
    ┌───┴───┐
  Aprova   Rejeita
    ↓         ↓
 APPROVED  REJECTED
 (público) (invisível)
```

### Ver sub-eventos pendentes

```
GET /v1/events/:eventId/sub-events/pending
```

**Apenas o organizador** do evento principal pode acessar.

### Aprovar um sub-evento

```
PATCH /v1/events/:eventId/sub-events/:subEventId/approve
```

**Apenas o organizador.** O sub-evento passa para `APPROVED` + `PUBLISHED` e começa a aparecer publicamente.

### Rejeitar um sub-evento

```
PATCH /v1/events/:eventId/sub-events/:subEventId/reject
```

**Apenas o organizador.** O sub-evento passa para `REJECTED` e permanece invisível.

---

## 10. Visão do Organizador

### Contexto do usuário em um evento

```
GET /v1/events/:id/my-context
```

Retorna flags booleanas para o frontend saber quais ações mostrar:

```json
{
  "attendanceStatus": "GOING",
  "isOrganizer": true,
  "canCreatePreParty": true,
  "canCreateAfterParty": true,
  "canManageEvent": true,
  "canApproveSubEvents": true,
  "isFavorited": false
}
```

### Meus eventos organizados

```
GET /v1/users/me/organized-events
```

Retorna todos os eventos criados pelo usuário logado, com contagens de engajamento:

| Campo | Descrição |
|-------|-----------|
| `favoritesCount` | Quantidade de usuários que favoritaram o evento |
| `attendeesCount` | Quantidade de usuários com status GOING + CHECKED_IN + ATTENDED |

Suporta filtros:

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `status` | enum | `DRAFT`, `PUBLISHED`, `CANCELLED`, `FINISHED` |
| `type` | enum | `MAIN`, `PRE_PARTY`, `AFTER_PARTY` |
| `limit` | number | Máximo de itens (padrão: 20) |
| `cursor` | string | Cursor de paginação |

---

## 11. Listagens Públicas

### Listar eventos

```
GET /v1/events
```

Rota pública. Por padrão retorna apenas eventos do tipo `MAIN` com `status = PUBLISHED`. Suporta filtros:

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `city` | string | Filtrar por cidade (busca parcial, case-insensitive) |
| `category` | enum | Categoria do evento |
| `type` | enum | Tipo: `MAIN`, `PRE_PARTY`, `AFTER_PARTY` |
| `startDate` | datetime | Eventos que começam a partir desta data |
| `endDate` | datetime | Eventos que começam até esta data |
| `organizerId` | uuid | Filtrar por organizador específico |
| `latitude` | number | Latitude do usuário (para busca por proximidade) |
| `longitude` | number | Longitude do usuário (para busca por proximidade) |
| `radius` | number | Raio de busca em km (padrão: 50) |
| `sortBy` | string | `"distance"` para ordenar por proximidade |
| `limit` | number | Máximo de itens (padrão: 20, máximo: 100) |
| `cursor` | string | Cursor para próxima página |

Cada item retorna:
- `organizer` — dados resumidos do organizador (id, firstName, lastName, avatar)
- `favoritesCount` — total de usuários que favoritaram o evento
- `attendeesCount` — total de usuários com status GOING + CHECKED_IN + ATTENDED
- `isFavorited` — `null` (rotas públicas sem contexto de usuário)
- `distance` — distância em km do ponto informado (apenas quando `latitude`/`longitude` são passados, `null` caso contrário)

**Busca por proximidade:** quando `latitude` e `longitude` são fornecidos, apenas eventos com coordenadas dentro do raio são retornados. Se `sortBy=distance`, os resultados são ordenados do mais perto ao mais longe. A distância é calculada via fórmula de Haversine.

**Regras de visibilidade:**
- Eventos privados (`isPrivate = true`) não aparecem nesta listagem
- Apenas eventos com `status = PUBLISHED` aparecem
- Sub-eventos com `approvalStatus` diferente de `APPROVED` não aparecem

### Detalhe de um evento

```
GET /v1/events/:id
```

Rota pública. Retorna o evento com:
- Dados completos do evento (incluindo `isOfficial`)
- Informações do organizador
- Sub-eventos agrupados: `preParties[]` e `afterParties[]` (apenas `APPROVED`), cada um com dados do seu organizador
- Contagens: `favoritesCount` e `attendeesCount`

### Listar participantes

```
GET /v1/events/:eventId/attendees
```

Retorna usuários com status `GOING`, `CHECKED_IN` ou `ATTENDED`. Suporta filtro por `status` e paginação por cursor.

---

## 12. Regras de Status de Presença

Os status de presença seguem uma hierarquia de força. Ações nunca rebaixam um status mais forte:

```
CANCELLED (0) < GOING (1) < CHECKED_IN (2) < ATTENDED (3)
```

| Ação | Comportamento |
|------|---------------|
| `markGoing` | Cria ou promove para `GOING`. Se o usuário já tem `CHECKED_IN` ou `ATTENDED`, não faz nada. |
| `cancelAttendance` | Sempre define `CANCELLED`, independente do status atual. |

**Statuses elegíveis para criar sub-eventos:** `GOING`, `CHECKED_IN`, `ATTENDED`

> Para demonstrar interesse sem comprometer presença, use **Favoritar** (`POST /v1/events/:eventId/favorite`).

---

## 13. Permissões Resumidas

| Ação | Quem pode |
|------|-----------|
| Criar evento MAIN | Qualquer usuário autenticado |
| Criar evento MAIN oficial | Apenas usuários com `isOrganizer = true` |
| Criar sub-evento (ORGANIZER_ONLY) | Somente o criador do evento pai |
| Criar sub-evento (ATTENDEES_ALLOWED) | Criador do evento + usuários com GOING / CHECKED_IN / ATTENDED |
| Publicar evento | Criador do evento ou admin |
| Atualizar evento | Criador do evento ou admin |
| Cancelar evento | Criador do evento ou admin |
| Deletar evento | Criador do evento ou admin (cascata para sub-eventos) |
| Deletar sub-evento | Criador do sub-evento, organizador do evento pai, ou admin |
| Aprovar/Rejeitar sub-evento | Somente o criador do evento pai |
| Ver sub-eventos pendentes | Somente o criador do evento pai |
| Favoritar/desfavoritar evento | Qualquer usuário autenticado |
| Confirmar presença (GOING) | Qualquer usuário autenticado |
| Promover organizador | Apenas admin |
| Alterar role de usuário | Apenas admin  |
| Listar usuários | Apenas admin |
| Ver listagens | Qualquer pessoa (sem autenticação) |
| Ver detalhe de evento | Qualquer pessoa (sem autenticação) |
| Acessar por invite code | Qualquer pessoa (sem autenticação) |
| Gerar QR code | Qualquer usuário autenticado |

---

## 14. Categorias de Evento

O enum `EventCategory` inclui:

| Valor | Descrição |
|-------|-----------|
| `MUSIC` | Eventos musicais |
| `SPORTS` | Esportes |
| `TECH` | Tecnologia |
| `ARTS` | Artes |
| `FOOD` | Gastronomia |
| `NIGHTLIFE` | Baladas / vida noturna |
| `NETWORKING` | Networking |
| `UNIVERSITY` | Eventos universitários |
| `PARTY` | Festas / agitos |
| `OTHER` | Outros |

---

## 15. O que vem a seguir (roadmap)

### Módulo de Ingressos (Tickets)
- Compra de ingressos com integração de pagamento (PIX / cartão de crédito)
- A compra de um ingresso promoverá automaticamente o usuário para `GOING`
- Tipos de ingresso: gratuito, pago, meia-entrada

### Check-in por QR Code
- Endpoint de check-in que promove o status de `GOING` para `CHECKED_IN`
- QR code individual por ingresso para validação na entrada

### Notificações
- Notificação ao participante quando seu sub-evento for aprovado ou rejeitado
- Notificação ao organizador quando novos sub-eventos forem submetidos
- Lembretes de eventos próximos

### Funcionalidades sociais
- Sistema de match/interesse entre usuários (campo `InterestAction`: LIKE, DISLIKE, SUPER_LIKE)
- Feed personalizado de eventos por localização e interesses do usuário
