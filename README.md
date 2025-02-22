# Zephyr

## Overview
Zephyr is a real-time messaging application that allows users to communicate with each other through an intuitive and responsive interface. It supports user authentication, message storage, and live chat functionality.

## Technologies Used
- **Frontend**: React.js, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **WebSockets**: Socket.io
- **Authentication**: JWT (JSON Web Tokens)
- **Hosting**: AWS EC2 / Vercel (Optional)

## Installation

### Prerequisites
Ensure you have the following installed:
- Node.js (v16+ recommended)
- MongoDB
- Git

### Steps to Run Locally
1. Clone the repository:
   ```sh
   git clone https://github.com/your-username/chat-app.git](https://github.com/Vengateshwaran1/Zephyr.git
   cd Zephyr
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add:
   ```env
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key
   ```

4. Start the backend server:
   ```sh
   npm run server
   ```

5. Navigate to the `client` folder and install frontend dependencies:
   ```sh
   cd client
   npm install
   ```

6. Start the frontend:
   ```sh
   npm start
   ```

7. Open the app in your browser at `http://localhost:3000`

