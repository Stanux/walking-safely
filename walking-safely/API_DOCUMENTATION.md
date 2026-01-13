# Walking Safely API - Documentação Swagger

## Visão Geral

A documentação Swagger/OpenAPI foi adicionada a todas as APIs do projeto Walking Safely. Esta documentação fornece uma interface interativa para explorar e testar os endpoints da API.

## Instalação

1. Instale as dependências do Swagger:

```bash
cd walking-safely
composer install
```

2. Publique os assets do L5-Swagger:

```bash
php artisan vendor:publish --provider "L5Swagger\L5SwaggerServiceProvider"
```

3. Gere a documentação:

```bash
php artisan l5-swagger:generate
```

## Acessando a Documentação

Após iniciar o servidor de desenvolvimento:

```bash
php artisan serve
```

Acesse a documentação em: **http://localhost:8000/api/documentation**

## Endpoints Documentados

### Authentication (`/api/auth`)
- `POST /auth/register` - Registrar novo usuário
- `POST /auth/login` - Autenticar usuário
- `POST /auth/logout` - Encerrar sessão (autenticado)
- `GET /auth/me` - Obter usuário atual (autenticado)

### Routes (`/api/routes`)
- `POST /routes` - Calcular rota com análise de risco
- `POST /routes/recalculate` - Recalcular rota durante navegação

### Occurrences (`/api/occurrences`)
- `GET /occurrences` - Listar ocorrências com filtros
- `POST /occurrences` - Criar nova ocorrência
- `GET /occurrences/{id}` - Obter detalhes de uma ocorrência

### Geocoding (`/api`)
- `GET /geocode` - Geocodificar endereço
- `GET /reverse-geocode` - Geocodificação reversa

### Alerts (`/api/alerts`)
- `GET /alerts/check` - Verificar alertas na posição atual
- `GET /alerts/preferences` - Obter preferências de alertas (autenticado)
- `PUT /alerts/preferences` - Atualizar preferências (autenticado)

### Heatmap (`/api/heatmap`)
- `GET /heatmap` - Dados do mapa de calor
- `GET /heatmap/regions` - Mapa de calor por região
- `GET /heatmap/distribution` - Distribuição por tipo de crime

### Time Series (`/api/timeseries`)
- `GET /timeseries` - Série temporal de ocorrências
- `GET /timeseries/hourly` - Padrão por hora do dia
- `GET /timeseries/daily` - Padrão por dia da semana
- `GET /timeseries/heatmap` - Matriz hora x dia

### Analytics (`/api/analytics`) - Requer autenticação admin
- `GET /analytics/dashboard` - Dashboard completo
- `GET /analytics/summary` - Métricas resumidas
- `GET /analytics/distribution/type` - Distribuição por tipo
- `GET /analytics/distribution/region` - Distribuição por região
- `GET /analytics/trends` - Tendências temporais
- `GET /analytics/quality` - Métricas de qualidade
- `GET /analytics/moderation` - Estatísticas de moderação
- `GET /analytics/export` - Exportar dados (CSV/PDF/JSON)

### Admin (`/api/admin`) - Requer autenticação admin
- `GET /admin/moderation` - Fila de moderação
- `POST /admin/moderation/{id}/approve` - Aprovar item
- `POST /admin/moderation/{id}/reject` - Rejeitar item
- `GET /admin/taxonomy/categories` - Listar categorias
- `POST /admin/taxonomy/categories` - Criar categoria
- `PUT /admin/taxonomy/categories/{id}` - Atualizar categoria
- `GET /admin/translations` - Listar traduções
- `PUT /admin/translations` - Atualizar tradução
- `GET /admin/translations/export` - Exportar traduções
- `POST /admin/translations/import` - Importar traduções

## Autenticação

A API usa Bearer Token (Sanctum) para autenticação. Para endpoints protegidos:

1. Faça login via `POST /auth/login`
2. Use o token retornado no header: `Authorization: Bearer {token}`

Na interface Swagger, clique em "Authorize" e insira o token.

## Configuração

O arquivo de configuração está em `config/l5-swagger.php`. Variáveis de ambiente disponíveis:

```env
L5_SWAGGER_CONST_HOST=http://localhost:8000
L5_SWAGGER_GENERATE_ALWAYS=false
L5_FORMAT_TO_USE_FOR_DOCS=json
```

## Regenerando a Documentação

Após modificar as anotações nos controllers:

```bash
php artisan l5-swagger:generate
```

Para gerar automaticamente em desenvolvimento:

```env
L5_SWAGGER_GENERATE_ALWAYS=true
```

## Estrutura dos Arquivos

```
app/Http/Controllers/
├── Controller.php                    # Anotações globais (Info, Tags, Schemas base)
└── Api/
    ├── AuthController.php            # Endpoints de autenticação
    ├── RouteController.php           # Cálculo de rotas
    ├── OccurrenceController.php      # Gerenciamento de ocorrências
    ├── GeocodingController.php       # Geocodificação
    ├── AlertController.php           # Sistema de alertas
    ├── HeatmapController.php         # Mapa de calor
    ├── TimeSeriesController.php      # Séries temporais
    ├── AnalyticsController.php       # Analytics (admin)
    ├── AdminController.php           # Operações admin
    └── Swagger/
        └── Schemas.php               # Definições de schemas
```
