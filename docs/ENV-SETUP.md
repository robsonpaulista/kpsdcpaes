# Como criar o `.env.local`

1. No Firebase Console: **Project settings** (engrenagem) → **Your apps**.
2. Se ainda não houver app Web, clique em **Add app** → Web (`</>`).
3. Copie os valores do objeto `firebaseConfig`.
4. Na raiz do projeto:

```bash
cp .env.example .env.local
```

5. Abra `.env.local` e preencha **sem aspas**:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc...

NEXT_PUBLIC_PRODUCTION_ORDER_SOURCE=mock
```

6. Reinicie o servidor (`npm run dev`) — o Next só lê `.env.local` na subida.

## O que NÃO colocar no `.env.local`

- Service account JSON / private key
- Senha do ERP
- Admin SDK credentials

Esses vão em secrets server-side depois (Cloud Functions / Secret Manager).

## Segurança

- `.env.local` já está no `.gitignore` — **não commitar**.
- Pode colar os valores `NEXT_PUBLIC_*` do client SDK (eles já ficam no browser).
- **Não cole as credenciais no chat** — só no arquivo local.

## Conferir

Depois de preencher, rode `npm run dev` e abra `/app/settings/integrations/dev`.
O status deve mostrar o **Project ID** (sem exibir a API key).
