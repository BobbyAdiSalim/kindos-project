# Controllers

Controllers contain the business logic of your application. They handle requests, interact with the database, and return responses.

## Structure

Each controller should:
- Export functions that handle specific operations
- Receive `req`, `res`, and any dependencies (like `pool`) as parameters
- Handle errors appropriately
- Return appropriate HTTP status codes

Controllers are organized by domain:
- `roles/`: role and profile related controllers (`userController.js`, `adminController.js`)
- `booking/`: booking, cancel, reschedule, waitlist, and shared booking helpers
- `other/`: non-booking features like availability, chat, and reviews

## Example: userController.js

```javascript
export const createUser = async (req, res, pool) => {
  try {
    const { name, email } = req.body;
    
    // Validate input
    if (!name || !email) {
      return res.status(400).json({ error: "Name and email required" });
    }
    
    // Database operation
    const result = await pool.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
      [name, email]
    );
    
    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUser = async (req, res, pool) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

## Creating a New Controller

1. Create a new file: `exampleController.js`
2. Import necessary dependencies (bcrypt, jwt, etc.)
3. Export functions that handle your business logic
4. Each function should receive (req, res, pool) parameters

## Booking Controller Split

Booking-related logic is split by responsibility:
- `booking/bookingController.js`: initial booking flow and shared appointment retrieval endpoints.
- `booking/cancelController.js`: cancellation and doctor booking decision endpoints.
- `booking/rescheduleController.js`: patient/doctor reschedule flows and reschedule response handling.
- `booking/bookingShared.js`: shared booking validation, slot checks, serialization, and helper utilities.
