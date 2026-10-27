FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
RUN rm -f /etc/nginx/conf.d/default.conf
EXPOSE 8080
# 기본 entrypoint 스크립트는 설정 파일을 고치려 해서 읽기 전용 환경과 맞지 않으므로 nginx 를 바로 실행
ENTRYPOINT []
CMD ["nginx", "-g", "daemon off;"]
