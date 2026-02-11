# Routes

Routes define your API endpoints and connect them to controller functions. They keep your server.js clean and organized.

## Structure

Each route file should:
- Import the Express router
- Import controller functions
- Define endpoints and HTTP methods
- Map endpoints to controller functions
- Export the router

## Example: userRoutes.js

```javascript
import express from "express";
import { createUser, getUser, updateUser, deleteUser } from "../controllers/userController.js";

const router = express.Router();

// Create a new user
router.post("/users", express.json(), (req, res) => {
  createUser(req, res, req.app.locals.pool);
});

// Get a user by ID
router.get("/users/:id", (req, res) => {
  getUser(req, res, req.app.locals.pool);
});

// Update a user
router.put("/users/:id", express.json(), (req, res) => {
  updateUser(req, res, req.app.locals.pool);
});

// Delete a user
router.delete("/users/:id", (req, res) => {
  deleteUser(req, res, req.app.locals.pool);
});

export default router;
```

## Creating a New Route File

1. Create a new file: `exampleRoutes.js`
2. Import Express and create a router
3. Import controller functions
4. Define your endpoints
5. Export the router
6. Import and use in server.js: `app.use("/api", exampleRoutes);`

## Best Practices

- Group related endpoints in the same route file
- Use clear, RESTful endpoint names
- Add comments to document what each endpoint does
- Use appropriate HTTP methods (GET, POST, PUT, DELETE)
