# Deploying Running Tracker App 🚀

Since this is a full-stack MERN application (React Frontend + Node/Express Backend), the best way to deploy it is as a **Web Service** on a platform like **Render.com** or **Railway.app**.

This guide covers deployment on **Render.com** (it has a great free tier).

## Prerequisites

1.  **GitHub Repository**: Push your code to a GitHub repository.
2.  **MongoDB Atlas**: Ensure your database is hosted on MongoDB Atlas (Cloud) and you have your connection string (`MONGO_URI`).

## Step 1: Prepare the Project

We have already configured `backend/server.js` to serve your React frontend when in production.

## Step 2: Deploy to Render

1.  **Sign Up/Login** to [Render.com](https://render.com/).
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub repository.
4.  **Configure the Service**:
    *   **Name**: `running-tracker` (or anything you like)
    *   **Region**: Closest to you (e.g., Singapore/India if available, or Oregon/Frankfurt)
    *   **Branch**: `main` (or `master`)
    *   **Root Directory**: Leave empty (defaults to `.`) or set to `.`
    *   **Environment**: `Node`

5.  **Build & Start Commands** (Crucial Step):
    *   **Build Command**:
        ```bash
        npm install && npm run build && cd backend && npm install
        ```
        *(This installs frontend deps, builds the frontend to `dist/`, then installs backend deps)*

    *   **Start Command**:
        ```bash
        cd backend && node server.js
        ```

6.  **Environment Variables**:
    Scroll down to "Environment Variables" and add:
    *   `NODE_ENV`: `production`
    *   `MONGO_URI`: (Your full MongoDB connection string from Atlas)
    *   `JWT_SECRET`: (Your secret key, e.g. `nandeesh_secret_key_123`)

7.  Click **Create Web Service**.

## Step 3: Wait & Verify

Render will now:
1.  Clone your repo.
2.  Run the build command (installing and building everything).
3.  Start the backend server.
4.  Your app will be live at `https://running-tracker-[random].onrender.com`!

### Troubleshooting
*   **White Screen?** Check the "Logs" tab in Render. It usually means the build failed or `dist` folder wasn't found.
*   **Database Error?** Check if `MONGO_URI` is correct and IP Access in MongoDB Atlas allows `0.0.0.0/0` (Allow Access from Anywhere) since Render IPs change.
