# TruePal Server API Usage Guide

## Overview

TruePal Server is an inventory management system API built with Ktor. This guide provides comprehensive documentation for all available endpoints, request/response formats, and usage examples.

## Base Configuration

- **Base URL**: `http://localhost:8080`
- **Content-Type**: `application/json`
- **All API endpoints are prefixed with**: `/api`

## Response Format

All API responses follow a consistent format using the `ApiResponse<T>` wrapper:

```json
{
  "success": true,
  "data": "actual_data_object_or_array",
  "message": "optional_message",
  "error": null
}
```

**Response Fields:**
- `success`: Boolean indicating if the request was successful
- `data`: The actual response data (can be object, array, or null)
- `message`: Optional message string
- `error`: Error message string (null if successful)

For paginated responses, the `PaginatedResponse<T>` format is used:

```json
{
  "data": ["array_of_items"],
  "page": 1,
  "limit": 20,
  "total": 100,
  "totalPages": 5
}
```

## Error Handling

The API handles various error scenarios:

- **400 Bad Request**: Invalid input data or malformed requests
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side errors

Error responses include descriptive error messages in the `error` field.

## API Endpoints

### 1. Categories API

#### Get All Categories
- **Endpoint**: `GET /api/categories`
- **Description**: Retrieve all categories
- **Response**: `ApiResponse<List<CategoryDto>>`

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Electronics",
      "description": "Electronic components and devices",
      "createdAt": "2024-01-01T10:00:00Z"
    }
  ]
}
```

#### Get Category by ID
- **Endpoint**: `GET /api/categories/{id}`
- **Description**: Retrieve a specific category by ID
- **Parameters**: 
  - `id` (path): Category ID
- **Response**: `ApiResponse<CategoryDto>`

#### Create Category
- **Endpoint**: `POST /api/categories`
- **Description**: Create a new category
- **Request Body**: `CategoryDto`

**Example Request:**
```json
{
  "name": "Electronics",
  "description": "Electronic components and devices"
}
```

#### Update Category
- **Endpoint**: `PUT /api/categories/{id}`
- **Description**: Update an existing category
- **Parameters**: 
  - `id` (path): Category ID
- **Request Body**: `CategoryDto`

#### Delete Category
- **Endpoint**: `DELETE /api/categories/{id}`
- **Description**: Delete a category
- **Parameters**: 
  - `id` (path): Category ID
- **Response**: `ApiResponse<Boolean>`

### 2. Parts API

#### Get All Parts
- **Endpoint**: `GET /api/parts`
- **Description**: Retrieve all parts
- **Response**: `ApiResponse<List<PartDto>>`

#### Get Part by ID
- **Endpoint**: `GET /api/parts/{id}`
- **Description**: Retrieve a specific part by ID
- **Parameters**: 
  - `id` (path): Part ID
- **Response**: `ApiResponse<PartDto>`

#### Search Parts
- **Endpoint**: `POST /api/parts/search`
- **Description**: Search parts with filters and pagination
- **Request Body**: `SearchPartsRequest`
- **Response**: `ApiResponse<PaginatedResponse<PartDto>>`

**Example Request:**
```json
{
  "query": "resistor",
  "categoryId": 1,
  "lowStock": true,
  "page": 1,
  "limit": 20
}
```

#### Get Low Stock Parts
- **Endpoint**: `GET /api/parts/low-stock`
- **Description**: Retrieve parts with low stock levels
- **Response**: `ApiResponse<List<PartDto>>`

#### Create Part
- **Endpoint**: `POST /api/parts`
- **Description**: Create a new part
- **Request Body**: `AddPartRequest`

**Example Request:**
```json
{
  "name": "10K Resistor",
  "description": "10K Ohm resistor, 1/4W",
  "partNumber": "RES-10K-025W",
  "categoryId": 1,
  "unitPrice": 0.25,
  "initialStock": 100,
  "minimumStock": 10,
  "maxStock": 500,
  "location": "Shelf A1",
  "supplier": "Electronic Components Inc."
}
```

#### Update Part
- **Endpoint**: `PUT /api/parts/{id}`
- **Description**: Update an existing part
- **Parameters**: 
  - `id` (path): Part ID
- **Request Body**: `UpdatePartRequest`

#### Delete Part
- **Endpoint**: `DELETE /api/parts/{id}`
- **Description**: Delete a part
- **Parameters**: 
  - `id` (path): Part ID
- **Response**: `ApiResponse<Boolean>`

### 3. Transactions API

#### Get All Transactions
- **Endpoint**: `GET /api/transactions`
- **Description**: Retrieve all transactions
- **Response**: `ApiResponse<List<TransactionDto>>`

#### Get Transaction by ID
- **Endpoint**: `GET /api/transactions/{id}`
- **Description**: Retrieve a specific transaction by ID
- **Parameters**: 
  - `id` (path): Transaction ID
- **Response**: `ApiResponse<TransactionDto>`

#### Get Transactions by Part ID
- **Endpoint**: `GET /api/transactions/part/{partId}`
- **Description**: Retrieve all transactions for a specific part
- **Parameters**: 
  - `partId` (path): Part ID
- **Response**: `ApiResponse<List<TransactionDto>>`

#### Create Transaction
- **Endpoint**: `POST /api/transactions`
- **Description**: Create a new transaction (IN, OUT, or ADJUSTMENT)
- **Request Body**: `CreateTransactionRequest`

**Example Request:**
```json
{
  "partId": 1,
  "type": "OUT",
  "quantity": 5,
  "unitPrice": 0.25,
  "recipientName": "John Doe",
  "reason": "Project XYZ",
  "isPaid": true,
  "amountPaid": 1.25,
  "notes": "Urgent delivery"
}
```

#### Update Payment
- **Endpoint**: `PUT /api/transactions/{id}/payment`
- **Description**: Update payment information for a transaction
- **Parameters**: 
  - `id` (path): Transaction ID
- **Request Body**: `PaymentUpdateRequest`

**Example Request:**
```json
{
  "amountPaid": 1.25,
  "isPaid": true
}
```

#### Delete Transaction
- **Endpoint**: `DELETE /api/transactions/{id}`
- **Description**: Delete a transaction
- **Parameters**: 
  - `id` (path): Transaction ID
- **Response**: `ApiResponse<Boolean>`

#### Get Fast Moving Parts
- **Endpoint**: `GET /api/transactions/fast-moving`
- **Description**: Retrieve fast-moving parts based on transaction history
- **Query Parameters**: 
  - `limit` (optional): Number of results to return (default: 10)
- **Response**: `ApiResponse<List<FastMovingPartDto>>`

### 4. Statistics API

#### Get Inventory Statistics
- **Endpoint**: `GET /api/stats/inventory`
- **Description**: Retrieve comprehensive inventory statistics
- **Response**: `ApiResponse<InventoryStatsDto>`

**Example Response:**
```json
{
  "success": true,
  "data": {
    "totalCategories": 5,
    "totalParts": 150,
    "totalValue": 12500.75,
    "lowStockParts": "array_of_part_objects",
    "fastMovingParts": "array_of_fast_moving_part_objects",
    "topCategories": "array_of_category_stats_objects"
  }
}
```

#### Get Category Statistics
- **Endpoint**: `GET /api/stats/categories`
- **Description**: Retrieve statistics for all categories
- **Response**: `ApiResponse<List<CategoryStatsDto>>`

## Data Models

### CategoryDto
**Example:**
```json
{
  "id": 1,
  "name": "Electronics",
  "description": "Electronic components and devices",
  "createdAt": "2024-01-01T10:00:00Z"
}
```

**Fields:**
- `id`: Long (nullable) - Unique identifier
- `name`: String - Category name
- `description`: String (nullable) - Category description
- `createdAt`: String (nullable) - ISO 8601 timestamp

### PartDto
**Example:**
```json
{
  "id": 1,
  "name": "10K Resistor",
  "description": "10K Ohm resistor, 1/4W",
  "partNumber": "RES-10K-025W",
  "categoryId": 1,
  "categoryName": "Electronics",
  "unitPrice": 0.25,
  "currentStock": 95,
  "minimumStock": 10,
  "maxStock": 500,
  "location": "Shelf A1",
  "supplier": "Electronic Components Inc.",
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-15T14:30:00Z"
}
```

**Fields:**
- `id`: Long (nullable) - Unique identifier
- `name`: String - Part name
- `description`: String (nullable) - Part description
- `partNumber`: String - Unique part number
- `categoryId`: Long - Category reference
- `categoryName`: String (nullable) - Category name for display
- `unitPrice`: Double - Price per unit
- `currentStock`: Integer - Current stock level
- `minimumStock`: Integer - Minimum stock threshold
- `maxStock`: Integer (nullable) - Maximum stock capacity
- `location`: String (nullable) - Storage location
- `machineModels`: List<String>
- `supplier`: String (nullable) - Supplier information
- `createdAt`: String (nullable) - ISO 8601 timestamp
- `updatedAt`: String (nullable) - ISO 8601 timestamp

### TransactionDto
**Example:**
```json
{
  "id": 1,
  "partId": 1,
  "partName": "10K Resistor",
  "type": "OUT",
  "quantity": 5,
  "unitPrice": 0.25,
  "totalAmount": 1.25,
  "recipientName": "John Doe",
  "reason": "Project XYZ",
  "isPaid": true,
  "amountPaid": 1.25,
  "transactionDate": "2024-01-15T14:30:00Z",
  "notes": "Urgent delivery"
}
```

**Fields:**
- `id`: Long (nullable) - Unique identifier
- `partId`: Long - Part reference
- `partName`: String (nullable) - Part name for display
- `type`: String - Transaction type: "IN", "OUT", or "ADJUSTMENT"
- `quantity`: Integer - Quantity involved in transaction
- `unitPrice`: Double (nullable) - Price per unit
- `totalAmount`: Double (nullable) - Total transaction amount
- `recipientName`: String (nullable) - Recipient name for OUT transactions
- `reason`: String (nullable) - Transaction reason
- `isPaid`: Boolean - Payment status
- `amountPaid`: Double - Amount paid
- `transactionDate`: String (nullable) - ISO 8601 timestamp
- `notes`: String (nullable) - Additional notes

### Transaction Types
- **IN**: Stock incoming (purchase, return)
- **OUT**: Stock outgoing (sale, usage)
- **ADJUSTMENT**: Stock level adjustment

## Usage Examples

### Example 1: Create a Category and Add Parts

```bash
# 1. Create a category
curl -X POST http://localhost:8080/api/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Resistors",
    "description": "Various resistor components"
  }'

