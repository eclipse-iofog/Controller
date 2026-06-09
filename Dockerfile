FROM node:24-bookworm AS builder

ARG PKG_VERSION
# ARG GITHUB_TOKEN

WORKDIR /tmp

RUN npm i -g npm

COPY package.json .

COPY . .

RUN npm i --build-from-source --force

RUN npm version $PKG_VERSION --allow-same-version --no-git-tag-version

RUN npm pack


FROM registry.access.redhat.com/ubi9/nodejs-24-minimal:latest

USER root
# Install dependencies for logging and development
RUN microdnf install -y g++ make && microdnf clean all

# Install Python and pip
RUN microdnf install -y python3 && \
    ln -sf python3 /usr/bin/python && \
    python3 -m ensurepip && \
    pip3 install --no-cache --upgrade pip setuptools && \
    microdnf install shadow-utils && \
    microdnf clean all
RUN microdnf install -y tzdata &&  microdnf clean all
RUN microdnf -y remove microdnf
RUN useradd --uid 10000 --create-home runner
RUN mkdir -p /var/log/iofog-controller && \
    chown runner:runner /var/log/iofog-controller && \
    chmod 755 /var/log/iofog-controller
USER 10000
WORKDIR /home/runner

ENV NPM_CONFIG_PREFIX=/home/runner/.npm-global
ENV NPM_CONFIG_CACHE=/home/runner/.npm
ENV PATH=$PATH:/home/runner/.npm-global/bin

COPY --from=builder /tmp/datasance-iofogcontroller-*.tgz /home/runner/iofog-controller.tgz

ENV PID_BASE=/home/runner 

RUN npm i -g /home/runner/iofog-controller.tgz && \
  rm -rf /home/runner/iofog-controller.tgz && \
  iofog-controller config dev-mode --on

RUN rm -rf /home/runner/.npm-global/lib/node_modules/@datasance/iofogcontroller/src/data/sqlite_files/*

COPY LICENSE /licenses/LICENSE
LABEL org.opencontainers.image.description=controller
LABEL org.opencontainers.image.source=https://github.com/datasance/controller
LABEL org.opencontainers.image.licenses=EPL2.0
CMD [ "node", "/home/runner/.npm-global/lib/node_modules/@datasance/iofogcontroller/src/server.js" ]
