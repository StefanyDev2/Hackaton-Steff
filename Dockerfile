# Nombre completo de la imagen: así también funciona con Podman, que no adivina el registro.
FROM docker.io/library/node:22-alpine

WORKDIR /app

# Solo lo que la API necesita para correr. El proyecto no tiene dependencias: no hace falta npm install.
COPY package.json ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=3000
ENV DATOS=/datos/evaluaciones.json

# La API no corre como root: el usuario node necesita una carpeta suya donde guardar con ALMACEN=archivo.
RUN mkdir -p /datos && chown node:node /datos
USER node

EXPOSE 3000

# Sin npm de por medio: node recibe directamente el SIGTERM con el que se detiene el contenedor.
CMD ["node", "src/main.mjs"]
