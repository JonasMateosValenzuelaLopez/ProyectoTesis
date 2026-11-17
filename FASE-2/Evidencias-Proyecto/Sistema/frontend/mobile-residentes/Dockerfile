FROM node:24-slim
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8081
CMD ["npx", "expo", "start"]
