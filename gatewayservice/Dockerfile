# Use Node.js 22 as the base image
FROM node:22

# Set the working directory inside the container
WORKDIR /usr/src/gateway

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install --ignore-scripts --omit=dev

# Copy the source code to the working directory
COPY ./src ./src

# Use a non-root user for security
USER node

# Start the gateway service
CMD ["npm", "start"]