# Use official Node.js LTS image
FROM node:22

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first (for caching)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the app
COPY . .

# Ensure public folder exists
RUN mkdir -p public

# Expose the port (Railway sets PORT env automatically)
ENV PORT=8080
EXPOSE $PORT

# Start the server
CMD ["node", "src/index.js"]
