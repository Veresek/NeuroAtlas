FROM node:24.16.0-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000
CMD ["npm", "run", "build", "--", "--host", "0.0.0.0", "--port", "3000"]
