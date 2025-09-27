FROM node:20-alpine AS base
WORKDIR /app

COPY package.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN npm install

COPY . .

RUN npm run build --workspace apps/web

CMD ["npm", "run", "start", "--workspace", "apps/web"]
