FROM postgres:18.6

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    postgresql-server-dev-18 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/extension /tmp/extension
RUN cd /tmp/extension && make clean && make && make install

COPY Docker/init-extension.sql /docker-entrypoint-initdb.d/01-init-extension.sql
