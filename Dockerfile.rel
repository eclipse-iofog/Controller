FROM iofog/node-alpine-x86:8.16.0

ARG FILENAME

COPY ${FILENAME} /tmp

RUN npm i --unsafe-perm -g /tmp/${FILENAME} && \
  rm -rf /tmp/${FILENAME} && \
  echo "iofog-controller start && tail -f /dev/null" >> /start.sh

CMD [ "sh", "/start.sh" ]
