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
  "accessToken": "eyJhbG...",
  "user": {
    "id": "u1",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

Notes

- The refresh token is sent securely via HTTP-only cookie with the response, and is not included in the JSON response body.

#### **GET /auth/profile** → Get user profile

##### Headers

```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

##### Sample Response

```json
{
  "success": true,
  "data": {
    "_id": "68a5eb41...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2025-08-20T15:35:29.393Z",
    "updatedAt": "2025-08-20T15:35:29.393Z",
    "id": 1,
    "__v": 0
  }
}
```

#### **POST /auth/logout** → logout account

##### Headers

```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

##### Sample Response

```json
{
  "message": "Logged out successfully"
}
```

#### **POST /auth/refresh-token** → to generate new access token on access token expiry

`requires refresh token which was sent automatically in the cookie during login.`

##### Sample Response

```json
{
  "accessToken": "eyJhbGciO..."
}
```

Notes

- The refresh token is sent securely via HTTP-only cookie with the response, and is not included in the JSON response body.

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
    "id": "l1",
    "device_id": "d1",
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

#### **GET /devices/:id/logs/export** → export logs of a device in smaller range

Returns the list of logs for a specific device within the requested date/time range. If no range is provided, it defaults to the latest logs with a configurable limit.

##### Path Parameters

- `id` (string): Device ID (e.g., `d1`).

##### Query Parameters

- `startDate` (required): Time range for aggregation.
- `endDate` (required): `1h`, `24h`, `7d`, etc.
- `format` (optional): allowed values: `json`, `csv`. Default: `json`.

##### Sample Response

```json
[
  {
    "_id": "68a6963620ae638113936736",
    "device_id": 1,
    "event": "units_consumed",
    "value": 2.5,
    "timestamp": "2025-08-21T03:44:54.255Z",
    "createdAt": "2025-08-21T03:44:54.256Z",
    "updatedAt": "2025-08-21T03:44:54.256Z",
    "id": 8,
    "__v": 0
  }
]
```

#### **POST /devices/exports/large** → export logs of a device in large range

Queues an asynchronous export job to download a large set of logs for a device within a specified date range.
Supports various export formats (e.g., csv, json). The export is processed in the background, and you receive a jobId for later status checks.

##### Sample Payload

```json
{
  "deviceId": "d1",
  "startDate": "2025-08-01",
  "endDate": "2025-08-21",
  "format": "csv"
}
```

##### Sample Response

```json
{
  "jobId": "f3726ea5-358d-4131-a016-5e1dc158b475"
}
```

#### **GET /devices/exports/large/:jobId/status** → Retrieves the status and information about the export job.

Once the export is complete, a fileUrl will appear in the response to download your file.

##### Sample Response

```json
{
  "_id": "68a69e4520ae63811393674f",
  "jobId": "f3726ea5-358d-4131-a016-5e1dc158b475",
  "userId": "1",
  "deviceId": "d1",
  "startDate": "2025-08-01",
  "endDate": "2025-08-21",
  "format": "csv",
  "status": "processing",
  "createdAt": "2025-08-21T04:19:17.539Z",
  "updatedAt": "2025-08-21T04:19:17.821Z",
  "__v": 0
}
```

#### **GET /devices/usage-reports** → get usage report for all user devices

Query Parameters

- `startDate` (string, required): Start of the report range, in ISO-8601 format (e.g., 2025-08-01T00:00:00Z).

- `endDate` (string, required): End of the report range, in ISO-8601 format (e.g., 2025-08-21T23:59:59Z).

- `groupBy` (string, optional): Aggregation period. Supported values: day (default), hour.

##### Sample Response

```json
{
  "labels": ["2025-08-20 15:00", "2025-08-21 03:00"],
  "datasets": [
    {
      "label": "units_consumed",
      "data": [15, 5]
    }
  ]
}
```
