# Proyecto BDII - Indexación (Etapa I)

## Instrucciones de ejecución
1. Clonar el repositorio.
2. En la raíz del proyecto, levantar el entorno: `sudo docker-compose up -d`
3. Entrar al contenedor como administrador: `sudo docker exec -it --user root bd-parcial bash`
4. Compilar la extensión (la carpeta ya está vinculada): `cd /tmp/extension && make && make install`
5. Probar en PostgreSQL:
   `su - postgres -c "psql"`
   `CREATE EXTENSION t_tree;`

## Detener el contenedor activo
1. sudo docker stop bd-parcial
2. sudo docker rm bd-parcial
