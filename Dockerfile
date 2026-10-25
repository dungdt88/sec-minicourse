# check=skip=SecretsUsedInArgOrEnv
# (VITE_SUPABASE_ANON_KEY is the publishable key: it ends up in the browser bundle by design.)
# Tiệm Vòng Tay: build the static app, serve it with nginx as a non-root user on port 3000.
# The VITE_* values are inlined into the bundle, so they are build arguments, not runtime env.

FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install -g pnpm@10.32.1

COPY package.json pnpm-lock.yaml ./
# --ignore-scripts: skips the Supabase CLI's binary download (only needed on a laptop);
# esbuild and the other tools work without their install scripts.
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_TEAM_SLUG=default
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_TEAM_SLUG=$VITE_TEAM_SLUG \
    VITE_BACKEND=supabase
# Fail the build early when the Supabase settings are missing, rather than ship a blank app.
RUN test -n "$VITE_SUPABASE_URL" && test -n "$VITE_SUPABASE_ANON_KEY" \
    || (echo "Set the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY build args" >&2 && exit 1)
RUN pnpm build
# The CSP allows exactly this project's Supabase origin (https://<ref>.supabase.co).
RUN origin=$(node -e 'console.log(new URL(process.env.VITE_SUPABASE_URL).origin)') \
    && mkdir -p /out/snippets \
    && sed "s#__SUPABASE_ORIGIN__#${origin}#g" deploy/security-headers.conf > /out/snippets/security-headers.conf \
    && cp deploy/nginx.conf /out/default.conf

FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime
# The image already runs as the unprivileged "nginx" user (uid 101).
COPY --from=build /out/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /out/snippets/ /etc/nginx/snippets/
COPY --from=build /app/dist /usr/share/nginx/html
USER 101
EXPOSE 3000
# 127.0.0.1, not localhost: on Docker 29 localhost resolves to ::1 first (deployment standard).
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1
