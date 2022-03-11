FROM node

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 6379

CMD ["node", "bot/index.js"]
