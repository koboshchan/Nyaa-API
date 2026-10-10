FROM node:24-alpine AS builder
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY test ./test
RUN npm run typecheck && npm test && npm run build

FROM alpine:3.24 AS runner
RUN apk add --no-cache libstdc++ ca-certificates && addgroup -S node && adduser -S -G node node
COPY --from=builder /usr/local/bin/node /usr/local/bin/node
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
WORKDIR /app
COPY --from=builder --chown=node:node /build/dist/server.cjs ./server.cjs
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server.cjs"]
