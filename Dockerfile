FROM node:22-slim AS base
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

FROM deps AS build
COPY . .
RUN npx prisma generate
RUN npm run build
RUN test -f dist/main.js

FROM base AS runtime
ENV NODE_ENV=production
# The build stage runs `prisma generate`, which writes the schema-specific
# client (including enums such as UserRole) into node_modules. Copy that
# generated client into the runtime image instead of the pre-generation deps.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