# 2. Add a part to the category
curl -X POST http://localhost:8080/api/parts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "10K Resistor",
    "partNumber": "RES-10K",
    "categoryId": 1,
    "unitPrice": 0.25,
    "initialStock": 100,
    "minimumStock": 10
  }'
```

### Example 2: Record a Transaction

```bash
# Record an outgoing transaction
curl -X POST http://localhost:8080/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "partId": 1,
    "type": "OUT",
    "quantity": 5,
    "recipientName": "John Doe",
    "reason": "Project Alpha",
    "isPaid": true,
    "amountPaid": 1.25
  }'
```

### Example 3: Search Parts

```bash
# Search for parts with low stock
curl -X POST http://localhost:8080/api/parts/search \
  -H "Content-Type: application/json" \
  -d '{
    "lowStock": true,
    "page": 1,
    "limit": 10
  }'
```

## Best Practices

1. **Always check the `success` field** in responses before processing data
2. **Handle pagination** properly when dealing with large datasets
3. **Validate input data** before sending requests
4. **Use appropriate transaction types** (IN/OUT/ADJUSTMENT) based on your use case
5. **Monitor low stock levels** regularly using the low-stock endpoints
6. **Keep track of payment status** for financial accuracy

## Error Handling Examples

```javascript
// Example error handling in JavaScript
fetch('http://localhost:8080/api/parts/999')
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('Part found:', data.data);
    } else {
      console.error('Error:', data.error);
    }
  })
  .catch(error => {
    console.error('Network error:', error);
  });
```

This API provides a complete solution for inventory management with comprehensive tracking of categories, parts, transactions, and statistics.
