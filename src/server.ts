import app from "./app";
import connectDB from "./db/connection";
const PORT = process.env.PORT;

connectDB();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
