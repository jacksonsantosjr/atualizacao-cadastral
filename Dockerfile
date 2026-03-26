# Use Node.js 20
FROM node:20

# Set working directory
WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy Client and Server folders
COPY client ./client
COPY server ./server

# Install all dependencies (Root + Client)
RUN npm install
RUN cd client && npm install

# Build the Frontend React app
RUN cd client && npm run build

# Expose the standard Hugging Face port
EXPOSE 7860

# Set Environment Variables
ENV PORT=7860
ENV NODE_ENV=production

# Start the unified server
CMD ["node", "server/index.js"]
