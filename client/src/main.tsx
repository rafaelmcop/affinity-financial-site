import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { startLogin } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  startLogin();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        // Preview auto-login fallback: when the browser blocks iframe cookies
        // (Safari ITP / private browsing / WebView), the runtime mirrors the
        // session into sessionStorage so we can forward it as a Bearer token.
        // The regular OAuth cookie flow keeps working and takes priority server-side.
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          if (raw) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) {
              return { Authorization: `Bearer ${token}` };
            }
          }
        } catch {
          // sessionStorage unavailable
        }
        return {};
      },
      fetch(input, init) {
        const request = {
          ...(init ?? {}),
          credentials: "include" as RequestCredentials,
          cache: "no-store" as RequestCache,
        };

        return globalThis.fetch(input, request).then(async response => {
          const contentType = response.headers.get("content-type") ?? "";
          if (contentType.toLowerCase().includes("json")) return response;

          // A stale Cloudflare asset/SPA fallback can occasionally answer an API
          // request with index.html. Retry once without any edge/browser cache so
          // tRPC never attempts JSON.parse("<!DOCTYPE ...").
          const retryResponse = await globalThis.fetch(input, {
            ...request,
            headers: {
              ...Object.fromEntries(new Headers(request.headers).entries()),
              "x-affinity-json-retry": "1",
            },
          });
          const retryType = retryResponse.headers.get("content-type") ?? "";
          if (retryType.toLowerCase().includes("json")) return retryResponse;

          throw new Error(
            retryResponse.status === 401 || retryResponse.status === 403
              ? "Sua sessão expirou. Entre novamente para continuar."
              : "O portal recebeu uma resposta inválida. Atualize a página e tente novamente."
          );
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
