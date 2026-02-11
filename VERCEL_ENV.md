# Vercel environment variables

Add these in **Vercel Dashboard → Your Project → Settings → Environment Variables**.

| Name | Value | Environments |
|------|--------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tbbshyruowrdfmsiulby.supabase.co` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | *(paste from Supabase Dashboard → Project Settings → API → service_role)* | Production, Preview, Development |

Save, then redeploy so the new env vars are used.
