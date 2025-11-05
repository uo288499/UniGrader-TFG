# Use Node.js 22 as the base image
FROM node:22

ARG GATEWAY_URL
ENV GATEWAY_URL=${GATEWAY_URL}

# Set the working directory inside the contain
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY ./webapp/package*.json ./

# Install dependencies
RUN npm install --ignore-scripts --omit=dev

# Copy files to the working directory
COPY ./webapp/src ./src
COPY ./webapp/public ./public

# Create an optimized version of the webapp
RUN npm run build && npm install --ignore-scripts -g serve --production

# Run the app as a non-root user
USER node

# Execute npm run prod to run the server
CMD [ "npm", "run", "prod" ]
