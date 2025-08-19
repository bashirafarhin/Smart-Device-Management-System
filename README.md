# Smart Device Management System

> This project was built to match these requirements [Assignment](https://github.com/bashirafarhin/Smart-Device-Management-System/blob/main/Assignment.pdf).

## 🛠️ Tech Used

- **Node.js**
- **Express.js**
- **MongoDB + Mongoose**
- **JWT + bcrypt**
- **bcryptjs**
- **express-validator**
- **inngest**
- **jsonwebtoken**
- **mongoose**
- **redis**

## 📬 Postman Collection

You can explore and test the APIs using the Postman collection:

⚠️ **Note:** After logging in, copy the generated JWT token and add it to the request headers (`Authorization: Bearer <your_jwt_token>`) when testing protected routes in Postman.

[Download Postman Collection](./SDMS.postman_collection.json)

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/bashirafarhin/Smart-Device-Management-System.git
cd ./Smart-Device-Management-System/
```

### 2. Install Dependencies

```bash
npm install/ npm i
```

### 3. Database Setup (MongoDB)

- Go to your MongoDB server (e.g., [MongoDB Atlas](https://www.mongodb.com/atlas)) and create a cluster.
- Copy the connection string (it looks like this:  
  `mongodb+srv://<username>:<password>@cluster0.mongodb.net/your-db-name`).
- Add it to your `.env` file:
- If you prefer using local MongoDB, make sure it is running:

```bash
mongod
```

### 4. Redis Setup

- Go to your Redis server (e.g., [Redis Cloud](https://redis.com/redis-enterprise-cloud/)) and create a database.
- Copy the connection URL provided (it looks like this:  
  `redis://default:<password>@<host>:<port>`).
- Add it to your `.env` file:

### 5. Configure Environment Variables

```bash
PORT=3000
MONGO_URI=
JWT_SECRET=your-secret-key
REDIS_URL=
```

### 6. Run the Project in Development Mode

```bash
npm run dev
```

## 📌 Assumptions Made

- The assignment did not explicitly mention whether the routes should be protected, but it was assumed that authentication is required for all protected resources (e.g., Device Management, Logs, Usage). Therefore, these routes are secured with JWT-based authentication.

## 📖 API Documentation

This document provides the API endpoints, payloads, and sample responses for the backend service.

### 1. User Management

#### **POST /auth/signup** → Create account

##### Sample Payload

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Ba@123456",
  "role": "user"
}
```

##### Sample Response

```json
{
  "success": true,
  "message": "User registered successfully"
}
```

#### **POST /auth/login** → login account

##### Sample Payload

```json
{
  "email": "john@example.com",
  "password": "Ba@123456"
}
```

##### Sample Response

```json
{
  "success": true,
  "token": "eyJh...",
  "user": {
    "id": "u1",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

### 2. Device Management

⚠️ **Authentication Required**  
All endpoints in this section require a valid JWT token in the request header:

#### Headers

```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

#### **POST /devices** → Create device

##### Sample Payload

```json
{
  "name": "Living Room Light",
  "type": "light",
  "status": "active"
}
```

##### Sample Response

```json
{
  "success": true,
  "device": {
    "id": "d1",
    "name": "Living Room Light",
    "type": "light",
    "status": "active",
    "last_active_at": null,
    "owner_id": "u1"
  }
}
```

#### **GET /devices** → get all device

##### Sample Response

```json
{
  "success": true,
  "devices": [
    {
      "id": "d1",
      "name": "Living Room Light",
      "type": "light",
      "status": "active",
      "last_active_at": null,
      "owner_id": "u1"
    }
  ]
}
```

#### **PATCH /devices/:id** → Update device details

- You can update one or more fields of the device.

##### Sample Payload

```json
{
  "name": "Living Room Light updated name",
  "type": "light",
  "status": "active"
}
```

##### Sample Response

```json
{
  "success": true,
  "device": {
    "id": "d1",
    "name": "Living Room Light updated name",
    "type": "light",
    "status": "active",
    "last_active_at": null,
    "owner_id": "u1"
  }
}
```

#### **Delete /devices/:id** → delete device

##### Sample Response

```json
{
  "success": true,
  "message": "Device removed successfully"
}
```

#### **Post /devices/:id/heartbeat** →

##### Sample Payload

```json
{
  "status": "active"
}
```

##### Sample Response

```json
{
  "success": true,
  "message": "Device heartbeat recorded",
  "last_active_at": "2025-08-19T07:27:26.823Z"
}
```

### 3. Data & Analytics

⚠️ **Authentication Required**  
All endpoints in this section require a valid JWT token in the request header:

#### Headers

```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

#### **POST /devices/:id/logs** → Create log of a device

##### Sample Payload

```json
{
  "event": "units_consumed",
  "value": 2.5
}
```

##### Sample Response

```json
{
  "success": true,
  "log": {
    "id": "l2",
    "device_id": "d3",
    "event": "units_consumed",
    "value": 2.5,
    "timestamp": "2025-08-19T07:34:53.788Z"
  }
}
```

#### **GET /devices/:id/logs?limit={n}** → Fetch device logs

Returns the last `n` logs of a device.  
The `limit` query parameter is optional. Defaults to `10`.

##### Path Parameters

- `id` (string): Device ID (e.g., `d3`).

##### Query Parameters

- `limit` (integer, optional): Number of logs to fetch. Default: 10.

##### Sample Response

```json
{
  "success": true,
  "logs": [
    {
      "id": "l2",
      "event": "units_consumed",
      "value": 2.5,
      "timestamp": "2025-08-19T07:34:53.788Z"
    },
    {
      "id": "l1",
      "event": "units_consumed",
      "value": 2.5,
      "timestamp": "2025-08-19T07:34:27.806Z"
    }
  ]
}
```

#### **GET /devices/:id/usage?range={timeRange}** → Aggregated usage

Returns the total units consumed by a device within a given time range.  
The `range` query parameter is optional. Defaults to `24h`.

##### Path Parameters

- `id` (string): Device ID (e.g., `d3`).

##### Query Parameters

- `range` (string, optional): Time range for aggregation.  
  Supported values: `1h`, `24h`, `7d`, etc.  
  Default: `24h`.

##### Sample Response

```json
{
  "success": true,
  "device_id": "d3",
  "total_units_last_24h": 7.5
}
```
