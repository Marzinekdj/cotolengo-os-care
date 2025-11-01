# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/0f8fdb3c-7003-4701-82e6-29be048945bf

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/0f8fdb3c-7003-4701-82e6-29be048945bf) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## 🦊 Como fazer deploy no GitLab Pages

### Pré-requisitos

1. Repositório criado no GitLab
2. Variáveis de ambiente configuradas

### Configurar variáveis de ambiente no GitLab

1. Acesse seu projeto no GitLab
2. Vá em **Settings > CI/CD > Variables**
3. Adicione as seguintes variáveis (marque como "Protected" e "Masked"):
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_URL`

### Deploy automático

Após configurar as variáveis:

1. Faça commit e push para a branch `main` ou `master`
2. O pipeline será executado automaticamente
3. Acesse sua aplicação em: `https://seu-usuario.gitlab.io/seu-projeto/`

### Ajustar o base path (se necessário)

Se sua URL do GitLab Pages for `https://username.gitlab.io/project-name/`:

1. Edite `vite.config.ts`
2. Altere a linha:
   ```typescript
   base: mode === 'production' ? '/project-name/' : '/',
   ```
3. Substitua `/project-name/` pelo nome do seu projeto

### Verificar status do deploy

- Acesse **CI/CD > Pipelines** no GitLab
- Clique no pipeline mais recente
- Verifique se todos os stages passaram (✅)

## 🔒 Segurança

⚠️ **IMPORTANTE**: O arquivo `.env` contém credenciais sensíveis e **NÃO** deve ser commitado.

- Use sempre `.env.example` como template
- Configure as variáveis no GitLab CI/CD
- Se `.env` foi commitado acidentalmente, **rotacione as credenciais** imediatamente

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/0f8fdb3c-7003-4701-82e6-29be048945bf) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
