---
name: zod-4
description: >
  Patrones de validación con Zod 4.
  Trigger: Cuando se crean o actualizan schemas Zod v4 para validación/parsing (forms, payloads, DTOs).
license: MIT
metadata:
  author: conasin-team
  version: "1.0"
  scope: [root]
  auto_invoke: "Creando schemas Zod"
allowed-tools: Read, Edit, Write, Glob, Grep
---

## When to Use

Usa esta skill cuando:
- Creas o actualizas schemas de validación
- Validas datos de formularios
- Parseas/validas payloads de API
- Necesitas tipos inferidos de schemas (z.infer)
- Aplicas validaciones complejas (refinements, transforms)

**NO usar esta skill cuando:**
- Trabajas con tipos TypeScript puros → Usar `typescript`
- Implementas autenticación → Usar `better-auth`
- Preguntas son generales del proyecto → Usar `conasin`

---

## Breaking Changes desde Zod 3

```typescript
// ❌ Zod 3 (VIEJO)
z.string().email()
z.string().uuid()
z.string().url()
z.string().nonempty()
z.object({ name: z.string() }).required_error("Required")

// ✅ Zod 4 (NUEVO)
z.email()
z.uuid()
z.url()
z.string().min(1)
z.object({ name: z.string() }, { error: "Required" })
```

---

## Schemas Básicos

```typescript
import { z } from "zod";

// Primitivos
const stringSchema = z.string();
const numberSchema = z.number();
const booleanSchema = z.boolean();
const dateSchema = z.date();

// Validadores top-level (Zod 4)
const emailSchema = z.email();
const uuidSchema = z.uuid();
const urlSchema = z.url();

// Con constraints
const nameSchema = z.string().min(1).max(100);
const ageSchema = z.number().int().positive().max(150);
const priceSchema = z.number().min(0).multipleOf(0.01);
```

---

## Object Schemas

```typescript
const userSchema = z.object({
  id: z.uuid(),
  email: z.email({ error: "Email inválido" }),
  name: z.string().min(1, { error: "Nombre requerido" }),
  age: z.number().int().positive().optional(),
  role: z.enum(["admin", "user", "guest"]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type User = z.infer<typeof userSchema>;

// Parsing
const user = userSchema.parse(data);  // Lanza error
const result = userSchema.safeParse(data);  // Retorna { success, data/error }

if (result.success) {
  console.log(result.data);
} else {
  console.log(result.error.issues);
}
```

---

## Arrays y Records

```typescript
// Arrays
const tagsSchema = z.array(z.string()).min(1).max(10);
const numbersSchema = z.array(z.number()).nonempty();

// Records (objetos con keys dinámicos)
const scoresSchema = z.record(z.string(), z.number());
// { [key: string]: number }

// Tuples
const coordinatesSchema = z.tuple([z.number(), z.number()]);
// [number, number]
```

---

## Unions y Discriminated Unions

```typescript
// Union simple
const stringOrNumber = z.union([z.string(), z.number()]);

// Discriminated union (más eficiente)
const resultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("success"), data: z.unknown() }),
  z.object({ status: z.literal("error"), error: z.string() }),
]);
```

---

## Transformaciones

```typescript
// Transform durante parsing
const lowercaseEmail = z.email().transform(email => email.toLowerCase());

// Coerción (convertir tipos)
const numberFromString = z.coerce.number();  // "42" → 42
const dateFromString = z.coerce.date();      // "2024-01-01" → Date

// Preprocessing
const trimmedString = z.preprocess(
  val => typeof val === "string" ? val.trim() : val,
  z.string()
);
```

---

## Refinements

```typescript
const passwordSchema = z.string()
  .min(8)
  .refine(val => /[A-Z]/.test(val), {
    message: "Debe contener mayúscula",
  })
  .refine(val => /[0-9]/.test(val), {
    message: "Debe contener número",
  });

// Con superRefine para múltiples errores
const formSchema = z.object({
  password: z.string(),
  confirmPassword: z.string(),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Las contraseñas no coinciden",
      path: ["confirmPassword"],
    });
  }
});
```

---

## Optional y Nullable

```typescript
// Optional (T | undefined)
z.string().optional()

// Nullable (T | null)
z.string().nullable()

// Ambos (T | null | undefined)
z.string().nullish()

// Valores default
z.string().default("unknown")
z.number().default(() => Math.random())
```

---

## Manejo de Errores

```typescript
// Zod 4: Usar parámetro 'error' en lugar de 'message'
const schema = z.object({
  name: z.string({ error: "El nombre debe ser string" }),
  email: z.email({ error: "Formato de email inválido" }),
  age: z.number().min(18, { error: "Debe ser mayor de 18" }),
});

// Custom error map
const customSchema = z.string({
  error: (issue) => {
    if (issue.code === "too_small") {
      return "String muy corto";
    }
    return "String inválido";
  },
});
```

---

## Uso con NestJS DTOs

```typescript
import { createZodDto } from "nestjs-zod";

const CreateUserSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
  password: z.string().min(8),
});

// Crear DTO compatible con NestJS
export class CreateUserDto extends createZodDto(CreateUserSchema) {}

// O manualmente con class-validator
import { z } from "zod";

export const createUserSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
```

---

## Context7 MCP

```bash
mcp context7 resolve-library-id \
  --query "zod validation library" \
  --libraryName "zod"

mcp context7 query-docs \
  --libraryId "/colinhacks/zod" \
  --query "schema validation with custom error messages"
```
