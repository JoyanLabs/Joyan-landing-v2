---
name: typescript
description: >
  Patrones estrictos y mejores prácticas de TypeScript.
  Trigger: Cuando se implementa o refactoriza TypeScript en .ts (types, interfaces, generics, const maps, type guards, eliminando any).
license: MIT
metadata:
  author: conasin-team
  version: "1.0"
  scope: [root]
  auto_invoke: "Escribiendo tipos/interfaces TypeScript"
allowed-tools: Read, Edit, Write, Glob, Grep
---

## When to Use

Usa esta skill cuando:
- Implementas o refactorizas tipos TypeScript
- Creas interfaces, types o generics
- Necesitas utility types (Pick, Omit, Partial, etc.)
- Eliminas `any` del código
- Aplicas patrones de TypeScript estricto

**NO usar esta skill cuando:**
- Trabajas con validación de datos → Usar `zod-4`
- Implementas autenticación → Usar `better-auth`
- Preguntas son generales del proyecto → Usar `conasin`

---

## Const Types Pattern (REQUERIDO)

```typescript
// ✅ SIEMPRE: Crear objeto const primero, luego extraer tipo
const STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  PENDING: "pending",
} as const;

type Status = (typeof STATUS)[keyof typeof STATUS];

// ❌ NUNCA: Union types directos
type Status = "active" | "inactive" | "pending";
```

**¿Por qué?** Única fuente de verdad, valores en runtime, autocomplete, refactoring más fácil.

---

## Flat Interfaces (REQUERIDO)

```typescript
// ✅ SIEMPRE: Un nivel de profundidad, objetos anidados → interfaz dedicada
interface UserAddress {
  street: string;
  city: string;
}

interface User {
  id: string;
  name: string;
  address: UserAddress;  // Referencia, no inline
}

interface Admin extends User {
  permissions: string[];
}

// ❌ NUNCA: Objetos anidados inline
interface User {
  address: { street: string; city: string };  // ¡NO!
}
```

---

## Nunca Usar `any`

```typescript
// ✅ Usar unknown para tipos verdaderamente desconocidos
function parse(input: unknown): User {
  if (isUser(input)) return input;
  throw new Error("Invalid input");
}

// ✅ Usar generics para tipos flexibles
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

// ❌ NUNCA
function parse(input: any): any { }
```

---

## Utility Types

```typescript
Pick<User, "id" | "name">     // Seleccionar campos
Omit<User, "id">              // Excluir campos
Partial<User>                 // Todos opcionales
Required<User>                // Todos requeridos
Readonly<User>                // Todos readonly
Record<string, User>          // Tipo objeto
Extract<Union, "a" | "b">     // Extraer de union
Exclude<Union, "a">           // Excluir de union
NonNullable<T | null>         // Remover null/undefined
ReturnType<typeof fn>         // Tipo de retorno de función
Parameters<typeof fn>         // Tuple de parámetros
```

---

## Type Guards

```typescript
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value
  );
}

// Uso
function processInput(input: unknown) {
  if (isUser(input)) {
    // TypeScript sabe que input es User aquí
    console.log(input.name);
  }
}
```

---

## Import Types

```typescript
// ✅ Importar solo tipos con 'type'
import type { User } from "./types";
import { createUser, type Config } from "./utils";

// ✅ Para tipos de Prisma
import type { User as PrismaUser, Prisma } from "@prisma/client";
```

---

## Generics con Constraints

```typescript
// ✅ Constrainar generics cuando sea posible
interface HasId {
  id: string;
}

function findById<T extends HasId>(items: T[], id: string): T | undefined {
  return items.find(item => item.id === id);
}

// ✅ Generics con defaults
interface PaginatedResponse<T, M = Record<string, unknown>> {
  data: T[];
  meta: M;
  total: number;
}
```

---

## Discriminated Unions

```typescript
// ✅ Usar discriminated unions para estados
type RequestState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

function handleState<T>(state: RequestState<T>) {
  switch (state.status) {
    case "success":
      // TypeScript sabe que state.data existe aquí
      return state.data;
    case "error":
      // TypeScript sabe que state.error existe aquí
      throw state.error;
  }
}
```

---

## Patrones para DTOs

```typescript
// ✅ DTOs con class-validator para NestJS
import { IsString, IsEmail, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateUserDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "John Doe" })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;
}
```

---

## Context7 MCP

```bash
mcp context7 query-docs \
  --libraryId "/microsoft/TypeScript" \
  --query "utility types and conditional types best practices"
```
