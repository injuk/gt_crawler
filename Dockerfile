FROM node:14-alpine

MAINTAINER ingnoh "ingnoh@tistory.com"

WORKDIR /crawler

COPY ./main.js ./
COPY ./package*.json ./
COPY ./configs/config.json ./configs/config.json

RUN apk update
RUN apk upgrade
RUN apk add --no-cache udev ttf-freefont chromium

RUN apk --no-cache add tzdata && \
  cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
  echo "Asia/Seoul" > /etc/timezone

RUN mkdir /usr/share/fonts/nanumfont
RUN wget http://cdn.naver.com/naver/NanumFont/fontfiles/NanumFont_TTF_ALL.zip
RUN unzip NanumFont_TTF_ALL.zip -d /usr/share/fonts/nanumfont
RUN fc-cache -f -v

ENV LANG=ko_KR.UTF-8
ENV LANGUAGE=ko_KR.UTF-8

RUN npm install

CMD [ "npm", "start" ]
