FROM iofog/node-alpine-x86:8.16.0

ARG FILENAME
ENV NODE_ENV=development

COPY ${FILENAME} /tmp

RUN npm i --unsafe-perm -g /tmp/${FILENAME} && \
  rm -rf /tmp/${FILENAME} && \
  iofog-controller config dev-mode --on && \
  echo "iofog-controller start && tail -f /dev/null" >> /start.sh

CMD [ "sh", "/start.sh" ]
