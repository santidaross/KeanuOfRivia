---
name: nextjs-mobile-first
description: >
  Patrones de UI mobile-first (App Router + TypeScript + Tailwind + shadcn/ui). Referencia de
  jerarquía, responsive y estados para cualquier UI del proyecto. Nota: el sitio productivo es un
  Cloudflare Worker con HTML/CSS inline; aplicá los principios mobile-first también ahí.
  Trigger: Any time creating or editing frontend components, pages, layouts, forms,
  or state management in this project.
license: Apache-2.0
metadata:
  author: KeanuOfRivia
  version: "1.0"
---

## When to Use

- Creating any React component, page, or layout
- Adding forms (always RHF + Zod)
- Adding client state (Zustand) or server state (TanStack Query)
- Choosing between Server Component and Client Component
- Writing Tailwind classes

## Critical Patterns

### 1. Mobile-First is NON-NEGOTIABLE

```tsx
// CORRECTO — base es mobile, escala hacia arriba
<div className="flex flex-col gap-4 md:flex-row md:gap-6 lg:gap-8">

// INCORRECTO — nunca escribir así
<div className="hidden lg:block">  // solo si realmente se oculta en mobile
```

**Regla**: Toda clase Tailwind sin prefijo es mobile. Los prefijos `md:` y `lg:` son overrides hacia arriba. Nunca al revés.

### 2. Touch Targets Mínimo 44px

```tsx
// Todos los elementos interactivos: min-h-11 (44px) o min-h-12 (48px)
<Button className="min-h-11 px-4">Acción</Button>
<Link className="min-h-11 flex items-center px-3">Nav item</Link>

// Checkboxes y radios: área de toque ampliada
<label className="flex items-center gap-3 min-h-11 cursor-pointer">
  <Checkbox /> Opción
</label>
```

### 3. Server Component por Defecto

```
¿Necesita useState / useEffect / browser APIs / event handlers?
  SÍ → "use client"
  NO → Server Component (sin directiva)
```

```tsx
// Server Component — fetch directo, sin hook
export default async function ProductList() {
  const products = await db.query.products.findMany()
  return <ul>{products.map(p => <ProductCard key={p.id} {...p} />)}</ul>
}

// Client Component — solo cuando hay interacción
"use client"
export function AddToCartButton({ productId }: { productId: string }) {
  const { mutate } = useAddToCart()
  return <Button onClick={() => mutate(productId)}>Agregar</Button>
}
```

### 4. Estructura de Componentes (Atomic con shadcn/ui base)

```
components/
├── ui/          # shadcn/ui generados — NO modificar directamente
├── atoms/       # Extensiones de shadcn: InputWithLabel, FormField, Avatar
├── molecules/   # Composición: SearchBar, ProductCard, UserMenu
├── organisms/   # Secciones: Header, ProductGrid, CheckoutForm
└── templates/   # Layouts reutilizables: DashboardLayout, AuthLayout
```

**Regla**: Extender shadcn en `atoms/`, nunca modificar archivos en `ui/`.

### 5. Formularios: RHF + Zod siempre

```tsx
// Schema primero — define contratos
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
})
type LoginForm = z.infer<typeof loginSchema>

// Componente
"use client"
export function LoginForm() {
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input type="email" className="min-h-11" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full min-h-11">Ingresar</Button>
      </form>
    </Form>
  )
}
```

### 6. Estado: Zustand (cliente) + TanStack Query (servidor)

```tsx
// Zustand — solo para estado UI global (sidebar open, theme, carrito local)
// NO usar para datos del servidor
export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))

// TanStack Query — todo lo que viene del servidor
export function useProducts(filters: Filters) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => fetchProducts(filters),
    staleTime: 60_000,
  })
}

// Mutations con optimistic update
export function useAddToCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addToCart,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  })
}
```

### 7. Tipografía y Espaciado Mobile

```tsx
// Tipografía escalable
<h1 className="text-2xl font-bold md:text-3xl lg:text-4xl">
<h2 className="text-xl font-semibold md:text-2xl">
<p className="text-base leading-relaxed md:text-lg">

// Spacing contenedor — mobile primero
<main className="px-4 py-6 md:px-6 lg:px-8 max-w-7xl mx-auto">

// Grid responsive
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
```

### 8. Carga y Estados Vacíos

```tsx
// Siempre definir loading, error y empty states
export function ProductGrid() {
  const { data, isLoading, error } = useProducts()

  if (isLoading) return <ProductGridSkeleton />  // Skeleton, no spinner
  if (error) return <ErrorState message={error.message} />
  if (!data?.length) return <EmptyState message="No hay productos" />

  return <div className="grid ...">{data.map(...)}</div>
}
```

### Auth Feature Flags

```tsx
// Cada provider se habilita solo si la env var está configurada
// src/lib/auth-providers.ts
export const enabledProviders = {
  google: !!process.env.GOOGLE_CLIENT_ID,
  microsoft: !!process.env.MICROSOFT_CLIENT_ID,
  linkedin: !!process.env.LINKEDIN_CLIENT_ID,
  email: !!process.env.EMAIL_SERVER_HOST,  // magic link / OTP
}

// En el componente de login — nunca mostrar botón de provider deshabilitado
{enabledProviders.google && (
  <Button onClick={() => signIn("google")} className="w-full min-h-11">
    <GoogleIcon /> Continuar con Google
  </Button>
)}
```

### Server Actions vs Route Handlers

```
Mutación desde formulario web    → Server Action
Query desde componente React     → TanStack Query + fetch
Endpoint para mobile/terceros    → Route Handler en app/api/
Revalidar caché después de mutación → revalidatePath() en Server Action
```

## Commands

```bash
# Crear monorepo Turborepo
npx create-turbo@latest

# En apps/web — instalar stack base
npx create-next-app@latest . --typescript --tailwind --app --src-dir

# Inicializar shadcn/ui
npx shadcn@latest init

# Agregar componentes shadcn
npx shadcn@latest add button input form card badge skeleton

# Instalar estado y forms
pnpm add zustand @tanstack/react-query react-hook-form @hookform/resolvers zod

# Auth.js v5
pnpm add next-auth@beta

# Drizzle ORM
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit

# Testing
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react
pnpm add -D @playwright/test
```

## Resources

- shadcn/ui: componentes en `components/ui/` — no editar
- Drizzle schema: `src/db/schema.ts`
- Zustand stores: `src/store/`
- TanStack Query hooks: `src/hooks/`
- Zod schemas: `src/lib/validations/`
