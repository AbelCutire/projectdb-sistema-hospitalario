## Instrucciones de ejecución (Multiplataforma)

1. Levantar el entorno de base de datos:
   `docker-compose up -d`
2. Instalar las dependencias del proyecto:
   `npm install`
3. Ingresar al contenedor y compilar la extensión en C:
   `sudo docker exec -it --user root bd-parcial bash`
   `cd /tmp/extension && make && make install`
   `exit`
4. Construir las tablas en PostgreSQL local:
   `npx prisma migrate dev`
5. Ejecutar la automatización de datos y pruebas (Prisma Seed + Benchmark SQL):
6. `cd backend`
   `sudo npm run benchmark`

## Detener el contenedor activo
1. sudo docker stop bd-parcial
2. sudo docker rm bd-parcial
